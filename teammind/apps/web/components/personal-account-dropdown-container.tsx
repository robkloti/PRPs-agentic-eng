'use client';

import type { User } from '@supabase/supabase-js';

import { PersonalAccountDropdown } from '@tm/accounts/personal-account-dropdown';
import { useSignOut } from '@tm/supabase/hooks/use-sign-out';
import { useUser } from '@tm/supabase/hooks/use-user';

import featuresFlagConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const paths = {
  home: pathsConfig.app.home,
  personalAccountSettings: pathsConfig.app.personalAccountSettings,
};

const features = {
  enableThemeToggle: featuresFlagConfig.enableThemeToggle,
};

export function ProfileAccountDropdownContainer(props: {
  collapsed: boolean;
  user: User;

  account?: {
    id: string | null;
    name: string | null;
    picture_url: string | null;
  };
}) {
  const signOut = useSignOut();
  const user = useUser(props.user);
  const userData = user.data as User;

  return (
    <div className={props.collapsed ? '' : 'w-full'}>
      <PersonalAccountDropdown
        className={'w-full'}
        paths={paths}
        features={features}
        showProfileName={!props.collapsed}
        user={userData}
        account={props.account}
        signOutRequested={() => signOut.mutateAsync()}
      />
    </div>
  );
}
