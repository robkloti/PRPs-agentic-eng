import { ComponentProps, FC } from 'react';

import { FileText } from 'lucide-react';

import { DocumentSource } from '@tm/ai/types';
import { cn } from '@tm/ui/utils';

// Source icon mapping
export const sourceIconMap: Record<
  DocumentSource,
  FC<ComponentProps<'svg'>>
> = {
  confluence: (props) => {
    const { className } = props;
    return <SourceIcon source="confluence" className={className} />;
  },
  notion: (props) => {
    const { className } = props;
    return <SourceIcon source="notion" className={className} />;
  },
  sharepoint: (props) => {
    const { className } = props;
    return <SourceIcon source="sharepoint" className={className} />;
  },
  google_drive: (props) => {
    const { className } = props;
    return <SourceIcon source="google_drive" className={className} />;
  },
  gmail: (props) => {
    const { className } = props; 
    return <SourceIcon source="gmail" className={className} />;
  },
  jira: (props) => {
    const { className } = props;
    return <SourceIcon source="jira" className={className} />;
  },
  pdf: FileText,
} as const;

// Source icon component for custom icons
export const SourceIcon: FC<{ source: DocumentSource; className?: string }> = ({
  source,
  className,
}) => {
  const iconPath = `/images/connectors/${source}-icon.svg`;

  // Return SVG image for sources that have custom icons
  if (
    ['confluence', 'jira', 'notion', 'sharepoint', 'google_drive', 'gmail'].includes(
      source,
    )
  ) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconPath}
        alt={`${source} icon`}
        className={cn(
          'h-full w-full',
          'dark:brightness-200 dark:invert',
          className,
        )}
      />
    );
  }

  return null;
};
