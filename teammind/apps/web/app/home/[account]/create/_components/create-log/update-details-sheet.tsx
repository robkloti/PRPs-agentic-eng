'use client';

import { useState } from 'react';

import Image from 'next/image';

import { Check, ExternalLink, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MarkdownPreview from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Transcript } from '@tm/ai/types';
import { Alert, AlertDescription } from '@tm/ui/alert';
import { Button } from '@tm/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@tm/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tm/ui/tabs';

import { DocumentUpdateAction } from './types';

interface UpdateDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  update: DocumentUpdateAction | null;
  onExecute?: (update: DocumentUpdateAction) => void;
  onDismiss?: (update: DocumentUpdateAction) => void;
  onRevert?: (update: DocumentUpdateAction) => void;
  isProcessing: boolean;
}

export function UpdateDetailsSheet({
  open,
  onOpenChange,
  update,
  onExecute,
  onDismiss,
  onRevert,
  isProcessing,
}: UpdateDetailsSheetProps) {
  const { t } = useTranslation('create');
  const [activeTab, setActiveTab] = useState('preview');

  if (!update) return null;

  const getSourceDisplayName = () => {
    const source = update.source;
    if (source === 'jira') {
      return t('ticket');
    } else if (source === 'confluence' || source === 'notion') {
      return t('document');
    } else if (source && typeof source === 'string' && source.length > 0) {
      return source.charAt(0).toUpperCase() + source.slice(1);
    }
    return t('source');
  };

  const isExecuted = update.status === 'executed';
  const isPending = update.status === 'pending';

  const transcriptData: Transcript =
    (update.meetings?.transcript as Transcript) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-t-md border sm:h-[80vh]"
      >
        {/* == Header == */}
        <SheetHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex w-full flex-col justify-between gap-3 md:flex-row md:items-start md:gap-4">
            <div className="space-y-0.5 md:flex-1">
              <SheetTitle className="text-base font-semibold sm:text-lg">
                {update.title ?? t('untitledUpdate')}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {t('fromMeeting')}:{' '}
                {update.meetings?.title ?? t('unknownMeeting')}
              </SheetDescription>
            </div>

            <div className="mt-3 flex w-full flex-row flex-wrap items-center justify-center gap-2 sm:justify-end md:mt-0 md:w-auto md:flex-shrink-0">
              {update.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(update.url!, '_blank')}
                >
                  <ExternalLink className="mr-1.5 h-3 w-3" /> {t('open')}{' '}
                  {getSourceDisplayName()}
                </Button>
              )}
              {isExecuted && onRevert && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRevert(update)}
                  disabled={isProcessing}
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  {t('viewVersionHistory')}
                </Button>
              )}
              {isPending && onDismiss && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDismiss(update)}
                  disabled={isProcessing}
                >
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  {t('dismiss')}
                </Button>
              )}
              {isPending && onExecute && (
                <Button
                  onClick={() => onExecute(update)}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-brand-gradient"
                >
                  <Check className="mr-1.5 h-3 w-3" />
                  {t('execute')}
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* == Main Content Area == */}
        <div className="flex flex-grow flex-col overflow-hidden px-6 py-4 md:flex-row md:gap-6">
          {/* Summary/Image Column (Mobile: Top, Desktop: Right) */}
          <div className="w-full flex-shrink-0 space-y-4 md:order-2 md:w-1/3">
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <Image
                src="/images/illustrations/update-docs-human.svg"
                alt="Document update illustration"
                width={150}
                height={150}
                className="mx-auto mb-6 hidden rounded-lg md:block"
              />
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground md:mt-4">
                {t('updateSummary')} ({getSourceDisplayName()})
              </h3>
              <p className="text-sm text-foreground">
                {update.update_summary ?? t('noSummaryAvailable')}
              </p>
            </div>
          </div>

          {/* Tabs Column (Mobile: Bottom, Desktop: Left) */}
          <div className="mt-4 flex min-h-0 flex-1 flex-col md:order-1 md:mt-0">
            <Tabs
              defaultValue="preview"
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex h-full w-full flex-col"
            >
              {/* Tab Triggers */}
              <div className="mb-4 flex-shrink-0 rounded-lg bg-muted p-1">
                <TabsList className="grid h-10 w-full grid-cols-2">
                  <TabsTrigger
                    className="h-8 text-xs sm:text-sm"
                    value="preview"
                  >
                    {t('previewChanges')}
                  </TabsTrigger>
                  <TabsTrigger
                    className="h-8 text-xs sm:text-sm"
                    value="transcript"
                  >
                    {t('transcript')}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content Panels */}
              <TabsContent
                value="preview"
                className="mt-0 flex-grow overflow-y-auto rounded-md border p-4"
              >
                <Alert variant="info" className="mb-4">
                  <AlertDescription>{t('previewNotice')}</AlertDescription>
                </Alert>
                {update.content_after ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <MarkdownPreview remarkPlugins={[remarkGfm]}>
                      {update.content_after}
                    </MarkdownPreview>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {t('noPreviewAvailable')}
                  </p>
                )}
              </TabsContent>

              <TabsContent
                value="transcript"
                className="mt-0 flex-grow overflow-y-auto rounded-md border p-4"
              >
                {transcriptData.length > 0 ? (
                  <div className="space-y-3 text-sm">
                    {transcriptData.map((item, index) => (
                      <div key={index} className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {item.speaker ?? t('unknownSpeaker')}:
                        </span>
                        <p className="text-muted-foreground">{item.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {t('noTranscriptAvailable')}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
