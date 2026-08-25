'use client';

import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { toast } from '@tm/ui/sonner';

import { ConnectorCard } from './connector-card';
import { FirstSyncCard } from './first-sync-card';

interface ConnectorsContainerProps {
  userId: string;
  accountSlug: string;
  className?: string;
  enableRedirect?: boolean;
}

export function ConnectorsContainer({
  userId,
  accountSlug,
  className,
  enableRedirect = false,
}: ConnectorsContainerProps) {
  const { t } = useTranslation('connect');
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const [isCurrentlySyncingForFirstTime, setIsCurrentlySyncingForFirstTime] =
    useState(false);
  const [wasFirstSyncDetected, setWasFirstSyncDetected] = useState(false);
  const [redirectTriggered, setRedirectTriggered] = useState(false);

  const invalidateAtlassianConfig = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['atlassianConfig', userId],
    });
  };

  const invalidateNotionConfig = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['notionConfig', userId],
    });
  };

  const invalidateMicrosoftConfig = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['microsoftConfig', userId],
    });
  };

  const invalidateGoogleConfig = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['googleConfig', userId],
    });
  };

  const { data: atlassianConfig, isLoading: isLoadingAtlassian } = useQuery({
    queryKey: ['atlassianConfig', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('atlassian_config')
        .select('last_synced_at, updated_at, is_syncing')
        .eq('user_id', userId)
        .single();
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: notionConfig, isLoading: isLoadingNotion } = useQuery({
    queryKey: ['notionConfig', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('notion_config')
        .select('last_synced_at, updated_at, is_syncing')
        .eq('user_id', userId)
        .single();
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: microsoftConfig, isLoading: isLoadingMicrosoft } = useQuery({
    queryKey: ['microsoftConfig', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('microsoft_config')
        .select('last_synced_at, updated_at, is_syncing')
        .eq('user_id', userId)
        .single();
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Updated Google config query to include granted_scopes
  const { data: googleConfig, isLoading: isLoadingGoogle } = useQuery({
    queryKey: ['googleConfig', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('google_config')
        .select('last_synced_at, updated_at, is_syncing, granted_scopes')
        .eq('user_id', userId)
        .single();
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Determine Sync Status & Latch First Sync Detection
  useEffect(() => {
    if (
      isLoadingAtlassian ||
      isLoadingMicrosoft ||
      isLoadingNotion ||
      isLoadingGoogle ||
      redirectTriggered
    )
      return;

    const atlassianIsSyncing = atlassianConfig?.is_syncing ?? false;
    const atlassianNeverSynced = !atlassianConfig?.last_synced_at;

    const microsoftIsSyncing = microsoftConfig?.is_syncing ?? false;
    const microsoftNeverSynced = !microsoftConfig?.last_synced_at;

    const notionIsSyncing = notionConfig?.is_syncing ?? false;
    const notionNeverSynced = !notionConfig?.last_synced_at;

    const googleIsSyncing = googleConfig?.is_syncing ?? false;
    const googleNeverSynced = !googleConfig?.last_synced_at;

    const isAtlassianFirstSync = atlassianIsSyncing && atlassianNeverSynced;
    const isMicrosoftFirstSync = microsoftIsSyncing && microsoftNeverSynced;
    const isNotionFirstSync = notionIsSyncing && notionNeverSynced;
    const isGoogleFirstSync = googleIsSyncing && googleNeverSynced;

    const firstSyncCurrentlyInProgress =
      isAtlassianFirstSync ||
      isMicrosoftFirstSync ||
      isNotionFirstSync ||
      isGoogleFirstSync;

    setIsCurrentlySyncingForFirstTime(firstSyncCurrentlyInProgress);

    // Latch that a first sync was detected
    if (firstSyncCurrentlyInProgress && !wasFirstSyncDetected) {
      setWasFirstSyncDetected(true);
    }
  }, [
    atlassianConfig,
    microsoftConfig,
    notionConfig,
    googleConfig,
    isLoadingAtlassian,
    isLoadingMicrosoft,
    isLoadingNotion,
    isLoadingGoogle,
    wasFirstSyncDetected,
    redirectTriggered,
  ]);

  // Poll Document Count
  const { data: documentCount } = useQuery({
    queryKey: ['documentCount', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('count_documents_by_source');
        if (error) throw error;
        return data ?? 0; // Return 0 if data is null/undefined
      } catch (error) {
        console.error('Error fetching document count:', error);
        return 0; // Return 0 on error
      }
    },
    // Only enable polling if we should redirect AND a first sync was detected
    enabled: wasFirstSyncDetected && !redirectTriggered && enableRedirect,
    refetchInterval: 5000, // Poll every 5 seconds while enabled
  });

  // Check if any configured connector hasn't completed its first sync
  const hasConfiguredConnectorsPendingFirstSync = () => {
    // Only check connectors that are actually configured
    const configuredConnectors = [
      { isConfigured: !!atlassianConfig, lastSyncedAt: atlassianConfig?.last_synced_at },
      { isConfigured: !!microsoftConfig, lastSyncedAt: microsoftConfig?.last_synced_at },
      { isConfigured: !!notionConfig, lastSyncedAt: notionConfig?.last_synced_at },
      { isConfigured: !!googleConfig, lastSyncedAt: googleConfig?.last_synced_at }
    ];
    
    // Check if any configured connector is missing last_synced_at
    return configuredConnectors.some(connector => 
      connector.isConfigured && !connector.lastSyncedAt
    );
  };

  // Handle Navigation When Documents Are Available After First Sync
  useEffect(() => {
    if (
      wasFirstSyncDetected && 
      documentCount != null &&
      documentCount > 0 &&
      !hasConfiguredConnectorsPendingFirstSync() && // All configured connectors have completed their first sync
      !redirectTriggered &&
      enableRedirect
    ) {
      setRedirectTriggered(true);
  
      toast.success(t('firstSync.syncComplete'), {
        description: t('firstSync.redirecting'),
      });
  
      setTimeout(() => {
        window.location.href = `/home/${accountSlug}`;
      }, 1500);
    }
  }, [
    wasFirstSyncDetected,
    documentCount,
    atlassianConfig, 
    microsoftConfig,
    notionConfig,
    googleConfig,
    accountSlug,
    redirectTriggered,
    t,
    enableRedirect,
  ]);

  // Function to check which Google scopes are missing
  const checkGoogleScopes = (grantedScopes: string[] | null) => {
    if (!grantedScopes) return { hasMissingScopes: false, missingServices: [] };

    const requiredScopes = {
      gmail: 'https://mail.google.com/',
      gcalendar: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      gdrive: 'https://www.googleapis.com/auth/drive',
      gdocs: 'https://www.googleapis.com/auth/documents',
    };

    const missingServices = [];

    // Check Gmail scope
    if (!grantedScopes.includes(requiredScopes.gmail)) {
      missingServices.push('gmail');
    }

    // Check Calendar scopes
    const hasAllCalendarScopes = requiredScopes.gcalendar.every((scope) =>
      grantedScopes.includes(scope),
    );
    if (!hasAllCalendarScopes) {
      missingServices.push('gcalendar');
    }

    // Check Drive scope
    if (!grantedScopes.includes(requiredScopes.gdrive)) {
      missingServices.push('gdrive');
    }

    // Check Docs scope
    if (!grantedScopes.includes(requiredScopes.gdocs)) {
      missingServices.push('gdocs');
    }

    return {
      hasMissingScopes: missingServices.length > 0,
      missingServices,
    };
  };

  // Process Google scope information
  const googleScopeInfo = checkGoogleScopes(
    googleConfig?.granted_scopes ?? null,
  );

  const manufacturerGroups = [
    {
      manufacturer: t('manufacturers.atlassian'),
      manufacturerIcon: 'atlassian-icon.svg',
      providerId: 'atlassian',
      description: t('descriptions.documentsAndTickets'),
      isLoading: isLoadingAtlassian,
      isConfigured: !isLoadingAtlassian && !!atlassianConfig,
      isSyncing: !!atlassianConfig?.is_syncing,
      initialSynced: !!atlassianConfig?.last_synced_at,
      updatedAt: atlassianConfig?.updated_at,
      connectors: [
        {
          id: 'confluence',
          name: t('connectorsList.confluence'),
          icon: 'confluence-icon.svg',
        },
        { id: 'jira', name: t('connectorsList.jira'), icon: 'jira-icon.svg' },
      ],
    },
    {
      manufacturer: t('manufacturers.google'),
      manufacturerIcon: 'google-icon.svg',
      providerId: 'google',
      description: t('descriptions.emailsCalendarDocuments'),
      isLoading: isLoadingGoogle,
      isConfigured: !isLoadingGoogle && !!googleConfig,
      showConfigureButton: true,
      isSyncing: !!googleConfig?.is_syncing,
      initialSynced: !!googleConfig?.last_synced_at,
      updatedAt: googleConfig?.updated_at,
      hasMissingScopes: googleScopeInfo.hasMissingScopes,
      missingServices: googleScopeInfo.missingServices,
      connectors: [
        {
          id: 'gmail',
          name: t('connectorsList.gmail'),
          icon: 'gmail-icon.svg',
          isAvailable: !googleScopeInfo.missingServices.includes('gmail'),
        },
        {
          id: 'gcalendar',
          name: t('connectorsList.googleCalendar'),
          icon: 'google-calendar-icon.svg',
          isAvailable: !googleScopeInfo.missingServices.includes('gcalendar'),
        },
        {
          id: 'gdrive',
          name: t('connectorsList.googleDrive'),
          icon: 'google_drive-icon.svg',
        },
      ],
    },
    {
      manufacturer: t('manufacturers.microsoft'),
      manufacturerIcon: 'microsoft-icon.svg',
      providerId: 'microsoft',
      description: t('descriptions.documents'),
      isLoading: isLoadingMicrosoft,
      isConfigured: !isLoadingMicrosoft && !!microsoftConfig,
      isSyncing: !!microsoftConfig?.is_syncing,
      initialSynced: !!microsoftConfig?.last_synced_at,
      updatedAt: microsoftConfig?.updated_at,
      connectors: [
        {
          id: 'sharepoint',
          name: t('connectorsList.sharepoint'),
          icon: 'sharepoint-icon.svg',
        },
        {
          id: 'onenote',
          name: t('connectorsList.onenote'),
          icon: 'onenote-icon.svg',
        },
      ],
    },
    {
      manufacturer: t('manufacturers.notion'),
      manufacturerIcon: 'notion-icon.svg',
      providerId: 'notion',
      description: t('descriptions.documents'),
      isLoading: isLoadingNotion,
      isConfigured: !isLoadingNotion && !!notionConfig,
      isSyncing: !!notionConfig?.is_syncing,
      initialSynced: !!notionConfig?.last_synced_at,
      updatedAt: notionConfig?.updated_at,
      connectors: [
        {
          id: 'notion',
          name: t('connectorsList.notion'),
          icon: 'notion-icon.svg',
        },
      ],
    },
  ];

  return (
    <div className={className}>
      {/* Show card only when a first sync is *currently* in progress and redirect hasn't happened */}
      {isCurrentlySyncingForFirstTime && !redirectTriggered && (
        <div className="mb-6">
          <FirstSyncCard />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {manufacturerGroups.map((group) => (
          <ConnectorCard
            key={group.providerId}
            manufacturer={group.manufacturer}
            manufacturerIcon={group.manufacturerIcon}
            providerId={group.providerId}
            description={group.description}
            connectors={group.connectors}
            userId={userId}
            accountSlug={accountSlug}
            isLoading={group.isLoading}
            isConfigured={group.isConfigured}
            isSyncing={group.isSyncing}
            initialSynced={group.initialSynced}
            updatedAt={group.updatedAt}
            showConfigureButton={group.showConfigureButton}
            hasMissingScopes={group.hasMissingScopes}
            missingServices={group.missingServices}
            onDisconnect={
              group.providerId === 'atlassian'
                ? invalidateAtlassianConfig
                : group.providerId === 'microsoft'
                  ? invalidateMicrosoftConfig
                  : group.providerId === 'notion'
                    ? invalidateNotionConfig
                    : group.providerId === 'google'
                      ? invalidateGoogleConfig
                      : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
