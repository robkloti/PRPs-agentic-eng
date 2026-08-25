import * as React from 'react';

import { cn } from '../utils';

export type PageLayoutStyle = 'sidebar' | 'header' | 'custom';

type PageProps = React.PropsWithChildren<{
  style?: PageLayoutStyle;
  contentContainerClassName?: string;
  className?: string;
  sticky?: boolean;
}>;

export function Page(props: PageProps) {
  switch (props.style) {
    case 'sidebar':
      return <PageWithSidebar {...props} />;

    case 'header':
      return <PageWithHeader {...props} />;

    case 'custom':
      return props.children;

    default:
      return <PageWithSidebar {...props} />;
  }
}

function PageWithSidebar(props: PageProps) {
  const { Navigation, Children, MobileNavigation } = getSlotsFromPage(props);

  return (
    <div className={cn('flex', props.className)}>
      {Navigation}

      <div
        className={
          props.contentContainerClassName ??
          'mx-auto flex h-screen w-full flex-col overflow-y-auto px-4 lg:px-0'
        }
      >
        {MobileNavigation}

        <div className={'flex flex-1 flex-col space-y-4'}>{Children}</div>
      </div>
    </div>
  );
}

export function PageMobileNavigation(
  props: React.PropsWithChildren<{
    className?: string;
  }>,
) {
  return (
    <div className={cn('w-full py-2 lg:hidden', props.className)}>
      {props.children}
    </div>
  );
}

function PageWithHeader(props: PageProps) {
  const { Navigation, Children } = getSlotsFromPage(props);

  return (
    <div className={cn('flex h-screen flex-1 flex-col', props.className)}>
      <div
        className={props.contentContainerClassName ?? 'flex flex-1 flex-col'}
      >
        <div
          className={cn(
            'flex h-14 items-center justify-between px-4 lg:justify-start',
            {
              'sticky top-0 z-10': props.sticky ?? true,
            },
          )}
        >
          <div className={'flex w-full flex-1 items-center space-x-8'}>
            {Navigation}
          </div>

          {/* {MobileNavigation} */}
        </div>

        <div className={'flex h-screen flex-1 flex-col'}>{Children}</div>
      </div>
    </div>
  );
}

export function PageBody(
  props: React.PropsWithChildren<{
    className?: string;
  }>,
) {
  const className = cn('w-full flex flex-col flex-1 lg:px-4', props.className);

  return <div className={className}>{props.children}</div>;
}

export function PageNavigation(props: React.PropsWithChildren) {
  return <div className={'flex flex-1'}>{props.children}</div>;
}

export function PageDescription(props: React.PropsWithChildren) {
  return (
    <h2 className={'hidden lg:block'}>
      <span
        className={'text-base font-medium leading-none text-muted-foreground'}
      >
        {props.children}
      </span>
    </h2>
  );
}

export function PageTitle(props: React.PropsWithChildren) {
  return (
    <h1
      className={
        'font-heading text-2xl font-semibold leading-none dark:text-white'
      }
    >
      {props.children}
    </h1>
  );
}

export function PageHeader({
  children,
  title,
  description,
}: React.PropsWithChildren<{
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
}>) {
  return (
    <div className={'flex h-20 items-center justify-between lg:px-4'}>
      {title ? (
        <div className={'flex flex-col space-y-1.5'}>
          <PageTitle>{title}</PageTitle>

          <PageDescription>{description}</PageDescription>
        </div>
      ) : null}

      {children}
    </div>
  );
}

function getSlotsFromPage(props: React.PropsWithChildren) {
  return React.Children.toArray(props.children).reduce<{
    Children: React.ReactElement | null;
    Navigation: React.ReactElement | null;
    MobileNavigation: React.ReactElement | null;
  }>(
    (acc, child) => {
      if (!React.isValidElement(child)) {
        return acc;
      }

      if (child.type === PageNavigation) {
        return {
          ...acc,
          Navigation: child,
        };
      }

      if (child.type === PageMobileNavigation) {
        return {
          ...acc,
          MobileNavigation: child,
        };
      }

      return {
        ...acc,
        Children: child,
      };
    },
    {
      Children: null,
      Navigation: null,
      MobileNavigation: null,
    },
  );
}
