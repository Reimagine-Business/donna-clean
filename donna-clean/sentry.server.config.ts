import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Recommend 10% in production
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV,

  // You can also filter out specific errors
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    const error = hint.originalException;

    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);

      // Filter out Supabase auth errors that are expected
      if (message.includes('Invalid Refresh Token') ||
          message.includes('Auth session missing')) {
        return null;
      }
    }

    return event;
  },
});
