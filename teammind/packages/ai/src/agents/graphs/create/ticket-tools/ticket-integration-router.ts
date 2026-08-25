import { END } from '@langchain/langgraph';

import { TeamMindState } from '../create-graph';

/**
 * Router tool that processes the ticket creation decision and
 * prepares the state for the specific ticket system integration
 *
 * @returns A function that processes the state for ticket integration
 */
export const createTicketIntegrationDecisionTool = () => {
  return (state: typeof TeamMindState.State): typeof TeamMindState.State => {
    const { ticketGeneration, userConfig, userPreferences } = state;

    // First check if ticket generation is enabled
    if (
      userPreferences &&
      userPreferences.ticket_generation_enabled === false
    ) {
      console.log('Ticket generation is disabled in user preferences');
      return {
        ...state,
        skipTicketCreation: true,
      };
    }

    if (!ticketGeneration) {
      console.error('No valid ticket creation decision found in state');
      return {
        ...state,
        error: {
          message: 'No valid ticket creation decision found',
          timestamp: new Date().toISOString(),
          operation: 'ticket_integration_router',
        },
      };
    }

    // If we decided not to create any tickets or there are no tickets to create
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

    // Check if there's a preferred ticket source set
    let { source } = ticketGeneration;

    if (
      userPreferences?.preferred_ticket_source &&
      userConfig.availableConnectors.includes(
        userPreferences.preferred_ticket_source,
      )
    ) {
      // Override with preferred source if available
      source = userPreferences.preferred_ticket_source;
      console.log(`Using preferred ticket source: ${source}`);
    }

    // Check if the source is in the available connectors
    if (!userConfig.availableConnectors.includes(source)) {
      console.error(`Source ${source} is not available in user's connectors`);
      return {
        ...state,
        error: {
          message: `Source ${source} is not available in user's connectors`,
          timestamp: new Date().toISOString(),
          operation: 'ticket_integration_router',
        },
      };
    }

    // Return updated state with the target integration and credentials
    return {
      ...state,
      ticketTargetIntegration: source,
    };
  };
};

/**
 * Router function for ticket integration selection
 * Used with addConditionalEdges to route to the appropriate integration tool
 *
 * @param state - The current state of the graph
 * @returns The name of the next node to route to
 */
export const ticketIntegrationRouter = (
  state: typeof TeamMindState.State,
): string => {
  // If there's an error, route to the error handler
  if (state.error) {
    return 'handleError';
  }

  // If we're skipping ticket creation, go to END directly
  if (state.skipTicketCreation) {
    return END;
  }

  // If no target integration specified, route to error handler
  if (!state.ticketTargetIntegration) {
    return 'handleError';
  }

  // Check if we should execute directly or save for review based on auto_update preference
  if (!state.userPreferences?.ticket_auto_update) {
    return 'ticketSaveActionTool';
  }

  // Route to the appropriate ticket system integration
  switch (state.ticketTargetIntegration) {
    case 'jira':
      return 'jiraAgentTool';
    default:
      console.error(
        `Unsupported ticket integration: ${state.ticketTargetIntegration}`,
      );
      return 'handleError';
  }
};
