import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Dockerfile copies .next/standalone; keep in sync.
  output: "standalone",
  turbopack: {
    root: dir,
  },
  reactCompiler: true,
  experimental: {
    useTypeScriptCli: true,
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
