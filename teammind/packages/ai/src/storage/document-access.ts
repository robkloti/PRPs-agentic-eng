import { SupabaseClient } from '@supabase/supabase-js';

import { Database, Json } from '@tm/supabase/database';

import { DocumentSource } from '../types';

type DocumentMetadataFilter = {
  source: DocumentSource;
  metadata?: {
    space_id?: string | string[]; // Confluence space id
    board_id?: number | number[]; // Jira board id
    folder_id?: string | string[]; // Google Drive folder id
    [key: string]: Json | undefined;
  };
  source_ids?: string[]; // Document ids in the source
};

export class DocumentAccessManager {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Add or remove a single user's access to documents matching filters
   */
  async manageUserAccess(
    userId: string,
    operation: 'add' | 'remove',
    filters: DocumentMetadataFilter,
  ): Promise<void> {
    const { error } = await this.client.rpc('manage_document_user_access', {
      source_input: filters.source,
      target_user_id: userId,
      operation,
      metadata_filter: filters.metadata,
      source_ids: filters.source_ids,
    });

    if (error) {
      throw new Error(`Failed to ${operation} user access: ${error.message}`);
    }
  }

  /**
   * Get all users who have access to a specific document
   */
  async getUsersWithAccess(documentId: number): Promise<string[]> {
    const { data, error } = await this.client
      .from('document_user_access')
      .select('user_id')
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Failed to get users with access: ${error.message}`);
    }

    return (data || []).map((record) => record.user_id);
  }

  /**
   * Get all documents a user has access to
   */
  async getDocumentsForUser(userId: string): Promise<number[]> {
    const { data, error } = await this.client
      .from('document_user_access')
      .select('document_id')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get documents for user: ${error.message}`);
    }

    return (data || []).map((record) => record.document_id);
  }
}
