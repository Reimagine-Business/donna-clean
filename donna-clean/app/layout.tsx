import "./globals.css";
import ClientProviders from "./client-providers";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsent } from "@/components/cookie-consent";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <Toaster />
        <ClientProviders>
          {children}
        </ClientProviders>
        <Analytics debug={process.env.NODE_ENV === 'development'} />
        <SpeedInsights />
        <CookieConsent />
      </body>
    </html>
  );
}
