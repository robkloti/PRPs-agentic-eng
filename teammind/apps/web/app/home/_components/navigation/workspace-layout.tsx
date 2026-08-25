import { cookies } from 'next/headers';

import { If } from '@tm/ui/if';
import { Page, PageLayoutStyle, PageNavigation } from '@tm/ui/page';

import { getTeamAccountMainNavConfig } from '~/config/team-account-navigation.config';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { loadTeamWorkspace } from '../../[account]/_lib/server/team-account-workspace.loader';
import { TeamAccountLayoutSidebar } from './team-account-layout-sidebar';
import { TeamAccountNavigationMenu } from './team-account-navigation-menu';
import { TeamsNavigationMenu } from './teams-navigation-menu';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  account?: string; // Optional for teams page
}

export async function WorkspaceLayout({
  children,
  account,
}: WorkspaceLayoutProps) {
  const style = account ? await getLayoutStyle(account) : 'header';

  // Load either full workspace data or just user data
  const user = await requireUserInServerComponent();
  const workspaceData = account ? await loadTeamWorkspace(account) : null;

  const accounts =
    workspaceData?.accounts.map(({ name, slug, picture_url }) => ({
      label: name,
      value: slug,
      image: picture_url,
    })) ?? [];

  return (
    <Page style={style}>
      <PageNavigation>
        <If condition={style === 'sidebar'}>
          {account && workspaceData && (
            <TeamAccountLayoutSidebar
              collapsed={false}
              account={account}
              accountId={workspaceData.account.id}
              accounts={accounts}
              user={user}
            />
          )}
        </If>

        <If condition={style === 'header'}>
          {account && workspaceData ? (
            <TeamAccountNavigationMenu workspace={workspaceData} />
          ) : (
            <TeamsNavigationMenu user={user} />
          )}
        </If>
      </PageNavigation>

      {/* <PageMobileNavigation className="fixed left-0 top-0 z-50 flex h-14 w-full items-center justify-between px-4">
        <AppLogo />
        <MobileMenuNavigation
          account={account}
          isTeamAccount={!!workspaceData}
        />
      </PageMobileNavigation> */}

      <div className={'flex h-screen flex-1 flex-col'}>{children}</div>
    </Page>
  );
}

async function getLayoutStyle(account: string) {
  return (
    ((await cookies()).get('layout-style')?.value as PageLayoutStyle) ??
    getTeamAccountMainNavConfig(account).style
  );
}
