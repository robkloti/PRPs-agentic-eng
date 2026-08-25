import { tavily } from '@tavily/core';
import { tool } from 'ai';
import { z } from 'zod';

import {
  deduplicateByDomainAndUrl,
  isValidImageUrl,
  sanitizeUrl,
} from './utils';

interface WebSearchResult {
  url: string;
  title: string;
  content: string;
  published_date?: string;
}

interface WebSearchImageResult {
  url: string;
  description?: string;
}

interface QueryResult {
  query: string;
  results: WebSearchResult[];
  images: WebSearchImageResult[] | string[];
}

/**
 * Creates a web search tool using the Tavily API.
 *
 * @param tavilyApiKey - The Tavily API key. Defaults to process.env.TAVILY_API_KEY.
 * @param dataStream - The AI SDK data stream object for sending annotations.
 * @returns A tool definition for web search.
 */
export const createWebSearchTool = (
  tavilyApiKey: string = process.env.TAVILY_API_KEY!,
  dataStream: any,
) =>
  tool({
    description:
      'Search the web for information with multiple queries, specifying max results, topics, search depth, and domains to exclude.',
    parameters: z.object({
      queries: z
        .array(
          z
            .string()
            .describe(
              'Search query to look up on the web. Aim for 5-10 queries for comprehensive results.',
            ),
        )
        .describe('Array of search queries.'),
      maxResults: z
        .array(
          z
            .number()
            .describe(
              'Maximum number of results to return per query. Default is 10.',
            ),
        )
        .optional()
        .describe(
          'Array of maximum results per query. If shorter than queries array, last value is reused.',
        ),
      topics: z
        .array(
          z
            .enum(['general', 'news', 'finance'])
            .describe('Topic type for the search. Default is general.'),
        )
        .optional()
        .describe(
          'Array of topics per query. If shorter than queries array, last value is reused.',
        ),
      searchDepth: z
        .array(
          z
            .enum(['basic', 'advanced'])
            .describe(
              'Search depth. Default is basic. Use advanced for more detailed results.',
            ),
        )
        .optional()
        .describe(
          'Array of search depths per query. If shorter than queries array, last value is reused.',
        ),
      exclude_domains: z
        .array(z.string())
        .optional()
        .describe(
          'A list of domains to exclude from all search results. Default is empty.',
        ),
      include_image_descriptions: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Whether to include descriptions for images. Default is true.',
        ),
    }),
    execute: async ({
      queries,
      maxResults = [],
      topics = [],
      searchDepth = [],
      exclude_domains = [],
      include_image_descriptions = true,
    }: {
      queries: string[];
      maxResults?: number[];
      topics?: ('general' | 'news' | 'finance')[];
      searchDepth?: ('basic' | 'advanced')[];
      exclude_domains?: string[];
      include_image_descriptions?: boolean;
    }): Promise<{ searches: QueryResult[] }> => {
      if (!tavilyApiKey) {
        throw new Error(
          'Tavily API key is not configured. Please set TAVILY_API_KEY environment variable.',
        );
      }
      const tvly = tavily({ apiKey: tavilyApiKey });

      console.log('Web Search Tool Input:');
      console.log('  Queries:', queries);
      console.log('  Max Results:', maxResults);
      console.log('  Topics:', topics);
      console.log('  Search Depths:', searchDepth);
      console.log('  Exclude Domains:', exclude_domains);
      console.log('  Include Image Descriptions:', include_image_descriptions);

      const searchPromises = queries.map(async (query, index) => {
        const currentTopic =
          topics[index] ?? topics[topics.length - 1] ?? 'general';
        const currentMaxResults =
          maxResults[index] ?? maxResults[maxResults.length - 1] ?? 10;
        const currentSearchDepth =
          searchDepth[index] ?? searchDepth[searchDepth.length - 1] ?? 'basic';

        try {
          const data = await tvly.search(query, {
            topic: currentTopic,
            days: currentTopic === 'news' ? 7 : undefined,
            maxResults: currentMaxResults,
            searchDepth: currentSearchDepth,
            includeAnswer: true,
            includeImages: true,
            includeImageDescriptions: include_image_descriptions,
            excludeDomains: exclude_domains,
          });

          if (
            dataStream &&
            typeof dataStream.writeMessageAnnotation === 'function'
          ) {
            dataStream.writeMessageAnnotation({
              type: 'query_completion',
              data: {
                query,
                index,
                total: queries.length,
                status: 'completed',
                resultsCount: data.results.length,
                imagesCount: data.images.length,
              },
            });
          } else {
            console.warn(
              'dataStream object or writeMessageAnnotation method not available. Skipping annotation.',
            );
          }

          const processedResults = deduplicateByDomainAndUrl(data.results).map(
            (obj: any): WebSearchResult => ({
              url: obj.url,
              title: obj.title,
              content: obj.content,
              ...(currentTopic === 'news' && obj.published_date
                ? { published_date: obj.published_date }
                : {}),
            }),
          );

          let processedImages: WebSearchImageResult[] | string[];
          if (include_image_descriptions) {
            processedImages = await Promise.all(
              deduplicateByDomainAndUrl(data.images).map(
                async ({
                  url,
                  description,
                }: {
                  url: string;
                  description?: string;
                }): Promise<WebSearchImageResult | null> => {
                  const sanitizedUrl = sanitizeUrl(url);
                  const imageValidation = await isValidImageUrl(sanitizedUrl);
                  return imageValidation.valid && description
                    ? {
                        url: imageValidation.redirectedUrl || sanitizedUrl,
                        description: description,
                      }
                    : null;
                },
              ),
            ).then((results) =>
              results.filter(
                (image): image is WebSearchImageResult => image !== null,
              ),
            );
          } else {
            processedImages = await Promise.all(
              deduplicateByDomainAndUrl(data.images).map(
                async ({ url }: { url: string }): Promise<string | null> => {
                  const sanitizedUrl = sanitizeUrl(url);
                  const imageValidation = await isValidImageUrl(sanitizedUrl);
                  return imageValidation.valid
                    ? imageValidation.redirectedUrl || sanitizedUrl
                    : null;
                },
              ),
            ).then((results) =>
              results.filter((url): url is string => url !== null),
            );
          }

          return {
            query,
            results: processedResults,
            images: processedImages,
          };
        } catch (error) {
          console.error(
            `Error during Tavily search for query "${query}":`,
            error,
          );
          if (
            dataStream &&
            typeof dataStream.writeMessageAnnotation === 'function'
          ) {
            dataStream.writeMessageAnnotation({
              type: 'query_completion',
              data: {
                query,
                index,
                total: queries.length,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
          return {
            query,
            results: [],
            images: [],
          };
        }
      });

      const searchResults = await Promise.all(searchPromises);

      return {
        searches: searchResults,
      };
    },
  });
