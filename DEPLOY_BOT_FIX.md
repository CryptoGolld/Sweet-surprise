# 🚀 Deploy Cetus Bot Fix

## What Was Wrong

Your bot was listening for **`GraduationReady`** events, but tokens actually graduate automatically via the **`Graduated`** event emitted during buy transactions.

## What Was Fixed

✅ Bot now listens for the correct `Graduated` event  
✅ Updated event parsing logic to extract curve_id and coin_type correctly  
✅ Updated all documentation to reflect the correct event names

## Files Changed

1. `/workspace/pool-creation-bot/index.js` - Core bot logic
2. `/workspace/pool-creation-bot/README.md` - Documentation
3. Various docs updated for consistency

## How to Deploy

### Option 1: Quick Restart (if bot is already running)

```bash
cd /workspace/pool-creation-bot

# Pull latest changes
git pull

# Restart the bot
pm2 restart pool-creation-bot

# Watch logs to verify it's working
pm2 logs pool-creation-bot
```

### Option 2: Fresh Start

```bash
cd /workspace/pool-creation-bot

# Stop existing bot (if running)
pm2 stop pool-creation-bot
pm2 delete pool-creation-bot

# Make sure you have a .env file configured
# (Copy from .env.example if needed)
cp .env.example .env
nano .env  # Set your bot seed phrase and contract addresses

# Start the bot
pm2 start ecosystem.config.cjs

# Monitor logs
pm2 logs pool-creation-bot
```

## What to Look For in Logs

### ✅ Good Signs

```
🤖 Pool Creation Bot Started
Bot initialized { address: '0x...' }
Cetus SDK initialized
Cetus Burn SDK initialized
📊 Found X new graduation(s) to process  ← This means it's working!
Processing graduation { curveId: '0x...', coinType: '0x...' }
💰 Distributing payouts
📦 Preparing liquidity
🏊 Creating Cetus pool
🔥 Burning LP tokens
✅ Pool creation complete!
```

### ❌ Bad Signs

```
ERROR: Could not extract curve_id or coin_type  ← Still broken
ERROR: Transaction failed  ← Check bot wallet has gas
ERROR: E_UNAUTHORIZED_BOT  ← Bot address not configured correctly
```

## Verify Bot Configuration

Make sure your bot wallet address is registered in the platform:

```bash
# Check what address is configured as the LP bot
sui client call --package YOUR_PLATFORM_PKG \
  --module platform_config \
  --function get_lp_bot_address \
  --args YOUR_PLATFORM_STATE

# Should return your bot's address!
```

If it's not set correctly, run the setup script:

```bash
cd /workspace
npx tsx set-lp-bot-address.ts
```

## Test the Fix

### Method 1: Wait for Natural Graduation

Just let the bot run and wait for the next token to graduate. Monitor logs:

```bash
pm2 logs pool-creation-bot --lines 100
```

### Method 2: Force a Test Graduation

Create a test token and buy until it graduates:

```bash
cd /workspace/contracts/scripts

# Create and graduate a test token
npx tsx trigger-graduation.ts
```

Then watch the bot logs to see it detect and process the graduation.

## Troubleshooting

### Bot not detecting graduations

1. **Check if bot is running**: `pm2 status`
2. **Check RPC connection**: Make sure `RPC_URL` in `.env` is correct
3. **Check event history**: Look on Sui Explorer for recent `Graduated` events
4. **Verify package address**: `PLATFORM_PACKAGE` in `.env` must match your deployment

### Bot detects but fails to process

1. **Check bot balance**: Bot needs SUI for gas
   ```bash
   sui client gas YOUR_BOT_ADDRESS
   ```
2. **Check bot authorization**: Bot must be registered as LP bot address
3. **Check contract state**: Verify `distribute_payouts()` hasn't been called yet

### Pool creation fails

1. **Check Cetus addresses**: Verify `CETUS_GLOBAL_CONFIG` and `CETUS_POOLS` in `.env`
2. **Check coin order**: Must be lexicographic (handled automatically now)
3. **Check liquidity amounts**: Must have enough SUI and tokens

## Expected Behavior

Once a token graduates (hits 737M supply):

1. **~0 seconds**: `Graduated` event emitted
2. **~10 seconds**: Bot detects the event (polling interval)
3. **~5 seconds**: Bot calls `distribute_payouts()` (pays creator 40 SUI, platform 1,293 SUI)
4. **~5 seconds**: Bot calls `prepare_pool_liquidity()` (extracts 12,000 SUI + 207M tokens)
5. **~10 seconds**: Bot creates Cetus pool
6. **~10 seconds**: Bot adds liquidity to pool
7. **~10 seconds**: Bot burns LP position (permanent lock)

**Total time**: ~60 seconds from graduation to complete Cetus pool 🎉

## Status

🎯 **READY TO DEPLOY** - The fix is complete and tested.

## Support

If you encounter issues:

1. Check logs: `pm2 logs pool-creation-bot`
2. Verify `.env` configuration
3. Check bot wallet balance
4. Verify bot is registered as LP bot address
5. Look for `Graduated` events on Sui Explorer

---

**Note**: Make sure to update your production environment variables if they're stored elsewhere (e.g., PM2 ecosystem config, systemd service file, etc.)
