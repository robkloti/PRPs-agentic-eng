import { logger, schedules } from '@trigger.dev/sdk/v3';

import { SharePointLoader } from '@tm/ai/integrations/microsoft';
import { MicrosoftSiteMetaData } from '@tm/ai/types';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

// Configuration constants
const BATCH_SIZE = 50; // How many users
const SYNC_INTERVAL_HOURS = 0.25;

// Type definitions
type SyncResult = {
  status: 'success' | 'error';
  message?: string;
  error?: string;
};

type SharePointSyncResults = {
  sharepoint: SyncResult | null;
};

export const cronSyncSharePointData = schedules.task({
  id: 'cron-sync-sharepoint-data',
  // Run every hour during UTC working hours (6 AM - 7 PM UTC)
  cron: '0 6-19 * * *',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000,
    maxTimeoutInMs: 300000,
    factor: 2,
  },
  maxDuration: 3600,
  run: async (payload) => {
    try {
      const supabase = getSupabaseServerClient({ admin: true });
      const now = new Date();
      const lastSyncThreshold = new Date(
        now.getTime() - SYNC_INTERVAL_HOURS * 60 * 60 * 1000,
      );

      logger.info('Starting scheduled SharePoint sync', {
        timestamp: payload.timestamp,
        lastSyncThreshold,
      });

      // Get users due for sync - fetch more than we need to account for team filtering
      const { data: potentialConfigs, error: configError } = await supabase
        .from('microsoft_config')
        .select('*')
        .or(
          `last_synced_at.is.null,last_synced_at.lt.${lastSyncThreshold.toISOString()}`,
        )
        .eq('is_syncing', false)
        .gt('refresh_token_expires_at', now.toISOString())
        .gt('refresh_token_inactivity_expires_at', now.toISOString())
        .order('last_synced_at', { ascending: true, nullsFirst: true })
        .limit(BATCH_SIZE * 3);

      if (configError) {
        logger.error('Error fetching SharePoint configs', {
          error: configError,
        });
        throw configError;
      }

      if (!potentialConfigs || potentialConfigs.length === 0) {
        logger.info('No documents requiring sync');
        return { status: 'success', message: 'No documents to sync' };
      }

      // Get team membership information for these users
      const userIds = potentialConfigs.map((config) => config.user_id);
      const { data: memberships, error: membershipsError } = await supabase
        .from('accounts_memberships')
        .select(
          `
          user_id,
          account_id,
          accounts(is_personal_account)
        `,
        )
        .in('user_id', userIds);

      if (membershipsError) {
        logger.error('Error fetching account memberships', {
          error: membershipsError,
        });
        throw membershipsError;
      }

      // Create a map of user_id to their team membership info
      const userTeamMap = new Map();
      memberships?.forEach((membership) => {
        if (membership.accounts && !membership.accounts.is_personal_account) {
          // This is a team account membership
          userTeamMap.set(membership.user_id, {
            accountId: membership.account_id,
            isPersonalAccount: false,
          });
        } else {
          // This is a personal account membership
          userTeamMap.set(membership.user_id, {
            accountId: membership.user_id, // For personal accounts, account_id = user_id
            isPersonalAccount: true,
          });
        }
      });

      // Filter configurations using the team membership info
      const configsToProcess = [];
      const teamsInBatch = new Set<string>(); // Store account_id of teams

      for (const config of potentialConfigs) {
        if (configsToProcess.length >= BATCH_SIZE) {
          break; // Stop once batch size is reached
        }

        const membershipInfo = userTeamMap.get(config.user_id);

        if (!membershipInfo) {
          logger.warn('Skipping config due to missing membership data', {
            userId: config.user_id,
          });
          continue;
        }

        if (membershipInfo.isPersonalAccount) {
          // Always include personal accounts
          configsToProcess.push(config);
        } else {
          // For team accounts, ensure only one member per team
          if (!teamsInBatch.has(membershipInfo.accountId)) {
            configsToProcess.push(config);
            teamsInBatch.add(membershipInfo.accountId);
          }
          // else: team already in batch, skip this user for now
        }
      }

      if (configsToProcess.length === 0) {
        logger.info('No configs to process after team filtering');
        return {
          status: 'success',
          message: 'No documents to sync this cycle',
        };
      }

      logger.info(
        `Processing batch of ${configsToProcess.length} configs after team filtering`,
        { userIds: configsToProcess.map((c) => c.user_id) },
      );

      const results = await Promise.all(
        configsToProcess.map(async (config) => {
          try {
            // Set syncing flag
            await supabase
              .from('microsoft_config')
              .update({ is_syncing: true })
              .eq('user_id', config.user_id);

            const syncResults: SharePointSyncResults = {
              sharepoint: null,
            };

            // Prepare SharePoint sync if configured
            const sharePointSites =
              config.selected_sharepoint_sites as unknown as MicrosoftSiteMetaData[];
            if (
              config.sharepoint_root_id &&
              config.sharepoint_base_url &&
              Array.isArray(sharePointSites) &&
              sharePointSites.length > 0
            ) {
              logger.info('Starting SharePoint sync', {
                userId: config.user_id,
                rootId: config.sharepoint_root_id,
              });

              const sharePointLoader = new SharePointLoader({
                userId: config.user_id,
                accessToken: config.access_token,
                refreshToken: config.refresh_token,
                selectedSites: sharePointSites,
                supabase,
              });

              // Set date to 2 days before last synced date to be extra sure we get all changes
              const modifiedSinceDate = config.last_synced_at
                ? new Date(
                    new Date(config.last_synced_at).getTime() -
                      2 * 24 * 60 * 60 * 1000, // 2 days in milliseconds
                  )
                : undefined;

              await sharePointLoader
                .load({
                  modifiedSince: modifiedSinceDate,
                })
                .then(() => {
                  syncResults.sharepoint = {
                    status: 'success',
                    message: 'SharePoint documents processed successfully',
                  };
                })
                .catch((error) => {
                  syncResults.sharepoint = {
                    status: 'error',
                    error:
                      error instanceof Error ? error.message : 'Unknown error',
                  };
                });
            }

            // Always update sync status in finally block
            try {
              await supabase
                .from('microsoft_config')
                .update({
                  is_syncing: false,
                  last_synced_at: now.toISOString(),
                })
                .eq('user_id', config.user_id);
            } catch (updateError) {
              logger.error('Failed to update sync status', {
                userId: config.user_id,
                error:
                  updateError instanceof Error
                    ? updateError.message
                    : 'Unknown error',
              });

              // Last resort attempt to at least reset is_syncing flag
              try {
                await supabase
                  .from('microsoft_config')
                  .update({ is_syncing: false })
                  .eq('user_id', config.user_id);
              } catch (resetError) {
                logger.error(
                  'Critical error: Failed to reset is_syncing flag',
                  {
                    userId: config.user_id,
                    error:
                      resetError instanceof Error
                        ? resetError.message
                        : 'Unknown error',
                  },
                );
              }
            }

            logger.info('Completed SharePoint data sync', {
              userId: config.user_id,
              status: syncResults.sharepoint?.status,
            });

            return {
              user_id: config.user_id,
              status: syncResults.sharepoint?.status,
              results: syncResults,
            };
          } catch (error) {
            // Reset syncing flag on error
            try {
              await supabase
                .from('microsoft_config')
                .update({ is_syncing: false })
                .eq('user_id', config.user_id);
            } catch (resetError) {
              // If we can't even reset the flag, log this critical error
              logger.error('Critical error: Failed to reset syncing flag', {
                userId: config.user_id,
                error:
                  resetError instanceof Error
                    ? resetError.message
                    : 'Unknown error',
              });
            }

            logger.error('Error processing SharePoint data', {
              userId: config.user_id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
              user_id: config.user_id,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }),
      );

      return {
        status: 'success',
        message: 'SharePoint sync complete',
        results: results.filter(Boolean),
      };
    } catch (error) {
      logger.error('Error in sync SharePoint schedule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});
