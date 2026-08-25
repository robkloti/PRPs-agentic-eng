import { useMemo } from 'react';

import { useParams } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subHours } from 'date-fns';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';

// Define key factory to ensure consistent query keys
const meetingsKeys = {
  all: ['meetings'] as const,
  lists: () => [...meetingsKeys.all, 'list'] as const,
  list: (accountId: string) => [...meetingsKeys.lists(), accountId] as const,
};

export function useMeetingsData(options = { refetchInterval: 30000 }) {
  const client = useSupabase();
  const params = useParams();
  const accountId = params.account as string;
  const queryClient = useQueryClient();

  // The main query that fetches all relevant meetings
  const query = useQuery({
    queryKey: meetingsKeys.list(accountId),
    queryFn: async () => {
      // Get current time minus one hour for filtering stale call_ended meetings
      const oneHourAgo = subHours(new Date(), 1).toISOString();

      // Fetch all relevant meetings in one query
      const { data, error } = await client
        .from('meetings')
        .select('*')
        .or(
          'status.in.(pending,scheduled),status.in.(joining_call,in_waiting_room,in_call_not_recording,in_call_recording,call_ended)',
        )
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'failed')
        .not('status', 'eq', 'meeting_error')
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter call_ended meetings server-side when possible, or client-side as fallback
      return (data || []).filter((meeting) => {
        if (meeting.status === 'call_ended') {
          const updatedAt = new Date(meeting.updated_at);
          return updatedAt > new Date(oneHourAgo);
        }
        return true;
      });
    },
    refetchInterval: options.refetchInterval,
  });

  // Derived data using selectors (computed values from main query)
  const meetingsCount = useMemo(() => query.data?.length ?? 0, [query.data]);

  const hasActiveMeeting = useMemo(() => {
    return (
      query.data?.some((meeting) =>
        [
          'joining_call',
          'in_waiting_room',
          'in_call_not_recording',
          'in_call_recording',
        ].includes(meeting.status),
      ) ?? false
    );
  }, [query.data]);

  // Method to refresh the meetings data
  const refreshMeetings = () => {
    return queryClient.invalidateQueries({
      queryKey: meetingsKeys.list(accountId),
    });
  };

  return {
    meetings: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    meetingsCount,
    hasActiveMeeting,
    refreshMeetings,
    refetch: query.refetch,
  };
}
