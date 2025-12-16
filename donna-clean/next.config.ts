// @ts-check
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},   // this disables Turbopack and forces stable Webpack
}

// Sentry configuration options
const sentryOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Sentry webpack plugin options
  hideSourceMaps: true,
  widenClientFileUpload: true,
};

export default withSentryConfig(nextConfig, sentryOptions);
