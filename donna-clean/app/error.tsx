"use client";

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only send to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error);
    } else {
      console.error('Global error:', error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e]">
          <div className="text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold mb-4 text-white">Oops! Something went wrong</h2>
            <p className="text-purple-300 mb-6">
              Our team has been notified. Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
