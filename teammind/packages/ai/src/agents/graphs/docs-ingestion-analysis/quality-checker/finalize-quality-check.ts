import type { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { DocQualityCheckState } from './search-tool';

type DocumentQualityItem =
  Database['public']['Tables']['document_quality_flags']['Insert'];

type DocumentQualityRelationItem =
  Database['public']['Tables']['document_quality_flag_relations']['Insert'];

/**
 * Creates a tool for saving quality check results to the database
 *
 * @param supabaseClient The Supabase client
 * @returns Function that saves the analysis results
 */
export const createFinalizeQualityCheckTool = (
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (state: DocQualityCheckState): Promise<DocQualityCheckState> => {
    const { documentId, document, analysisResult } = state;

    if (!documentId || !document || !analysisResult) {
      return {
        ...state,
        error: {
          message: 'Missing required data for saving quality check results',
          timestamp: new Date().toISOString(),
          operation: 'finalize_quality_check',
        },
      };
    }

    try {
      // If the analysis determined that we shouldn't flag the document,
      // simply mark the process as completed and don't create a flag
      if (!analysisResult.shouldFlag) {
        return {
          ...state,
          completed: true,
        };
      }

      // Only proceed with flag creation if the document should be flagged
      // Check if a flag already exists for this document with the same type
      const { data: existingFlags, error: flagsError } = await supabaseClient
        .from('document_quality_flags')
        .select('id, status')
        .eq('document_id', documentId)
        .eq('flag_type', analysisResult.primaryReason!);

      if (flagsError) {
        throw new Error(`Error checking existing flags: ${flagsError.message}`);
      }

      // If there's an existing flag that's still open or in progress, update it
      // Otherwise, create a new flag
      if (existingFlags && existingFlags.length > 0) {
        const activeFlags = existingFlags.filter(
          (flag) => flag.status === 'open' || flag.status === 'in_progress',
        );

        if (activeFlags.length > 0) {
          // Update the existing flag with new analysis
          const { error: updateError } = await supabaseClient
            .from('document_quality_flags')
            .update({
              recommended_action: analysisResult.recommendedAction,
              // Map relevancy to relevancy until DB schema/type is updated
              relevancy: analysisResult.relevancy,
              details: analysisResult.details,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeFlags[0]!.id);

          if (updateError) {
            throw new Error(
              `Error updating existing flag: ${updateError.message}`,
            );
          }

          // Handle related documents by first removing existing relations
          await updateRelatedDocuments(
            supabaseClient,
            activeFlags[0]!.id,
            analysisResult.relatedDocumentIds ?? [],
          );
        } else {
          // Create a new flag (previous flags were resolved/ignored)
          await createNewFlag(supabaseClient, documentId, analysisResult);
        }
      } else {
        // No existing flags, create a new one
        await createNewFlag(supabaseClient, documentId, analysisResult);
      }

      return {
        ...state,
        completed: true,
      };
    } catch (error) {
      console.error('Error finalizing quality check:', error);

      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error finalizing quality check',
          timestamp: new Date().toISOString(),
          operation: 'finalize_quality_check',
        },
      };
    }
  };
};

/**
 * Helper function to create a new document quality flag
 */
async function createNewFlag(
  supabaseClient: SupabaseClient<Database>,
  documentId: number,
  analysisResult: DocQualityCheckState['analysisResult'],
) {
  if (!analysisResult) return;

  // Insert the flag first
  const { data: newFlag, error: createError } = await supabaseClient
    .from('document_quality_flags')
    .insert({
      document_id: documentId,
      flag_type: analysisResult.primaryReason,
      recommended_action: analysisResult.recommendedAction,
      status: 'open',
      // Assuming the DB schema will be updated: pass relevancy here.
      // Map relevancy to relevancy as the DB type expects it
      relevancy: analysisResult.relevancy,
      details: analysisResult.details,
    } as DocumentQualityItem) // Type cast remains necessary
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Error creating new flag: ${createError.message}`);
  }

  // Then store the related document IDs in the relation table
  if (newFlag && analysisResult.relatedDocumentIds?.length) {
    await insertRelatedDocuments(
      supabaseClient,
      newFlag.id,
      analysisResult.relatedDocumentIds,
    );
  }
}

/**
 * Insert related document IDs into the relation table
 */
async function insertRelatedDocuments(
  supabaseClient: SupabaseClient<Database>,
  flagId: number,
  relatedDocumentIds: number[],
) {
  if (!relatedDocumentIds.length) return;

  // Create relation objects
  const relations = relatedDocumentIds.map(
    (docId) =>
      ({
        flag_id: flagId,
        related_document_id: docId,
      }) as DocumentQualityRelationItem,
  );

  // Insert all relations
  const { error } = await supabaseClient
    .from('document_quality_flag_relations')
    .insert(relations);

  if (error) {
    throw new Error(`Error creating document relations: ${error.message}`);
  }
}

/**
 * Update related documents for an existing flag
 */
async function updateRelatedDocuments(
  supabaseClient: SupabaseClient<Database>,
  flagId: number,
  relatedDocumentIds: number[],
) {
  // First delete all existing relations
  const { error: deleteError } = await supabaseClient
    .from('document_quality_flag_relations')
    .delete()
    .eq('flag_id', flagId);

  if (deleteError) {
    throw new Error(
      `Error removing existing relations: ${deleteError.message}`,
    );
  }

  // Then insert the new relations
  if (relatedDocumentIds.length) {
    await insertRelatedDocuments(supabaseClient, flagId, relatedDocumentIds);
  }
}
