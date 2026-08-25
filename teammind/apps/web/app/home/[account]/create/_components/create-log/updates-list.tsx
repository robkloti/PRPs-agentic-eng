import { useState } from 'react';

import Image from 'next/image';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Cog } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Badge } from '@tm/ui/badge';
import { Button } from '@tm/ui/button';
import { toast } from '@tm/ui/sonner';

import { ConfirmActionDialog } from './confirm-action-dialog';
import { PreferencesDialog } from './create-preferences';
import { DocumentUpdateAction } from './types';
import { UpdateCard } from './update-card';
import { UpdateDetailsSheet } from './update-details-sheet';
import { VersionControlGuidanceDialog } from './version-control-dialog';

// Define page size constant
const PAGE_SIZE = 10;

interface UpdatesListProps {
  setErrorMessage: (message: string | null) => void;
}

export function UpdatesList({ setErrorMessage }: UpdatesListProps) {
  const { t } = useTranslation('create');
  const client = useSupabase();

  // Replace single filter with filter state object
  const [filters, setFilters] = useState({
    all: true,
    document: false,
    ticket: false,
    pending: false,
  });

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  const [versionControlDialogOpen, setVersionControlDialogOpen] =
    useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    title: '',
    description: '',
    confirmLabel: '',
    cancelLabel: t('cancel'),
    action: async () => {
      /**/
    },
  });
  const [selectedUpdate, setSelectedUpdate] =
    useState<DocumentUpdateAction | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch document updates and actions with pagination
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documentUpdates', filters, currentPage],
    queryFn: async () => {
      // First get the total count for pagination
      const { count: updatesCount, error: countError } = await client
        .from('document_updates')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Then fetch the actual data for the current page
      const { data: updates, error: updatesError } = await client
        .from('document_updates')
        .select('*, meetings(title, time_start, time_end, transcript)')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (updatesError) throw updatesError;

      return {
        // Organize by status
        documentUpdates:
          updates?.filter((update) => update.status === 'executed') || [],
        documentUpdateActions:
          updates?.filter((update) => update.status === 'pending') || [],
        totalCount: updatesCount ?? 0,
      };
    },
  });

  // Calculate total pages
  const totalPages = data?.totalCount
    ? Math.ceil(data.totalCount / PAGE_SIZE)
    : 0;

  // Go to previous page
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Go to next page
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Toggle filter function - updated to handle multiple active filters
  const toggleFilter = (
    filterName: 'all' | 'document' | 'ticket' | 'pending',
  ) => {
    // When toggling 'all', turn off all other filters if enabling it
    if (filterName === 'all') {
      if (!filters.all) {
        // If 'all' is being turned on, turn off all other filters
        setFilters({
          all: true,
          document: false,
          ticket: false,
          pending: filters.pending, // Keep pending state unchanged as it works as a toggle
        });
      } else {
        // Don't allow turning off 'all' without selecting another content filter
        return;
      }
    } else if (filterName === 'document' || filterName === 'ticket') {
      // If toggling document or ticket, ensure they are mutually exclusive and turn off 'all'
      setFilters({
        ...filters,
        all: false,
        document: filterName === 'document' ? true : false,
        ticket: filterName === 'ticket' ? true : false,
      });
    } else if (filterName === 'pending') {
      // Pending is a true toggle that can be combined with any source filter
      setFilters({
        ...filters,
        pending: !filters.pending,
      });
    }

    // Reset to first page when filter changes
    setCurrentPage(0);
  };

  // Apply filters - UPDATED FILTERING LOGIC
  const filteredUpdates =
    data?.documentUpdates.filter((update) => {
      // First check if pending filter is active - if so, skip all executed updates
      if (filters.pending) return false;

      // Next check content type filters
      if (filters.all) return true;
      if (filters.document) return update.source !== 'jira';
      if (filters.ticket) return update.source === 'jira';

      // If no content filter is active, don't show anything
      return false;
    }) ?? [];

  const filteredActions =
    data?.documentUpdateActions.filter((action) => {
      // Apply content type filters regardless of pending status
      if (filters.all) return true;
      if (filters.document) return action.source !== 'jira';
      if (filters.ticket) return action.source === 'jira';

      // If no content filter is active, don't show anything
      return false;
    }) ?? [];

  // Handle viewing details of an update
  const handleViewDetails = (update: DocumentUpdateAction) => {
    setSelectedUpdate(update);
    setDetailsDialogOpen(true);
  };

  // Execute a document update action
  const executeAction = async (actionId: string) => {
    setProcessingId(actionId);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/create/execute-document-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? t('failedToExecuteAction'));
      }

      toast.success(t('actionExecutedSuccessfully'));

      // Refresh the data
      const refreshedData = await refetch();

      // Update the selectedUpdate if the details dialog is open
      if (
        detailsDialogOpen &&
        selectedUpdate &&
        selectedUpdate.id === actionId
      ) {
        // Look for the executed update in the refreshed data
        const allUpdates = [
          ...(refreshedData.data?.documentUpdates ?? []),
          ...(refreshedData.data?.documentUpdateActions ?? []),
        ];

        const updatedItem = allUpdates.find((item) => item.id === actionId);

        if (updatedItem) {
          // Update the selectedUpdate with the new status
          setSelectedUpdate({
            ...updatedItem,
            status: 'executed', // Ensure status is updated
          } as unknown as DocumentUpdateAction);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setProcessingId(null);
      setConfirmDialogOpen(false);
    }
  };

  // Dismiss a document update action
  const dismissAction = async (actionId: string) => {
    setProcessingId(actionId);
    setErrorMessage(null);

    try {
      const { error } = await client
        .from('document_updates')
        .update({
          status: 'dismissed',
        })
        .eq('id', actionId);

      if (error) {
        throw new Error(error.message ?? t('failedToDismissAction'));
      }

      toast.success(t('actionDismissedSuccessfully'));
      await refetch();

      if (detailsDialogOpen) {
        setDetailsDialogOpen(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setProcessingId(null);
      setConfirmDialogOpen(false);
    }
  };

  // Show version control guidance dialog
  const showVersionControlGuidance = (update: DocumentUpdateAction) => {
    setSelectedUpdate(update);
    setVersionControlDialogOpen(true);
  };

  // Handle confirmation for execute action
  const confirmExecute = (update: DocumentUpdateAction) => {
    setSelectedUpdate(update);
    setConfirmDialogProps({
      title: t('confirmExecution'),
      description:
        update.source === 'jira'
          ? t('confirmTicketCreation')
          : t('confirmDocumentUpdate'),
      confirmLabel: t('execute'),
      cancelLabel: t('cancel'),
      action: async () => executeAction(update.id),
    });
    setConfirmDialogOpen(true);
  };

  // Handle confirmation for dismiss action
  const confirmDismiss = (update: DocumentUpdateAction) => {
    setSelectedUpdate(update);
    setConfirmDialogProps({
      title: t('confirmDismissal'),
      description: t('confirmPendingActionDismissal'),
      confirmLabel: t('dismiss'),
      cancelLabel: t('cancel'),
      action: async () => dismissAction(update.id),
    });
    setConfirmDialogOpen(true);
  };

  // No-op function for unused handlers
  const noOp = () => {
    return undefined;
  };

  return (
    <>
      {/* Filter badges and settings button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="mt-2 flex gap-2">
          <Badge
            variant={filters.all ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFilter('all')}
          >
            {t('all')}
          </Badge>
          <Badge
            variant={filters.document ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFilter('document')}
          >
            {t('documents')}
          </Badge>
          <Badge
            variant={filters.ticket ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFilter('ticket')}
          >
            {t('tickets')}
          </Badge>
          <Badge
            variant={filters.pending ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFilter('pending')}
          >
            {t('pending')}
          </Badge>
        </div>
  
        <Button
          variant="outline"
          size="sm"
          className="mt-2 sm:mt-0"
          onClick={() => setPreferencesDialogOpen(true)}
        >
          <Cog className="mr-1 h-4 w-4 text-muted-foreground" />
          {t('updatePreferences')}
        </Button>
      </div>
  
      <div className="min-h-[480px] max-h-[800px] overflow-y-auto">
        {isLoading ? (
          <GridExplorerSkeleton />
        ) : (
          <>
            {/* Pending Actions Section */}
            {filteredActions.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center pl-2">
                  <span>{t('pendingActions')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {filteredActions.map((action) => (
                    <UpdateCard
                      key={action.id}
                      update={action as unknown as DocumentUpdateAction}
                      onViewDetails={() =>
                        handleViewDetails(
                          action as unknown as DocumentUpdateAction,
                        )
                      }
                      onExecute={() =>
                        confirmExecute(
                          action as unknown as DocumentUpdateAction,
                        )
                      }
                      onDismiss={() =>
                        confirmDismiss(
                          action as unknown as DocumentUpdateAction,
                        )
                      }
                      onRevert={noOp}
                      isProcessing={processingId === action.id}
                      processingId={processingId}
                    />
                  ))}
                </div>
              </div>
            )}
  
            {/* Completed Updates Section */}
            {filteredUpdates.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center pl-2">
                  <span className="font-medium">{t('completedUpdates')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {filteredUpdates.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update as unknown as DocumentUpdateAction}
                      onViewDetails={() =>
                        handleViewDetails(
                          update as unknown as DocumentUpdateAction,
                        )
                      }
                      onExecute={noOp}
                      onDismiss={noOp}
                      onRevert={() =>
                        showVersionControlGuidance(
                          update as unknown as DocumentUpdateAction,
                        )
                      }
                      isProcessing={processingId === update.id}
                      processingId={processingId}
                    />
                  ))}
                </div>
              </div>
            )}
  
            {/* Empty State */}
            {filteredActions.length === 0 && filteredUpdates.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-8">
                <Image
                  src="/images/illustrations/meeting-docs-humans.svg"
                  alt="No updates"
                  width={300}
                  height={172}
                  className="mb-8 opacity-80"
                />
                <p className="mb-2 text-lg font-medium text-muted-foreground">
                  {t('noUpdatesFound')}
                </p>
                <p className="max-w-sm text-center text-sm text-muted-foreground">
                  {t('joinAMeetingToSeeItHere')}
                </p>
              </div>
            )}
  
            {/* Pagination controls */}
            {!isLoading &&
              (filteredUpdates.length > 0 || filteredActions.length > 0) &&
              totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {t('previous')}
                  </Button>
                  <span className="text-sm">
                    {t('pageXOfY', {
                      current: currentPage + 1,
                      total: totalPages,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                  >
                    {t('next')}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
          </>
        )}
      </div>
  
      {/* Details Dialog */}
      <UpdateDetailsSheet
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        update={selectedUpdate}
        onExecute={(update) => confirmExecute(update)}
        onDismiss={(update) =>
          update.status === 'pending' ? confirmDismiss(update) : undefined
        }
        onRevert={(update) => showVersionControlGuidance(update)}
        isProcessing={processingId === selectedUpdate?.id}
      />
  
      {/* Confirmation Dialog */}
      <ConfirmActionDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={confirmDialogProps.title}
        description={confirmDialogProps.description}
        onConfirm={confirmDialogProps.action}
        isProcessing={processingId === selectedUpdate?.id}
        confirmLabel={confirmDialogProps.confirmLabel}
        cancelLabel={confirmDialogProps.cancelLabel}
      />
  
      {/* Preferences Dialog */}
      <PreferencesDialog
        open={preferencesDialogOpen}
        onOpenChange={setPreferencesDialogOpen}
        onSuccess={() => refetch()}
      />
  
      {/* Version Control Guidance Dialog */}
      <VersionControlGuidanceDialog
        open={versionControlDialogOpen}
        onOpenChange={setVersionControlDialogOpen}
        source={selectedUpdate?.source ?? 'jira'}
        documentUrl={selectedUpdate?.url ?? undefined}
      />
    </>
  );
}

// Skeleton loader for grid file explorer
function GridExplorerSkeleton() {
  return (
    <div>
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
  );
}
