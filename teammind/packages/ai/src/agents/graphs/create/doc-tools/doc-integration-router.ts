import { END } from '@langchain/langgraph';

import { TeamMindState } from '../create-graph';

/**
 * Router tool that processes the document CRUD decision and
 * prepares the state for the specific integration tool
 *
 * @returns A function that processes the state for integration
 */
export const createDocIntegrationDecissionTool = () => {
  return (state: typeof TeamMindState.State): typeof TeamMindState.State => {
    const { docActionDecision, userConfig, userPreferences } = state;

    // First check if document generation is enabled
    if (
      userPreferences &&
      userPreferences.document_generation_enabled === false
    ) {
      console.log('Document generation is disabled in user preferences');
      return {
        ...state,
        skipDocumentOperation: true,
      };
    }

    if (!docActionDecision?.source) {
      console.error('No valid document decision found in state');
      return {
        ...state,
        error: {
          message: 'No valid document decision found',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // If decision is to take no action, set a skip flag
    if (docActionDecision.action === 'none') {
      return {
        ...state,
        skipDocumentOperation: true,
      };
    }

    // Check if there's a preferred document source set
    let { source } = docActionDecision;

    if (
      userPreferences?.preferred_document_source &&
      userConfig.availableConnectors.includes(
        userPreferences.preferred_document_source,
      )
    ) {
      // Override with preferred source if available
      source = userPreferences.preferred_document_source;
      console.log(`Using preferred document source: ${source}`);
    }

    // Check if the source is in the available connectors
    if (!userConfig.availableConnectors.includes(source)) {
      console.error(`Source ${source} is not available in user's connectors`);
      return {
        ...state,
        error: {
          message: `Source ${source} is not available in user's connectors`,
          timestamp: new Date().toISOString(),
          operation: 'document_integration_router',
        },
      };
    }

    // Return updated state with the target integration and credentials
    return {
      ...state,
      docTargetIntegration: source,
    };
  };
};

/**
 * Router function for document integration selection
 * Used with addConditionalEdges to route to the appropriate integration tool
 *
 * @param state - The current state of the graph
 * @returns The name of the next node to route to
 */
export const docIntegrationRouter = (
  state: typeof TeamMindState.State,
): string => {
  if (state.error) {
    return 'handleError';
  }

  // If we're skipping document operation, route to END directly
  if (state.skipDocumentOperation) {
    return END;
  }

  if (!state.docTargetIntegration) {
    return 'handleError';
  }

  if (!state.userPreferences?.document_auto_update) {
    return 'docSaveActionTool';
  }

  // Route to the appropriate integration
  if (state.docTargetIntegration === 'confluence') {
    return 'confluenceAgentTool';
  } else if (state.docTargetIntegration === 'notion') {
    return 'notionAgentTool';
  } else if (state.docTargetIntegration === 'google_drive') {
    return 'googleDocsAgentTool';
  }

  // Default fallback
  console.log('No matching integration found');
  return 'handleError';
};
