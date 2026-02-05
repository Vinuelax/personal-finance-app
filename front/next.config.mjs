/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack is the default bundler in Next.js 16; an empty config
  // signals that we're intentionally using it (avoids "webpack config without turbopack config" error).
  turbopack: {},
}

export default nextConfig
