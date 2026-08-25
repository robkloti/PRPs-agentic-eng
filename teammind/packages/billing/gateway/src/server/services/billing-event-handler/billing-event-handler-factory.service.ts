import 'server-only';

import { z } from 'zod';

import {
  BillingConfig,
  BillingProviderSchema,
  BillingWebhookHandlerService,
} from '@tm/billing';

export class BillingEventHandlerFactoryService {
  static async GetProviderStrategy(
    provider: z.infer<typeof BillingProviderSchema>,
    config: BillingConfig,
  ): Promise<BillingWebhookHandlerService> {
    switch (provider) {
      case 'stripe': {
        const { StripeWebhookHandlerService } = await import('@tm/stripe');

        return new StripeWebhookHandlerService(config);
      }

      case 'lemon-squeezy': {
        const { LemonSqueezyWebhookHandlerService } = await import(
          '@tm/lemon-squeezy'
        );

        return new LemonSqueezyWebhookHandlerService(config);
      }

      case 'paddle': {
        throw new Error('Paddle is not supported yet');
      }

      default:
        throw new Error(`Unsupported billing provider: ${provider as string}`);
    }
  }
}
