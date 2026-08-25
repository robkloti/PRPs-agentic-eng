import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import { NotionDocumentMetadata, ProcessingNotionPage } from '../../../types';
import { PageHierarchyEntry } from '../../shared';
import { NotionToGFMConverter } from './../notion-page-to-md';
import { CachingRateLimitedNotionClient } from './../tm-advanced-notion-client';
import { NotionLoaderContext } from './notion-loader-utils';

interface NotionPageLoaderConfig {
  client: CachingRateLimitedNotionClient;
  userMap: Map<string, { displayName: string }>;
  batchSize: number;
  context: NotionLoaderContext;
}

interface FetchPagesOptions {
  cursor?: string;
}

interface FetchPagesResult {
  results: ProcessingNotionPage[];
  next_cursor?: string;
}

interface AccessOperation {
  id: string;
  workspaceId: string;
}

export class NotionPageLoader {
  private readonly client: CachingRateLimitedNotionClient;
  private readonly context: NotionLoaderContext;
  private userMap: Map<string, { displayName: string }>;
  private readonly batchSize: number;

  constructor(config: NotionPageLoaderConfig) {
    this.client = config.client;
    this.context = config.context;
    this.userMap = config.userMap;
    this.batchSize = config.batchSize;
  }

  public updateUserMap(userMap: Map<string, { displayName: string }>): void {
    this.userMap = userMap;
  }

  public async handlePageUpdate(pageId: string): Promise<number | undefined> {
    try {
      console.log(`[NOTION LOADER] Processing update for page ${pageId}`);

      try {
        const page = await this.client.pages.retrieve({ page_id: pageId });

        if (page.object !== 'page') {
          console.warn(`[NOTION LOADER] Not a page: ${pageId}`);
          return;
        }

        const pageObj = page as PageObjectResponse;
        const converter = new NotionToGFMConverter(this.client);
        const { markdown, sourceMentionedUserIds } = await converter.convert(
          pageId,
          this.userMap,
        );

        if (!markdown || markdown.trim() === '') {
          console.warn(
            `[NOTION LOADER] Page ${pageId} has no meaningful content`,
          );
          return;
        }

        const title = this.extractPageTitle(pageObj);
        const parentId = this.context.storageUtils.extractPageParentId(
          pageObj.parent,
        );
        const hierarchyPath = await this.buildHierarchyPath(
          pageId,
          pageObj.parent,
          title,
          parentId,
        );

        const result = await this.context.storageUtils.storeDocument({
          id: pageId,
          title,
          content: markdown,
          hierarchyPath,
          parentId,
          updatedAt: pageObj.last_edited_time,
          lastEditedBy: pageObj.last_edited_by?.id,
          createdBy: pageObj.created_by?.id,
          mentionedUserIds: sourceMentionedUserIds!,
          url: pageObj.url || `https://notion.so/${pageId.replace(/-/g, '')}`,
          isDatabase: false,
        });

        if (result?.id) {
          await this.context.hierarchyManager.updateDescendantPaths(
            pageId,
            this.context.userId,
            'notion',
          );
        }

        console.log(`[NOTION LOADER] Successfully updated page ${pageId}`);

        return result?.id;
      } catch (error) {
        if (
          this.context.storageUtils.handleEntityError(error, pageId, 'page')
        ) {
          // Call the deletion handler from the main loader
          await this.context.handleEntityDeletion(pageId, 'page');
        }
      }
    } catch (error) {
      console.error(
        `[NOTION LOADER] Error handling page update for ${pageId}:`,
        error,
      );
      throw error;
    }
  }

  public async loadPageBatches(): Promise<number[]> {
    const allPages: ProcessingNotionPage[] = [];
    let cursor: string | undefined;

    do {
      try {
        const { results: pages, next_cursor } = await this.fetchAllPages({
          cursor,
        });

        if (pages.length === 0) break;
        allPages.push(...pages);
        cursor = next_cursor;

        console.log(
          `[NOTION LOADER] Loaded ${allPages.length} pages so far...`,
        );
      } catch (error) {
        console.error('[NOTION LOADER] Error fetching pages:', error);
        continue;
      }
    } while (cursor);

    const blockParentIds = new Set<string>();
    for (const page of allPages) {
      if (page.parent?.type === 'block_id' && page.parent.block_id) {
        blockParentIds.add(page.parent.block_id);
      }
    }

    // Create initial page entries
    let pageEntries: PageHierarchyEntry[] = allPages.map((page) => {
      const title =
        page.title?.trim() || `Untitled (${page.id.substring(0, 8)})`;

      const parentId =
        page.parent?.page_id ??
        page.parent?.database_id ??
        page.parent?.block_id ??
        undefined;

      return {
        id: page.id,
        title,
        parentId,
      };
    });

    // If we have block parents, fetch their parent pages
    if (blockParentIds.size > 0) {
      console.log(
        `[NOTION LOADER] Resolving ${blockParentIds.size} block parents to pages...`,
      );
      const blockParentMap = await this.fetchBlockParentPages(
        Array.from(blockParentIds),
      );

      // Create a new array for updated entries
      const updatedEntries: PageHierarchyEntry[] = [];

      // Track IDs of entries we've added to avoid duplicates
      const addedEntryIds = new Set<string>();

      // First, add all the parent pages from the mapping
      for (const [_, parentEntry] of blockParentMap.entries()) {
        if (!addedEntryIds.has(parentEntry.id)) {
          updatedEntries.push(parentEntry);
          addedEntryIds.add(parentEntry.id);
        }
      }

      // Then process each original page entry
      for (const entry of pageEntries) {
        // Skip if we've already added this entry
        if (addedEntryIds.has(entry.id)) {
          continue;
        }

        // If this entry has a block parent, replace it with the block's parent page
        if (entry.parentId && blockParentMap.has(entry.parentId)) {
          const blockParent = blockParentMap.get(entry.parentId);
          updatedEntries.push({
            ...entry,
            parentId: blockParent?.id,
          });
        } else {
          // Keep the original entry
          updatedEntries.push(entry);
        }

        addedEntryIds.add(entry.id);
      }

      // Replace page entries with the updated ones
      pageEntries = updatedEntries;
    }

    console.log(
      `[NOTION LOADER] Building hierarchy paths for ${pageEntries.length} items...`,
    );
    const hierarchyPaths =
      await this.context.hierarchyManager.buildHierarchyPaths(
        pageEntries,
        this.context.userId,
        'notion',
      );

    const pagesWithHierarchy = allPages.map((page) => ({
      ...page,
      hierarchy_path: hierarchyPaths.get(page.id) ?? '',
    }));

    const processedDocIds: number[] = [];

    // Process pages in batches
    for (let i = 0; i < pagesWithHierarchy.length; i += this.batchSize) {
      try {
        const batch = pagesWithHierarchy.slice(i, i + this.batchSize);

        const existingDocs = await this.context.storageUtils.getExistingDocs(
          batch.map((page) => page.id),
          false,
        );

        const { toStore, toAddAccess } = this.classifyPages(
          batch,
          existingDocs,
        );

        console.log(
          `[NOTION LOADER] Processing batch ${i / this.batchSize + 1}: ` +
            `${batch.length} pages | ` +
            `${existingDocs.size} existing | ` +
            `${toStore.length} to store | ` +
            `${toAddAccess.length} to add access`,
        );

        // Handle access updates
        if (toAddAccess.length > 0) {
          await this.context.accessManager.manageUserAccess(
            this.context.userId,
            'add',
            {
              source: 'notion',
              source_ids: toAddAccess.map((op) => op.id),
              metadata: {
                space_id: toAddAccess.map((op) => op.workspaceId),
              },
            },
          );
        }

        // Create new documents
        if (toStore.length > 0) {
          await Promise.all(
            toStore.map(async (page: ProcessingNotionPage) => {
              // Content filtering to here - right before storing
              if (
                !page.processedContent?.markdown ||
                page.processedContent.markdown.trim() === ''
              ) {
                console.warn(
                  `Skipping content storage for page ${page.id}: Empty or insufficient content`,
                );
                return;
              }

              const parentId = page.parent
                ? this.context.storageUtils.extractPageParentId(page.parent)
                : undefined;

              const result = await this.context.storageUtils.storeDocument({
                id: page.id,
                title: page.title,
                content: page.processedContent.markdown,
                hierarchyPath: page.hierarchy_path ?? '',
                parentId,
                updatedAt: page.last_edited_time,
                lastEditedBy: page.last_edited_by?.id,
                createdBy: page.created_by?.id,
                mentionedUserIds: page.processedContent.sourceMentionedUserIds,
                url:
                  page.url || `https://notion.so/${page.id.replace(/-/g, '')}`,
                isDatabase: false,
              });

              if (result?.id) {
                processedDocIds.push(result.id);
              }
            }),
          );
        }
      } catch (error) {
        console.error('[NOTION LOADER] Error processing batch:', error);
        continue;
      }
    }

    return processedDocIds;
  }

  private async fetchAllPages(
    options: FetchPagesOptions,
  ): Promise<FetchPagesResult> {
    const pages: ProcessingNotionPage[] = [];

    // Fetch pages using the Notion API
    const response = await this.client.search({
      query: '',
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: 100,
      start_cursor: options.cursor,
    });

    // Process pages
    const results = response.results as PageObjectResponse[];
    const processedPages = await this.processResults(results);
    pages.push(...processedPages);

    return {
      results: pages,
      next_cursor: response.next_cursor ?? undefined,
    };
  }

  private classifyPages(
    pages: ProcessingNotionPage[],
    existingDocs: Map<
      string,
      NotionDocumentMetadata & {
        user_ids_access: string[];
        source_updated_at: string;
      }
    >,
  ): {
    toStore: ProcessingNotionPage[]; // Renamed from toCreate to toStore
    toAddAccess: AccessOperation[];
  } {
    const toStore: ProcessingNotionPage[] = [];
    const toAddAccess: AccessOperation[] = [];

    pages.forEach((page) => {
      const existingDoc = existingDocs.get(page.id);
      if (!existingDoc) {
        // New document - store it
        toStore.push(page);
        return;
      }

      const existingTimestamp = new Date(
        existingDoc.source_updated_at,
      ).getTime();
      const newTimestamp = new Date(page.last_edited_time).getTime();

      if (existingTimestamp >= newTimestamp) {
        // Same version or older - just update access if needed
        if (!existingDoc.user_ids_access.includes(this.context.userId)) {
          toAddAccess.push({
            id: page.id,
            workspaceId: this.context.workspaceId,
          });
        }
        return;
      }

      // Different version - update it
      toStore.push(page);
    });

    return { toStore, toAddAccess };
  }

  private async processResults(
    results: PageObjectResponse[],
  ): Promise<ProcessingNotionPage[]> {
    // Create converter instance
    const converter = new NotionToGFMConverter(this.client);

    console.log(`[NOTION LOADER] Processing ${results.length} pages...`);
    // Process each page
    const processPromises = results.map(async (page) => {
      try {
        // Get page content using the pre-populated userMap
        const { markdown, sourceMentionedUserIds } = await converter.convert(
          page.id,
          this.userMap,
        );

        // Don't skip pages with undefined markdown - include them for hierarchy
        return {
          ...page,
          title: this.extractPageTitle(page),
          processedContent: {
            markdown: markdown ?? '', // Use empty string instead of null
            sourceMentionedUserIds,
          },
        } as ProcessingNotionPage;
      } catch (error) {
        console.error(`Error processing page ${page.id}:`, error);
        // Include the page with empty content rather than filtering it out
        return {
          ...page,
          title: this.extractPageTitle(page),
          processedContent: {
            markdown: '',
            sourceMentionedUserIds: [],
          },
        } as ProcessingNotionPage;
      }
    });

    // Don't filter out pages with insufficient content at this stage
    const processedPages = (await Promise.all(processPromises)).filter(
      (page): page is ProcessingNotionPage => page !== null,
    );

    return processedPages;
  }

  private async fetchBlockParentPages(
    blockIds: string[],
  ): Promise<Map<string, PageHierarchyEntry>> {
    const blockParentMap = new Map<string, PageHierarchyEntry>();
    const pageMap = new Map<string, PageHierarchyEntry>();
    const processedBlocks = new Set<string>();

    // Queue of blocks to process
    const queue = [...blockIds];

    while (queue.length > 0) {
      const blockId = queue.shift()!;

      // Skip if already processed
      if (processedBlocks.has(blockId)) {
        continue;
      }

      try {
        // Fetch block info
        const blockResponse = await this.client.blocks.retrieve({
          block_id: blockId,
        });

        if (blockResponse.object === 'block' && 'parent' in blockResponse) {
          const block = blockResponse;

          if (block.parent.type === 'page_id') {
            const pageId = block.parent.page_id;

            // Check if we already have this page's info
            if (!pageMap.has(pageId)) {
              try {
                const pageResponse = await this.client.pages.retrieve({
                  page_id: pageId,
                });

                if (pageResponse.object === 'page') {
                  const pageObj = pageResponse as PageObjectResponse;
                  const pageTitle = this.extractPageTitle(pageObj);

                  // Determine parent ID
                  let parentId: string | undefined;
                  if (pageObj.parent.type === 'page_id') {
                    parentId = pageObj.parent.page_id;
                  } else if (pageObj.parent.type === 'database_id') {
                    parentId = pageObj.parent.database_id;
                  } else if (pageObj.parent.type === 'block_id') {
                    parentId = pageObj.parent.block_id;

                    // Add parent block to queue
                    if (!processedBlocks.has(parentId)) {
                      queue.push(parentId);
                    }
                  }

                  // Store the page info
                  pageMap.set(pageId, {
                    id: pageId,
                    title: pageTitle,
                    parentId: parentId,
                  });
                }
              } catch (error) {
                console.warn(`Failed to fetch page ${pageId}:`, error);
                // Add a placeholder
                pageMap.set(pageId, {
                  id: pageId,
                  title: `Untitled (${pageId.substring(0, 8)})`,
                  parentId: undefined,
                });
              }
            }

            // Map this block to the page
            blockParentMap.set(blockId, pageMap.get(pageId)!);
          } else if (block.parent.type === 'block_id') {
            // Parent is another block - add to queue
            const parentBlockId = block.parent.block_id;
            if (!processedBlocks.has(parentBlockId)) {
              queue.push(parentBlockId);
            }
          }
        }

        // Mark block as processed
        processedBlocks.add(blockId);
      } catch (error) {
        console.warn(`Failed to fetch block ${blockId}:`, error);
        processedBlocks.add(blockId);
      }
    }

    // Second pass - connect blocks to their ultimate page parents
    for (const blockId of blockIds) {
      if (!blockParentMap.has(blockId)) {
        // This might be a block whose parent is also a block
        try {
          const blockResponse = await this.client.blocks.retrieve({
            block_id: blockId,
          });

          if (blockResponse.object === 'block' && 'parent' in blockResponse) {
            const block = blockResponse;

            if (block.parent.type === 'block_id') {
              const parentBlockId = block.parent.block_id;

              // Check if parent block is mapped to a page
              if (blockParentMap.has(parentBlockId)) {
                // Connect this block to the same page
                blockParentMap.set(blockId, blockParentMap.get(parentBlockId)!);
              }
            }
          }
        } catch (error) {
          console.warn(
            `Failed to resolve ultimate parent for block ${blockId}:`,
            error,
          );
        }
      }
    }

    // Add all pages to the result map for hierarchy building
    for (const [pageId, pageEntry] of pageMap.entries()) {
      if (!blockParentMap.has(pageId)) {
        blockParentMap.set(pageId, pageEntry);
      }
    }

    return blockParentMap;
  }

  private async buildHierarchyPath(
    id: string,
    parent: {
      type: string;
      block_id?: string;
      page_id?: string;
      database_id?: string;
    },
    title: string,
    parentId?: string,
  ): Promise<string> {
    let hierarchyPath = '';
    const entry: PageHierarchyEntry = {
      id,
      title,
      parentId,
    };

    // Handle block parent if present
    if (parent.type === 'block_id' && parent.block_id) {
      const blockParentMap = await this.fetchBlockParentPages([
        parent.block_id,
      ]);

      if (blockParentMap.has(parent.block_id)) {
        const blockParent = blockParentMap.get(parent.block_id);
        if (blockParent) {
          entry.parentId = blockParent.id;

          // Create entries array with both our entity and the parent pages
          const entries = [entry];
          for (const [_, parentEntry] of blockParentMap.entries()) {
            entries.push(parentEntry);
          }

          // Build hierarchy paths with all entries
          const hierarchyPaths =
            await this.context.hierarchyManager.buildHierarchyPaths(
              entries,
              this.context.userId,
              'notion',
            );

          // Get the hierarchy path for this entity
          hierarchyPath = hierarchyPaths.get(id) ?? '';
        }
      }
    } else {
      // No block parent, just build path normally
      const hierarchyPaths =
        await this.context.hierarchyManager.buildHierarchyPaths(
          [entry],
          this.context.userId,
          'notion',
        );

      hierarchyPath = hierarchyPaths.get(id) ?? '';
    }

    return hierarchyPath;
  }

  private extractPageTitle(page: PageObjectResponse): string {
    // Find the property with type "title" - works for all page types
    for (const property of Object.values(page.properties || {})) {
      if (
        property.type === 'title' &&
        'title' in property &&
        Array.isArray(property.title)
      ) {
        const title = property.title
          .map((rt) => rt.plain_text || '')
          .join('')
          .trim();

        if (title) return title;
      }
    }

    // Fallback
    return `Untitled (${page.id.substring(0, 8)})`;
  }
}
