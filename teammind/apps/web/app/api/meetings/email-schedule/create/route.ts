import { NextResponse } from 'next/server';

import { GoogleGenAI, Type } from '@google/genai';
import localtunnel from 'localtunnel';
import ical from 'node-ical';
import { z } from 'zod';

import { enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

const MEETING_API_URL = process.env.MEETING_API_URL!;
const MEETING_API_KEY = process.env.MEETING_API_KEY!;
const API_KEY = process.env.EMAIL_WORKER_API_KEY!;
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

// Schema for email data
const emailSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  icalEvent: z.string().optional(),
});

// Function to extract meeting data from email content
async function extractMeetingData(emailData: z.infer<typeof emailSchema>) {
  const { subject, text, html, icalEvent } = emailData;
  let calendarData = '';

  // Extract information from iCal if available
  if (icalEvent) {
    try {
      const events = ical.parseICS(icalEvent);
      // Format iCal data for Gemini to use as additional context
      calendarData = `Calendar data: ${JSON.stringify(events)}`;
    } catch (error) {
      console.error('Error parsing iCal data:', error);
    }
  }

  // Prepare content for Gemini
  const emailContent = `
  Subject: ${subject}
  
  ${text ?? html?.replace(/<[^>]*>/g, ' ') ?? ''}
  
  ${calendarData}
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: emailContent,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        systemInstruction: `You are an intelligent meeting scheduler assistant extracting key details from emails to schedule meetings. Focus meticulously on accuracy. Follow these steps:

        1.  **Identify Meeting Platform & URL:** Locate the primary meeting URL.
            *   Search the email body and any provided calendar data for links matching Zoom, Microsoft Teams, or Google Meet patterns (e.g., https://*.zoom.us/..., https://teams.microsoft.com/..., https://meet.google.com/...).
            *   Extract the *exact* and *complete* URL. Be extremely careful not to include any trailing characters, punctuation, or HTML tags (e.g., '>', '"', '<', ')').
            *   If multiple valid URLs are found, prioritize the one from the calendar data. If no calendar data or ambiguity persists, use the first valid URL found in the body.
            *   If no valid URL for these platforms is found, return null for meetingUrl.

        2.  **Determine Scheduled Time:** Extract the specific date and time the meeting is scheduled to start.
            *   Look in the email body and prioritize information from calendar data (e.g., DTSTART in iCal).
            *   Identify explicit date and time mentions (e.g., "April 19th, 2025 at 2:00 PM PST", "tomorrow at 10:00 CET").
            *   Convert the found date/time to a precise ISO 8601 format string (e.g., "2025-04-19T14:00:00-07:00"). Include the timezone offset if possible, otherwise assume UTC or clearly state the ambiguity if necessary (though the schema requires a string, aim for ISO 8601).
            *   If conflicting times exist between calendar and body, *always* prioritize the calendar data.
            *   If no specific time can be determined, return null for scheduledAt.

        3.  **Extract Meeting Title:** Identify the title or subject of the meeting.
            *   Look in the email subject line and body. Prioritize the title from calendar data (e.g., SUMMARY in iCal) if available.
            *   If no explicit title is found, use the email's subject line as a fallback.
            *   If the email subject is generic (e.g., "Meeting Invitation"), try to find a better title in the body or calendar data. Return null only if absolutely no title can be inferred.

        4.  **Verification:** Review your extracted information:
            *   Is the URL complete, correct for the platform, and free of extra characters?
            *   Is the scheduled time a valid date/time in the future, represented as an ISO 8601 string?
            *   Is the title representative of the meeting?

        Respond strictly in the specified JSON format. Only return non-null values for fields where you found valid information according to these rules.`,
        responseSchema: {
          description: 'Extract meeting information from email content',
          type: Type.OBJECT,
          properties: {
            meetingUrl: {
              type: Type.STRING,
              description: 'Complete meeting URL',
              nullable: true,
            },
            scheduledAt: {
              type: Type.STRING,
              description: 'ISO date string of when the meeting is scheduled',
              nullable: true,
            },
            title: {
              type: Type.STRING,
              description: 'Title of the meeting',
              nullable: true,
            },
          },
          required: ['meetingUrl', 'scheduledAt', 'title'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Document summary response did not contain text.');
    }

    const meetingInfo = JSON.parse(response.text);

    // Basic validation
    if (!meetingInfo.meetingUrl || !meetingInfo.scheduledAt) {
      return null;
    }

    // Validate URL format
    const urlPattern =
      /^https:\/\/(?:.*\.)?(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com)\/.+$/i;
    if (!urlPattern.test(meetingInfo.meetingUrl)) {
      return null;
    }

    // Validate meeting time is in the future
    const scheduledTime = new Date(meetingInfo.scheduledAt);
    if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
      return null;
    }

    return {
      meetingUrl: meetingInfo.meetingUrl,
      title: meetingInfo.title ?? subject,
      scheduledAt: scheduledTime.toISOString(),
    };
  } catch (error) {
    console.error('Error extracting meeting data:', error);
    return null;
  }
}

// Function to schedule a bot with Meeting Baas
async function scheduleBotWithMeetingBaas(
  meetingUrl: string,
  scheduledTime: Date,
): Promise<string | null> {
  try {
    const webhookUrl =
      process.env.NODE_ENV === 'production'
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/meetings/webhook`
        : `${(await localtunnel({ port: 3000 })).url}/api/meetings/webhook`;

    // Adjust for bot joining 4 minutes early
    const joinTime = new Date(scheduledTime.getTime());
    joinTime.setMinutes(joinTime.getMinutes() + 4);

    // Convert to Unix timestamp in seconds
    const startTimeUnix = Math.floor(joinTime.getTime() / 1000);

    const response = await fetch(MEETING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-meeting-baas-api-key': MEETING_API_KEY,
      },
      body: JSON.stringify({
        meeting_url: meetingUrl,
        bot_name: 'TeamMind AI',
        bot_image: 'https://teammindai.com/images/teammind-bot-cover-img.png',
        reserved: true,
        recording_mode: 'audio_only',
        webhook_url: webhookUrl,
        start_time: startTimeUnix,
        speech_to_text: {
          provider: 'Default',
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.bot_id as string;
  } catch (error) {
    console.error('Error scheduling bot:', error);
    return null;
  }
}

export const POST = enhanceRouteHandler(
  async ({ request }) => {
    try {
      // Verify API key
      const apiKey = request.headers.get('x-api-key');
      if (apiKey !== API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const supabase = getSupabaseServerClient({ admin: true });

      // Parse email data
      const emailData = await request.json();
      const parsedEmail = emailSchema.safeParse(emailData);
      if (!parsedEmail.success) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 },
        );
      }

      const { to } = parsedEmail.data;
      const emailHandle = to.split('@')[0]!;

      // Look up user by email handle
      const { data: userEmailData, error: userEmailError } = await supabase
        .from('autojoin_emails')
        .select('user_id')
        .eq('email_handle', emailHandle)
        .eq('is_deleted', false)
        .single();

      if (userEmailError || !userEmailData) {
        return NextResponse.json(
          { error: 'Email handle not found' },
          { status: 404 },
        );
      }

      const userId = userEmailData.user_id;

      // Extract meeting data
      const meetingData = await extractMeetingData(parsedEmail.data);
      if (!meetingData) {
        return NextResponse.json(
          { error: 'Could not extract meeting information' },
          { status: 400 },
        );
      }

      // Schedule bot if meeting is within 30 days
      const scheduledTime = new Date(meetingData.scheduledAt);
      let botId: string | null = null;

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (scheduledTime < thirtyDaysFromNow) {
        botId = await scheduleBotWithMeetingBaas(
          meetingData.meetingUrl,
          scheduledTime,
        );
      }

      // Store meeting in database
      const { data: scheduledMeeting, error: schedulingError } = await supabase
        .from('meetings')
        .insert({
          user_id: userId,
          meeting_url: meetingData.meetingUrl,
          title: meetingData.title,
          scheduled_at: scheduledTime.toISOString(),
          bot_id: botId,
          status: botId ? 'scheduled' : 'pending',
          is_scheduled: true,
        })
        .select()
        .single();

      if (schedulingError) {
        return NextResponse.json(
          { error: 'Failed to store scheduled meeting' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        meeting: scheduledMeeting,
      });
    } catch (error) {
      console.error('Error processing email schedule:', error);
      return NextResponse.json(
        { error: 'Failed to process email' },
        { status: 500 },
      );
    }
  },
  { auth: false },
);
