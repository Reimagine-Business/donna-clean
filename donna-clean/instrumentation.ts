export async function register() {
  // Only run instrumentation in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Instrumentation] Skipping in development');
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await import('./sentry.server.config');
      console.log('[Instrumentation] Sentry server initialized');
    } catch (err) {
      console.error('[Instrumentation] Failed to load Sentry server config:', err);
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    try {
      await import('./sentry.edge.config');
      console.log('[Instrumentation] Sentry edge initialized');
    } catch (err) {
      console.error('[Instrumentation] Failed to load Sentry edge config:', err);
    }
  }
}

export async function onRequestError(
  err: Error,
  request: {
    path: string;
    method: string;
    headers: { get: (name: string) => string | null };
  }
) {
  // Always log errors
  console.error('[Request Error]', {
    error: err,
    path: request.path,
    method: request.method,
  });

  // Only send to Sentry in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    await import('./sentry.server.config');
    const Sentry = await import('@sentry/nextjs');

    Sentry.captureException(err, {
      tags: {
        path: request.path,
        method: request.method,
      },
      extra: {
        userAgent: request.headers.get('user-agent'),
      },
    });
  } catch (sentryErr) {
    console.error('[Sentry] Failed to capture exception:', sentryErr);
  }
}
