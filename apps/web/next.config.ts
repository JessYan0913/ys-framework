import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.NEXT_STANDALONE ? 'standalone' : undefined,
  devIndicators: false,
  env: {
    DOCS_BASE_URL: process.env.DOCS_BASE_URL,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: '192.100.30.224',
      },
      {
        hostname: 'www.simeagent.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default nextConfig;
