# ✅ Dual Contract Verification & Setup Guide

## Current Configuration Status

### ✅ Frontend - CONFIGURED
Your frontend (`lib/constants.ts`) is already set up for dual contract support:

**NEW Contract (v0.0.7):**
- Package: `0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5`
- Platform State: `0x8df834a79efd8fca907a6d832e93f6301b5d6cf7ff6d16c363829b3267feacff`
- Referral Registry: `0xef3fa25c0cd5620f20197047c9b8ca9320bbff1625a185b2c8013dbe8fc41814`
- Ticker Registry: `0xd98a0a56468df8d1e8a9b692881eacac17750336c8e4cd4b2f8d7c9468096d5b`

**LEGACY Contract (v0.0.6):**
- Package: `0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0`
- Platform State: `0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c`
- Referral Registry: `0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d`
- Ticker Registry: `0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3`

### ✅ Indexer Code - CONFIGURED
Your indexer (`indexer/index.js`) already has the correct default values and dual contract logic.

### ⚠️ Indexer .env - NEEDS SETUP
You need to create the indexer `.env` file to configure the backend properly.

---

## Step-by-Step Setup

### 1. Create Indexer .env File

Create `/workspace/indexer/.env` with these values:

```bash
# Database connection (update with your actual credentials)
DATABASE_URL=postgresql://memeindexer:your_password@localhost:5432/memecoins

# Sui Network
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# NEW Contract (v0.0.7 - all new curves will use this)
PLATFORM_PACKAGE=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5

# LEGACY Contract (v0.0.6 - existing community curves)
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0

# API server port (optional, defaults to 3002)
API_PORT=3002

# Discord webhook for alerts (optional)
DISCORD_WEBHOOK_URL=
```

### 2. Set Up Database (if not already done)

```bash
cd /workspace/indexer
./setup.sh
```

This will:
- Install PostgreSQL
- Create the `memecoins` database
- Set up the schema
- Install Node.js dependencies

### 3. Restart the Indexer

**Option A: Using PM2 (recommended)**
```bash
cd /workspace/indexer

# Stop existing indexer if running
pm2 stop memecoin-indexer 2>/dev/null || true
pm2 delete memecoin-indexer 2>/dev/null || true

# Start fresh
pm2 start index.js --name memecoin-indexer
pm2 save

# View logs
pm2 logs memecoin-indexer
```

**Option B: Using ecosystem file (runs both indexer + API)**
```bash
cd /workspace/indexer

# Stop all
pm2 delete all

# Start both services
pm2 start ecosystem.config.cjs

# Save configuration
pm2 save
pm2 startup

# View logs
pm2 logs
```

**Option C: Direct run (for testing)**
```bash
cd /workspace/indexer
node index.js
```

### 4. Verify It's Working

Watch the logs - you should see:
```
🚀 Starting Memecoin Indexer...
📦 NEW Package: 0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
📦 LEGACY Package: 0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
🌐 RPC: https://fullnode.testnet.sui.io:443
✅ Indexer started!

📚 Starting historical event indexing...
⏳ This may take a few minutes for all past events...

📥 Indexing Created events...
   Page 1: Indexed 50 events (Total: 50)
   ...
```

The indexer will:
1. Index ALL historical events from BOTH contracts
2. Then switch to live polling mode
3. Monitor both contracts for new events

---

## How to Test

### Test 1: Create a New Curve (Uses NEW Contract)

1. Go to your website
2. Click "Create Coin"
3. Fill in details and create
4. This will use the NEW contract automatically
5. Check indexer logs - should see "✅ Indexed token: YOUR_TOKEN"

### Test 2: Verify Old Curves Still Work

1. Query existing curves from the database:
```bash
psql -U memeindexer -d memecoins -c "SELECT ticker, coin_type FROM tokens ORDER BY created_at DESC LIMIT 10;"
```

2. Try trading an old curve:
   - Go to the token page
   - Buy some tokens
   - Sell some tokens
   - Check logs - should see both buy and sell events

### Test 3: Verify Dual Contract Detection

Your frontend has a helper function `getContractForCurve()` that automatically detects which contract a curve belongs to. This means:
- Old curves use LEGACY contract addresses
- New curves use NEW contract addresses
- Everything happens automatically!

---

## Monitoring Commands

```bash
# View indexer status
pm2 status

# View real-time logs
pm2 logs memecoin-indexer

# View last 100 lines of logs
pm2 logs memecoin-indexer --lines 100

# Restart if needed
pm2 restart memecoin-indexer

# Check what events were indexed
psql -U memeindexer -d memecoins -c "SELECT COUNT(*) as total_tokens FROM tokens;"
psql -U memeindexer -d memecoins -c "SELECT COUNT(*) as total_trades FROM trades;"
```

---

## Expected Behavior

### ✅ NEW Curves (created after upgrade)
- Use package: `0xf19ee4bbe...` 
- Have all v0.0.7 features
- Indexed and tradeable

### ✅ LEGACY Curves (created before upgrade)
- Use package: `0x98da9f73...`
- Keep working exactly as before
- Indexed and tradeable
- Backwards compatible

### ✅ Indexer
- Watches BOTH contracts simultaneously
- Indexes events from BOTH
- No data loss
- Seamless experience for users

---

## Troubleshooting

### Indexer not finding events
1. Check RPC endpoint is working:
```bash
curl -X POST https://fullnode.testnet.sui.io:443 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getChainIdentifier","params":[]}'
```

2. Check database connection:
```bash
psql -U memeindexer -d memecoins -c "SELECT version();"
```

3. Check package IDs are correct:
```bash
# Visit Sui Explorer
https://suiscan.xyz/testnet/object/0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
https://suiscan.xyz/testnet/object/0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
```

### Trades not showing up
1. Clear indexer state (to reindex from scratch):
```bash
psql -U memeindexer -d memecoins -c "TRUNCATE indexer_state CASCADE;"
pm2 restart memecoin-indexer
```

2. Check for rate limiting:
```bash
pm2 logs memecoin-indexer | grep -i "rate\|limit\|error"
```

### Charts not displaying
1. Check API server is running:
```bash
pm2 status memecoin-api
curl http://localhost:3002/health
```

2. Check frontend has correct API URL:
```bash
# Should be set in Vercel environment variables
NEXT_PUBLIC_INDEXER_API=http://your-server-ip:3002
```

---

## Summary

✅ **Frontend**: Already configured for dual contracts  
✅ **Indexer Code**: Already has dual contract logic  
⚠️ **Indexer .env**: You need to create this file  
⚠️ **Restart Indexer**: After creating .env file  

Once you create the `.env` file and restart, everything will work automatically!

**Your indexer will:**
- Index all historical events from BOTH contracts
- Monitor both contracts in real-time
- Support old curves AND new curves
- Provide seamless backward compatibility

🚀 **Ready to proceed!**
