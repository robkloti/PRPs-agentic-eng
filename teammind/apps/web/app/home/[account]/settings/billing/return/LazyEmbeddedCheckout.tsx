'use client';

import dynamic from 'next/dynamic';

export const LazyEmbeddedCheckout = dynamic(
  async () => {
    const { EmbeddedCheckout } = await import('@tm/billing-gateway/checkout');

    return EmbeddedCheckout;
  },
  {
    ssr: false,
  },
);
