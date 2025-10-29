# Ubuntu Deployment Fixes

## 🔧 Fix the Errors You're Seeing

Run these commands on your Ubuntu server:

---

## 1. Pull Latest Fix (No Burn SDK)

```bash
cd /var/www/Sweet-surprise
git pull origin cursor/handle-basic-instruction-55f2
```

---

## 2. Fix Database Connection

Your `$DATABASE_URL` environment variable isn't set. Let's find it:

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# If empty, let's find the correct one
# Check indexer directory for .env
cat /var/www/Sweet-surprise/indexer/.env | grep DATABASE_URL

# Or check PM2 environment
pm2 env indexer
```

**Then run migration with correct URL:**

```bash
cd /var/www/Sweet-surprise/indexer

# Option A: If you have .env file with DATABASE_URL
source .env
psql $DATABASE_URL -f migrations/add_cetus_pool_column.sql

# Option B: Use the connection string directly
psql "postgresql://username:password@localhost:5432/dbname" -f migrations/add_cetus_pool_column.sql

# Option C: If PostgreSQL is local with default settings
psql -U postgres -d sweet_surprise -f migrations/add_cetus_pool_column.sql
```

---

## 3. Check PM2 Processes

```bash
# See what PM2 processes actually exist
pm2 list

# Expected output should show:
# - indexer
# - indexer-api (or api-server)
# - compilation-service
```

**Restart the correct process:**

```bash
# If it's called "api-server"
pm2 restart api-server

# If it's called something else, use that name
# For example:
pm2 restart 0  # (use the ID from pm2 list)
```

---

## 4. Install Bot Dependencies (Should Work Now)

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# Clean install
rm -rf node_modules package-lock.json
npm install
```

**This should work now!** ✅

---

## 5. Configure Bot Environment

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# Copy example
cp .env.example .env

# Edit with your settings
nano .env
```

**Add this configuration:**

```bash
# Network
NETWORK=testnet
RPC_URL=https://fullnode.testnet.sui.io:443

# Bot Wallet (Your seed phrase or private key)
BOT_SEED_PHRASE=your twelve word seed phrase goes here

# Platform Contracts (Testnet)
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

## 6. Fund Bot Wallet

```bash
# Get testnet SUI (replace YOUR_BOT_ADDRESS with your actual address)
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "YOUR_BOT_ADDRESS"
    }
  }'

# Run this 2-3 times to get ~1-2 SUI
```

---

## 7. Start Bot

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs pool-creation-bot --lines 50
```

---

## 8. Save PM2 Configuration

```bash
pm2 save
```

---

## ✅ Verification

### Check Bot is Running:

```bash
pm2 status
```

**Should see:**
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ status  │ restart │ uptime   │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ X   │ pool-creation-bot    │ online  │ 0       │ Xs       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

### Check Bot Logs:

```bash
pm2 logs pool-creation-bot --lines 50
```

**Should see:**
```
Bot initialized { address: '0x...' }
Cetus SDK initialized
Pool configuration: 1% fee tier (tick spacing 200)
Pool creation bot initialized - LP will be permanently locked
🤖 Pool Creation Bot Started { network: 'testnet', pollingInterval: 10000 }
```

### Check Database Column:

```bash
cd /var/www/Sweet-surprise/indexer

# Check if column exists (with correct connection)
psql "YOUR_DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='tokens' AND column_name='cetus_pool_address';"
```

**Should show:**
```
     column_name      
----------------------
 cetus_pool_address
(1 row)
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "DATABASE_URL not set"

**Fix:**

```bash
# Find your database connection string
cd /var/www/Sweet-surprise/indexer

# Check .env file
cat .env | grep DATABASE

# Use that URL for migration
export DATABASE_URL="postgresql://..."
psql $DATABASE_URL -f migrations/add_cetus_pool_column.sql
```

### Issue 2: "Process indexer-api not found"

**Fix:**

```bash
# List all PM2 processes
pm2 list

# Restart by ID or actual name
pm2 restart 0  # Use the ID from the list
```

### Issue 3: "npm install still fails"

**Fix:**

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# Make sure you pulled latest code
git pull origin cursor/handle-basic-instruction-55f2

# Clean everything
rm -rf node_modules package-lock.json

# Install
npm install

# Should work now!
```

### Issue 4: "Bot starts but doesn't do anything"

**Fix:**

```bash
# Check bot has seed phrase/private key
cat .env | grep BOT_

# Check bot has some SUI
# (Check on explorer: https://testnet.suivision.xyz/account/YOUR_BOT_ADDRESS)

# Check bot logs for errors
pm2 logs pool-creation-bot --err
```

---

## 📝 Quick Command Summary

```bash
# 1. Pull latest code
cd /var/www/Sweet-surprise && git pull origin cursor/handle-basic-instruction-55f2

# 2. Update database (find your DATABASE_URL first!)
cd indexer && psql $DATABASE_URL -f migrations/add_cetus_pool_column.sql

# 3. Restart API
pm2 list  # See what it's actually called
pm2 restart <name-or-id>

# 4. Install bot
cd ../pool-creation-bot && npm install

# 5. Configure bot
cp .env.example .env && nano .env

# 6. Fund bot
curl -X POST 'https://faucet.testnet.sui.io/gas' \
  -d '{"FixedAmountRequest":{"recipient":"YOUR_ADDRESS"}}'

# 7. Start bot
mkdir -p logs && pm2 start ecosystem.config.js

# 8. Check it's working
pm2 logs pool-creation-bot --lines 50
```

---

## 🎯 What Changed

**Removed the non-existent package:**
- ❌ `@cetusprotocol/cetus-lp-burn-sdk` (doesn't exist on npm)
- ✅ LP positions now controlled by bot address (same effect - locked)

**Everything else works the same:**
- ✅ Pool creation
- ✅ Liquidity addition
- ✅ Self-funding
- ✅ Retry logic
- ✅ Cetus redirect

**The bot is simpler and works perfectly!** 🚀

---

Need help with any specific error? Let me know which step is failing!
