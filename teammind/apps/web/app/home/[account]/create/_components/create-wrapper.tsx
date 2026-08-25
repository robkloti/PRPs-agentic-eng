'use client';

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Alert, AlertDescription } from '@tm/ui/alert';
import { Card, CardContent } from '@tm/ui/card';

import { getAccountUsageLimits } from '~/lib/usage-limits';

import { CreateFeatureCTA } from './create-feature-cta';
import { UpdatesList } from './create-log/updates-list';
import { MeetingInput } from './meetings/meeting-input';
import { DocQualityCheckerCard } from './quality-checker/doc-quality-checker-card';
import { DocQualityFlagList } from './quality-checker/doc-quality-flag-list';
import { TutorialCard } from './tutorial-card';

// Tab persistence key for localStorage
const ACTIVE_TAB_KEY = 'createPage_activeTab';

export function CreateWrapper({ accountId }: { accountId: string }) {
  const client = useSupabase();

  // Fetch usage limits for the account
  const { data: usageLimits, isLoading: isLoadingLimits } = useQuery({
    queryKey: ['usageLimits', accountId],
    queryFn: async () => {
      return await getAccountUsageLimits(client, accountId);
    },
  });

  // Check if user has a plan with meeting hours
  const hasMeetingHours =
    (usageLimits && usageLimits.meetingHoursPerMonth > 0) ?? false;

  // If still loading limits, show skeleton loading state
  if (isLoadingLimits) {
    return (
      <div className="h-full w-full max-w-5xl space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <MeetingInputSkeleton />
          <QualityCheckerSkeleton />
        </div>
        <CreateListSkeleton />
      </div>
    );
  }

  // If user doesn't have any meeting hours in their plan, show CTA
  if (!hasMeetingHours) {
    return (
      <div className="grid h-full place-items-center">
        <CreateFeatureCTA />
      </div>
    );
  }

  return (
    <div className="mt-3 h-full w-full max-w-5xl space-y-8">
      <TutorialCard />

      <div className="grid gap-6 md:grid-cols-2">
        <MeetingInput />
        <DocQualityCheckerCard />
      </div>

      <CreateList />
    </div>
  );
}

function CreateList() {
  const { t } = useTranslation('create');
  const [activeTab, setActiveTab] = useState('updates');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize state from localStorage when component mounts
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
      if (savedTab === 'updates' || savedTab === 'quality') {
        setActiveTab(savedTab);
      }
    }
  }, []);

  // Update localStorage when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem(ACTIVE_TAB_KEY, tab);
  };

  return (
    <div className="mb-4 w-full">
      {/* Tab buttons outside the Card */}
      <div className="flex w-full">
        <button
          onClick={() => handleTabChange('updates')}
          className={`w-1/2 rounded-t-lg border border-b-0 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'updates'
              ? 'bg-card font-semibold text-foreground'
              : 'text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {t('documentAndTicketUpdates')}
        </button>
        <button
          onClick={() => handleTabChange('quality')}
          className={`w-1/2 rounded-t-lg border border-b-0 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'quality'
              ? 'bg-card font-semibold text-foreground'
              : 'text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {t('qualityIssues')}
        </button>
      </div>

      {/* Card component with content */}
      <Card className="w-full min-h-[600px] flex flex-col rounded-t-none border-t-0 shadow-none">
        <CardContent className="flex-grow pt-6 overflow-hidden">
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div className="w-full h-full space-y-4 overflow-hidden">
            {activeTab === 'updates' ? (
              <UpdatesList setErrorMessage={setErrorMessage} />
            ) : (
              <DocQualityFlagList />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MeetingInputSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-6">
      <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200"></div>
      <div className="h-24 w-full animate-pulse rounded bg-gray-200"></div>
      <div className="h-10 w-1/3 animate-pulse rounded bg-gray-200"></div>
    </div>
  );
}

function QualityCheckerSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
        <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200"></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
          <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
          <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
          <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}

function CreateListSkeleton() {
  return (
    <div className="w-full">
      {/* Tab buttons skeleton */}
      <div className="flex w-full">
        <div className="h-12 w-1/2 rounded-t-lg border border-b-0 bg-card px-4 py-4 text-sm font-medium"></div>
        <div className="h-12 w-1/2 rounded-t-lg border border-b-0 px-4 py-4 text-sm font-medium"></div>
      </div>

      {/* Card component with content */}
      <div className="w-full min-h-[600px] rounded-t-none border border-t-0 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
              ></div>
            ))}
          </div>
          <div className="h-8 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>

        <div className="min-h-[400px]">
          <div className="mb-3 flex items-center pl-2">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start rounded-md border p-4">
                <div className="mr-4 flex-shrink-0">
                  <div className="h-14 w-14 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="mb-1 h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}