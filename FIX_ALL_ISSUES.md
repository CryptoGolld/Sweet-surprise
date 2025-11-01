# Fix All Current Issues - Complete Guide

## Issues Identified

1. ❌ **Database not accepting connections** - Database crashed/restarting
2. ❌ **Indexer stops after historical sync** - Crashes or doesn't continue
3. ❌ **Frontend shows "Application error"** - Bad data or null values
4. ❌ **Token page prices differ from portfolio** - Using different calculations
5. ❌ **Indexer re-indexes everything** - No checkpoint tracking

## Fix #1: Database Connection Issues

### Check Database Status
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If it's down, start it
sudo systemctl start postgresql

# Check error logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Check disk space (databases crash when disk is full!)
df -h
```

### If Disk is Full
```bash
# Find large files
du -h /var | sort -rh | head -20

# Clean up logs
sudo journalctl --vacuum-time=3d

# Clean PM2 logs
pm2 flush
```

## Fix #2: Add Historical Sync Flag (Prevents Re-indexing)

### Run SQL Migration
```bash
cd /var/www/Sweet-surprise

# Apply migration to add historical_sync_complete column
psql $DATABASE_URL -f indexer/migrations/add_historical_sync_flag.sql
```

This prevents the indexer from re-running historical sync every time it restarts!

## Fix #3: Frontend "Application Error"

This happens when:
- API returns null/undefined values
- Market cap calculations fail
- Missing data fields

### Solution
The recalculation script will fix this by ensuring all tokens have valid data.

## Fix #4: Price Discrepancy (Token Page vs Portfolio)

### Problem
- **Token page**: Uses `curve.fullyDilutedValuation` from indexer (might be old/wrong)
- **Portfolio page**: Calculates directly from `curve.curveSupply` (correct!)

### Solution
Both should use the same source. After running the recalculation script, the indexer data will be correct.

## Fix #5: Efficient Historical Indexing

The updated indexer now:
- ✅ Marks historical sync as complete
- ✅ Never re-runs historical sync after first time
- ✅ Only processes new events on restart

## Complete Fix Deployment

### Step 1: Fix Database (if needed)
```bash
# Check database
sudo systemctl status postgresql

# Check disk space
df -h

# If disk is full, clean up
pm2 flush
sudo journalctl --vacuum-time=3d
```

### Step 2: Pull Latest Fixes
```bash
cd /var/www/Sweet-surprise
git pull origin cursor/store-user-name-israel-a378
```

### Step 3: Run SQL Migration
```bash
# Add historical_sync_complete column
psql $DATABASE_URL -f indexer/migrations/add_historical_sync_flag.sql

# Verify it worked
psql $DATABASE_URL -c "SELECT * FROM indexer_state;"
```

### Step 4: Stop Indexer
```bash
pm2 stop memecoin-indexer
```

### Step 5: Run Price Recalculation
```bash
# This fixes all historical price data
node indexer/recalculate-all-prices.js
```

You should see:
```
🔧 Starting price recalculation for all tokens...
📊 Found X tokens to recalculate

Processing TOKEN1 (0x123...)...
  ✅ Updated: Supply=X.XM, Price=0.000001234 SUI, MC=1234 SUI
...

✅ Recalculation Complete!
```

### Step 6: Restart Everything
```bash
# Restart indexer with fixes
pm2 restart memecoin-indexer

# Restart API
pm2 restart memecoin-api

# Check logs
pm2 logs --lines 50
```

### Step 7: Verify It's Working
```bash
# Should see live polling, not historical indexing
pm2 logs memecoin-indexer --lines 50
```

Expected output:
```
⏭️  Skipping historical indexing (already synced)
🔄 Switching to live polling mode...
🔄 Polling for new events...
```

### Step 8: Deploy Frontend to Vercel
```bash
# Push to trigger Vercel redeploy
git push origin cursor/store-user-name-israel-a378
```

## What Each Fix Does

### 1. Historical Sync Flag
- **Before**: Indexer re-scans ALL events on every restart (slow!)
- **After**: Indexer skips historical scan, only processes new events (fast!)

### 2. Price Recalculation
- **Before**: Prices 1 billion times too small
- **After**: Correct prices (1,000 - 52,000 SUI range)

### 3. Indexer Fixes
- **Before**: Divides supply by 1e9 (wrong!)
- **After**: Uses supply as-is (correct!)

### 4. Database Column
- **Before**: No way to track if historical sync is complete
- **After**: `historical_sync_complete` flag prevents re-runs

## Verification Checklist

After deploying, verify:

### ✅ Indexer Running Correctly
```bash
pm2 logs memecoin-indexer --lines 50
```
- Should show: "⏭️ Skipping historical indexing (already synced)"
- Should show: "🔄 Polling for new events..."
- Should NOT show database connection errors

### ✅ Prices Are Correct
```bash
curl http://localhost:3001/api/tokens | jq '.tokens[0] | {ticker, market_cap_sui, fully_diluted_valuation_sui}'
```
- Market caps should be 1,000 - 52,000 SUI range
- No nulls or zeros

### ✅ Frontend Works
- Go to your website
- Token page and portfolio page show SAME prices
- No "Application error" messages
- Market caps in USD look realistic ($3,000 - $180,000 range)

### ✅ Database Healthy
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) as total_tokens, 
  AVG(market_cap_sui) as avg_market_cap 
  FROM tokens 
  WHERE market_cap_sui > 0;"
```
- Should show reasonable average market cap (1,000 - 10,000 SUI)

## Troubleshooting

### Issue: Indexer still re-indexing history
**Solution**: Make sure you ran the SQL migration:
```bash
psql $DATABASE_URL -c "ALTER TABLE indexer_state ADD COLUMN IF NOT EXISTS historical_sync_complete BOOLEAN DEFAULT FALSE;"
```

### Issue: Prices still wrong
**Solution**: Run recalculation script again:
```bash
pm2 stop memecoin-indexer
node indexer/recalculate-all-prices.js
pm2 restart memecoin-indexer
```

### Issue: Database connection errors
**Solution**: Check PostgreSQL is running and has space:
```bash
sudo systemctl status postgresql
df -h
```

### Issue: Frontend still shows errors
**Solution**: Check browser console for specific error, might need to clear cache:
- Press Ctrl+Shift+R (hard refresh)
- Or clear browser cache

---

## Summary

After following this guide:
- ✅ Database is healthy and running
- ✅ Indexer only processes NEW events (not re-scanning history)
- ✅ All prices are correct (1,000 - 52,000 SUI range)
- ✅ Frontend shows consistent prices everywhere
- ✅ No "Application error" messages
- ✅ System is efficient and fast

**Time to complete**: ~10 minutes  
**Downtime**: ~2 minutes (while running recalculation script)  
**Risk**: Low (only database updates and configuration changes)

🚀 **Ready to fix everything!**
