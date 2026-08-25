import { Home, User } from 'lucide-react';

import pathsConfig from '~/config/paths.config';

import { NavigationConfigSchema } from '../../../packages/ui/src/teammind/navigation-config.schema';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:homeTabLabel',
    path: pathsConfig.app.home,
    Icon: <Home className={iconClasses} />,
    end: true,
  },
  {
    label: 'account:accountTabLabel',
    path: pathsConfig.app.personalAccountSettings,
    Icon: <User className={iconClasses} />,
  },
];

export const personalAccountNavigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_USER_NAVIGATION_STYLE,
});
