'use client';

import { ComponentPropsWithoutRef, forwardRef } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radix-ui/react-tooltip';

import { cn } from '../utils';
import { Button } from './button';

export type TooltipIconButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  tooltip: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  delayDuration?: number;
};

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(
  (
    {
      children,
      tooltip,
      side = 'bottom',
      sideOffset = 4,
      delayDuration = 200,
      className,
      ...rest
    },
    ref,
  ) => {
    return (
      <TooltipProvider delayDuration={delayDuration}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              {...rest}
              className={cn(
                'size-5 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'mr-1 mt-1 active:scale-95',
                className,
              )}
              ref={ref}
            >
              {children}
              <span className="sr-only">{tooltip}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={side}
            sideOffset={sideOffset}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900"
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

TooltipIconButton.displayName = 'TooltipIconButton';
