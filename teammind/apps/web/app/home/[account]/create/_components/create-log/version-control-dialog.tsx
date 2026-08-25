import Image from 'next/image';

import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DocumentSource } from '@tm/ai/types';
import { Button } from '@tm/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tm/ui/dialog';

interface VersionControlGuidanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: DocumentSource;
  documentTitle?: string;
  documentUrl?: string;
}

export function VersionControlGuidanceDialog({
  open,
  onOpenChange,
  source,
  documentUrl,
}: VersionControlGuidanceDialogProps) {
  const { t } = useTranslation('create');

  // Get source-specific guidance
  const getSourceGuidance = () => {
    switch (source) {
      case 'jira':
        return {
          title: t('useJiraVersionControl'),
          description: t('jiraVersionControlDescription'),
          steps: [
            t('jiraVersionStep1'),
            t('jiraVersionStep2'),
            t('jiraVersionStep3'),
          ],
        };
      case 'confluence':
        return {
          title: t('useConfluenceVersionControl'),
          description: t('confluenceVersionControlDescription'),
          steps: [
            t('confluenceVersionStep1'),
            t('confluenceVersionStep2'),
            t('confluenceVersionStep3'),
          ],
        };
      case 'notion':
        return {
          title: t('useNotionVersionControl'),
          description: t('notionVersionControlDescription'),
          steps: [
            t('notionVersionStep1'),
            t('notionVersionStep2'),
            t('notionVersionStep3'),
          ],
        };
      default:
        return {
          title: t('useSourceVersionControl'),
          description: t('sourceVersionControlDescription'),
          steps: [t('genericVersionStep1'), t('genericVersionStep2')],
        };
    }
  };

  const guidance = getSourceGuidance();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{guidance.title}</DialogTitle>
          <DialogDescription>{guidance.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <Image
            src="/images/illustrations/undo-docs-human.svg"
            alt="Version control illustration"
            width={220}
            height={180}
            className="mb-4"
          />

          <div className="mt-4 space-y-2 text-sm">
            {guidance.steps.map((step, index) => (
              <div key={index} className="flex items-start">
                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {index + 1}
                </span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          {documentUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(documentUrl, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('openInSource')}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>{t('gotIt')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
