# Testnet Pool Creation Bot - Deployment Guide

## 🎯 Complete Setup Checklist

### Prerequisites

- [ ] Ubuntu server access (your existing server at 13.60.235.109)
- [ ] Bot wallet configured as LP bot address in platform_config (already done ✅)
- [ ] Initial SUI for first transaction (~0.5-1 SUI)
  - Bot will self-fund from pools after first few creations!
  - Keeps 0.5 SUI from each pool for future gas

---

## 📋 Step-by-Step Deployment

### Step 1: SSH to Server

```bash
ssh ubuntu@13.60.235.109
```

### Step 2: Navigate to Project & Pull Latest Code

```bash
cd /var/www/Sweet-surprise

# Pull latest changes with pool-creation-bot
git fetch
git checkout cursor/handle-basic-instruction-55f2
git pull origin cursor/handle-basic-instruction-55f2

# Verify bot files exist
ls -la pool-creation-bot/
```

Expected output:
```
pool-creation-bot/
├── index.js
├── index-v2.js
├── fee-collector.js
├── logger.js
├── package.json
├── ecosystem.config.js
├── .env.example
└── README.md
```

### Step 3: Install Dependencies

```bash
cd pool-creation-bot

# Install Node.js packages
npm install
```

Expected packages:
- @mysten/sui
- @cetusprotocol/cetus-sui-clmm-sdk
- @cetusprotocol/cetus-lp-burn-sdk
- dotenv
- winston

### Step 4: Create Logs Directory

```bash
mkdir -p logs
```

### Step 5: Configure Environment Variables

```bash
# Copy example to .env
cp .env.example .env

# Edit configuration
nano .env
```

**Fill in these values:**

```bash
# Network
NETWORK=testnet
RPC_URL=https://fullnode.testnet.sui.io:443

# CRITICAL: Your bot wallet private key
# This is the wallet that has AdminCap
BOT_PRIVATE_KEY=suiprivkey1234567890abcdef...

# Platform Contracts (Testnet - Already Correct)
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
PLATFORM_STATE=0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9

# Note: No AdminCap needed! Bot uses configured LP bot address from platform_config

# Cetus Configuration (Testnet)
CETUS_GLOBAL_CONFIG=0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
CETUS_POOLS=0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2
CETUS_PACKAGE=0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12

# Pool Parameters (1% fees)
TICK_SPACING=200
PAYMENT_COIN_TYPE=0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI

# Bot Settings
POLLING_INTERVAL_MS=10000
MAX_RETRIES=3
GAS_BUDGET=100000000

# Logging
LOG_LEVEL=info
```

**Save and exit:** Ctrl+X, then Y, then Enter

### Step 6: Get Your Bot Wallet Private Key

If you don't have the bot private key yet:

```bash
# On your local machine (NOT on server!)
# Export from Sui CLI
sui keytool export --key-identity <your-address>

# Or create new wallet
sui client new-address ed25519
sui keytool export --key-identity <new-address>
```

**Important:** 
- Keep this key SECRET
- Never commit to git
- This wallet needs AdminCap object

### Step 7: Fund Bot Wallet with Initial Gas

Bot needs minimal initial SUI (it will self-fund after first pools):

```bash
# Get testnet SUI from faucet (just need 1 SUI to start!)
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "<BOT_WALLET_ADDRESS>"
    }
  }'

# Check balance
sui client balance --address <BOT_WALLET_ADDRESS>
```

**Initial funding:** 0.5-1 SUI is enough!

**Why so little?** Bot keeps 0.5 SUI from each pool for future gas, so it self-funds! ✅

After 10 pools: ~6 SUI (never need to refill)

### Step 8: Test Configuration

```bash
# Test that .env is configured correctly
node -e "require('dotenv').config(); console.log('Network:', process.env.NETWORK); console.log('Bot key exists:', !!process.env.BOT_PRIVATE_KEY);"
```

Expected output:
```
Network: testnet
Bot key exists: true
```

### Step 9: Start Bot with PM2

```bash
# Start the pool creation bot
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs pool-creation-bot
```

Expected output:
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ status  │ restart │ uptime   │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 4   │ pool-creation-bot    │ online  │ 0       │ 0s       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

Logs should show:
```
Bot initialized { address: '0x86b38...' }
Cetus SDK initialized
Pool configuration: 1% fee tier (tick spacing 200)
Cetus Burn Manager initialized
LP will be burned but fees can still be claimed! 🔥
🤖 Pool Creation Bot Started { network: 'testnet', pollingInterval: 10000 }
```

### Step 10: Monitor Bot & Watch Self-Funding

```bash
# Real-time logs
pm2 logs pool-creation-bot --lines 50

# Or watch log file
tail -f logs/combined.log
```

**What to look for:**
- ✅ "Bot initialized" - Startup successful
- ✅ "Cetus SDK initialized" - Cetus connection OK
- ✅ "0.5 SUI kept for future operations" - Bot is self-funding!
- ✅ Bot balance growing after each pool
- ✅ No ERROR logs
- ⏳ Bot quietly polling every 10 seconds

### Step 11: Save PM2 Configuration

```bash
# Save PM2 processes
pm2 save

# Setup PM2 to start on server reboot
pm2 startup

# Follow the command it gives you (might need sudo)
```

---

## 🧪 Testing the Bot

### Option A: Wait for Real Graduation

Just wait for someone to graduate a token naturally:

```bash
# Monitor logs
pm2 logs pool-creation-bot --lines 0

# When graduation happens, you'll see:
# 🎓 Graduation detected! { curveId: '0x...', ... }
# 📦 Step 1/3: Preparing liquidity
# 🏊 Step 2/3: Creating Cetus pool
# 🔥 Step 3/3: Burning LP tokens
# ✅ Pool creation complete!
```

### Option B: Test with Manual Graduation

If you want to test immediately:

1. **Create a test token**
2. **Buy it out to graduation** (~13K SUILFG_MEMEFI)
3. **Watch bot logs** - should auto-create pool

---

## 📊 Monitoring & Maintenance

### Check Bot Status

```bash
# Is bot running?
pm2 status pool-creation-bot

# View recent logs
pm2 logs pool-creation-bot --lines 100

# Check error logs only
tail -f logs/error.log
```

### Restart Bot

```bash
# Restart if needed
pm2 restart pool-creation-bot

# Or stop/start
pm2 stop pool-creation-bot
pm2 start pool-creation-bot
```

### Check Bot Wallet Balance

```bash
# Check remaining gas
sui client balance --address <BOT_WALLET_ADDRESS>

# If low, get more testnet SUI
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{"FixedAmountRequest":{"recipient":"<BOT_ADDRESS>"}}'
```

### View Processed Graduations

```bash
# Check logs for successful completions
grep "Pool creation complete" logs/combined.log
```

---

## 🚨 Troubleshooting

### Bot Won't Start

**Error: Cannot find module**
```bash
cd /var/www/Sweet-surprise/pool-creation-bot
rm -rf node_modules package-lock.json
npm install
pm2 restart pool-creation-bot
```

**Error: BOT_PRIVATE_KEY not set**
```bash
nano .env
# Add BOT_PRIVATE_KEY=suiprivkey...
pm2 restart pool-creation-bot
```

### Bot Started But Not Processing

**Check if bot address has AdminCap:**
```bash
sui client objects --address <BOT_ADDRESS> | grep AdminCap
```

**Check bot has gas:**
```bash
sui client balance --address <BOT_ADDRESS>
```

**Check RPC connectivity:**
```bash
curl https://fullnode.testnet.sui.io:443 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"sui_getLatestSuiSystemState","params":[],"id":1}'
```

### Transaction Failures

**View failed transaction:**
```bash
# Check logs for digest
grep "Transaction failed" logs/combined.log

# View on explorer
# https://testnet.suivision.xyz/txblock/<DIGEST>
```

**Common issues:**
- Insufficient gas → Fund wallet
- Missing AdminCap → Transfer to bot
- Wrong Cetus addresses → Verify .env
- Network issues → Check RPC

---

## 📈 Success Indicators

### Bot is Working When:

✅ **PM2 shows "online"**
```bash
pm2 status
# Status should be "online"
```

✅ **Logs show polling**
```bash
pm2 logs pool-creation-bot --lines 10
# Should see periodic activity every 10s
```

✅ **No ERROR logs**
```bash
tail -n 50 logs/error.log
# Should be empty or minimal
```

✅ **Bot wallet has gas**
```bash
sui client balance --address <BOT_ADDRESS>
# Should have > 0.5 SUI
```

### First Successful Pool Creation:

When bot successfully creates first pool, you'll see:

```
🎓 Graduation detected! { txDigest: '0x...', curveId: '0x...', coinType: '...' }
Processing graduation { curveId: '0x...', coinType: '...' }
📦 Step 1/3: Preparing liquidity { curveId: '0x...' }
✅ Liquidity prepared { txDigest: '0x...', note: 'Bot received ~12K SUI + 207M tokens' }
🏊 Step 2/3: Creating Cetus pool { coinType: '...' }
Creating pool with 1% fees { coinA: '0x2::sui::SUI...', coinB: '...', feeTier: '1%', tickSpacing: 200 }
✅ Pool created! { poolAddress: '0x...', feeTier: '1%', tickSpacing: 200 }
💧 Step 3/3: Adding liquidity & burning position { poolAddress: '0x...' }
✅ Liquidity added & LP locked! { lockerAddress: '0x...', txDigest: '0x...', note: 'LP locker can now claim trading fees (1%)' }
🔥 Burning LP tokens (permanent lock) { poolAddress: '0x...' }
✅ LP position burned! { positionId: '0x...', txDigest: '0x...', note: 'Liquidity locked forever, but can still claim 1% trading fees!' }
🎉 Pool complete! Liquidity burned + 1% fees claimable
✅ Pool creation complete! { curveId: '0x...', poolAddress: '0x...', positionId: '0x...', status: 'success' }
```

**Verify on explorer:**
```
Pool: https://app.cetus.zone/liquidity/pools?search=<POOL_ADDRESS>
Position: https://testnet.suivision.xyz/object/<POSITION_ID>
```

---

## 🎯 Post-Deployment Checklist

After bot is running:

- [ ] PM2 shows "online" status
- [ ] Logs show "Bot initialized"
- [ ] Logs show "Cetus SDK initialized"
- [ ] No ERROR logs in last 5 minutes
- [ ] Bot wallet has >0.5 SUI
- [ ] AdminCap is in bot wallet
- [ ] PM2 saved (`pm2 save`)
- [ ] PM2 startup configured
- [ ] Monitoring set up (checking logs daily)

---

## 📞 Next Steps

### 1. Wait for Graduations

Bot is now monitoring. Just wait for tokens to graduate naturally.

### 2. Monitor Daily

```bash
# Check once per day
ssh ubuntu@13.60.235.109
pm2 logs pool-creation-bot --lines 50
```

### 3. Collect Fees (Later)

After pools accumulate fees:

```bash
# Start fee collector (optional, can wait)
pm2 start fee-collector.js --name fee-collector
```

### 4. Mainnet Deployment (When Ready)

When testnet works well:
- Update .env for mainnet
- Deploy same bot on mainnet
- Much higher volume = much more fees!

---

## 🎉 You're Done!

Bot is now:
- ✅ Running on testnet
- ✅ Monitoring for graduations every 10s
- ✅ Will auto-create pools with 1% fees
- ✅ Burns LP but can claim fees
- ✅ Fully automated!

**Just wait for graduations and watch the magic happen!** 🚀

---

## 📋 Quick Command Reference

```bash
# Check status
pm2 status pool-creation-bot

# View logs
pm2 logs pool-creation-bot

# Restart
pm2 restart pool-creation-bot

# Stop
pm2 stop pool-creation-bot

# Check bot wallet
sui client balance --address <BOT_ADDRESS>

# View log file
tail -f /var/www/Sweet-surprise/pool-creation-bot/logs/combined.log
```

**Questions? Check `BOT_DETAILED_FLOW.md` for technical details!**
