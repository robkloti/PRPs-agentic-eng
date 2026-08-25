import { tool } from 'ai';
import { z } from 'zod';

const AVIATIONSTACK_API_URL = 'https://api.aviationstack.com/v1/flights';

/**
 * Tool definition for tracking flight information using the AviationStack API.
 */
export const trackFlightTool = tool({
  description:
    'Track real-time flight information and status using the flight number.',
  parameters: z.object({
    flight_number: z
      .string()
      .describe(
        'The flight number (IATA format, e.g., "AA123", "BA456") to track.',
      ),
  }),
  execute: async ({ flight_number }: { flight_number: string }) => {
    const apiKey = process.env.AVIATION_STACK_API_KEY;
    if (!apiKey) {
      throw new Error(
        'AviationStack API key is not configured. Please set AVIATION_STACK_API_KEY environment variable.',
      );
    }

    if (!/^[A-Z0-9]{2}\d+$/i.test(flight_number)) {
      console.warn(
        `Potentially invalid flight number format: ${flight_number}. Attempting API call anyway.`,
      );
    }

    console.log('Track Flight Tool Input:');
    console.log('  Flight Number:', flight_number);

    const apiUrl = `${AVIATIONSTACK_API_URL}?access_key=${apiKey}&flight_iata=${flight_number}`;

    try {
      console.log(
        `Fetching flight data for ${flight_number} from AviationStack...`,
      );
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        console.error(
          `AviationStack API error (${response.status}):`,
          errorData,
        );
        let errorMessage = `Failed to fetch flight data (${response.status})`;
        if (errorData?.error?.message) {
          errorMessage += `: ${errorData.error.message}`;
        } else if (errorData?.message) {
          errorMessage += `: ${errorData.message}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Successfully fetched flight data.');

      if (!data || !data.data || data.data.length === 0) {
        console.log(`No flight data found for flight number: ${flight_number}`);
        return {
          message: `No flight data found for ${flight_number}. Please check the flight number and try again.`,
        };
      }

      return data;
    } catch (error) {
      console.error('Error fetching flight data:', error);
      return {
        error: `Failed to track flight: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
