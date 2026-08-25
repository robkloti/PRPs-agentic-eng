import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, FileWarning } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@tm/ui/card';

export function DocQualityCheckerCard() {
  const { t } = useTranslation('create');
  const client = useSupabase();

  // Fetch document quality stats efficiently
  const { data: qualityStats, isLoading } = useQuery({
    queryKey: ['documentQualityStats'],
    queryFn: async () => {
      // Get open flags count
      const { count: openCount, error: openError } = await client
        .from('document_quality_flags')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      if (openError) throw openError;

      // Get resolved flags count
      const { count: resolvedCount, error: resolvedError } = await client
        .from('document_quality_flags')
        .select('*', { count: 'exact', head: true })
        .in('status', ['resolved', 'ignored']);

      if (resolvedError) throw resolvedError;

      // Get high priority flags (relevancy > 0.9)
      const { count: highPriorityCount, error: priorityError } = await client
        .from('document_quality_flags')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .gte('relevancy', 0.9);

      if (priorityError) throw priorityError;

      return {
        flaggedCount: openCount ?? 0,
        reviewedCount: resolvedCount ?? 0,
        highPriorityCount: highPriorityCount ?? 0,
      };
    },
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });

  const stats = [
    {
      icon: FileWarning,
      value: isLoading ? '-' : (qualityStats?.flaggedCount ?? 0),
      label: t('flaggedDocuments'),
    },
    {
      icon: AlertTriangle,
      value: isLoading ? '-' : (qualityStats?.highPriorityCount ?? 0),
      label: t('highPriorityIssues'),
    },
    {
      icon: Check,
      value: isLoading ? '-' : (qualityStats?.reviewedCount ?? 0),
      label: t('reviewedFlags'),
    },
  ];

  return (
    <Card className="col-span-2 flex flex-col justify-between md:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="inline-flex items-center">
          {t('documentQualityChecker')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-lg bg-muted/50 p-3"
            >
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>

              <div className="mt-2 flex items-center space-x-2">
                <div className="rounded-full bg-background/80 p-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
