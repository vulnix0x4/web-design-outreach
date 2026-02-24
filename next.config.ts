import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'playwright'],
  images: {
    remotePatterns: []
  }
};

export default nextConfig;
