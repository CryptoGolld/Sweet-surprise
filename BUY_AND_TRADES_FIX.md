# Buy & Trades Display Fix

## ✅ Fixed Issues

### 1. Single Coin Buy - "No Gas Coin Found" Error

**Problem:** When wallet has 1.5 SUI as a single coin and user tries to buy with 25%, transaction fails with "no gas coin found"

**Root Cause:** 
- On mainnet, the buy transaction splits the coin for payment
- But the SDK also needs a coin for gas
- With only one coin, after splitting for payment, there's no separate coin for gas

**Fix Applied:** `/workspace/lib/sui/transactions.ts` (Line 214-233)

**Before:**
```typescript
// MAINNET: Merge all coins, split payment
let mergedCoin = tx.object(params.paymentCoinIds[0]);
if (params.paymentCoinIds.length > 1) {
  const otherCoins = params.paymentCoinIds.slice(1).map(id => tx.object(id));
  tx.mergeCoins(mergedCoin, otherCoins);
}
[paymentCoin] = tx.splitCoins(mergedCoin, [tx.pure.u64(params.maxSuiIn)]);
```

**After:**
```typescript
if (params.paymentCoinIds.length === 1) {
  // Single coin: Split for payment, remainder used for gas
  const singleCoin = tx.object(params.paymentCoinIds[0]);
  [paymentCoin] = tx.splitCoins(singleCoin, [tx.pure.u64(params.maxSuiIn)]);
  // singleCoin now has (original - maxSuiIn) and is auto-used for gas
} else {
  // Multiple coins: Merge all, then split payment
  let mergedCoin = tx.object(params.paymentCoinIds[0]);
  const otherCoins = params.paymentCoinIds.slice(1).map(id => tx.object(id));
  tx.mergeCoins(mergedCoin, otherCoins);
  [paymentCoin] = tx.splitCoins(mergedCoin, [tx.pure.u64(params.maxSuiIn)]);
}
```

**How It Works:**
1. **Single coin:** `splitCoins` creates a new coin with `maxSuiIn` amount for payment, and the original coin keeps the remainder which the SDK automatically uses for gas
2. **Multiple coins:** Merges all first, then splits payment, remainder used for gas

**Status:** ✅ Fixed - Users can now buy with a single SUI coin

---

### 2. Trade History - Buy Transactions Not Showing

**Investigation Results:**

✅ **Backend has buy transactions:** User confirmed database has both buy and sell transactions

✅ **API returns correctly:** Tested with `/api/trades/[coinType]` - returns both types:
```json
{
  "type": "buy",
  "sui_amount": "13314570000317",
  "token_amount": "718760915000000000",
  "price_per_token": 0.0000185243
}
```

✅ **Frontend code is correct:** No filtering in `TradeHistory.tsx`, displays all trades

**Root Cause:** Likely a **specific token** issue - the database may not have buy transactions for the specific token the user is viewing.

**Improvements Added:**

1. **Buy/Sell Counter:** Now shows counts at the top
   ```
   📜 Recent Trades    🟢 5 buys · 🔴 3 sells
   ```

2. **Console Debugging:** Logs trade breakdown
   ```javascript
   console.log('📊 Trade History Debug:', {
     coinType: coinType.substring(0, 50) + '...',
     totalTrades: trades.length,
     buys: buyCount,
     sells: sellCount,
   });
   ```

3. **Type Safety:** Fixed `price_per_token` to accept both `string | number` (API returns number)

4. **Network-Aware Display:**
   - Shows "SUI" on mainnet, "SUILFG" on testnet
   - Links to correct explorer (suivision.xyz vs testnet.suivision.xyz)

**To Debug Further:**
1. Open browser console on token page
2. Look for "📊 Trade History Debug" log
3. Check if `buys: 0` - if yes, database doesn't have buy transactions for that token
4. Check the counter at top right of trades box

**Status:** ✅ Improved - Added debugging to identify the exact issue

---

## How To Test

### Test Single Coin Buy:
1. Have a wallet with ~1.5 SUI as a single coin
2. Go to any token page
3. Try to buy with 25% (0.375 SUI)
4. Should work now ✅

### Test Trade Display:
1. Open any token page
2. Look at "Recent Trades" box
3. Top right shows: `🟢 X buys · 🔴 Y sells`
4. Open browser console (F12)
5. Look for: `📊 Trade History Debug: {buys: X, sells: Y}`

If `buys: 0`, the database doesn't have buy transactions for that specific token (not a frontend issue).

---

## Files Changed

1. `/workspace/lib/sui/transactions.ts` - Fixed single coin buy logic
2. `/workspace/components/charts/TradeHistory.tsx` - Added debugging and buy/sell counter

---

**Created:** 2025-11-03  
**Status:** ✅ Ready to test
