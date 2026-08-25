import { tool } from 'ai';
import { z } from 'zod';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

interface TmdbSearchResult {
  id: number;
  media_type: 'movie' | 'tv';
}

interface TmdbPerson {
  name: string;
  profile_path: string | null;
}

interface TmdbMediaDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

interface TmdbCredits {
  cast: TmdbPerson[];
  crew: TmdbPerson[];
}

interface MediaResult extends TmdbMediaDetails {
  media_type: 'movie' | 'tv';
  credits: {
    cast: TmdbPerson[];
    director?: string;
    writer?: string;
  };
  poster_path: string | null;
  backdrop_path: string | null;
}

/**
 * Tool definition for searching movies or TV shows using the TMDB API.
 */
export const movieOrTvSearchTool = tool({
  description:
    'Search for detailed information about a movie or TV show using The Movie Database (TMDB).',
  parameters: z.object({
    query: z
      .string()
      .describe('The name of the movie or TV show to search for.'),
  }),
  execute: async ({
    query,
  }: {
    query: string;
  }): Promise<{ result: MediaResult | null }> => {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      throw new Error(
        'TMDB API key is not configured. Please set TMDB_API_KEY environment variable.',
      );
    }

    console.log('Movie/TV Search Tool Input:');
    console.log('  Query:', query);

    const headers = {
      Authorization: `Bearer ${tmdbApiKey}`,
      accept: 'application/json',
    };

    try {
      console.log(`Performing TMDB multi-search for "${query}"...`);
      const searchResponse = await fetch(
        `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(
          query,
        )}&include_adult=false&language=en-US&page=1`,
        { headers },
      );

      if (!searchResponse.ok) {
        console.error(
          `TMDB multi-search failed: ${searchResponse.status} ${searchResponse.statusText}`,
        );
        throw new Error(
          `TMDB multi-search request failed with status ${searchResponse.status}`,
        );
      }

      const searchResults = await searchResponse.json();
      const firstResult = searchResults.results?.find(
        (result: any): result is TmdbSearchResult =>
          result.media_type === 'movie' || result.media_type === 'tv',
      );

      if (!firstResult) {
        console.log(`No movie or TV show found for query "${query}".`);
        return { result: null };
      }

      console.log(
        `Found top result: ${firstResult.media_type} with ID ${firstResult.id}`,
      );

      console.log(
        `Fetching details and credits for ${firstResult.media_type} ID ${firstResult.id}...`,
      );
      const detailsUrl = `${TMDB_BASE_URL}/${firstResult.media_type}/${firstResult.id}?language=en-US`;
      const creditsUrl = `${TMDB_BASE_URL}/${firstResult.media_type}/${firstResult.id}/credits?language=en-US`;

      const [detailsResponse, creditsResponse] = await Promise.all([
        fetch(detailsUrl, { headers }),
        fetch(creditsUrl, { headers }),
      ]);

      if (!detailsResponse.ok) {
        console.error(
          `TMDB details fetch failed: ${detailsResponse.status} ${detailsResponse.statusText}`,
        );
        throw new Error(
          `TMDB details request failed with status ${detailsResponse.status}`,
        );
      }
      if (!creditsResponse.ok) {
        console.error(
          `TMDB credits fetch failed: ${creditsResponse.status} ${creditsResponse.statusText}`,
        );
        console.warn(`Could not fetch credits for ${firstResult.id}.`);
      }

      const details: TmdbMediaDetails = await detailsResponse.json();
      const credits: TmdbCredits | null = creditsResponse.ok
        ? await creditsResponse.json()
        : null;

      const formattedResult: MediaResult = {
        ...details,
        media_type: firstResult.media_type,
        poster_path: details.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}`
          : null,
        backdrop_path: details.backdrop_path
          ? `${TMDB_IMAGE_BASE_URL}${details.backdrop_path}`
          : null,
        credits: {
          cast:
            credits?.cast?.slice(0, 10).map((person: any) => ({
              ...person,
              profile_path: person.profile_path
                ? `${TMDB_IMAGE_BASE_URL}${person.profile_path}`
                : null,
            })) || [],
          director: credits?.crew?.find(
            (person: any) => person.job === 'Director',
          )?.name,
          writer: credits?.crew?.find(
            (person: any) =>
              person.department === 'Writing' &&
              (person.job === 'Screenplay' || person.job === 'Writer'),
          )?.name,
        },
      };

      console.log('Successfully retrieved and formatted TMDB data.');
      return { result: formattedResult };
    } catch (error) {
      console.error('Error during TMDB search:', error);
      return { result: null };
    }
  },
});
