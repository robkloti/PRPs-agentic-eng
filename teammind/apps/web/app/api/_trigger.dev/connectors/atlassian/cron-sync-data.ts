import { logger, schedules } from '@trigger.dev/sdk/v3';

import { ConfluenceLoader, JiraLoader } from '@tm/ai/integrations/atlassian';
import { ConfluenceSite, JiraSite } from '@tm/ai/types';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Json } from '~/lib/database.types';

// Configuration constants
const BATCH_SIZE = 50; // How many users
const SYNC_INTERVAL_HOURS = 0.25;

// Type definitions
type SyncResult = {
  status: 'success' | 'error';
  message?: string;
  error?: string;
};

type AtlassianSyncResults = {
  confluence: SyncResult | null;
  jira: SyncResult | null;
};

export const cronSyncAtlassianData = schedules.task({
  id: 'cron-sync-atlassian-data',
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

      logger.info('Starting scheduled Atlassian sync', {
        timestamp: payload.timestamp,
        lastSyncThreshold,
      });

      // Fetch all potential sync candidates, ordered by oldest sync time
      // with a higher limit to account for filtering
      const { data: potentialConfigs, error: configError } = await supabase
        .from('atlassian_config')
        .select(`*`)
        .or(
          `last_synced_at.is.null,last_synced_at.lt.${lastSyncThreshold.toISOString()}`,
        )
        .eq('is_syncing', false)
        .gt('refresh_token_expires_at', now.toISOString())
        .gt('refresh_token_inactivity_expires_at', now.toISOString())
        // Ensure at least one integration is selected
        .or('selected_confluence_spaces.neq.[]')
        .or('selected_jira_boards.neq.[]')
        .order('last_synced_at', { ascending: true, nullsFirst: true })
        .limit(BATCH_SIZE * 3); // Fetch more than we need to account for team filtering

      if (configError) {
        logger.error('Error fetching potential Atlassian configs', {
          error: configError,
        });
        throw configError;
      }

      if (!potentialConfigs || potentialConfigs.length === 0) {
        logger.info('No potential configs requiring sync');
        return { status: 'success', message: 'No documents to sync' };
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
              .from('atlassian_config')
              .update({ is_syncing: true })
              .eq('user_id', config.user_id);

            const syncPromises = [];
            const syncResults: AtlassianSyncResults = {
              confluence: null,
              jira: null,
            };

            const modifiedSinceDate = config.last_synced_at
              ? new Date(config.last_synced_at)
              : undefined;

            // Prepare Confluence sync if configured
            const confluenceSpaces =
              config.selected_confluence_spaces as Json[];
            if (
              config.atlassian_cloud_id &&
              config.atlassian_base_url &&
              Array.isArray(confluenceSpaces) &&
              confluenceSpaces.length > 0
            ) {
              logger.info('Starting Confluence sync', {
                userId: config.user_id,
                cloudId: config.atlassian_cloud_id,
              });

              const confluenceLoader = new ConfluenceLoader({
                userId: config.user_id,
                cloudId: config.atlassian_cloud_id,
                accessToken: config.access_token,
                baseUrl: config.atlassian_base_url,
                supabase,
                selectedSpaces: confluenceSpaces as unknown as ConfluenceSite[],
              });

              syncPromises.push(
                confluenceLoader
                  .load({
                    modifiedSince: modifiedSinceDate,
                  })
                  .then(() => {
                    syncResults.confluence = {
                      status: 'success',
                      message: 'Confluence documents processed successfully',
                    };
                  })
                  .catch((error) => {
                    syncResults.confluence = {
                      status: 'error',
                      error:
                        error instanceof Error
                          ? error.message
                          : 'Unknown error',
                    };
                  }),
              );
            }

            // Prepare Jira sync if configured
            const jiraBoards =
              config.selected_jira_boards as unknown as JiraSite[];
            if (
              config.atlassian_cloud_id &&
              config.atlassian_base_url &&
              Array.isArray(jiraBoards) &&
              jiraBoards.length > 0
            ) {
              logger.info('Starting Jira sync', {
                userId: config.user_id,
                cloudId: config.atlassian_cloud_id,
              });

              const selectedBoards = jiraBoards.map((board: JiraSite) => ({
                id: Number(board.id),
                name: board.name,
                location: {
                  projectId: Number(board.location.projectId),
                  projectKey: board.location.projectKey,
                },
              }));

              const jiraLoader = new JiraLoader({
                userId: config.user_id,
                cloudId: config.atlassian_cloud_id,
                accessToken: config.access_token,
                baseUrl: config.atlassian_base_url,
                supabase,
                selectedBoards,
              });

              syncPromises.push(
                jiraLoader
                  .load({
                    modifiedSince: modifiedSinceDate,
                  })
                  .then(() => {
                    syncResults.jira = {
                      status: 'success',
                      message: 'Jira issues processed successfully',
                    };
                  })
                  .catch((error) => {
                    syncResults.jira = {
                      status: 'error',
                      error:
                        error instanceof Error
                          ? error.message
                          : 'Unknown error',
                    };
                  }),
              );
            }

            // Wait for all syncs to complete with proper error handling
            try {
              await Promise.all(syncPromises);
            } catch (error) {
              // If Promise.all fails, ensure we mark as not syncing and log the error
              logger.error('Error during sync operations', {
                userId: config.user_id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              // Mark sync results with errors
              if (syncResults.confluence === null) {
                syncResults.confluence = {
                  status: 'error',
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                };
              }
              if (syncResults.jira === null) {
                syncResults.jira = {
                  status: 'error',
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                };
              }
            } finally {
              // Always update sync status in finally block
              try {
                await supabase
                  .from('atlassian_config')
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
                    .from('atlassian_config')
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

            // Check if any sync failed
            const hasError = Object.values(syncResults).some(
              (result) => result?.status === 'error',
            );

            logger.info('Completed Atlassian data sync', {
              userId: config.user_id,
              status: hasError ? 'partial_success' : 'success',
            });

            return {
              user_id: config.user_id,
              status: hasError ? 'partial_success' : 'success',
              results: syncResults,
            };
          } catch (error) {
            // Reset syncing flag on error
            try {
              await supabase
                .from('atlassian_config')
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

            logger.error('Error processing Atlassian data', {
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
        message: 'Atlassian sync complete',
        results: results.filter(Boolean),
      };
    } catch (error) {
      logger.error('Error in sync Atlassian schedule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});
