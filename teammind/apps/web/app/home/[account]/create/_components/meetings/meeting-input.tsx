'use client';

import { useEffect, useRef, useState } from 'react';

import {
  CalendarPlus,
  Check,
  CirclePlus,
  Copy,
  HelpCircle,
  Link,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Alert, AlertDescription } from '@tm/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@tm/ui/alert-dialog';
import { Button } from '@tm/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@tm/ui/card';
import { Input } from '@tm/ui/input';
import { toast } from '@tm/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tm/ui/tabs';

import { MeetingsScheduleDialog } from './meeting-schedule';
import { ScheduledMeetingsButton } from './scheduled-meetings-button';

const meetingUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      return (
        url.includes('zoom.us') ||
        url.includes('teams.microsoft.com') ||
        url.includes('meet.google.com')
      );
    },
    {
      message: 'Please enter a valid Zoom, Microsoft Teams, or Google Meet URL',
    },
  );

interface MeetingInputProps {
  onSuccess?: () => void;
}

export function MeetingInput({ onSuccess }: MeetingInputProps) {
  const { t } = useTranslation('create');
  const client = useSupabase();
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [usageLimitError, setUsageLimitError] = useState<{
    currentUsage: number;
    limit: number;
    remainingHours: number;
  } | null>(null);
  const [tabValue, setTabValue] = useState('auto');
  const [autojoinEmail, setAutojoinEmail] = useState('');
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [scheduledMeetingsOpen, setScheduledMeetingsOpen] = useState(false);
  const buttonRefreshRef = useRef<() => void>(() => {
    /**/
  });

  // Fetch the user's autojoin email
  useEffect(() => {
    async function fetchAutoJoinEmail() {
      setIsLoadingEmail(true);
      try {
        const { data: user } = await client.auth.getUser();

        if (!user?.user?.id) {
          throw new Error('User not found');
        }

        const { data, error } = await client
          .from('autojoin_emails')
          .select('email_handle')
          .eq('user_id', user.user.id)
          .eq('is_deleted', false)
          .single();

        if (error) {
          throw error;
        }

        if (data?.email_handle) {
          setAutojoinEmail(`${data.email_handle}@teammindai.com`);
        }
      } catch (error) {
        console.error('Error fetching autojoin email:', error);
      } finally {
        setIsLoadingEmail(false);
      }
    }

    void fetchAutoJoinEmail();
  }, [client]);

  const validateUrl = (url: string) => {
    try {
      meetingUrlSchema.parse(url);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0]!.message);
      }
      return false;
    }
  };

  const handleJoinMeeting = async () => {
    if (!validateUrl(meetingUrl)) return;

    setIsJoining(true);
    setUsageLimitError(null);

    try {
      const response = await fetch('/api/meetings/instant-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_url: meetingUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 403 &&
          data.error === 'Meeting hour limit exceeded'
        ) {
          setUsageLimitError(data.details);
          throw new Error('Meeting hour limit exceeded');
        }
        throw new Error(data.error ?? 'Failed to join meeting');
      }

      toast.success(t('successfullyJoinedMeeting'), {
        duration: 5000,
      });

      // Immediately refresh the meetings data using the cached refresh method
      if (buttonRefreshRef.current) {
        buttonRefreshRef.current();
      }

      if (onSuccess) {
        onSuccess();
      }

      setMeetingUrl('');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to join meeting',
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(autojoinEmail);
      setIsCopied(true);
      toast.success(t('emailCopiedToClipboard'));

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Error copying email:', err);
      toast.error(t('failedToCopyEmail'));
    }
  };

  return (
    <>
      <Card className="col-span-2 flex h-full flex-col md:col-span-1">
        <CardHeader className="flex flex-row justify-between pb-2 pt-4">
          <CardTitle className="inline-flex items-center">
            {t('smartMeetings')}
            <Button
              variant="ghost"
              size="sm"
              className="ml-0.5 mt-0 h-6 w-6 p-0"
              onClick={() => setHelpDialogOpen(true)}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">{t('help')}</span>
            </Button>
          </CardTitle>
          <ScheduledMeetingsButton
            onClick={() => setScheduledMeetingsOpen(true)}
            refreshRef={buttonRefreshRef}
          />
        </CardHeader>
        <CardContent className="mt-2">
          {usageLimitError && (
            <Alert variant="warning" className="mb-3">
              <AlertDescription>
                {usageLimitError.limit === 0
                  ? t('yourPlanDoesNotIncludeMeetingCoverage')
                  : t('monthlyMeetingLimitReached', {
                      currentUsage: usageLimitError.currentUsage.toFixed(1),
                      limit: usageLimitError.limit,
                    })}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="grid h-9 w-full grid-cols-2 border bg-muted/50">
              <TabsTrigger value="auto" className="h-6 text-xs sm:text-sm">
                {t('automatically')}
              </TabsTrigger>
              <TabsTrigger value="instant" className="h-6 text-xs sm:text-sm">
                {t('instant')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="mt-3">
              <div className="relative flex-1">
                <CalendarPlus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={autojoinEmail}
                  readOnly
                  className="pl-9 pr-16"
                  onClick={() => handleCopyEmail()}
                  placeholder={isLoadingEmail ? t('loadingEmail') : ''}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-3"
                  onClick={handleCopyEmail}
                  disabled={isLoadingEmail}
                >
                  {isCopied ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      {t('copy')}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="instant" className="mt-3">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('googleMeetZoomMicrosoftTeamsURL')}
                  className="pl-9 pr-16"
                  value={meetingUrl}
                  onChange={(e) => {
                    setMeetingUrl(e.target.value);
                  }}
                />
                <Button
                  size="sm"
                  className="bg-brand-gradient hover:bg-brand-gradient/80 absolute right-0 top-1/2 h-8 -translate-y-1/2 px-3 text-white"
                  onClick={handleJoinMeeting}
                  disabled={!meetingUrl || isJoining}
                >
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CirclePlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Help Dialog */}
      <AlertDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('howItWorks')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <>
                <span className="text-md font-medium">
                  {t('automatically')}
                </span>
                <br />
                {t('autoJoiningExplanation')}
              </>
              <br />
              <br />
              <>
                <span className="text-md font-medium">{t('instant')}</span>
                <br />
                {t('instantJoinExplanation')}
              </>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>{t('gotIt')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MeetingsScheduleDialog
        open={scheduledMeetingsOpen}
        onOpenChange={setScheduledMeetingsOpen}
      />
    </>
  );
}
