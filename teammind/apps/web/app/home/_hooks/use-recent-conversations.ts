import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';

export function useRecentConversations(userId: string, limit = 6) {
  const client = useSupabase();
  const queryKey = ['conversations:recent', userId, limit];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      const { data, error } = await client
        .from('conversations')
        .select('id, title, created_at, favourite')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function useFavoriteConversations(userId: string, limit: number) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: ['favorite-conversations', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, favourite')
        .eq('user_id', userId)
        .eq('favourite', true)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(
          `Error fetching favorite conversations: ${error.message}`,
        );
      }

      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useRevalidateRecentConversations(userId: string) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ['conversations:recent', userId],
    });
  };
}
