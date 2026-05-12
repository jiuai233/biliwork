module.exports = {
  apps: [
    {
      name: 'biweb-collector',
      cwd: __dirname,
      script: './collector-node/dist/main.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Shanghai',
      },
    },
  ],
};
