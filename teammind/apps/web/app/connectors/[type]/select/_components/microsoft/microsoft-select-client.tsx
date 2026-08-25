'use client';

import { useMemo, useState, useTransition } from 'react';

import { useTranslation } from 'react-i18next';

import { MicrosoftSiteMetaData } from '@tm/ai/types';
import { Button } from '@tm/ui/button';
import { MultiSelect } from '@tm/ui/multi-select';
import { Skeleton } from '@tm/ui/skeleton';
import { Trans } from '@tm/ui/trans';

import { updateSelections } from './actions';

export function MicrosoftSelectClient({
  accountSlug,
  sites,
  initialSelectedSites,
}: {
  accountSlug: string;
  sites: MicrosoftSiteMetaData[];
  initialSelectedSites: string[];
}) {
  const { t } = useTranslation('connect');
  const [selectedSites, setSelectedSites] =
    useState<string[]>(initialSelectedSites);
  const [isSaving, startTransition] = useTransition();

  // Calculate display values dynamically
  const websitePlaceholder = useMemo(() => {
    if (selectedSites.length === 0) {
      return t('connectors.microsoft.selectWebsitesPlaceholder');
    }
    return t('connectors.microsoft.websitesSelected', {
      count: selectedSites.length,
    });
  }, [selectedSites.length, t]);

  // Always render a consistent structure to prevent layout shifts
  return (
    <div className="flex flex-col space-y-6">
      {/* Websites MultiSelect - always render container to maintain layout */}
      {sites.length ? (
        <MultiSelect
          options={sites.map((site) => ({
            value: site.id,
            label: site.displayName,
          }))}
          value={selectedSites}
          onChange={setSelectedSites}
          placeholder={websitePlaceholder}
          searchPlaceholder={t(
            'connectors.microsoft.searchWebsitesPlaceholder',
          )}
          emptyMessage={t('connectors.microsoft.noWebsitesFound')}
          selectAllLabel={t('connectors.microsoft.selectAllWebsites')}
          label={
            <Trans i18nKey="connect:connectors.microsoft.sharepointWebsites" />
          }
        />
      ) : null}

      {/* Save button - show skeleton during loading to maintain layout */}
      {sites.length == 0 ? (
        <Skeleton className="h-10 w-full" />
      ) : sites.length ? (
        <Button
          className="w-full"
          onClick={() => {
            startTransition(async () => {
              await updateSelections(accountSlug, selectedSites);
            });
          }}
          disabled={isSaving}
        >
          {isSaving ? (
            <Trans i18nKey="common.saving" />
          ) : (
            <Trans i18nKey="connect:connectors.microsoft.startTraining" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
