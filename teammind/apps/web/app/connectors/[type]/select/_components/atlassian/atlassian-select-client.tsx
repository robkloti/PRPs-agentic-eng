'use client';

import { useMemo, useState, useTransition } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@tm/ui/button';
import { MultiSelect } from '@tm/ui/multi-select';
import { Skeleton } from '@tm/ui/skeleton';
import { Trans } from '@tm/ui/trans';

import { updateAtlassianSelections } from './actions';

interface Space {
  id: string;
  name: string;
  type: string;
}

interface Board {
  id: string;
  name: string;
  type: string;
}

interface Props {
  accountSlug: string;
  spaces: Space[];
  boards: Board[];
  initialSelectedSpaces: string[];
  initialSelectedBoards: string[];
}

export function AtlassianSelectClient({
  accountSlug,
  spaces,
  boards,
  initialSelectedSpaces,
  initialSelectedBoards,
}: Props) {
  const { t } = useTranslation('connect');
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(
    initialSelectedSpaces,
  );
  const [selectedBoards, setSelectedBoards] = useState<string[]>(
    initialSelectedBoards,
  );
  const [isSaving, startTransition] = useTransition();

  // Convert spaces to options format
  const spaceOptions = spaces.map((space) => ({
    value: space.id,
    label: space.name,
  }));

  // Convert boards to options format
  const boardOptions = boards.map((board) => ({
    value: board.id,
    label: board.name,
  }));

  // Calculate display values dynamically
  const spacePlaceholder = useMemo(() => {
    if (selectedSpaces.length === 0) {
      return t('connectors.atlassian.selectSpacesPlaceholder');
    }
    return t('connectors.atlassian.spacesSelected', {
      count: selectedSpaces.length,
    });
  }, [selectedSpaces.length, t]);

  const boardPlaceholder = useMemo(() => {
    if (selectedBoards.length === 0) {
      return t('connectors.atlassian.selectBoardsPlaceholder');
    }
    return t('connectors.atlassian.boardsSelected', {
      count: selectedBoards.length,
    });
  }, [selectedBoards.length, t]);

  // Determine if we're in a loading state (no data yet)
  const isLoading = spaces.length === 0 && boards.length === 0;

  return (
    <div className="flex flex-col space-y-6">
      {/* Spaces MultiSelect with skeleton fallback */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            <Trans i18nKey="connect:connectors.atlassian.confluenceSpaces" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ) : spaces.length > 0 ? (
        <MultiSelect
          options={spaceOptions}
          value={selectedSpaces}
          onChange={setSelectedSpaces}
          placeholder={spacePlaceholder}
          searchPlaceholder={t('connectors.atlassian.searchSpacesPlaceholder')}
          emptyMessage={t('connectors.atlassian.noSpacesFound')}
          selectAllLabel={t('connectors.atlassian.selectAllSpaces')}
          label={
            <Trans i18nKey="connect:connectors.atlassian.confluenceSpaces" />
          }
        />
      ) : null}

      {/* Boards MultiSelect with skeleton fallback */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            <Trans i18nKey="connect:connectors.atlassian.jiraBoards" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ) : boards.length > 0 ? (
        <MultiSelect
          options={boardOptions}
          value={selectedBoards}
          onChange={setSelectedBoards}
          placeholder={boardPlaceholder}
          searchPlaceholder={t('connectors.atlassian.searchBoardsPlaceholder')}
          emptyMessage={t('connectors.atlassian.noBoardsFound')}
          selectAllLabel={t('connectors.atlassian.selectAllBoards')}
          label={<Trans i18nKey="connect:connectors.atlassian.jiraBoards" />}
        />
      ) : null}

      {/* Save button with skeleton fallback */}
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : spaces.length > 0 || boards.length > 0 ? (
        <Button
          className="w-full"
          onClick={() => {
            startTransition(async () => {
              await updateAtlassianSelections(
                accountSlug,
                selectedSpaces,
                selectedBoards,
              );
            });
          }}
          disabled={isSaving}
        >
          {isSaving ? (
            <Trans i18nKey="common:saving" />
          ) : (
            <Trans i18nKey="connect:connectors.atlassian.startTraining" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
