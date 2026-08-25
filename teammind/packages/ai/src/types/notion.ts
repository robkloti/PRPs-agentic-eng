import { Block, ID } from 'notion-types';

/**
 * Configuration for Notion API requests
 */
export interface NotionConfig {
  accessToken: string;
  workspaceId: string;
}

/**
 * Notion workspace information
 */
export interface NotionWorkspace {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Page data during processing
 */
export interface ProcessingNotionPage {
  id: ID;
  title: string;
  parent?: {
    type: 'database_id' | 'page_id' | 'block_id' | 'workspace';
    database_id?: string;
    page_id?: string;
    block_id?: string;
    workspace?: boolean;
  };
  created_time: string;
  last_edited_time: string;
  created_by: {
    id: string;
    object: 'user';
  };
  last_edited_by: {
    id: string;
    object: 'user';
  };
  url: string;
  properties: Record<string, unknown>;
  content?: Block[];
  processedContent?: {
    markdown: string;
    sourceMentionedUserIds: string[];
  };
  hierarchy_path?: string;
}

export interface ProcessingNotionDatabase {
  id: string;
  title: string;
  created_time: string;
  last_edited_time: string;
  created_by?: {
    id: string;
    object: 'user';
  };
  last_edited_by?: {
    id: string;
    object: 'user';
  };
  url?: string;
  parent?: {
    type: 'workspace' | 'page_id';
    page_id?: string;
    workspace?: boolean;
  };
  schema?: Record<string, unknown>;
  processedContent?: {
    markdown: string;
    sourceMentionedUserIds: string[];
  };
  hierarchy_path?: string;
}

/**
 * Metadata specific to Notion documents
 */
export interface NotionDocumentMetadata {
  url: string;
  space_id: string;
  is_database: boolean;
}
