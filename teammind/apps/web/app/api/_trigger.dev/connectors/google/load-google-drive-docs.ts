import { logger, task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { GoogleDriveLoader } from '@tm/ai/integrations/google';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

// Input validation schema
const loadDocsInputSchema = z.object({
  userId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  selectedFolders: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      path: z.string().optional(),
    }),
  ),
});

export const loadGoogleDriveDocs = task({
  id: 'load-google-drive-docs',
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
      logger.error('Invalid payload for loadGoogleDriveDocs', {
        error: parsedPayload.error,
        payload,
      });
      throw new Error('Invalid payload');
    }
    const { userId, accessToken, refreshToken, selectedFolders } =
      parsedPayload.data;
    const supabase = getSupabaseServerClient({ admin: true });

    try {
      logger.info('Starting Google Drive document load', {
        userId,
        folderCount: selectedFolders.length,
      });

      // Set syncing flag to true
      await supabase
        .from('google_config')
        .update({ is_syncing: true })
        .eq('user_id', userId);

      // Load documents
      const loader = new GoogleDriveLoader({
        userId,
        accessToken,
        refreshToken,
        supabase,
        selectedFolders,
      });

      await loader.load();

      // Update sync status
      await supabase
        .from('google_config')
        .update({
          is_syncing: false,
          last_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      logger.info('Completed Google Drive document load', {
        userId,
        folderCount: selectedFolders.length,
      });

      return {
        success: true,
        message: 'Successfully loaded Google Drive documents',
      };
    } catch (error) {
      // Ensure we reset the syncing flag even if there's an error
      try {
        await supabase
          .from('google_config')
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

      logger.error('Failed to load Google Drive documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      throw error;
    }
  },
  handleError: async (payload) => {
    const parsedPayload = loadDocsInputSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid payload for loadGoogleDriveDocs', {
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
        .from('google_config')
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
