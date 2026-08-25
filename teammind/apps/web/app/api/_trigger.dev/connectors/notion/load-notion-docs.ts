import { logger, task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { NotionLoader } from '@tm/ai/integrations/notion';
import { NotionWorkspace } from '@tm/ai/types';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

// Input validation schema
const loadNotionDataInputSchema = z.object({
  userId: z.string(),
  accessToken: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string().optional(),
  workspaceIcon: z.string().optional(),
  checkPermissionChanges: z.boolean().optional(),
});

export const loadNotionData = task({
  id: 'load-notion-data',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000, // 1 minute
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  maxDuration: 3600,
  run: async (payload: unknown) => {
    const parsedPayload = loadNotionDataInputSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid payload for loadNotionData', {
        error: parsedPayload.error,
        payload,
      });
      throw new Error('Invalid payload');
    }

    const {
      userId,
      accessToken,
      workspaceId,
      workspaceName,
      workspaceIcon,
      checkPermissionChanges,
    } = parsedPayload.data;

    const supabase = getSupabaseServerClient({ admin: true });

    try {
      logger.info('Starting Notion data load', {
        userId,
        workspaceId,
        checkingPermissions: checkPermissionChanges,
      });

      // Set syncing flag to true
      await supabase
        .from('notion_config')
        .update({ is_syncing: true })
        .eq('user_id', userId);

      // Build workspace object
      const selectedWorkspace: NotionWorkspace = {
        id: workspaceId,
        name: workspaceName ?? 'Notion Workspace',
        icon: workspaceIcon,
      };

      // Load documents
      const loader = new NotionLoader({
        userId,
        accessToken,
        selectedWorkspaces: selectedWorkspace,
        supabase,
      });

      // Pass the checkPermissionChanges option to the load method
      await loader.load({ checkPermissionChanges });

      // Update sync status
      await supabase
        .from('notion_config')
        .update({
          is_syncing: false,
          last_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      logger.info('Completed Notion data load', {
        userId,
        workspaceId,
      });

      return {
        success: true,
        message: 'Successfully loaded Notion data',
      };
    } catch (error) {
      // Ensure we reset the syncing flag even if there's an error
      try {
        await supabase
          .from('notion_config')
          .update({ is_syncing: false })
          .eq('user_id', userId);
      } catch (resetError) {
        // Log if we can't reset the flag
        logger.error('Failed to reset syncing flag', {
          userId,
          error:
            resetError instanceof Error ? resetError.message : 'Unknown error',
        });
      }

      logger.error('Failed to load Notion data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        workspaceId,
      });

      throw error;
    }
  },
  handleError: async (payload) => {
    const parsedPayload = loadNotionDataInputSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid payload for loadNotionData', {
        error: parsedPayload.error,
        payload,
      });
      throw new Error('Invalid payload');
    }
    const { userId } = parsedPayload.data;
    const supabase = getSupabaseServerClient({ admin: true });

    // Final safety net - ensure syncing flag is reset if task fails
    try {
      await supabase
        .from('notion_config')
        .update({ is_syncing: false })
        .eq('user_id', userId);

      logger.info('Reset syncing flag in handleError', { userId });
    } catch (resetError) {
      logger.error('Failed to reset syncing flag in handleError', {
        userId,
        error:
          resetError instanceof Error ? resetError.message : 'Unknown error',
      });
    }
  },
});
