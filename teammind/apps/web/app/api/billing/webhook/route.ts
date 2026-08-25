import { getBillingEventHandlerService } from '@tm/billing-gateway';
import billingConfig from '@tm/billing/config';
import { enhanceRouteHandler } from '@tm/next/routes';
import { getLogger } from '@tm/shared/logger';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

/**
 * @description Handle the webhooks from Stripe related to checkouts
 */
export const POST = enhanceRouteHandler(
  async ({ request }) => {
    const provider = billingConfig.provider;
    const logger = await getLogger();

    const ctx = {
      name: 'billing.webhook',
      provider,
    };

    logger.info(ctx, `Received billing webhook. Processing...`);

    const client = getSupabaseServerClient({ admin: true });
    const supabaseClientProvider = () => client;

    const service = await getBillingEventHandlerService(
      supabaseClientProvider,
      provider,
      billingConfig,
    );

    try {
      await service.handleWebhookEvent(request);

      logger.info(ctx, `Successfully processed billing webhook`);

      return new Response('OK', { status: 200 });
    } catch (error) {
      logger.error({ ...ctx, error }, `Failed to process billing webhook`);

      return new Response('Failed to process billing webhook', {
        status: 500,
      });
    }
  },
  {
    auth: false,
  },
);
