'use client';

import { useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { Badge } from '@tm/ui/badge';
import { Button } from '@tm/ui/button';

import { useMeetingsData } from './use-meetings';

interface ScheduledMeetingsButtonProps {
  onClick: () => void;
  refreshRef?: React.MutableRefObject<() => void>;
}

export function ScheduledMeetingsButton({
  onClick,
  refreshRef,
}: ScheduledMeetingsButtonProps) {
  const { t } = useTranslation('create');
  const { meetingsCount, hasActiveMeeting, refreshMeetings } =
    useMeetingsData();

  // Expose the refresh function through the ref
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = () => void refreshMeetings();
    }
  }, [refreshMeetings, refreshRef]);

  // Poll for updates when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      void refreshMeetings();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshMeetings]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="mt-0! relative border"
    >
      {hasActiveMeeting && (
        <span className="absolute -left-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
        </span>
      )}

      {t('scheduledMeetings')}

      {meetingsCount > 0 && (
        <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-xs">
          {meetingsCount}
        </Badge>
      )}
    </Button>
  );
}
