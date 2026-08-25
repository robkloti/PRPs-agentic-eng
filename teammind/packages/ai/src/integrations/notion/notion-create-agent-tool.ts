import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { TeamMindState } from '../../agents';
import { CreateExecutionService } from '../shared';
import { NotionCreateResult } from './notion-create-executor';

export const createNotionAgentTool = (
  actionService: CreateExecutionService,
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { docActionDecision, docContent, userConfig, userId, meetingId } =
      state;

    if (!docActionDecision || !docContent) {
      return {
        ...state,
        error: {
          message: 'Missing document decision or content for Notion operation',
          timestamp: new Date().toISOString(),
        },
      };
    }

    try {
      // Determine action type
      const actionType =
        docActionDecision.action === 'update'
          ? 'document_update'
          : 'document_create';

      // Execute the action
      const result =
        await actionService.executeActionDirectly<NotionCreateResult>(
          'notion',
          actionType,
          {
            action: docActionDecision.action,
            pageId: docActionDecision.pageId,
            parentPageId: docActionDecision.parentPageId,
            spaceId: docActionDecision.spaceId,
            title: docContent.title,
            content: docContent.content,
            updateSummary: docContent.updateSummary,
          },
          userConfig.credentials.notion!,
          userId,
        );

      // Save the document update to the database
      await supabaseClient.from('document_updates').insert({
        meeting_id: meetingId,
        user_id: userId,
        url: result.url,
        source: 'notion',
        source_id: result.id,
        title: docContent.title,
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

      return {
        ...state,
        documentOperationCompleted: true,
      };
    } catch (error) {
      console.error('Error in Notion agent:', error);
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown Notion integration error',
          timestamp: new Date().toISOString(),
          operation: 'notion_integration',
          severity: 'critical',
        },
      };
    }
  };
};
