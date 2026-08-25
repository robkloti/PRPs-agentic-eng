import { usePersonalAccountData } from '@tm/accounts/hooks/use-personal-account-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tm/ui/card';
import { Heading } from '@tm/ui/heading';
import { PageBody } from '@tm/ui/page';
import { Trans } from '@tm/ui/trans';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { SupportForm } from './_components/support-form';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('support:pageTitle', 'Support');

  return {
    title,
  };
};

interface Props {
  params: Promise<{
    account: string;
  }>;
}

async function SupportPage({ params }: Props) {
  const { account } = await params;
  const workspace = await loadTeamWorkspace(account);
  const { user } = workspace;

  return (
    <>
      <PageBody>
        <div className={'flex w-full max-w-2xl flex-col space-y-6 pb-32'}>
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey={'support:pageTitle'} defaults="Support" />
              </CardTitle>
              <CardDescription>
                <Trans
                  i18nKey={'support:pageDescription'}
                  defaults="Need help? Submit a support request and our team will get back to you as soon as possible."
                />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupportForm
                userEmail={user.email!}
                userId={user.id}
                accountId={workspace.account.id}
                accountName={workspace.account.name}
              />
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(SupportPage);
