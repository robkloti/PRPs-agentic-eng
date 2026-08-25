import { SupabaseClient } from '@supabase/supabase-js';

import { tool } from 'ai';
import { z } from 'zod';

import { Database } from '@tm/supabase/database';

import { getCalendarClient } from '../google-function-client';
import { createCalendarEvent, viewCalendarEvents } from './functions';

/**
 * Creates Google Calendar tools that are customized for a specific user
 */
export function createCalendarTools(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return {
    // Tool requiring confirmation (no execute function)
    create_calendar_event: tool({
      description:
        'Creates a Google Calendar event or meeting. Requires event summary, start time, and end time. Attendees, description, and location are optional.',
      parameters: z.object({
        summary: z.string().describe('The title or summary of the event.'),
        startTime: z
          .string()
          .describe(
            'Start date/time in ISO 8601 format (e.g., "2025-04-07T10:00:00Z" or "2025-04-07T10:00:00+02:00"). Include timezone offset if not UTC.',
          ),
        endTime: z
          .string()
          .describe(
            'End date/time in ISO 8601 format (e.g., "2025-04-07T11:00:00Z" or "2025-04-07T11:00:00+02:00"). Include timezone offset if not UTC.',
          ),
        attendees: z
          .array(z.string())
          .optional()
          .describe('Optional list of attendee email addresses.'),
        description: z
          .string()
          .optional()
          .describe('Optional description or agenda for the event.'),
        location: z
          .string()
          .optional()
          .describe('Optional location for the event.'),
        timeZone: z
          .string()
          .optional()
          .describe(
            'Optional IANA Time Zone ID (e.g., "Europe/Berlin", "America/New_York"). Defaults to the calendar\'s time zone if omitted.',
          ),
      }),
      // No execute function -> requires confirmation
    }),

    // Tool that doesn't require confirmation
    view_calendar_events: tool({
      description:
        'Retrieves Google Calendar events for a specified time range. Defaults to today if no range is given.',
      parameters: z.object({
        startTime: z
          .string()
          .optional()
          .describe(
            'Optional start date/time in ISO 8601 format (e.g., "2025-04-07T00:00:00Z"). Defaults to the beginning of today if omitted.',
          ),
        endTime: z
          .string()
          .optional()
          .describe(
            'Optional end date/time in ISO 8601 format (e.g., "2025-04-07T23:59:59Z"). Defaults to the end of today if omitted.',
          ),
        maxResults: z
          .number()
          .optional()
          .describe(
            'Optional maximum number of events to return. Defaults to 10.',
          ),
        timeZone: z
          .string()
          .optional()
          .describe(
            "Optional IANA Time Zone ID used to interpret start/end times if they lack offsets. Defaults to the calendar's time zone if omitted.",
          ),
      }),
      execute: async ({ startTime, endTime, maxResults, timeZone }) => {
        try {
          const calendarClient = await getCalendarClient(supabase, userId);
          return await viewCalendarEvents(
            { startTime, endTime, maxResults, timeZone },
            calendarClient,
            'primary', // Default to primary calendar
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message,
          };
        }
      },
    }),
  };
}

/**
 * Calendar tool execution functions to be used after confirmation
 */
export function getCalendarExecuteFunctions(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return {
    create_calendar_event: async ({
      summary,
      startTime,
      endTime,
      attendees,
      description,
      location,
      timeZone,
    }: any) => {
      try {
        const calendarClient = await getCalendarClient(supabase, userId);
        return await createCalendarEvent(
          {
            summary,
            startTime,
            endTime,
            attendees,
            description,
            location,
            timeZone,
          },
          calendarClient,
          'primary', // Default to primary calendar
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
  };
}
