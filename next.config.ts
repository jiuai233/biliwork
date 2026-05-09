import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['bili.jiuai233.work', 'bili.jiuai233.work:80', 'bili.jiuai233.work:443', 'localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.hdslb.com',
      },
    ],
  },
};

export default nextConfig;
