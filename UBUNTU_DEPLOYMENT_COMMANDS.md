# Ubuntu Deployment Commands - Complete Guide

## 🚀 Deploy All Updates

Run these commands on your Ubuntu server at **13.60.235.109**

---

## Step 1: SSH to Server

```bash
ssh ubuntu@13.60.235.109
```

---

## Step 2: Navigate to Project

```bash
cd /var/www/Sweet-surprise
```

---

## Step 3: Pull Latest Code

```bash
# Stash any local changes
git stash

# Pull latest code from current branch
git pull origin cursor/handle-basic-instruction-55f2

# Or if you need to switch branches:
# git fetch
# git checkout cursor/handle-basic-instruction-55f2
# git pull
```

---

## Step 4: Update Database Schema

```bash
# Navigate to indexer
cd /var/www/Sweet-surprise/indexer

# Run migration to add cetus_pool_address column
psql $DATABASE_URL -f migrations/add_cetus_pool_column.sql

# Verify column was added
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='tokens' AND column_name='cetus_pool_address';"
```

**Expected output:**
```
     column_name      
----------------------
 cetus_pool_address
(1 row)
```

---

## Step 5: Restart Indexer API

```bash
# Check current status
pm2 status

# Restart indexer API server
pm2 restart indexer-api

# View logs to confirm it's working
pm2 logs indexer-api --lines 20
```

**Look for:** `🚀 API Server running on http://localhost:3002`

---

## Step 6: Set Up Pool Creation Bot

```bash
# Navigate to bot directory
cd /var/www/Sweet-surprise/pool-creation-bot

# Install dependencies (if not already installed)
npm install

# Copy env file if this is first time
cp .env.example .env

# Edit configuration
nano .env
```

### Configure .env:

```bash
# Network
NETWORK=testnet
RPC_URL=https://fullnode.testnet.sui.io:443

# Bot Wallet (Use your seed phrase)
BOT_SEED_PHRASE=word1 word2 word3 ... word12

# Platform Contracts
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
PLATFORM_STATE=0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9

# Cetus Configuration (Testnet)
CETUS_GLOBAL_CONFIG=0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
CETUS_POOLS=0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2

# Pool Parameters
TICK_SPACING=200  # 1% fees

# Bot Settings
POLLING_INTERVAL_MS=10000
MAX_RETRIES=3
GAS_BUDGET=100000000
MAX_CONCURRENT_POOLS=10

# Logging
LOG_LEVEL=info

# Indexer API
INDEXER_API_URL=http://localhost:3002
```

**Save:** Ctrl+X, then Y, then Enter

---

## Step 7: Fund Bot Wallet

```bash
# Get bot address (from your seed phrase)
# Calculate locally or check your wallet

# Fund with testnet SUI (just 0.5-1 SUI needed!)
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "YOUR_BOT_ADDRESS"
    }
  }'

# Verify balance
# (Use sui CLI or check on explorer)
```

---

## Step 8: Start Pool Creation Bot

```bash
# Still in pool-creation-bot directory
cd /var/www/Sweet-surprise/pool-creation-bot

# Create logs directory
mkdir -p logs

# Start bot with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs pool-creation-bot --lines 50
```

**Look for:**
```
Bot initialized { address: '0x...' }
Cetus SDK initialized
Pool configuration: 1% fee tier (tick spacing 200)
Cetus Burn Manager initialized
LP will be burned but fees can still be claimed! 🔥
🤖 Pool Creation Bot Started { network: 'testnet', pollingInterval: 10000 }
```

---

## Step 9: Save PM2 Configuration

```bash
# Save all PM2 processes
pm2 save

# Setup PM2 to start on server reboot
pm2 startup

# Run the command it gives you (will look like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## Step 10: Deploy Frontend to Vercel

From your **local machine** (not Ubuntu server):

```bash
# Push changes to GitHub
git add -A
git commit -m "feat: Add Cetus redirect & bot improvements"
git push origin cursor/handle-basic-instruction-55f2

# Vercel will auto-deploy from GitHub
# Or manually trigger: vercel --prod
```

---

## 🔍 Verification Commands

### Check All Services:

```bash
# Check all PM2 processes
pm2 status

# Should see:
# - indexer (running)
# - indexer-api (running)
# - compilation-service (running)
# - pool-creation-bot (running)
```

### Check Bot is Working:

```bash
# View bot logs
pm2 logs pool-creation-bot --lines 100

# Look for:
# - "Polling for graduations"
# - "0.5 SUI kept for future operations" (after first pool)
# - No ERROR messages
```

### Check Bot Balance (should grow over time):

```bash
# Check bot's SUI balance grows
# Each pool creation: +0.35 SUI (keeps 0.5, uses 0.15)
```

### Test Graduated Token Redirect:

1. Wait for a token to graduate
2. Visit token page on frontend
3. Should see "Token Graduated! Redirecting to Cetus..."
4. Should redirect to Cetus swap page

---

## 🎯 Quick Command Reference

```bash
# === Navigation ===
cd /var/www/Sweet-surprise
cd /var/www/Sweet-surprise/indexer
cd /var/www/Sweet-surprise/pool-creation-bot

# === Git ===
git pull origin cursor/handle-basic-instruction-55f2
git status
git log --oneline -5

# === Database ===
psql $DATABASE_URL -f migrations/add_cetus_pool_column.sql
psql $DATABASE_URL -c "SELECT * FROM tokens WHERE graduated=true LIMIT 5;"

# === PM2 ===
pm2 status
pm2 restart indexer-api
pm2 restart pool-creation-bot
pm2 logs pool-creation-bot
pm2 logs indexer-api
pm2 save

# === Bot ===
cd pool-creation-bot && npm install
pm2 start ecosystem.config.js
pm2 logs pool-creation-bot --lines 100

# === Logs ===
tail -f /var/www/Sweet-surprise/pool-creation-bot/logs/combined.log
tail -f /var/www/Sweet-surprise/pool-creation-bot/logs/error.log
```

---

## 🚨 Troubleshooting

### Bot Not Starting:

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# Check for missing dependencies
npm install

# Check .env file exists
ls -la .env

# Check logs for errors
pm2 logs pool-creation-bot --err
```

### Database Column Not Added:

```bash
# Check if migration file exists
ls -la /var/www/Sweet-surprise/indexer/migrations/add_cetus_pool_column.sql

# Run migration again
cd /var/www/Sweet-surprise/indexer
psql $DATABASE_URL -f migrations/add_cetus_pool_column.sql
```

### Indexer API Not Responding:

```bash
# Check if running
pm2 status indexer-api

# Restart
pm2 restart indexer-api

# Check logs
pm2 logs indexer-api --lines 50

# Test endpoint
curl http://localhost:3002/health
```

### Bot Says "Could not find SUI coin":

This is OK! It means the bot will use its own wallet for gas instead of curve SUI. Not a problem.

### Bot Shows "Failed to report pool to indexer":

This is just a warning. Pool was created successfully, just the indexer notification failed. Not critical.

---

## ✅ Success Indicators

### Bot is Working:

- PM2 shows "online" status
- Logs show "Bot initialized"
- Logs show "Cetus SDK initialized"
- No continuous ERROR messages
- After first pool: Bot balance grows

### Frontend is Working:

- Graduated tokens redirect to Cetus
- Regular tokens show trading interface
- No console errors

### Indexer is Working:

- API responds to `/health`
- `/api/tokens` includes `cetusPoolAddress`
- Database has `cetus_pool_address` column

---

## 📊 Monitoring

### Daily Check:

```bash
# SSH to server
ssh ubuntu@13.60.235.109

# Check all services
cd /var/www/Sweet-surprise
pm2 status

# Check bot logs for any issues
pm2 logs pool-creation-bot --lines 50 | grep ERROR

# Check bot balance (should be growing)
# (Use sui CLI or check explorer)
```

### Weekly Check:

```bash
# Update code
cd /var/www/Sweet-surprise
git pull origin cursor/handle-basic-instruction-55f2

# Restart services
pm2 restart all

# Check everything is OK
pm2 status
```

---

## 🎉 You're Done!

All services should now be running:

✅ Indexer (tracking blockchain)  
✅ Indexer API (serving data)  
✅ Compilation Service (compiling tokens)  
✅ Pool Creation Bot (auto-creating Cetus pools)  
✅ Frontend (auto-deployed on Vercel)

**Bot Features:**
- ✅ No AdminCap needed
- ✅ Self-funding (keeps 0.5 SUI per pool)
- ✅ Retries failed pools (up to 10 times)
- ✅ Handles mass graduations (batch processing)
- ✅ Reports pool addresses to indexer
- ✅ Graduated tokens redirect to Cetus

**Everything is automated!** 🚀
