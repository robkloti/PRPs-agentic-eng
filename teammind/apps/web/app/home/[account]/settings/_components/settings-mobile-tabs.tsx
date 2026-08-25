'use client';

import { usePathname } from 'next/navigation';

import { Tabs, TabsList, TabsTrigger } from '@tm/ui/tabs';
import { Trans } from '@tm/ui/trans';

interface Route {
  path: string;
  label: string;
  Icon: React.ReactNode;
}

interface SettingsMobileTabsProps {
  routes: Route[];
}

export function SettingsMobileTabs({ routes }: SettingsMobileTabsProps) {
  const pathname = usePathname();

  return (
    <Tabs defaultValue={pathname}>
      <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
        {routes.map((route) => (
          <TabsTrigger
            key={route.path}
            value={route.path}
            className="flex items-center gap-2 whitespace-nowrap"
            asChild
          >
            <a href={route.path}>
              {route.Icon}
              <Trans i18nKey={route.label} />
            </a>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
