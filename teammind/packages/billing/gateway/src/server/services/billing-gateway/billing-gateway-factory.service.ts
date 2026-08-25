import 'server-only';

import { z } from 'zod';

import {
  BillingProviderSchema,
  BillingStrategyProviderService,
  ManualBillingStrategyProviderService,
} from '@tm/billing';

export class BillingGatewayFactoryService {
  static async GetProviderStrategy(
    provider: z.infer<typeof BillingProviderSchema>,
  ): Promise<BillingStrategyProviderService> {
    switch (provider) {
      case 'stripe': {
        const { StripeBillingStrategyService } = await import('@tm/stripe');

        return new StripeBillingStrategyService();
      }

      case 'lemon-squeezy': {
        const { LemonSqueezyBillingStrategyService } = await import(
          '@tm/lemon-squeezy'
        );

        return new LemonSqueezyBillingStrategyService();
      }

      case 'paddle': {
        throw new Error('Paddle is not supported yet');
      }

      case 'manual': {
        return new ManualBillingStrategyProviderService();
      }

      default:
        throw new Error(`Unsupported billing provider: ${provider as string}`);
    }
  }
}
