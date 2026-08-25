import { createBillingSchema } from '@tm/billing';

export default createBillingSchema({
  provider: 'manual',
  products: [
    {
      id: 'prod_think',
      name: 'billing.product.think.name',
      description: 'billing.product.think.description',
      currency: 'EUR',
      badge: 'billing.product.think.badge',
      enableDiscountField: true,
      usageLimits: {
        chatCharactersPerFiveHours: 100000, // Characters per 5 hours
        meetingHoursPerMonth: 0, // No meeting hours
      },
      plans: [
        {
          name: 'billing.plan.think_monthly.name',
          id: 'think_monthly',
          paymentType: 'recurring',
          interval: 'month',
          href: '/get-access',
          trialDays: 7,
          lineItems: [
            {
              id: 'price_think_monthly',
              name: 'billing.line_item.think.name',
              cost: 5.99,
              type: 'per_seat',
              tiers: [
                {
                  upTo: 50,
                  cost: 5.99,
                },
                {
                  upTo: 'unlimited',
                  cost: 4.99,
                },
              ],
            },
          ],
        },
        {
          name: 'billing.plan.think_yearly.name',
          id: 'think_yearly',
          paymentType: 'recurring',
          interval: 'year',
          href: '/get-access',
          trialDays: 7,
          lineItems: [
            {
              id: 'price_think_yearly',
              name: 'billing.line_item.think.name',
              cost: 59.99,
              type: 'per_seat',
              tiers: [
                {
                  upTo: 50,
                  cost: 59.99,
                },
                {
                  upTo: 'unlimited',
                  cost: 49.99,
                },
              ],
            },
          ],
        },
      ],
      features: [
        'billing.feature.think.knowledge_hub',
        'billing.feature.think.search_discovery',
        'billing.feature.think.context_assistant',
      ],
    },
    {
      id: 'prod_think_create',
      name: 'billing.product.think_create.name',
      description: 'billing.product.think_create.description',
      currency: 'EUR',
      badge: 'billing.product.think_create.badge',
      highlighted: true,
      enableDiscountField: true,
      usageLimits: {
        chatCharactersPerFiveHours: 500000, // Characters per 5 hours
        meetingHoursPerMonth: 5, // 5 hours of meetings per month
      },
      plans: [
        {
          name: 'billing.plan.think_create_monthly.name',
          id: 'think_create_monthly',
          paymentType: 'recurring',
          interval: 'month',
          href: '/get-access',
          trialDays: 7,
          lineItems: [
            {
              id: 'price_think_create_monthly',
              name: 'billing.line_item.think_create.name',
              cost: 11.99,
              type: 'per_seat',
              tiers: [
                {
                  upTo: 50,
                  cost: 11.99,
                },
                {
                  upTo: 'unlimited',
                  cost: 9.99,
                },
              ],
            },
          ],
        },
        {
          name: 'billing.plan.think_create_yearly.name',
          id: 'think_create_yearly',
          paymentType: 'recurring',
          interval: 'year',
          href: '/get-access',
          trialDays: 7,
          lineItems: [
            {
              id: 'price_think_create_yearly',
              name: 'billing.line_item.think_create.name',
              cost: 119.99,
              type: 'per_seat',
              tiers: [
                {
                  upTo: 50,
                  cost: 119.99,
                },
                {
                  upTo: 'unlimited',
                  cost: 99.99,
                },
              ],
            },
          ],
        },
      ],
      features: [
        'billing.feature.think_create.everything_think',
        'billing.feature.think_create.knowledge_hub',
        'billing.feature.think_create.meeting_coverage',
        'billing.feature.think_create.document_generation',
        'billing.feature.think_create.content_management',
      ],
    },
    {
      id: 'prod_think_create_pro',
      name: 'billing.product.think_create_pro.name',
      description: 'billing.product.think_create_pro.description',
      currency: 'EUR',
      badge: 'billing.product.think_create_pro.badge',
      enableDiscountField: true,
      usageLimits: {
        chatCharactersPerFiveHours: 2000000, // Characters per 5 hours
        meetingHoursPerMonth: 10, // 10 hours of meetings per month
      },
      plans: [
        {
          name: 'billing.plan.think_create_pro_monthly.name',
          id: 'think_create_pro_monthly',
          paymentType: 'recurring',
          interval: 'month',
          href: '/get-access',
          trialDays: 7,
          lineItems: [
            {
              id: 'price_think_create_pro_monthly',
              name: 'billing.line_item.think_create_pro.name',
              cost: 19.99,
              type: 'per_seat',
              tiers: [
                {
                  upTo: 50,
                  cost: 19.99,
                },
                {
                  upTo: 'unlimited',
                  cost: 17.99,
                },
              ],
            },
          ],
        },
        {
          name: 'billing.plan.think_create_pro_yearly.name',
          id: 'think_create_pro_yearly',
          paymentType: 'recurring',
          interval: 'year',
          href: '/get-access',
          trialDays: 7,
          lineItems: [
            {
              id: 'price_think_create_pro_yearly',
              name: 'billing.line_item.think_create_pro.name',
              cost: 199.99,
              type: 'per_seat',
              tiers: [
                {
                  upTo: 50,
                  cost: 199.99,
                },
                {
                  upTo: 'unlimited',
                  cost: 179.99,
                },
              ],
            },
          ],
        },
      ],
      features: [
        'billing.feature.think_create.everything_think',
        'billing.feature.think_create_pro.knowledge_hub',
        'billing.feature.think_create_pro.meeting_coverage',
        'billing.feature.think_create_pro.analytics_reporting',
        'billing.feature.think_create_pro.support_assistance',
      ],
    },
  ],
});
