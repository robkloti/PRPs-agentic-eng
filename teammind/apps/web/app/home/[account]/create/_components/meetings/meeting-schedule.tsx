import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Calendar,
  CalendarPlus,
  Clock,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@tm/ui/badge';
import { Button } from '@tm/ui/button';
import { Card, CardContent } from '@tm/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@tm/ui/dialog';
import { toast } from '@tm/ui/sonner';

import { Database } from '~/lib/database.types';

import { useMeetingsData } from './use-meetings';

type Meeting = Database['public']['Tables']['meetings']['Row'];

export function MeetingsScheduleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('create');
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Use the centralized hook with faster refresh when dialog is open
  const { meetings, isLoading, refreshMeetings } = useMeetingsData({
    refetchInterval: open ? 10000 : 30000,
  });

  // Handle meeting cancellation
  const handleCancelMeeting = async (meetingId: string) => {
    setCancellingId(meetingId);

    try {
      const response = await fetch('/api/meetings/email-schedule/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? t('failedToCancelMeeting'));
      }

      toast.success(t('meetingCancelledSuccessfully'));

      await refreshMeetings();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('failedToCancelMeeting'),
      );
    } finally {
      setCancellingId(null);
    }
  };

  // Format meeting date
  const formatMeetingDate = (meeting: Meeting) => {
    // For scheduled meetings that haven't started yet, use scheduled_at
    if (
      meeting.is_scheduled &&
      meeting.scheduled_at &&
      (!meeting.time_start || new Date(meeting.scheduled_at) > new Date())
    ) {
      const scheduledDate = new Date(meeting.scheduled_at);
      return format(scheduledDate, 'h:mm a, MMM d');
    }

    // For meetings that have started, use time_start
    if (meeting.time_start) {
      const startDate = new Date(meeting.time_start);
      return format(startDate, 'h:mm a, MMM d');
    }

    return '';
  };

  // Get meeting status display info
  const getMeetingStatusInfo = (meeting: Meeting) => {
    // For scheduled meetings
    if (meeting.is_scheduled) {
      switch (meeting.status) {
        case 'pending':
          return {
            statusKey: 'statusScheduledPending',
            color: 'bg-warning/10 text-primary',
          };
        case 'scheduled':
          return {
            statusKey: 'statusScheduled',
            color: 'bg-primary/10',
          };
        case 'call_ended':
          return {
            statusKey: 'statusProcessing',
            color: 'bg-blue-500/10 text-blue-500',
          };
        default:
          return {
            statusKey: 'unknown',
            color: 'bg-muted/20 text-muted-foreground',
          };
      }
    }

    // For instant meetings
    switch (meeting.status) {
      case 'joining_call':
        return {
          statusKey: 'statusJoining',
          color: 'bg-primary/10',
        };
      case 'in_waiting_room':
        return {
          statusKey: 'statusInWaitingRoom',
          color: 'bg-primary/10 text-primary',
        };
      case 'in_call_not_recording':
        return {
          statusKey: 'statusNotRecording',
          color: 'bg-warning/10 text-warning',
        };
      case 'in_call_recording':
        return {
          statusKey: 'statusRecording',
          color: 'bg-secondary/10 text-secondary',
        };
      case 'call_ended':
        return {
          statusKey: 'statusProcessing',
          color: 'bg-blue-500/10 text-blue-500',
        };
      default:
        return {
          statusKey: 'unknown',
          color: 'bg-muted/20 text-muted-foreground',
        };
    }
  };

  // Force refresh when dialog opens
  if (open) {
    // Use React Query's state check to avoid infinite renders
    if (
      !isLoading &&
      queryClient.isFetching({ queryKey: ['meetings'] }) === 0
    ) {
      void refreshMeetings();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('scheduledMeetings')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : meetings && meetings.length > 0 ? (
            meetings.map((meeting) => {
              const statusInfo = getMeetingStatusInfo(meeting);
              const isActive = [
                'joining_call',
                'in_waiting_room',
                'in_call_not_recording',
                'in_call_recording',
              ].includes(meeting.status);
              const isProcessing = meeting.status === 'call_ended';

              return (
                <Card
                  key={meeting.id}
                  className={`relative overflow-hidden ${isActive ? 'border-secondary-400' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {meeting.title ?? t('meeting')}
                            </h3>
                            <Badge
                              className={`${statusInfo.color}`}
                              variant="outline"
                            >
                              {t(statusInfo.statusKey)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatMeetingDate(meeting)}
                          </p>
                        </div>
                        {/* Only show cancel button if meeting is not in processing state */}
                        {!isProcessing && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={cancellingId === meeting.id}
                            onClick={() => handleCancelMeeting(meeting.id)}
                          >
                            {cancellingId === meeting.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('cancelling')}
                              </>
                            ) : (
                              t('cancel')
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4">
                        {/* Future scheduled meeting indicator */}
                        {meeting.is_scheduled &&
                          meeting.scheduled_at &&
                          !meeting.time_start && (
                            <div className="flex items-center gap-2">
                              <div className="rounded-lg bg-primary/10 p-2">
                                <Calendar className="h-4 w-4 text-primary" />
                              </div>
                              <div className="text-sm">
                                {t('scheduledFor')}{' '}
                                {format(new Date(meeting.scheduled_at), 'PPp')}
                              </div>
                            </div>
                          )}

                        {/* Active meeting indicator */}
                        {meeting.time_start && !meeting.time_end && (
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-sm">{t('inProgress')}</div>
                          </div>
                        )}

                        {/* Call ended indicator */}
                        {meeting.status === 'call_ended' && (
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                              <FileCheck className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="text-sm">
                              {t('processingMeeting')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="py-8 text-center">
              <CalendarPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {t('noScheduledMeetings')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
