import { logger, schedules } from '@trigger.dev/sdk/v3';

import { getSupabaseServerClient } from '@tm/supabase/server-client';

export const cronCleanupOrphanedDocs = schedules.task({
  id: 'cron-cleanup-orphaned-docs',
  cron: '0 0 * * *', // Run once per day at midnight
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 60000,
    maxTimeoutInMs: 300000,
    factor: 2,
  },
  maxDuration: 3600, // 30 minutes max
  run: async (payload) => {
    try {
      const supabase = getSupabaseServerClient({ admin: true });
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      logger.info('Starting orphaned documents cleanup', {
        timestamp: payload.timestamp,
        cutoffDate: threeDaysAgo,
      });

      const { data, error } = await supabase.rpc('cleanup_orphaned_docs', {
        cutoff_date: threeDaysAgo.toISOString(),
      });

      if (error) {
        logger.error('Error cleaning up documents', { error });
        throw error;
      }

      // Handle the array result (data is an array with one row)
      const result =
        data && data.length > 0
          ? data[0]
          : { deleted_chunks: 0, deleted_docs: 0 };

      if (!result) {
        logger.error('No result from cleanup_orphaned_docs');
        throw new Error('No result from cleanup_orphaned_docs');
      }

      const deletedChunks = result.deleted_chunks || 0;
      const deletedDocs = result.deleted_docs || 0;

      logger.info('Successfully cleaned up documents and chunks', {
        deletedChunks,
        deletedDocs,
      });

      return {
        status: 'success',
        message: 'Document cleanup complete',
        deletedChunks,
        deletedDocs,
      };
    } catch (error) {
      logger.error('Error in cleanup documents schedule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});
