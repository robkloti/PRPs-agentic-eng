import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI } from '@google/genai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import { Database } from '@tm/supabase/database';

import { createContentAnalysisTool } from './content-analysis-tool';
import { createFinalizeQualityCheckTool } from './finalize-quality-check';
import {
  DocQualityCheckState,
  createSimilarDocumentsSearchTool,
} from './search-tool';

// Define the state schema with user ID
export const QualityCheckState = Annotation.Root({
  // Input fields
  documentId: Annotation<number>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // User ID for document access
  userId: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Document data
  document: Annotation<DocQualityCheckState['document']>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Similar documents
  similarDocuments: Annotation<DocQualityCheckState['similarDocuments']>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Analysis results
  analysisResult: Annotation<DocQualityCheckState['analysisResult']>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Completion flag
  completed: Annotation<boolean>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Error handling
  error: Annotation<DocQualityCheckState['error']>({
    reducer: (prev, update) => update ?? prev,
  }),

  // Retry tracking
  retryCount: Annotation<number>({
    reducer: (prev, update) => (update ?? 0) + (prev ?? 0),
  }),
});

/**
 * Document Quality Check Graph
 *
 * Processes documents to identify quality issues by comparing them
 * with similar documents and analyzing content quality.
 */
export class QualityCheckGraph {
  private graph: StateGraph<typeof QualityCheckState.State>;
  private readonly supabase: SupabaseClient<Database>;
  private readonly ai: GoogleGenAI; // Renamed from model

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    }); // Updated initialization
    this.graph = this.buildGraph();
  }

  /**
   * Handles and logs errors
   */
  private handleError = (state: typeof QualityCheckState.State) => {
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
  private logError = (state: typeof QualityCheckState.State) => {
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
  private prepareRetry = (state: typeof QualityCheckState.State) => {
    return {
      ...state,
      error: undefined,
    };
  };

  /**
   * Determines if operation should be retried
   */
  private shouldRetry = (state: typeof QualityCheckState.State): string => {
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
  private retryRouter = (state: typeof QualityCheckState.State): string => {
    const { error } = state;

    switch (error?.operation) {
      case 'similar_documents_search':
        return 'searchTool';
      case 'content_analysis':
        return 'analysisTool';
      case 'finalize_quality_check':
        return 'finalizeTool';
      default:
        return END;
    }
  };

  /**
   * Builds the workflow graph
   */
  private buildGraph(): StateGraph<typeof QualityCheckState.State> {
    // Create tool nodes
    const searchTool = createSimilarDocumentsSearchTool(this.supabase);
    const analysisTool = createContentAnalysisTool(this.ai);
    const finalizeTool = createFinalizeQualityCheckTool(this.supabase);

    // Build the graph
    return (
      new StateGraph(QualityCheckState)
        // Add nodes
        .addNode('searchTool', searchTool)
        .addNode('analysisTool', analysisTool)
        .addNode('finalizeTool', finalizeTool)

        // Add error handling nodes
        .addNode('handleError', this.handleError)
        .addNode('logError', this.logError)
        .addNode('retryNode', this.prepareRetry)

        // Set up the main workflow
        .addEdge(START, 'searchTool')
        .addEdge('searchTool', 'analysisTool')
        .addEdge('analysisTool', 'finalizeTool')
        .addEdge('finalizeTool', END)

        // Add error handling to search results path
        .addConditionalEdges(
          'searchTool',
          (state) => (state.error ? 'handleError' : 'analysisTool'),
          ['handleError', 'analysisTool'],
        )

        // Add error handling to analysis results path
        .addConditionalEdges(
          'analysisTool',
          (state) => (state.error ? 'handleError' : 'finalizeTool'),
          ['handleError', 'finalizeTool'],
        )

        // Add error handling to finalize results path
        .addConditionalEdges(
          'finalizeTool',
          (state) => (state.error ? 'handleError' : END),
          ['handleError', END],
        )

        // Error handling flow
        .addEdge('handleError', 'logError')
        .addConditionalEdges('logError', this.shouldRetry, ['retryNode', END])

        // Retry routing
        .addConditionalEdges('retryNode', this.retryRouter, [
          'searchTool',
          'analysisTool',
          'finalizeTool',
          END,
        ]) as StateGraph<typeof QualityCheckState.State>
    );
  }

  /**
   * Runs the document quality check workflow
   *
   * @param documentId ID of the document to check
   * @param userId User ID for document access
   * @returns The final state with analysis results
   */
  public async checkDocument(documentId: number, userId: string) {
    const compiled = this.graph.compile();
    return compiled.invoke({ documentId, userId });
  }
}
