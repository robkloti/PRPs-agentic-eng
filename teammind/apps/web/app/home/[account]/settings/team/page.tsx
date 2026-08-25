import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { createTeamAccountsApi } from '@tm/team-accounts/api';
import { TeamAccountSettingsContainer } from '@tm/team-accounts/components';
import { PageBody } from '@tm/ui/page';

import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('teams:settings:pageTitle');

  return {
    title,
  };
};

interface Props {
  params: Promise<{
    account: string;
  }>;
}

const paths = {
  teamAccountSettings: pathsConfig.app.accountSettings,
};

async function TeamAccountSettingsPage(props: Props) {
  const api = createTeamAccountsApi(getSupabaseServerClient());
  const params = await props.params;
  const data = await api.getTeamAccount(params.account);

  const account = {
    id: data.id,
    name: data.name,
    pictureUrl: data.picture_url,
    slug: data.slug as string,
    primaryOwnerUserId: data.primary_owner_user_id,
  };

  return (
    <>
      <PageBody>
        <div className="w-full">
          <TeamAccountSettingsContainer account={account} paths={paths} />
        </div>
      </PageBody>
    </>
  );
}

export default TeamAccountSettingsPage;
