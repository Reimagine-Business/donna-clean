"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e]">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">
          Something went wrong!
        </h2>
        <p className="text-purple-300 mb-6">
          We've been notified and are working on a fix. Please try again or return to the home page.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-md font-medium transition-colors border border-purple-500/30"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
