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
  color = "#ffffff",
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
