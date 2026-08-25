import { logger, schedules } from '@trigger.dev/sdk/v3';

import { GoogleDriveLoader, GmailLoader } from '@tm/ai/integrations/google';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Json } from '~/lib/database.types';

// Configuration constants
const BATCH_SIZE = 50; // How many users to process per run
const SYNC_INTERVAL_HOURS = 1; // Sync every hour

// Type definitions
type SyncResult = {
  status: 'success' | 'error' | 'skipped';
  message?: string;
  error?: string;
};


export const cronSyncGoogleData = schedules.task({
  id: 'cron-sync-google-data',
  // Run every hour during UTC working hours (6 AM - 7 PM UTC)
  cron: '0 6-19 * * *',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000, // 1 minute
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  maxDuration: 3600, // 30 minutes max run time
  run: async (payload) => {
    try {
      const supabase = getSupabaseServerClient({ admin: true });
      const now = new Date();
      const lastSyncThreshold = new Date(
        now.getTime() - SYNC_INTERVAL_HOURS * 60 * 60 * 1000,
      );

      logger.info('Starting scheduled Google data sync', {
        timestamp: payload.timestamp,
        lastSyncThreshold,
      });

      // Fetch configs that need syncing
      const { data: potentialConfigs, error: configError } = await supabase
        .from('google_config')
        .select(`*`)
        .or(
          `last_synced_at.is.null,last_synced_at.lt.${lastSyncThreshold.toISOString()}`
        )
        .eq('is_syncing', false)
        .order('last_synced_at', { ascending: true, nullsFirst: true })
        .limit(BATCH_SIZE * 3); // Fetch more than we need to account for filtering

      if (configError) {
        logger.error('Error fetching potential Google configs', {
          error: configError,
        });
        throw configError;
      }

      if (!potentialConfigs || potentialConfigs.length === 0) {
        logger.info('No Google configs requiring sync');
        return { status: 'success', message: 'No data to sync' };
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
        logger.info('No Google configs to process after team filtering');
        return {
          status: 'success',
          message: 'No data to sync this cycle',
        };
      }

      logger.info(
        `Processing batch of ${configsToProcess.length} Google configs after team filtering`,
        { userIds: configsToProcess.map((c) => c.user_id) },
      );

      const results = await Promise.all(
        configsToProcess.map(async (config) => {
          const userId = config.user_id;
          try {
            const results = {
              drive: { status: 'skipped' as const, message: 'Not scheduled for sync' } as SyncResult,
              gmail: { status: 'skipped' as const, message: 'Not scheduled for sync' } as SyncResult,
            };

            // Check if Gmail sync is needed
            const hasGmailScope = config.granted_scopes?.includes('https://mail.google.com/');
            const needsGmailSync = hasGmailScope;
            
            // Check if Drive sync is needed
            const hasDriveScope = 
              config.granted_scopes?.includes('https://www.googleapis.com/auth/drive') &&
              config.granted_scopes?.includes('https://www.googleapis.com/auth/documents');
            const hasSelectedFolders = 
              Array.isArray(config.selected_folders) && 
              config.selected_folders.length > 0;
            const needsDriveSync = hasDriveScope && hasSelectedFolders;

            // If nothing needs syncing, skip this user
            if (!needsGmailSync && !needsDriveSync) {
              logger.info('Skipping user - no services need syncing', { userId });
              return {
                user_id: userId,
                results,
              };
            }

            // Lock the config to prevent concurrent syncs
            const { data: lockedConfig, error: lockError } = await supabase
              .from('google_config')
              .update({ is_syncing: true })
              .eq('user_id', userId)
              .eq('is_syncing', false) // Only lock if not already syncing
              .select('*')
              .single();

            if (lockError || !lockedConfig) {
              logger.warn('Could not lock config for syncing, may already be in progress', {
                userId,
                error: lockError,
              });
              return {
                user_id: userId,
                results: {
                  drive: { status: 'skipped', message: 'Could not acquire lock' },
                  gmail: { status: 'skipped', message: 'Could not acquire lock' },
                },
              };
            }

            logger.info('Sync status check', {
              userId,
              needsDriveSync,
              needsGmailSync,
            });

            // First process Gmail (if needed)
            if (needsGmailSync) {
              try {
                logger.info('Starting Gmail sync', {
                  userId,
                  email: config.email,
                });

                const gmailLoader = new GmailLoader({
                  userId,
                  accessToken: config.access_token,
                  refreshToken: config.refresh_token,
                  supabase,
                  userEmail: config.email || '',
                });

                // Run the Gmail loader
                await gmailLoader.load();

                results.gmail = {
                  status: 'success',
                  message: 'Gmail emails processed successfully',
                };
              } catch (error) {
                results.gmail = {
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error',
                };

                logger.error('Error in Gmail sync', {
                  userId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }

            // Then process Google Drive (if needed and Gmail didn't fail)
            if (needsDriveSync && !(results.gmail.status === 'error')) {
              try {
                const selectedFolders = config.selected_folders as Json[];

                logger.info('Starting Google Drive sync', {
                  userId,
                  folderCount: selectedFolders.length,
                });

                const googleDriveLoader = new GoogleDriveLoader({
                  userId,
                  accessToken: config.access_token,
                  refreshToken: config.refresh_token,
                  supabase,
                  selectedFolders: selectedFolders as unknown as Array<{
                    id: string;
                    name: string;
                    path?: string;
                  }>,
                });

                // Only pass the page token
                await googleDriveLoader.load({
                  startPageToken: config.change_page_token ?? undefined,
                });

                results.drive = {
                  status: 'success',
                  message: 'Google Drive documents processed successfully',
                };
              } catch (error) {
                results.drive = {
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error',
                };

                logger.error('Error in Google Drive sync', {
                  userId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }

            // Always update sync status regardless of success/failure
            try {
              await supabase
                .from('google_config')
                .update({
                  is_syncing: false,
                  last_synced_at: now.toISOString(),
                })
                .eq('user_id', userId);
            } catch (updateError) {
              logger.error('Error updating sync status', {
                userId,
                error: updateError instanceof Error ? updateError.message : 'Unknown error',
              });

              // Last resort attempt to reset the syncing flag
              try {
                await supabase
                  .from('google_config')
                  .update({ is_syncing: false })
                  .eq('user_id', userId);
              } catch (resetError) {
                logger.error('Critical: Failed to reset syncing flag', {
                  userId,
                  error: resetError instanceof Error ? resetError.message : 'Unknown error',
                });
              }
            }

            logger.info('Completed Google data sync', {
              userId,
              driveStatus: results.drive.status,
              gmailStatus: results.gmail.status,
            });

            return {
              user_id: userId,
              results,
            };
          } catch (error) {
            // Final error handler - ensure flag is reset
            try {
              await supabase
                .from('google_config')
                .update({ is_syncing: false })
                .eq('user_id', userId);
            } catch (resetError) {
              logger.error('Critical error: Failed to reset sync flag', {
                userId,
                error: resetError instanceof Error ? resetError.message : 'Unknown error',
              });
            }

            logger.error('Error processing Google data', {
              userId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
              user_id: userId,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }),
      );

      return {
        status: 'success',
        message: 'Google data sync complete',
        results: results.filter(Boolean),
      };
    } catch (error) {
      logger.error('Error in sync Google data schedule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});