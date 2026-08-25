import type { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { estimateJinaTokenCount } from '../../../../_utils';
import { JinaEmbeddings } from '../../../../embeddings';
import {
  GroupedSearchResultItem,
  HierachicalQueryInput,
  HierachicalSearchParams,
  HierarchicalRetriever,
} from '../../../../storage';
import { DocumentSource } from '../../../../types';

/**
 * Interface for document quality check state
 */
export interface DocQualityCheckState {
  // Input fields
  documentId: number;
  userId: string;

  // Document being analyzed
  document?: {
    id: number;
    title: string;
    hierarchy_path?: string;
    content: string;
    source: DocumentSource;
    metadata: Record<string, unknown>;
    source_updated_at: string;
  };

  // Similar documents - reusing GroupedSearchResultItem from retrieve.ts
  similarDocuments?: GroupedSearchResultItem[];

  // Analysis results
  analysisResult?: {
    shouldFlag: boolean;
    // Make these fields optional since they're only required when shouldFlag is true
    primaryReason?:
      | 'outdated'
      | 'inconsistent'
      | 'redundant'
      | 'quality'
      | 'factual';
    relevancy?: number;
    recommendedAction?: 'update' | 'merge' | 'archive' | 'restructure';
    details: string;
    relatedDocumentIds?: number[];
  };

  // Completion flag
  completed?: boolean;

  // Error information
  error?: {
    message: string;
    timestamp: string;
    operation: string;
  };

  // Retry tracking
  retryCount?: number;
}

// Document source types grouped by category
const DOCUMENT_SOURCES: DocumentSource[] = [
  'confluence',
  'sharepoint',
  'notion',
  'pdf',
];

/**
 * Creates a search tool for finding similar documents with enhanced chunking for large documents
 *
 * @param supabaseClient The Supabase client
 * @returns Function that searches for similar documents
 */
export const createSimilarDocumentsSearchTool = (
  supabaseClient: SupabaseClient<Database>,
) => {
  // Initialize the retriever with optimized settings for document comparison
  const retriever = new HierarchicalRetriever({
    client: supabaseClient,
    docSearchLimit: 32,
    chunkSearchLimit: 128,
    defaultSimilarityThreshold: 0.4,
  });

  const embedder = new JinaEmbeddings({
    lateChunking: true,
  });

  return async (state: DocQualityCheckState): Promise<DocQualityCheckState> => {
    const { documentId, userId } = state;

    if (!documentId) {
      return {
        ...state,
        error: {
          message: 'Missing document ID for search',
          timestamp: new Date().toISOString(),
          operation: 'similar_documents_search',
        },
      };
    }

    try {
      // Get the document details
      const { data: document, error: docError } = await supabaseClient
        .from('documents')
        .select(
          'id, title, content, hierarchy_path, summary, summary_embedding, source, metadata, source_updated_at, document_user_access!inner(user_id)',
        )
        .eq('id', documentId)
        .eq('document_user_access.user_id', userId)
        .single();

      if (docError || !document) {
        return {
          ...state,
          error: {
            message: docError?.message || 'Document not found',
            timestamp: new Date().toISOString(),
            operation: 'similar_documents_search',
          },
        };
      }

      // Prepare the HyDE document with its pre-computed embedding
      const hydeDocument: HierachicalQueryInput = {
        text: document.summary,
        embedding: document.summary_embedding as unknown as number[],
      };

      // Prepare search parameters
      const searchParams: HierachicalSearchParams = {
        target_user_id: userId,
        similarityThreshold: 0.5,
        excludeDocumentIds: documentId, // Exclude the current document
        doc_search_limit: 32,
        chunk_search_limit: 128,
        source: DOCUMENT_SOURCES,
      };

      // Estimate token count to determine if chunking is needed
      const estimatedTokens = estimateJinaTokenCount(document.content);
      let similarDocuments: GroupedSearchResultItem[];

      if (estimatedTokens <= 2048) {
        // For smaller documents, use the whole content as a single query
        similarDocuments = await retriever.hierarchicalSearch(
          document.content,
          hydeDocument,
          searchParams,
        );
      } else {
        // For larger documents, chunk and search with each chunk
        const chunkEmbeddings =
          await embedder.createEmbeddedGFMContextPathChunks(
            document.content,
            document.title,
            {
              maxTokensPerChunk: 2048,
              maxWordsPerChunk: 1700,
            },
          );
        // Process chunks in batches for better performance
        const batchSize = 4;
        const allResults: GroupedSearchResultItem[][] = [];

        // Use the chunks from chunkEmbeddings instead of chunkedDocuments
        for (let i = 0; i < chunkEmbeddings.length; i += batchSize) {
          const batch = chunkEmbeddings.slice(i, i + batchSize);

          const batchResults: GroupedSearchResultItem[][] = await Promise.all(
            batch.map(async (chunk) => {
              return retriever.hierarchicalSearch(
                {
                  text: chunk.content,
                  embedding: chunk.embedding as unknown as number[],
                },
                hydeDocument,
                searchParams,
              );
            }),
          );

          allResults.push(...batchResults);
        }

        // Combine results with simple deduplication
        similarDocuments = HierarchicalRetriever.combineResults(allResults);
        console.log(
          `Found ${similarDocuments.length} unique similar documents`,
        );
      }

      return {
        ...state,
        document: {
          id: document.id,
          title: document.title,
          content: document.content,
          hierarchy_path: document.hierarchy_path ?? undefined,
          source: document.source,
          metadata: document.metadata as Record<string, unknown>,
          source_updated_at: document.source_updated_at,
        },
        similarDocuments,
      };
    } catch (error) {
      console.error('Error searching for similar documents:', error);

      return {
        ...state,
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown search error',
          timestamp: new Date().toISOString(),
          operation: 'similar_documents_search',
        },
      };
    }
  };
};
