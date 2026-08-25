'use client';

import { lazy } from 'react';

import { getMonitoringProvider } from '../get-monitoring-provider';
import { InstrumentationProvider } from '../monitoring-providers.enum';

const SentryProvider = lazy(async () => {
  const { SentryProvider } = await import('@tm/sentry/provider');

  return {
    default: SentryProvider,
  };
});

export function MonitoringProvider(props: React.PropsWithChildren) {
  const provider = getMonitoringProvider();

  switch (provider) {
    case InstrumentationProvider.Sentry:
      return <SentryProvider>{props.children}</SentryProvider>;

    default:
      return <>{props.children}</>;
  }
}
