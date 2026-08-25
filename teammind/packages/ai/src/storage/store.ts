import type { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI } from '@google/genai';

import { Database, Json } from '@tm/supabase/database';

import { JinaEmbeddings } from '../embeddings';
import {
  DocumentSummarySchema,
  docSummarySystemPrompt,
  docSummaryUserPrompt,
} from '../prompts';
import {
  ConfluenceDocumentMetadata,
  DocumentSource,
  GmailThreadMetadata,
  GoogleDriveDocumentMetadata,
  JiraMetadata,
  NotionDocumentMetadata,
  SharePointDocumentMetadata,
} from '../types';

type UpsertDocumentWithAccess =
  Database['public']['Functions']['upsert_document_with_access'];
type UpsertDocumentWithAccessArgs =
  Database['public']['Functions']['upsert_document_with_access']['Args'];
type UpsertDocumentWithAccessResult = {
  document_id: number;
  is_new: boolean;
};
type DocumentChunksInsert =
  Database['public']['Tables']['document_chunks']['Insert'];
type GetDocumentsBySourceIdFunction =
  Database['public']['Functions']['get_documents_by_source_id'];
type DeleteDocumentBySourceFunction =
  Database['public']['Functions']['delete_document_by_source'];

export class SupabaseVectorStore {
  declare FilterType: Record<string, unknown>;

  private readonly upsertBatchSize = 500;
  private readonly client: SupabaseClient<Database>;
  private readonly denseEmbeddings: JinaEmbeddings = new JinaEmbeddings({
    lateChunking: true,
  });
  private readonly ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  });

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async storeDocument(
    document: Omit<
      UpsertDocumentWithAccessArgs,
      'summary' | 'summary_embedding' | 'metadata'
    > & {
      metadata:
        | ConfluenceDocumentMetadata
        | JiraMetadata
        | SharePointDocumentMetadata
        | NotionDocumentMetadata
        | GoogleDriveDocumentMetadata
        | GmailThreadMetadata;
    },
  ): Promise<{ id: number; isNew: boolean }> {
    const titlePath = document.hierarchy_path
      ? `${document.hierarchy_path}\\${document.title}`
      : document.title;

    // Prepare content with hierarchy path and title prepended
    const contentWithHierarchy = `${titlePath}\n\n${document.content}`;
    const docSummary = await this.generateSummary(titlePath, document.content);

    // 1. Upsert document in a single atomic operation
    const { data, error } = await this.client.rpc<
      'upsert_document_with_access',
      UpsertDocumentWithAccess
    >('upsert_document_with_access', {
      ...document,
      content: contentWithHierarchy,
      summary: docSummary.summaryContent,
      summary_embedding: docSummary.summaryEmbedding as unknown as string,
      metadata: document.metadata as unknown as Json,
    });

    if (error) {
      throw new Error(`Failed to upsert document: ${error.message}`);
    }

    const { document_id, is_new } = data as UpsertDocumentWithAccessResult;

    // 2. Generate and store chunks
    try {
      const embeddedChunks =
        await this.denseEmbeddings.createEmbeddedGFMContextPathChunks(
          document.content,
          titlePath,
        );

      await this.storeEmbeddedChunks(embeddedChunks, document_id);
    } catch (chunkError) {
      // If chunk creation/storage fails, delete the document to maintain consistency
      // (but only if it's a new document - for updates, we've already deleted the old chunks)
      if (is_new) {
        try {
          await this.client.from('documents').delete().eq('id', document_id);
          console.error('Deleted document due to chunk creation failure');
        } catch (deleteError) {
          console.error(
            'Failed to delete document after chunk creation failure:',
            deleteError,
          );
        }
      }
      throw new Error(
        `Failed to process document chunks: ${chunkError as string}`,
      );
    }

    return { id: document_id, isNew: is_new };
  }

  async getExistingDocumentsBySourceId<T>(
    ids: string[],
    source: DocumentSource,
    metadataFilters: Record<string, string | string[]> = {},
  ): Promise<
    Map<string, T & { user_ids_access: string[]; source_updated_at: string }>
  > {
    const { data, error } = await this.client.rpc<
      'get_documents_by_source_id',
      GetDocumentsBySourceIdFunction
    >('get_documents_by_source_id', {
      source_ids_input: ids,
      source_type_input: source,
      metadata_filters: metadataFilters,
    });

    if (error) {
      console.error('Error fetching documents:', error);
      throw new Error(`Failed to fetch existing documents: ${error.message}`);
    }

    // Convert array of results to Map format
    return new Map(
      (data || []).map(
        (doc) =>
          [
            doc.source_id,
            {
              ...(doc.metadata as T),
              user_ids_access: doc.user_ids_access,
              source_updated_at: doc.source_updated_at,
            },
          ] as const,
      ),
    );
  }

  /**
   * Delete a document by its source ID and type
   * @param sourceId The source system ID of the document
   * @param source The source type (confluence, jira, sharepoint, notion, pdf)
   * @param userId The user ID requesting the deletion
   * @returns Object containing the document ID and deletion status
   */
  async deleteDocumentBySource(
    sourceId: string,
    source: DocumentSource,
    userId: string,
  ): Promise<{ documentId?: number; deleted: boolean }> {
    const { data, error } = await this.client.rpc<
      'delete_document_by_source',
      DeleteDocumentBySourceFunction
    >('delete_document_by_source', {
      source_id_input: sourceId,
      source_type_input: source,
      user_id_input: userId,
    });

    if (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }

    return {
      documentId: data?.document_id ? Number(data.document_id) : undefined,
      deleted: !!data?.deleted,
    };
  }

  /**
   * Generate a summary for a document and create an embedding for it
   * @param titlePath The title path of the document
   * @param docContent The content of the document
   * @returns An object containing the summary content and its embedding
   */
  private async generateSummary(
    titlePath: string,
    docContent: string,
  ): Promise<{ summaryContent: string; summaryEmbedding: number[] }> {
    const formattedPrompt = docSummaryUserPrompt.format({
      titlePath,
      docContent,
    });

    const summaryResponse = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: formattedPrompt,
      config: {
        temperature: 0.5,
        responseMimeType: 'application/json',
        responseSchema: DocumentSummarySchema,
        systemInstruction: docSummarySystemPrompt.format(),
      },
    });

    if (!summaryResponse.text) {
      throw new Error('Document summary response did not contain text.');
    }
    const { summaryContent } = JSON.parse(summaryResponse.text) as {
      // Use summaryResponse.text
      summaryContent: string;
    };

    const summary = `${titlePath}\n\n${summaryContent}`;

    const summaryEmbedding =
      await this.denseEmbeddings.embedSingleDocument(summary);

    return { summaryContent, summaryEmbedding };
  }

  /**
   * Store embedded chunks in the database, handling batching
   * @param chunks The array of chunks to store
   * @param documentId The ID of the document to associate with the chunks
   */
  private async storeEmbeddedChunks(
    chunks: DocumentChunksInsert[],
    documentId: number,
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i += this.upsertBatchSize) {
      const batch = chunks.slice(i, i + this.upsertBatchSize);
      const { error } = await this.client.from('document_chunks').insert(
        batch.map((chunk) => ({
          ...chunk,
          document_id: documentId,
        })),
      );

      if (error) {
        throw new Error(`Failed to store chunks: ${error.message}`);
      }
    }
  }
}
