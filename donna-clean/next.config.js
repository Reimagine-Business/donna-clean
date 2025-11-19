// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly tell Next.js 16 to use the stable Webpack builder (not Turbopack)
  experimental: {
    turbotrace: false,
  },
  // Empty turbopack config forces Webpack
  turbopack: {},
  // Remove any webpack function if present — we don't need it
};

module.exports = nextConfig;
