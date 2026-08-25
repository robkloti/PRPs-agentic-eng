import { logger, schedules } from '@trigger.dev/sdk/v3';

import { NotionLoader } from '@tm/ai/integrations/notion';
import { NotionWorkspace } from '@tm/ai/types';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

// Configuration constants
const BATCH_SIZE = 50; // How many users to process per run
const SYNC_INTERVAL_HOURS = 0.25; // Run every 15 minutes

// Type definitions
type SyncResult = {
  status: 'success' | 'error';
  message?: string;
  error?: string;
};

export const cronSyncNotionDatabases = schedules.task({
  id: 'cron-sync-notion-databases',
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

      logger.info('Starting scheduled Notion database sync', {
        timestamp: payload.timestamp,
        lastSyncThreshold,
      });

      // Fetch all potential sync candidates, ordered by oldest sync time
      const { data: potentialConfigs, error: configError } = await supabase
        .from('notion_config')
        .select(`*`)
        .or(
          `last_synced_at.is.null,last_synced_at.lt.${lastSyncThreshold.toISOString()}`,
        )
        .eq('is_syncing', false)
        // Exclude any invalid configurations
        .not('access_token', 'is', null)
        .not('workspace_id', 'is', null)
        .order('last_synced_at', { ascending: true, nullsFirst: true })
        .limit(BATCH_SIZE * 3); // Fetch more than we need to account for team filtering

      if (configError) {
        logger.error('Error fetching potential Notion configs', {
          error: configError,
        });
        throw configError;
      }

      if (!potentialConfigs || potentialConfigs.length === 0) {
        logger.info('No potential Notion configs requiring sync');
        return { status: 'success', message: 'No databases to sync' };
      }

      // Then get team membership information for these users
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
          message: 'No databases to sync this cycle',
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
              .from('notion_config')
              .update({ is_syncing: true })
              .eq('user_id', config.user_id);

            let syncResult: SyncResult;

            try {
              logger.info('Starting Notion database sync', {
                userId: config.user_id,
                workspaceId: config.workspace_id,
              });

              // Create workspace object
              const selectedWorkspace: NotionWorkspace = {
                id: config.workspace_id,
                name: config.workspace_name ?? 'Notion Workspace',
                icon: config.workspace_icon ?? '',
              };

              // Create NotionLoader with all the necessary components
              const loader = new NotionLoader({
                userId: config.user_id,
                accessToken: config.access_token,
                selectedWorkspaces: selectedWorkspace,
                supabase,
              });

              // Use the dedicated database sync method with last sync time
              const lastSyncDate = config.last_synced_at
                ? new Date(config.last_synced_at)
                : undefined;
              const databaseDocIds = await loader.syncDatabases({
                modifiedSince: lastSyncDate,
              });

              syncResult = {
                status: 'success',
                message: `Successfully processed ${databaseDocIds.length} Notion databases`,
              };
            } catch (error) {
              logger.error('Error during Notion database sync', {
                userId: config.user_id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              syncResult = {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            } finally {
              // Always update sync status in finally block
              try {
                await supabase
                  .from('notion_config')
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
                    .from('notion_config')
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
            }

            return {
              user_id: config.user_id,
              status: syncResult.status,
              result: syncResult,
            };
          } catch (error) {
            // Reset syncing flag on error
            try {
              await supabase
                .from('notion_config')
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

            logger.error('Error processing Notion database data', {
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
        message: 'Notion database sync complete',
        results: results.filter(Boolean),
      };
    } catch (error) {
      logger.error('Error in sync Notion databases schedule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});
