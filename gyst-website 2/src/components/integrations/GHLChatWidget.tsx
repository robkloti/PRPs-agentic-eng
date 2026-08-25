"use client";

import Script from "next/script";

interface GHLChatWidgetProps {
  widgetId: string;
}

export function GHLChatWidget({ widgetId }: GHLChatWidgetProps) {
  if (!widgetId) return null;

  return (
    <Script
      id="ghl-chat-widget"
      src="https://widgets.leadconnectorhq.com/loader.js"
      strategy="lazyOnload"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id={widgetId}
    />
  );
}
