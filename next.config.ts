import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 避免将 better-sqlite3 打包进 .next，强制使用 node_modules 里的原生依赖
  serverExternalPackages: ['better-sqlite3'],
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
