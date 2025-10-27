# 🧹 Database Cleanup & Deployment Guide

## What This Does

1. **Backs up old package data** (for testnet rewards)
2. **Cleans database** (removes v0.0.6 and v0.0.7 data)
3. **Focuses on v0.0.8** package only
4. **Fixes charts** with fill-forward (continuous lines even with no trades)

---

## 🚀 Step-by-Step Instructions

### On Ubuntu Server:

```bash
# 1. Navigate to project directory
cd /var/www/Sweet-surprise

# 2. Pull latest changes
git pull origin main

# 3. Stop indexer (we'll restart after cleanup)
pm2 stop memecoin-indexer

# 4. Backup and clean old data
cd indexer
node backup-and-clean.js

# This will:
# - Backup all v0.0.6 and v0.0.7 data to a JSON file
# - Delete old data from database
# - Reset indexer state for fresh sync
# - Keep the backup file for testnet rewards tracking

# 5. Restart indexer (will re-sync with v0.0.8 only)
pm2 restart memecoin-indexer

# 6. Watch logs to verify
pm2 logs memecoin-indexer --lines 50
```

---

## ✅ Expected Output

### From backup-and-clean.js:

```
🗄️  Backing up and cleaning old package data...

📦 Step 1: Backing up old data for testnet rewards...
   ✅ Backed up X old tokens
   ✅ Backed up X old trades
   ✅ Backed up X old price snapshots
   ✅ Backed up X old token holders
   ✅ Backup saved to: ./backup-old-packages-1234567890.json

🗑️  Step 2: Deleting old package data from database...
   ✅ Deleted old price snapshots
   ✅ Deleted old token holders
   ✅ Deleted old trades
   ✅ Deleted old tokens

🔄 Step 3: Resetting indexer state...
   ✅ Indexer state reset (will re-sync on next start)

📊 Current database status:
   Tokens: 0
   Trades: 0

✅ Cleanup complete!
```

### From indexer logs:

```
🚀 Starting Memecoin Indexer (v0.0.8 only)...
📦 Package: 0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
🌐 RPC: https://fullnode.testnet.sui.io:443
✅ Indexer started!
📚 Starting historical event indexing...
```

---

## 📊 Chart Fix Details

### Before (broken):
- Charts only showed candles when trades happened
- Gaps between trades = empty chart areas
- No continuity

### After (fixed):
- Charts show continuous lines from token creation to now
- When no trades occur: O = H = L = C = last_price, volume = 0
- Smooth, continuous price history
- Standard OHLCV behavior

**Example:**
```
10:00 - Trade at $0.001 → Candle shows $0.001
10:01 - No trade       → Candle shows $0.001 (flat)
10:02 - No trade       → Candle shows $0.001 (flat)
10:03 - Trade at $0.002 → Candle shows $0.002
10:04 - No trade       → Candle shows $0.002 (flat)
```

---

## 🔍 Verification

After deployment, check:

### 1. Database is clean:
```bash
# SSH to Ubuntu server
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tokens;"
# Should show only v0.0.8 tokens
```

### 2. Indexer is watching correct package:
```bash
pm2 logs memecoin-indexer --lines 10
# Should see: "Watching: 0xa49978cdb7a2a6..."
# Should NOT see: "LEGACY" references
```

### 3. Charts are working:
- Open any token page on frontend
- Chart should show continuous line from creation
- No gaps or empty areas
- Even tokens with no recent trades show price history

---

## 📁 Backup File

The backup JSON file contains:
- All old tokens (v0.0.6 & v0.0.7)
- All old trades
- All old holders
- All old price snapshots

**Location:** `/var/www/Sweet-surprise/indexer/backup-old-packages-[timestamp].json`

**Purpose:** Testnet rewards tracking

**Important:** Keep this file safe! You'll need it to reward testnet participants.

---

## 🆘 Troubleshooting

### If indexer crashes after restart:

```bash
# Check logs
pm2 logs memecoin-indexer --err

# If database schema issues, check:
psql $DATABASE_URL

# Verify tables exist:
\dt

# Should see: tokens, trades, price_snapshots, token_holders, indexer_state
```

### If charts still empty:

```bash
# Manually regenerate charts
cd /var/www/Sweet-surprise/indexer
node fix-chart-generation.js
```

### If you need to restore old data:

```bash
# You have the backup file!
# Contact support or manually restore from:
# /var/www/Sweet-surprise/indexer/backup-old-packages-*.json
```

---

## ✅ Success Checklist

- [ ] Backup file created
- [ ] Old data deleted from database
- [ ] Indexer restarted successfully
- [ ] Indexer logs show v0.0.8 only
- [ ] Charts display continuous lines
- [ ] New tokens can be created
- [ ] Trades work correctly

---

## 🎉 After Completion

Your platform will:
- ✅ Only use v0.0.8 contract (`0xa49978cdb7a2a6...`)
- ✅ Show clean data (no old test tokens)
- ✅ Display continuous chart lines
- ✅ Have all old data backed up for rewards

**Frontend:** Will automatically deploy from main branch on Vercel

**Indexer:** Now running with fresh v0.0.8 data only

**Database:** Clean and focused on current contract

Ready for production! 🚀
