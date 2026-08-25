import { logger, schedules } from '@trigger.dev/sdk/v3';
import { google } from 'googleapis';

import { getSupabaseServerClient } from '@tm/supabase/server-client';

export const cronRefreshGoogleTokens = schedules.task({
  id: 'cron-refresh-google-tokens',
  cron: '0 */1 * * *', // Run every 1 hour instead of 4
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

      logger.info('Starting Google token refresh', {
        timestamp: payload.timestamp,
      });

      // Get tokens expiring in the next 60 minutes (full hour)
      const { data: configs, error } = await supabase
        .from('google_config')
        .select('*')
        .lt(
          'token_expiry',
          new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 60 minutes
        )
        .not('refresh_token', 'is', null); // Ensure refresh token exists

      if (error) {
        logger.error('Error fetching tokens to refresh', { error });
        throw error;
      }

      if (!configs || configs.length === 0) {
        logger.info('No tokens requiring refresh');
        return { status: 'success', message: 'No tokens to refresh' };
      }

      logger.info('Found tokens to refresh', { count: configs.length });

      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/google/auth-callback`,
      );

      // Refresh each token
      const results = await Promise.all(
        configs.map(async (config) => {
          try {
            logger.info('Refreshing token', {
              configId: config.id,
              userId: config.user_id,
              expiresAt: config.token_expiry,
            });

            // Set refresh token to refresh access token
            oauth2Client.setCredentials({
              refresh_token: config.refresh_token,
            });

            // Refresh token
            const { credentials } = await oauth2Client.refreshAccessToken();

            // Calculate new expiration date
            const expiryDate = new Date();
            if (credentials.expiry_date) {
              expiryDate.setTime(credentials.expiry_date);
            } else {
              // Default to 1 hour if not provided
              expiryDate.setTime(now.getTime() + 3600 * 1000);
            }

            // Update tokens in database
            const { error: updateError } = await supabase
              .from('google_config')
              .update({
                access_token: credentials.access_token!,
                token_expiry: expiryDate.toISOString(),
                // Only update refresh token if a new one was provided
                ...(credentials.refresh_token && {
                  refresh_token: credentials.refresh_token,
                }),
              })
              .eq('id', config.id);

            if (updateError) {
              throw updateError;
            }

            logger.info('Successfully refreshed token', {
              configId: config.id,
              newExpiryDate: expiryDate.toISOString(),
            });

            return {
              id: config.id,
              status: 'success',
            };
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error refreshing token', {
              configId: config.id,
              userId: config.user_id,
              error: errorMsg,
            });

            return {
              id: config.id,
              status: 'error',
              error: errorMsg,
            };
          }
        }),
      );

      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      logger.info('Token refresh complete', {
        successCount,
        errorCount,
      });

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
