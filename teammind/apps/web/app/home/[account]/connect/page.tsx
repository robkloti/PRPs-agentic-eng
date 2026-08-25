import { Card } from '@tm/ui/card';
import { PageBody, PageHeader } from '@tm/ui/page';
import { Trans } from '@tm/ui/trans';

import { ConnectorsContainer } from '~/home/[account]/_components/connectors';
import { loadUserWorkspace } from '~/home/_lib/server/load-user-workspace';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('connect:pageTitle');
  return {
    title,
  };
};

async function ConnectPage({ params }: { params: { account: string } }) {
  const { user } = await loadUserWorkspace();
  const { account } = await params;

  return (
    <div className="flex w-full flex-col items-center justify-center px-2 py-4">
      <Card className="h-full w-full max-w-6xl p-4 pb-6">
        <PageHeader
          title={<Trans i18nKey="connect:pageTitle" />}
          description={<Trans i18nKey="connect:pageDescription" />}
        />
        <PageBody>
          <ConnectorsContainer
            userId={user.id}
            accountSlug={account}
            enableRedirect={true}
          />
        </PageBody>
      </Card>
    </div>
  );
}

export default withI18n(ConnectPage);
