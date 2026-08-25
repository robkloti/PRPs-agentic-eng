'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import type { User } from '@supabase/supabase-js';

import { ChevronRight } from 'lucide-react';

import { PersonalAccountDropdown } from '@tm/accounts/personal-account-dropdown';
import { useSignOut } from '@tm/supabase/hooks/use-sign-out';
import { useUser } from '@tm/supabase/hooks/use-user';
import { Button } from '@tm/ui/button';
import { If } from '@tm/ui/if';
import { Trans } from '@tm/ui/trans';

import featuresFlagConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const ModeToggle = dynamic(
  () => import('@tm/ui/mode-toggle').then((mod) => mod.ModeToggle),
  {
    ssr: false,
  },
);

const paths = {
  home: pathsConfig.app.home,
  personalAccountSettings: pathsConfig.app.personalAccountSettings,
};

const features = {
  enableThemeToggle: featuresFlagConfig.enableThemeToggle,
};

export function SiteHeaderAccountSection({
  user,
}: React.PropsWithChildren<{
  user: User | null;
}>) {
  if (!user) {
    return <AuthButtons />;
  }

  return <SuspendedPersonalAccountDropdown user={user} />;
}

function SuspendedPersonalAccountDropdown(props: { user: User | null }) {
  const signOut = useSignOut();
  const user = useUser(props.user);
  const userData = user.data ?? props.user ?? null;

  if (userData) {
    return (
      <PersonalAccountDropdown
        paths={paths}
        features={features}
        user={userData}
        signOutRequested={() => signOut.mutateAsync()}
      />
    );
  }

  return <AuthButtons />;
}

function AuthButtons() {
  const textClassName =
    'text-gray-600 hover:text-current dark:text-gray-400 dark:hover:text-white';

  return (
    <div className={'flex space-x-2'}>
      <div className={'hidden space-x-0.5 md:flex'}>
        <If condition={features.enableThemeToggle}>
          <ModeToggle className={textClassName} />
        </If>

        <Button
          asChild
          variant={'outline'}
          className={textClassName + 'ml-2 bg-background/80 backdrop-blur-md'}
        >
          <Link href={pathsConfig.auth.signIn}>
            <Trans i18nKey={'auth:signIn'} />
          </Link>
        </Button>
      </div>

      <Button asChild className="group" variant={'default'}>
        <Link href={pathsConfig.app.getAccess}>
          <Trans i18nKey={'marketing:getStartedButton'} />

          <ChevronRight
            className={
              'ml-1 h-4 w-4 transition-transform duration-500 group-hover:translate-x-1'
            }
          />
        </Link>
      </Button>
    </div>
  );
}
