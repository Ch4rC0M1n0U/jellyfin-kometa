/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['js-yaml']
  },
  env: {
    JELLYFIN_URL: process.env.JELLYFIN_URL,
    JELLYFIN_API_KEY: process.env.JELLYFIN_API_KEY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
