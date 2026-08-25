import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { DocQualityAnalyzer } from '../../../agents';
import { DocumentAccessManager, SupabaseVectorStore } from '../../../storage';
import {
  ConfluenceDocumentMetadata,
  ConfluenceResponse,
  ConfluenceSite,
  ProcessingConfluencePage,
  convertV1ToRawPage,
  isV1Response,
} from '../../../types';
import { HierarchyManager } from '../../shared';
import { ConfluenceApi } from './confluence-api';
import { ConfluenceToGFMConverter } from './confluence-content-to-md';

const CONFIG = {
  BATCH_SIZE: 50, // !! Watch out for embeddings rate limit
  API_V1_LIMIT: 50,
  API_V2_LIMIT: 100,
  MIN_CONTENT_CHAR_LIMIT: 10,
} as const;

interface ConfluenceLoaderConfig {
  userId: string;
  cloudId: string;
  baseUrl: string;
  accessToken: string;
  selectedSpaces: ConfluenceSite[];
  supabase: SupabaseClient<Database>;
}

interface FetchPagesOptions {
  cursor?: string;
  modifiedSince?: Date;
}

interface FetchPagesResult {
  results: ProcessingConfluencePage[];
  next_cursor?: string;
}

interface AccessOperation {
  id: string;
  spaceId: string;
  version: number;
}

export class ConfluenceLoader {
  private readonly cloudId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly userId: string;
  private readonly selectedSpaces: ConfluenceSite[];
  private readonly vectorStore: SupabaseVectorStore;
  private readonly accessManager: DocumentAccessManager;
  private readonly hierarchyManager: HierarchyManager;
  private readonly converter = new ConfluenceToGFMConverter();
  private readonly docQualityAnalyzer: DocQualityAnalyzer;

  constructor(config: ConfluenceLoaderConfig) {
    this.cloudId = config.cloudId;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl;
    this.userId = config.userId;
    this.selectedSpaces = config.selectedSpaces;
    this.accessManager = new DocumentAccessManager(config.supabase);
    this.vectorStore = new SupabaseVectorStore(config.supabase);
    this.hierarchyManager = new HierarchyManager(config.supabase);
    this.docQualityAnalyzer = new DocQualityAnalyzer(config.supabase);
  }

  public async load(options?: { modifiedSince?: Date }): Promise<void> {
    try {
      // Load regular pages
      await this.loadPageBatches(options);

      // Load deleted pages to clean up
      const deletedPages = await this.fetchAllDeletedPages(options);
      await this.handleDeletedPages(deletedPages);
    } catch (error) {
      console.error('Error loading Confluence pages:', error);
      throw error;
    }
  }

  private async loadPageBatches(options?: {
    modifiedSince?: Date;
  }): Promise<void> {
    const allPages: ProcessingConfluencePage[] = [];
    let cursor: string | undefined;

    do {
      try {
        const { results: pages, next_cursor } = await this.fetchPages({
          cursor,
          modifiedSince: options?.modifiedSince,
        });

        if (pages.length === 0) break;
        allPages.push(...pages);
        cursor = next_cursor;

        console.log(
          `[CONFLUENCE LOADER] Loaded ${allPages.length} pages so far...`,
        );
      } catch (error) {
        console.error('[CONFLUENCE LOADER] Error fetching pages:', error);
        continue;
      }
    } while (cursor);

    // Use hierarchy manager to build paths
    const pageEntries = allPages.map((page) => ({
      id: page.id,
      title: page.title,
      parentId: page.parentId,
    }));

    const hierarchyPaths = await this.hierarchyManager.buildHierarchyPaths(
      pageEntries,
      this.userId,
      'confluence',
    );
    const pagesWithHierarchy = allPages.map((page) => ({
      ...page,
      hierarchy_path: hierarchyPaths.get(page.id) ?? '',
    }));

    const processedDocIds: number[] = [];

    // Process pages in batches
    for (let i = 0; i < pagesWithHierarchy.length; i += CONFIG.BATCH_SIZE) {
      try {
        const batch = pagesWithHierarchy.slice(i, i + CONFIG.BATCH_SIZE);

        const existingDocs =
          await this.vectorStore.getExistingDocumentsBySourceId<ConfluenceDocumentMetadata>(
            batch.map((page) => page.id),
            'confluence',
            {
              space_id: this.selectedSpaces.map((space) => space.id),
            },
          );

        const { toStore, toAddAccess } = this.classifyPages(
          batch,
          existingDocs,
        );

        console.log(
          `[CONFLUENCE LOADER] Processing batch ${i / CONFIG.BATCH_SIZE + 1}: ` +
            `${batch.length} pages | ` +
            `${existingDocs.size} existing | ` +
            `${toStore.length} to store | ` +
            `${toAddAccess.length} to add access`,
        );

        // Handle access updates
        if (toAddAccess.length > 0) {
          await this.accessManager.manageUserAccess(this.userId, 'add', {
            source: 'confluence',
            source_ids: toAddAccess.map((op) => op.id),
            metadata: {
              space_id: toAddAccess.map((op) => op.spaceId),
              cloud_id: this.cloudId,
            },
          });
        }

        // Create new documents
        if (toStore.length > 0) {
          await Promise.all(
            toStore.map(async (page: ProcessingConfluencePage) => {
              if (!page.processedContent?.markdown?.length) {
                console.warn(
                  `Skipping content storage for page ${page.id}: Empty content`,
                );
                return;
              }

              const result = await this.vectorStore.storeDocument({
                title: page.title,
                content: page.processedContent.markdown,
                hierarchy_path: page.hierarchy_path,
                source: 'confluence',
                last_updated_source_user_id: page.ownerId,
                source_author_id: page.version.authorId,
                source_mentioned_user_ids:
                  page.processedContent.sourceMentionedUserIds,
                source_updated_at: page.version.createdAt,
                source_id: page.id,
                source_parent_id: page.parentId,
                metadata: {
                  status: page.status,
                  url: `${this.baseUrl}/wiki${page._links.webui}`,
                  space_id: page.spaceId,
                  version: page.version.number,
                  cloud_id: this.cloudId,
                },
                user_ids_access: [this.userId],
              });

              if (result?.id) {
                processedDocIds.push(result.id);
              }
            }),
          );
        }
      } catch (error) {
        console.error('[CONFLUENCE LOADER] Error processing batch:', error);
        continue;
      }
    }

    if (processedDocIds.length > 0) {
      await this.docQualityAnalyzer.processDocuments(
        processedDocIds,
        this.userId,
      );
    }
  }

  private classifyPages(
    pages: ProcessingConfluencePage[],
    existingDocs: Map<
      string, // source_id
      ConfluenceDocumentMetadata & {
        user_ids_access: string[];
        source_updated_at: string;
      }
    >,
  ): {
    toStore: ProcessingConfluencePage[];
    toAddAccess: AccessOperation[];
  } {
    const toStore: ProcessingConfluencePage[] = [];
    const toAddAccess: AccessOperation[] = [];

    pages.forEach((page) => {
      const existingDoc = existingDocs.get(page.id);

      if (!existingDoc) {
        // New document - store it
        toStore.push(page);
        return;
      }

      if (existingDoc.version === page.version.number) {
        // Same version - just update access if needed
        if (!existingDoc.user_ids_access.includes(this.userId)) {
          toAddAccess.push({
            id: page.id,
            spaceId: page.spaceId,
            version: page.version.number,
          });
        }
        return;
      }

      // Different version - update it
      toStore.push(page);
    });

    return { toStore, toAddAccess };
  }

  // Fetch functions
  private async fetchPages(
    options: FetchPagesOptions = {},
  ): Promise<FetchPagesResult> {
    return options.modifiedSince
      ? this.fetchPagesModifiedSince(options)
      : this.fetchAllPages(options);
  }

  private async fetchPagesModifiedSince(
    options: FetchPagesOptions,
  ): Promise<FetchPagesResult> {
    if (!options.modifiedSince) {
      throw new Error('Missing modifiedSince date');
    }

    const url = new URL(
      `https://api.atlassian.com/ex/confluence/${this.cloudId}/wiki/rest/api/content/search`,
    );

    // Base query for content types
    let cql = 'type in (page,blogpost)';

    // Add space filter
    const spaceFilter = this.selectedSpaces
      .map((space) => `"${space.key}"`) // Use space.key and wrap in quotes since keys can contain special characters
      .join(',');
    cql += ` and space in (${spaceFilter})`;

    const bufferTime = new Date(
      options.modifiedSince.getTime() - 5 * 60 * 1000,
    );

    const formattedDate =
      bufferTime.toISOString().split('T')[0] +
      ' ' + // Gets YYYY-MM-DD
      bufferTime.toISOString().split('T')[1]!.substring(0, 5); // Gets HH:mm
    cql += ` and (lastmodified >= "${formattedDate}" OR created >= "${formattedDate}")`;

    // Sort by most recently modified first
    cql += ' order by lastmodified desc';

    url.searchParams.append('cql', cql);
    url.searchParams.append(
      'expand',
      [
        'body.storage',
        'version',
        'version.by',
        'history',
        'history.lastUpdated',
        'history.createdBy',
        'space',
        'ancestors',
        'container',
        'metadata.properties.editor',
      ].join(','),
    );
    url.searchParams.append('limit', CONFIG.API_V1_LIMIT.toString());

    if (options.cursor) {
      url.searchParams.append('start', options.cursor);
    }

    try {
      const response = await this.makeRequest(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(
          `Failed to fetch pages: ${response.status} ${response.statusText}\n${errorText}`,
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        console.error('Unexpected response format:', data);
        throw new Error('Invalid response format from Confluence API');
      }

      const processedResults = await this.processResults(data.results);

      return {
        results: processedResults,
        next_cursor: data._links?.next
          ? (parseInt(options.cursor ?? '0') + CONFIG.API_V1_LIMIT).toString()
          : undefined,
      };
    } catch (error) {
      console.error('Error in fetchPagesModifiedSince:', error);
      throw error;
    }
  }

  private async fetchAllPages(
    options: FetchPagesOptions,
  ): Promise<FetchPagesResult> {
    const url = new URL(
      `https://api.atlassian.com/ex/confluence/${this.cloudId}/api/v2/pages`,
    );

    url.searchParams.append('body-format', 'storage');
    url.searchParams.append('status', 'current');
    url.searchParams.append('limit', CONFIG.API_V2_LIMIT.toString());
    url.searchParams.append(
      'space-id',
      this.selectedSpaces.map((s) => s.id).join(','),
    );

    if (options.cursor) {
      url.searchParams.append('cursor', options.cursor);
    }

    const response = await this.makeRequest(url);
    const nextCursor = this.extractNextCursor(response.headers.get('Link'));
    const data = await response.json();

    const processedResults = await this.processResults(data.results);

    return {
      results: processedResults,
      next_cursor: nextCursor,
    };
  }

  private async fetchDeletedPages(
    options: FetchPagesOptions,
  ): Promise<FetchPagesResult> {
    const url = new URL(
      `https://api.atlassian.com/ex/confluence/${this.cloudId}/api/v2/pages`,
    );

    url.searchParams.append('body-format', 'storage');
    url.searchParams.append('status', 'trashed,deleted'); // Get deleted pages only
    url.searchParams.append('limit', CONFIG.API_V2_LIMIT.toString());
    url.searchParams.append(
      'space-id',
      this.selectedSpaces.map((s) => s.id).join(','),
    );

    // Sort by most recently modified first - this is key to our optimization
    url.searchParams.append('sort', '-modified-date');

    if (options.cursor) {
      url.searchParams.append('cursor', options.cursor);
    }

    const response = await this.makeRequest(url);
    const nextCursor = this.extractNextCursor(response.headers.get('Link'));
    const data = await response.json();

    const processedResults = await this.processResults(data.results);

    return {
      results: processedResults,
      next_cursor: nextCursor,
    };
  }

  private async fetchAllDeletedPages(options?: {
    modifiedSince?: Date;
  }): Promise<ProcessingConfluencePage[]> {
    const allDeletedPages: ProcessingConfluencePage[] = [];
    let cursor: string | undefined;

    do {
      try {
        const { results: pages, next_cursor } = await this.fetchDeletedPages({
          cursor,
        });

        if (pages.length === 0) break;

        // Client-side filtering by modifiedSince date
        if (options?.modifiedSince) {
          let allPagesInBatchAreTooOld = true;
          const modifiedSince = options.modifiedSince;

          const filteredPages = pages.filter((page) => {
            const versionDate = new Date(page.version.createdAt);
            const isRecent = versionDate >= modifiedSince;
            if (isRecent) allPagesInBatchAreTooOld = false;
            return isRecent;
          });

          allDeletedPages.push(...filteredPages);

          // Early termination - if ALL pages in this batch are older than our cutoff,
          // we can stop because pages are sorted by modification date (newest first)
          if (allPagesInBatchAreTooOld) {
            console.log(
              '[CONFLUENCE LOADER] All pages in batch are older than cutoff date, stopping',
            );
            break;
          }
        } else {
          allDeletedPages.push(...pages);
        }

        cursor = next_cursor;

        console.log(
          `[CONFLUENCE LOADER] Loaded ${allDeletedPages.length} deleted pages so far...`,
        );
      } catch (error) {
        console.error(
          '[CONFLUENCE LOADER] Error fetching deleted pages:',
          error,
        );
        continue;
      }
    } while (cursor);

    return allDeletedPages;
  }

  private async handleDeletedPages(
    deletedPages: ProcessingConfluencePage[],
  ): Promise<void> {
    if (deletedPages.length === 0) return;

    console.log(
      `[CONFLUENCE LOADER] Deleting ${deletedPages.length} deleted pages`,
    );

    const deletionResults = await Promise.allSettled(
      deletedPages.map((page) =>
        this.vectorStore.deleteDocumentBySource(
          page.id,
          'confluence',
          this.userId,
        ),
      ),
    );

    const successfulDeletions = deletionResults.filter(
      (result) => result.status === 'fulfilled' && result.value.deleted,
    ).length;

    console.log(
      `[CONFLUENCE LOADER] Successfully deleted ${successfulDeletions} pages`,
    );
  }

  private async processResults(
    results: ConfluenceResponse[],
  ): Promise<ProcessingConfluencePage[]> {
    // First normalize all pages to same format
    const normalizedPages = results.map((page) =>
      isV1Response(page) ? convertV1ToRawPage(page) : page,
    );

    // Extract all user IDs from normalized pages
    const userIds = new Set<string>();
    normalizedPages.forEach((page) => {
      if (page.body?.storage?.value?.length >= CONFIG.MIN_CONTENT_CHAR_LIMIT) {
        const extractedIds = this.converter.extractUserIds(
          page.body.storage.value,
        );
        extractedIds.forEach((id) => userIds.add(id));
      }
    });

    // Fetch users once for all pages
    const userMap =
      userIds.size > 0
        ? await ConfluenceApi.fetchUsersBulk(Array.from(userIds), {
            cloudId: this.cloudId,
            accessToken: this.accessToken,
          })
        : new Map();

    // Process content for all normalized pages
    return normalizedPages.map((page) => {
      const storageContent = page.body?.storage?.value ?? '';
      const result =
        storageContent.length >= CONFIG.MIN_CONTENT_CHAR_LIMIT
          ? this.converter.convert(storageContent, userMap)
          : { markdown: '', sourceMentionedUserIds: [] };

      // Ensure values are never undefined
      const markdown = result.markdown ?? '';
      const sourceMentionedUserIds = result.sourceMentionedUserIds ?? [];

      return {
        ...page,
        processedContent: { markdown, sourceMentionedUserIds },
      };
    });
  }

  private async makeRequest(url: URL): Promise<Response> {
    try {
      return await ConfluenceApi.makeRawRequest(url, {
        config: {
          cloudId: this.cloudId,
          accessToken: this.accessToken,
        },
        fetchOptions: {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      });
    } catch (error) {
      console.error('[CONFLUENCE LOADER] Error making request:', error);
      throw error;
    }
  }

  private extractNextCursor(linkHeader: string | null): string | undefined {
    if (!linkHeader) return undefined;

    const nextLink = linkHeader
      .split(',')
      .find((link) => link.includes('rel="next"'));

    if (!nextLink) return undefined;

    const match = /cursor=([^>&\s]+)/.exec(nextLink);
    return match?.[1];
  }
}
