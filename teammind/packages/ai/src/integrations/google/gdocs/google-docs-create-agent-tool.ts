import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { TeamMindState } from '../../../agents';
import { DocumentAction } from '../../../types';
import { CreateExecutionService } from '../../shared';
import { GoogleDocsCreateResult } from './google-docs-create-executor';

/**
 * Tool that integrates with Google Docs to create or update documents
 * Uses the ActionExecutionService for abstracting the execution logic
 *
 * @returns A function that processes the state and performs Google Docs operations
 */
export const createGoogleDocsAgentTool = (
  actionService: CreateExecutionService,
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { docActionDecision, docContent, userId, userConfig, meetingId } =
      state;

    try {
      // Validate that we have both decision and content data
      if (!docActionDecision?.action) {
        throw new Error('Invalid document CRUD decision');
      }

      if (!docContent?.content) {
        throw new Error('Missing document content');
      }

      if (docActionDecision.action === 'update' && !docActionDecision.pageId) {
        throw new Error('Page ID required for update');
      }

      if (docActionDecision.action === 'create' && !docContent.title) {
        throw new Error('Title required for create');
      }

      // Check if we have Google config
      if (!userConfig.credentials.google_drive) {
        throw new Error('Missing Google Drive integration credentials');
      }

      // Determine action type
      const actionType =
        docActionDecision.action === 'update'
          ? 'document_update'
          : 'document_create';

      // Prepare the action data
      const actionData: DocumentAction = {
        action:
          docActionDecision.action === 'none'
            ? 'none'
            : docActionDecision.action,
        pageId: docActionDecision.pageId,
        parentPageId: docActionDecision.parentPageId,
        spaceId: docActionDecision.spaceId,
        content: docContent.content,
        updateSummary: docContent.updateSummary,
        title: docContent.title,
      };

      // Use the service to execute the action
      const result =
        await actionService.executeActionDirectly<GoogleDocsCreateResult>(
          'google_drive',
          actionType,
          actionData,
          userConfig.credentials.google_drive,
          userId,
        );

      // Save the result to the database
      await supabaseClient.from('document_updates').insert({
        meeting_id: meetingId,
        user_id: userId,
        url: result.url,
        source: 'google_drive',
        source_id: result.id,
        title: result.title,
        content_after: docContent.content,
        content_before: result.contentBefore,
        update_summary: docContent.updateSummary,
        status: 'executed',
        action_type: actionType,
        execution_data: {
          ...docActionDecision,
          content: docContent.content,
        },
        executed_at: new Date().toISOString(),
      });

      // Return updated state with the operation result
      return {
        ...state,
        documentOperationCompleted: true,
      };
    } catch (error) {
      console.error('Error in Google Docs agent tool:', error);

      // Return error state
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown Google Docs integration error',
          timestamp: new Date().toISOString(),
          operation: 'google_docs_integration',
        },
      };
    }
  };
};
