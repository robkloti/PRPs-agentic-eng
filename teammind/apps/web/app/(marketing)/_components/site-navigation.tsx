import Link from 'next/link';

import { Menu } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tm/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuList } from '@tm/ui/navigation-menu';
import { Trans } from '@tm/ui/trans';

import pathsConfig from '~/config/paths.config';

import { SiteNavigationItem } from './site-navigation-item';

const links = {
  // Blog: {
  //   label: 'marketing:blog',
  //   path: '/blog',
  // },
  // Docs: {
  //   label: 'marketing:documentation',
  //   path: '/docs',
  // },
  Pricing: {
    label: 'marketing:pricing',
    path: '/pricing',
  },
  FAQ: {
    label: 'marketing:faqTitle',
    path: '/faq',
  },
};

export function SiteNavigation() {
  const NavItems = Object.values(links).map((item) => {
    return (
      <SiteNavigationItem key={item.path} path={item.path}>
        <Trans i18nKey={item.label} />
      </SiteNavigationItem>
    );
  });

  return (
    <>
      <div className={'hidden items-center justify-center md:flex'}>
        <NavigationMenu>
          <NavigationMenuList
            className={
              'space-x-2 rounded-md bg-background/80 px-2 py-1 backdrop-blur-md'
            }
          >
            {NavItems}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className={'flex justify-center sm:items-center md:hidden'}>
        <MobileDropdown />
      </div>
    </>
  );
}

function MobileDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={'Open Menu'}>
        <Menu className={'h-8 w-8'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent className={'w-56'}>
        {Object.values(links).map((item) => {
          const className = 'flex w-full h-full items-center';

          return (
            <DropdownMenuItem key={item.path} asChild>
              <Link className={className} href={item.path}>
                <Trans i18nKey={item.label} />
              </Link>
            </DropdownMenuItem>
          );
        })}

        {/* Add sign-in button */}
        <DropdownMenuItem asChild className="mt-2 border-t pt-2">
          <Link
            className="flex h-full w-full items-center"
            href={pathsConfig.auth.signIn}
          >
            <Trans i18nKey={'auth:signIn'} />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
