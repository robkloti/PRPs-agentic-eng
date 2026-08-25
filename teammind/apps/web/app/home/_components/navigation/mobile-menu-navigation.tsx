'use client';

import Link from 'next/link';

import { LogOut, Menu } from 'lucide-react';

import { useSignOut } from '@tm/supabase/hooks/use-sign-out';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tm/ui/dropdown-menu';
import { Trans } from '@tm/ui/trans';

import { personalAccountNavigationConfig } from '~/config/personal-account-navigation.config';
import { getTeamAccountMobileNavConfig } from '~/config/team-account-navigation.config';

interface DropdownLinkProps {
  path: string;
  label: string;
  Icon: React.ReactNode;
}

function DropdownLink({ path, label, Icon }: DropdownLinkProps) {
  return (
    <DropdownMenuItem asChild>
      <Link
        href={path}
        className={'flex h-12 w-full items-center space-x-2 px-3'}
      >
        {Icon}
        <span>
          <Trans i18nKey={label} defaults={label} />
        </span>
      </Link>
    </DropdownMenuItem>
  );
}

function SignOutDropdownItem({ onSignOut }: { onSignOut: () => unknown }) {
  return (
    <DropdownMenuItem
      className={'flex h-12 w-full items-center space-x-2'}
      onClick={onSignOut}
    >
      <LogOut className={'h-4'} />
      <span>
        <Trans i18nKey={'common:signOut'} />
      </span>
    </DropdownMenuItem>
  );
}

export function MobileMenuNavigation({
  account,
  isTeamAccount = false,
}: {
  account?: string;
  isTeamAccount?: boolean;
}) {
  const signOut = useSignOut();

  const routes = isTeamAccount
    ? getTeamAccountMobileNavConfig(account!).routes
    : personalAccountNavigationConfig.routes;

  const Links = routes.map((item, index) => {
    if ('children' in item) {
      return item.children.map((child) => (
        <DropdownLink
          key={child.path}
          Icon={child.Icon}
          path={child.path}
          label={child.label}
        />
      ));
    }

    if ('divider' in item) {
      return <DropdownMenuSeparator key={index} />;
    }

    return (
      <DropdownLink
        key={item.path}
        Icon={item.Icon}
        path={item.path}
        label={item.label}
      />
    );
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Menu className={'h-9'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent sideOffset={10} className={'w-screen rounded-none'}>
        {Links}
        <DropdownMenuSeparator />
        <SignOutDropdownItem onSignOut={() => signOut.mutateAsync()} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
