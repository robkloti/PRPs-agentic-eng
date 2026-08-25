'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@tm/ui/dialog';
import { Trans } from '@tm/ui/trans';

import { ConnectorsContainer } from './connectors-container';

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  accountSlug: string;
}

export function ConnectorsModal({
  isOpen,
  onClose,
  userId,
  accountSlug,
}: ConnectorsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="connect:pageTitle" />
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey="connect:pageDescription" />
          </DialogDescription>
        </DialogHeader>
        <ConnectorsContainer userId={userId} accountSlug={accountSlug} />
      </DialogContent>
    </Dialog>
  );
}
