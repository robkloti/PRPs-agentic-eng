import { SupabaseClient } from '@supabase/supabase-js';

import { Database, Json } from '@tm/supabase/database';

import {
  AtlassianConfig,
  ConfluenceSite,
  DocumentSource,
  GoogleDriveConfig,
  JiraSite,
  NotionConfig,
} from '../../../../types';
import { TeamMindState } from '../create-graph';

// Unified credentials map type - use the appropriate type for each source
export type SourceCredentialsMap = {
  confluence: AtlassianConfig;
  jira: AtlassianConfig;
  notion: NotionConfig;
  google_drive: GoogleDriveConfig;
};

export interface UserConfig {
  userId: string;
  availableConnectors: DocumentSource[];
  credentials: Partial<SourceCredentialsMap>;
}

/**
 * Tool that retrieves user configuration from the database
 *
 * @param supabaseClient - Initialized Supabase client
 * @returns A function that retrieves user configuration and updates the state
 */
export const createRetrieveUserConfigTool = (
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { userId } = state;

    if (!userId) {
      console.error('User ID is required for retrieveUserConfig node');
      return state;
    }

    try {
      // Initialize an empty credentials map with proper typing
      const credentials: Partial<SourceCredentialsMap> = {};
      const availableConnectors: DocumentSource[] = [];

      // Query the user's Atlassian configuration
      const { data: atlassianConfig, error: atlassianError } =
        await supabaseClient
          .from('atlassian_config')
          .select(
            'access_token, atlassian_cloud_id, atlassian_base_url, selected_confluence_spaces, selected_jira_boards',
          )
          .eq('user_id', userId)
          .single();

      const { data: notionConfig, error: notionError } = await supabaseClient
        .from('notion_config')
        .select(
          'access_token, bot_id, workspace_id, workspace_name, workspace_icon',
        )
        .eq('user_id', userId)
        .single();

      const { data: googleConfig, error: googleError } = await supabaseClient
        .from('google_config')
        .select('access_token, refresh_token, selected_folders')
        .eq('user_id', userId)
        .single();

      if (!atlassianError && atlassianConfig) {
        // Check Confluence availability
        if (
          atlassianConfig.atlassian_cloud_id &&
          atlassianConfig.atlassian_base_url &&
          (atlassianConfig.selected_confluence_spaces as [])?.length
        ) {
          availableConnectors.push('confluence');
          credentials.confluence = {
            cloudId: atlassianConfig.atlassian_cloud_id,
            baseUrl: atlassianConfig.atlassian_base_url,
            accessToken: atlassianConfig.access_token,
            selectedSpacesOrBoards:
              atlassianConfig.selected_confluence_spaces as unknown as ConfluenceSite[],
          };
        }

        // Check Jira availability
        if (
          atlassianConfig.atlassian_cloud_id &&
          atlassianConfig.atlassian_base_url &&
          (atlassianConfig.selected_jira_boards as [])?.length
        ) {
          availableConnectors.push('jira');
          credentials.jira = {
            cloudId: atlassianConfig.atlassian_cloud_id,
            baseUrl: atlassianConfig.atlassian_base_url,
            accessToken: atlassianConfig.access_token,
            selectedSpacesOrBoards:
              atlassianConfig.selected_jira_boards as unknown as JiraSite[],
          };
        }
      } else if (atlassianError && atlassianError.code !== 'PGRST116') {
        console.error(
          'Error retrieving Atlassian configuration:',
          atlassianError,
        );
      }

      if (!notionError && notionConfig) {
        availableConnectors.push('notion');
        credentials.notion = {
          accessToken: notionConfig.access_token,
          workspaceId: notionConfig.workspace_id,
        };
      } else if (notionError && notionError.code !== 'PGRST116') {
        console.error('Error retrieving Notion configuration:', notionError);
      }

      if (!googleError && googleConfig) {
        availableConnectors.push('google_drive');
        credentials.google_drive = {
          accessToken: googleConfig.access_token,
          refreshToken: googleConfig.refresh_token,
          selectedFolders: googleConfig.selected_folders as unknown as Json,
        };
      } else if (googleError && googleError.code !== 'PGRST116') {
        console.error(
          'Error retrieving Google Drive configuration:',
          googleError,
        );
      }

      // Fetch user preferences
      const { data: preferences, error: preferencesError } =
        await supabaseClient
          .from('update_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('Error retrieving user preferences:', preferencesError);
      }

      const userConfig = {
        userId,
        availableConnectors,
        credentials,
      };

      return {
        ...state,
        userConfig,
        userPreferences: preferences ?? {
          document_generation_enabled: true,
          ticket_generation_enabled: true,
          document_auto_update: false,
          ticket_auto_update: false,
          preferred_document_source: null,
          preferred_ticket_source: null,
        },
      };
    } catch (error) {
      console.error('Error in retrieveUserConfig node:', error);

      // Return empty configuration when there's an error
      return {
        ...state,
        userConfig: {
          userId,
          availableConnectors: [],
          credentials: {},
        },
        userPreferences: {
          document_generation_enabled: true,
          ticket_generation_enabled: true,
          document_auto_update: false,
          ticket_auto_update: false,
          preferred_document_source: null,
          preferred_ticket_source: null,
        },
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown configuration error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  };
};
