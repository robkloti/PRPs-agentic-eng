import { tool } from 'ai';
import { z } from 'zod';

interface RetrievedContent {
  url: string;
  content: string;
  title: string;
  description: string;
  language: string;
}

interface RetrieveResult {
  base_url?: string;
  results: RetrievedContent[];
  response_time?: number;
  error?: string;
}

/**
 * Tool definition for retrieving and crawling content from a URL using the Tavily API.
 */
export const retrieveTool = tool({
  description:
    'Retrieve content from a specific URL using Tavily crawl API. Can optionally focus the crawl with a query and specify categories.',
  parameters: z.object({
    url: z.string().url().describe('The URL to retrieve content from.'),
    query: z
      .string()
      .optional()
      .describe(
        'Optional query to focus the crawl on specific information within the page(s).',
      ),
    extract_depth: z
      .enum(['basic', 'advanced'])
      .default('basic')
      .describe(
        'Level of extraction detail. "basic" gets main content, "advanced" attempts deeper extraction. Defaults to basic.',
      ),
    categories: z
      .array(
        z.enum([
          'Careers',
          'Blog',
          'Documentation',
          'About',
          'Pricing',
          'Community',
          'Developers',
          'Contact',
          'Media',
        ]),
      )
      .optional()
      .describe(
        'Optional list of specific page categories to target during the crawl (e.g., ["Documentation", "Blog"]). If omitted, Tavily might crawl based on relevance.',
      ),
  }),
  execute: async ({
    url,
    query = '',
    extract_depth = 'basic',
    categories,
  }: {
    url: string;
    query?: string;
    extract_depth?: 'basic' | 'advanced';
    categories?: string[];
  }): Promise<RetrieveResult> => {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      throw new Error(
        'Tavily API key is not configured. Please set TAVILY_API_KEY environment variable.',
      );
    }

    console.log('Retrieve Tool Input:');
    console.log('  URL:', url);
    console.log('  Query:', query);
    console.log('  Extract Depth:', extract_depth);
    console.log('  Categories:', categories);

    try {
      const requestBody: any = {
        url,
        max_depth: 1,
        max_breadth: 1,
        limit: 5,
        query,
        allow_external: false,
        extract_depth,
      };

      if (categories && categories.length > 0) {
        requestBody.categories = categories;
      }

      const response = await fetch('https://api.tavily.com/crawl', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tavilyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Tavily Crawl API error (${response.status}): ${errorText}`,
        );
        return {
          error: `Failed to retrieve content (${response.status})`,
          results: [],
        };
      }

      const data = await response.json();

      if (!data || !data.results || data.results.length === 0) {
        console.log('Tavily crawl returned no results for URL:', url);
        return { results: [] };
      }

      console.log(
        `Successfully retrieved content for ${data.results.length} page(s) from ${url}.`,
      );

      const formattedResults = data.results.map(
        (result: any): RetrievedContent => ({
          url: result.url,
          content: result.raw_content || '',
          title:
            result.metadata?.title ||
            result.url.split('/').pop() ||
            'Retrieved Content',
          description:
            result.metadata?.description ||
            `Content retrieved from ${result.url}`,
          language: result.metadata?.language || 'en',
        }),
      );

      return {
        base_url: data.base_url,
        results: formattedResults,
        response_time: data.response_time,
      };
    } catch (error) {
      console.error('Error during Tavily crawl API call:', error);
      return {
        error: `Failed to retrieve content: ${error instanceof Error ? error.message : String(error)}`,
        results: [],
      };
    }
  },
});
