function resolveBun() {
  const fs = require("node:fs");
  const candidates = [
    process.env.BUN,
    process.env.BUN_INSTALL && `${process.env.BUN_INSTALL}/bin/bun`,
    `${process.env.HOME || ""}/.bun/bin/bun`,
    "/root/.bun/bin/bun",
    "/usr/local/bin/bun",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "bun";
}

const bun = resolveBun();

module.exports = {
  apps: [
    {
      name: "bili_next",
      cwd: __dirname,
      script: bun,
      args: "--bun next start",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
        TZ: "Asia/Shanghai",
      },
    },
    {
      name: "biweb-collector",
      cwd: __dirname,
      script: bun,
      args: "collector-node/src/main.ts",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Shanghai",
      },
    },
  ],
};
