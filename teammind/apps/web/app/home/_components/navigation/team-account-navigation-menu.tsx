import {
  BorderedNavigationMenu,
  BorderedNavigationMenuItem,
} from '@tm/ui/bordered-navigation-menu';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { getTeamAccountMainNavConfig } from '~/config/team-account-navigation.config';

import { TeamAccountWorkspace } from '../../[account]/_lib/server/team-account-workspace.loader';
import { TeamAccountNotifications } from './team-account-notifications';

export function TeamAccountNavigationMenu(props: {
  workspace: TeamAccountWorkspace;
}) {
  const { account, user } = props.workspace;

  const routes = getTeamAccountMainNavConfig(account.slug).routes.reduce<
    Array<{
      path: string;
      label: string;
      Icon?: React.ReactNode;
      end?: boolean | ((path: string) => boolean);
    }>
  >((acc, item) => {
    if ('children' in item) {
      return [...acc, ...item.children];
    }

    if ('divider' in item) {
      return acc;
    }

    return [...acc, item];
  }, []);

  return (
    <div className="fixed left-0 top-0 z-50 w-full">
      <div className="mx-auto grid h-14 w-full grid-cols-3 items-center px-4">
        <div className="flex items-center">
          <AppLogo hideTextOnMobile={true} />
        </div>

        <div className="flex items-center justify-center">
          <BorderedNavigationMenu>
            {routes.map((route) => (
              <BorderedNavigationMenuItem {...route} key={route.path} />
            ))}
          </BorderedNavigationMenu>
        </div>

        <div className="flex justify-end space-x-2.5">
          <TeamAccountNotifications accountId={account.id} userId={user.id} />

          <ProfileAccountDropdownContainer
            collapsed={true}
            user={user}
            account={account}
          />
        </div>
      </div>
    </div>
  );
}
