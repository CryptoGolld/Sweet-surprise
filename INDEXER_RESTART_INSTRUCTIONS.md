# Indexer Update & Restart Instructions

## Changes Made

### 1. Fixed Event Name Mismatch (CRITICAL FIX)
**File**: `indexer/index.js`

The indexer was looking for wrong event names in live polling:
- ❌ Before: `TokensPurchased` and `TokensSold`
- ✅ After: `Bought` and `Sold`

This is why new trades weren't being indexed! The legacy contract (and new contract) emit `Bought` and `Sold` events, not `TokensPurchased`/`TokensSold`.

### 2. Fixed Transaction Signature
**File**: `lib/sui/transactions.ts`

Both legacy and new contracts use the same function signature:
```typescript
bonding_curve::buy(
  cfg: &PlatformConfig,
  curve: &mut BondingCurve<T>,
  referral_registry: &mut ReferralRegistry,
  payment: Coin<SUI>,
  max_sui_in: u64,
  min_tokens_out: u64,
  deadline_ts_ms: u64,
  referrer: Option<address>,
  clk: &Clock
)
```

Previously, we incorrectly assumed legacy contracts had a different signature.

---

## How to Deploy

### On Your Ubuntu Server (where indexer runs):

```bash
# 1. SSH into your Ubuntu server
ssh user@your-server-ip

# 2. Navigate to project directory
cd /path/to/your/project

# 3. Pull latest changes
git pull origin main

# 4. Restart the indexer with PM2
pm2 restart memecoin-indexer

# 5. Watch logs to confirm it's working
pm2 logs memecoin-indexer --lines 50
```

### Expected Log Output:

After restart, you should see:
```
🔄 Polling for new events...
   Watching NEW: 0xf19ee4bbe2183adc...
   Watching LEGACY: 0x98da9f73a80663ec...
💰 Buy: 0x123... spent 1000000000 SUI
💸 Sell: 0x456... received 500000000 SUI
✨ Processed 2 new events
📊 Generated chart candles
```

---

## What This Fixes

### ✅ Issue 1: New Trades Not Indexed
- **Problem**: Indexer was listening for wrong event names
- **Solution**: Now listens for correct `Bought` and `Sold` events
- **Result**: All new trades will be indexed in real-time

### ✅ Issue 2: Charts Not Showing
- **Problem**: No trade data because indexer wasn't picking up trades
- **Solution**: Once indexer restarts, it will process all missed trades
- **Result**: Charts will populate with trade data

### ✅ Issue 3: Legacy Contract Compatibility
- **Problem**: Transaction signature didn't match legacy contract
- **Solution**: Updated to use correct signature with referral_registry
- **Result**: All buy/sell transactions will work on legacy curves

---

## Verification Steps

### 1. Check Indexer is Running
```bash
pm2 status
# Should show "memecoin-indexer" as "online"
```

### 2. Make a Test Trade
- Go to your frontend
- Buy or sell tokens on any coin
- Check indexer logs: `pm2 logs memecoin-indexer`
- You should see: "💰 Buy:" or "💸 Sell:" message

### 3. Verify Charts Load
- Navigate to a token page
- Charts should show price data after trades
- If no trades yet, it should say "No trading data yet" (this is correct)

### 4. Check Database
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Check recent trades
SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;

# Check if candles are being generated
SELECT * FROM price_snapshots ORDER BY timestamp DESC LIMIT 10;
```

---

## Rollback (if needed)

If something goes wrong:
```bash
# Check out previous commit
git log --oneline -n 5  # Find the previous commit hash
git checkout <previous-commit-hash>

# Restart indexer
pm2 restart memecoin-indexer
```

---

## Notes

- The indexer will automatically catch up on any missed events when it restarts
- Historical events are not re-indexed (only new ones from last checkpoint)
- If you need to re-index all historical events, delete the indexer_state table row:
  ```sql
  DELETE FROM indexer_state WHERE id = 1;
  ```
  Then restart the indexer.

---

## Support

If you see errors after restart:
1. Check `pm2 logs memecoin-indexer --err` for error logs
2. Verify DATABASE_URL is set correctly in `.env`
3. Verify RPC endpoint is working: `curl https://fullnode.testnet.sui.io:443`
4. Check if PostgreSQL is running: `systemctl status postgresql`
