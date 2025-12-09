// @ts-check
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},   // this disables Turbopack and forces stable Webpack
}

// Wrap with Sentry config - simplified with only valid options
export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: !process.env.CI,

  // For uploading source maps to Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through a Next.js rewrite
  tunnelRoute: "/monitoring",

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
});
