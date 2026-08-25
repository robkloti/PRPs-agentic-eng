import { FC, useCallback, useContext, useState } from 'react';

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useThreadViewport,
} from '@assistant-ui/react';
import {
  ArrowDownIcon,
  Bookmark,
  BookmarkCheck,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FilterIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DocumentSource } from '@tm/ai';
import { Button } from '@tm/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tm/ui/dropdown-menu';
import { ScrollAreaPrimitive, ScrollBar } from '@tm/ui/scroll-area';
import { TooltipIconButton } from '@tm/ui/tooltip-icon-button';
import { cn } from '@tm/ui/utils';

import { sourceIconMap } from '~/components/source-icons';
import { ConnectorsModal } from '~/home/[account]/_components/connectors';

import { ComposerAddAttachment, ComposerAttachments } from './attachments';
import { MarkdownText } from './markdown-text';
import {
  DisabledContext,
  useSourceFilterContext,
} from './source-filter-provider-context';

export const Thread: FC<{
  conversationTitle?: string | null;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  userId: string;
  accountSlug: string;
  isInSidebar?: boolean;
}> = ({
  conversationTitle = null,
  isFavourite = false,
  onToggleFavourite = () => {
    /* no-op */
  },
  userId,
  accountSlug,
  isInSidebar = false,
}) => {
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);

  return (
    <>
      <ScrollAreaPrimitive.Root asChild>
        <ThreadPrimitive.Root
          className="box-border flex h-full flex-col overflow-hidden bg-background pb-3 pt-6"
          style={{
            ['--thread-max-width' as string]: isInSidebar ? '100%' : '50rem',
            ['--thread-composer-max-width' as string]: isInSidebar ? '100%' : '55rem',
          }}
        >
          <ThreadPrimitive.If empty={false}>
            <div className={cn(
              "z-10 flex justify-center",
              isInSidebar ? "sticky top-0 left-0 right-0" : "fixed left-0 right-0 top-[58px]"
            )}>
              <ThreadHeader
                title={conversationTitle}
                isFavourite={isFavourite}
                onToggleFavourite={onToggleFavourite}
              />
            </div>
          </ThreadPrimitive.If>

          <ScrollAreaPrimitive.Viewport className="thread-viewport" asChild>
            <ThreadPrimitive.Viewport
              autoScroll={true}
              className="flex h-full flex-col items-center overflow-y-auto scroll-smooth bg-inherit px-4"
            >
              <ThreadWelcome />

              <ThreadPrimitive.Messages
                components={{
                  UserMessage: UserMessage,
                  AssistantMessage: AssistantMessage,
                  EditComposer,
                }}
              />

              <ThreadScrollToBottom />

              <ThreadPrimitive.If empty={false}>
                {/* This spacer ensures content can scroll up enough to be fully visible above the composer */}
                <div className={cn("min-h-8 flex-grow", isInSidebar ? "pb-40" : "pb-20")} />
              </ThreadPrimitive.If>
            </ThreadPrimitive.Viewport>
          </ScrollAreaPrimitive.Viewport>

          <ThreadScrollToBottom />

          <div className={cn(
            "bg-inherit", 
            isInSidebar ? "absolute bottom-0 left-0 right-0" : "fixed bottom-0 left-0 right-0"
          )}>
            <div className={cn(
              "w-full px-4 pb-4",
              isInSidebar ? "max-w-full" : "max-w-[var(--thread-composer-max-width)] mx-auto"
            )}>
              <Composer
                onOpenConnectorsModal={() => setShowConnectorsModal(true)}
                isInSidebar={isInSidebar}
              />
            </div>
          </div>
          <ScrollBar />
        </ThreadPrimitive.Root>
      </ScrollAreaPrimitive.Root>

      <ConnectorsModal
        isOpen={showConnectorsModal}
        onClose={() => setShowConnectorsModal(false)}
        userId={userId}
        accountSlug={accountSlug}
      />
    </>
  );
};

const ThreadHeader: FC<{
  title: string | null;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}> = ({ title, isFavourite, onToggleFavourite }) => {
  const { t } = useTranslation('chat');

  if (!title) return null;

  return (
    <div className="flex w-full max-w-[var(--thread-max-width)] justify-center">
      <div className="flex w-fit items-center rounded-lg border bg-muted/30 px-2 backdrop-blur-sm">
        <span className="max-w-xs truncate text-sm font-medium">{title}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          onClick={onToggleFavourite}
          aria-label={
            isFavourite ? t('removeFromBookmarks') : t('addToBookmarks')
          }
        >
          {isFavourite ? (
            <BookmarkCheck className="h-4 w-4 text-primary" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  const { t } = useTranslation('chat');
  const { isAtBottom, scrollToBottom } = useThreadViewport();

  if (isAtBottom) {
    return null;
  }

  return (
    <TooltipIconButton
      tooltip={t('scrollToBottom')}
      variant="outline"
      className="fixed bottom-24 right-4 z-50 h-8 w-8 rounded-full bg-background p-1 shadow-md"
      onClick={() => scrollToBottom()}
    >
      <ArrowDownIcon className="h-6 w-6" />
    </TooltipIconButton>
  );
};

const ThreadWelcome: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <p className="mt-4 font-medium">{t('howCanIHelpYouToday')}</p>
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ThreadWelcomeSuggestions: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <div className="mt-3 flex w-full items-stretch justify-center gap-4">
      <ThreadPrimitive.Suggestion
        className="flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in hover:bg-muted/80"
        prompt={t('whatIsTheWeatherInTokyo')}
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          {t('whatIsTheWeatherInTokyo')}
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in hover:bg-muted/80"
        prompt={t('whatIsAssistantUi')}
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          {t('whatIsAssistantUi')}
        </span>
      </ThreadPrimitive.Suggestion>
    </div>
  );
};

const Composer: FC<{
  onOpenConnectorsModal: () => void;
  isInSidebar?: boolean;
}> = ({ onOpenConnectorsModal, isInSidebar = false }) => {
  const { t } = useTranslation('chat');
  const { selectedSources, availableSources, setSelectedSources } =
    useSourceFilterContext();
  const isDisabled = useContext(DisabledContext);

  // Source labels mapping
  const sourceLabels: Record<DocumentSource, string> = {
    confluence: 'Confluence',
    jira: 'Jira',
    sharepoint: 'SharePoint',
    notion: 'Notion',
    pdf: 'PDF',
    google_drive: 'Google Drive',
    gmail: 'Gmail',
  };

  // Only show the sources dropdown if there are available sources
  const hasAvailableSources = availableSources.length > 0;

  const toggleSourceSelection = useCallback(
    (source: DocumentSource) => {
      setSelectedSources((prev: DocumentSource[]) => {
        if (prev.includes(source)) {
          return prev.filter((s: DocumentSource) => s !== source);
        } else {
          return [...prev, source];
        }
      });
    },
    [setSelectedSources],
  );

  const toggleAllSources = useCallback(() => {
    if (selectedSources.length === availableSources.length) {
      // If all are selected, deselect all
      setSelectedSources([]);
    } else {
      // Otherwise select all
      setSelectedSources([...availableSources]);
    }
  }, [availableSources, selectedSources, setSelectedSources]);

  const allSourcesSelected =
    selectedSources.length === availableSources.length &&
    availableSources.length > 0;

  return (
    <ComposerPrimitive.Root
      className={cn(
        "flex w-full flex-wrap items-center rounded-lg border bg-input px-2.5 shadow-sm transition-colors ease-in",
        isInSidebar && "mb-2",
        isDisabled && "hidden",
      )}
    >
      {/* <ComposerAttachments />
      <ComposerAddAttachment /> */}
      {hasAvailableSources && (
        <div className="flex items-center py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                aria-label={t('sources.selectSources')}
              >
                <FilterIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem
                checked={allSourcesSelected}
                onCheckedChange={toggleAllSources}
                className="font-medium"
              >
                {t('sources.all')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />

              {availableSources.map((source) => {
                const SourceIcon = sourceIconMap[source];
                return (
                  <DropdownMenuCheckboxItem
                    key={source}
                    checked={selectedSources.includes(source)}
                    onCheckedChange={() => toggleSourceSelection(source)}
                    className="flex items-center gap-2"
                  >
                    <div className="h-4 w-4 flex-shrink-0">
                      {SourceIcon && <SourceIcon className="h-4 w-4" />}
                    </div>
                    {sourceLabels[source] || source}
                  </DropdownMenuCheckboxItem>
                );
              })}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onOpenConnectorsModal}
                className="flex cursor-pointer items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                {t('sources.addMore')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder={t('typeYourMessage')}
        className="shadow-xs max-h-40 flex-grow resize-none bg-transparent px-2 py-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-0 disabled:cursor-not-allowed dark:border-gray-700"
      />
      <ComposerAction disabled={isDisabled} />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { t } = useTranslation('chat');

  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild disabled={disabled}>
          <TooltipIconButton
            tooltip={t('send')}
            variant="default"
            className="bg-brand-gradient hover:bg-brand-gradient/80 my-1.5 size-9 rounded-sm p-2 transition-opacity ease-in"
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip={t('cancel')}
            variant="default"
            className="hover:bg-brand-gradient/80 my-1.5 size-9 rounded-sm p-2 transition-opacity ease-in"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4 [&:where(>*)]:col-start-2">
      <UserActionBar />

      <div className="col-start-2 row-start-2 max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl bg-muted px-5 py-2.5 text-foreground">
        <MessagePrimitive.Content />
      </div>

      {/* <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" /> */}
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="col-start-1 row-start-2 mr-3 mt-2.5 flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip={t('edit')}>
          <PencilIcon className="h-4 w-4" />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <ComposerPrimitive.Root className="my-4 flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 rounded-xl bg-muted">
      <ComposerPrimitive.Input className="flex h-8 w-full resize-none bg-transparent p-4 pb-0 text-foreground outline-none" />

      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost">{t('cancel')}</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button>{t('send')}</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <div className="col-span-2 col-start-2 row-start-1 my-1.5 max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7 text-foreground">
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
      </div>

      <AssistantActionBar />

      {/* <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" /> */}
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  const { t } = useTranslation('chat');

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:bg-background data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip={t('copy')} className="group">
          <MessagePrimitive.If copied>
            <CheckIcon className="h-4 w-4" />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon className="h-4 w-4" />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip={t('refresh')} className="group">
          <RefreshCwIcon className="h-4 w-4" />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarPrimitive.FeedbackNegative asChild>
        <TooltipIconButton tooltip={t('feedback')} className="group">
          <ThumbsDownIcon className="h-4 w-4 group-data-[submitted]:fill-current" />
        </TooltipIconButton>
      </ActionBarPrimitive.FeedbackNegative>
      <ActionBarPrimitive.FeedbackPositive asChild>
        <TooltipIconButton tooltip={t('feedback')} className="group">
          <ThumbsUpIcon className="h-4 w-4 group-data-[submitted]:fill-current" />
        </TooltipIconButton>
      </ActionBarPrimitive.FeedbackPositive>

      <div className="col-span-2 col-start-2 row-start-3 mt-1.5 text-xs text-muted-foreground">
        {t('aiErrorNotice')}
      </div>
    </ActionBarPrimitive.Root>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        'inline-flex items-center text-xs text-muted-foreground',
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CircleStopIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      width="16"
      height="16"
    >
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};