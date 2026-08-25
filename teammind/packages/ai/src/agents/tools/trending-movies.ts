import { tool } from 'ai';
import { z } from 'zod';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

interface TrendingMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  media_type: 'movie';
}

/**
 * Tool definition for fetching trending movies from TMDB.
 */
export const trendingMoviesTool = tool({
  description: 'Get the list of movies currently trending on TMDB.',
  parameters: z.object({}),
  execute: async (): Promise<{ results: TrendingMovieResult[] }> => {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      throw new Error(
        'TMDB API key is not configured. Please set TMDB_API_KEY environment variable.',
      );
    }

    console.log('Fetching trending movies from TMDB...');

    const headers = {
      Authorization: `Bearer ${tmdbApiKey}`,
      accept: 'application/json',
    };

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/movie/day?language=en-US`,
        { headers },
      );

      if (!response.ok) {
        console.error(
          `TMDB trending movies fetch failed: ${response.status} ${response.statusText}`,
        );
        throw new Error(
          `TMDB trending movies request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      const results =
        data.results?.map(
          (movie: any): TrendingMovieResult => ({
            ...movie,
            media_type: 'movie',
            poster_path: movie.poster_path
              ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
              : null,
            backdrop_path: movie.backdrop_path
              ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}`
              : null,
          }),
        ) || [];

      console.log(`Successfully fetched ${results.length} trending movies.`);

      return { results };
    } catch (error) {
      console.error('Error fetching trending movies:', error);
      throw new Error(
        `Failed to fetch trending movies: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
