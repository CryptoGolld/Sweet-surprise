/**
 * PM2 Ecosystem Configuration
 * 
 * This file defines all services that should run on the production server.
 * 
 * DO NOT DELETE THIS FILE - It's the master reference for all bots/services!
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs           # Start all services
 *   pm2 restart ecosystem.config.cjs         # Restart all services
 *   pm2 delete ecosystem.config.cjs          # Stop and remove all services
 *   pm2 save                                 # Save current PM2 state
 */

module.exports = {
  apps: [
    // ============================================
    // 1. MEMECOIN INDEXER - Blockchain Event Monitor
    // ============================================
    {
      name: 'memecoin-indexer',
      script: 'index.js',
      cwd: '/var/www/Sweet-surprise/indexer',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/indexer-error.log',
      out_file: './logs/indexer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },

    // ============================================
    // 2. MEMECOIN API - REST API Server
    // ============================================
    {
      name: 'memecoin-api',
      script: 'api-server.js',
      cwd: '/var/www/Sweet-surprise/indexer',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },

    // ============================================
    // 3. COMPILATION SERVICE - Move Contract Compiler
    // ============================================
    {
      name: 'compilation-service',
      script: 'index.js',
      cwd: '/var/www/Sweet-surprise/compilation-service',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/compiler-error.log',
      out_file: './logs/compiler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },

    // ============================================
    // 4. POOL CREATION BOT - Cetus Pool Automation
    // ============================================
    {
      name: 'pool-creation-bot',
      script: 'index.js',
      cwd: '/var/www/Sweet-surprise/pool-creation-bot',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pool-bot-error.log',
      out_file: './logs/pool-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
