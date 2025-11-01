# Recalculate All Historical Prices - Guide

## What This Does

This script will:
1. **Fetch all tokens** from your database
2. **Get fresh data** from the blockchain for each token
3. **Recalculate prices and market caps** using the CORRECT formula (without the `/1e9` bug)
4. **Update the database** with accurate values

After this runs, all your historical token data will have correct prices!

## How to Run (On Ubuntu Server)

### Step 1: Stop the indexer temporarily
```bash
pm2 stop memecoin-indexer
```

This prevents the indexer from writing while we're recalculating.

### Step 2: Run the recalculation script
```bash
cd /var/www/Sweet-surprise
node indexer/recalculate-all-prices.js
```

You'll see output like:
```
🔧 Starting price recalculation for all tokens...
📊 Found 25 tokens to recalculate

Processing PEPE (0x123abc...)...
  ✅ Updated: Supply=5.2M, Price=0.000001234 SUI, MC=1234 SUI

Processing DOGE (0x456def...)...
  ✅ Updated: Supply=100.5M, Price=0.000001943 SUI, MC=1943 SUI

...

✅ Recalculation Complete!
📊 Summary:
   Updated: 25 tokens
   Skipped: 0 tokens
   Errors:  0 tokens
```

### Step 3: Restart the indexer
```bash
pm2 restart memecoin-indexer
```

The indexer will now continue with correct calculations for all future trades!

### Step 4: Check the results
```bash
# Watch the indexer logs
pm2 logs memecoin-indexer --lines 50

# Or check the API
curl http://localhost:3001/api/tokens | jq '.tokens[0]'
```

## What Gets Fixed

### Before (WRONG):
```json
{
  "ticker": "PEPE",
  "curve_supply": "5000000",
  "current_price_sui": 0.0000000000012,  // ❌ Way too small!
  "market_cap_sui": 1.2,                  // ❌ Way too small!
  "fully_diluted_valuation_sui": 1.2      // ❌ Way too small!
}
```

### After (CORRECT):
```json
{
  "ticker": "PEPE", 
  "curve_supply": "5000000",
  "current_price_sui": 0.000001234,       // ✅ Correct!
  "market_cap_sui": 1234,                 // ✅ Correct! (1,234 SUI)
  "fully_diluted_valuation_sui": 1234     // ✅ Correct!
}
```

## Expected Results

After recalculation, market caps should be in realistic ranges:

| Supply | Market Cap (SUI) | Market Cap (USD @ $3.50) |
|--------|------------------|--------------------------|
| 0 tokens | 1,000 | ~$3,500 |
| 1M tokens | 1,000 | ~$3,500 |
| 10M tokens | 1,009 | ~$3,531 |
| 50M tokens | 1,235 | ~$4,323 |
| 100M tokens | 1,943 | ~$6,801 |
| 500M tokens | 24,598 | ~$86,093 |
| 737M tokens | 52,272 | ~$182,952 |

## Troubleshooting

### Error: "Cannot find module '@mysten/sui/client'"
```bash
cd /var/www/Sweet-surprise
npm install
```

### Error: "Connection to database refused"
Check that your `.env` file has the correct `DATABASE_URL`.

### Error: "RPC rate limit"
The script has a 100ms delay between tokens. If you still hit rate limits, increase it:
```javascript
// In recalculate-all-prices.js, line 189
await new Promise(resolve => setTimeout(resolve, 500)); // Increase to 500ms
```

### Some tokens show "Invalid curve object"
These tokens may have been deleted or graduated. They'll be skipped automatically.

## How Long Does It Take?

- **~10 tokens:** 5-10 seconds
- **~50 tokens:** 30 seconds
- **~100 tokens:** 1 minute

The script processes about 10 tokens per second (with the 100ms delay).

## Is It Safe?

Yes! The script:
- ✅ Only READS from blockchain (no transactions)
- ✅ Only UPDATES database (doesn't delete)
- ✅ Uses the same formulas as the fixed indexer
- ✅ Can be run multiple times safely (idempotent)

## After Running

1. ✅ All token prices in database are correct
2. ✅ Market caps show realistic values (1K - 52K SUI range)
3. ✅ Frontend will display correct USD values
4. ✅ Indexer continues updating prices correctly for new trades

---

**Ready to run?**

```bash
# Stop indexer
pm2 stop memecoin-indexer

# Run recalculation
node indexer/recalculate-all-prices.js

# Restart indexer
pm2 restart memecoin-indexer

# Verify
pm2 logs memecoin-indexer
```

🎉 Your prices will be fixed!
