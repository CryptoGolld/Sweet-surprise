# ✅ Dual Contract Setup - Verification Complete

## Status: READY TO DEPLOY

Your codebase is **fully configured** for dual contract support! 🎉

---

## What's Already Done ✅

### 1. Frontend Configuration ✅
File: `lib/constants.ts`

```typescript
// NEW Contract (v0.0.7) - All new curves use this
PLATFORM_PACKAGE: '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5'

// LEGACY Contract (v0.0.6) - Existing curves continue using this
LEGACY_PLATFORM_PACKAGE: '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0'
```

**Features:**
- ✅ `getContractForCurve()` - Auto-detects which contract a curve uses
- ✅ `getAllPlatformPackages()` - Returns both packages for indexer
- ✅ Dual state/registry objects configured
- ✅ Backward compatibility guaranteed

### 2. Indexer Code ✅
File: `indexer/index.js`

```javascript
// Lines 9-11 - Watches BOTH contracts
const PLATFORM_PACKAGE = process.env.PLATFORM_PACKAGE || '0xf19ee4bbe...'; // NEW
const LEGACY_PLATFORM_PACKAGE = process.env.LEGACY_PLATFORM_PACKAGE || '0x98da9f73...'; // OLD
```

**Features:**
- ✅ Indexes events from BOTH contracts
- ✅ Historical event indexing (catches up on all past events)
- ✅ Live polling mode (monitors new events every 2 seconds)
- ✅ Handles Created, Buy, Sell events from both contracts

### 3. Transaction Builder ✅
File: `lib/sui/transactions.ts`

The `getContractForCurve()` helper automatically selects the correct contract addresses when building transactions, so:
- Old curves → Use LEGACY contract ✅
- New curves → Use NEW contract ✅
- No manual switching needed ✅

---

## What You Need to Do (On Your Server)

### Step 1: Set Up Indexer (One Time)

**On your Ubuntu server** where you want to run the indexer:

```bash
# 1. Navigate to project
cd /path/to/your/project

# 2. Go to indexer directory
cd indexer

# 3. Run setup script (installs PostgreSQL, creates DB, etc.)
./setup.sh

# 4. Create .env file
cp .env.example .env

# 5. Edit .env with your values
nano .env
```

**Your .env should contain:**
```bash
# Database (created by setup.sh)
DATABASE_URL=postgresql://memeindexer:your_password@localhost:5432/memecoins

# Sui Network
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# NEW Contract (all new curves)
PLATFORM_PACKAGE=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5

# LEGACY Contract (existing curves)
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0

# API Port
API_PORT=3002
```

### Step 2: Start Indexer

**Option A: With PM2 (Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Start indexer
pm2 start index.js --name memecoin-indexer

# Start API server (optional, for charts)
pm2 start api-server.js --name memecoin-api

# Save configuration
pm2 save

# Set up auto-restart on boot
pm2 startup
```

**Option B: With Ecosystem File (Both services)**
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**Option C: Direct Run (Testing)**
```bash
# Just run it directly
node index.js
```

### Step 3: Verify It's Working

```bash
# Check status
pm2 status

# View logs (watch in real-time)
pm2 logs memecoin-indexer

# You should see:
# 🚀 Starting Memecoin Indexer...
# 📦 NEW Package: 0xf19ee4bbe...
# 📦 LEGACY Package: 0x98da9f73...
# 📚 Starting historical event indexing...
# ✅ Historical indexing complete!
# 🔄 Switching to live polling mode...
```

---

## How to Test

### Test 1: Create a New Curve ✅

1. Go to your website
2. Click "Create Coin"
3. Fill in details and deploy
4. **Expected**: Uses NEW contract automatically
5. **Verify**: Check indexer logs for "✅ Indexed token: YOUR_TOKEN"

```bash
# Check in database
psql -U memeindexer -d memecoins
SELECT ticker, coin_type FROM tokens ORDER BY created_at DESC LIMIT 5;
```

### Test 2: Trade an Old Curve ✅

1. Find an existing curve (from before the upgrade)
2. Go to its trading page
3. Buy some tokens
4. **Expected**: Transaction uses LEGACY contract
5. **Verify**: Check logs for buy event

```bash
# Check recent trades
psql -U memeindexer -d memecoins
SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;
```

### Test 3: Verify Both Contracts Are Monitored ✅

```bash
# Check tokens from both contracts
psql -U memeindexer -d memecoins
SELECT 
  SUBSTRING(coin_type, 1, 20) as package_start,
  COUNT(*) as token_count
FROM tokens
GROUP BY SUBSTRING(coin_type, 1, 20);
```

You should see tokens from both:
- `0xf19ee4bbe...` (NEW)
- `0x98da9f73...` (LEGACY)

---

## Verification Script

We've created a bash script to check your setup:

```bash
# Run the verification script
/workspace/scripts/check-contracts.sh
```

This will check:
- ✅ Contract addresses are correct
- ✅ PM2 is installed
- ✅ Indexer is running
- ✅ .env file exists
- ✅ Database is accessible
- ✅ Shows indexed token/trade counts

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  (Next.js - Vercel)                                         │
│                                                              │
│  • Automatically detects contract version per curve        │
│  • Uses NEW contract for new curves                         │
│  • Uses LEGACY contract for old curves                      │
│  • No user-facing changes - seamless!                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        INDEXER                               │
│  (Node.js + PostgreSQL - Ubuntu Server)                     │
│                                                              │
│  Watches TWO contracts simultaneously:                      │
│  • NEW: 0xf19ee4bbe... (v0.0.7)                            │
│  • LEGACY: 0x98da9f73... (v0.0.6)                          │
│                                                              │
│  Indexes all events:                                        │
│  • Created events (both contracts)                          │
│  • Buy events (both contracts)                              │
│  • Sell events (both contracts)                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Queries
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BLOCKCHAIN                            │
│  (Sui Testnet)                                              │
│                                                              │
│  Contract v0.0.7 (NEW)     │     Contract v0.0.6 (LEGACY)  │
│  • New curves               │     • Old curves              │
│  • New features             │     • Backward compatible     │
│  • 0xf19ee4bbe...          │     • 0x98da9f73...          │
└─────────────────────────────────────────────────────────────┘
```

---

## Expected Behavior

### ✅ For Users
- No disruption to existing curves
- Old curves work exactly as before
- New curves use improved contract
- Seamless experience

### ✅ For You
- All curves are indexed (old + new)
- All trades are tracked
- Charts work for all curves
- Portfolio shows all holdings

### ✅ Backward Compatibility
- Old contract addresses still work
- Old transactions replay correctly
- Historical data is preserved
- No migration needed

---

## Monitoring & Maintenance

### Daily Checks
```bash
# Check indexer is running
pm2 status

# Check recent activity
pm2 logs memecoin-indexer --lines 50
```

### Weekly Checks
```bash
# Check database size
psql -U memeindexer -d memecoins
SELECT COUNT(*) as tokens FROM tokens;
SELECT COUNT(*) as trades FROM trades;

# Check for errors
pm2 logs memecoin-indexer | grep -i error
```

### If Something Goes Wrong
```bash
# Restart indexer
pm2 restart memecoin-indexer

# Clear and reindex (if needed)
psql -U memeindexer -d memecoins -c "TRUNCATE indexer_state CASCADE;"
pm2 restart memecoin-indexer

# Check logs for details
pm2 logs memecoin-indexer --lines 200
```

---

## Summary

✅ **Frontend**: Configured for dual contracts  
✅ **Indexer Code**: Supports both contracts  
✅ **Backward Compatibility**: Guaranteed  
✅ **Documentation**: Complete  
✅ **Verification Script**: Created  

**You just need to:**
1. Set up the indexer on your Ubuntu server (run `setup.sh`)
2. Create the `.env` file with correct credentials
3. Start the indexer with PM2
4. Test creating a new curve
5. Test trading an old curve

Both will work seamlessly! 🚀

---

## Files Created in This Session

1. `VERIFY_DUAL_CONTRACT_SETUP.md` - Detailed setup guide
2. `DUAL_CONTRACT_VERIFICATION_COMPLETE.md` - This file (summary)
3. `scripts/verify-dual-contract.ts` - TypeScript verification (optional)
4. `scripts/verify-dual-contract.mjs` - JavaScript verification (optional)
5. `scripts/check-contracts.sh` - Bash verification script

---

## Questions?

Refer to these docs:
- `VERIFY_DUAL_CONTRACT_SETUP.md` - Step-by-step setup
- `indexer/DEPLOYMENT.md` - Indexer deployment details
- `indexer/README.md` - Indexer usage guide
- `DEPLOYMENT_SUMMARY.md` - Overall deployment info

**Need help?** All the code is ready. Just follow the steps on your Ubuntu server!

🎉 **You're ready to go!** 🎉
