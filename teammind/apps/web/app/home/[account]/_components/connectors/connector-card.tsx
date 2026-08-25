'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { AlertTriangle, Loader2 } from 'lucide-react';

import { AlertDialog, AlertDialogTrigger } from '@tm/ui/alert-dialog';
import { Badge } from '@tm/ui/badge';
import { Button } from '@tm/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@tm/ui/card';
import { Skeleton } from '@tm/ui/skeleton';
import { Trans } from '@tm/ui/trans';
import { cn } from '@tm/ui/utils';

import { DisconnectForm } from './disconnect-form';

export interface ConnectorGroupProps {
  manufacturer: string;
  manufacturerIcon?: string;
  providerId: string;
  description: string;
  connectors: Array<{
    id: string;
    name: string;
    icon: string;
    isAvailable?: boolean;
  }>;
  userId: string;
  accountSlug: string;
  isLoading?: boolean;
  isConfigured?: boolean;
  isSyncing?: boolean;
  initialSynced?: boolean;
  updatedAt?: string;
  isComingSoon?: boolean;
  showConfigureButton?: boolean;
  hasMissingScopes?: boolean;
  missingServices?: string[];
  className?: string;
  onDisconnect?: () => void;
}

export function ConnectorCard({
  manufacturer,
  manufacturerIcon,
  providerId,
  description,
  connectors,
  userId,
  accountSlug,
  isLoading,
  isConfigured,
  isSyncing,
  initialSynced,
  updatedAt,
  isComingSoon,
  showConfigureButton = true,
  hasMissingScopes,
  missingServices = [],
  className,
  onDisconnect,
}: ConnectorGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const missingServiceCount = missingServices.length;

  // Helper function to determine grid layout based on connector count
  const getConnectorGridLayout = () => {
    const count = connectors.length;

    // Single connector - centered
    if (count === 1) {
      return 'grid-cols-1 place-items-center';
    }

    // Two connectors - side by side
    if (count === 2) {
      return 'grid-cols-2';
    }

    // Three connectors - 2 on top, 1 below
    if (count === 3) {
      return 'grid-cols-2 auto-rows-min';
    }

    // Four or more connectors - 2x2 grid
    return 'grid-cols-2';
  };

  // Render connector items with appropriate positioning
  const renderConnectors = () => {
    const count = connectors.length;

    if (count === 3) {
      // For 3 connectors, special layout with 2 on top, 1 centered below
      return (
        <>
          {connectors
            .slice(0, 2)
            .map((connector) => renderConnectorItem(connector))}
          <div className="col-span-2 flex justify-center">
            {renderConnectorItem(connectors[2]!)}
          </div>
        </>
      );
    }

    // Default rendering for 1, 2, or 4+ connectors
    return connectors.map((connector) => renderConnectorItem(connector));
  };

  // Render individual connector item
  const renderConnectorItem = (
    connector: ConnectorGroupProps['connectors'][0],
  ) => (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        connector.isAvailable === false && 'opacity-50',
      )}
      key={connector.id}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center">
        <Image
          src={`/images/connectors/${connector.icon}`}
          alt={connector.name}
          className={cn(
            'dark:invert',
            connector.isAvailable === false && 'grayscale',
          )}
          width={32}
          height={32}
        />
      </div>

      <h3 className="text-center text-sm font-normal">
        {connector.name}
        {connector.isAvailable === false && (
          <div className="mt-1 text-xs text-amber-500">
            <Trans
              i18nKey="connect:status.unavailable"
              defaults="(unavailable)"
            />
          </div>
        )}
      </h3>
    </div>
  );

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden',
        isComingSoon && 'opacity-75',
        className,
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1.5 px-2">
            {manufacturerIcon && (
              <Image
                src={`/images/connectors/${manufacturerIcon}`}
                alt={manufacturer}
                width={16}
                height={16}
                className="mr-1"
              />
            )}
            <span>{manufacturer}</span>
          </Badge>
        </div>
        <p className="mt-2 text-center text-sm text-gray-500">{description}</p>
      </CardHeader>

      <CardContent className="flex flex-grow items-center justify-center px-6">
        <div className={cn('grid w-full', getConnectorGridLayout())}>
          {renderConnectors()}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-center justify-center space-y-3 p-4">
        {isSyncing && (
          <div className="mb-1 flex items-center gap-1 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>
              <Trans i18nKey="connect:status.syncing" />
            </span>
          </div>
        )}

        {hasMissingScopes && (
          <div className="mb-1 flex items-center gap-1 text-xs text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            <span>
              <Trans
                i18nKey="connect:status.missingScopesWarning"
                defaults="Missing permissions for some services"
                values={{ count: missingServiceCount }}
              />
            </span>
          </div>
        )}

        <div className="flex w-full flex-col space-y-2">
          {isLoading ? (
            <div className="flex w-full flex-col space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : isComingSoon ? (
            <div className="flex justify-center">
              <Badge variant="outline" className="px-3 py-1">
                <Trans i18nKey="connect:status.comingSoon" />
              </Badge>
            </div>
          ) : isConfigured ? (
            <>
              {/* Primary action on top */}
              {showConfigureButton && (
                <Button
                  size="sm"
                  className="w-full"
                  asChild
                  disabled={isSyncing}
                >
                  {hasMissingScopes || providerId === 'notion' ? (
                    <form
                      action={`/api/connectors/${providerId}/auth`}
                      method="POST"
                    >
                      <input
                        type="hidden"
                        name="state"
                        value={JSON.stringify({
                          userId,
                          accountSlug,
                          addScopes: true,
                        })}
                      />
                      <button type="submit" className="w-full">
                        {hasMissingScopes ? (
                          <Trans
                            i18nKey="connect:status.addPermissions"
                            defaults="Grant Access"
                          />
                        ) : (
                          <Trans i18nKey="connect:status.configure" />
                        )}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={`/connectors/${providerId}/select?accountSlug=${accountSlug}`}
                      className={cn(
                        'flex w-full justify-center',
                        isSyncing && 'pointer-events-none opacity-50',
                      )}
                    >
                      <Trans i18nKey="connect:status.configure" />
                    </Link>
                  )}
                </Button>
              )}

              {/* Secondary action below */}
              <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isSyncing}
                  >
                    <Trans i18nKey="connect:status.disconnect" />
                  </Button>
                </AlertDialogTrigger>

                <DisconnectForm
                  provider={providerId}
                  accountSlug={accountSlug}
                  updatedAt={updatedAt}
                  initialSynced={initialSynced}
                  onClose={() => setIsOpen(false)}
                  onDisconnect={onDisconnect}
                />
              </AlertDialog>
            </>
          ) : (
            <form
              action={`/api/connectors/${providerId}/auth`}
              method="POST"
              className="w-full"
            >
              <input
                type="hidden"
                name="state"
                value={JSON.stringify({
                  userId,
                  accountSlug,
                })}
              />
              <Button
                size="sm"
                type="submit"
                variant="default"
                className="w-full"
                disabled={isSyncing}
              >
                <Trans i18nKey="connect:status.connect" />
              </Button>
            </form>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
