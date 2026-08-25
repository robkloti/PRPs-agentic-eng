import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import {
  AtlassianConfig,
  DocumentAction,
  DocumentSource,
  GoogleDriveConfig,
  NotionConfig,
  TicketAction,
} from '../../types';
import {
  ConfluenceCreateResult,
  ConfluenceExecutor,
} from '../atlassian/confluence';
import {
  JiraCreateResult,
  JiraExecutor,
} from '../atlassian/jira/jira-create-executor';
import {
  GoogleDocsCreateResult,
  GoogleDocsExecutor,
} from '../google/gdocs/google-docs-create-executor';
import { NotionCreateResult, NotionExecutor } from '../notion';

/**
 * Common result interface for all execution operations
 * With a generic parameter for contentBefor
 */
export interface CreateExecutionResult {
  id: string;
  title: string;
  url: string;
  contentBefore?: string;
}

/**
 * Base interface for all action executors
 * Using a cleaner approach with 3 type parameters
 */
export interface CreateActionExecutor<
  TConfig,
  TData,
  TResult extends CreateExecutionResult = CreateExecutionResult,
> {
  execute(actionData: TData, config: TConfig, userId: string): Promise<TResult>;
}

type SourceResult =
  | ConfluenceCreateResult
  | JiraCreateResult
  | NotionCreateResult
  | GoogleDocsCreateResult;

type SourceConfig = AtlassianConfig | NotionConfig | GoogleDriveConfig;

type ActionData = DocumentAction | TicketAction;
type CreateActionType =
  Database['public']['Enums']['document_update_action_type'];
type ExecutorKey = `${DocumentSource}:${CreateActionType}`;

// Type guards
function isAtlassianConfig(config: SourceConfig): config is AtlassianConfig {
  return 'cloudId' in config && 'baseUrl' in config;
}

function isNotionConfig(config: SourceConfig): config is NotionConfig {
  return 'workspaceId' in config;
}

function isGoogleConfig(config: SourceConfig): config is GoogleDriveConfig {
  return (
    'accessToken' in config &&
    'refreshToken' in config &&
    'selectedFolders' in config
  );
}

/**
 * Service to handle document action execution
 */
export class CreateExecutionService {
  private executors: Map<
    ExecutorKey,
    CreateActionExecutor<SourceConfig, ActionData, SourceResult>
  >;

  constructor() {
    this.executors = new Map();

    // Automatically register executors when service is created
    this.registerExecutors();
  }

  /**
   * Register all supported executors
   */
  private registerExecutors(): void {
    // Register Confluence executors
    this.registerExecutor<
      AtlassianConfig,
      DocumentAction,
      ConfluenceCreateResult
    >(
      'confluence',
      'document_create',
      new ConfluenceExecutor() as CreateActionExecutor<
        AtlassianConfig,
        DocumentAction,
        ConfluenceCreateResult
      >,
    );
    this.registerExecutor<
      AtlassianConfig,
      DocumentAction,
      ConfluenceCreateResult
    >(
      'confluence',
      'document_update',
      new ConfluenceExecutor() as CreateActionExecutor<
        AtlassianConfig,
        DocumentAction,
        ConfluenceCreateResult
      >,
    );

    // Register Jira executors
    this.registerExecutor<AtlassianConfig, TicketAction, JiraCreateResult>(
      'jira',
      'ticket_create',
      new JiraExecutor() as CreateActionExecutor<
        AtlassianConfig,
        TicketAction,
        JiraCreateResult
      >,
    );

    // Register Notion executors
    this.registerExecutor<NotionConfig, DocumentAction, NotionCreateResult>(
      'notion',
      'document_create',
      new NotionExecutor() as CreateActionExecutor<
        NotionConfig,
        DocumentAction,
        NotionCreateResult
      >,
    );
    this.registerExecutor<NotionConfig, DocumentAction, NotionCreateResult>(
      'notion',
      'document_update',
      new NotionExecutor() as CreateActionExecutor<
        NotionConfig,
        DocumentAction,
        NotionCreateResult
      >,
    );

    // Register Google Docs executors
    this.registerExecutor<
      GoogleDriveConfig,
      DocumentAction,
      GoogleDocsCreateResult
    >(
      'google_drive',
      'document_create',
      new GoogleDocsExecutor() as CreateActionExecutor<
        GoogleDriveConfig,
        DocumentAction,
        GoogleDocsCreateResult
      >,
    );
    this.registerExecutor<
      GoogleDriveConfig,
      DocumentAction,
      GoogleDocsCreateResult
    >(
      'google_drive',
      'document_update',
      new GoogleDocsExecutor() as CreateActionExecutor<
        GoogleDriveConfig,
        DocumentAction,
        GoogleDocsCreateResult
      >,
    );
  }

  /**
   * Register an executor for a specific source and action type
   */
  public registerExecutor<
    TConfig extends SourceConfig,
    TData extends ActionData,
    TResult extends SourceResult,
  >(
    source: DocumentSource,
    actionType: CreateActionType,
    executor: CreateActionExecutor<TConfig, TData, TResult>,
  ): void {
    const key = this.getExecutorKey(source, actionType);
    this.executors.set(
      key,
      executor as CreateActionExecutor<SourceConfig, ActionData, SourceResult>,
    );
  }

  /**
   * Create a unique key for the executor map
   */
  private getExecutorKey(
    source: DocumentSource,
    actionType: CreateActionType,
  ): ExecutorKey {
    return `${source}:${actionType}`;
  }

  /**
   * Get the appropriate executor for a source and action type
   */
  private getExecutor<
    TConfig extends SourceConfig,
    TData extends ActionData,
    TResult extends SourceResult,
  >(
    source: DocumentSource,
    actionType: CreateActionType,
  ): CreateActionExecutor<TConfig, TData, TResult> {
    const key = this.getExecutorKey(source, actionType);
    const executor = this.executors.get(key);

    if (!executor) {
      throw new Error(
        `No executor registered for source: ${source} and action type: ${actionType}`,
      );
    }

    return executor as CreateActionExecutor<TConfig, TData, TResult>;
  }

  /**
   * Execute an action directly (used by agent tools)
   * Now supports explicit return type parameter
   */
  async executeActionDirectly<TResult extends SourceResult>(
    source: DocumentSource,
    actionType: CreateActionType,
    actionData: ActionData,
    config: SourceConfig,
    userId: string,
  ): Promise<TResult> {
    // Type matching based on source
    if (source === 'confluence') {
      if (!isAtlassianConfig(config)) {
        throw new Error(`Invalid configuration for ${source}`);
      }

      const executor = this.getExecutor<
        AtlassianConfig,
        DocumentAction,
        TResult
      >(source, actionType);
      return executor.execute(actionData as DocumentAction, config, userId);
    } else if (source === 'jira') {
      if (!isAtlassianConfig(config)) {
        throw new Error(`Invalid configuration for ${source}`);
      }
      const executor = this.getExecutor<AtlassianConfig, TicketAction, TResult>(
        source,
        actionType,
      );

      return executor.execute(actionData as TicketAction, config, userId);
    } else if (source === 'notion') {
      if (!isNotionConfig(config)) {
        throw new Error('Invalid configuration for Notion');
      }

      const executor = this.getExecutor<NotionConfig, DocumentAction, TResult>(
        source,
        actionType,
      );
      return executor.execute(actionData as DocumentAction, config, userId);
    } else if (source === 'google_drive') {
      if (!isGoogleConfig(config)) {
        throw new Error('Invalid configuration for Google Drive');
      }

      const executor = this.getExecutor<
        GoogleDriveConfig,
        DocumentAction,
        TResult
      >(source, actionType);
      return executor.execute(actionData as DocumentAction, config, userId);
    }

    throw new Error(`Unsupported source: ${source}`);
  }

  /**
   * Execute a pending action by ID from the database
   */
  async executeActionById<TResult extends SourceResult>(
    actionId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    result?: TResult;
  }> {
    const supabaseClient = getSupabaseServerClient({ admin: true });

    // Get the action using RLS
    const { data: action, error } = await supabaseClient
      .from('document_updates')
      .select('*')
      .eq('id', actionId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (error || !action?.action_type) {
      throw new Error('Action not found or already processed');
    }

    try {
      // Get the config for this source
      const config = await this.getSourceConfig(
        action.source,
        userId,
        supabaseClient,
      );

      // Build execution data from stored data
      const executionData = {
        ...(action.execution_data as Record<string, string | number | boolean>),
        title:
          (action.execution_data as { title?: string })?.title ?? action.title,
      } as ActionData;

      // Execute based on source type
      let result: TResult;

      if (action.source === 'confluence') {
        const executor = this.getExecutor<
          AtlassianConfig,
          DocumentAction,
          TResult
        >(action.source, action.action_type);
        result = await executor.execute(
          executionData as DocumentAction,
          config as AtlassianConfig,
          userId,
        );
      } else if (action.source === 'jira') {
        if (action.action_type === 'ticket_create') {
          const executor = this.getExecutor<
            AtlassianConfig,
            TicketAction,
            TResult
          >(action.source, action.action_type);
          result = await executor.execute(
            executionData as TicketAction,
            config as AtlassianConfig,
            userId,
          );
        } else {
          const executor = this.getExecutor<
            AtlassianConfig,
            DocumentAction,
            TResult
          >(action.source, action.action_type);
          result = await executor.execute(
            executionData as DocumentAction,
            config as AtlassianConfig,
            userId,
          );
        }
      } else if (action.source === 'notion') {
        const executor = this.getExecutor<
          NotionConfig,
          DocumentAction,
          TResult
        >(action.source, action.action_type);
        result = await executor.execute(
          executionData as DocumentAction,
          config as NotionConfig,
          userId,
        );
      } else if (action.source === 'google_drive') {
        const executor = this.getExecutor<
          GoogleDriveConfig,
          DocumentAction,
          TResult
        >(action.source, action.action_type);
        result = await executor.execute(
          executionData as DocumentAction,
          config as GoogleDriveConfig,
          userId,
        );
      } else {
        throw new Error(`Unsupported source: ${action.source}`);
      }

      // Mark the action as executed and save original content if available
      await supabaseClient
        .from('document_updates')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          url: result.url,
          source_id: result.id,
          content_before: result.contentBefore,
        })
        .eq('id', actionId)
        .eq('user_id', userId);

      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error('Error executing action:', error);
      throw error;
    }
  }

  /**
   * Get configuration for a specific source
   */
  private async getSourceConfig(
    source: DocumentSource,
    userId: string,
    supabase: SupabaseClient<Database>,
  ): Promise<SourceConfig> {
    if (source === 'confluence' || source === 'jira') {
      const { data: atlassianConfig, error } = await supabase
        .from('atlassian_config')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !atlassianConfig) {
        throw new Error(
          `Atlassian configuration not found for user: ${userId}`,
        );
      }

      return {
        cloudId: atlassianConfig.atlassian_cloud_id,
        accessToken: atlassianConfig.access_token,
        baseUrl: atlassianConfig.atlassian_base_url,
      } as AtlassianConfig;
    } else if (source === 'notion') {
      const { data: notionConfig, error } = await supabase
        .from('notion_config')
        .select(
          'access_token, bot_id, workspace_id, workspace_name, workspace_icon',
        )
        .eq('user_id', userId)
        .single();

      if (error || !notionConfig) {
        throw new Error(`Notion configuration not found for user: ${userId}`);
      }

      return {
        accessToken: notionConfig.access_token,
        botId: notionConfig.bot_id,
        workspaceId: notionConfig.workspace_id,
        workspaceName: notionConfig.workspace_name,
        workspaceIcon: notionConfig.workspace_icon,
      } as NotionConfig;
    } else if (source === 'google_drive') {
      const { data: googleConfig, error } = await supabase
        .from('google_config')
        .select('access_token, refresh_token, selected_folders')
        .eq('user_id', userId)
        .single();

      if (error || !googleConfig) {
        throw new Error(`Google configuration not found for user: ${userId}`);
      }

      return {
        accessToken: googleConfig.access_token,
        refreshToken: googleConfig.refresh_token,
        selectedFolders: googleConfig.selected_folders,
      };
    }

    throw new Error(`No configuration handler for source: ${source}`);
  }
}
