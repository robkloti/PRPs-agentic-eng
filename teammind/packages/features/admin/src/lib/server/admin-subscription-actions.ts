'use server';

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import billingConfig from '@tm/billing/config';
import { enhanceAction } from '@tm/next/actions';
import { getLogger } from '@tm/shared/logger';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { adminAction } from './utils/admin-action';

// Create subscription schema
const CreateSubscriptionSchema = z.object({
  accountId: z.string().uuid(),
  productId: z.string().min(1),
  planId: z.string().min(1),
  active: z.boolean().default(true),
  status: z.enum([
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
  ]),
  currency: z.string().length(3).default('USD'),
  periodStartsAt: z.string(),
  periodEndsAt: z.string(),
  trialStartsAt: z.string().optional(),
  trialEndsAt: z.string().optional(),
  lineItems: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.number().min(1),
    }),
  ),
});

// Update subscription schema
const UpdateSubscriptionSchema = CreateSubscriptionSchema.extend({
  subscriptionId: z.string().min(1),
});

// Cancel subscription schema
const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
});

/**
 * Create a new manual subscription for an account
 */
export const createSubscriptionAction = adminAction(
  enhanceAction(
    async (data, _user) => {
      const logger = await getLogger();
      const adminClient = getSupabaseServerClient({ admin: true });

      const logContext = {
        name: 'admin.create-subscription',
        accountId: data.accountId,
        planId: data.planId,
      };

      try {
        logger.info(logContext, 'Creating manual subscription');

        // Find the product and plan from the billing config
        const product = billingConfig.products.find(
          (p) => p.id === data.productId,
        );
        const plan = product?.plans.find((p) => p.id === data.planId);

        if (!product || !plan) {
          throw new Error('Product or plan not found in billing config');
        }

        // Create a unique subscription ID
        const subscriptionId = `manual_${crypto.randomUUID()}`;

        // Before creating a new customer, check if one already exists
        const { data: existingCustomer, error: existingCustomerError } =
          await adminClient
            .from('billing_customers')
            .select('id, customer_id')
            .eq('account_id', data.accountId)
            .eq('provider', 'manual')
            .order('id', { ascending: false })
            .limit(1);

        if (existingCustomerError) {
          logger.error(
            { ...logContext, error: existingCustomerError },
            'Failed to check for existing billing customer',
          );
          throw new Error('Failed to check for existing billing customer');
        }

        let customerId;

        if (existingCustomer && existingCustomer.length > 0) {
          // Use the existing customer ID
          customerId = existingCustomer[0]!.customer_id;
          logger.info(
            { ...logContext, customerId },
            'Using existing billing customer',
          );
        } else {
          // Create a new customer ID only if one doesn't exist
          customerId = `manual_customer_${crypto.randomUUID()}`;

          // Create the customer record
          const { data: customer, error: customerError } = await adminClient
            .from('billing_customers')
            .insert({
              account_id: data.accountId,
              provider: 'manual',
              customer_id: customerId,
            })
            .select('id')
            .single();

          if (customerError || !customer) {
            logger.error(
              { ...logContext, error: customerError },
              'Failed to create billing customer',
            );
            throw new Error('Failed to create billing customer');
          }
        }

        // Format the line items for the subscription
        const formattedLineItems = data.lineItems.map((item) => {
          // Find the line item in the plan
          const lineItemConfig = plan.lineItems.find(
            (li) => li.id === item.variantId,
          );

          if (!lineItemConfig) {
            throw new Error(
              `Line item ${item.variantId} not found in plan config`,
            );
          }

          return {
            id: `manual_${item.variantId}_${crypto.randomUUID()}`,
            product_id: product.id,
            variant_id: item.variantId,
            quantity: item.quantity,
            price_amount: lineItemConfig.cost,
            interval: plan.interval ?? 'month',
            interval_count: 1,
            type: lineItemConfig.type,
            subscription_id: subscriptionId,
          };
        });

        // Create the subscription using the upsert_subscription function
        const { data: _subscription, error: subscriptionError } =
          await adminClient.rpc('upsert_subscription', {
            target_account_id: data.accountId,
            target_customer_id: customerId,
            target_subscription_id: subscriptionId,
            active: data.active,
            status: data.status,
            billing_provider: 'manual',
            cancel_at_period_end: false,
            currency: data.currency,
            period_starts_at: data.periodStartsAt,
            period_ends_at: data.periodEndsAt,
            trial_starts_at: data.trialStartsAt,
            trial_ends_at: data.trialEndsAt,
            line_items: formattedLineItems,
          });

        if (subscriptionError) {
          logger.error(
            { ...logContext, error: subscriptionError },
            'Failed to create subscription',
          );
          throw new Error('Failed to create subscription');
        }

        logger.info(
          { ...logContext, subscriptionId },
          'Manual subscription created successfully',
        );

        // Revalidate paths to update UI
        revalidatePath('/admin/accounts', 'page');
        revalidatePath(`/admin/accounts/${data.accountId}`, 'page');

        return {
          success: true,
          subscriptionId,
        };
      } catch (error) {
        logger.error(
          { ...logContext, error },
          'Unexpected error creating subscription',
        );
        throw error;
      }
    },
    {
      schema: CreateSubscriptionSchema,
    },
  ),
);

/**
 * Update an existing subscription
 */
export const updateSubscriptionAction = adminAction(
  enhanceAction(
    async (data, _user) => {
      const logger = await getLogger();
      const adminClient = getSupabaseServerClient({ admin: true });

      const logContext = {
        name: 'admin.update-subscription',
        accountId: data.accountId,
        subscriptionId: data.subscriptionId,
      };

      try {
        logger.info(logContext, 'Updating manual subscription');

        // First, get the existing subscription to get the customer ID
        const { data: existingSub, error: getSubError } = await adminClient
          .from('subscriptions')
          .select('billing_customer_id')
          .eq('id', data.subscriptionId)
          .single();

        if (getSubError || !existingSub) {
          logger.error(
            { ...logContext, error: getSubError },
            'Failed to find existing subscription',
          );
          throw new Error('Failed to find existing subscription');
        }

        // Get the customer record to get the customer_id
        const { data: customer, error: customerError } = await adminClient
          .from('billing_customers')
          .select('customer_id')
          .eq('id', existingSub.billing_customer_id)
          .single();

        if (customerError || !customer) {
          logger.error(
            { ...logContext, error: customerError },
            'Failed to find billing customer',
          );
          throw new Error('Failed to find billing customer');
        }

        // Find the product and plan from the billing config
        const product = billingConfig.products.find(
          (p) => p.id === data.productId,
        );
        const plan = product?.plans.find((p) => p.id === data.planId);

        if (!product || !plan) {
          throw new Error('Product or plan not found in billing config');
        }

        // Format the line items for the subscription
        const formattedLineItems = data.lineItems.map((item) => {
          // Find the line item in the plan
          const lineItemConfig = plan.lineItems.find(
            (li) => li.id === item.variantId,
          );

          if (!lineItemConfig) {
            throw new Error(
              `Line item ${item.variantId} not found in plan config`,
            );
          }

          return {
            id: item.variantId,
            product_id: product.id,
            variant_id: item.variantId,
            quantity: item.quantity,
            price_amount: lineItemConfig.cost,
            interval: plan.interval ?? 'month',
            interval_count: 1,
            type: lineItemConfig.type,
            subscription_id: data.subscriptionId,
          };
        });

        // Update the subscription using the upsert_subscription function
        const { error: subscriptionError } = await adminClient.rpc(
          'upsert_subscription',
          {
            target_account_id: data.accountId,
            target_customer_id: customer.customer_id,
            target_subscription_id: data.subscriptionId,
            active: data.active,
            status: data.status,
            billing_provider: 'manual',
            cancel_at_period_end: false,
            currency: data.currency,
            period_starts_at: data.periodStartsAt,
            period_ends_at: data.periodEndsAt,
            trial_starts_at: data.trialStartsAt,
            trial_ends_at: data.trialEndsAt,
            line_items: formattedLineItems,
          },
        );

        if (subscriptionError) {
          logger.error(
            { ...logContext, error: subscriptionError },
            'Failed to update subscription',
          );
          throw new Error('Failed to update subscription');
        }

        logger.info(
          { ...logContext },
          'Manual subscription updated successfully',
        );

        // Revalidate paths to update UI
        revalidatePath('/admin/accounts', 'page');
        revalidatePath(`/admin/accounts/${data.accountId}`, 'page');

        return {
          success: true,
        };
      } catch (error) {
        logger.error(
          { ...logContext, error },
          'Unexpected error updating subscription',
        );
        throw error;
      }
    },
    {
      schema: UpdateSubscriptionSchema,
    },
  ),
);

/**
 * Cancel an existing subscription
 */
export const cancelSubscriptionAction = adminAction(
  enhanceAction(
    async (data, _user) => {
      const logger = await getLogger();
      const adminClient = getSupabaseServerClient({ admin: true });

      const logContext = {
        name: 'admin.cancel-subscription',
        subscriptionId: data.subscriptionId,
      };

      try {
        logger.info(logContext, 'Canceling manual subscription');

        // Update the subscription status
        const { error } = await adminClient
          .from('subscriptions')
          .update({
            status: 'canceled',
            active: false,
          })
          .eq('id', data.subscriptionId);

        if (error) {
          logger.error(
            { ...logContext, error },
            'Failed to cancel subscription',
          );
          throw new Error('Failed to cancel subscription');
        }

        logger.info(
          { ...logContext },
          'Manual subscription canceled successfully',
        );

        // Revalidate paths to update UI
        revalidatePath('/admin/accounts', 'page');

        return {
          success: true,
        };
      } catch (error) {
        logger.error(
          { ...logContext, error },
          'Unexpected error canceling subscription',
        );
        throw error;
      }
    },
    {
      schema: CancelSubscriptionSchema,
    },
  ),
);
