import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI } from '@google/genai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import { Database } from '@tm/supabase/database';

import {
  createConfluenceAgentTool,
  createGoogleDocsAgentTool,
  createJiraAgentTool,
  createNotionAgentTool,
} from '../../../integrations';
import { CreateExecutionService } from '../../../integrations/shared';
import { GroupedSearchResultItem } from '../../../storage';
import {
  DocActionDecision,
  DocContentGeneration,
  DocumentSource,
  TicketGeneration,
  Transcript,
} from '../../../types';
import {
  TaskDecisionOutput,
  UserConfig,
  createRetrieveUserConfigTool,
  createTaskDecisionTool,
  createTranscriptSummarizerTool,
  createVectorSearchTool,
  taskDecisionRouterParallel,
} from './common-tools';
import {
  createDocActionDecisionTool,
  createDocContentGenerationTool,
  createDocIntegrationDecissionTool,
  createDocQueryTool,
  docIntegrationRouter,
} from './doc-tools';
import { createDocSaveActionTool } from './doc-tools/doc-save-action-tool';
import {
  createTicketGenerationTool,
  createTicketIntegrationDecisionTool,
  createTicketQueryTool,
  ticketIntegrationRouter,
} from './ticket-tools';
import { createTicketSaveActionTool } from './ticket-tools/ticket-save-action-tool';

// Define the main state schema using LangGraph annotations
export const TeamMindState = Annotation.Root({
  // Input fields
  userId: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  transcript: Annotation<Transcript>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  meetingId: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Processed transcript
  transcriptSummary: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  title: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // User configuration
  userConfig: Annotation<UserConfig>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // User preferences
  userPreferences: Annotation<{
    document_generation_enabled: boolean;
    ticket_generation_enabled: boolean;
    document_auto_update: boolean;
    ticket_auto_update: boolean;
    preferred_document_source: DocumentSource | null;
    preferred_ticket_source: DocumentSource | null;
  } | null>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Task decisions
  taskDecisions: Annotation<TaskDecisionOutput>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Document processing
  documentQueryText: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  documentHyde: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  documentSearchResults: Annotation<GroupedSearchResultItem[]>({
    reducer: (prev, update) => update ?? prev,
  }),
  docActionDecision: Annotation<DocActionDecision>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  skipDocumentOperation: Annotation<boolean>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  docContent: Annotation<DocContentGeneration>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Ticket processing
  ticketQueryText: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  ticketHyde: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  ticketQueryContext: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  ticketSearchResults: Annotation<GroupedSearchResultItem[]>({
    reducer: (prev, update) => update ?? prev,
  }),
  ticketGeneration: Annotation<TicketGeneration>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  skipTicketCreation: Annotation<boolean>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Integration fields
  docTargetIntegration: Annotation<DocumentSource>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  ticketTargetIntegration: Annotation<DocumentSource>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Completion flags
  documentOperationCompleted: Annotation<boolean>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  ticketOperationCompleted: Annotation<boolean>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Error handling
  error: Annotation<{
    message: string;
    timestamp: string;
    operation?: string;
    severity?: 'warning' | 'critical';
    retryCount?: number;
  } | null>({
    reducer: (prev, update) => update ?? prev,
  }),

  // Retry tracking
  retryCount: Annotation<number>({
    reducer: (prev, update) => (update ?? 0) + (prev ?? 0),
  }),
});

/**
 * CreateGraph - Executive Assistant LangGraph Implementation
 *
 * This class creates a graph-based workflow for processing meeting transcripts
 * and executing tasks like document creation/updates, ticket management, and
 * communication drafting based on the content.
 */
export class CreateGraph {
  private graph: StateGraph<typeof TeamMindState.State>;
  private readonly supabase: SupabaseClient<Database>;
  private readonly actionService = new CreateExecutionService();
  private readonly ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  });

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
    this.graph = this.buildGraph();
  }

  /**
   * Handles and logs errors
   */
  private logError = (state: typeof TeamMindState.State) => {
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
   * Central error handler
   */
  private handleError = (state: typeof TeamMindState.State) => {
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
          },
    };
  };

  /**
   * Determines if operation should be retried
   */
  private shouldRetry = (state: typeof TeamMindState.State): string => {
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
  private retryRouter = (state: typeof TeamMindState.State): string => {
    const { error } = state;

    switch (error?.operation) {
      case 'document_search':
        return 'documentSearchTool';
      case 'ticket_search':
        return 'ticketSearchTool';
      case 'document_content_generation':
        return 'docContentGenerationTool';
      case 'confluence_integration':
        return 'confluenceAgentTool';
      case 'jira_integration':
        return 'jiraAgentTool';
      case 'notion_integration':
        return 'notionAgentTool';
      case 'document_create_or_update_decision':
        return 'docActionDecisionTool';
      case 'ticket_create_decision':
        return 'ticketGenerationTool';
      case 'save_document_action':
        return 'docSaveActionTool';
      case 'save_ticket_action':
        return 'ticketSaveActionTool';
      default:
        return END;
    }
  };

  /**
   * Prepares for retry operation
   */
  private retryOperation = (state: typeof TeamMindState.State) => {
    return {
      ...state,
      error: null, // Clear the error for retry
    };
  };

  /**
   * Builds the main workflow graph
   */
  private buildGraph(): StateGraph<typeof TeamMindState.State> {
    // Create tool nodes
    // Common tools
    const retrieveUserConfig = createRetrieveUserConfigTool(this.supabase);
    const summarizeTranscript = createTranscriptSummarizerTool(
      this.ai,
      this.supabase,
    );
    const taskDecision = createTaskDecisionTool(this.ai);

    // Create separate search tools for document and ticket searches
    const documentSearchTool = createVectorSearchTool(
      this.supabase,
      'document',
    );
    const ticketSearchTool = createVectorSearchTool(this.supabase, 'ticket');

    // Document tools
    const docQueryTool = createDocQueryTool(this.ai);
    const docActionDecisionTool = createDocActionDecisionTool(this.ai);
    const docContentGenerationTool = createDocContentGenerationTool(
      this.supabase,
      this.ai,
    );
    const docIntegrationDecisionTool = createDocIntegrationDecissionTool();
    const docSaveActionTool = createDocSaveActionTool(this.supabase);

    // Ticket tools
    const ticketQueryTool = createTicketQueryTool(this.ai);
    const ticketGenerationTool = createTicketGenerationTool(this.ai);
    const ticketIntegrationDecisionTool = createTicketIntegrationDecisionTool();
    const ticketSaveActionTool = createTicketSaveActionTool(this.supabase);

    // Integration tools - Pass the Supabase client to the agent tools
    const confluenceAgentTool = createConfluenceAgentTool(
      this.actionService,
      this.supabase,
    );
    const jiraAgentTool = createJiraAgentTool(
      this.actionService,
      this.supabase,
    );
    const notionAgentTool = createNotionAgentTool(
      this.actionService,
      this.supabase,
    );
    const googleDocsAgentTool = createGoogleDocsAgentTool(
      this.actionService,
      this.supabase,
    );

    // Initialize the graph with chained method calls
    return (
      new StateGraph(TeamMindState)
        // Add core workflow nodes
        .addNode('retrieveUserConfig', retrieveUserConfig)
        .addNode('summarizeTranscript', summarizeTranscript)
        .addNode('taskDecision', taskDecision)

        // Add search tools (separate instances)
        .addNode('documentSearchTool', documentSearchTool)
        .addNode('ticketSearchTool', ticketSearchTool)

        // Add document workflow nodes
        .addNode('docQueryTool', docQueryTool)
        .addNode('docActionDecisionTool', docActionDecisionTool)
        .addNode('docContentGenerationTool', docContentGenerationTool)
        .addNode('docIntegrationRouter', docIntegrationDecisionTool)
        .addNode('docSaveActionTool', docSaveActionTool)

        // Remove finalize tools
        // .addNode('docFinalizeTool', docFinalizeTool)

        // Add ticket workflow nodes
        .addNode('ticketQueryTool', ticketQueryTool)
        .addNode('ticketGenerationTool', ticketGenerationTool)
        .addNode('ticketIntegrationRouter', ticketIntegrationDecisionTool)
        .addNode('ticketSaveActionTool', ticketSaveActionTool)

        // Remove finalize tools
        // .addNode('ticketFinalizeTool', ticketFinalizeTool)

        // Add integration tools
        .addNode('confluenceAgentTool', confluenceAgentTool)
        .addNode('jiraAgentTool', jiraAgentTool)
        .addNode('notionAgentTool', notionAgentTool)
        .addNode('googleDocsAgentTool', googleDocsAgentTool)

        // Add error handling nodes
        .addNode('handleError', this.handleError)
        .addNode('logError', this.logError)
        .addNode('retryNode', this.retryOperation)

        // Start with parallel execution
        .addEdge(START, 'retrieveUserConfig')
        .addEdge(START, 'summarizeTranscript')

        // Join parallel paths
        .addEdge('retrieveUserConfig', 'taskDecision')
        .addEdge('summarizeTranscript', 'taskDecision')

        // Route based on task decisions with map-reduce pattern
        .addConditionalEdges('taskDecision', taskDecisionRouterParallel, [
          'docQueryTool',
          'ticketQueryTool',
          END,
        ])

        // Document workflow path
        .addEdge('docQueryTool', 'documentSearchTool')
        .addEdge('documentSearchTool', 'docActionDecisionTool')
        .addEdge('docActionDecisionTool', 'docContentGenerationTool')
        .addEdge('docContentGenerationTool', 'docIntegrationRouter')

        // Ticket workflow path
        .addEdge('ticketQueryTool', 'ticketSearchTool')
        .addEdge('ticketSearchTool', 'ticketGenerationTool')
        .addEdge('ticketGenerationTool', 'ticketIntegrationRouter')

        // Route to document integration tools
        .addConditionalEdges('docIntegrationRouter', docIntegrationRouter, [
          'confluenceAgentTool', // Direct execution path for Confluence
          'notionAgentTool', // Direct execution path for Notion
          'googleDocsAgentTool', // Direct execution path for Google Docs
          'docSaveActionTool', // Save for review path
          END, // Skip path
          'handleError',
        ])

        // Route to ticket integration tools
        .addConditionalEdges(
          'ticketIntegrationRouter',
          ticketIntegrationRouter,
          [
            'jiraAgentTool', // Direct execution path
            'ticketSaveActionTool', // Save for review path
            END, // Skip path
            'handleError',
          ],
        )

        // Connect document integration to finalization
        .addEdge('docSaveActionTool', END)
        .addEdge('confluenceAgentTool', END)
        .addEdge('notionAgentTool', END)
        .addEdge('googleDocsAgentTool', END)

        // Connect ticket integration to finalization
        .addEdge('ticketSaveActionTool', END)
        .addEdge('jiraAgentTool', END)

        // Error handling flow
        .addEdge('handleError', 'logError')
        .addConditionalEdges('logError', this.shouldRetry, ['retryNode', END])

        // Retry routing
        .addConditionalEdges('retryNode', this.retryRouter, [
          'docQueryTool',
          'documentSearchTool',
          'ticketSearchTool',
          'docActionDecisionTool',
          'docContentGenerationTool',
          'ticketGenerationTool',
          'confluenceAgentTool',
          'notionAgentTool',
          'jiraAgentTool',
          'docSaveActionTool',
          'ticketSaveActionTool',
          END,
        ]) as StateGraph<typeof TeamMindState.State>
    );
  }

  /**
   * Invokes the graph with input data and returns the final state
   */
  public async invoke(input: {
    userId: string;
    transcript: Transcript;
    meetingId: string;
  }) {
    const compiled = this.graph.compile();
    return compiled.invoke(input);
  }

  /**
   * Draws the graph as Mermaid diagram for visualization/debugging
   */
  public async drawGraph() {
    const compiled = this.graph.compile();
    const graph = await compiled.getGraphAsync();
    return graph.drawMermaid();
  }
}
