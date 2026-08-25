'use client';
'use client';

import { useCallback, useEffect, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@tm/ui/alert-dialog';
import { Input } from '@tm/ui/input';
import { toast } from '@tm/ui/sonner';
import { Trans } from '@tm/ui/trans';

// Constants
const DISCONNECT_CONFIRMATION_TEXT = 'disconnect';

interface DisconnectFormProps {
  provider: string;
  accountSlug: string;
  updatedAt?: string;
  initialSynced?: boolean;
  onClose?: () => void;
  onDisconnect?: () => void;
}

export function DisconnectForm({
  provider,
  accountSlug,
  updatedAt: _updatedAt,
  initialSynced: _initialSynced,
  onClose,
  onDisconnect,
}: DisconnectFormProps) {
  const { t } = useTranslation('connect');
  const [showWaitAlert, setShowWaitAlert] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // const isWithinWaitPeriod = useCallback((date: string) => {
  //   const minutesSinceUpdate =
  //     (new Date().getTime() - new Date(date).getTime()) / (1000 * 60);
  //   return minutesSinceUpdate < SYNC_WAIT_TIME_MINUTES;
  // }, []);

  const shouldShowWaitAlert = useCallback(() => {
    // Always return false to disable the wait alert
    return false;
  }, []);

  // Effects
  useEffect(() => {
    setShowWaitAlert(shouldShowWaitAlert());
  }, [shouldShowWaitAlert]);

  // Handle form submission
  const handleDisconnect = async () => {
    if (confirmText.toLowerCase() !== DISCONNECT_CONFIRMATION_TEXT) return;

    setIsLoading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('account_slug', accountSlug);

      // Make API request
      const response = await fetch(`/api/connectors/${provider}/disconnect`, {
        method: 'POST',
        body: formData,
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to disconnect');
      }

      toast.success(`Successfully disconnected ${provider}`, {
        description: `Your ${provider} connection has been removed.`,
      });

      // Call the onDisconnect callback to refetch the state
      if (onDisconnect) {
        onDisconnect();
      }

      // Close the dialog if onClose is provided
      if (onClose) {
        onClose();
      }

      // Add a delay before refreshing the page
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay of 1.5 seconds
    } catch (error) {
      // Show error toast
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect', {
        description:
          error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    if (onClose) {
      onClose();
    }
  };

  // Render helpers
  const renderWaitAlert = () => (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('status.waitTitle')}</AlertDialogTitle>
        <AlertDialogDescription>
          {t('status.waitForConnection')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction onClick={handleClose}>
          {t('status.ok')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  const renderConfirmAlert = () => (
    <AlertDialogContent>
      <form>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t(`connectors.${provider}.disconnectTitle`)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(`connectors.${provider}.disconnectDescription`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            <Trans
              i18nKey="status.typeToConfirm"
              defaults={`Type '${DISCONNECT_CONFIRMATION_TEXT}' to confirm`}
            />
          </div>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={DISCONNECT_CONFIRMATION_TEXT}
            className="max-w-sm"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            {t('status.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            type="submit"
            onClick={handleDisconnect}
            disabled={
              confirmText.toLowerCase() !== DISCONNECT_CONFIRMATION_TEXT ||
              isLoading
            }
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <Trans
                  i18nKey="status.disconnecting"
                  defaults="Disconnecting..."
                />
              </>
            ) : (
              <Trans i18nKey="status.disconnect" />
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );

  return showWaitAlert ? renderWaitAlert() : renderConfirmAlert();
}
