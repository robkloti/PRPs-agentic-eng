import type { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { ActionItemState } from './action-item-state';

/**
 * Creates a tool to check if a document is eligible for action item extraction
 *
 * @param supabaseClient The Supabase client
 * @returns Function that checks document eligibility
 */
export const createEligibilityCheckTool = (
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof ActionItemState.State,
  ): Promise<typeof ActionItemState.State> => {
    const { documentId, userConfig, userId } = state;

    if (!documentId) {
      return {
        ...state,
        isEligible: false,
        error: {
          message: 'Missing document ID for eligibility check',
          timestamp: new Date().toISOString(),
          operation: 'eligibility_check',
        },
      };
    }

    try {
      // Get the document details
      const { data: document, error: docError } = await supabaseClient
        .from('documents')
        .select(
          'id, title, content, source_author_id, last_updated_source_user_id, source_mentioned_user_ids, source, metadata, source_updated_at, document_user_access!inner(user_id)',
        )
        .eq('id', documentId)
        .eq('document_user_access.user_id', userId)
        .single();

      if (docError || !document) {
        return {
          ...state,
          isEligible: false,
          error: {
            message: docError?.message || 'Document not found or no access',
            timestamp: new Date().toISOString(),
            operation: 'eligibility_check',
          },
        };
      }

      // Get existing action items for similarity check (last 2 months)
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const { data: existingItems, error: itemsError } = await supabaseClient
        .from('document_action_items')
        .select('id, title, status')
        .eq('user_id', userId)
        .gte('created_at', twoMonthsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (itemsError) {
        console.warn(
          'Error fetching existing action items:',
          itemsError.message,
        );
        // Continue as this is not a critical error
      }

      // Get all document relations for the existing items
      let allItemDocRelations: {
        action_item_id: number;
        document_id: number;
      }[] = [];
      if (existingItems && existingItems.length > 0) {
        const { data: itemDocRelations, error: docRelError } =
          await supabaseClient
            .from('document_action_item_relations')
            .select('action_item_id, document_id')
            .in(
              'action_item_id',
              existingItems.map((item) => item.id),
            );

        if (!docRelError && itemDocRelations) {
          allItemDocRelations = itemDocRelations;
        }
      }

      // Format existing action items with document IDs
      const formattedExistingItems = existingItems
        ? existingItems.map((item) => {
            const docIds = allItemDocRelations
              .filter((rel) => rel.action_item_id === item.id)
              .map((rel) => rel.document_id);

            return {
              ...item,
              document_ids: docIds,
            };
          })
        : [];

      const isUserAuthor =
        userConfig?.sourceIds?.includes(document.source_author_id ?? '') ||
        false;
      const isUserLastUpdater =
        userConfig?.sourceIds?.includes(
          document.last_updated_source_user_id ?? '',
        ) || false;

      return {
        ...state,
        isEligible: true,
        document: {
          id: document.id,
          title: document.title,
          content: document.content,
          source: document.source,
          isUserAuthor,
          isUserLastUpdater,
          sourceMentionedUserIds: document.source_mentioned_user_ids || [],
        },
        existingActionItems: formattedExistingItems,
      };
    } catch (error) {
      console.error('Error checking document eligibility:', error);

      return {
        ...state,
        isEligible: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown eligibility check error',
          timestamp: new Date().toISOString(),
          operation: 'eligibility_check',
        },
      };
    }
  };
};
