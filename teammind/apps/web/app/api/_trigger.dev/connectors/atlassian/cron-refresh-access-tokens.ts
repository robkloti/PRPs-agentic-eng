import { logger, schedules } from '@trigger.dev/sdk/v3';

import { refreshAtlassianToken } from '@tm/ai/integrations/atlassian';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

export const cronRefreshAtlassianTokens = schedules.task({
  id: 'cron-refresh-atlassian-tokens',
  cron: '0 */4 * * *', // Run every 4 hours
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000, // 1 minute
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  maxDuration: 600,
  run: async (payload) => {
    try {
      const supabase = getSupabaseServerClient({ admin: true });
      const now = new Date();

      logger.info('Starting scheduled Atlassian token refresh', {
        timestamp: payload.timestamp,
      });

      // Get tokens expiring in the next 4 hours
      const { data: configs, error } = await supabase
        .from('atlassian_config')
        .select('*')
        .lt(
          'access_token_expires_at',
          new Date(now.getTime() + 240 * 60 * 1000).toISOString(), // 4 hours
        )
        .gt('refresh_token_expires_at', now.toISOString()) // Refresh token still valid
        .gt('refresh_token_inactivity_expires_at', now.toISOString()); // Not inactive

      if (error) {
        logger.error('Error fetching tokens to refresh', { error });
        throw error;
      }

      if (!configs || configs.length === 0) {
        logger.info('No tokens requiring proactive refresh');
        return { status: 'success', message: 'No tokens to refresh' };
      }

      logger.info('Found tokens for proactive refresh', {
        count: configs.length,
      });

      // Refresh each token using your shared utility function
      const results = await Promise.all(
        configs.map(async (config) => {
          try {
            logger.info('Proactively refreshing token', {
              configId: config.id,
              expiresAt: config.access_token_expires_at,
              timeToExpiry:
                Math.floor(
                  (new Date(config.access_token_expires_at).getTime() -
                    now.getTime()) /
                    60000,
                ) + ' minutes',
            });

            // Use your shared refresh function with the correct cloud ID
            const newToken = await refreshAtlassianToken({
              cloudId: config.atlassian_cloud_id,
              accessToken: config.access_token,
            });

            if (!newToken) {
              throw new Error('Token refresh failed');
            }

            logger.info('Successfully refreshed token proactively', {
              configId: config.id,
            });

            return {
              id: config.id,
              status: 'success',
            };
          } catch (error) {
            logger.error('Error in proactive token refresh', {
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

      logger.info('Proactive token refresh complete', {
        successCount,
        errorCount,
      });

      return {
        status: 'success',
        message: 'Proactive token refresh complete',
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: errorCount,
        },
      };
    } catch (error) {
      logger.error('Error in scheduled token refresh', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});
