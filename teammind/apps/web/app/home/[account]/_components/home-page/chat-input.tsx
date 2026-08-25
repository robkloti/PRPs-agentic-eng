'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  BarChartIcon,
  ClipboardListIcon,
  FileTextIcon,
  FilterIcon,
  HelpCircleIcon,
  Lightbulb,
  PlusIcon,
  ScaleIcon,
  SearchIcon,
  SendIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { usePersonalAccountData } from '@tm/accounts/hooks/use-personal-account-data';
import { DocumentSource } from '@tm/ai/types';
import { Alert, AlertDescription } from '@tm/ui/alert';
import { Button } from '@tm/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tm/ui/dropdown-menu';

import { sourceIconMap } from '~/components/source-icons';
import { ConnectorsModal } from '~/home/[account]/_components/connectors';

const promptSuggestions = [
  { key: 'explain', defaultText: 'Explain me how to...', icon: HelpCircleIcon },
  {
    key: 'summarize',
    defaultText: 'Summarize this document...',
    icon: FileTextIcon,
  },
  {
    key: 'compare',
    defaultText: 'Compare these two concepts...',
    icon: ScaleIcon,
  },
  { key: 'find', defaultText: 'Find information about...', icon: SearchIcon },
  {
    key: 'analyze',
    defaultText: 'Analyze the following data...',
    icon: BarChartIcon,
  },
  {
    key: 'create',
    defaultText: 'Create a plan for...',
    icon: ClipboardListIcon,
  },
  {
    key: 'brainstorm',
    defaultText: 'Brainstorm ideas for...',
    icon: Lightbulb,
  },
];

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

interface Props {
  personalAccountId: string;
  accountSlug: string;
  connectorCount?: number;
  availableSources: DocumentSource[];
  onMessageSubmit?: (
    message: string,
    source?: DocumentSource | DocumentSource[],
  ) => void;
}

function getTimeBasedKey() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function ChatInput({
  personalAccountId,
  accountSlug,
  connectorCount = 0,
  availableSources = [],
  onMessageSubmit,
}: Props) {
  const [message, setMessage] = useState('');
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);
  const [selectedSources, setSelectedSources] =
    useState<DocumentSource[]>(availableSources);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { t } = useTranslation('chat');
  const accountName = usePersonalAccountData(personalAccountId);

  const timeKey = getTimeBasedKey();
  const greeting = t(`greetings.${timeKey}`, {
    username: accountName.data?.name ?? 'there',
  });

  useEffect(() => {
    setSelectedSources(availableSources);
  }, [availableSources]);

  const handleMessageSubmit = useCallback(
    (text: string) => {
      const trimmedMessage = text.trim();
      if (trimmedMessage) {
        if (onMessageSubmit) {
          onMessageSubmit(
            trimmedMessage,
            selectedSources.length > 0 ? selectedSources : undefined,
          );
          setMessage('');
        } else {
          sessionStorage.setItem('chatInitialMessage', trimmedMessage);
          // Also store selected sources if any
          if (selectedSources.length > 0) {
            sessionStorage.setItem(
              'chatInitialSources',
              JSON.stringify(selectedSources),
            );
          }
          router.push(`/home/${accountSlug}/chat`);
        }
      }
    },
    [router, accountSlug, onMessageSubmit, selectedSources],
  );

  const handleConnectorPrompt = useCallback(() => {
    setShowConnectorsModal(true);
  }, []);

  const handlePromptSelect = useCallback(
    (defaultText: string) => {
      if (connectorCount === 0) {
        handleConnectorPrompt();
        return;
      }
      setMessage(defaultText);
      // Focus the textarea after setting the message
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    [connectorCount, handleConnectorPrompt],
  );

  const toggleSourceSelection = useCallback(
    (source: DocumentSource) => {
      setSelectedSources((prev: DocumentSource[]) => {
        // If trying to deselect the only available source, prevent it
        if (prev.includes(source) && availableSources.length === 1) {
          return prev;
        }

        if (prev.includes(source)) {
          return prev.filter((s: DocumentSource) => s !== source);
        } else {
          return [...prev, source];
        }
      });
    },
    [availableSources.length],
  );

  const toggleAllSources = useCallback(() => {
    if (selectedSources.length === availableSources.length) {
      // If all are selected and there's more than one source, deselect all
      if (availableSources.length > 1) {
        setSelectedSources([]);
      }
      // If there's only one source, do nothing (keep it selected)
    } else {
      setSelectedSources([...availableSources]);
    }
  }, [availableSources, selectedSources]);

  const allSourcesSelected =
    selectedSources.length === availableSources.length &&
    availableSources.length > 0;
  const someSourcesSelected =
    selectedSources.length > 0 &&
    selectedSources.length < availableSources.length;

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-8 flex flex-col items-center">
        <h1 className="my-4 overflow-hidden text-ellipsis whitespace-nowrap text-center text-4xl">
          {greeting}
        </h1>
      </div>

      <div className="relative">
        <div className="relative flex rounded-lg border bg-card p-1 shadow-sm">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (connectorCount === 0) {
                  handleConnectorPrompt();
                  return;
                }
                handleMessageSubmit(message);
              }
            }}
            onClick={() => {
              if (connectorCount === 0) {
                handleConnectorPrompt();
              }
            }}
            disabled={connectorCount === 0}
            placeholder={
              connectorCount === 0
                ? t('connectors.inputDisabled')
                : t('greetings.placeholder')
            }
            className="h-32 w-full resize-none bg-transparent p-4 pr-12 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => handleMessageSubmit(message)}
            disabled={!message.trim() || connectorCount === 0}
            className="bg-brand-gradient hover:bg-brand-gradient/80 absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-2xl shadow-sm transition-opacity disabled:opacity-40"
          >
            <SendIcon className="size-5 text-white" />
          </button>

          <div className="absolute bottom-2 right-2">
            {availableSources.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    disabled={connectorCount === 0}
                  >
                    <FilterIcon className="size-3" />
                    <span>
                      {allSourcesSelected
                        ? t('sources.all')
                        : someSourcesSelected
                          ? `${selectedSources.length} ${t('sources.selected')}`
                          : t('sources.all')}
                    </span>
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
                    onClick={handleConnectorPrompt}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {t('sources.addMore')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
                onClick={handleConnectorPrompt}
              >
                <PlusIcon className="size-3" />
                <span>{t('sources.addSources')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-12 mt-6">
        {connectorCount === 0 ? (
          <Alert variant="info" className="mb-4">
            <AlertDescription>
              {t(
                'connectors.noConnectorsAlert',
                'Connect a data source to start chatting with your data.',
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* First row of buttons - centered */}
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {promptSuggestions.slice(0, 4).map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <Button
                    key={prompt.key}
                    variant="outline"
                    className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                    onClick={() =>
                      handlePromptSelect(
                        t(
                          `promptSuggestions.${prompt.key}.text`,
                          prompt.defaultText,
                        ),
                      )
                    }
                  >
                    {Icon && <Icon className="size-4" />}
                    {t(`promptSuggestions.${prompt.key}.title`, prompt.key)}
                  </Button>
                );
              })}
            </div>

            {/* Second row of buttons - centered */}
            <div className="flex flex-wrap justify-center gap-2">
              {promptSuggestions.slice(4).map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <Button
                    key={prompt.key}
                    variant="outline"
                    className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                    onClick={() =>
                      handlePromptSelect(
                        t(
                          `promptSuggestions.${prompt.key}.text`,
                          prompt.defaultText,
                        ),
                      )
                    }
                  >
                    {Icon && <Icon className="size-4" />}
                    {t(`promptSuggestions.${prompt.key}.title`, prompt.key)}
                  </Button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Connectors Modal */}
      <ConnectorsModal
        isOpen={showConnectorsModal}
        onClose={() => setShowConnectorsModal(false)}
        userId={personalAccountId}
        accountSlug={accountSlug}
      />
    </div>
  );
}
