import { logger, schedules } from '@trigger.dev/sdk/v3';

import { MicrosoftApi } from '@tm/ai/integrations/microsoft';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

export const cronRefreshMicrosoftTokens = schedules.task({
  id: 'cron-refresh-microsoft-tokens',
  cron: '0 */4 * * *', // Run every 4 hours
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000, // 1 minute
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  // Set a max duration of 10 minutes
  maxDuration: 600,
  run: async (payload) => {
    try {
      const supabase = getSupabaseServerClient({ admin: true });
      const now = new Date();

      logger.info('Starting Microsoft token refresh', {
        timestamp: payload.timestamp,
      });

      // Get tokens expiring in the next hour
      const { data: configs, error } = await supabase
        .from('microsoft_config')
        .select('*')
        .lt(
          'access_token_expires_at',
          new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes
        )
        .gt('refresh_token_expires_at', now.toISOString()) // Refresh token still valid
        .gt('refresh_token_inactivity_expires_at', now.toISOString()); // Not inactive

      if (error) {
        logger.error('Error fetching tokens to refresh', { error });
        throw error;
      }

      if (!configs || configs.length === 0) {
        logger.info('No tokens requiring refresh');
        return { status: 'success', message: 'No tokens to refresh' };
      }

      logger.info('Found tokens to refresh', { count: configs.length });

      // Refresh each token
      const results = await Promise.all(
        configs.map(async (config) => {
          try {
            logger.info('Refreshing token', { configId: config.id });

            // Exchange refresh token for new access token
            const msApi = new MicrosoftApi(
              config.access_token,
              config.refresh_token,
            );
            const tokenData = await msApi.refreshAccessToken(
              config.refresh_token,
            );
            // Calculate new expiration dates
            const accessTokenExpiresAt = new Date(
              Math.floor(now.getTime() + tokenData.expires_in * 1000),
            );

            const refreshTokenInactivityExpiresAt = new Date(
              Math.floor(now.getTime() + 24 * 60 * 60 * 1000), // Reset 24 hours inactivity timer
            );

            // Update tokens in database
            const { error: updateError } = await supabase
              .from('microsoft_config')
              .update({
                access_token: tokenData.access_token,
                access_token_expires_at: accessTokenExpiresAt.toISOString(),
                refresh_token: tokenData.refresh_token, // Update with new refresh token (rotating refresh tokens)
                refresh_token_inactivity_expires_at:
                  refreshTokenInactivityExpiresAt.toISOString(),
              })
              .eq('id', config.id);

            if (updateError) {
              throw updateError;
            }

            logger.info('Successfully refreshed token', {
              configId: config.id,
            });

            return {
              id: config.id,
              status: 'success',
            };
          } catch (error) {
            logger.error('Error refreshing token', {
              configId: config.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
              id: config.id,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }),
      );

      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      logger.info('Token refresh complete', { successCount, errorCount });

      return {
        status: 'success',
        message: 'Token refresh complete',
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: errorCount,
        },
      };
    } catch (error) {
      logger.error('Error in token refresh schedule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});
