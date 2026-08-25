import { PageBody } from '@tm/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { WorkspaceLayout } from '../_components/navigation/workspace-layout';
import { HomeAccountsList } from './_components/home-accounts-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:homePage');
  return {
    title,
  };
};

function TeamsPage() {
  return (
    <WorkspaceLayout>
      <PageBody>
        <HomeAccountsList />
      </PageBody>
    </WorkspaceLayout>
  );
}
export default withI18n(TeamsPage);
