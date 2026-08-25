import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

import { Badge } from '@tm/ui/badge';
import { Button } from '@tm/ui/button';
import { Card, CardContent } from '@tm/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tm/ui/dialog';

import { SourceIcon } from '~/components/source-icons';
import { Database } from '~/lib/database.types';

import { useDocumentDetails, useRelatedDocuments } from './use-doc';

type QualityFlag =
  Database['public']['Tables']['document_quality_flags']['Row'];

interface FlagDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: QualityFlag | null;
  onResolve: (flag: QualityFlag) => void;
  onIgnore: (flag: QualityFlag) => void;
  isProcessing: boolean;
}

export function FlagDetailsDialog({
  open,
  onOpenChange,
  flag,
  onResolve,
  onIgnore,
  isProcessing,
}: FlagDetailsDialogProps) {
  const { t } = useTranslation('create');

  // Use the custom hooks to fetch document and related documents
  const { data: document, isLoading: isLoadingDoc } = useDocumentDetails(
    flag?.document_id ?? null,
  );

  const { data: relatedDocuments, isLoading: isLoadingRelated } =
    useRelatedDocuments(flag?.id ?? null);

  if (!flag) return null;

  const handleOpenDocument = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100vh] max-w-2xl overflow-y-auto sm:max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {isLoadingDoc
              ? t('loading')
              : (document?.title ?? `Document ID: ${flag.document_id}`)}
          </DialogTitle>
          <DialogDescription>
            {t('documentQualityIssue')}: {t(flag.flag_type)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-medium">{t('issueDetails')}</h3>
            <div className="rounded-md bg-muted p-4 text-sm">
              <Markdown>{flag.details}</Markdown>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm">
              {t('type')}: {t(flag.flag_type)}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {t('recommendedAction')}: {t(flag.recommended_action)}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {t('relevancyScore')}: {Math.round(flag.relevancy * 100)}%
            </Badge>
            {document && (
              <Badge variant="outline" className="text-sm">
                {t('source')}:{' '}
                {document.source.charAt(0).toUpperCase() +
                  document.source.slice(1)}
              </Badge>
            )}
          </div>

          {/* Related documents section */}
          {flag.recommended_action === 'merge' && (
            <div>
              <h3 className="mb-2 font-medium">{t('relatedDocuments')}</h3>
              {isLoadingRelated ? (
                <div className="flex items-center space-x-2 p-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span className="text-sm text-muted-foreground">
                    {t('loadingRelatedDocs')}
                  </span>
                </div>
              ) : relatedDocuments && relatedDocuments.length > 0 ? (
                <div className="space-y-2">
                  {relatedDocuments.map((doc) => (
                    <Card key={doc.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                          <div className="flex w-full items-center space-x-2 sm:w-auto">
                            <div className="rounded-full bg-primary/10 p-2">
                              <SourceIcon
                                source={doc.source}
                                className="h-3 w-3 text-primary"
                              />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {doc.title}
                            </span>
                          </div>
                          {doc.url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDocument(doc.url)}
                              className="w-full sm:w-auto"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {t('open')}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  {t('noRelatedDocuments')}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
          {flag.status === 'open' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onIgnore(flag)}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                {t('ignoreIssue')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolve(flag)}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('processing')}
                  </>
                ) : (
                  t('markAsSolved')
                )}
              </Button>
              <Button
                onClick={() => handleOpenDocument(document?.url)}
                disabled={!document?.url || isProcessing}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('open')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
