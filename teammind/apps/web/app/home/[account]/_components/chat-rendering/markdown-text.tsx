'use client';

import { ComponentProps, FC, memo, useEffect, useState } from 'react';

import { useMessage } from '@assistant-ui/react';
import {
  CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import '@assistant-ui/react-markdown/styles/dot.css';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, CopyIcon, UserIcon } from 'lucide-react';
import remarkGfm from 'remark-gfm';

import { DocumentSource } from '@tm/ai/types';
import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { TooltipIconButton } from '@tm/ui/tooltip-icon-button';
import { cn } from '@tm/ui/utils';

import { Database } from '~/lib/database.types';

import {
  FootnoteLink,
  SourcesFooter,
  customizeFootnotes,
  footnoteManager,
  hideReferencedDocs,
} from './footnotes';
import { SourceInfo } from './source-link';

type GetUserPictureUrl =
  Database['public']['Functions']['get_user_picture_url_by_source_user_id']['Returns'];

interface UserMentionProps {
  sourceUserId: string;
  source: DocumentSource;
  displayName: string;
}

const MarkdownTextImpl: FC = () => {
  const message = useMessage();
  const messageId = message?.id || 'unknown';
  const [sources, setSources] = useState<SourceInfo[]>([]);

  useEffect(() => {
    // Reset footnotes when component mounts
    footnoteManager.resetFootnotes(messageId);

    // Initial check for any footnotes
    setSources(footnoteManager.getFootnotes(messageId));

    // Check once more after the markdown has processed
    const timer = setTimeout(() => {
      setSources(footnoteManager.getFootnotes(messageId));
    }, 1000);

    return () => clearTimeout(timer);
  }, [messageId]);

  return (
    <div>
      <MarkdownTextPrimitive
        remarkPlugins={[
          remarkGfm,
          () => customizeFootnotes(messageId),
          hideReferencedDocs,
        ]}
        className="aui-md"
        components={customComponents}
      />
      <SourcesFooter sources={sources} />
    </div>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

// Rest of the component stays the same
const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-t-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
      <span className="lowercase [&>span]:text-xs">{language}</span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard
      .writeText(value)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), copiedDuration);
      })
      .catch((error) => {
        console.error('Failed to copy text: ', error);
      });
  };

  return { isCopied, copyToClipboard };
};

// Custom Link with special handling for mentions
export const CustomLink: FC<ComponentProps<'a'>> = (props) => {
  const { href, children, className, ...rest } = props;

  if (!href || !children) return null;

  // Check if this is our special footnote link
  if (className?.includes('footnote-link')) {
    return (
      <FootnoteLink href={href} {...rest}>
        {children}
      </FootnoteLink>
    );
  }

  const childText =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : // eslint-disable-next-line @typescript-eslint/no-base-to-string
          String(children);

  // Try to extract mention info
  const mentionInfo = extractMentionInfo(href, childText);
  if (mentionInfo) {
    return (
      <UserMention
        sourceUserId={mentionInfo.sourceUserId}
        source={mentionInfo.source}
        displayName={mentionInfo.displayName}
      />
    );
  }

  // Default link handling - all links (including footnote links) will open in a new tab
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn('text-primary underline hover:text-primary/90', className)}
    >
      {children}
    </a>
  );
};

const UserMention: FC<UserMentionProps> = ({
  sourceUserId,
  source,
  displayName,
}) => {
  const supabase = useSupabase();
  const { data: pictureUrl } = useQuery({
    queryKey: ['userPictureUrl', sourceUserId, source],
    queryFn: () => UserMentionFetcher(supabase)(sourceUserId, source),
  });

  const baseChipStyles = cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium transition-colors',
    'bg-primary/10 text-primary dark:bg-primary/20',
    'hover:bg-primary/20 hover:text-primary dark:hover:bg-primary/30 dark:hover:text-primary-foreground',
    'min-w-30 transform translate-y-[4px]',
  );

  const iconContainerStyles = 'flex-shrink-0 mr-2 size-5';

  return (
    <span className={baseChipStyles}>
      <span className={iconContainerStyles}>
        {pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pictureUrl}
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <UserIcon className="h-full w-full" />
        )}
      </span>
      <span className="truncate">{displayName}</span>
    </span>
  );
};

// Helper function
const UserMentionFetcher = (supabase: ReturnType<typeof useSupabase>) => {
  return async (
    sourceUserId: string,
    source: DocumentSource,
  ): Promise<GetUserPictureUrl> => {
    const { data, error } = await supabase.rpc(
      'get_user_picture_url_by_source_user_id',
      {
        source_user_id: sourceUserId,
        source,
      },
    );

    if (error) throw error;
    return data;
  };
};

function extractMentionInfo(
  href: string | undefined,
  text: string,
): {
  sourceUserId: string;
  source: DocumentSource;
  displayName: string;
} | null {
  if (!href) return null;

  const hrefMatch = /^\/mentions\/(\w+)\/([^/]+)$/.exec(href);
  const textMatch = /^@(.+)$/.exec(text);

  if (!hrefMatch || !textMatch) return null;

  const [, source, sourceUserId] = hrefMatch;
  const [, displayName] = textMatch;

  if (!source || !sourceUserId || !displayName) return null;

  return {
    sourceUserId,
    source: source as DocumentSource,
    displayName,
  };
}

// Create memoized components with our custom link handler
const customComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        'mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0',
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        'mb-4 mt-8 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0',
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        'mb-4 mt-6 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0',
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        'mb-4 mt-6 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0',
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        'my-4 text-lg font-semibold first:mt-0 last:mb-0',
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn('my-4 font-semibold first:mt-0 last:mb-0', className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn('mb-5 mt-5 leading-7 first:mt-0 last:mb-0', className)}
      {...props}
    />
  ),
  a: CustomLink,
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn('border-l-2 pl-6 italic', className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn('my-5 ml-6 list-disc [&>li]:mt-2', className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn('my-5 ml-6 list-decimal [&>li]:mt-2', className)}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn('my-5 border-b', className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <table
      className={cn(
        'my-5 w-full border-separate border-spacing-0 overflow-y-auto',
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        'bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right',
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        'border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right',
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        'm-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg',
        className,
      )}
      {...props}
    />
  ),
  sup: ({ className, ...props }) => (
    <sup
      className={cn(
        'rounded-[2px] bg-neutral-300 px-1 py-0.5 text-xs text-primary shadow-sm dark:bg-neutral-700',
        '[&>a]:no-underline [&>a]:hover:text-primary/90',
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        'overflow-x-auto rounded-b-lg bg-black p-4 text-white',
        className,
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            'rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
});
