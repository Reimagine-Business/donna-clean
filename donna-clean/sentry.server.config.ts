import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NODE_ENV,

  // Capture 100% of server-side errors
  beforeSend(event) {
    // Log important server errors
    if (event.level === 'error' || event.level === 'fatal') {
      console.error('[Sentry] Capturing server error:', event.exception);
    }
    return event;
  },

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
