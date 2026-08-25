import { PageBody } from '@tm/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';
import { CreateWrapper } from './_components/create-wrapper';

interface Props {
  params: Promise<{
    account: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('create:pageTitle');

  return {
    title,
  };
};

async function CreatPage({ params }: Props) {
  const { account } = await params;
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  return (
    <PageBody className="flex flex-col items-center p-2">
      <CreateWrapper accountId={accountId} />
    </PageBody>
  );
}

export default withI18n(CreatPage);
