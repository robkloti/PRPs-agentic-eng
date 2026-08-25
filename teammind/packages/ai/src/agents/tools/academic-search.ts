import { tool } from 'ai';
import Exa from 'exa-js';
import { z } from 'zod';

interface AcademicResult {
  id: string;
  url: string | null;
  title: string;
  publishedDate?: string;
  authors?: string[];
  score?: number;
  summary?: string;
}

/**
 * Tool definition for searching academic papers using the Exa API.
 */
export const academicSearchTool = tool({
  description:
    'Search academic papers and research articles using Exa AI, focusing on abstracts and summaries.',
  parameters: z.object({
    query: z.string().describe('The search query for academic papers.'),
  }),
  execute: async ({
    query,
  }: {
    query: string;
  }): Promise<{ results: AcademicResult[] }> => {
    const exaApiKey = process.env.EXA_API_KEY;
    if (!exaApiKey) {
      throw new Error(
        'Exa API key is not configured. Please set EXA_API_KEY environment variable.',
      );
    }

    console.log('Academic Search Tool Input:');
    console.log('  Query:', query);

    try {
      const exa = new Exa(exaApiKey);

      console.log(`Performing Exa academic search for "${query}"...`);
      const searchResponse = await exa.searchAndContents(query, {
        type: 'auto',
        numResults: 15,
        category: 'research paper',
        summary: {
          query: 'Abstract of the Paper',
        },
      });

      const seenUrls = new Set<string>();
      const processedResults = searchResponse.results.reduce<AcademicResult[]>(
        (acc, paper) => {
          const paperSummary = (paper as any).summary;

          if (!paper.url || seenUrls.has(paper.url) || !paperSummary) {
            if (!paperSummary)
              console.warn(
                `Skipping paper (ID: ${paper.id}) due to missing summary.`,
              );
            return acc;
          }
          seenUrls.add(paper.url);

          const cleanSummary = String(paperSummary)
            .replace(/^Summary:\s*/i, '')
            .trim();

          const cleanTitle = (paper.title || 'Untitled Paper')
            .replace(/\s*\[.*?\]\s*$/, '')
            .replace(/\.pdf$/i, '')
            .trim();

          if (cleanSummary.length < 20) {
            console.warn(
              `Skipping paper (ID: ${paper.id}) due to short summary: "${cleanSummary}"`,
            );
            return acc;
          }

          acc.push({
            id: paper.id,
            url: paper.url,
            title: cleanTitle,
            publishedDate: paper.publishedDate,
            authors: paper.author ? paper.author.split(', ') : undefined,
            score: paper.score,
            summary: cleanSummary,
          });

          return acc;
        },
        [],
      );

      console.log(
        `Academic Search completed. Found ${processedResults.length} relevant papers.`,
      );

      return {
        results: processedResults,
      };
    } catch (error) {
      console.error('Error during Academic search via Exa:', error);
      throw new Error(
        `Academic search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
