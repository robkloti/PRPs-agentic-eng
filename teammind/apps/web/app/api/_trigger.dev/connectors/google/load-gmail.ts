import { logger, task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { GmailLoader } from '@tm/ai/integrations/google';

// Input validation schema
const loadGmailInputSchema = z.object({
  userId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  userEmail: z.string(),
});

export const loadGmail = task({
  id: 'load-gmail',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000, // 1 minute
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  maxDuration: 3600, // 30 minutes
  run: async (payload: unknown) => {
    const parsedPayload = loadGmailInputSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid payload for loadGmail', {
        error: parsedPayload.error,
        payload,
      });
      throw new Error('Invalid payload');
    }
    
    const { userId, accessToken, refreshToken, userEmail } = parsedPayload.data;
    const supabase = getSupabaseServerClient({ admin: true });

    try {
      logger.info('Starting Gmail email load', {
        userId,
        userEmail,
      });

      // Set syncing flag to true
      await supabase
        .from('google_config')
        .update({ is_syncing: true })
        .eq('user_id', userId);

      // Load emails
      const loader = new GmailLoader({
        userId,
        accessToken,
        refreshToken,
        supabase,
        userEmail,
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

      logger.info('Completed Gmail email load', {
        userId,
      });

      return {
        success: true,
        message: 'Successfully loaded Gmail emails',
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
        logger.error('Failed to reset syncing flag for Gmail', {
          userId,
          error:
            resetError instanceof Error ? resetError.message : 'Unknown error',
        });
      }

      logger.error('Failed to load Gmail emails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      throw error;
    }
  },
  handleError: async (payload) => {
    const parsedPayload = loadGmailInputSchema.safeParse(payload);
    if (!parsedPayload.success) {
      logger.error('Invalid payload for loadGmail', {
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

      logger.info('Reset syncing flag in handleError for Gmail', { userId });
    } catch (resetError) {
      logger.error('Failed to reset syncing flag in handleError for Gmail', {
        userId,
        error:
          resetError instanceof Error ? resetError.message : 'Unknown error',
      });
    }
  },
});