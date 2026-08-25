import type { SupabaseClient } from '@supabase/supabase-js';

import { Database, Json } from '@tm/supabase/database';

import { TeamMindState } from '../create-graph';

/**
 * Tool that saves ticket actions to the database instead of executing them directly
 * Uses abstracted structure for maximum flexibility across different sources
 *
 * @param supabaseClient - Initialized Supabase client
 * @returns A function that processes the state and saves the action for later review
 */
export const createTicketSaveActionTool = (
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const {
      ticketGeneration: ticketCreateDecision,
      meetingId,
      ticketTargetIntegration,
      userId,
    } = state;

    try {
      if (
        !ticketCreateDecision?.createTickets ||
        !ticketCreateDecision.tickets ||
        ticketCreateDecision.tickets.length === 0
      ) {
        // No tickets to create
        return {
          ...state,
          skipTicketCreation: true,
        };
      }

      // Save each ticket as a separate action with 'pending' status
      const insertPromises = ticketCreateDecision.tickets.map((ticket) => {
        return supabaseClient
          .from('document_updates')
          .insert({
            meeting_id: meetingId,
            user_id: userId,
            action_type: 'ticket_create',
            source: ticketTargetIntegration,
            status: 'pending',
            title: ticket.title,
            content_after: ticket.content,
            update_summary: ticket.updateSummary,
            execution_data: ticket as unknown as Json,
          })
          .select('id');
      });

      // Execute all insert operations
      const results = await Promise.all(insertPromises);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        throw new Error(
          `Failed to save some ticket actions: ${errors.map((e) => e.error?.message).join(', ')}`,
        );
      }

      // Return success
      return {
        ...state,
        ticketOperationCompleted: true,
      };
    } catch (error) {
      console.error('Error saving ticket actions:', error);
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error saving ticket actions',
          timestamp: new Date().toISOString(),
          operation: 'save_ticket_action',
        },
      };
    }
  };
};
