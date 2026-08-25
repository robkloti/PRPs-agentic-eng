import type { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { ActionItemState } from './action-item-state';

type ActionItem =
  Database['public']['Tables']['document_action_items']['Insert'];
type ActionItemRelation =
  Database['public']['Tables']['document_action_item_relations']['Insert'];

/**
 * Creates a tool for saving extracted action items to the database
 *
 * @param supabaseClient The Supabase client
 * @returns Function that saves the extracted action items
 */
export const createSaveActionItemsTool = (
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof ActionItemState.State,
  ): Promise<typeof ActionItemState.State> => {
    const { userId, documentId, extractedActionItems } = state;

    if (!documentId || !extractedActionItems) {
      return {
        ...state,
        error: {
          message: 'Missing required data for saving action items',
          timestamp: new Date().toISOString(),
          operation: 'save_action_items',
        },
      };
    }

    try {
      // Early exit if no items found
      if (extractedActionItems.length === 0) {
        return {
          ...state,
          completed: true,
        };
      }

      // Filter for relevant items only
      const relevantItems = extractedActionItems.filter(
        (item) => item.isRelevantToUser,
      );

      if (relevantItems.length === 0) {
        console.log(
          `No action items relevant to user ${userId} in document ${documentId}`,
        );
        return {
          ...state,
          completed: true,
        };
      }

      // Process each relevant action item
      const savedItems = [];

      for (const item of relevantItems) {
        // Check if this item is similar to an existing one
        if (item.similarExistingItemId) {
          // Update the existing item by adding this document as a relation
          const { error: relationError } = await supabaseClient
            .from('document_action_item_relations')
            .upsert(
              {
                action_item_id: item.similarExistingItemId,
                document_id: documentId,
              },
              {
                onConflict: 'action_item_id,document_id',
              },
            );

          if (relationError) {
            console.warn(
              `Error creating relation for existing item: ${relationError.message}`,
            );
          } else {
            savedItems.push({
              id: item.similarExistingItemId,
              title: item.title,
              isExisting: true,
            });
          }

          continue;
        }

        // Create a new action item
        const { data: newItem, error: itemError } = await supabaseClient
          .from('document_action_items')
          .insert({
            user_id: userId,
            title: item.title,
            summary: item.summary || null,
            status: 'backlog',
          })
          .select('id')
          .single();

        if (itemError) {
          console.error(`Error creating action item: ${itemError.message}`);
          continue;
        }

        // Create relation between the action item and document
        const { error: relationError } = await supabaseClient
          .from('document_action_item_relations')
          .insert({
            action_item_id: newItem.id,
            document_id: documentId,
          });

        if (relationError) {
          console.warn(`Error creating relation: ${relationError.message}`);
        }

        savedItems.push({
          id: newItem.id,
          title: item.title,
          isNew: true,
        });
      }

      return {
        ...state,
        completed: true,
      };
    } catch (error) {
      console.error('Error saving action items:', error);

      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error saving action items',
          timestamp: new Date().toISOString(),
          operation: 'save_action_items',
        },
      };
    }
  };
};
