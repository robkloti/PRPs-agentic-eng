import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

import {
  BillingPortalCard,
  CurrentLifetimeOrderCard,
  CurrentSubscriptionCard,
} from '@tm/billing-gateway/components';
import billingConfig from '@tm/billing/config';
import { Alert, AlertDescription, AlertTitle } from '@tm/ui/alert';
import { If } from '@tm/ui/if';
import { PageBody } from '@tm/ui/page';
import { Trans } from '@tm/ui/trans';
import { cn } from '@tm/ui/utils';

import { loadTeamAccountBillingPage } from '~/home/[account]/_lib/server/team-account-billing-page.loader';
import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

// local imports
import { TeamAccountCheckoutForm } from './_components/team-account-checkout-form';
import { createBillingPortalSession } from './_lib/server/server-actions';

interface Params {
  params: Promise<{
    account: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('teams:billing.pageTitle');

  return {
    title,
  };
};

async function TeamAccountBillingPage({ params }: Params) {
  const { account } = await params;
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  const [data, customerId] = await loadTeamAccountBillingPage(accountId);

  const canManageBilling =
    workspace.account.permissions.includes('billing.manage');

  const Checkout = () => {
    if (!canManageBilling) {
      return <CannotManageBillingAlert />;
    }

    // Check if billing provider is manual
    const billingProvider = data?.billing_provider ?? billingConfig.provider;
    const isManualBilling = billingProvider === 'manual';

    return (
      <TeamAccountCheckoutForm
        customerId={customerId}
        accountId={accountId}
        isManualBilling={isManualBilling}
      />
    );
  };

  const BillingPortal = () => {
    if (!canManageBilling) {
      return null;
    }

    if (!customerId) {
      return null;
    }

    // Check if billing provider is manual
    const billingProvider = data?.billing_provider ?? billingConfig.provider;
    const isManualBilling = billingProvider === 'manual';

    // For manual billing, render the modified portal card without the form
    if (isManualBilling) {
      return <BillingPortalCard isManualBilling={true} accountSlug={account} />;
    }

    // For other billing providers, use the standard form
    return (
      <form action={createBillingPortalSession}>
        <input type="hidden" name={'accountId'} value={accountId} />
        <input type="hidden" name={'slug'} value={account} />

        <BillingPortalCard />
      </form>
    );
  };

  return (
    <>
      <PageBody>
        <div
          className={cn(`flex w-full flex-col space-y-4`, {
            'max-w-2xl': data,
          })}
        >
          <If
            condition={data}
            fallback={
              <div>
                <Checkout />
              </div>
            }
          >
            {(data) => {
              if ('active' in data) {
                return (
                  <CurrentSubscriptionCard
                    subscription={data}
                    config={billingConfig}
                  />
                );
              }

              return (
                <CurrentLifetimeOrderCard order={data} config={billingConfig} />
              );
            }}
          </If>

          <BillingPortal />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountBillingPage);

function CannotManageBillingAlert() {
  return (
    <Alert variant={'warning'}>
      <ExclamationTriangleIcon className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'billing:cannotManageBillingAlertTitle'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'billing:cannotManageBillingAlertDescription'} />
      </AlertDescription>
    </Alert>
  );
}
