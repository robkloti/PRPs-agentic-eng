'use client';

import { useState, useTransition } from 'react';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { PlanPicker } from '@tm/billing-gateway/components';
import billingConfig from '@tm/billing/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tm/ui/card';
import { Trans } from '@tm/ui/trans';

import { createTeamAccountCheckoutSession } from '../_lib/server/server-actions';

const EmbeddedCheckout = dynamic(
  async () => {
    const { EmbeddedCheckout } = await import('@tm/billing-gateway/checkout');

    return {
      default: EmbeddedCheckout,
    };
  },
  {
    ssr: false,
  },
);

export function TeamAccountCheckoutForm(params: {
  accountId: string;
  customerId: string | null | undefined;
  isManualBilling?: boolean;
}) {
  const routeParams = useParams();
  const accountSlug = routeParams.account as string;
  const [pending, startTransition] = useTransition();

  const [checkoutToken, setCheckoutToken] = useState<string | undefined>(
    undefined,
  );

  // If the checkout token is set, render the embedded checkout component
  if (checkoutToken) {
    return (
      <EmbeddedCheckout
        checkoutToken={checkoutToken}
        provider={billingConfig.provider}
        onClose={() => setCheckoutToken(undefined)}
      />
    );
  }

  // only allow trial if the user is not already a customer
  const canStartTrial = !params.customerId;

  // Otherwise, render the plan picker component
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans i18nKey={'billing:manageTeamPlan'} />
        </CardTitle>

        <CardDescription>
          <Trans i18nKey={'billing:manageTeamPlanDescription'} />
        </CardDescription>
      </CardHeader>

      <CardContent>
        <PlanPicker
          pending={pending}
          config={billingConfig}
          canStartTrial={canStartTrial}
          isManualBilling={params.isManualBilling}
          accountSlug={accountSlug}
          onSubmit={({ planId, productId }) => {
            // Only proceed with checkout for non-manual billing
            if (!params.isManualBilling) {
              startTransition(async () => {
                const slug = routeParams.account as string;

                const { checkoutToken } =
                  await createTeamAccountCheckoutSession({
                    planId,
                    productId,
                    slug,
                    accountId: params.accountId,
                  });

                setCheckoutToken(checkoutToken);
              });
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
