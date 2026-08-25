import { tool } from 'ai';
import { z } from 'zod';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

interface TrendingTvResult {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  media_type: 'tv';
}

/**
 * Tool definition for fetching trending TV shows from TMDB.
 */
export const trendingTvTool = tool({
  description: 'Get the list of TV shows currently trending on TMDB.',
  parameters: z.object({}),
  execute: async (): Promise<{ results: TrendingTvResult[] }> => {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      throw new Error(
        'TMDB API key is not configured. Please set TMDB_API_KEY environment variable.',
      );
    }

    console.log('Fetching trending TV shows from TMDB...');

    const headers = {
      Authorization: `Bearer ${tmdbApiKey}`,
      accept: 'application/json',
    };

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/tv/day?language=en-US`,
        { headers },
      );

      if (!response.ok) {
        console.error(
          `TMDB trending TV fetch failed: ${response.status} ${response.statusText}`,
        );
        throw new Error(
          `TMDB trending TV request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      const results =
        data.results?.map(
          (show: any): TrendingTvResult => ({
            ...show,
            media_type: 'tv',
            poster_path: show.poster_path
              ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}`
              : null,
            backdrop_path: show.backdrop_path
              ? `${TMDB_IMAGE_BASE_URL}${show.backdrop_path}`
              : null,
          }),
        ) || [];

      console.log(`Successfully fetched ${results.length} trending TV shows.`);

      return { results };
    } catch (error) {
      console.error('Error fetching trending TV shows:', error);
      throw new Error(
        `Failed to fetch trending TV shows: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
