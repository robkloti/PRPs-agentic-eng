// This user settings page is accessible in case the user has not created a team account yet
import { PersonalAccountSettingsContainer } from '@tm/accounts/personal-account-settings';
import { PageBody, PageHeader } from '@tm/ui/page';
import { Trans } from '@tm/ui/trans';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { WorkspaceLayout } from '../_components/navigation/workspace-layout';
import { loadUserWorkspace } from '../_lib/server/load-user-workspace';

const features = {
  enableAccountDeletion: featureFlagsConfig.enableAccountDeletion,
};

const paths = {
  callback: pathsConfig.auth.callback + `?next=${pathsConfig.app.accountHome}`,
};

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('common:profileSettingsTabLabel');

  return {
    title,
  };
};
async function UserSettingsPage() {
  const { user } = await loadUserWorkspace();

  return (
    <WorkspaceLayout>
      <PageHeader
        title={<Trans i18nKey={'common:profileSettingsTabLabel'} />}
        description={<Trans i18nKey={'common:settingsTabDescription'} />}
      />
      <PageBody>
        <div className={'flex w-full flex-1 flex-col lg:max-w-2xl'}>
          <PersonalAccountSettingsContainer
            userId={user.id}
            features={features}
            paths={paths}
          />
        </div>
      </PageBody>
    </WorkspaceLayout>
  );
}
export default withI18n(UserSettingsPage);
