import { tool } from 'ai';
import { z } from 'zod';

const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

/**
 * Tool definition for fetching weather forecast data from OpenWeatherMap.
 */
export const getWeatherDataTool = tool({
  description:
    'Get the 5-day weather forecast (with 3-hour steps) for the given geographical coordinates.',
  parameters: z.object({
    lat: z.number().describe('The latitude of the location.'),
    lon: z.number().describe('The longitude of the location.'),
  }),
  execute: async ({ lat, lon }: { lat: number; lon: number }) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenWeather API key is not configured. Please set OPENWEATHER_API_KEY environment variable.',
      );
    }

    console.log('Get Weather Data Tool Input:');
    console.log('  Latitude:', lat);
    console.log('  Longitude:', lon);

    const apiUrl = `${OPENWEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
      console.log(
        `Fetching weather data from OpenWeatherMap for ${lat}, ${lon}...`,
      );
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        console.error(
          `OpenWeatherMap API error (${response.status}):`,
          errorData,
        );
        throw new Error(
          `Failed to fetch weather data (${response.status}): ${errorData.message || 'Unknown error'}`,
        );
      }

      const data = await response.json();
      console.log('Successfully fetched weather data.');

      return data;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error(
        `Failed to get weather data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
