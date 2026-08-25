import { tool } from 'ai';
import Exa from 'exa-js';
import { z } from 'zod';

interface XResult {
  id: string;
  url: string;
  title: string;
  author?: string;
  publishedDate?: string;
  text: string;
  highlights?: string[];
  tweetId: string;
}

const extractTweetId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1]! : null;
};

/**
 * Tool definition for searching X (formerly Twitter) using the Exa API.
 */
export const xSearchTool = tool({
  description:
    'Search X (formerly Twitter) posts based on a query and optional date range.',
  parameters: z.object({
    query: z
      .string()
      .describe(
        'The search query. Include @username for user-specific searches.',
      ),
    startDate: z
      .string()
      .optional()
      .describe(
        'The start date for the search in YYYY-MM-DD format (inclusive).',
      ),
    endDate: z
      .string()
      .optional()
      .describe(
        'The end date for the search in YYYY-MM-DD format (inclusive).',
      ),
  }),
  execute: async ({
    query,
    startDate,
    endDate,
  }: {
    query: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ results: XResult[] }> => {
    const exaApiKey = process.env.EXA_API_KEY;
    if (!exaApiKey) {
      throw new Error(
        'Exa API key is not configured. Please set EXA_API_KEY environment variable.',
      );
    }

    console.log('X Search Tool Input:');
    console.log('  Query:', query);
    console.log('  Start Date:', startDate);
    console.log('  End Date:', endDate);

    try {
      const exa = new Exa(exaApiKey);

      const searchResponse = await exa.searchAndContents(query, {
        type: 'keyword',
        numResults: 20,
        text: true,
        highlights: true,
        includeDomains: ['twitter.com', 'x.com'],
        ...(startDate && { startPublishedDate: startDate }),
        ...(endDate && { endPublishedDate: endDate }),
      });

      const processedResults = searchResponse.results.reduce<XResult[]>(
        (acc, post) => {
          const tweetId = extractTweetId(post.url);
          if (tweetId) {
            acc.push({
              id: post.id,
              url: post.url,
              title: post.title || 'Tweet',
              author: post.author,
              publishedDate: post.publishedDate,
              text: post.text || '',
              highlights: post.highlights,
              tweetId: tweetId,
            });
          }
          return acc;
        },
        [],
      );

      console.log(
        `X Search completed. Found ${processedResults.length} valid tweets.`,
      );

      return {
        results: processedResults,
      };
    } catch (error) {
      console.error('Error during X search via Exa:', error);
      throw new Error(
        `X search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
