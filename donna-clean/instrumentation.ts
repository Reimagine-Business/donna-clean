export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // await import('./sentry.server.config')
    // const Sentry = await import('@sentry/nextjs')
    console.log('Instrumentation: Server runtime initialized');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // await import('./sentry.edge.config')
    console.log('Instrumentation: Edge runtime initialized');
  }
}

export const onRequestError = async (
  err: Error,
  request: {
    path: string
    method: string
    headers: Headers
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
  },
) => {
  // await import('./sentry.server.config')
  // const Sentry = await import('@sentry/nextjs')

  console.error('Request error:', {
    error: err,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });

  // Sentry.captureException(err, {
  //   tags: {
  //     path: request.path,
  //     method: request.method,
  //     routerKind: context.routerKind,
  //     routePath: context.routePath,
  //     routeType: context.routeType,
  //   },
  //   level: 'error',
  // })
}
