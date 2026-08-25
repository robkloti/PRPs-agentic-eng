import PostalMime from 'postal-mime';

// Define proper types for Cloudflare Workers
type ExecutionContext = {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
};

interface Env {
  API_BASE_URL: string;
  API_KEY: string;
}

// Define types for the email payload
interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  icalEvent?: string;
}

export default {
  async email(message: any, env: Env, ctx: ExecutionContext) {
    console.log('From:', message.from);
    console.log('To:', message.to);
    console.log('Subject:', message.headers.get('subject'));
    // Check domain quickly
    const to = message.to.toLowerCase();
    const domain = to.split('@')[1];

    if (domain !== 'teammindai.com') {
      message.setReject('Unknown address');
      return;
    }

    try {
      // Parse the email using postal-mime
      const email = await PostalMime.parse(message.raw);

      // Prepare payload with all information from the parsed email
      const payload: EmailPayload = {
        to,
        from: message.from,
        subject: email.subject || message.headers.get('subject') || '',
      };

      // Add text content if available
      if (email.text) {
        payload.text = email.text;
      }

      // Add HTML content if available
      if (email.html) {
        payload.html = email.html;
      }

      // Extract iCal data from attachments
      if (email.attachments && email.attachments.length > 0) {
        for (const attachment of email.attachments) {
          if (
            attachment.mimeType === 'text/calendar' ||
            (attachment.filename && attachment.filename.endsWith('.ics')) ||
            attachment.mimeType === 'application/ics'
          ) {
            if (attachment.content) {
              const decoder = new TextDecoder('utf-8');
              payload.icalEvent = decoder.decode(
                new Uint8Array(attachment.content as ArrayBuffer),
              );
              break;
            }
          }
        }
      }

      // Check if the email body contains iCal data even if not as attachment
      if (
        !payload.icalEvent &&
        email.text &&
        email.text.indexOf('BEGIN:VCALENDAR') >= 0 &&
        email.text.indexOf('END:VCALENDAR') >= 0
      ) {
        const start = email.text.indexOf('BEGIN:VCALENDAR');
        const end = email.text.lastIndexOf('END:VCALENDAR') + 12;
        payload.icalEvent = email.text.substring(start, end);
      }

      // Determine if this is a cancellation email using simple heuristics
      const isCancellation =
        payload.subject.toLowerCase().includes('cancel') ||
        payload.subject.toLowerCase().includes('reschedule') ||
        (payload.icalEvent && payload.icalEvent.includes('METHOD:CANCEL'));

      // Choose the appropriate endpoint
      const endpoint = isCancellation
        ? `${env.API_BASE_URL}/api/meetings/email-schedule/cancel`
        : `${env.API_BASE_URL}/api/meetings/email-schedule/create`;

      console.log(
        `Processing email from ${payload.from} as ${isCancellation ? 'cancellation' : 'creation'}`,
      );

      // Send to API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (response.status >= 300 && response.status < 400) {
        console.error(
          `Redirect detected to: ${response.headers.get('location')}`,
        );
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: `Status: ${response.status}` }));
        console.error(`API error: ${JSON.stringify(errorData)}`);
        return 'Email processed but API returned an error';
      }

      console.log('Successfully processed email');
      return 'Email processed successfully';
    } catch (error) {
      console.error(
        `Error in email worker: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Accept it anyway to prevent bounce messages
      return 'Email accepted despite processing error';
    }
  },
};
