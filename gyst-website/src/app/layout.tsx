import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SEO_CONSTANTS } from "@/lib/constants";
import Header from "@/components/common/header";
import Footer from "@/components/common/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: SEO_CONSTANTS.defaultTitle,
  description: SEO_CONSTANTS.defaultDescription,
  keywords: SEO_CONSTANTS.keywords.join(', '),
  authors: [{ name: "GYST AI Agency" }],
  creator: "GYST AI Agency",
  publisher: "GYST AI Agency",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: SEO_CONSTANTS.defaultTitle,
    description: SEO_CONSTANTS.defaultDescription,
    siteName: 'GYST AI Agency',
    images: [
      {
        url: SEO_CONSTANTS.ogImage,
        width: 1200,
        height: 630,
        alt: 'GYST AI Agency - Premium AI Transformation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: SEO_CONSTANTS.twitterHandle,
    creator: SEO_CONSTANTS.twitterHandle,
    title: SEO_CONSTANTS.defaultTitle,
    description: SEO_CONSTANTS.defaultDescription,
    images: [SEO_CONSTANTS.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
