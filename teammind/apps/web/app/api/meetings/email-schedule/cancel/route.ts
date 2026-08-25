import { NextResponse } from 'next/server';

import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

import { enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Database } from '~/lib/database.types';

const MEETING_API_URL = process.env.MEETING_API_URL!;
const MEETING_API_KEY = process.env.MEETING_API_KEY!;
const API_KEY = process.env.EMAIL_WORKER_API_KEY!;
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

type Meeting = Database['public']['Tables']['meetings']['Row'];

// Schema for email-based cancellation
const emailCancellationSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  icalEvent: z.string().optional(),
});

// Schema for user-initiated cancellation
const userCancellationSchema = z.object({
  meetingId: z.string().uuid(),
});

// Function to detect cancellation using Gemini
async function detectCancellation(
  emailData: z.infer<typeof emailCancellationSchema>,
): Promise<{
  isCancellation: boolean;
  meetingTitle?: string;
  meetingUrl?: string;
}> {
  const { subject, text, html, icalEvent } = emailData;

  // Simple check for iCal cancellation first (faster than Gemini)
  if (icalEvent?.includes('METHOD:CANCEL')) {
    return {
      isCancellation: true,
      meetingTitle: subject.replace(/^canceled:|^cancelled:/i, '').trim(),
    };
  }

  try {
    // Prepare content for Gemini
    const emailContent = `
    Subject: ${subject}
    
    ${text ?? html?.replace(/<[^>]*>/g, ' ') ?? ''}
    
    ${icalEvent ? 'Calendar data attached: YES' : ''}
    `;

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: emailContent,
      config: {
        systemInstruction: `You are an expert meeting cancellation detector analyzing email content. Your goal is to accurately determine if an email signifies a meeting cancellation or rescheduling and extract key details. Follow these steps carefully:

        1.  **Analyze Intent:** Is this email primarily about cancelling or rescheduling a meeting?
            *   Look for explicit keywords: "cancel", "cancelled", "reschedule", "rescheduled", "postpone", "postponed", "no longer able", "update", etc.
            *   Pay close attention to calendar data if present (e.g., METHOD:CANCEL in iCal). Calendar data often provides the most definitive signal.
            *   Determine if the intent is clearly cancellation/rescheduling. If it's ambiguous or just an update/FYI, treat it as non-cancellation.

        2.  **Extract Meeting Title:** If cancellation/rescheduling is detected, identify the original title of the meeting.
            *   Look in the subject line and email body.
            *   Prioritize the title found in calendar data if available.
            *   Carefully remove cancellation-related prefixes/phrases (e.g., "Canceled:", "Cancelled:", "Rescheduled:", "Update:") to isolate the original title.
            *   If no clear title is found, return null.

        3.  **Extract Meeting URL:** Check if a meeting URL (Zoom, Microsoft Teams, Google Meet) is present in the email body or calendar data.
            *   Extract the full, valid URL. Ensure it starts with https:// and belongs to one of the specified platforms.
            *   Do not include extraneous trailing characters (like '>', ')', or punctuation).
            *   If multiple URLs are present, prioritize the one most clearly associated with the cancelled meeting (e.g., from the calendar event). If unsure, return the first valid one found.
            *   If no valid URL is found, return null.

        4.  **Verification:** Before finalizing, double-check:
            *   Is the cancellation intent clear and unambiguous?
            *   Is the extracted title the *original* meeting title, without cancellation terms?
            *   Is the extracted URL complete, valid, and for the correct platform?

        Respond strictly in the specified JSON format.`,
        temperature: 0.1,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 4096,
        },
        responseSchema: {
          description: 'Detect if an email contains a meeting cancellation',
          type: Type.OBJECT,
          properties: {
            isCancellation: {
              type: Type.BOOLEAN,
              description:
                'Whether this email indicates a meeting cancellation',
              nullable: false,
            },
            meetingTitle: {
              type: Type.STRING,
              description: 'The title of the meeting being cancelled',
              nullable: true,
            },
            meetingUrl: {
              type: Type.STRING,
              description:
                'The meeting URL if present in the cancellation email',
              nullable: true,
            },
          },
          required: ['isCancellation', 'meetingTitle'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Document summary response did not contain text.');
    }

    const result = JSON.parse(response.text);

    return {
      isCancellation: result.isCancellation,
      meetingTitle: result.meetingTitle,
      meetingUrl: result.meetingUrl,
    };
  } catch (error) {
    console.error('Error using Gemini for cancellation detection:', error);

    // Simple fallback using subject line only
    const isCancellation = /cancel|reschedule|postpon/i.test(subject);
    return {
      isCancellation,
      meetingTitle: isCancellation
        ? subject.replace(/cancel|reschedule|postpon/gi, '').trim()
        : undefined,
    };
  }
}

// Improved function to cancel a scheduled bot
async function cancelScheduledBot(
  botId: string,
): Promise<{ success: boolean; reason: string }> {
  try {
    const response = await fetch(`${MEETING_API_URL}/${botId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-meeting-baas-api-key': MEETING_API_KEY,
      },
    });

    // Consider 404 as successful cancellation - bot doesn't exist anymore
    if (response.status === 404) {
      return { success: true, reason: 'bot_not_found' };
    }

    return {
      success: response.ok,
      reason: response.ok ? 'cancelled' : 'api_error',
    };
  } catch (error) {
    console.error('Error cancelling scheduled bot:', error);
    return { success: false, reason: 'request_error' };
  }
}

export const POST = enhanceRouteHandler(
  async ({ request }) => {
    try {
      // Check if it's an API request first
      const apiKey = request.headers.get('x-api-key');
      const isApiRequest = apiKey === API_KEY;

      // Get Supabase client
      const supabase = getSupabaseServerClient({ admin: isApiRequest });

      let userId: string | undefined;

      // If not an API request, verify user authentication
      if (!isApiRequest) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        userId = user.id;
      }

      const body = await request.json();

      // Handle based on authentication type
      if (isApiRequest) {
        // API-based email cancellation
        return handleEmailCancellation(body, supabase);
      } else if (userId) {
        // User-based direct cancellation
        return handleUserCancellation(body, userId, supabase);
      } else {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 },
        );
      }
    } catch (error) {
      console.error('Error processing cancellation:', error);
      return NextResponse.json(
        { error: 'Failed to process cancellation' },
        { status: 500 },
      );
    }
  },
  { auth: false }, // Keep auth false but handle authentication manually
);

async function handleEmailCancellation(
  body: unknown,
  supabase: SupabaseClient<Database>,
) {
  const parsedEmail = emailCancellationSchema.safeParse(body);

  if (!parsedEmail.success) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 },
    );
  }

  const { to } = parsedEmail.data;

  // Extract the email handle from the recipient email
  const emailHandle = to.split('@')[0];

  // Look up the user by email handle
  const { data: userEmailData, error: userEmailError } = await supabase
    .from('autojoin_emails')
    .select('user_id')
    .eq('email_handle', emailHandle!)
    .eq('is_deleted', false)
    .single();

  if (userEmailError || !userEmailData) {
    console.error('Email handle not found or deleted:', emailHandle);
    return NextResponse.json(
      { error: 'Email handle not found' },
      { status: 404 },
    );
  }

  const userId = userEmailData.user_id;

  // Detect if this is a cancellation
  const { isCancellation, meetingTitle, meetingUrl } = await detectCancellation(
    parsedEmail.data,
  );

  if (!isCancellation) {
    return NextResponse.json(
      { error: 'Not a cancellation email' },
      { status: 400 },
    );
  }

  // Define the query to find matching meetings
  let query = supabase
    .from('meetings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_scheduled', true)
    .in('status', ['pending', 'scheduled'])
    .order('scheduled_at', { ascending: true });

  // If we have a URL, use that for precise matching
  if (meetingUrl) {
    query = query.eq('meeting_url', meetingUrl);
  }
  // Otherwise use title for fuzzy matching
  else if (meetingTitle) {
    query = query.ilike('title', `%${meetingTitle}%`);
  }
  // If neither, return an error
  else {
    return NextResponse.json(
      { error: 'Could not determine which meeting to cancel' },
      { status: 400 },
    );
  }

  // Execute the query
  const { data: meetings, error: meetingsError } = await query;

  if (meetingsError) {
    console.error('Error fetching scheduled meetings:', meetingsError);
    return NextResponse.json(
      { error: 'Failed to retrieve scheduled meetings' },
      { status: 500 },
    );
  }

  if (!meetings || meetings.length === 0) {
    return NextResponse.json(
      { error: 'No matching scheduled meetings found' },
      { status: 404 },
    );
  }

  // Cancel all matched meetings
  const results = await Promise.all(
    (meetings as Meeting[]).map(async (meeting) => {
      let botResult = { success: true, reason: 'no_bot' };

      // Cancel the bot if one was scheduled
      if (meeting.bot_id) {
        botResult = await cancelScheduledBot(meeting.bot_id);
      }

      // Update the meeting status regardless of bot cancellation result
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          status: 'cancelled',
        })
        .eq('id', meeting.id);

      return {
        meetingId: meeting.id,
        title: meeting.title,
        botCancelled: botResult.success,
        cancellationReason: botResult.reason,
        statusUpdated: !updateError,
      };
    }),
  );

  return NextResponse.json({
    success: true,
    cancelledMeetings: results,
  });
}

async function handleUserCancellation(
  body: unknown,
  userId: string,
  supabase: SupabaseClient<Database>,
) {
  const result = userCancellationSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 },
    );
  }

  const { meetingId } = result.data;

  // Fetch the meeting and verify ownership
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('user_id', userId)
    .single();

  if (meetingError || !meeting) {
    console.error('Meeting not found or not owned by user:', meetingError);
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  let botResult = { success: true, reason: 'no_bot' };

  // Cancel the bot if one was scheduled
  if (meeting.bot_id) {
    botResult = await cancelScheduledBot(meeting.bot_id);
  }

  // Update the meeting status regardless of bot cancellation result
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      status: 'cancelled',
    })
    .eq('id', meetingId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating meeting status:', updateError);
    return NextResponse.json(
      { error: 'Failed to cancel meeting' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    botCancelled: botResult.success,
    cancellationReason: botResult.reason,
    meeting: {
      ...meeting,
      status: 'cancelled',
    },
  });
}
