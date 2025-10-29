/**
 * PM2 Configuration for Pool Creation Bot
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs pool-creation-bot
 *   pm2 restart pool-creation-bot
 *   pm2 stop pool-creation-bot
 */

module.exports = {
  apps: [{
    name: 'pool-creation-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }],
};
