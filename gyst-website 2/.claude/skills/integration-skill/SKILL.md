# Integration Skill - Retell AI & GoHighLevel

## Retell AI Widget

### Modes
- **Chat**: Text conversations via chat agent
- **Callback**: Collects phone number, initiates call via voice agent

### Required Credentials
```
NEXT_PUBLIC_RETELL_PUBLIC_KEY=key_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RETELL_AGENT_ID=agent_xxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RETELL_PHONE_NUMBER=+15551234567  # callback mode only
```

### Chat Widget Pattern
```tsx
"use client";
import Script from "next/script";

interface RetellWidgetProps {
  mode: "chat" | "callback";
  publicKey: string;
  agentId: string;
  phoneNumber?: string;
  title?: string;
  color?: string;
  recaptchaKey?: string;
}

export function RetellWidget({
  mode,
  publicKey,
  agentId,
  phoneNumber,
  title = mode === "chat" ? "Chat with us!" : "Request a Call",
  color = "#000000",
  recaptchaKey,
}: RetellWidgetProps) {
  if (!publicKey || !agentId) return null;
  if (mode === "callback" && !phoneNumber) return null;

  return (
    <>
      {recaptchaKey && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${recaptchaKey}`}
          strategy="afterInteractive"
        />
      )}
      <Script
        id="retell-widget"
        src="https://dashboard.retellai.com/retell-widget.js"
        strategy="afterInteractive"
        data-public-key={publicKey}
        data-agent-id={agentId}
        data-agent-version="0"
        data-title={title}
        data-color={color}
        {...(mode === "callback" && {
          "data-widget": "callback",
          "data-phone-number": phoneNumber,
          "data-countries": "US,CA,GB",
        })}
        {...(recaptchaKey && { "data-recaptcha-key": recaptchaKey })}
      />
    </>
  );
}
```

### Usage in Layout
```tsx
// src/app/layout.tsx
import { RetellWidget } from "@/components/integrations/RetellWidget";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <RetellWidget
          mode="chat"
          publicKey={process.env.NEXT_PUBLIC_RETELL_PUBLIC_KEY || ""}
          agentId={process.env.NEXT_PUBLIC_RETELL_AGENT_ID || ""}
          title="Chat with GYST AI"
          color="#ffffff"
        />
      </body>
    </html>
  );
}
```

---

## GoHighLevel Chat Widget

### Required Credentials
```
NEXT_PUBLIC_GHL_WIDGET_ID=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Widget Pattern
```tsx
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
```

---

## Critical Rules

1. **Use Next.js Script component** - not raw `<script>` tags
2. **strategy="afterInteractive"** for Retell (needs to load quickly)
3. **strategy="lazyOnload"** for GHL (lower priority)
4. **NEXT_PUBLIC_ prefix** required for browser-accessible env vars
5. **Null checks** - don't render if missing required props
6. **reCAPTCHA** - load BEFORE Retell script if using
