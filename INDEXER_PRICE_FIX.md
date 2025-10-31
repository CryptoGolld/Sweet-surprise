# Indexer Price & Amount Fix

## Problem Summary

Charts were empty and trade history showed undefined amounts because the indexer was **NOT extracting actual token amounts** from transactions. Instead, it was using hardcoded estimates:

### What Was Wrong

**In `/workspace/indexer/index.js`:**

1. **Buy Events (Line 365-366):**
   ```javascript
   const pricePerToken = 0.00001; // Hardcoded!
   const tokensOut = BigInt(suiIn) / BigInt(10000); // Rough estimate!
   ```

2. **Sell Events (Line 454-455):**
   ```javascript
   const pricePerToken = 0.00001; // Hardcoded!
   const tokensIn = BigInt(suiOut) / BigInt(10000); // Rough estimate!
   ```

3. **API Field Names (api-server.js):**
   - API returned `tokenAmount` but frontend expected `token_amount`
   - API returned `suiAmount` but frontend expected `sui_amount`
   - API returned `price` but frontend expected `price_per_token`

## What Was Fixed

### ✅ 1. Extract ACTUAL Token Amounts from Balance Changes

**Buy Events:**
- Now fetches transaction with `showBalanceChanges: true`
- Extracts actual token amount from balance changes for the buyer
- Calculates real price: `price = sui_amount / token_amount`
- Falls back to estimation only if balance changes unavailable

**Sell Events:**
- Same approach - extracts actual token amounts from balance changes
- Calculates real price from actual amounts
- Handles negative balance changes correctly (tokens leaving)

### ✅ 2. Calculate Real Prices

```javascript
// NEW: Calculate ACTUAL price per token
const pricePerToken = BigInt(suiIn) > 0n && BigInt(tokensOut) > 0n
  ? parseFloat(suiIn) / parseFloat(tokensOut)
  : 0
```

### ✅ 3. Fixed API Field Names

Changed from camelCase to snake_case to match frontend expectations:
```javascript
// OLD
{
  suiAmount: row.sui_amount,
  tokenAmount: row.token_amount,
  price: parseFloat(row.price_per_token)
}

// NEW
{
  sui_amount: row.sui_amount,
  token_amount: row.token_amount,
  price_per_token: parseFloat(row.price_per_token)
}
```

### ✅ 4. Better Logging

Now shows actual amounts in logs:
```
💰 Buy: 0xabc123... spent 1.0000 SUILFG for 1000000.00 tokens @ 0.0000010000
💸 Sell: 0xdef456... sold 500000.00 tokens for 0.5000 SUILFG @ 0.0000010000
```

## How to Deploy the Fix

### 1. Restart the Indexer

The indexer will now start recording correct prices for **new trades**:

```bash
# On your Ubuntu server
cd /workspace/indexer
pm2 restart indexer
pm2 logs indexer  # Watch for the new detailed logs
```

### 2. Regenerate Historical Candles (Optional)

**IMPORTANT:** Old trades in the database still have wrong prices/amounts. To fix charts for existing tokens:

```bash
# Option A: Re-index all historical events (slow but accurate)
pm2 stop indexer
# Clear the indexer state
psql $DATABASE_URL -c "UPDATE indexer_state SET last_cursor = NULL, last_timestamp = 0 WHERE id = 1;"
pm2 start indexer
# This will re-process all events from the beginning

# Option B: Just regenerate candles from existing (incorrect) data
# This won't fix the underlying data, but will ensure charts display something
cd /workspace/indexer
node regenerate-candles.js
```

## Expected Results

After restarting the indexer:

✅ **Trade History** - Will show actual token amounts instead of "undefined"
✅ **Price Charts** - Will populate with real price data from actual trades
✅ **Market Cap** - Will be calculated correctly from real prices
✅ **Volume Stats** - Will reflect actual trading volumes

## Verification

You can verify the fix is working by:

1. **Make a test trade** (buy or sell a small amount)
2. **Check the logs** - Should show actual amounts like:
   ```
   💰 Buy: 0x12345... spent 0.1000 SUILFG for 100000.00 tokens @ 0.0000010000
   ```
3. **Check trade history** - Should display the amounts correctly
4. **Check the chart** - Should start showing price movement

## Technical Details

The fix extracts token amounts using Sui's `balanceChanges` field from transaction details:

```javascript
const txDetails = await client.getTransactionBlock({
  digest: event.id.txDigest,
  options: { 
    showObjectChanges: true,
    showBalanceChanges: true,  // ← KEY: This gives us actual amounts
    showEffects: true,
  },
});

const tokenBalanceChange = txDetails.balanceChanges.find(
  bc => bc.coinType === coinType && bc.owner?.AddressOwner === buyer
);

const tokensOut = tokenBalanceChange.amount.replace('-', '');
```

This is the **correct** way to track token amounts in Sui transactions.
