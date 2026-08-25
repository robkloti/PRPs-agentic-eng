import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool definition for getting the current date and time, optionally in a specific timezone.
 */
export const datetimeTool = tool({
  description:
    "Get the current date and time, optionally specifying a timezone (e.g., 'America/New_York', 'Europe/Berlin'). Defaults to UTC if no timezone is provided.",
  parameters: z.object({
    timezone: z
      .string()
      .optional()
      .describe(
        "Optional: The IANA timezone name (e.g., 'America/Los_Angeles', 'Europe/London'). If omitted, UTC will be used.",
      ),
  }),
  execute: async ({ timezone = 'UTC' }: { timezone?: string }) => {
    console.log('Datetime Tool Input:');
    console.log('  Timezone:', timezone);

    try {
      let validTimezone = 'UTC';
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(
          new Date(),
        );
        validTimezone = timezone;
        console.log(`Using valid timezone: ${validTimezone}`);
      } catch (tzError) {
        console.warn(
          `Invalid timezone "${timezone}" provided. Falling back to UTC. Error: ${tzError}`,
        );
      }

      const now = new Date();
      const targetTimeStr = now.toLocaleString('en-US', {
        timeZone: validTimezone,
      });
      const targetTime = new Date(targetTimeStr);

      const formatted = {
        date: new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: validTimezone,
        }).format(now),
        time: new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: validTimezone,
        }).format(now),
        dateShort: new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: validTimezone,
        }).format(now),
        timeShort: new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: validTimezone,
        }).format(now),
      };

      return {
        timestamp: now.getTime(),
        iso: now.toISOString(),
        timezone: validTimezone,
        formatted: formatted,
      };
    } catch (error) {
      console.error('Error getting date/time:', error);
      throw new Error(
        `Failed to get date/time: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
