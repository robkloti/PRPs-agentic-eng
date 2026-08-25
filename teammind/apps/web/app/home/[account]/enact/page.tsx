import { PageBody } from '@tm/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { EnactWrapper } from './_components/enact-wrapper';
import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';

interface Props {
  params: Promise<{
    account: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('enact:pageTitle');
  return {
    title,
  };
};

async function EnactPage({ params }: Props) {
  const { account } = await params;
  const { user } = await loadTeamWorkspace(account);

  return (
    <PageBody className="p-4 max-h-[calc(100vh-56px)]">
      <EnactWrapper userId={user.id} accountSlug={account} />
    </PageBody>
  );
}

export default withI18n(EnactPage);