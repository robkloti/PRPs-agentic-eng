'use client';

import { FC, useState } from 'react';

import { PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@tm/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@tm/ui/sheet';

import { SourceInfo, SourceLink } from '../source-link';

interface SourcesFooterProps {
  sources: SourceInfo[];
}

export const SourcesFooter: FC<SourcesFooterProps> = ({ sources }) => {
  const { t } = useTranslation('chat');
  const [isOpen, setIsOpen] = useState(false);

  if (sources.length === 0) {
    return null;
  }

  const displayedSources = sources.slice(0, 3);
  const hasMoreSources = sources.length > 3;

  return (
    <div className="mt-4 mb-1 flex flex-wrap items-center gap-2 border-t pt-2">
      <div className="text-xs text-muted-foreground">
        {t('sources.references')}:
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {displayedSources.map((source, index) => (
          <SourceLink
            key={`${source.url}-${index}`}
            source={source.source}
            title={source.title}
            url={source.url}
          />
        ))}

        {hasMoreSources && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{t('sources.allReferences')}</SheetTitle>
                <SheetDescription>
                  {t('sources.allReferencesDescription')}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-2 w-full">
                {sources.map((source, index) => (
                  <SourceLink
                    key={`${source.url}-${index}`}
                    source={source.source}
                    title={source.title}
                    url={source.url}
                    fullWidth
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
};
