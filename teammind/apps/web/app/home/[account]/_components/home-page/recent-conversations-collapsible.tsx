'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale/de';
import { enUS } from 'date-fns/locale/en-US';
import { BookmarkCheck, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardHeader, CardTitle } from '@tm/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@tm/ui/collapsible';
import { Trans } from '@tm/ui/trans';

import {
  useFavoriteConversations,
  useRecentConversations,
} from '~/home/_hooks';

interface Props {
  account: string;
  userId: string;
}

export function RecentConversationsCollapsible({ account, userId }: Props) {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites'>('recent');

  const { data: recentConversations = [], isLoading: isLoadingRecent } =
    useRecentConversations(userId, 6);

  const { data: favoriteConversations = [], isLoading: isLoadingFavorites } =
    useFavoriteConversations(userId, 6);

  const conversations =
    activeTab === 'recent' ? recentConversations : favoriteConversations;
  const isLoading =
    activeTab === 'recent' ? isLoadingRecent : isLoadingFavorites;

  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mt-8 w-full max-w-6xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger className="flex items-center gap-2">
            <ChevronDown
              className={`h-5 w-5 transform transition-transform duration-200 ${
                isOpen ? '' : '-rotate-90'
              }`}
            />
          </CollapsibleTrigger>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-1 text-sm font-semibold ${
                activeTab === 'recent'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary/80'
              }`}
            >
              <Trans i18nKey="chat:recentChats" />
            </button>

            <span className="text-muted-foreground">|</span>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-1 text-sm font-semibold ${
                activeTab === 'favorites'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary/80'
              }`}
            >
              <Trans i18nKey="chat:favoriteChats" />
            </button>
          </div>
        </div>

        <Link
          href={`/home/${account}/chat/history${activeTab === 'favorites' ? '?favorite=true' : ''}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          <Trans i18nKey="chat:viewAll" /> →
        </Link>
      </div>

      <CollapsibleContent className="transition-all duration-200">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-[120px] rounded-md border bg-card p-4 shadow-sm"
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted"></div>
                  </div>
                </div>
              ))}
          </div>
        ) : conversations?.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/home/${account}/chat?id=${conversation.id}`}
                className="block"
              >
                <Card className="relative h-[120px] transition-colors hover:bg-accent">
                  {conversation.favourite && (
                    <div className="absolute right-2 top-2">
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <CardHeader className="flex h-full flex-col justify-between">
                    <CardTitle className="line-clamp-2 text-sm font-medium">
                      {conversation.title ?? (
                        <Trans i18nKey="chat:newConversation" />
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.created_at), {
                        addSuffix: true,
                        locale:
                          {
                            de: de,
                            en: enUS,
                            // TODO other languages as needed
                          }[i18n.language] ?? enUS,
                      })}
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-md border p-6 text-center">
            <div className="mb-6 flex justify-center">
              <Image
                src="/images/illustrations/chat-docs-humans.svg"
                alt="No conversations yet"
                width={110}
                height={60}
                className="object-contain"
              />
            </div>
            <p className="text-muted-foreground">
              {activeTab === 'recent' ? (
                <Trans i18nKey="chat:noConversationsYet" />
              ) : (
                <Trans i18nKey="chat:noFavoritesYet" />
              )}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
