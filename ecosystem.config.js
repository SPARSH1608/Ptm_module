module.exports = {
  apps: [
    {
      name: 'ptm-server-prod',
      cwd: '/home/vmc/servers/ptm-prod/server',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'ptm-server-staging',
      cwd: '/home/vmc/servers/ptm-staging/server',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
    },
  ],
};
