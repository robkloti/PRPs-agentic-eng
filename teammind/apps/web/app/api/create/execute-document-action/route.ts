import { NextResponse } from 'next/server';

import { z } from 'zod';

import { CreateExecutionService } from '@tm/ai/integrations';
import { enhanceRouteHandler } from '@tm/next/routes';

// Schema for action execution request
const actionExecutionSchema = z.object({
  actionId: z.string().uuid(),
});

export const POST = enhanceRouteHandler(
  async ({ request, user }) => {
    try {
      if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Parse request body
      const body = await request.json();
      const result = actionExecutionSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid request parameters' },
          { status: 400 },
        );
      }

      const { actionId } = result.data;

      // Create action execution service and execute the action
      const actionService = new CreateExecutionService();
      const executionResult = await actionService.executeActionById(
        actionId,
        user.id,
      );

      if (!executionResult.success) {
        return NextResponse.json(
          { error: 'Failed to execute action' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        result: executionResult.result,
      });
    } catch (error) {
      console.error('Error executing document update action:', error);
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 },
      );
    }
  },
  { auth: true },
);
