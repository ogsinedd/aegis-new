/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1',
  },
  images: {
    domains: ['localhost', 'backend'],
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: ['lucide-react'],
  experimental: {
    serverComponentsExternalPackages: [],
    optimizeCss: true,
  },
};

module.exports = nextConfig; 
