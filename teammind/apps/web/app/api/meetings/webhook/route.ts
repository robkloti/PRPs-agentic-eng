import { NextResponse } from 'next/server';

import { z } from 'zod';

import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { runCreateGraph } from '~/api/_trigger.dev/graphs';
import { Database } from '~/lib/database.types';

type Meeting = Database['public']['Tables']['meetings']['Row'];

// Webhook payload validation schemas
const statusChangeSchema = z.object({
  event: z.literal('bot.status_change'),
  data: z.object({
    bot_id: z.string(),
    status: z.object({
      code: z.enum([
        'joining_call',
        'in_waiting_room',
        'in_call_not_recording',
        'in_call_recording',
        'call_ended',
        'complete',
        'meeting_error',
        'bot_rejected',
      ]),
      created_at: z.string(),
    }),
  }),
});

const transcriptWordSchema = z.object({
  start: z.number(),
  end: z.number(),
  word: z.string(),
});

const transcriptSegmentSchema = z.object({
  speaker: z.string(),
  words: z.array(transcriptWordSchema),
});

const completeEventSchema = z.object({
  event: z.literal('complete'),
  data: z.object({
    bot_id: z.string(),
    mp4: z.string().optional(),
    speakers: z.array(z.string()),
    transcript: z.array(transcriptSegmentSchema),
  }),
});

const failedEventSchema = z.object({
  event: z.literal('failed'),
  data: z.object({
    bot_id: z.string(),
    error: z.string(),
  }),
});

const webhookPayloadSchema = z.discriminatedUnion('event', [
  statusChangeSchema,
  completeEventSchema,
  failedEventSchema,
]);

function processTranscript(
  rawTranscript: z.infer<typeof transcriptSegmentSchema>[],
) {
  return rawTranscript.reduce(
    (acc: Array<{ speaker: string; text: string }>, segment) => {
      const formattedText = segment.words
        .map((word) => word.word)
        .join(' ')
        .replace(' - ', '-')
        .replace(/\s+/g, ' ')
        .trim();

      const lastEntry = acc[acc.length - 1];

      if (
        acc.length > 0 &&
        lastEntry &&
        lastEntry.speaker === segment.speaker
      ) {
        lastEntry.text += ' ' + formattedText;
      } else {
        acc.push({
          speaker: segment.speaker,
          text: formattedText,
        });
      }
      return acc;
    },
    [],
  );
}

// Helper function to map MeetingBaas status to our status
function mapStatusCode(code: string): Meeting['status'] {
  switch (code) {
    case 'joining_call':
      return 'joining_call';
    case 'in_waiting_room':
      return 'in_waiting_room';
    case 'in_call_not_recording':
      return 'in_call_not_recording';
    case 'in_call_recording':
      return 'in_call_recording';
    case 'call_ended':
      return 'call_ended';
    case 'complete':
      return 'completed';
    default:
      return 'meeting_error';
  }
}

export async function POST(request: Request) {
  try {
    // Parse and validate webhook payload
    const payload = await request.json();
    const result = webhookPayloadSchema.safeParse(payload);

    console.log('Webhook payload:', result.data);

    if (!result.success) {
      console.error('Invalid webhook payload:', result.error);
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 },
      );
    }

    // Validate API key; TODO there is a bug currently in meeting baas where it is only sent on complete event
    const apiKey = request.headers.get('x-meeting-baas-api-key');
    if (
      result.data.event === 'complete' &&
      apiKey !== process.env.MEETING_API_KEY
    ) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient({ admin: true });

    // Find meeting by bot_id
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('bot_id', result.data.data.bot_id)
      .single();

    if (meetingError || !meeting) {
      console.error('Meeting not found:', meetingError);
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Process based on event type
    switch (result.data.event) {
      case 'bot.status_change': {
        const statusCode = result.data.data.status.code;
        const timestamp = result.data.data.status.created_at;

        // Map status
        const mappedStatus = mapStatusCode(statusCode);

        // Prepare update object with status
        const updateData: Partial<Meeting> = {
          status: mappedStatus,
        };

        // Set start time when recording begins
        if (statusCode === 'in_call_recording') {
          updateData.time_start = timestamp;
        }

        // Set end time when call ends
        if (statusCode === 'call_ended') {
          updateData.time_end = timestamp;
        }

        const { error: updateError } = await supabase
          .from('meetings')
          .update(updateData)
          .eq('bot_id', result.data.data.bot_id);

        if (updateError) {
          console.error('Failed to update meeting status:', updateError);
          return NextResponse.json(
            { error: 'Failed to update meeting status' },
            { status: 500 },
          );
        }
        break;
      }

      case 'complete': {
        const processedTranscript = processTranscript(
          result.data.data.transcript,
        );

        // Run the graph with transcript
        await runCreateGraph.trigger({
          userId: meeting.user_id,
          meetingId: meeting.id,
          transcript: processedTranscript,
        });

        const { error: updateError } = await supabase
          .from('meetings')
          .update({
            status: 'completed',
            transcript: processedTranscript,
            time_end: new Date().toISOString(),
          })
          .eq('bot_id', result.data.data.bot_id);

        if (updateError) {
          console.error('Failed to update meeting transcript:', updateError);
          return NextResponse.json(
            { error: 'Failed to update meeting transcript' },
            { status: 500 },
          );
        }
        break;
      }

      case 'failed': {
        const { error: updateError } = await supabase
          .from('meetings')
          .update({
            status: 'failed',
            time_end: new Date().toISOString(),
          })
          .eq('bot_id', result.data.data.bot_id);

        if (updateError) {
          console.error('Failed to update meeting status:', updateError);
          return NextResponse.json(
            { error: 'Failed to update meeting status' },
            { status: 500 },
          );
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
