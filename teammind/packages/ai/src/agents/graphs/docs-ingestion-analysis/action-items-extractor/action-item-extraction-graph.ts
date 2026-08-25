import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI } from '@google/genai';
import { END, START, StateGraph } from '@langchain/langgraph';

import { Database } from '@tm/supabase/database';

import { createActionItemExtractionTool } from './action-item-extraction-tool';
import { ActionItemState } from './action-item-state';
import { createEligibilityCheckTool } from './eligibility-check-tool';
import { createSaveActionItemsTool } from './save-action-items-tool';

/**
 * Action Item Extractor Graph
 *
 * Processes documents to extract action items for users.
 */
export class ActionItemExtractorGraph {
  private graph: StateGraph<typeof ActionItemState.State>;
  private readonly supabase: SupabaseClient<Database>;
  private readonly ai: GoogleGenAI;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });
    this.graph = this.buildGraph();
  }

  /**
   * Handles and logs errors
   */
  private handleError = (state: typeof ActionItemState.State) => {
    console.log('Error detected, handling...');

    return {
      ...state,
      error: state.error
        ? {
            ...state.error,
            timestamp: new Date().toISOString(),
          }
        : {
            message: 'Unknown error',
            timestamp: new Date().toISOString(),
            operation: 'unknown',
          },
    };
  };

  /**
   * Logs errors and increments retry counter
   */
  private logError = (state: typeof ActionItemState.State) => {
    const { error } = state;

    console.error(
      `Error in operation: ${error?.operation ?? 'unknown'}, message: ${
        error?.message ?? 'no details'
      }`,
    );

    return {
      ...state,
      retryCount: (state.retryCount ?? 0) + 1,
    };
  };

  /**
   * Prepares for retry by clearing error state
   */
  private prepareRetry = (state: typeof ActionItemState.State) => {
    return {
      ...state,
      error: undefined,
    };
  };

  /**
   * Determines if operation should be retried
   */
  private shouldRetry = (state: typeof ActionItemState.State): string => {
    const MAX_RETRIES = 2;
    const retryCount = state.retryCount ?? 0;

    if (retryCount < MAX_RETRIES) {
      console.warn(`Attempting retry ${retryCount + 1} of ${MAX_RETRIES}`);
      return 'retryNode';
    }

    console.warn('Max retries reached, ending flow');
    return END;
  };

  /**
   * Routes to appropriate node for retry based on the operation that failed
   */
  private retryRouter = (state: typeof ActionItemState.State): string => {
    const { error } = state;

    switch (error?.operation) {
      case 'eligibility_check':
        return 'eligibilityCheckTool';
      case 'action_item_extraction':
        return 'extractionTool';
      case 'save_action_items':
        return 'saveTool';
      default:
        return END;
    }
  };

  /**
   * Builds the workflow graph
   */
  private buildGraph(): StateGraph<typeof ActionItemState.State> {
    // Create tool nodes
    const eligibilityCheckTool = createEligibilityCheckTool(this.supabase);
    const extractionTool = createActionItemExtractionTool(this.ai);
    const saveTool = createSaveActionItemsTool(this.supabase);

    // Build the graph
    return (
      new StateGraph(ActionItemState)
        // Add nodes
        .addNode('eligibilityCheckTool', eligibilityCheckTool)
        .addNode('extractionTool', extractionTool)
        .addNode('saveTool', saveTool)

        // Add error handling nodes
        .addNode('handleError', this.handleError)
        .addNode('logError', this.logError)
        .addNode('retryNode', this.prepareRetry)

        // Set up the main workflow
        .addEdge(START, 'eligibilityCheckTool')
        .addConditionalEdges(
          'eligibilityCheckTool',
          (state) => {
            // If document is not eligible or we have errors, end the flow
            if (!state.isEligible || state.error) {
              return 'handleError';
            }
            return 'extractionTool';
          },
          ['handleError', 'extractionTool'],
        )
        .addEdge('extractionTool', 'saveTool')
        .addEdge('saveTool', END)

        // Add error handling to extraction results path
        .addConditionalEdges(
          'extractionTool',
          (state) => (state.error ? 'handleError' : 'saveTool'),
          ['handleError', 'saveTool'],
        )

        // Add error handling to save results path
        .addConditionalEdges(
          'saveTool',
          (state) => (state.error ? 'handleError' : END),
          ['handleError', END],
        )

        // Error handling flow
        .addEdge('handleError', 'logError')
        .addConditionalEdges('logError', this.shouldRetry, ['retryNode', END])

        // Retry routing
        .addConditionalEdges('retryNode', this.retryRouter, [
          'eligibilityCheckTool',
          'extractionTool',
          'saveTool',
          END,
        ]) as StateGraph<typeof ActionItemState.State>
    );
  }

  /**
   * Runs the action item extraction workflow
   *
   * @param documentId ID of the document to process
   * @param userId User ID for document access
   * @param userConfig Optional user configuration with mentions and source IDs
   * @returns The final state with extracted action items
   */
  public async extractActionItems(
    documentId: number,
    userId: string,
    userConfig: {
      mentions?: string[];
      sourceIds?: string[];
    },
  ) {
    const compiled = this.graph.compile();
    return compiled.invoke({
      documentId,
      userId,
      userConfig: {
        mentions: userConfig?.mentions || [],
        sourceIds: userConfig?.sourceIds || [],
      },
    });
  }
}
