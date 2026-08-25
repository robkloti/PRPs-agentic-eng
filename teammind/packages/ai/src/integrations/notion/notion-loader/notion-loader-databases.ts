import { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import {
  NotionDocumentMetadata,
  ProcessingNotionDatabase,
} from '../../../types';
import { NotionDatabaseToGFMConverter } from './../notion-database-to-md';
import { CachingRateLimitedNotionClient } from './../tm-advanced-notion-client';
import { NotionLoaderContext } from './notion-loader-utils';

interface NotionDatabaseLoaderConfig {
  client: CachingRateLimitedNotionClient;
  userMap: Map<string, { displayName: string }>;
  batchSize: number;
  apiLimit: number;
  context: NotionLoaderContext;
}

interface AccessOperation {
  id: string;
  workspaceId: string;
}

export class NotionDatabaseLoader {
  private readonly client: CachingRateLimitedNotionClient;
  private readonly context: NotionLoaderContext;
  private userMap: Map<string, { displayName: string }>;
  private readonly batchSize: number;
  private readonly apiLimit: number;

  constructor(config: NotionDatabaseLoaderConfig) {
    this.client = config.client;
    this.context = config.context;
    this.userMap = config.userMap;
    this.batchSize = config.batchSize;
    this.apiLimit = config.apiLimit;
  }

  public updateUserMap(userMap: Map<string, { displayName: string }>): void {
    this.userMap = userMap;
  }

  public async handleDatabaseUpdate(
    databaseId: string,
  ): Promise<number | undefined> {
    try {
      console.log(
        `[NOTION LOADER] Processing update for database ${databaseId}`,
      );

      try {
        const database = await this.client.databases.retrieve({
          database_id: databaseId,
        });

        if (database.object !== 'database') {
          console.warn(`[NOTION LOADER] Not a database: ${databaseId}`);
          return;
        }

        const dbObj = database as DatabaseObjectResponse;
        const converter = new NotionDatabaseToGFMConverter(this.client);
        const { markdown, sourceMentionedUserIds } = await converter.convert(
          databaseId,
          this.userMap,
        );

        if (!markdown || markdown.trim() === '') {
          console.warn(
            `[NOTION LOADER] Skipping database ${databaseId}: Empty or too short content`,
          );
          return;
        }

        const title = this.extractDatabaseTitle(dbObj);
        const parentId = this.context.storageUtils.extractDatabaseParentId(
          dbObj.parent,
        );
        const hierarchyPath = await this.buildHierarchyPath(
          databaseId,
          title,
          parentId,
        );

        const result = await this.context.storageUtils.storeDocument({
          id: databaseId,
          title,
          content: markdown,
          hierarchyPath,
          parentId,
          updatedAt: dbObj.last_edited_time,
          lastEditedBy: dbObj.last_edited_by?.id,
          createdBy: dbObj.created_by?.id,
          mentionedUserIds: sourceMentionedUserIds ?? [],
          url: `https://notion.so/${databaseId.replace(/-/g, '')}`,
          isDatabase: true,
        });

        console.log(
          `[NOTION LOADER] Successfully updated database ${databaseId}`,
        );

        return result?.id;
      } catch (error) {
        if (
          this.context.storageUtils.handleEntityError(
            error,
            databaseId,
            'database',
          )
        ) {
          // Call the deletion handler from the main loader
          await this.context.handleEntityDeletion(databaseId, 'database');
        }
      }
    } catch (error) {
      console.error(
        `[NOTION LOADER] Error handling database update for ${databaseId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Specialized method for scheduled database syncing - optimized for efficiency
   * Only syncs databases that have been modified since the given date
   */
  public async syncRecentDatabases(options?: {
    modifiedSince?: Date;
  }): Promise<number[]> {
    const allDatabases: ProcessingNotionDatabase[] = [];
    let cursor: string | undefined;

    console.log('[NOTION LOADER] Syncing recent Notion databases...');

    // First, fetch all relevant databases
    do {
      try {
        const response = await this.client.search({
          query: '',
          filter: {
            property: 'object',
            value: 'database',
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
          page_size: this.apiLimit,
          start_cursor: cursor,
        });

        if (response.results.length === 0) break;

        // Convert results to ProcessingNotionDatabase
        const databases = await this.processResults(
          response.results as DatabaseObjectResponse[],
        );

        // Apply date filtering if needed
        if (options?.modifiedSince) {
          const modifiedSince = options.modifiedSince;
          let allBatchTooOld = true;

          const filteredDatabases = databases.filter((db) => {
            const lastEditedDate = new Date(db.last_edited_time);
            const isRecent = lastEditedDate >= modifiedSince;
            if (isRecent) allBatchTooOld = false;
            return isRecent;
          });

          allDatabases.push(...filteredDatabases);

          // Early termination if whole batch is too old
          if (allBatchTooOld) {
            console.log(
              '[NOTION LOADER] All databases in batch are older than cutoff date, stopping',
            );
            break;
          }
        } else {
          allDatabases.push(...databases);
        }

        cursor = response.next_cursor ?? undefined;
        console.log(
          `[NOTION LOADER] Loaded ${allDatabases.length} databases for sync so far...`,
        );
      } catch (error) {
        console.error('[NOTION LOADER] Error fetching databases:', error);
        break;
      }
    } while (cursor);

    const processedDocIds: number[] = [];

    // Process in batches using the same pattern as loadDatabaseBatches
    for (let i = 0; i < allDatabases.length; i += this.batchSize) {
      try {
        const batch = allDatabases.slice(i, i + this.batchSize);
        const existingDocs = await this.context.storageUtils.getExistingDocs(
          batch.map((db) => db.id),
          true,
        );

        const { toStore, toAddAccess } = this.classifyDatabases(
          batch,
          existingDocs,
        );

        console.log(
          `[NOTION LOADER] Processing sync batch ${i / this.batchSize + 1}: ` +
            `${batch.length} databases | ` +
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
                space_id: toAddAccess.map(() => this.context.workspaceId),
              },
            },
          );
        }

        // Store documents
        for (const database of toStore) {
          if (
            !database.processedContent?.markdown ||
            database.processedContent.markdown.trim() === ''
          ) {
            console.warn(
              `Skipping content storage for database ${database.id}: Empty content`,
            );
            continue;
          }

          const result = await this.context.storageUtils.storeDocument({
            id: database.id,
            title: database.title,
            content: database.processedContent.markdown,
            hierarchyPath: database.title, // Simple hierarchy for databases
            parentId: undefined, // We don't have parent info in this context
            updatedAt: database.last_edited_time,
            lastEditedBy: database.last_edited_by?.id,
            createdBy: database.created_by?.id,
            mentionedUserIds:
              database.processedContent.sourceMentionedUserIds ?? [],
            url:
              database.url ??
              `https://notion.so/${database.id.replace(/-/g, '')}`,
            isDatabase: true,
          });

          if (result?.id) {
            processedDocIds.push(result.id);
          }
        }
      } catch (error) {
        console.error(
          '[NOTION LOADER] Error processing database sync batch:',
          error,
        );
        continue;
      }
    }

    return processedDocIds;
  }

  public async loadDatabaseBatches(): Promise<number[]> {
    const allDatabases: ProcessingNotionDatabase[] = [];
    let cursor: string | undefined;

    console.log('[NOTION LOADER] Fetching Notion databases...');

    do {
      try {
        const { results: databases, next_cursor } = await this.fetchDatabases({
          cursor,
        });

        if (databases.length === 0) break;
        allDatabases.push(...databases);
        cursor = next_cursor;

        console.log(
          `[NOTION LOADER] Loaded ${allDatabases.length} databases so far...`,
        );
      } catch (error) {
        console.error('[NOTION LOADER] Error fetching databases:', error);
        continue;
      }
    } while (cursor);

    // Use existing document store
    const processedDocIds: number[] = [];

    // Process databases in batches
    for (let i = 0; i < allDatabases.length; i += this.batchSize) {
      try {
        const batch = allDatabases.slice(i, i + this.batchSize);

        const existingDocs = await this.context.storageUtils.getExistingDocs(
          batch.map((db) => db.id),
          true,
        );

        const { toStore, toAddAccess } = this.classifyDatabases(
          batch,
          existingDocs,
        );

        console.log(
          `[NOTION LOADER] Processing batch ${i / this.batchSize + 1}: ` +
            `${batch.length} databases | ` +
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

        // Create or update databases
        for (const database of toStore) {
          // Filter out databases with insufficient content
          if (
            !database.processedContent?.markdown ||
            database.processedContent.markdown.trim() === ''
          ) {
            console.warn(
              `Skipping content storage for database ${database.id}: Empty or insufficient content`,
            );
            continue;
          }

          const result = await this.context.storageUtils.storeDocument({
            id: database.id,
            title: database.title,
            content: database.processedContent.markdown,
            hierarchyPath: database.title,
            updatedAt: database.last_edited_time,
            lastEditedBy: database.last_edited_by?.id,
            createdBy: database.created_by?.id,
            mentionedUserIds:
              database.processedContent.sourceMentionedUserIds ?? [],
            url:
              database.url ??
              `https://notion.so/${database.id.replace(/-/g, '')}`,
            isDatabase: true,
          });

          if (result?.id) {
            processedDocIds.push(result.id);
          }
        }
      } catch (error) {
        console.error(
          '[NOTION LOADER] Error processing database batch:',
          error,
        );
        continue;
      }
    }

    return processedDocIds;
  }

  private async fetchDatabases(options: {
    cursor?: string;
  }): Promise<{ results: ProcessingNotionDatabase[]; next_cursor?: string }> {
    // Fetch databases using the Notion API
    const response = await this.client.search({
      query: '',
      filter: {
        property: 'object',
        value: 'database',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: this.apiLimit,
      start_cursor: options.cursor,
    });

    // Process results using the shared method
    const databases = await this.processResults(
      response.results as DatabaseObjectResponse[],
    );

    return {
      results: databases,
      next_cursor: response.next_cursor ?? undefined,
    };
  }

  private async processResults(
    results: DatabaseObjectResponse[],
  ): Promise<ProcessingNotionDatabase[]> {
    const converter = new NotionDatabaseToGFMConverter(this.client);

    console.log(`[NOTION LOADER] Processing ${results.length} databases...`);

    const processPromises = results.map(async (database) => {
      try {
        const { markdown, sourceMentionedUserIds } = await converter.convert(
          database.id,
          this.userMap,
        );

        const title = this.extractDatabaseTitle(database);

        return {
          id: database.id,
          title,
          created_time: database.created_time,
          last_edited_time: database.last_edited_time,
          created_by: database.created_by,
          last_edited_by: database.last_edited_by,
          url: `https://notion.so/${database.id.replace(/-/g, '')}`,
          processedContent: {
            markdown: markdown ?? '',
            sourceMentionedUserIds: sourceMentionedUserIds ?? [],
          },
        } as ProcessingNotionDatabase;
      } catch (error) {
        console.error(`Error processing database ${database.id}:`, error);

        return {
          id: database.id,
          title: 'Untitled Database',
          created_time: database.created_time,
          last_edited_time: database.last_edited_time,
          processedContent: {
            markdown: '',
            sourceMentionedUserIds: [],
          },
        } as ProcessingNotionDatabase;
      }
    });

    return Promise.all(processPromises);
  }

  private classifyDatabases(
    databases: ProcessingNotionDatabase[],
    existingDocs: Map<
      string,
      NotionDocumentMetadata & {
        user_ids_access: string[];
        source_updated_at: string;
      }
    >,
  ): {
    toStore: ProcessingNotionDatabase[];
    toAddAccess: AccessOperation[];
  } {
    const toStore: ProcessingNotionDatabase[] = [];
    const toAddAccess: AccessOperation[] = [];

    databases.forEach((database) => {
      const existingDoc = existingDocs.get(database.id);

      if (!existingDoc) {
        // New document - store it
        toStore.push(database);
        return;
      }

      const existingTimestamp = new Date(
        existingDoc.source_updated_at,
      ).getTime();
      const newTimestamp = new Date(database.last_edited_time).getTime();

      if (existingTimestamp >= newTimestamp) {
        // Same version or older - just update access if needed
        if (!existingDoc.user_ids_access.includes(this.context.userId)) {
          toAddAccess.push({
            id: database.id,
            workspaceId: this.context.workspaceId,
          });
        }
        return;
      }

      // Different version - update it
      toStore.push(database);
    });

    return { toStore, toAddAccess };
  }

  private async buildHierarchyPath(
    id: string,
    title: string,
    parentId?: string,
  ): Promise<string> {
    const entry = {
      id,
      title,
      parentId,
    };

    const hierarchyPaths =
      await this.context.hierarchyManager.buildHierarchyPaths(
        [entry],
        this.context.userId,
        'notion',
      );

    return hierarchyPaths.get(id) ?? title;
  }

  private extractDatabaseTitle(dbObj: DatabaseObjectResponse): string {
    if (dbObj.title && Array.isArray(dbObj.title) && dbObj.title.length > 0) {
      const title = dbObj.title
        .map((rt) => rt.plain_text || '')
        .join('')
        .trim();

      if (title) return title;
    }

    return `Untitled Database (${dbObj.id})`;
  }
}
