import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { RetellWidget } from "@/components/integrations/RetellWidget";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GYST - Get Your Stack Together",
  description: "AI Agency specializing in voice AI, automation, and multi-agent systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Navbar />
        <LenisProvider>
          {children}
        </LenisProvider>
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
