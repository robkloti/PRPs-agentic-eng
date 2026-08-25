import { logger, task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { CreateGraph } from '@tm/ai/agents/graphs';
// Adjust the import path as needed
import { getSupabaseServerClient } from '@tm/supabase/server-client';

// Input validation schema based on the actual transcript structure
const _runCreateGraphInputSchema = z.object({
  userId: z.string().uuid(),
  meetingId: z.string().uuid(),
  transcript: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
    }),
  ),
});

export const runCreateGraph = task({
  id: 'run-create-graph',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 30000, // 30 seconds
    maxTimeoutInMs: 300000, // 5 minutes
    factor: 2,
  },
  maxDuration: 1200, // 20 minutes
  run: async (payload: z.infer<typeof _runCreateGraphInputSchema>) => {
    const { userId, meetingId, transcript } = payload;
    const supabase = getSupabaseServerClient({ admin: true });
    const graph = new CreateGraph(supabase);

    try {
      logger.info('Starting TeammindGraph execution', {
        userId,
        meetingId,
      });

      const result = await graph.invoke({
        userId,
        transcript,
        meetingId,
      });

      // In non-production environments, generate and store the graph visualization
      if (process.env.NODE_ENV !== 'production') {
        try {
          const mermaidDiagram = await graph.drawGraph();

          logger.info(mermaidDiagram);
        } catch (diagramError) {
          console.error('Failed to generate graph visualization', diagramError);
        }
      }

      return {
        success: true,
        message: 'Successfully processed meeting transcript',
        result,
      };
    } catch (error) {
      logger.error('Failed to process meeting transcript', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        meetingId,
      });

      throw error;
    }
  },
});
