import { logger, task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { ConfluenceLoader, JiraLoader } from '@tm/ai/integrations/atlassian';
import { ConfluenceSite } from '@tm/ai/types';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

const _loadAtlassianDataInputSchema = z.object({
  userId: z.string(),
  cloudId: z.string(),
  accessToken: z.string(),
  baseUrl: z.string(),
  // Both are optional to allow loading either or both
  selectedSpaces: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        name: z.string(),
        avatarUrl: z.string(),
        scopes: z.array(z.string()),
      }),
    )
    .optional(),
  selectedBoards: z
    .array(
      z
        .object({
          id: z.number(),
          name: z.string(),
          location: z
            .object({
              projectId: z.number(),
              projectKey: z.string(),
            })
            .and(z.record(z.any())), // Allow additional properties in location
        })
        .and(z.record(z.any())), // Allow additional properties in board
    )
    .optional(),
});

export const loadAtlassianData = task({
  id: 'load-atlassian-data',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000, // 1 minute
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  maxDuration: 3600,
  run: async (payload: z.infer<typeof _loadAtlassianDataInputSchema>) => {
    const {
      userId,
      cloudId,
      accessToken,
      baseUrl,
      selectedSpaces,
      selectedBoards,
    } = payload;
    const supabase = getSupabaseServerClient({ admin: true });

    try {
      logger.info('Starting Atlassian data load', {
        userId,
        cloudId,
        hasConfluenceSpaces: selectedSpaces && selectedSpaces.length > 0,
        hasJiraBoards: selectedBoards && selectedBoards.length > 0,
      });

      // Set syncing flag to true once at the beginning
      await supabase
        .from('atlassian_config')
        .update({ is_syncing: true })
        .eq('user_id', userId);

      // Track results for both operations
      const results = {
        confluence: {
          success: false,
          message: 'No Confluence spaces selected',
        },
        jira: { success: false, message: 'No Jira boards selected' },
      };

      // Create an array to hold our loading promises
      const loadingPromises = [];

      // Setup Confluence loading promise if spaces are selected
      if (selectedSpaces && selectedSpaces.length > 0) {
        const confluencePromise = (async () => {
          try {
            const confluenceLoader = new ConfluenceLoader({
              userId,
              cloudId,
              accessToken,
              baseUrl,
              supabase,
              selectedSpaces: selectedSpaces as ConfluenceSite[],
            });

            await confluenceLoader.load();

            results.confluence = {
              success: true,
              message: 'Successfully loaded Confluence documents',
            };

            logger.info('Completed Confluence document load', {
              userId,
              cloudId,
            });
          } catch (error) {
            logger.error('Failed to load Confluence documents', {
              error: error instanceof Error ? error.message : 'Unknown error',
              userId,
              cloudId,
            });

            results.confluence = {
              success: false,
              message: `Failed to load Confluence documents: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            };
          }
        })();

        loadingPromises.push(confluencePromise);
      }

      // Setup Jira loading promise if boards are selected
      if (selectedBoards && selectedBoards.length > 0) {
        const jiraPromise = (async () => {
          try {
            const jiraLoader = new JiraLoader({
              userId,
              cloudId,
              accessToken,
              baseUrl,
              supabase,
              selectedBoards,
            });

            // Load issues since the last 6 months
            const modifiedSince = new Date();
            modifiedSince.setMonth(modifiedSince.getMonth() - 6);
            await jiraLoader.load({ modifiedSince });

            results.jira = {
              success: true,
              message: 'Successfully loaded Jira documents',
            };

            logger.info('Completed Jira document load', {
              userId,
              cloudId,
            });
          } catch (error) {
            logger.error('Failed to load Jira documents', {
              error: error instanceof Error ? error.message : 'Unknown error',
              userId,
              cloudId,
            });

            results.jira = {
              success: false,
              message: `Failed to load Jira documents: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            };
          }
        })();

        loadingPromises.push(jiraPromise);
      }

      // Run all loading processes in parallel
      await Promise.all(loadingPromises);

      // Update sync status only once at the end
      await supabase
        .from('atlassian_config')
        .update({
          is_syncing: false,
          last_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      logger.info('Completed Atlassian data load', {
        userId,
        cloudId,
        confluenceSuccess: results.confluence.success,
        jiraSuccess: results.jira.success,
      });

      return {
        success: results.confluence.success || results.jira.success,
        confluence: results.confluence,
        jira: results.jira,
      };
    } catch (error) {
      // Ensure we reset the syncing flag even if there's an error
      try {
        await supabase
          .from('atlassian_config')
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

      logger.error('Failed to load Atlassian data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        cloudId,
      });

      throw error;
    }
  },
  handleError: async (payload, error, { ctx }) => {
    logger.error('Error in loadAtlassianData task', {
      error: error instanceof Error ? error.message : 'Unknown error',
      context: ctx,
    });
    const { userId } = payload;
    const supabase = getSupabaseServerClient({ admin: true });

    // Final safety net - ensure syncing flag is reset if task fails
    try {
      await supabase
        .from('atlassian_config')
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
