'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { DocumentSource } from '@tm/ai/types';
import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Button } from '@tm/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@tm/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tm/ui/select';
import { toast } from '@tm/ui/sonner';
import { Switch } from '@tm/ui/switch';

// Loading skeleton for preferences dialog
function PreferencesDialogSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
        <div className="h-6 w-12 animate-pulse rounded bg-gray-200"></div>
      </div>
      <div className="h-10 w-1/3 animate-pulse rounded bg-gray-200"></div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
        <div className="h-6 w-12 animate-pulse rounded bg-gray-200"></div>
      </div>
      <div className="h-10 w-1/3 animate-pulse rounded bg-gray-200"></div>
      <div className="h-10 w-1/3 animate-pulse rounded bg-gray-200"></div>
    </div>
  );
}

// Hook for fetching connector information
function useAvailableConnectors() {
  const client = useSupabase();

  return useQuery({
    queryKey: ['availableConnectors'],
    queryFn: async () => {
      const user = await client.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Fetch connector configurations in parallel
      const [atlassianResult, microsoftResult, notionResult] =
        await Promise.all([
          client
            .from('atlassian_config')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          client
            .from('microsoft_config')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          client
            .from('notion_config')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

      // Map connector configs to sources
      const sources: DocumentSource[] = [];

      if (atlassianResult.count && atlassianResult.count > 0) {
        sources.push('confluence');
        sources.push('jira');
      }

      if (microsoftResult.count && microsoftResult.count > 0) {
        sources.push('sharepoint');
      }

      if (notionResult.count && notionResult.count > 0) {
        sources.push('notion');
      }

      // Filter out jira for document sources
      const documentSources = sources.filter((source) => source !== 'jira');
      // Currently we only have jira for ticket sources
      const ticketSources: DocumentSource[] = sources.includes('jira')
        ? ['jira']
        : [];

      return {
        sources,
        hasJira: sources.includes('jira'),
        documentSources,
        ticketSources,
        // Only show select if we have multiple document sources
        showDocumentSourceSelect: documentSources.length > 1,
        // Same logic for ticket sources (will be useful when more are added)
        showTicketSourceSelect: ticketSources.length > 1,
      };
    },
  });
}

// Hook for fetching and managing user preferences
function useUserPreferences() {
  const client = useSupabase();

  // Fetch user preferences
  const {
    data: preferences,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      const user = await client.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await client
        .from('update_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, return defaults
        if (error.code === 'PGRST116') {
          return {
            document_generation_enabled: true,
            ticket_generation_enabled: true,
            document_auto_update: false,
            ticket_auto_update: false,
            preferred_document_source: null,
            preferred_ticket_source: null,
            user_id: userId,
          };
        }
        throw error;
      }

      return data;
    },
  });

  const updatePreferences = async (newPreferences: {
    document_generation_enabled?: boolean;
    ticket_generation_enabled?: boolean;
    document_auto_update?: boolean;
    ticket_auto_update?: boolean;
    preferred_document_source?: DocumentSource | null;
    preferred_ticket_source?: DocumentSource | null;
  }): Promise<boolean> => {
    try {
      const user = await client.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // First check if a record exists
      const { data, error: checkError } = await client
        .from('update_preferences')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Create update object with current values as defaults
      const updateData = {
        document_generation_enabled:
          newPreferences.document_generation_enabled ??
          preferences?.document_generation_enabled ??
          true,
        ticket_generation_enabled:
          newPreferences.ticket_generation_enabled ??
          preferences?.ticket_generation_enabled ??
          true,
        document_auto_update:
          newPreferences.document_auto_update ??
          preferences?.document_auto_update ??
          false,
        ticket_auto_update:
          newPreferences.ticket_auto_update ??
          preferences?.ticket_auto_update ??
          false,
        preferred_document_source: newPreferences.preferred_document_source,
        preferred_ticket_source: newPreferences.preferred_ticket_source,
        updated_at: new Date().toISOString(),
      };

      // Force update of local state right away for immediate UI feedback
      // This ensures the UI updates even before the refetch completes
      await refetch();

      if (data) {
        // Record exists, update it
        const { error } = await client
          .from('update_preferences')
          .update(updateData)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // No record exists, insert a new one
        const { error } = await client.from('update_preferences').insert({
          user_id: userId,
          ...updateData,
        });

        if (error) throw error;
      }

      toast.success('Preferences updated');
      // Force another refetch to ensure we have the latest data
      await refetch();
      return true;
    } catch (error) {
      toast.error('Failed to update preferences');
      console.error(error);
      return false;
    }
  };

  // Enable all preferences
  const enableAllPreferences = async (): Promise<boolean> => {
    return await updatePreferences({
      document_generation_enabled: true,
      ticket_generation_enabled: true,
      document_auto_update: true,
      ticket_auto_update: true,
    });
  };

  const preferencesDisabled = Boolean(
    !isLoading &&
      preferences &&
      (!preferences.document_generation_enabled ||
        !preferences.document_auto_update) &&
      (!preferences.ticket_generation_enabled ||
        !preferences.ticket_auto_update),
  );

  return {
    preferences,
    isLoading,
    refetch,
    updatePreferences,
    enableAllPreferences,
    preferencesDisabled,
  };
}

// Preferences Dialog Component
export function PreferencesDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation('create');
  const {
    preferences,
    isLoading: preferencesLoading,
    updatePreferences,
    enableAllPreferences,
  } = useUserPreferences();

  // Fetch connector information
  const { data: connectorData, isLoading: connectorsLoading } =
    useAvailableConnectors();

  const isLoading = preferencesLoading || connectorsLoading;
  const documentSources = connectorData?.documentSources ?? [];
  const ticketSources = connectorData?.ticketSources ?? [];
  const hasJira = connectorData?.hasJira ?? false;
  const showDocumentSourceSelect =
    connectorData?.showDocumentSourceSelect ?? false;
  const showTicketSourceSelect = connectorData?.showTicketSourceSelect ?? false;

  // Handler for enabling all preferences
  const handleEnableAll = async () => {
    const success = await enableAllPreferences();
    if (success) {
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  // Handler for updating individual preferences
  const handleUpdatePreference = async (newPrefs: {
    document_generation_enabled?: boolean;
    ticket_generation_enabled?: boolean;
    document_auto_update?: boolean;
    ticket_auto_update?: boolean;
    preferred_document_source?: DocumentSource | null;
    preferred_ticket_source?: DocumentSource | null;
  }) => {
    const success = await updatePreferences(newPrefs);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('updatePreferences')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <PreferencesDialogSkeleton />
          ) : (
            <>
              {/* Document Section - Always show this */}
              <div className="border-b pb-6">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="document-generation"
                    className="text-sm font-medium"
                  >
                    {t('documentGeneration')}
                  </label>
                  <Switch
                    id="document-generation"
                    checked={preferences?.document_generation_enabled ?? true}
                    onCheckedChange={(checked) =>
                      handleUpdatePreference({
                        document_generation_enabled: checked,
                      })
                    }
                  />
                </div>

                <div className="mt-4 pl-4">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="update-documents"
                      className={`text-sm ${!preferences?.document_generation_enabled ? 'text-gray-400' : 'font-medium'}`}
                    >
                      {t('updateDocuments')}
                    </label>
                    <Switch
                      id="update-documents"
                      checked={preferences?.document_auto_update ?? false}
                      disabled={!preferences?.document_generation_enabled}
                      onCheckedChange={(checked) =>
                        handleUpdatePreference({
                          document_auto_update: checked,
                        })
                      }
                    />
                  </div>

                  {/* Only show document source select if we have MULTIPLE available sources */}
                  {showDocumentSourceSelect && (
                    <div className="mt-4 flex items-center justify-between">
                      <label
                        htmlFor="preferred-document-source"
                        className={`text-sm ${!preferences?.document_generation_enabled ? 'text-gray-400' : 'font-medium'}`}
                      >
                        {t('preferredDocumentSource')}
                      </label>
                      <Select
                        disabled={!preferences?.document_generation_enabled}
                        value={
                          preferences?.preferred_document_source === null
                            ? 'auto'
                            : (preferences?.preferred_document_source ?? 'auto')
                        }
                        onValueChange={(value) =>
                          handleUpdatePreference({
                            preferred_document_source:
                              value === 'auto'
                                ? null
                                : (value as DocumentSource),
                          })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder={t('auto')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">{t('auto')}</SelectItem>
                          {documentSources.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source.charAt(0).toUpperCase() + source.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Section - Only show if Jira is available */}
              {hasJira && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="ticket-generation"
                      className="text-sm font-medium"
                    >
                      {t('ticketGeneration')}
                    </label>
                    <Switch
                      id="ticket-generation"
                      checked={preferences?.ticket_generation_enabled ?? true}
                      onCheckedChange={(checked) =>
                        handleUpdatePreference({
                          ticket_generation_enabled: checked,
                        })
                      }
                    />
                  </div>

                  <div className="mt-4 pl-4">
                    <div className="mb-1 flex items-center justify-between">
                      <label
                        htmlFor="update-tickets"
                        className={`text-sm ${!preferences?.ticket_generation_enabled ? 'text-gray-400' : 'font-medium'}`}
                      >
                        {t('updateTickets')}
                      </label>
                      <Switch
                        id="update-tickets"
                        checked={preferences?.ticket_auto_update ?? false}
                        disabled={!preferences?.ticket_generation_enabled}
                        onCheckedChange={(checked) =>
                          handleUpdatePreference({
                            ticket_auto_update: checked,
                          })
                        }
                      />
                    </div>

                    {/* Keep the select for tickets with same conditional logic */}
                    {showTicketSourceSelect && (
                      <div className="mt-4 flex items-center justify-between">
                        <label
                          htmlFor="preferred-ticket-source"
                          className={`text-sm ${!preferences?.ticket_generation_enabled ? 'text-gray-400' : 'font-medium'}`}
                        >
                          {t('preferredTicketSource')}
                        </label>
                        <Select
                          disabled={!preferences?.ticket_generation_enabled}
                          value={
                            preferences?.preferred_ticket_source === null
                              ? 'auto'
                              : (preferences?.preferred_ticket_source ?? 'auto')
                          }
                          onValueChange={(value) =>
                            handleUpdatePreference({
                              preferred_ticket_source:
                                value === 'auto'
                                  ? null
                                  : (value as DocumentSource),
                            })
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t('auto')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">{t('auto')}</SelectItem>
                            {ticketSources.map((source) => (
                              <SelectItem key={source} value={source}>
                                {source === 'jira'
                                  ? 'Jira'
                                  : source.charAt(0).toUpperCase() +
                                    source.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                className="mt-4"
                onClick={handleEnableAll}
                disabled={
                  preferences?.document_generation_enabled &&
                  preferences?.ticket_generation_enabled &&
                  preferences?.document_auto_update &&
                  preferences?.ticket_auto_update
                }
              >
                {t('enableAll')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
