import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily ignore TypeScript errors during development
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors during development
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  // Optimized Turbopack configuration to reduce build manifest errors
  experimental: {
    turbo: {
      // Reduce file system polling to prevent temporary file conflicts
      resolveAlias: {
        '@': './src',
      },
      // Optimize build manifest generation
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Reduce concurrent builds that can cause file conflicts
    workerThreads: false,
    // Optimize build caching
    optimizePackageImports: ['lucide-react'],
  },
  // Remove the old turbopack config (replaced with experimental.turbo)
  transpilePackages: ['lucide-react'],
}

export default nextConfig
