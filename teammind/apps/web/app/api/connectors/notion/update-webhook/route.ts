import { NextResponse } from 'next/server';

import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';

import { enhanceRouteHandler } from '@tm/next/routes';

import { processNotionWebhookEvent } from '~/api/_trigger.dev/connectors/notion';

// Verification request schema
const verificationSchema = z.object({
  verification_token: z.string(),
});

// Webhook event schema
const webhookEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  workspace_id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  integration_id: z.string(),
  type: z.string(),
  authors: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
    }),
  ),
  entity: z.object({
    id: z.string(),
    type: z.string(),
  }),
  data: z.record(z.any()),
  attempt_number: z.number().optional(),
});

/**
 * Verifies that the request is coming from Notion by checking the signature
 * @param rawBody The raw JSON string body of the request
 * @param signatureHeader The X-Notion-Signature header value
 * @returns Boolean indicating whether the signature is valid
 */
function verifyNotionSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  // If no signature header or no verification token, fail verification
  if (!signatureHeader || !process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN) {
    console.warn('Missing signature header or verification token');
    return false;
  }

  try {
    // Calculate expected signature
    const calculatedSignature = `sha256=${createHmac(
      'sha256',
      process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN,
    )
      .update(rawBody)
      .digest('hex')}`;

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signatureHeader),
    );
  } catch (error) {
    console.error('Error verifying Notion signature:', error);
    return false;
  }
}

/**
 * POST handler for Notion webhooks
 * Handles both verification requests and webhook events
 */
export const POST = enhanceRouteHandler(
  async ({ request }) => {
    try {
      // Clone the request to get the raw body text for signature verification
      const clonedRequest = request.clone();
      const rawBody = await clonedRequest.text();
      const body = JSON.parse(rawBody);

      // Get the signature header
      const signatureHeader = request.headers.get('X-Notion-Signature');

      // Check if this is a verification request
      const verificationResult = verificationSchema.safeParse(body);
      if (verificationResult.success) {
        // This is a verification request
        console.info('Received Notion webhook verification request');
        const { verification_token } = verificationResult.data;

        // Store verification token in environment variable or secure storage in production
        console.info('Notion verification token received');

        // Return the verification token to confirm verification
        return NextResponse.json({ verification_token });
      }

      // For non-verification requests, verify the signature
      if (!verifyNotionSignature(rawBody, signatureHeader)) {
        console.error('Invalid Notion signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 },
        );
      }

      // This is a webhook event
      const eventResult = webhookEventSchema.safeParse(body);
      if (!eventResult.success) {
        console.error('Invalid webhook payload', {
          error: eventResult.error,
        });
        return NextResponse.json(
          { error: 'Invalid webhook payload' },
          { status: 400 },
        );
      }

      // Process the webhook event by triggering a background task
      const event = eventResult.data;
      console.info(
        'Received Notion webhook event - triggering background task',
        {
          type: event.type,
          entityId: event.entity.id,
          entityType: event.entity.type,
          workspaceId: event.workspace_id,
        },
      );

      // Trigger the background task to process the event
      await processNotionWebhookEvent.trigger(event);

      // Respond to Notion immediately so it doesn't retry
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error handling Notion webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  },
  {
    // No auth requirement for webhook endpoint
    auth: false,
  },
);
