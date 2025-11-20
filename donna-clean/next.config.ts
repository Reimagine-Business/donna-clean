// next.config.js
const nextConfig = {
  // This is the ONLY way to disable Turbopack in Next.js 16 on Vercel right now
  turbopack: {},
}

module.exports = nextConfig
