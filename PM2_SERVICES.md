# PM2 Services - DO NOT DELETE

This file documents all production services that must run 24/7.

**⚠️ CRITICAL: These services are ESSENTIAL for the platform to work!**

---

## 🤖 Services Overview

| Service | Type | Purpose | Location |
|---------|------|---------|----------|
| **memecoin-indexer** | Bot | Monitors blockchain for token events | `/var/www/Sweet-surprise/indexer/index.js` |
| **memecoin-api** | API Server | Serves token data to frontend | `/var/www/Sweet-surprise/indexer/api-server.js` |
| **compilation-service** | Web Service | Compiles Move contracts for new tokens | `/var/www/Sweet-surprise/compilation-service/index.js` |
| **pool-creation-bot** | Bot | Creates Cetus pools for graduated tokens | `/var/www/Sweet-surprise/pool-creation-bot/index.js` |
| **candle-generator** | Bot | Generates OHLCV chart data from trades | `/var/www/Sweet-surprise/indexer/candle-generator.js` |

---

## 📋 Service Details

### 1. memecoin-indexer
- **What it does**: Continuously monitors Sui blockchain for token creation, buys, sells, graduations
- **Why critical**: Without this, token data won't update, charts won't work, frontend shows stale data
- **Database**: Writes to PostgreSQL database
- **Polls every**: 2-3 seconds
- **Environment**: Requires `.env` with RPC URL, database credentials

### 2. memecoin-api
- **What it does**: REST API that serves indexed data to the frontend
- **Why critical**: Without this, token pages show "Failed to load coins" error
- **Endpoints**: 
  - `/api/tokens` - List all tokens
  - `/api/token/:id` - Token details
  - `/api/trades/:id` - Trade history
  - `/api/holders/:id` - Holder list
- **Port**: Usually 3001 (check `.env`)
- **Environment**: Requires `.env` with database credentials

### 3. compilation-service
- **What it does**: Compiles Move smart contracts when users create new tokens
- **Why critical**: Without this, users can't launch tokens
- **Port**: Usually 3002 (check `.env`)
- **Requirements**: Needs `sui` CLI installed on server
- **Environment**: Requires `.env` with RPC URL

### 4. pool-creation-bot
- **What it does**: Automatically creates Cetus liquidity pools when tokens graduate
- **Why critical**: Without this, graduated tokens won't get pools, no trading on Cetus
- **Features**:
  - Auto-recovery from crashes
  - Tracks progress to disk (`graduation-state.json`)
  - Burns LP tokens for permanent liquidity
- **Polls every**: 10 seconds
- **Environment**: Requires `.env` with bot wallet seed phrase, Cetus config

### 5. candle-generator
- **What it does**: Generates OHLCV (Open/High/Low/Close/Volume) candlestick data for charts
- **Why critical**: Without this, price charts won't display on token pages
- **How it works**:
  - Reads trade data from database
  - Generates 1-minute candles for last 24 hours
  - Fills gaps with flat candles (carry-forward last price)
  - Stores in `price_snapshots` table
- **Runs every**: 60 seconds
- **Environment**: Requires `.env` with database credentials

---

## 🚀 Quick Commands

### Start All Services
```bash
cd /var/www/Sweet-surprise
pm2 start ecosystem.config.cjs
pm2 save
```

### Restart All Services
```bash
pm2 restart all
```

### Check Status
```bash
pm2 list
pm2 status
```

### View Logs
```bash
# All services
pm2 logs

# Specific service
pm2 logs memecoin-indexer
pm2 logs memecoin-api
pm2 logs compilation-service
pm2 logs pool-creation-bot
pm2 logs candle-generator
```

### Stop All Services (Maintenance Mode)
```bash
pm2 stop all
```

### Individual Service Control
```bash
# Restart one service
pm2 restart memecoin-api

# Stop one service
pm2 stop pool-creation-bot

# View one service logs
pm2 logs memecoin-indexer --lines 100
```

---

## 🔧 Maintenance

### After Code Updates
```bash
cd /var/www/Sweet-surprise
git pull
pm2 restart all --update-env
```

### After Server Reboot
Services auto-start if you've run:
```bash
pm2 save
pm2 startup
```

If not configured yet:
```bash
pm2 startup
# Run the command it outputs
pm2 save
```

### Nuclear Reset (if everything is broken)
```bash
pm2 delete all
pm2 kill
cd /var/www/Sweet-surprise
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 📊 Monitoring

### Real-time Monitor
```bash
pm2 monit
```

### Check Memory/CPU
```bash
pm2 list
```

### Check Uptime
```bash
pm2 status
```

---

## ⚠️ Troubleshooting

### Service keeps crashing
```bash
# Check error logs
pm2 logs <service-name> --err --lines 100

# Common issues:
# 1. Database not running: sudo systemctl start postgresql
# 2. Missing .env file: Check service directory
# 3. Port already in use: sudo lsof -i :<port>
# 4. Out of memory: Restart server or increase memory limit
```

### Database connection errors
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database credentials in .env files
cat /var/www/Sweet-surprise/indexer/.env | grep DATABASE
```

### "Failed to fetch from indexer" error
```bash
# Check if memecoin-api is running
pm2 list | grep memecoin-api

# Restart it
pm2 restart memecoin-api

# Check logs
pm2 logs memecoin-api --lines 50
```

---

## 🗂️ File Structure

```
/var/www/Sweet-surprise/
├── ecosystem.config.cjs          ← PM2 configuration (THIS FILE)
├── indexer/
│   ├── index.js                  ← memecoin-indexer
│   ├── api-server.js             ← memecoin-api
│   ├── candle-generator.js       ← candle-generator
│   ├── .env                      ← Database credentials, RPC URL
│   └── logs/                     ← Service logs
├── compilation-service/
│   ├── index.js                  ← compilation-service
│   ├── .env                      ← RPC URL, port
│   └── logs/                     ← Service logs
└── pool-creation-bot/
    ├── index.js                  ← pool-creation-bot
    ├── graduation-state.json     ← Progress tracking (auto-generated)
    ├── .env                      ← Bot wallet, Cetus config
    └── logs/                     ← Service logs
```

---

## 🔐 Security Notes

- All services require `.env` files with sensitive credentials
- **Never commit `.env` files to Git**
- Bot wallet private key is in `pool-creation-bot/.env`
- Database credentials are in `indexer/.env`
- Keep backups of all `.env` files in a secure location

---

## 📦 Dependencies

All services require:
- Node.js v18+
- PM2 (`npm install -g pm2`)
- PostgreSQL (for indexer/api)
- Sui CLI (for compilation-service)

---

## 🆘 Emergency Contacts

If services are down and you can't fix them:
1. Check this file for troubleshooting steps
2. Check `pm2 logs <service-name>` for errors
3. Check server resources: `free -h` and `df -h`
4. Restart server as last resort: `sudo reboot`

---

## ✅ Health Check

All services healthy when:
```bash
pm2 list
# Shows all 5 services as "online" with green status
```

Frontend working when:
- Token pages load without errors
- Charts display properly
- New token creation works
- Graduated tokens get pools automatically

---

**Last Updated**: 2025-10-31

**DO NOT DELETE THIS FILE OR THE SERVICES IT REFERENCES!**
