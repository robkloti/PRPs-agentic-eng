/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';

import {
  CancelSubscriptionParamsSchema,
  CreateBillingCheckoutSchema,
  CreateBillingPortalSessionSchema,
  QueryBillingUsageSchema,
  ReportBillingUsageSchema,
  RetrieveCheckoutSessionSchema,
  UpdateSubscriptionParamsSchema,
} from '../schema';
import { BillingStrategyProviderService } from './billing-strategy-provider.service';

/**
 * ManualBillingStrategyProviderService
 * A minimal implementation of the BillingStrategyProviderService that supports manual billing
 */
export class ManualBillingStrategyProviderService extends BillingStrategyProviderService {
  async createBillingPortalSession(
    params: z.infer<typeof CreateBillingPortalSessionSchema>,
  ): Promise<{ url: string }> {
    // For manual billing, we don't have a portal, so we redirect back to the return URL
    return {
      url: params.returnUrl,
    };
  }

  async retrieveCheckoutSession(
    params: z.infer<typeof RetrieveCheckoutSessionSchema>,
  ): Promise<{
    checkoutToken: string | null;
    status: 'complete' | 'expired' | 'open';
    isSessionOpen: boolean;
    customer: {
      email: string | null;
    };
  }> {
    // For manual billing, we return a default response
    return {
      checkoutToken: null,
      status: 'complete',
      isSessionOpen: false,
      customer: {
        email: null,
      },
    };
  }

  async createCheckoutSession(
    params: z.infer<typeof CreateBillingCheckoutSchema>,
  ): Promise<{ checkoutToken: string }> {
    // For manual billing, we don't create real checkout sessions
    return {
      checkoutToken: 'manual-checkout-token',
    };
  }

  async cancelSubscription(
    params: z.infer<typeof CancelSubscriptionParamsSchema>,
  ): Promise<{ success: boolean }> {
    // Manual subscriptions are canceled through the admin panel
    return {
      success: true,
    };
  }

  async reportUsage(
    params: z.infer<typeof ReportBillingUsageSchema>,
  ): Promise<{ success: boolean }> {
    // For manual billing, we might log usage somewhere for reporting
    console.log('Manual usage reported', params);
    return {
      success: true,
    };
  }

  async queryUsage(
    params: z.infer<typeof QueryBillingUsageSchema>,
  ): Promise<{ value: number }> {
    // For manual billing, we return a placeholder value
    return {
      value: 0,
    };
  }

  async updateSubscriptionItem(
    params: z.infer<typeof UpdateSubscriptionParamsSchema>,
  ): Promise<{ success: boolean }> {
    // Manual subscription updates are handled through the admin panel
    return {
      success: true,
    };
  }

  async getPlanById(planId: string): Promise<{
    id: string;
    name: string;
    interval: string;
    amount: number;
  }> {
    // For manual billing, we return placeholder plan data
    return {
      id: planId,
      name: 'Manual Plan',
      interval: 'month',
      amount: 0,
    };
  }
}
