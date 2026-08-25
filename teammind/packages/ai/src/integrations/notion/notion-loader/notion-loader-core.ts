import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { DocQualityAnalyzer } from '../../../agents';
import { DocumentAccessManager, SupabaseVectorStore } from '../../../storage';
import { NotionWorkspace } from '../../../types';
import { HierarchyManager } from '../../shared';
import { CachingRateLimitedNotionClient } from './../tm-advanced-notion-client';
import { NotionDatabaseLoader } from './notion-loader-databases';
import { NotionPageLoader } from './notion-loader-pages';
import { NotionLoaderContext, NotionStorageUtils } from './notion-loader-utils';

const CONFIG = {
  BATCH_SIZE: 50,
  API_LIMIT: 100,
} as const;

interface NotionLoaderConfig {
  userId: string;
  accessToken: string;
  selectedWorkspaces: NotionWorkspace;
  supabase: SupabaseClient<Database>;
}

export class NotionLoader {
  private readonly accessToken: string;
  private readonly userId: string;
  private readonly selectedWorkspace: NotionWorkspace;
  private readonly supabase: SupabaseClient<Database>;
  private readonly accessManager: DocumentAccessManager;
  private readonly vectorStore: SupabaseVectorStore;
  private readonly hierarchyManager: HierarchyManager;
  private readonly client: CachingRateLimitedNotionClient;
  private readonly docQualityAnalyzer: DocQualityAnalyzer;
  private readonly storageUtils: NotionStorageUtils;
  private readonly pageLoader: NotionPageLoader;
  private readonly databaseLoader: NotionDatabaseLoader;
  private userMap: Map<string, { displayName: string }>;

  constructor(config: NotionLoaderConfig) {
    this.accessToken = config.accessToken;
    this.userId = config.userId;
    this.selectedWorkspace = config.selectedWorkspaces;
    this.supabase = config.supabase;
    this.accessManager = new DocumentAccessManager(config.supabase);
    this.vectorStore = new SupabaseVectorStore(config.supabase);
    this.hierarchyManager = new HierarchyManager(config.supabase);
    this.client = new CachingRateLimitedNotionClient({
      auth: this.accessToken,
    });
    this.docQualityAnalyzer = new DocQualityAnalyzer(config.supabase);
    this.userMap = new Map<string, { displayName: string }>();

    // Create storage utils
    this.storageUtils = new NotionStorageUtils(
      this.vectorStore,
      this.userId,
      this.selectedWorkspace.id,
    );

    // Create shared context for loaders
    const loaderContext: NotionLoaderContext = {
      userId: this.userId,
      workspaceId: this.selectedWorkspace.id,
      vectorStore: this.vectorStore,
      accessManager: this.accessManager,
      hierarchyManager: this.hierarchyManager,
      storageUtils: this.storageUtils,
      handleEntityDeletion: this.handleEntityDeletion.bind(this),
    };

    // Initialize specialized loaders
    this.pageLoader = new NotionPageLoader({
      client: this.client,
      userMap: this.userMap,
      batchSize: CONFIG.BATCH_SIZE,
      context: loaderContext,
    });

    this.databaseLoader = new NotionDatabaseLoader({
      client: this.client,
      userMap: this.userMap,
      batchSize: CONFIG.BATCH_SIZE,
      apiLimit: CONFIG.API_LIMIT,
      context: loaderContext,
    });
  }

  public async load(options?: {
    checkPermissionChanges?: boolean;
  }): Promise<void> {
    try {
      // Load all users once at the start
      await this.fetchAllUsers();

      // Check for permission changes if requested
      if (options?.checkPermissionChanges) {
        await this.checkAndHandlePermissionChanges();
      }

      // Load pages and databases through specialized loaders
      const pageDocIds = await this.pageLoader.loadPageBatches();
      await this.databaseLoader.loadDatabaseBatches();

      // Process quality for all loaded page documents
      if (pageDocIds.length > 0) {
        console.log(
          `[NOTION LOADER] Processing quality for ${pageDocIds.length} documents...`,
        );
        await this.docQualityAnalyzer.processDocuments(pageDocIds, this.userId);
      }
    } catch (error) {
      console.error('Error loading Notion content:', error);
      throw error;
    }
  }

  public async handlePageUpdate(pageId: string): Promise<void> {
    const docId = await this.pageLoader.handlePageUpdate(pageId);
    if (docId) {
      await this.docQualityAnalyzer.processDocuments([docId], this.userId);
    }
  }

  public async handleDatabaseUpdate(databaseId: string): Promise<void> {
    await this.databaseLoader.handleDatabaseUpdate(databaseId);
  }

  public async handleEntityDeletion(
    entityId: string,
    entityType: 'page' | 'database',
  ): Promise<void> {
    try {
      console.log(
        `[NOTION LOADER] Processing deletion for ${entityType} ${entityId}`,
      );

      // Delete the entity itself
      const result = await this.vectorStore.deleteDocumentBySource(
        entityId,
        'notion',
        this.userId,
      );

      if (result.deleted) {
        console.log(
          `[NOTION LOADER] Successfully deleted ${entityType} ${entityId}`,
        );
        return;
      }

      // If not deleted, find descendant entities
      const descendants = await this.findDescendantEntities(entityId);

      if (descendants.length > 0) {
        console.log(
          `[NOTION LOADER] Found ${descendants.length} descendant entities to delete`,
        );

        // Delete all descendants
        const descendantResults = await Promise.allSettled(
          descendants.map((descendantId) =>
            this.vectorStore.deleteDocumentBySource(
              descendantId,
              'notion',
              this.userId,
            ),
          ),
        );

        const successfulDeletions = descendantResults.filter(
          (result) => result.status === 'fulfilled' && result.value.deleted,
        ).length;

        console.log(
          `[NOTION LOADER] Successfully deleted ${successfulDeletions} descendant entities`,
        );
      }
    } catch (error) {
      console.error(
        `[NOTION LOADER] Error handling deletion for ${entityType} ${entityId}:`,
        error,
      );
      throw error;
    }
  }

  // Add a helper method to find descendant entities
  private async findDescendantEntities(parentId: string): Promise<string[]> {
    try {
      // Query for documents that have this entity as a parent
      const { data } = await this.supabase
        .from('documents')
        .select('source_id')
        .eq('source', 'notion')
        .eq('source_parent_id', parentId)
        .eq('metadata->>space_id', this.selectedWorkspace.id);

      if (!data || data.length === 0) {
        return [];
      }

      // Get all direct children IDs
      const childIds = data.map((doc) => doc.source_id);

      // For each child, recursively find its descendants
      const descendantPromises = childIds.map((childId) =>
        this.findDescendantEntities(childId),
      );

      // Flatten the results into a single array
      const descendantArrays = await Promise.all(descendantPromises);
      const allDescendants = childIds.concat(...descendantArrays);

      return allDescendants;
    } catch (error) {
      console.error('Error finding descendant entities:', error);
      return [];
    }
  }

  /**
   * Specialized method for scheduled database syncing
   * Only processes databases without loading pages or other content types
   */
  public async syncDatabases(options?: {
    modifiedSince?: Date;
  }): Promise<number[]> {
    try {
      // Load all users needed for database processing
      await this.fetchAllUsers();

      // Sync databases using the specialized method
      return this.databaseLoader.syncRecentDatabases(options);
    } catch (error) {
      console.error('Error syncing Notion databases:', error);
      throw error;
    }
  }

  private async fetchAllUsers(): Promise<void> {
    let userCursor: string | undefined = undefined;
    console.log('[NOTION LOADER] Fetching all Notion workspace users...');

    do {
      try {
        const users = await this.client.users.list({
          page_size: CONFIG.API_LIMIT,
          start_cursor: userCursor,
        });

        users.results.forEach((user) => {
          if (user.type === 'person' && user.name) {
            this.userMap.set(user.id, { displayName: user.name });
          }
        });

        userCursor = users.next_cursor ?? undefined;
      } catch (error) {
        console.error('[NOTION LOADER] Error fetching users:', error);
        break;
      }
    } while (userCursor);

    console.log(
      `[NOTION LOADER] Loaded ${this.userMap.size} users from workspace`,
    );

    // Update user maps in specialized loaders
    this.pageLoader.updateUserMap(this.userMap);
    this.databaseLoader.updateUserMap(this.userMap);
  }

  private async checkAndHandlePermissionChanges(): Promise<void> {
    console.log('[NOTION LOADER] Checking for permission changes');

    // Step 1: Get all accessible pages and databases from Notion
    const accessiblePages = await this.getAccessiblePageIds();

    if (accessiblePages.size === 0) {
      console.log('[NOTION LOADER] No pages accessible from Notion');
      return;
    }

    // Step 2: Get all document IDs for this user and workspace from our database
    const { data: allStoredDocs } = await this.supabase
      .from('documents')
      .select('source_id')
      .eq('source', 'notion')
      .eq('metadata->>space_id', this.selectedWorkspace.id);

    if (!allStoredDocs || allStoredDocs.length === 0) {
      console.log('[NOTION LOADER] No existing documents in our database');
      return;
    }

    // Step 3: Find documents we have in storage but user no longer has access to
    const storedSourceIds = allStoredDocs.map((doc) => doc.source_id);
    const toRemoveAccess = storedSourceIds.filter(
      (id) => !accessiblePages.has(id),
    );

    if (toRemoveAccess.length > 0) {
      console.log(
        `[NOTION LOADER] Removing access to ${toRemoveAccess.length} pages no longer accessible`,
      );

      // Remove user access to these documents
      await this.accessManager.manageUserAccess(this.userId, 'remove', {
        source: 'notion',
        source_ids: toRemoveAccess,
        metadata: {
          space_id: [this.selectedWorkspace.id],
        },
      });
    } else {
      console.log('[NOTION LOADER] No pages found that require access removal');
    }
  }

  private async getAccessiblePageIds(): Promise<Set<string>> {
    const accessiblePages = new Set<string>();

    // Fetch pages with pagination
    let cursor: string | undefined;

    do {
      try {
        // Fetch pages
        const pagesResponse = await this.client.search({
          query: '',
          filter: {
            property: 'object',
            value: 'page',
          },
          page_size: 100, // Max allowed by Notion API
          start_cursor: cursor,
        });

        // Add each page to our set
        pagesResponse.results.forEach((page) => {
          accessiblePages.add(page.id);
        });

        cursor = pagesResponse.next_cursor ?? undefined;
      } catch (error) {
        console.error('[NOTION LOADER] Error fetching pages:', error);
        break;
      }
    } while (cursor);

    // Reset cursor for databases
    cursor = undefined;

    // Fetch databases with pagination
    do {
      try {
        // Fetch databases
        const dbResponse = await this.client.search({
          query: '',
          filter: {
            property: 'object',
            value: 'database',
          },
          page_size: 100,
          start_cursor: cursor,
        });

        // Add each database to our set
        dbResponse.results.forEach((db) => {
          accessiblePages.add(db.id);
        });

        cursor = dbResponse.next_cursor ?? undefined;
      } catch (error) {
        console.error('[NOTION LOADER] Error fetching databases:', error);
        break;
      }
    } while (cursor);

    console.log(
      `[NOTION LOADER] Found ${accessiblePages.size} accessible items in Notion`,
    );
    return accessiblePages;
  }
}
