import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production, or using tracesSampler for finer control
  tracesSampleRate: 0.1, // 10% of transactions

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay options for session recording
  replaysOnErrorSampleRate: 1.0, // 100% of errors get a replay
  replaysSessionSampleRate: 0.1, // 10% of sessions get a replay

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // You can also filter out specific errors
  beforeSend(event, hint) {
    // Filter out non-error exceptions
    const error = hint.originalException;

    if (error && typeof error === 'string') {
      // Filter out common non-critical errors
      if (error.includes('ResizeObserver') || error.includes('Non-Error')) {
        return null;
      }
    }

    return event;
  },

  environment: process.env.NODE_ENV,
});
