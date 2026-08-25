import { DocumentAccessManager, SupabaseVectorStore } from '../../../storage';
import { NotionDocumentMetadata } from '../../../types';
import { HierarchyManager } from '../../shared';

export interface NotionStorageParams {
  id: string;
  title: string;
  content: string;
  hierarchyPath: string;
  parentId?: string;
  updatedAt: string;
  lastEditedBy?: string;
  createdBy?: string;
  mentionedUserIds: string[];
  url: string;
  isDatabase: boolean;
}

export interface NotionLoaderContext {
  userId: string;
  workspaceId: string;
  vectorStore: SupabaseVectorStore;
  accessManager: DocumentAccessManager;
  hierarchyManager: HierarchyManager;
  storageUtils: NotionStorageUtils;
  handleEntityDeletion: (
    entityId: string,
    entityType: 'page' | 'database',
  ) => Promise<void>;
}

export class NotionStorageUtils {
  private readonly vectorStore: SupabaseVectorStore;
  private readonly userId: string;
  private readonly workspaceId: string;

  constructor(
    vectorStore: SupabaseVectorStore,
    userId: string,
    workspaceId: string,
  ) {
    this.vectorStore = vectorStore;
    this.userId = userId;
    this.workspaceId = workspaceId;
  }

  async getExistingDocs(
    ids: string[],
    isDatabase: boolean,
  ): Promise<
    Map<
      string,
      NotionDocumentMetadata & {
        user_ids_access: string[];
        source_updated_at: string;
      }
    >
  > {
    return this.vectorStore.getExistingDocumentsBySourceId<NotionDocumentMetadata>(
      ids,
      'notion',
      {
        space_id: this.workspaceId,
        is_database: isDatabase ? 'true' : 'false',
      },
    );
  }

  // We do not store the content raw format, as it would bloat the database (1 simple doc is around 50kB)
  async storeDocument(params: NotionStorageParams) {
    return this.vectorStore.storeDocument({
      title: params.title,
      content: params.content,
      hierarchy_path: params.hierarchyPath,
      source: 'notion',
      last_updated_source_user_id: params.lastEditedBy,
      source_author_id: params.createdBy,
      source_mentioned_user_ids: params.mentionedUserIds,
      source_updated_at: params.updatedAt,
      source_id: params.id,
      source_parent_id: params.parentId,
      metadata: {
        url: params.url,
        space_id: this.workspaceId,
        is_database: params.isDatabase,
      },
      user_ids_access: [this.userId],
    });
  }

  handleEntityError(
    error: unknown,
    entityId: string,
    entityType: 'page' | 'database',
  ): boolean {
    console.error(
      `[NOTION LOADER] Error retrieving ${entityType} ${entityId}:`,
      error,
    );

    // If we get a 404, the entity might have been deleted
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'object_not_found'
    ) {
      console.log(
        `[NOTION LOADER] ${entityType} ${entityId} might have been deleted`,
      );
      return true;
    }
    return false;
  }

  extractPageParentId(parent: {
    type: string;
    page_id?: string;
    database_id?: string;
    block_id?: string;
  }): string | undefined {
    return parent.type === 'page_id'
      ? parent.page_id
      : parent.type === 'database_id'
        ? parent.database_id
        : parent.type === 'block_id'
          ? parent.block_id
          : undefined;
  }

  extractDatabaseParentId(parent: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  }): string | undefined {
    if (parent.type === 'page_id') {
      return parent.page_id;
    }

    // For workspace parents, we don't have a meaningful parent ID
    // This will place the database at the root level
    return undefined;
  }
}
