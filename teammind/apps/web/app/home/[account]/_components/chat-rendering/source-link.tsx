import { FC } from 'react';

import { FileText } from 'lucide-react';

import { DocumentSource } from '@tm/ai';
import { cn } from '@tm/ui/utils';

import { sourceIconMap } from '~/components/source-icons';

export interface SourceInfo {
  identifier: string;
  source: DocumentSource;
  title: string;
  url: string;
}

export const SourceLink: FC<
  Omit<SourceInfo, 'identifier'> & { fullWidth?: boolean }
> = ({ source, title, url, fullWidth = false }) => {
  const Icon = sourceIconMap[source] || FileText;

  const baseChipStyles = cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium transition-colors',
    'bg-secondary/30 text-muted-foreground dark:bg-secondary/40',
    'hover:bg-secondary/40 hover:text-secondary-foreground dark:hover:bg-secondary/50',
    fullWidth ? 'w-full' : 'max-w-[150px]',
    'overflow-hidden',
  );

  const iconContainerStyles = 'flex-shrink-0 mr-1.5 size-3.5';
  const textStyles = cn('truncate text-xs', fullWidth && 'flex-1 text-md');

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={baseChipStyles}
      title={title}
    >
      <span className={iconContainerStyles}>
        <Icon className="h-full w-full" />
      </span>
      <span className={textStyles}>{title}</span>
    </a>
  );
};
