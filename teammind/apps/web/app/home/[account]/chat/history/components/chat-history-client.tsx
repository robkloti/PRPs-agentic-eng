'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';
import { enUS } from 'date-fns/locale/en-US';
import { Bookmark, BookmarkCheck, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Button } from '@tm/ui/button';
import { Card, CardHeader, CardTitle } from '@tm/ui/card';
import { Checkbox } from '@tm/ui/checkbox';
import { Input } from '@tm/ui/input';
import { Spinner } from '@tm/ui/spinner';
import { Toggle } from '@tm/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tm/ui/tooltip';
import { Trans } from '@tm/ui/trans';

import { useDebounce } from '~/home/_hooks';
import { Database } from '~/lib/database.types';

type Conversation = Omit<
  Database['public']['Tables']['conversations']['Row'],
  'user_id' | 'updated_at' | 'shared_with_team'
>;
interface ChatHistoryClientProps {
  initialConversations: Conversation[];
  accountSlug: string;
  userId: string;
  initialFavoriteFilter: boolean;
}

const PAGE_SIZE = 20;

export function ChatHistoryClient({
  initialConversations,
  accountSlug,
  userId,
  initialFavoriteFilter,
}: ChatHistoryClientProps) {
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1); // Start at 1 since we have initial data
  const [totalCount, setTotalCount] = useState<number>(0);
  const [showFavorites, setShowFavorites] = useState(initialFavoriteFilter);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<
    Record<string, boolean>
  >({});

  const lastElementRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = useSupabase();
  const { t } = useTranslation();
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Update URL when filter changes
  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams.toString());

    if (showFavorites) {
      currentParams.set('favorite', 'true');
    } else {
      currentParams.delete('favorite');
    }

    const newUrl = `/home/${accountSlug}/chat/history${
      currentParams.toString() ? `?${currentParams.toString()}` : ''
    }`;

    router.replace(newUrl, { scroll: false });
  }, [showFavorites, accountSlug, router, searchParams]);

  const fetchTotalCount = useCallback(async () => {
    try {
      let query = supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (debouncedSearch) {
        query = query.ilike('title', `%${debouncedSearch}%`);
      }

      if (showFavorites) {
        query = query.eq('favourite', true);
      }

      const { count } = await query;
      setTotalCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching conversation count:', error);
    }
  }, [userId, debouncedSearch, supabase, showFavorites]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    try {
      setIsLoading(true);

      let query = supabase
        .from('conversations')
        .select('id, title, created_at, favourite')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (debouncedSearch) {
        query = query.ilike('title', `%${debouncedSearch}%`);
      }

      if (showFavorites) {
        query = query.eq('favourite', true);
      }

      const { data } = await query;

      if (data) {
        setConversations((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage((p) => p + 1);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    debouncedSearch,
    hasMore,
    isLoading,
    page,
    supabase,
    showFavorites,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { threshold: 0.5 },
    );

    if (lastElementRef.current) {
      observer.observe(lastElementRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const fetchInitialResults = async () => {
      try {
        setIsLoading(true);

        await fetchTotalCount();

        let query = supabase
          .from('conversations')
          .select('id, title, created_at, favourite')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (debouncedSearch) {
          query = query.ilike('title', `%${debouncedSearch}%`);
        }

        if (showFavorites) {
          query = query.eq('favourite', true);
        }

        const { data } = await query;
        if (data) {
          setConversations(data);
          setHasMore(data.length === PAGE_SIZE);
          setPage(1);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInitialResults();
  }, [debouncedSearch, userId, supabase, fetchTotalCount, showFavorites]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleCheckboxChange = (id: string) => {
    if (!isSelecting) {
      setIsSelecting(true);
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleDelete = async () => {
    if (!selectedIds.length) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      // Update local state
      setSelectedIds([]);
      setConversations((prev) =>
        prev.filter((conv) => !selectedIds.includes(conv.id)),
      );

      // Fetch updated total count after deletion
      await fetchTotalCount();
    } catch (error) {
      console.error('Error deleting conversations:', error);
    }
  };

  const handleCardClick = (conversationId: string) => {
    if (isSelecting) {
      handleCheckboxChange(conversationId);
    } else {
      router.push(`/home/${accountSlug}/chat?id=${conversationId}`);
    }
  };

  const toggleFavorite = async (
    conversationId: string,
    currentStatus: boolean,
  ) => {
    try {
      setIsTogglingFavorite((prev) => ({ ...prev, [conversationId]: true }));

      const { error } = await supabase
        .from('conversations')
        .update({ favourite: !currentStatus })
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, favourite: !currentStatus }
            : conv,
        ),
      );

      if (showFavorites && currentStatus) {
        // Remove from list if we're in favorites mode and we're unfavoriting
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId),
        );
        await fetchTotalCount(); // Update count
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
    } finally {
      setIsTogglingFavorite((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('chat:history.search')}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={showFavorites}
                onPressedChange={setShowFavorites}
                aria-label={t('chat:history.showFavorites')}
              >
                <Bookmark
                  className={`h-4 w-4 ${showFavorites ? 'fill-primary' : ''}`}
                />
                <span className="sr-only">
                  <Trans i18nKey="chat:history.showFavorites" />
                </span>
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <Trans i18nKey="chat:history.showFavorites" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {!isSelecting ? (
        <div className="flex h-[36px] items-center justify-start">
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey={
                showFavorites
                  ? 'chat:history.favoritesCount'
                  : debouncedSearch
                    ? 'chat:history.previousChatsWithSearch'
                    : 'chat:history.previousChats'
              }
              values={{
                count: totalCount,
                ...(debouncedSearch && { query: debouncedSearch }),
              }}
            />
            <span
              className="ml-1 cursor-pointer text-primary hover:underline"
              onClick={() => setIsSelecting(true)}
            >
              <Trans i18nKey="chat:history.select" />
            </span>
          </p>
        </div>
      ) : (
        <div className="flex h-[36px] items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} / {totalCount}{' '}
            <Trans i18nKey="chat:history.selected" />
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSelecting(false);
                setSelectedIds([]);
              }}
            >
              <Trans i18nKey="chat:history.cancel" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedIds(conversations.map((c) => c.id))}
              disabled={conversations.length === 0}
            >
              <Trans i18nKey="chat:history.selectAll" />
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="shrink-0"
              disabled={selectedIds.length === 0}
            >
              <Trans i18nKey="chat:history.deleteSelected" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {conversations.map((conversation, index) => (
          <Card
            key={conversation.id}
            className={`group relative cursor-pointer transition-colors hover:bg-accent ${
              selectedIds.includes(conversation.id)
                ? 'border-primary bg-accent'
                : ''
            }`}
            ref={index === conversations.length - 1 ? lastElementRef : null}
          >
            <div
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${isSelecting ? 'visible' : 'invisible group-hover:visible'}`}
            >
              <Checkbox
                checked={selectedIds.includes(conversation.id)}
                onCheckedChange={() => handleCheckboxChange(conversation.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-5 w-5"
              />
            </div>

            <div
              className="invisible absolute right-4 top-1/2 -translate-y-1/2 group-hover:visible"
              onClick={(e) => {
                e.stopPropagation();
                if (!isSelecting && !isTogglingFavorite[conversation.id]) {
                  void toggleFavorite(
                    conversation.id,
                    !!conversation.favourite,
                  );
                }
              }}
            >
              {isTogglingFavorite[conversation.id] ? (
                <Spinner className="h-5 w-5" />
              ) : conversation.favourite ? (
                <BookmarkCheck className="h-5 w-5 text-primary" />
              ) : (
                <Bookmark className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <CardHeader
              onClick={() => handleCardClick(conversation.id)}
              className={`${isSelecting ? 'pl-12' : 'pl-12 pr-12'}`}
            >
              <CardTitle className="text-base font-medium">
                {conversation.title ?? (
                  <Trans i18nKey="chat:history.newConversation" />
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
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
        ))}
        {isLoading && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="rounded-md bg-card p-6 text-center">
            <div className="mb-6 flex justify-center">
              <Image
                src="/images/illustrations/chat-docs-humans.svg"
                alt="No conversations"
                width={120}
                height={80}
                className="object-contain"
              />
            </div>
            <p className="text-muted-foreground">
              {showFavorites ? (
                <Trans i18nKey="chat:history.noFavorites" />
              ) : debouncedSearch ? (
                <Trans
                  i18nKey="chat:history.noSearchResults"
                  values={{ query: debouncedSearch }}
                />
              ) : (
                <Trans i18nKey="chat:history.noConversations" />
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
