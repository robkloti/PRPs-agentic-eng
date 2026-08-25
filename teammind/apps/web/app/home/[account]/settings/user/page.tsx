import { PersonalAccountSettingsContainer } from '@tm/accounts/personal-account-settings';
import { PageBody } from '@tm/ui/page';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';
import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

const features = {
  enableAccountDeletion: featureFlagsConfig.enableAccountDeletion,
};

const paths = {
  callback: pathsConfig.auth.callback + `?next=${pathsConfig.app.accountHome}`,
};

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:settingsTab');

  return {
    title,
  };
};

export default async function Page({
  params,
}: {
  params: Promise<{ account: string }>;
}) {
  const { account } = await params;
  const { user } = await loadTeamWorkspace(account);

  return (
    <>
      <PageBody>
        <div className={'flex w-full flex-1 flex-col lg:max-w-2xl'}>
          <PersonalAccountSettingsContainer
            userId={user.id}
            features={features}
            paths={paths}
          />
        </div>
      </PageBody>
    </>
  );
}
