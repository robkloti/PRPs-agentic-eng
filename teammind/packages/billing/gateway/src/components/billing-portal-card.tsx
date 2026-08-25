'use client';

import { useRouter } from 'next/navigation';

import { ArrowUpRight } from 'lucide-react';

import { Button } from '@tm/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tm/ui/card';
import { Trans } from '@tm/ui/trans';

interface BillingPortalCardProps {
  isManualBilling?: boolean;
  accountSlug?: string;
}

export function BillingPortalCard({
  isManualBilling = false,
  accountSlug,
}: BillingPortalCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (isManualBilling && accountSlug) {
      router.push(`/home/${accountSlug}/settings/support`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isManualBilling ? (
            <Trans
              i18nKey="billing:manualBillingCardTitle"
              defaults="Need Billing Help?"
            />
          ) : (
            <Trans i18nKey="billing:billingPortalCardTitle" />
          )}
        </CardTitle>

        <CardDescription>
          {isManualBilling ? (
            <Trans
              i18nKey="billing:manualBillingCardDescription"
              defaults="For billing inquiries or changes to your subscription, please contact our support team."
            />
          ) : (
            <Trans i18nKey="billing:billingPortalCardDescription" />
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className={'space-y-2'}>
        <div>
          <Button
            data-test={
              isManualBilling
                ? 'contact-support-button'
                : 'manage-billing-redirect-button'
            }
            onClick={isManualBilling ? handleClick : undefined}
            type={isManualBilling ? 'button' : 'submit'}
          >
            <span>
              {isManualBilling ? (
                <Trans
                  i18nKey="billing:manualBillingCardButton"
                  defaults="Contact Support"
                />
              ) : (
                <Trans i18nKey="billing:billingPortalCardButton" />
              )}
            </span>

            <ArrowUpRight className={'h-4'} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
