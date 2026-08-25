import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI, Type } from '@google/genai';
import {
  BlockObjectResponse,
  PageObjectResponse,
  SearchResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { Database } from '@tm/supabase/database';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { PromptTemplate } from '../../prompts';
import {
  DocumentAction,
  DocumentCreateResult,
  NotionConfig,
} from '../../types';
import { CreateActionExecutor, CreateExecutionResult } from '../shared';
import { markdownToBlocks } from './md-to-notion-converter';
import { CachingRateLimitedNotionClient } from './tm-advanced-notion-client';

/**
 * Notion-specific result that extends the base result
 */
export interface NotionCreateResult
  extends DocumentCreateResult,
    CreateExecutionResult {
  parentId?: string;
}

/**
 * Result of Notion page operations
 */
interface NotionPageResult {
  id: string;
  title: string;
  url: string;
  parentId?: string;
}

/**
 * Interface for database result row
 */
interface DbPageResult {
  id: number;
  source_id: string;
  title: string;
  content: string;
  hierarchy_path: string | null;
  document_user_access: {
    user_id: string;
  }[];
}

// Type for block with children for recursive fetching
type BlockWithChildren = BlockObjectResponse & {
  children?: BlockWithChildren[];
};

// Type for complete page data
type CompletePageData = {
  page: PageObjectResponse;
  blocks: BlockWithChildren[];
};

// Prompt template for parent page selection
const parentPageSelectionPrompt = PromptTemplate.create<{
  title: string;
  contentPreview: string;
  pageData: string;
}>(`You are an expert AI assistant specializing in organizing Notion workspaces. Your task is to determine the best parent page for a new Notion document based on its title and content preview.

**Context:**
You will be given details about a new document and a list of potential parent pages within a Notion workspace.

**New Document Details:**
*   **Title:** "{{title}}"
*   **Content Preview (first 500 characters):** "{{contentPreview}}"

**Potential Parent Pages:**
Below is a list of potential parent pages where the new document could be placed. Each entry includes its ID, title, and potentially its hierarchical path (e.g., 'Workspace Root / Project Alpha / Meeting Notes').

{{pageData}}

**Your Goal:**
1.  **Analyze:** Carefully evaluate each potential parent page against the new document's details.
2.  **Select:** Choose the SINGLE most appropriate parent page based on the criteria below.
3.  **Verify:** Briefly double-check if your chosen parent page is truly the best fit compared to other options.

**Decision Criteria (Apply in order):**
1.  **Topical Relevance:** Prioritize the parent page whose topic, theme, or subject matter most closely aligns with the new document's title and content.
2.  **Organizational Fit:** Consider the existing hierarchy (indicated by the 'path', if available). Place the new document where it logically belongs within the structure. Prefer more specific, relevant subpages over general top-level pages if the topic matches well. Avoid placing documents in overly generic top-level pages if a more suitable subpage exists.

**Output Format:**
Provide your final selection strictly in the following JSON format. Do not include any text outside the JSON structure.
{
  "selectedPageId": "ID_OF_THE_CHOSEN_PAGE",
  "reason": "A concise explanation (1-2 sentences) justifying your choice based on the decision criteria. Mention the title of the chosen page for clarity."
}

**Example Reason:** "Selected 'Meeting Notes' (ID: xyz) as it directly relates to the document title 'Project Kickoff Meeting' and fits within the 'Project Alpha' hierarchy."
`);

/**
 * Executor implementation for Notion operations
 */
export class NotionExecutor
  implements CreateActionExecutor<NotionConfig, DocumentAction>
{
  private readonly ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  });
  private readonly supabase: SupabaseClient<Database> = getSupabaseServerClient(
    {
      admin: true,
    },
  );

  /**
   * Execute Notion document operations
   */
  async execute(
    actionData: DocumentAction,
    config: NotionConfig,
    userId: string,
  ): Promise<NotionCreateResult> {
    const { action, title, parentPageId, pageId, content } = actionData;

    // Create client early to reuse
    const notionClient = new CachingRateLimitedNotionClient({
      auth: config.accessToken,
    });

    if (action === 'update') {
      // Update document - first fetch original content
      if (!pageId) {
        throw new Error('Page ID is required for updating a Notion page');
      }

      // Get original Markdown from Supabase
      const { data: originalMarkdown } = await this.supabase
        .from('documents')
        .select('content, document_user_access!inner(user_id)')
        .eq('source_id', pageId)
        .eq('source', 'notion')
        .eq('document_user_access.user_id', userId)
        .single();

      // Fetch original page content directly from Notion API
      const originalContent = await this.fetchCompletePageData(
        pageId,
        notionClient,
      );

      const apiResult = await this.updatePage(
        {
          pageId: pageId,
          title: title,
          content,
        },
        notionClient,
        originalContent,
      );

      return {
        id: apiResult.id,
        title: apiResult.title,
        url: apiResult.url,
        source: 'notion',
        contentBefore: originalMarkdown?.content,
      };
    } else if (action === 'create') {
      // For creates, we don't need to fetch original content
      let parentId = parentPageId;

      if (!parentId) {
        console.log(
          'No parent page ID provided, finding appropriate parent...',
        );
        try {
          // Find an appropriate parent page
          parentId = await this.findParentPage(
            title ?? 'Untitled Document',
            content,
            config,
            userId,
          );
        } catch (error) {
          console.error('Error finding parent page:', error);
          throw new Error(
            'Failed to find a suitable parent page in Notion. Please specify a parent page ID.',
          );
        }
      }

      const apiResult = await this.createPage(
        {
          parentId: parentId,
          parentType: 'page',
          title: title ?? 'Untitled Document',
          content,
        },
        notionClient,
      );

      return {
        id: apiResult.id,
        title: apiResult.title,
        url: apiResult.url,
        parentId: apiResult.parentId,
        source: 'notion',
      };
    } else {
      throw new Error(`Unsupported action type: ${action}`);
    }
  }

  /**
   * Fetches complete page data including all blocks and their children
   */
  private async fetchCompletePageData(
    pageId: string,
    client: CachingRateLimitedNotionClient,
  ): Promise<CompletePageData> {
    // Fetch page metadata and blocks in parallel
    const [pageObj, blocks] = await Promise.all([
      client.pages.retrieve({ page_id: pageId }) as Promise<PageObjectResponse>,
      this.fetchAllBlocksRecursive(pageId, client),
    ]);

    // Combine into a complete representation
    return {
      page: pageObj,
      blocks: blocks,
    };
  }

  /**
   * Recursively fetches all blocks and their children
   */
  private async fetchAllBlocksRecursive(
    blockId: string,
    client: CachingRateLimitedNotionClient,
  ): Promise<BlockWithChildren[]> {
    const blocks: BlockWithChildren[] = [];
    let cursor: string | undefined;

    do {
      const response = await client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100, // Get maximum blocks per request
      });

      // Filter to only include BlockObjectResponse objects and convert to BlockWithChildren
      const fullBlocks = response.results.filter(
        (block): block is BlockObjectResponse => 'type' in block,
      ) as BlockWithChildren[];

      blocks.push(...fullBlocks);

      // Process blocks with children in parallel batches
      const blockBatches = this.chunkArray(
        fullBlocks.filter((block) => block.has_children),
        10, // Process 10 blocks with children at a time
      );

      for (const batch of blockBatches) {
        await Promise.all(
          batch.map(async (block) => {
            const childBlocks = await this.fetchAllBlocksRecursive(
              block.id,
              client,
            );
            // Add a reference to parent block for organization
            block.children = childBlocks;
          }),
        );
      }

      cursor = response.next_cursor ?? undefined;
    } while (cursor);

    return blocks;
  }

  /**
   * Helper to chunk an array for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Find the most appropriate parent page based on the content and title
   * Uses the database to find pages the user has access to, with fallback to Notion API
   */
  private async findParentPage(
    title: string,
    content: string,
    config: NotionConfig,
    userId: string,
  ): Promise<string> {
    const notionClient = new CachingRateLimitedNotionClient({
      auth: config.accessToken,
    });

    // Get top-level pages that user has access to from database
    const { data: accessiblePages, error } = await this.supabase
      .from('documents')
      .select(
        'id, source_id, title, content, hierarchy_path, document_user_access!inner(user_id)',
      )
      .eq('source', 'notion')
      .is('source_parent_id', null)
      .eq('metadata->>space_id', config.workspaceId)
      .eq('metadata->>is_database', 'false')
      .eq('document_user_access.user_id', userId)
      .order('source_updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching pages from database:', error);
      throw new Error('Failed to fetch accessible pages');
    }

    // If no pages found in database, search directly via Notion API
    if (!accessiblePages || accessiblePages.length === 0) {
      const response = await notionClient.search({
        query: '',
        filter: {
          property: 'object',
          value: 'page',
        },
        page_size: 20,
      });

      if (response.results.length === 0) {
        throw new Error('No pages found in this Notion workspace');
      }

      // If only one page found in API results, use it
      if (response.results.length === 1) {
        return response.results[0]!.id;
      }

      // If multiple pages found via API, let AI decide
      return this.selectPageWithAI(response, title, content, true);
    }

    // If only one page is available in DB results, use it
    if (accessiblePages.length === 1) {
      return accessiblePages[0]!.source_id;
    }

    // Use AI to select from DB results
    return this.selectPageWithAI(accessiblePages, title, content, false);
  }

  /**
   * Use AI to select the most appropriate parent page from a list of candidates
   * Works with both database results and Notion API search results
   *
   * @param pages Database results or Notion API search results
   * @param title Title of the new page
   * @param content Content of the new page
   * @param isApiResults Whether the pages are from the Notion API
   */
  private async selectPageWithAI(
    pages: DbPageResult[] | SearchResponse,
    title: string,
    content: string,
    isApiResults: boolean,
  ): Promise<string> {
    // Convert pages to common format for AI selection
    const pageData = isApiResults
      ? this.convertApiResultsToPageData(pages as SearchResponse)
      : (pages as DbPageResult[]).map((page) => ({
          id: page.source_id,
          title: page.title,
          path: page.hierarchy_path ?? '',
        }));

    // Quick heuristic: If title contains exact match with any page title, use that page
    const contentPreview = content.substring(0, 500); // Just use a short preview
    for (const page of pageData) {
      if (
        title.toLowerCase().includes(page.title.toLowerCase()) ||
        page.title.toLowerCase().includes(title.toLowerCase())
      ) {
        console.log(`Heuristic match found: ${page.title} - using as parent`);
        return page.id;
      }
    }

    // Create a structured prompt using the template
    const formattedPrompt = parentPageSelectionPrompt.format({
      title,
      contentPreview: contentPreview,
      pageData: JSON.stringify(pageData, null, 2),
    });

    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 4096,
          },
          responseSchema: {
            type: Type.OBJECT,
            description:
              'Select the most appropriate parent page for new content',
            properties: {
              selectedPageId: {
                type: Type.STRING,
                description: 'ID of the selected parent page',
              },
              reason: {
                type: Type.STRING,
                description:
                  'Brief reason for selection (internal logging only)',
              },
            },
            required: ['selectedPageId', 'reason'],
          },
        },
      });

      if (!result.text) {
        throw new Error('Parent page selection response did not contain text.');
      }
      const response = JSON.parse(result.text) as {
        selectedPageId: string;
        reason: string;
      };

      // Validate if the response is one of the page IDs
      const isValidPageId = pageData.some(
        (page) => page.id === response.selectedPageId,
      );

      if (isValidPageId) {
        console.log(
          `AI selected parent page: ${response.selectedPageId} (Reason: ${response.reason})`,
        );
        return response.selectedPageId;
      }

      // If AI didn't return a valid ID, use the first page
      console.log('AI did not return a valid page ID, using first page');

      if (isApiResults) {
        const searchResults = pages as SearchResponse;
        return searchResults.results[0]!.id;
      } else {
        const dbResults = pages as DbPageResult[];
        return dbResults[0]!.source_id;
      }
    } catch (error) {
      console.error('Error using AI to select parent page:', error);
      // Fall back to first page
      if (isApiResults) {
        const searchResults = pages as SearchResponse;
        return searchResults.results[0]!.id;
      } else {
        const dbResults = pages as DbPageResult[];
        return dbResults[0]!.source_id;
      }
    }
  }

  /**
   * Convert Notion API results to page data format
   */
  private convertApiResultsToPageData(apiResults: SearchResponse) {
    return apiResults.results.map((page) => {
      // Extract title from Notion page object
      let pageTitle = 'Untitled';

      try {
        if (
          'object' in page &&
          page.object === 'page' &&
          'properties' in page
        ) {
          const properties = page.properties;
          // Find title property if it exists
          const titleProp = properties.title;
          if (
            titleProp &&
            titleProp.type === 'title' &&
            Array.isArray(titleProp.title)
          ) {
            pageTitle = titleProp.title
              .map((text) => text.plain_text || '')
              .join('');
          }
        }
      } catch (e) {
        console.error('Error extracting page title:', e);
      }

      return {
        id: page.id,
        title: pageTitle,
      };
    });
  }

  /**
   * Create a new page in Notion
   */
  private async createPage(
    params: {
      parentId: string;
      parentType: 'page' | 'database';
      title: string;
      content: string;
    },
    notionClient: CachingRateLimitedNotionClient,
  ): Promise<NotionPageResult> {
    // Convert markdown content to Notion blocks with GFM support
    const blocks = markdownToBlocks(params.content, {
      // Enable HTML parsing for details/summary tags
      parseLinksAsBookmarks: true,
      parseEmojiPrefixAsCallout: true,
    });

    // Create parent property based on parentType
    const parent =
      params.parentType === 'page'
        ? { page_id: params.parentId }
        : { database_id: params.parentId };

    // Create the page
    const response = await notionClient.pages.create({
      parent,
      properties: {
        title: {
          title: [
            {
              text: {
                content: params.title,
              },
            },
          ],
        },
      },
      children: blocks,
    });

    return {
      id: response.id,
      title: params.title,
      url: `https://notion.so/${response.id.replace(/-/g, '')}`,
      parentId: params.parentId,
    };
  }

  /**
   * Update an existing page in Notion with proper handling of tables
   */
  private async updatePage(
    params: {
      pageId: string;
      title?: string;
      content: string;
    },
    notionClient: CachingRateLimitedNotionClient,
    pageData: CompletePageData,
  ): Promise<NotionPageResult> {
    // Run title update and block categorization in parallel
    const [_, { blocksToDelete, blocksToPreserve }] = await Promise.all([
      // Update title if provided
      params.title
        ? notionClient.pages.update({
            page_id: params.pageId,
            properties: {
              title: {
                title: [
                  {
                    text: {
                      content: params.title,
                    },
                  },
                ],
              },
            },
          })
        : Promise.resolve(null),

      // Categorize blocks in parallel
      Promise.resolve(this.categorizeBlocksRecursively(pageData.blocks)),
    ]);

    console.log(
      `Smart update: Preserving ${blocksToPreserve.length} blocks (media, embeds, etc.), ` +
        `deleting ${blocksToDelete.length} text and table blocks`,
    );

    // Delete text blocks and tables in parallel
    await this.deleteBlocks(pageData.blocks, notionClient);

    // Convert markdown to Notion blocks with enhanced GFM support
    const newBlocks = markdownToBlocks(params.content, {
      // Enable HTML parsing for details/summary tags
      parseLinksAsBookmarks: true,
      parseEmojiPrefixAsCallout: true,
    });

    // Add new blocks
    if (newBlocks.length > 0) {
      await notionClient.blocks.children.append({
        block_id: params.pageId,
        children: newBlocks,
      });
    }

    return {
      id: params.pageId,
      title: params.title ?? 'Untitled',
      url: `https://notion.so/${params.pageId.replace(/-/g, '')}`,
    };
  }

  /**
   * Recursively categorize blocks into those that should be preserved vs deleted
   */
  private categorizeBlocksRecursively(blocks: BlockWithChildren[]): {
    blocksToDelete: string[];
    blocksToPreserve: string[];
  } {
    const blocksToDelete: string[] = [];
    const blocksToPreserve: string[] = [];

    for (const block of blocks) {
      if (block.type === 'column_list' || block.type === 'column') {
        // Preserve the column structure itself
        blocksToPreserve.push(block.id);

        // Process children recursively if they exist
        if (block.children && block.children.length > 0) {
          const {
            blocksToDelete: childrenToDelete,
            blocksToPreserve: childrenToPreserve,
          } = this.categorizeBlocksRecursively(block.children);

          // Add children blocks to appropriate lists
          blocksToDelete.push(...childrenToDelete);
          blocksToPreserve.push(...childrenToPreserve);
        }
      } else if (this.isReplaceableBlock(block.type)) {
        // Mark replaceable blocks for deletion
        blocksToDelete.push(block.id);

        // Also process any children of replaceable blocks
        if (block.has_children && block.children && block.children.length > 0) {
          const childBlockIds = this.getAllBlockIds(block.children);
          blocksToDelete.push(...childBlockIds);
        }
      } else {
        // Non-replaceable blocks (images, embeds, etc.) should be preserved
        blocksToPreserve.push(block.id);

        // If a non-replaceable block has children, process them recursively
        if (block.has_children && block.children && block.children.length > 0) {
          const {
            blocksToDelete: childrenToDelete,
            blocksToPreserve: childrenToPreserve,
          } = this.categorizeBlocksRecursively(block.children);

          blocksToDelete.push(...childrenToDelete);
          blocksToPreserve.push(...childrenToPreserve);
        }
      }
    }

    return { blocksToDelete, blocksToPreserve };
  }

  /**
   * Helper method to get all block IDs from a hierarchy
   */
  private getAllBlockIds(blocks: BlockWithChildren[]): string[] {
    const ids: string[] = [];

    for (const block of blocks) {
      ids.push(block.id);

      if (block.children && block.children.length > 0) {
        ids.push(...this.getAllBlockIds(block.children));
      }
    }

    return ids;
  }

  /**
   * Delete blocks efficiently with a simple retry mechanism
   */
  private async deleteBlocks(
    blocks: BlockWithChildren[],
    notionClient: CachingRateLimitedNotionClient,
  ): Promise<void> {
    // Find all blocks that need to be deleted
    const blocksToDelete: string[] = [];

    // Helper to identify replaceable blocks
    const isReplaceable = (type: string): boolean => {
      const replaceableTypes = [
        'paragraph',
        'heading_1',
        'heading_2',
        'heading_3',
        'bulleted_list_item',
        'numbered_list_item',
        'to_do',
        'quote',
        'callout',
        'toggle',
        'code',
        'divider',
        'table_of_contents',
        'table',
      ];
      return replaceableTypes.includes(type);
    };

    // Helper to collect blocks to delete, prioritizing parents
    const collectBlocksToDelete = (
      currentBlocks: BlockWithChildren[],
      parentIsDeleted = false,
    ) => {
      for (const block of currentBlocks) {
        const shouldDelete = parentIsDeleted || isReplaceable(block.type);

        // If parent is already being deleted, we don't need to delete children
        if (shouldDelete && !parentIsDeleted) {
          blocksToDelete.push(block.id);
        }

        // Process children if they exist
        if (block.children && block.children.length > 0) {
          collectBlocksToDelete(
            block.children,
            shouldDelete || parentIsDeleted,
          );
        }
      }
    };

    // Collect blocks to delete
    collectBlocksToDelete(blocks);

    // If no blocks to delete, return early
    if (blocksToDelete.length === 0) return;

    console.log(`Deleting ${blocksToDelete.length} blocks efficiently`);

    // Process in reasonable batch sizes
    const batchSize = 3;
    const maxRetries = 3;

    for (let i = 0; i < blocksToDelete.length; i += batchSize) {
      const batch = blocksToDelete.slice(i, i + batchSize);

      // Delete blocks in parallel within each batch
      await Promise.all(
        batch.map(async (blockId) => {
          let retries = 0;

          while (retries <= maxRetries) {
            try {
              await notionClient.blocks.delete({ block_id: blockId });
              return; // Success, exit retry loop
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
              // Don't retry for archived blocks or parent/child relationship issues
              if (
                error?.message?.includes('archived') ||
                error?.code === 'validation_error'
              ) {
                return;
              }

              // Retry for rate limits and temporary issues
              if (retries === maxRetries) {
                console.warn(
                  `Failed to delete block ${blockId} after ${maxRetries} retries: ${error?.message ?? error}`,
                );
                return;
              }

              // Exponential backoff with jitter
              const delay = 300 * Math.pow(2, retries) + Math.random() * 200;
              await new Promise((resolve) => setTimeout(resolve, delay));
              retries++;
            }
          }
        }),
      );
    }
  }

  /**
   * Check if a block type should be replaced during update
   * Replaceable blocks are text-based blocks like paragraphs, headings, lists, and now tables
   */
  private isReplaceableBlock(type: string): boolean {
    // These are block types that we want to replace
    const replaceableTypes = [
      'paragraph',
      'heading_1',
      'heading_2',
      'heading_3',
      'bulleted_list_item',
      'numbered_list_item',
      'to_do',
      'quote',
      'callout',
      'toggle',
      'code',
      'divider',
      'table_of_contents',
      'table', // Added table as a replaceable block type
    ];

    return replaceableTypes.includes(type);
  }
}
