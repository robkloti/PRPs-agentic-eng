import { SupabaseClient } from '@supabase/supabase-js';

import { logger, task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { NotionLoader } from '@tm/ai/integrations/notion';
import { NotionWorkspace } from '@tm/ai/types';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Database } from '~/lib/database.types';

// Schema for webhook event
const webhookEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  workspace_id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  integration_id: z.string(),
  type: z.string(),
  authors: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
    }),
  ),
  entity: z.object({
    id: z.string(),
    type: z.string(),
  }),
  data: z.record(z.any()),
  attempt_number: z.number().optional(),
});

type NotionWebhookEvent = z.infer<typeof webhookEventSchema>;

export const processNotionWebhookEvent = task({
  id: 'process-notion-webhook-event',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 30000, // 30 seconds
    maxTimeoutInMs: 180000, // 3 minutes
    factor: 2,
  },
  maxDuration: 900, // 15 minutes
  run: async (payload: unknown) => {
    // Validate payload
    const parsedPayload = webhookEventSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid webhook event payload', {
        error: parsedPayload.error,
        payload,
      });
      throw new Error('Invalid webhook event payload');
    }

    const event = parsedPayload.data;
    const supabase = getSupabaseServerClient({ admin: true });

    try {
      // Extract event data
      const { type, entity, workspace_id } = event;
      const entityId = entity.id;
      const entityType = entity.type;

      logger.info('Processing Notion webhook event', {
        type,
        entityId,
        entityType,
        workspaceId: workspace_id,
      });

      // Find all users who have connected to this Notion workspace
      const { data: notionConfigs, error } = await supabase
        .from('notion_config')
        .select(
          'user_id, access_token, workspace_id, workspace_name, workspace_icon',
        )
        .eq('workspace_id', workspace_id);

      if (error) {
        logger.error('Error querying notion_config', { error });
        throw new Error(`Error querying notion_config: ${error.message}`);
      }

      if (!notionConfigs || notionConfigs.length === 0) {
        logger.info('No users have access to this Notion workspace', {
          workspaceId: workspace_id,
        });
        return {
          success: true,
          message: 'No users have access to this workspace',
        };
      }

      // Process the event for each user who has access to this workspace
      const results = [];
      for (const config of notionConfigs) {
        try {
          await processEventForUser(event, config, supabase);
          results.push({
            userId: config.user_id,
            success: true,
          });
        } catch (error) {
          logger.error('Error processing event for user', {
            userId: config.user_id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          results.push({
            userId: config.user_id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue processing for other users even if one fails
        }
      }

      logger.info('Notion webhook event processed successfully', {
        type,
        entityId,
        workspaceId: workspace_id,
        results,
      });

      return {
        success: true,
        message: 'Successfully processed Notion webhook event',
        results,
      };
    } catch (error) {
      logger.error('Error processing Notion webhook event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type,
        entityId: event.entity.id,
      });
      throw error;
    }
  },
});

/**
 * Process an event for a specific user
 */
async function processEventForUser(
  event: NotionWebhookEvent,
  config: {
    user_id: string;
    access_token: string;
    workspace_id: string;
    workspace_name: string | null;
    workspace_icon: string | null;
  },
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const {
    user_id,
    access_token,
    workspace_id,
    workspace_name,
    workspace_icon,
  } = config;
  const { type, entity } = event;
  const entityId = entity.id;
  const entityType = entity.type;

  // Create workspace object
  const workspace: NotionWorkspace = {
    id: workspace_id,
    name: workspace_name ?? 'Notion Workspace',
    icon: workspace_icon ?? undefined,
  };

  // Initialize NotionLoader
  const loader = new NotionLoader({
    userId: user_id,
    accessToken: access_token,
    selectedWorkspaces: workspace,
    supabase,
  });

  // Handle the event based on type
  switch (type) {
    // Page events
    case 'page.created':
    case 'page.content_updated':
    case 'page.properties_updated':
    case 'page.moved':
    case 'page.undeleted':
    case 'page.unlocked':
      // For all these events, we want to update the page content
      await loader.handlePageUpdate(entityId);
      break;

    case 'page.deleted':
      // Remove the page from our system
      await loader.handleEntityDeletion(entityId, 'page');
      break;

    // Database events
    case 'database.created':
    case 'database.content_updated':
    case 'database.schema_updated':
    case 'database.moved':
    case 'database.undeleted':
      // For all these events, we want to update the database content
      await loader.handleDatabaseUpdate(entityId);
      break;

    case 'database.deleted':
      // Remove the database from our system
      await loader.handleEntityDeletion(entityId, 'database');
      break;

    // Ignore other events
    default:
      logger.info('Ignoring unhandled event type', {
        type,
        entityId,
        entityType,
      });
      break;
  }
}
