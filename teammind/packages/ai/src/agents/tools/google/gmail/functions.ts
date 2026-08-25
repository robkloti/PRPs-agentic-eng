import { gmail_v1 } from 'googleapis';

// --- Helper Functions ---

/**
 * Decodes a base64url encoded string, handling Gmail's specific encoding.
 * @param body The encoded string.
 * @returns The decoded string, or the original string if decoding fails.
 */
function decodeBody(body: string): string {
  if (body) {
    try {
      // Replace URL-safe characters and decode
      return Buffer.from(
        body.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf-8');
    } catch (error) {
      console.error('Error decoding body:', error);
      // Keep the original encoded body if decoding fails
      return body;
    }
  }
  return '';
}

/**
 * Parses the subject, sender, and body from a Gmail message payload.
 * @param payload The message payload.
 * @returns An object containing subject, sender, and body.
 */
function parseHeaderAndBody(payload: gmail_v1.Schema$MessagePart): {
  subject?: gmail_v1.Schema$MessagePartHeader;
  sender?: gmail_v1.Schema$MessagePartHeader;
  body: string;
} {
  if (!payload) {
    return { body: '' };
  }

  const headers = payload.headers ?? [];
  const subject = headers.find((header) => header.name === 'Subject');
  const sender = headers.find((header) => header.name === 'From');

  let body = '';
  if (payload.parts) {
    // Look for text/plain part first
    const plainPart = payload.parts.find(
      (part) => part.mimeType === 'text/plain',
    );
    if (plainPart?.body?.data) {
      body = decodeBody(plainPart.body.data);
    } else {
      // Fallback: concatenate all parts (might include HTML, etc.) - less ideal
      body = payload.parts
        .map((part) => decodeBody(part.body?.data ?? ''))
        .join('');
    }
  } else if (payload.body?.data) {
    // If no parts, assume the main body is the content
    body = decodeBody(payload.body.data);
  }

  return { subject, sender, body };
}

// --- Gemini Function Implementations ---

/**
 * Interface for arguments passed to the createGmailDraft function.
 */
interface CreateGmailDraftArgs {
  to: string[];
  subject: string;
  message: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Creates a Gmail draft using the provided arguments and Gmail client.
 * Corresponds to the 'create_gmail_draft' Gemini function declaration.
 *
 * @param args The draft details parsed from the Gemini function call.
 * @param gmail Authenticated Gmail API client instance.
 * @returns An object indicating success or failure, including the draft ID if successful.
 */
export async function createGmailDraft(
  args: CreateGmailDraftArgs,
  gmail: gmail_v1.Gmail,
): Promise<{ success: boolean; message: string; draftId?: string }> {
  const { to, subject, message, cc, bcc } = args;

  // Prepare the raw email message (RFC 2822 format)
  const emailLines = [
    `To: ${to.join(', ')}`,
    `Subject: ${subject}`,
    cc && cc.length > 0 ? `Cc: ${cc.join(', ')}` : '',
    bcc && bcc.length > 0 ? `Bcc: ${bcc.join(', ')}` : '',
    'Content-Type: text/plain; charset=utf-8', // Ensure proper encoding
    '', // Blank line separates headers from body
    message,
  ];
  // Filter out empty lines (like empty CC/BCC) before joining
  const email = emailLines.filter((line) => line !== '').join('\n');

  // Encode the email in base64url format
  const raw = Buffer.from(email).toString('base64url');

  const draftMessage = {
    message: {
      raw: raw,
    },
  };

  try {
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: draftMessage,
    });

    if (response.status === 200 && response.data.id) {
      return {
        success: true,
        message: `Draft created successfully.`,
        draftId: response.data.id,
      };
    } else {
      return {
        success: false,
        message: `Failed to create draft. Status: ${response.status}`,
      };
    }
  } catch (error: unknown) {
    console.error('Error creating Gmail draft:', error);
    let errorMessage = 'Unknown error';
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response &&
      error.response.data &&
      typeof error.response.data === 'object' &&
      'error' in error.response.data &&
      error.response.data.error &&
      typeof error.response.data.error === 'object' &&
      'message' in error.response.data.error
    ) {
      errorMessage = String(error.response.data.error.message);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: `An error occurred creating the draft: ${errorMessage}`,
    };
  }
}

/**
 * Interface for arguments passed to the getGmailMessage function.
 */
interface GetGmailMessageArgs {
  messageId: string;
}

/**
 * Interface for the structured result returned by getGmailMessage and getGmailThread messages.
 */
interface GmailMessageResult {
  id: string;
  threadId?: string | null; // Allow undefined to match API response possibility
  snippet?: string | null;
  subject?: string | null;
  body: string;
  from?: string | null;
  to?: string | null;
  cc?: string | null;
  bcc?: string | null;
  date?: string | null;
}

/**
 * Retrieves a specific Gmail message using the provided arguments and Gmail client.
 * Corresponds to the 'get_gmail_message' Gemini function declaration.
 *
 * @param args The arguments containing the messageId.
 * @param gmail Authenticated Gmail API client instance.
 * @returns An object indicating success or failure, including the message details if successful.
 */
export async function getGmailMessage(
  args: GetGmailMessageArgs,
  gmail: gmail_v1.Gmail,
): Promise<{ success: boolean; message: string; data?: GmailMessageResult }> {
  const { messageId } = args;

  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      format: 'full', // Request full payload to get headers and body
      id: messageId,
    });

    if (response.status !== 200 || !response.data) {
      return {
        success: false,
        message: `Failed to retrieve message ${messageId}. Status: ${response.status}`,
      };
    }

    const { data } = response;
    const { payload } = data;

    if (!payload?.headers) {
      return {
        success: false,
        message: `Message ${messageId} payload or headers missing.`,
      };
    }

    const { subject, sender, body } = parseHeaderAndBody(payload);
    const headers = payload.headers;

    // Extract other relevant headers
    const toHeader = headers.find((h) => h.name === 'To');
    const ccHeader = headers.find((h) => h.name === 'Cc');
    const bccHeader = headers.find((h) => h.name === 'Bcc');
    const dateHeader = headers.find((h) => h.name === 'Date');

    const messageData: GmailMessageResult = {
      id: data.id ?? messageId, // Use the ID from the response if available
      threadId: data.threadId, // Directly assign API value (string | null | undefined)
      snippet: data.snippet,
      subject: subject?.value,
      body: body, // Already decoded by parseHeaderAndBody
      from: sender?.value,
      to: toHeader?.value,
      cc: ccHeader?.value,
      bcc: bccHeader?.value,
      date: dateHeader?.value,
    };

    return {
      success: true,
      message: `Message ${messageId} retrieved successfully.`,
      data: messageData,
    };
  } catch (error: unknown) {
    console.error(`Error retrieving Gmail message ${messageId}:`, error);
    let errorMessage = 'Unknown error';
    // Use optional chaining with 'as any' and disable eslint rule for simplicity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const potentialMessage = (error as any)?.response?.data?.error?.message;

    if (potentialMessage) {
      errorMessage = String(potentialMessage);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // If neither condition is met, errorMessage remains 'Unknown error'

    return {
      success: false,
      message: `An error occurred retrieving message ${messageId}: ${errorMessage}`,
    };
  }
}

/**
 * Interface for arguments passed to the getGmailThread function.
 */
interface GetGmailThreadArgs {
  threadId: string;
}

/**
 * Retrieves an entire Gmail thread using the provided arguments and Gmail client.
 * Corresponds to the 'get_gmail_thread' Gemini function declaration.
 * Uses the same GmailMessageResult interface as getGmailMessage for consistency.
 *
 * @param args The arguments containing the threadId.
 * @param gmail Authenticated Gmail API client instance.
 * @returns An object indicating success or failure, including the list of messages in the thread if successful.
 */
export async function getGmailThread(
  args: GetGmailThreadArgs,
  gmail: gmail_v1.Gmail,
): Promise<{ success: boolean; message: string; data?: GmailMessageResult[] }> {
  const { threadId } = args;

  try {
    const response = await gmail.users.threads.get({
      userId: 'me',
      format: 'full', // Request full payload for each message
      id: threadId,
    });

    if (response.status !== 200 || !response.data) {
      return {
        success: false,
        message: `Failed to retrieve thread ${threadId}. Status: ${response.status}`,
      };
    }

    const { data } = response;
    const { messages } = data;

    if (!messages || messages.length === 0) {
      return {
        success: true, // Not an error, just no messages
        message: `Thread ${threadId} found, but contains no messages.`,
        data: [],
      };
    }

    // Map and parse each message in the thread
    const threadMessages = messages
      .map((message) => {
        if (!message?.payload?.headers) {
          console.warn(
            `Skipping message in thread ${threadId} due to missing payload/headers.`,
          );
          return null; // Skip malformed messages
        }

        const { payload } = message;
        const { subject, sender, body } = parseHeaderAndBody(payload);
        const headers = payload.headers;

        // Extract other relevant headers using optional chaining for safety
        const toHeader = headers?.find((h) => h.name === 'To');
        const ccHeader = headers?.find((h) => h.name === 'Cc');
        const bccHeader = headers?.find((h) => h.name === 'Bcc');
        const dateHeader = headers?.find((h) => h.name === 'Date');

        // Return structured data for the message
        return {
          id: message.id ?? 'unknown', // Use message ID
          threadId: message.threadId ?? threadId, // Assign API value (string | null | undefined)
          snippet: message.snippet,
          subject: subject?.value,
          body: body,
          from: sender?.value,
          to: toHeader?.value,
          cc: ccHeader?.value,
          bcc: bccHeader?.value,
          date: dateHeader?.value,
        };
      })
      .filter((msg): msg is NonNullable<typeof msg> => msg !== null); // Filter out nulls

    // No assertion needed here, threadMessages is now correctly typed after filter
    return {
      success: true,
      message: `Thread ${threadId} retrieved successfully with ${threadMessages.length} messages.`,
      data: threadMessages, // Use the filtered array directly
    };
  } catch (error) {
    console.error(`Error retrieving Gmail thread ${threadId}:`, error);
    let errorMessage = 'Unknown error';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const potentialMessage = (error as any)?.response?.data?.error?.message;

    if (potentialMessage) {
      errorMessage = String(potentialMessage);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: `An error occurred retrieving thread ${threadId}: ${errorMessage}`,
    };
  }
}

/**
 * Interface for arguments passed to the sendGmailMessage function.
 */
interface SendGmailMessageArgs {
  to: string[];
  subject: string;
  message: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Sends a Gmail message using the provided arguments and Gmail client.
 * Corresponds to the 'send_gmail_message' Gemini function declaration.
 *
 * @param args The message details parsed from the Gemini function call.
 * @param gmail Authenticated Gmail API client instance.
 * @returns An object indicating success or failure, including the sent message ID if successful.
 */
export async function sendGmailMessage(
  args: SendGmailMessageArgs,
  gmail: gmail_v1.Gmail,
): Promise<{ success: boolean; message: string; messageId?: string | null }> {
  const { to, subject, message, cc, bcc } = args;

  // Prepare the raw email message (RFC 2822 format) - similar to createGmailDraft
  const emailLines = [
    `To: ${to.join(', ')}`,
    `Subject: ${subject}`,
    cc && cc.length > 0 ? `Cc: ${cc.join(', ')}` : '',
    bcc && bcc.length > 0 ? `Bcc: ${bcc.join(', ')}` : '',
    'Content-Type: text/plain; charset=utf-8',
    '',
    message,
  ];
  const email = emailLines.filter((line) => line !== '').join('\n');
  const raw = Buffer.from(email).toString('base64url');

  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });

    if (response.status === 200 && response.data.id) {
      return {
        success: true,
        message: `Message sent successfully.`,
        messageId: response.data.id,
      };
    } else {
      return {
        success: false,
        message: `Failed to send message. Status: ${response.status}`,
      };
    }
  } catch (error: unknown) {
    console.error('Error sending Gmail message:', error);
    let errorMessage = 'Unknown error';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const potentialMessage = (error as any)?.response?.data?.error?.message;

    if (potentialMessage) {
      errorMessage = String(potentialMessage);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: `An error occurred sending the message: ${errorMessage}`,
    };
  }
}

/**
 * Interface for arguments passed to the searchGmail function.
 */
interface SearchGmailArgs {
  query: string;
  maxResults?: number;
  resource?: 'messages' | 'threads';
}

/**
 * Interface for a simplified search result item (message or thread).
 */
interface GmailSearchResultItem {
  id: string; // Message ID or Thread ID
  threadId?: string | null; // Only for messages
  snippet?: string | null;
  subject?: string | null;
  body?: string; // Body of the message (or first message in thread)
  sender?: string | null; // Sender of the message (or first message)
}

/**
 * Searches Gmail messages or threads using the provided arguments and Gmail client.
 * Corresponds to the 'search_gmail' Gemini function declaration.
 *
 * @param args The search query details parsed from the Gemini function call.
 * @param gmail Authenticated Gmail API client instance.
 * @returns An object indicating success or failure, including the list of search results if successful.
 */
export async function searchGmail(
  args: SearchGmailArgs,
  gmail: gmail_v1.Gmail,
): Promise<{
  success: boolean;
  message: string;
  results?: GmailSearchResultItem[];
}> {
  const { query, maxResults = 10, resource = 'messages' } = args;

  try {
    // Step 1: List messages matching the query
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults,
    });

    if (listResponse.status !== 200 || !listResponse.data) {
      return {
        success: false,
        message: `Failed to list Gmail resources for query "${query}". Status: ${listResponse.status}`,
      };
    }

    const initialMessages = listResponse.data.messages;

    if (!initialMessages || initialMessages.length === 0) {
      return {
        success: true,
        message: `No ${resource} found matching query "${query}".`,
        results: [],
      };
    }

    // Step 2: Fetch details based on the resource type
    let searchResults: GmailSearchResultItem[] = [];

    if (resource === 'messages') {
      // Fetch full details for each message
      const messageDetailsPromises = initialMessages.map(
        async (msg): Promise<GmailSearchResultItem | null> => {
          if (!msg.id) return null;
          try {
            const msgResponse = await gmail.users.messages.get({
              userId: 'me',
              format: 'full', // Use 'metadata' or 'minimal' if full body isn't always needed
              id: msg.id,
            });
            if (msgResponse.status !== 200 || !msgResponse.data) return null;

            const { payload } = msgResponse.data;
            if (!payload?.headers) return null; // Skip malformed messages

            const { subject, sender, body } = parseHeaderAndBody(payload);
            return {
              id: msgResponse.data.id ?? msg.id,
              threadId: msgResponse.data.threadId,
              snippet: msgResponse.data.snippet,
              subject: subject?.value,
              body: body,
              sender: sender?.value,
            };
          } catch (innerError) {
            console.error(`Error fetching message ${msg.id}:`, innerError);
            return null; // Skip messages that fail to fetch
          }
        },
      );

      const messageResults = await Promise.all(messageDetailsPromises);
      searchResults = messageResults.filter(
        (result): result is GmailSearchResultItem => result !== null,
      );
    } else if (resource === 'threads') {
      // Fetch unique threads (list might contain multiple messages from the same thread)
      const uniqueThreadIds = Array.from(
        new Set(
          initialMessages
            .map((msg: gmail_v1.Schema$Message) => msg.threadId as string)
            .filter((id) => !!id),
        ),
      );

      const threadResults = await Promise.all(
        uniqueThreadIds.map(
          async (threadId): Promise<GmailSearchResultItem | null> => {
            if (!threadId) return null;
            try {
              const threadResponse = await gmail.users.threads.get({
                userId: 'me',
                format: 'full', // Need payload of first message
                id: threadId,
              });
              if (
                threadResponse.status !== 200 ||
                !threadResponse.data?.messages ||
                threadResponse.data.messages.length === 0
              )
                return null;

              const firstMessage = threadResponse.data.messages[0]!;
              const { payload } = firstMessage;
              if (!payload?.headers) return null; // Skip malformed messages

              const { subject, sender, body } = parseHeaderAndBody(payload);

              return {
                id: threadId, // Use thread ID as the main ID
                snippet: firstMessage.snippet,
                subject: subject?.value,
                body: body,
                sender: sender?.value,
              };
            } catch (innerError) {
              console.error(`Error fetching thread ${threadId}:`, innerError);
              return null; // Skip threads that fail to fetch
            }
          },
        ),
      );

      searchResults = threadResults.filter(
        (result): result is GmailSearchResultItem => result !== null,
      );
    } else {
      // Should not happen due to enum in declaration, but handle defensively
      return {
        success: false,
        message: `Invalid resource type specified: ${resource as string}`,
      };
    }

    return {
      success: true,
      message: `Search successful. Found ${searchResults.length} ${resource}.`,
      results: searchResults,
    };
  } catch (error: unknown) {
    console.error(`Error searching Gmail with query "${query}":`, error);
    let errorMessage = 'Unknown error';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const potentialMessage = (error as any)?.response?.data?.error?.message;

    if (potentialMessage) {
      errorMessage = String(potentialMessage);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      success: false,
      message: `An error occurred during Gmail search: ${errorMessage}`,
    };
  }
}
