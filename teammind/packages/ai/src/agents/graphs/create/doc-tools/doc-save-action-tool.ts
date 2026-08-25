import type { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { TeamMindState } from '../create-graph';

/**
 * Tool that saves document actions to the database instead of executing them directly
 * Uses abstracted structure for maximum flexibility across different sources
 *
 * @param supabaseClient - Initialized Supabase client
 * @returns A function that processes the state and saves the action for later review
 */
export const createDocSaveActionTool = (
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const {
      docActionDecision,
      docContent,
      meetingId,
      docTargetIntegration,
      userId,
    } = state;

    try {
      if (!docActionDecision?.action || docActionDecision.action === 'none') {
        // No action needed
        return {
          ...state,
          skipDocumentOperation: true,
        };
      }

      // For now we only have "create" actions
      const actionType = 'document_create';

      // Save the action to the document_updates table with 'pending' status
      const { error } = await supabaseClient
        .from('document_updates')
        .insert({
          meeting_id: meetingId,
          user_id: userId,
          action_type: actionType,
          source: docTargetIntegration,
          status: 'pending',
          title: docContent.title,
          content_after: docContent.content,
          update_summary: docContent.updateSummary,
          // Store all execution-specific data in the execution_data JSONB
          execution_data: {
            ...docActionDecision,
            content: docContent.content,
          },
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to save document action: ${error.message}`);
      }

      // Return success without actually executing the document operation
      return {
        ...state,
        documentOperationCompleted: true,
      };
    } catch (error) {
      console.error('Error saving document action:', error);
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error saving document action',
          timestamp: new Date().toISOString(),
          operation: 'save_document_action',
        },
      };
    }
  };
};
