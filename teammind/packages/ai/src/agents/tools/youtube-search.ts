import { tool } from 'ai';
import Exa from 'exa-js';
import { z } from 'zod';

interface VideoDetails {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  type?: string;
  provider_name?: string;
  provider_url?: string;
}

interface VideoResult {
  videoId: string;
  url: string;
  details?: VideoDetails;
  captions?: string;
  timestamps?: string[];
}

/**
 * Tool definition for searching YouTube videos using Exa AI and a custom endpoint for details.
 */
export const youtubeSearchTool = tool({
  description:
    'Search YouTube videos using Exa AI and get detailed video information including captions and timestamps via a custom endpoint.',
  parameters: z.object({
    query: z.string().describe('The search query for YouTube videos.'),
  }),
  execute: async ({
    query,
  }: {
    query: string;
  }): Promise<{ results: VideoResult[] }> => {
    const exaApiKey = process.env.EXA_API_KEY;
    const ytEndpoint = process.env.YT_ENDPOINT;

    if (!exaApiKey) {
      throw new Error(
        'Exa API key is not configured. Please set EXA_API_KEY environment variable.',
      );
    }
    if (!ytEndpoint) {
      throw new Error(
        'YouTube endpoint URL is not configured. Please set YT_ENDPOINT environment variable.',
      );
    }

    console.log('YouTube Search Tool Input:');
    console.log('  Query:', query);

    try {
      const exa = new Exa(exaApiKey);

      console.log(
        `Performing Exa search for YouTube videos matching "${query}"...`,
      );
      const searchResult = await exa.search(query, {
        type: 'keyword',
        numResults: 10,
        includeDomains: ['youtube.com', 'youtu.be'],
      });

      if (!searchResult.results || searchResult.results.length === 0) {
        console.log('No YouTube URLs found by Exa for this query.');
        return { results: [] };
      }

      console.log(
        `Found ${searchResult.results.length} potential YouTube URLs.`,
      );

      const processedResultsPromises = searchResult.results.map(
        async (result): Promise<VideoResult | null> => {
          const videoIdMatch = result.url?.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
          );
          const videoId = videoIdMatch?.[1];

          if (!videoId || !result.url) {
            console.warn(`Could not extract video ID from URL: ${result.url}`);
            return null;
          }

          const baseResult: VideoResult = {
            videoId,
            url: result.url,
          };

          try {
            console.log(`Fetching details for video ID: ${videoId}...`);
            const [detailsResponse, captionsResponse, timestampsResponse] =
              await Promise.allSettled([
                fetch(`${ytEndpoint}/video-data`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: result.url }),
                }),
                fetch(`${ytEndpoint}/video-captions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: result.url }),
                }),
                fetch(`${ytEndpoint}/video-timestamps`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: result.url }),
                }),
              ]);

            const details =
              detailsResponse.status === 'fulfilled' && detailsResponse.value.ok
                ? await detailsResponse.value.json()
                : null;
            const captions =
              captionsResponse.status === 'fulfilled' &&
              captionsResponse.value.ok
                ? await captionsResponse.value.text()
                : null;
            const timestamps =
              timestampsResponse.status === 'fulfilled' &&
              timestampsResponse.value.ok
                ? await timestampsResponse.value.json()
                : null;

            if (
              detailsResponse.status === 'rejected' ||
              (detailsResponse.status === 'fulfilled' &&
                !detailsResponse.value.ok)
            ) {
              console.warn(
                `Failed to fetch details for ${videoId}:`,
                detailsResponse.status === 'rejected'
                  ? detailsResponse.reason
                  : await detailsResponse.value.text(),
              );
            }
            if (
              captionsResponse.status === 'rejected' ||
              (captionsResponse.status === 'fulfilled' &&
                !captionsResponse.value.ok)
            ) {
              console.warn(
                `Failed to fetch captions for ${videoId}:`,
                captionsResponse.status === 'rejected'
                  ? captionsResponse.reason
                  : await captionsResponse.value.text(),
              );
            }
            if (
              timestampsResponse.status === 'rejected' ||
              (timestampsResponse.status === 'fulfilled' &&
                !timestampsResponse.value.ok)
            ) {
              console.warn(
                `Failed to fetch timestamps for ${videoId}:`,
                timestampsResponse.status === 'rejected'
                  ? timestampsResponse.reason
                  : await timestampsResponse.value.text(),
              );
            }

            return {
              ...baseResult,
              details: details || undefined,
              captions: captions || undefined,
              timestamps: timestamps || undefined,
            };
          } catch (fetchError) {
            console.error(
              `Error fetching details from custom endpoint for video ${videoId}:`,
              fetchError,
            );
            return baseResult;
          }
        },
      );

      const validResults = (await Promise.all(processedResultsPromises)).filter(
        (result): result is VideoResult => result !== null,
      );

      console.log(
        `YouTube Search completed. Processed ${validResults.length} videos.`,
      );

      return {
        results: validResults,
      };
    } catch (error) {
      console.error('Error during YouTube search tool execution:', error);
      throw new Error(
        `YouTube search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
