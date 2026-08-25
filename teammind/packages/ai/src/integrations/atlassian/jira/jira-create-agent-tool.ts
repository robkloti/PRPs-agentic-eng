import { SupabaseClient } from '@supabase/supabase-js';

import { Database, Json } from '@tm/supabase/database';

import { TeamMindState } from '../../../agents';
import { TicketAction } from '../../../types';
import { CreateExecutionService } from '../../shared';
import { JiraCreateResult } from './jira-create-executor';

/**
 * Tool that creates multiple tickets in Jira based on the ticket creation decision
 * Uses the ActionExecutionService for abstraction
 *
 * @returns A function that processes the state and creates Jira tickets
 */
export const createJiraAgentTool = (
  actionService: CreateExecutionService,
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { ticketGeneration, userConfig, userId, meetingId } = state;

    // Validate we have the necessary data
    if (!ticketGeneration) {
      console.error('Missing ticket creation decision');
      return {
        ...state,
        error: {
          message: 'Missing ticket creation decision',
          timestamp: new Date().toISOString(),
          operation: 'jira_integration',
        },
      };
    }

    // Check if we should skip ticket creation (no tickets to create)
    if (
      !ticketGeneration.createTickets ||
      !ticketGeneration.tickets ||
      ticketGeneration.tickets.length === 0
    ) {
      return {
        ...state,
        skipTicketCreation: true,
      };
    }

    if (!userConfig.credentials.jira) {
      console.error('Missing Jira integration credentials');
      return {
        ...state,
        error: {
          message: 'Missing Jira integration credentials',
          timestamp: new Date().toISOString(),
          operation: 'jira_integration',
        },
      };
    }

    try {
      // Create each ticket from the tickets array
      for (const ticket of ticketGeneration.tickets) {
        // Extract project key from the ticket
        const projectId = ticket.parentId;

        if (!projectId) {
          console.warn('Skipping ticket without project key');
          continue;
        }

        console.log('Creating Jira ticket:', ticket.title);

        // Prepare the action data
        const actionData: TicketAction = {
          parentId: ticket.parentId,
          title: ticket.title,
          content: ticket.content,
          updateSummary: ticket.updateSummary,
        };

        // Use the ActionExecutionService to create the ticket
        const result =
          await actionService.executeActionDirectly<JiraCreateResult>(
            'jira',
            'ticket_create',
            actionData,
            userConfig.credentials.jira,
            userId,
          );

        console.log(`Created Jira ticket: ${result.key} - ${result.url}`);

        // Save the ticket to the database
        await supabaseClient.from('document_updates').insert({
          meeting_id: meetingId,
          user_id: userId,
          url: result.url,
          source: 'jira',
          source_id: result.id,
          title: ticket.title,
          content_after: ticket.content,
          content_before: result.contentBefore,
          update_summary: ticket.updateSummary,
          status: 'executed',
          action_type: 'ticket_create',
          execution_data: ticket as unknown as Json,
          executed_at: new Date().toISOString(),
        });
      }

      // Return updated state with the ticket results
      return {
        ...state,
        ticketOperationCompleted: true,
      };
    } catch (error) {
      console.error('Error creating Jira tickets:', error);

      // Return error state
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown Jira integration error',
          timestamp: new Date().toISOString(),
          operation: 'jira_integration',
        },
      };
    }
  };
};
