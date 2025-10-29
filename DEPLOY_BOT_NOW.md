# 🚨 Deploy Bot NOW - Emergency Commands

Run these commands on your Ubuntu server RIGHT NOW to process graduated tokens!

---

## 🚀 Quick Deploy (Copy & Paste)

```bash
# 1. Go to project directory
cd /var/www/Sweet-surprise

# 2. Pull latest code
git pull origin cursor/handle-basic-instruction-55f2

# 3. Go to bot directory
cd pool-creation-bot

# 4. Update .env with new package ID
nano .env
```

**In nano editor:**
- Find the line: `PLATFORM_PACKAGE=...`
- Change it to: `PLATFORM_PACKAGE=0x84ac8c07fb96d2f6f22d4ddb5568b6ede2a973a08730b41991c49d6a8d48ce18`
- Save: Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# 5. Restart the bot
pm2 restart pool-creation-bot

# 6. Watch bot logs (live)
pm2 logs pool-creation-bot
```

**Expected output:**
```
✅ Bot initialized
📦 Platform package: 0x84ac8c07fb96d2f6f22d4ddb5568b6ede2a973a08730b41991c49d6a8d48ce18
🔄 Polling for new events...
💰 Distributing payouts
📦 Preparing liquidity
🏊 Creating Cetus pool
...
```

---

## 🔍 Check If Bot Is Working

```bash
# Check bot status
pm2 status

# Should show:
# pool-creation-bot | online

# Check recent logs
pm2 logs pool-creation-bot --lines 50
```

**Look for:**
- ✅ "Platform package: 0x84ac8c07..." (new package ID)
- ✅ "Polling for new events"
- ✅ "Processing graduation" (if graduated tokens exist)

**Bad signs:**
- ❌ "Error: Function not found"
- ❌ "Module not found"
- ❌ Bot keeps restarting

---

## 🎯 If Bot Finds Graduated Tokens

Bot will automatically:
1. Call `distribute_payouts()` - Sends platform fee + creator reward
2. Call `prepare_pool_liquidity()` - Extracts tokens + SUI
3. Create Cetus pool
4. Add liquidity
5. Burn LP with Burn Manager

**Watch it happen:**
```bash
pm2 logs pool-creation-bot --lines 100
```

---

## 🔧 If Bot Doesn't Process Graduated Tokens

### Check 1: Is bot address configured?

```bash
# On your local machine (with Sui CLI):
sui client object 0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9

# Look for: lp_bot_address
# Should be your bot's wallet address
```

**If not set or wrong:**
```bash
cd /var/www/Sweet-surprise
npx tsx set-lp-bot-address.ts
```

### Check 2: Does bot have correct package?

```bash
cd /var/www/Sweet-surprise/pool-creation-bot
cat .env | grep PLATFORM_PACKAGE

# Should show: 0x84ac8c07fb96d2f6f22d4ddb5568b6ede2a973a08730b41991c49d6a8d48ce18
```

**If wrong:**
```bash
nano .env
# Fix the PLATFORM_PACKAGE line
pm2 restart pool-creation-bot
```

### Check 3: Are tokens actually graduated?

**Check on Sui explorer:**
```
https://testnet.suivision.xyz/object/[CURVE_ID]

Look for:
- graduated: true
- lp_seeded: false  ← Should be false (bot hasn't processed yet)
- reward_paid: false ← Bot will set this to true first
```

---

## 🔥 Manual Processing (If Bot Won't Auto-Process)

If bot still won't process, you can manually trigger for each graduated token:

### Step 1: Distribute Payouts Manually

```bash
# For each graduated token
sui client call \
  --package 0x84ac8c07fb96d2f6f22d4ddb5568b6ede2a973a08730b41991c49d6a8d48ce18 \
  --module bonding_curve \
  --function distribute_payouts \
  --type-args "COIN_TYPE_HERE" \
  --args \
    0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9 \
    CURVE_ID_HERE \
  --gas-budget 100000000
```

### Step 2: Bot Will Auto-Detect After Payouts

Once `reward_paid = true`, bot should automatically process the rest!

---

## 📋 Graduated Tokens List

**Find graduated tokens:**

**Option 1: Check on your website**
- Go to token list
- Look for "Graduated" badge

**Option 2: Query database**
```bash
cd /var/www/Sweet-surprise/indexer
psql $DATABASE_URL -c "SELECT curve_id, coin_type FROM tokens WHERE graduated = true AND lp_seeded = false LIMIT 10;"
```

---

## ⚡ Quick Troubleshooting

### Bot keeps restarting:
```bash
pm2 logs pool-creation-bot --lines 200 | grep -i error
# Fix the error shown
```

### Bot shows "Module not found":
```bash
cd /var/www/Sweet-surprise/pool-creation-bot
rm -rf node_modules package-lock.json
npm install
pm2 restart pool-creation-bot
```

### Bot shows "Function not found":
```bash
# Wrong package ID!
cd /var/www/Sweet-surprise/pool-creation-bot
nano .env
# Make sure: PLATFORM_PACKAGE=0x84ac8c07fb96d2f6f22d4ddb5568b6ede2a973a08730b41991c49d6a8d48ce18
pm2 restart pool-creation-bot
```

---

## 🎯 Expected Timeline

**After restarting bot:**
- 0-10s: Bot initializes
- 10-20s: Bot queries for graduated tokens
- 20-30s: Bot finds graduated tokens (if any)
- 30s+: Bot starts processing each graduation

**Per graduation:**
- ~5s: Distribute payouts
- ~10s: Prepare liquidity
- ~15s: Create Cetus pool
- ~10s: Add liquidity
- ~10s: Burn LP
- **Total: ~50 seconds per token**

---

## ✅ Success Signs

**Bot logs should show:**
```
💰 Distributing payouts { curveId: '0x...' }
✅ Payouts distributed { txDigest: '...' }
📦 Preparing liquidity { curveId: '0x...' }
✅ Liquidity prepared
🏊 Creating Cetus pool
✅ Pool created { poolAddress: '0x...' }
🔥 Burning LP tokens
✅ LP burned successfully
🎉 Graduation complete!
```

**On blockchain:**
- Curve `reward_paid` = true
- Curve `lp_seeded` = true
- Cetus pool exists
- LP position burned/locked

---

## 🆘 Still Not Working?

**Send me:**
1. Bot logs: `pm2 logs pool-creation-bot --lines 100`
2. Bot .env: `cat pool-creation-bot/.env | grep PLATFORM`
3. Graduated token curve ID
4. Any errors you see

**I'll help debug immediately!** 🔧
