module.exports = {
  apps: [
    {
      name: 'bili_next',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
        TZ: 'Asia/Shanghai',
      },
    },
    {
      name: 'biweb-collector',
      cwd: __dirname,
      script: './collector-node/dist/main.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Shanghai',
      },
    },
  ],
};
