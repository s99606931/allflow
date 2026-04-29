import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  typedRoutes: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
