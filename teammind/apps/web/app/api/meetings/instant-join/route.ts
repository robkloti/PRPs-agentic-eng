import { NextResponse } from 'next/server';

import localtunnel from 'localtunnel';
import { z } from 'zod';

import { HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { checkMeetingHourLimits } from '~/lib/usage-limits';

const MEETING_API_URL = process.env.MEETING_API_URL!;
const MEETING_API_KEY = process.env.MEETING_API_KEY!;

// Schema for request validation
const createMeetingSchema = z.object({
  meeting_url: z
    .string()
    .url()
    .refine((url) => {
      // Basic validation for common meeting platforms
      return (
        url.includes('zoom.us') ||
        url.includes('teams.microsoft.com') ||
        url.includes('meet.google.com')
      );
    }, 'Invalid meeting URL. Must be a Zoom, Teams, or Google Meet URL'),
});

export const POST = enhanceRouteHandler(
  async ({ request, user, teamAccount }: HandlerParams<undefined, true>) => {
    try {
      const supabase = getSupabaseServerClient();

      // Parse and validate request body
      const body = await request.json();
      const result = createMeetingSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid meeting URL' },
          { status: 400 },
        );
      }

      if (!teamAccount?.id) {
        return NextResponse.json(
          { error: 'No accounts found for user' },
          { status: 400 },
        );
      }

      // Check if the account has exceeded their meeting hour limits
      // Assuming a new minimum meeting duration of 15 minutes (0.25 hours)
      const { allowed, currentUsage, limit } = await checkMeetingHourLimits(
        supabase,
        teamAccount.id,
        0.25,
      );

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Meeting hour limit exceeded',
            details: {
              currentUsage,
              limit,
              remainingHours: Math.max(0, limit - currentUsage),
            },
          },
          { status: 403 },
        );
      }

      const { meeting_url } = result.data;
      const webhook_url =
        process.env.NODE_ENV === 'production'
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/meetings/webhook`
          : `${(await localtunnel({ port: 3000 })).url}/api/meetings/webhook`;

      console.log('Joining meeting:', meeting_url);

      // Create bot via meeting API
      const response = await fetch(`${MEETING_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-spoke-api-key': MEETING_API_KEY,
        },
        body: JSON.stringify({
          meeting_url,
          bot_name: 'TeamMind AI',
          bot_image: 'https://teammindai.com/images/teammind-bot-cover-img.png',
          reserved: false,
          recording_mode: 'audio_only',
          webhook_url,
          speech_to_text: {
            provider: 'Default',
          },
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        return NextResponse.json(
          { error: 'Invalid response from bot API' },
          { status: 502 },
        );
      }

      if (!response.ok) {
        console.error('Bot API error:', data);
        return NextResponse.json(
          { error: `Bot creation failed: ${data.message ?? 'Unknown error'}` },
          { status: response.status },
        );
      }

      if (!data.bot_id) {
        console.error('Missing bot_id in response:', data);
        return NextResponse.json(
          { error: 'Invalid response from bot API' },
          { status: 502 },
        );
      }

      // Store meeting data in database
      const { error: dbError } = await supabase.from('meetings').insert({
        user_id: user.id,
        bot_id: data.bot_id,
        status: 'joining_call',
        meeting_url: meeting_url,
      });

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Failed to store meeting data' },
          { status: 500 },
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error('Meeting creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create meeting: ' + (error as Error).message },
        { status: 500 },
      );
    }
  },
  { auth: true },
);
