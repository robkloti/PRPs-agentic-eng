import { logger, task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { SharePointLoader } from '@tm/ai/integrations/microsoft';
import { MicrosoftSiteMetaData } from '@tm/ai/types';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

// Input validation schema
const loadDocsInputSchema = z.object({
  userId: z.string(),
  accountId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  selectedSites: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      displayName: z.string(),
      webUrl: z.string(),
    }),
  ),
});

export const loadSharePointDocs = task({
  id: 'load-sharepoint-docs',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000, // 1 minute
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  maxDuration: 3600,
  run: async (payload: unknown) => {
    const parsedPayload = loadDocsInputSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid payload for loadSharePointDocs', {
        error: parsedPayload.error,
        payload,
      });
      throw new Error('Invalid payload');
    }
    const { userId, accountId, accessToken, refreshToken, selectedSites } =
      parsedPayload.data;
    const supabase = getSupabaseServerClient({ admin: true });

    try {
      logger.info('Starting SharePoint document load', {
        userId,
        accountId,
      });

      // Set syncing flag to true
      await supabase
        .from('microsoft_config')
        .update({ is_syncing: true })
        .eq('user_id', userId);

      // Load documents
      const loader = new SharePointLoader({
        userId,
        accessToken,
        refreshToken,
        supabase,
        selectedSites: selectedSites as MicrosoftSiteMetaData[],
      });

      await loader.load();

      // Update sync status
      await supabase
        .from('microsoft_config')
        .update({
          is_syncing: false,
          last_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      logger.info('Completed SharePoint document load', {
        userId,
        accountId,
      });

      return {
        success: true,
        message: 'Successfully loaded SharePoint documents',
      };
    } catch (error) {
      // Ensure we reset the syncing flag even if there's an error
      try {
        await supabase
          .from('microsoft_config')
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

      logger.error('Failed to load SharePoint documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        accountId,
      });

      throw error;
    }
  },
  handleError: async (payload) => {
    const parsedPayload = loadDocsInputSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid payload for loadSharePointDocs', {
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
        .from('microsoft_config')
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
