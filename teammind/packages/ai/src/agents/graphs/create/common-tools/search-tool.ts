import type { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import {
  GroupedSearchResultItem,
  HierachicalSearchParams,
  HierarchicalRetriever,
  RetrieverArgs,
} from '../../../../storage';
import { DocumentSource } from '../../../../types';
import { TeamMindState } from '../create-graph';

/**
 * Vector search tool that supports different search types through configuration
 *
 * @param supabaseClient - Initialized Supabase client
 * @param searchType - Type of search ('document' or 'ticket')
 * @param retrieverConfig - Optional configuration for the retriever
 * @returns A function that performs vector search and updates the state
 */
export const createVectorSearchTool = (
  supabaseClient: SupabaseClient<Database>,
  searchType: 'document' | 'ticket',
  retrieverConfig: Omit<RetrieverArgs, 'client'> = {},
) => {
  // Initialize the retriever
  const retriever = new HierarchicalRetriever({
    client: supabaseClient,
    ...retrieverConfig,
  });

  // Return the search function
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { userConfig, userPreferences } = state;

    // Get the appropriate query and hyde document based on search type
    const queryText =
      searchType === 'document'
        ? state.documentQueryText
        : state.ticketQueryText;

    const hydeDocument =
      searchType === 'document' ? state.documentHyde : state.ticketHyde;

    // Determine source based on search type and user preferences
    const source = determineSourceConnector(
      searchType,
      userConfig.availableConnectors,
      userPreferences,
    );

    if (!queryText || !hydeDocument || !source || !userConfig) {
      console.error(`Missing required parameters for ${searchType} search`);
      return {
        ...state,
        error: {
          message: `Missing required parameters for ${searchType} search`,
          timestamp: new Date().toISOString(),
          operation: 'search',
        },
      };
    }

    // Build metadata filters for document sources - flexible approach
    // Now compatible with multi-source searches
    const metadataFilter =
      searchType === 'document'
        ? {
            // Notion-specific filter - will be skipped for docs without this property
            is_database: false,
            // Google Drive-specific filter - will be skipped for docs without this property
            mime_type: 'application/vnd.google-apps.document',
          }
        : undefined;

    // Prepare search parameters
    const searchParams: HierachicalSearchParams = {
      target_user_id: userConfig.userId,
      source,
      ...(searchType === 'ticket' && {
        start_date: new Date(
          new Date().setMonth(new Date().getMonth() - 3),
        ).toISOString(), // Search tickets from the last 3 months
      }),
      ...(metadataFilter && {
        metadataFilter,
        // When false: documents without the metadata property will be included
        strictMetadataMatching: false,
      }),
    };

    try {
      // Perform the hierarchical search
      const searchResults: GroupedSearchResultItem[] =
        await retriever.hierarchicalSearch(
          queryText,
          hydeDocument,
          searchParams,
        );

      // Update state with search results
      if (searchType === 'document') {
        return {
          ...state,
          documentSearchResults: searchResults,
        };
      } else {
        return {
          ...state,
          ticketSearchResults: searchResults,
        };
      }
    } catch (error) {
      console.error(`Error in vector search for ${searchType}:`, error);

      // Return state with empty results and error
      return {
        ...state,
        [searchType === 'document'
          ? 'documentSearchResults'
          : 'ticketSearchResults']: [],
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown search error',
          timestamp: new Date().toISOString(),
          operation: `${searchType}_search`,
        },
      };
    }
  };
};

/**
 * Helper function to determine the appropriate connector for the search type
 * Takes user preferences into account for preferred sources
 */
function determineSourceConnector(
  searchType: 'document' | 'ticket',
  availableConnectors: DocumentSource[],
  userPreferences?: {
    document_generation_enabled?: boolean;
    ticket_generation_enabled?: boolean;
    document_auto_update?: boolean;
    ticket_auto_update?: boolean;
    preferred_document_source?: DocumentSource | null;
    preferred_ticket_source?: DocumentSource | null;
  } | null,
): DocumentSource | undefined {
  // Check for preferred source in user preferences first
  if (userPreferences) {
    if (
      searchType === 'document' &&
      userPreferences.preferred_document_source &&
      availableConnectors.includes(userPreferences.preferred_document_source)
    ) {
      console.log(
        `Using preferred document source: ${userPreferences.preferred_document_source}`,
      );
      return userPreferences.preferred_document_source;
    }

    if (
      searchType === 'ticket' &&
      userPreferences.preferred_ticket_source &&
      availableConnectors.includes(userPreferences.preferred_ticket_source)
    ) {
      console.log(
        `Using preferred ticket source: ${userPreferences.preferred_ticket_source}`,
      );
      return userPreferences.preferred_ticket_source;
    }
  }

  // Fall back to default logic if no preferred source or if preferred source is not available
  if (searchType === 'document') {
    // TODO add more document connectors as needed
    // Document connectors in order of preference
    const documentConnectors: DocumentSource[] = [
      'confluence',
      'notion',
      'google_drive',
      'sharepoint',
    ];
    return documentConnectors.find((conn) =>
      availableConnectors.includes(conn),
    ) as DocumentSource;
  } else {
    // Ticket connectors in order of preference
    const ticketConnectors: DocumentSource[] = ['jira'];
    return ticketConnectors.find((conn) =>
      availableConnectors.includes(conn),
    ) as DocumentSource;
  }
}
