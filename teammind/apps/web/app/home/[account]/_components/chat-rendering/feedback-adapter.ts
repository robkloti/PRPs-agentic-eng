import { SupabaseClient } from '@supabase/supabase-js';

import { FeedbackAdapter } from '@assistant-ui/react';

import { Database } from '~/lib/database.types';

export function createFeedbackAdapter(
  supabase: SupabaseClient<Database>,
  conversationId: string | null,
): FeedbackAdapter {
  return {
    submit: ({ message, type }) => {
      if (!conversationId) {
        console.error('Cannot submit feedback: missing conversation ID');
        return;
      }

      void (async () => {
        try {
          // Map our UI feedback type to the database enum
          const feedbackValue = type === 'positive' ? 'up' : 'down';

          // Find message by content (assuming first text content part)
          const textPart = message.content.find((part) => part.type === 'text');
          if (!textPart || !('text' in textPart)) {
            console.error('Cannot submit feedback: invalid message content');
            return;
          }

          const messageContent = textPart.text;

          const { data: success, error } = await supabase.rpc(
            'update_message_feedback_by_content',
            {
              conversation_id: conversationId,
              message_content: messageContent,
              feedback_value: feedbackValue,
            },
          );

          if (error) {
            console.error('Error submitting feedback:', error);
          } else if (!success) {
            console.warn(
              'No message was updated - message may not exist or user lacks permission',
            );
          }
        } catch (error) {
          console.error('Error in feedback submission process:', error);
        }
      })();
    },
  };
}
