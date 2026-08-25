'use client';

import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

import { useCaptureException } from '@tm/monitoring/hooks';
import { Alert, AlertDescription, AlertTitle } from '@tm/ui/alert';
import { Button } from '@tm/ui/button';
import { PageBody, PageHeader } from '@tm/ui/page';
import { Trans } from '@tm/ui/trans';

export default function BillingErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useCaptureException(error);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'common:billingTabLabel'} />}
        description={<Trans i18nKey={'common:billingTabDescription'} />}
      />

      <PageBody>
        <div className={'flex flex-col space-y-4'}>
          <Alert variant={'destructive'}>
            <ExclamationTriangleIcon className={'h-4'} />

            <AlertTitle>
              <Trans i18nKey={'billing:planPickerAlertErrorTitle'} />
            </AlertTitle>

            <AlertDescription>
              <Trans i18nKey={'billing:planPickerAlertErrorDescription'} />
            </AlertDescription>
          </Alert>

          <div>
            <Button variant={'outline'} onClick={reset}>
              <Trans i18nKey={'common:retry'} />
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
