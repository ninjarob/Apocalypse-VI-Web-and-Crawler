module.exports = {
  apps: [{
    name: 'mud-backend',
    script: 'dist/backend/src/index.js',
    cwd: 'C:/work/other/Apocalypse VI MUD/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
