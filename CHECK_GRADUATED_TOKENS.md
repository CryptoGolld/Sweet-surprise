# Check Why Bot Isn't Processing Graduated Tokens

## 🔍 The Issue

Two tokens graduated but bot did nothing. Let's debug!

---

## Step 1: Check If Tokens Are Actually Graduated On-Chain

Run on Ubuntu:

```bash
# Check the two graduated tokens on Sui explorer
# Get their curve IDs and check:

# Visit: https://testnet.suivision.xyz/object/[CURVE_ID]
# Check fields:
# - graduated: should be true
# - lp_seeded: should be false (that's what bot should do)
```

---

## Step 2: Check If `prepare_liquidity_for_bot` Function Exists

The bot is trying to call `prepare_liquidity_for_bot()` but this function might not exist in your deployed contract!

**Check your contract:**

```bash
cd /var/www/Sweet-surprise

# Search for the function
grep -r "prepare_liquidity_for_bot" suilfg_launch/

# If NOT FOUND, your contract doesn't have it!
# You need to redeploy with updated contract
```

---

## Step 3: Check Bot is Monitoring Correct Events

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# Check what event the bot is listening for
grep "GraduationEvent" index.js

# Should show:
# MoveEventType: `${CONFIG.platformPackage}::bonding_curve::GraduationEvent`
```

---

## Step 4: Manual Check - Are There Graduation Events?

Run this to see if graduation events were emitted:

```bash
# On your local machine with sui CLI:
sui client call --package 0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348 \
  --module bonding_curve \
  --function list_functions

# Or check on explorer:
# https://testnet.suivision.xyz/txblock/[GRADUATION_TX]
# Look for emitted events
```

---

## 🎯 Most Likely Issue:

Your deployed contract **doesn't have `prepare_liquidity_for_bot()` function!**

It probably has the old functions:
- `seed_pool_prepare()`
- `seed_pool_and_create_cetus_with_lock()`

But the bot is trying to call:
- `prepare_liquidity_for_bot()` ← Doesn't exist!

---

## ✅ Solutions:

### Option 1: Update Bot to Use Existing Functions

Change bot to call the functions that actually exist in your contract.

### Option 2: Redeploy Contract with New Function

Deploy updated contract that has `prepare_liquidity_for_bot()`.

### Option 3: Manual Graduation (Quick Fix)

Manually call the graduation functions for the two tokens:

```bash
# Call seed_pool_prepare or similar function
# This will trigger the pool creation
```

---

## 🔍 Debug Commands for Ubuntu:

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# 1. Check bot logs for errors
pm2 logs pool-creation-bot --lines 200 | grep -i error

# 2. Check if bot is querying for events
pm2 logs pool-creation-bot --lines 200 | grep -i "query\|event\|graduation"

# 3. Check bot configuration
cat .env | grep PLATFORM

# 4. Test if bot can connect to RPC
node -e "import('dotenv').then(d => { d.default.config(); console.log('RPC:', process.env.RPC_URL); })"
```

---

**Tell me:**
1. What do the bot logs show? Any errors about missing functions?
2. Can you check on Sui explorer if those tokens emitted a `GraduationEvent`?
3. What's the curve ID of one of the graduated tokens?

Let me know and I'll help fix it! 🔧
