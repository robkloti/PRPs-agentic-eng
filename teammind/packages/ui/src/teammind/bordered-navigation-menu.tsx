'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '../shadcn/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '../shadcn/navigation-menu';
import { cn, isRouteActive } from '../utils';
import { Trans } from './trans';

export function BorderedNavigationMenu(props: React.PropsWithChildren) {
  return (
    <NavigationMenu>
      <NavigationMenuList
        className={
          'relative flex h-full rounded-lg border bg-muted/30 p-1 shadow-sm backdrop-blur-md'
        }
      >
        {props.children}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function BorderedNavigationMenuItem(props: {
  path: string;
  label: React.ReactNode | string;
  end?: boolean | ((path: string) => boolean);
  active?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  const pathname = usePathname();
  let isActive = props.active;

  if (isActive === undefined) {
    // Special case for accountHome and accountChat
    const isAccountHomePath = /\/home\/[^/]+$/.exec(props.path); // Matches /home/{account}
    const isAccountChatPath = /\/home\/[^/]+\/chat$/.exec(pathname); // Matches /home/{account}/chat

    if (
      isAccountHomePath &&
      isAccountChatPath &&
      props.path.split('/')[2] === pathname.split('/')[2]
    ) {
      // Ensure same account
      isActive = true;
    } else {
      isActive = isRouteActive(props.path, pathname, props.end);
    }
  }

  return (
    <NavigationMenuItem className={cn('flex-1', props.className)}>
      <Button
        asChild
        variant={'ghost'}
        className={cn(
          'relative w-full justify-center rounded-md px-3 py-1.5 text-sm transition-all',
          isActive ? 'border bg-background shadow-sm' : 'hover:bg-muted/50',
          props.buttonClassName,
        )}
      >
        <Link
          href={props.path}
          className={cn('text-sm', {
            'font-semibold text-foreground': isActive,
            'text-muted-foreground': !isActive,
          })}
        >
          {typeof props.label === 'string' ? (
            <Trans i18nKey={props.label} defaults={props.label} />
          ) : (
            props.label
          )}
        </Link>
      </Button>
    </NavigationMenuItem>
  );
}
