import {
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Link2,
  Settings,
  User,
  Users,
  Video,
} from 'lucide-react';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

import { NavigationConfigSchema } from '../../../packages/ui/src/teammind/navigation-config.schema';

const iconClasses = 'w-4';

// Convert account name for URL usage (dots to dashes and encode special chars)
function createPath(path: string, account: string) {
  // Replace dots with dashes before encoding other special characters
  const accountWithDashes = account.replace(/\./g, '-');
  // Encode any other special characters
  const encodedAccount = encodeURIComponent(accountWithDashes);
  return path.replace('[account]', encodedAccount);
}

const getSettingsRoutes = (account: string, permissions: string[] = []) =>
  [
    // User profile settings always accessible
    {
      label: 'common:profileSettingsTabLabel',
      path: createPath('/home/[account]/settings/user', account),
      Icon: <User className={iconClasses} />,
    },
    // Team settings require settings.manage permission
    permissions.includes('settings.manage')
      ? {
        label: 'common:teamSettingsTabLabel',
        path: createPath('/home/[account]/settings/team', account),
        Icon: <Settings className={iconClasses} />,
      }
      : null,
    // Members page requires members.manage permission
    permissions.includes('members.manage')
      ? {
        label: 'common:accountMembers',
        path: createPath('/home/[account]/settings/members', account),
        Icon: <Users className={iconClasses} />,
      }
      : null,
    // Billing page requires billing.manage permission and feature flag
    featureFlagsConfig.enableTeamAccountBilling &&
      permissions.includes('billing.manage')
      ? {
        label: 'common:billingTabLabel',
        path: createPath('/home/[account]/settings/billing', account),
        Icon: <CreditCard className={iconClasses} />,
      }
      : null,
    // Connect page always accessible
    {
      label: 'common:connectTabLabel',
      path: createPath('/home/[account]/settings/connect', account),
      Icon: <Link2 className={iconClasses} />,
    },
    {
      label: 'common:supportTabLabel',
      path: createPath('/home/[account]/settings/support', account),
      Icon: <HelpCircle className="h-4 w-4" />,
    },
  ].filter(Boolean);

// !!! There is a special case handled in the border-navigation-menu.tsx file for the accountHome and accountChat paths
// !!! The special case is not handled in this file
// !!! It is for highlighting the correct tab in the navigation menu when the user is on the accountHome or accountChat page
const getMainNavRoutes = (account: string) => [
  {
    label: 'common:assistantTabLabel',
    path: createPath(pathsConfig.app.accountHome, account),
  },
  {
    label: 'common:createTabLabel',
    path: createPath(pathsConfig.app.accountCreate, account),
    end: true,
  },
  // {
  //   label: 'common:enactTabLabel',
  //   path: createPath(pathsConfig.app.accountEnact, account),
  //   end: true,
  // },
];

const getMobileNavRoutes = (account: string) => [
  {
    label: 'common:assistantTabLabel',
    path: createPath(pathsConfig.app.accountHome, account),
    Icon: <LayoutDashboard className={iconClasses} />,
  },
  {
    label: 'common:createTabLabel',
    path: createPath(pathsConfig.app.accountCreate, account),
    Icon: <Video className={iconClasses} />,
  },
  {
    label: 'common:settingsTabLabel',
    path: createPath('/home/[account]/settings', account),
    Icon: <Settings className={iconClasses} />,
  },
];

export function getTeamAccountMainNavConfig(account: string) {
  return NavigationConfigSchema.parse({
    routes: getMainNavRoutes(account),
    style: process.env.NEXT_PUBLIC_TEAM_NAVIGATION_STYLE,
  });
}

export function getTeamAccountMobileNavConfig(account: string) {
  return NavigationConfigSchema.parse({
    routes: getMobileNavRoutes(account),
    style: process.env.NEXT_PUBLIC_TEAM_NAVIGATION_STYLE,
  });
}

export function getTeamAccountSettingsSidebarConfig(
  account: string,
  permissions: string[] = [],
) {
  return NavigationConfigSchema.parse({
    routes: getSettingsRoutes(account, permissions),
  });
}