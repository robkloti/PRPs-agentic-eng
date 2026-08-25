import { Suspense } from 'react';

import { AtlassianSelectServer } from './atlassian/atlassian-select-server';
import { GoogleSelectServer } from './google/google-select-server';
import { MicrosoftSelectServer } from './microsoft/microsoft-select-server';

interface Props {
  type: string;
  accountSlug: string;
}

function ConnectorSelectSkeleton() {
  return (
    <div className="flex flex-col space-y-6">
      {/* Skeleton for MultiSelect */}
      <div className="space-y-2">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </div>

      {/* Skeleton for button */}
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export function ConnectorSelect({ type, accountSlug }: Props) {
  // Add more connector components as they're implemented
  switch (type) {
    case 'atlassian':
      return (
        <Suspense fallback={<ConnectorSelectSkeleton />}>
          <AtlassianSelectServer accountSlug={accountSlug} />
        </Suspense>
      );
    case 'microsoft':
      return (
        <Suspense fallback={<ConnectorSelectSkeleton />}>
          <MicrosoftSelectServer accountSlug={accountSlug} />
        </Suspense>
      );
    case 'google':
      return (
        <Suspense fallback={<ConnectorSelectSkeleton />}>
          <GoogleSelectServer accountSlug={accountSlug} />
        </Suspense>
      );
    default:
      throw new Error(`Unsupported connector type: ${type}`);
  }
}
