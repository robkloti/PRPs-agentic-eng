import { Sidebar, SidebarContent, SidebarNavigation } from '@tm/ui/sidebar';

import { getTeamAccountSettingsSidebarConfig } from '~/config/team-account-navigation.config';
import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';

import { SettingsMobileTabs } from './_components/settings-mobile-tabs';

interface Props {
  children: React.ReactNode;
  params: Promise<{
    account: string;
  }>;
}

interface Route {
  path: string;
  label: string;
  Icon: React.ReactNode;
}

export default async function SettingsLayout({ children, params }: Props) {
  // Load workspace data to get user permissions
  const { account } = await params;
  const workspace = await loadTeamWorkspace(account);
  const permissions = workspace.account.permissions || [];

  // Pass permissions to the navigation config
  const navigation = getTeamAccountSettingsSidebarConfig(account, permissions);
  const settingsRoutes = navigation.routes as Route[];

  if (!settingsRoutes.length) return null;

  return (
    <div className="relative flex flex-1 flex-col px-4 py-4 lg:container lg:flex-row">
      {/* Mobile Tab Switcher */}
      <div className="block space-y-4 lg:hidden">
        <SettingsMobileTabs routes={settingsRoutes} />
      </div>

      {/* Desktop Sidebar - Fixed position */}
      <div className="hidden lg:block lg:w-64">
        <div className="fixed w-64">
          <Sidebar className="border-none shadow-none">
            <SidebarContent className="space-y-2">
              <SidebarNavigation
                config={{
                  style: 'sidebar',
                  routes: settingsRoutes,
                }}
              />
            </SidebarContent>
          </Sidebar>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 lg:pt-2">{children}</div>
    </div>
  );
}
