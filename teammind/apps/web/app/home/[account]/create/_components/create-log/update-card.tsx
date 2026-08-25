import { useRef } from 'react';

import {
  Check,
  ExternalLink,
  File,
  FileIcon,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@tm/ui/context-menu';

import { sourceIconMap } from '~/components/source-icons';

import { DocumentUpdateAction } from './types';

interface UpdateCardProps {
  update: DocumentUpdateAction;
  onViewDetails: () => void;
  onExecute: () => void;
  onDismiss: () => void;
  onRevert: () => void;
  isProcessing: boolean;
  processingId: string | null;
  isFolder?: boolean;
}

export function UpdateCard({
  update,
  onViewDetails,
  onExecute,
  onDismiss,
  onRevert,
}: UpdateCardProps) {
  const { t } = useTranslation('create');
  const isPending = update.status === 'pending';
  const isExecuted = update.status === 'executed';

  const SourceIcon = sourceIconMap[update.source] || FileIcon;

  // Add click tracking for handling double clicks
  const clickRef = useRef({
    clickCount: 0,
    lastClickTime: 0,
  });

  const handleCardClick = (e: React.MouseEvent) => {
    const currentTime = new Date().getTime();
    const timeSinceLastClick = currentTime - clickRef.current.lastClickTime;

    // Reset click count if it's been more than 300ms since last click
    if (timeSinceLastClick > 300) {
      clickRef.current.clickCount = 0;
    }

    clickRef.current.clickCount += 1;
    clickRef.current.lastClickTime = currentTime;

    // If this is a double click, prevent the second click event from propagating
    // This prevents the sheet from being dismissed immediately
    if (clickRef.current.clickCount === 2) {
      e.stopPropagation();
      clickRef.current.clickCount = 0;

      // Add a small delay to ensure we don't have click conflicts
      setTimeout(() => {
        onViewDetails();
      }, 50);
    } else if (clickRef.current.clickCount === 1) {
      // For single clicks, wait to see if a second click is coming
      setTimeout(() => {
        if (clickRef.current.clickCount === 1) {
          onViewDetails();
          clickRef.current.clickCount = 0;
        }
      }, 300);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={handleCardClick}
          className="w-full cursor-pointer rounded-md p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start space-x-4">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <File strokeWidth={1.1} className="h-14 w-14" />
              <div className="absolute inset-0 flex translate-y-1 items-center justify-center">
                <SourceIcon className="h-5 w-5 text-white/80" />
              </div>

              {/* Status indicator for pending */}
              {isPending && (
                <div className="bg-brand-gradient absolute right-2 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background" />
              )}
            </div>

            {/* Title and subtitle */}
            <div className="min-w-0 flex-1">
              <h3 className="max-w-full truncate text-sm font-medium">
                {update.title ?? t('untitledAction')}
              </h3>
              {update.meetings?.title && (
                <p className="max-w-full truncate text-xs text-muted-foreground">
                  {update.meetings.title}
                </p>
              )}
              {update.meetings?.time_start && (
                <p className="max-w-full truncate text-xs text-muted-foreground">
                  {new Date(update.meetings.time_start).toLocaleString(
                    undefined,
                    {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    },
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onViewDetails}>
          <FileIcon className="mr-2 h-4 w-4" />
          {t('details')}
        </ContextMenuItem>

        {isPending ? (
          <>
            <ContextMenuItem onClick={onExecute}>
              <Check className="mr-2 h-4 w-4" />
              {t('execute')}
            </ContextMenuItem>
            <ContextMenuItem onClick={onDismiss}>
              <X className="mr-2 h-4 w-4" />
              {t('dismiss')}
            </ContextMenuItem>
          </>
        ) : (
          <>
            {isExecuted && (
              <ContextMenuItem onClick={onRevert}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('viewVersionHistory')}
              </ContextMenuItem>
            )}
            {update.url && (
              <ContextMenuItem
                onClick={() => window.open(update.url!, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('open')}
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
