module.exports = {
  apps: [
    {
      name: 'liveflow-crm',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
