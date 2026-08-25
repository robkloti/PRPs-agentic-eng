import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { QualityCheckGraph } from './quality-check-graph';

/**
 * Helper class to process batches of documents for quality checking
 * Entry point for document loaders to trigger quality checks
 */
export class DocQualityAnalyzer {
  private readonly qualityCheckGraph: QualityCheckGraph;
  private readonly supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.qualityCheckGraph = new QualityCheckGraph(supabase);
  }

  /**
   * Process multiple document IDs in sequence
   *
   * @param documentIds Array of document IDs to check
   * @param userId The user ID to use for retrieval
   * @returns Results of the quality check processing
   */
  public async processDocuments(
    documentIds: number[],
    userId: string,
  ): Promise<void> {
    if (!documentIds || documentIds.length === 0) {
      console.log('No document IDs provided for quality checks');
      return;
    }

    if (!userId) {
      console.error('Missing user ID for quality checks');
      throw new Error('User ID is required for document quality checks');
    }

    // Get all documents that have active flags
    const { data, error } = await this.supabase
      .from('document_quality_flags')
      .select('document_id')
      .in('document_id', documentIds)
      .in('status', ['open', 'in_progress']);

    if (error) {
      console.error('Error checking active flags:', error);
      return; // Proceed with all if we can't determine flag status
    }

    // Create a set of document IDs that have active flags
    const documentIdsWithFlags = new Set(
      data?.map((flag) => flag.document_id) || [],
    );

    // Return only document IDs that don't have active flags
    const filteredDocIds = documentIds.filter(
      (id) => !documentIdsWithFlags.has(id),
    );

    if (filteredDocIds.length < documentIds.length) {
      console.log(
        `Skipping ${documentIds.length - filteredDocIds.length} documents that already have active flags`,
      );
    }

    if (filteredDocIds.length === 0) {
      console.log(
        'All documents already have active flags, nothing to process',
      );
      return;
    }

    const results = [];
    console.log(
      `Starting quality checks for ${filteredDocIds.length} documents for user ${userId}`,
    );

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < filteredDocIds.length; i += batchSize) {
      const batch = filteredDocIds.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (docId) => {
          try {
            // The user-specific access check is handled by the graph in checkDocument
            const result = await this.qualityCheckGraph.checkDocument(
              docId,
              userId,
            );
            return { docId, result, success: true };
          } catch (error) {
            console.error(`Error processing document ${docId}:`, error);
            return {
              docId,
              error: error instanceof Error ? error.message : String(error),
              success: false,
            };
          }
        }),
      );

      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            docId: 'unknown',
            error: result.reason,
            success: false,
          });
        }
      }
    }

    // Log summary
    const successCount = results.filter((r) => r.success).length;
    console.log(
      `Completed quality checks for ${results.length} documents with ${successCount} successful`,
    );
  }
}
