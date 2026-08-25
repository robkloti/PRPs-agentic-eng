import { tool } from 'ai';
import { z } from 'zod';

const SMITHERY_REGISTRY_URL = 'https://registry.smithery.ai';

interface McpServerSummary {
  qualifiedName: string;
  description?: string;
}

interface McpServerDetails extends McpServerSummary {
  deploymentUrl?: string;
  connections?: any[];
}

interface McpSearchPagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface McpSearchResult {
  servers: McpServerDetails[];
  pagination: McpSearchPagination;
  query: string;
  error?: string;
}

/**
 * Tool definition for searching the Smithery Registry for MCP servers.
 */
export const mcpSearchTool = tool({
  description:
    'Search the Smithery Registry (registry.smithery.ai) for MCP servers and get information about them.',
  parameters: z.object({
    query: z.string().describe('The search query for MCP servers.'),
  }),
  execute: async ({ query }: { query: string }): Promise<McpSearchResult> => {
    const smitheryApiKey = process.env.SMITHERY_API_KEY;
    if (!smitheryApiKey) {
      console.warn(
        'Smithery API key (SMITHERY_API_KEY) is not configured. Performing public search.',
      );
    }

    console.log('MCP Search Tool Input:');
    console.log('  Query:', query);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (smitheryApiKey) {
      headers['Authorization'] = `Bearer ${smitheryApiKey}`;
    }

    try {
      console.log(`Searching Smithery Registry for "${query}"...`);
      const searchUrl = `${SMITHERY_REGISTRY_URL}/servers?q=${encodeURIComponent(query)}`;
      const searchResponse = await fetch(searchUrl, { headers });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(
          `Smithery Registry search failed (${searchResponse.status}): ${errorText}`,
        );
        return {
          servers: [],
          pagination: {
            currentPage: 0,
            pageSize: 0,
            totalItems: 0,
            totalPages: 0,
          },
          query: query,
          error: `Smithery Registry search failed (${searchResponse.status})`,
        };
      }

      const searchData = await searchResponse.json();
      const serverSummaries: McpServerSummary[] = searchData.servers || [];
      const pagination: McpSearchPagination = searchData.pagination || {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      };

      if (serverSummaries.length === 0) {
        console.log('No MCP servers found for this query.');
        return { servers: [], pagination, query };
      }

      console.log(
        `Found ${serverSummaries.length} servers. Fetching details...`,
      );

      const detailPromises = serverSummaries.map(async (server) => {
        try {
          const detailUrl = `${SMITHERY_REGISTRY_URL}/servers/${encodeURIComponent(
            server.qualifiedName,
          )}`;
          const detailResponse = await fetch(detailUrl, { headers });

          if (!detailResponse.ok) {
            console.warn(
              `Failed to fetch details for ${server.qualifiedName} (${detailResponse.status})`,
            );
            return {
              ...server,
              deploymentUrl: undefined,
              connections: undefined,
            };
          }
          const details = await detailResponse.json();
          return {
            ...server,
            deploymentUrl: details.deploymentUrl,
            connections: details.connections,
          } as McpServerDetails;
        } catch (detailError) {
          console.error(
            `Error fetching details for ${server.qualifiedName}:`,
            detailError,
          );
          return {
            ...server,
            deploymentUrl: undefined,
            connections: undefined,
          };
        }
      });

      const detailedServers = await Promise.all(detailPromises);

      console.log('MCP Search completed.');

      return {
        servers: detailedServers,
        pagination,
        query,
      };
    } catch (error) {
      console.error('Error during Smithery Registry search:', error);
      return {
        servers: [],
        pagination: {
          currentPage: 0,
          pageSize: 0,
          totalItems: 0,
          totalPages: 0,
        },
        query: query,
        error: `MCP search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
