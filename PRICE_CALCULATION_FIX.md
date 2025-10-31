# Price Calculation Fix - Summary

## Problem Identified

Your website was displaying **completely wrong prices and market caps** due to a critical unit conversion bug. The spot prices were showing values 1 billion times smaller than they should be!

## Root Cause

The Move contract stores `token_supply` in **WHOLE TOKENS** (not in mist/base units):

```move
// From bonding_curve.move line 215-217
// token_supply tracks whole tokens, but minting requires smallest units (with decimals)
curve.token_supply = s2_clamped;
let tokens_to_mint = tokens_out * 1_000_000_000; // Convert whole tokens to smallest units
```

But the indexer was treating it as if it was in mist and **dividing by 1e9**:

```javascript
// WRONG CODE (old indexer/index.js line 817-818)
const curveSupplyMist = BigInt(tokenResult.rows[0]?.curve_supply || '0');
const curveSupply = Number(curveSupplyMist) / 1e9; // ❌ WRONG! Already in whole tokens
```

This made the supply appear 1 billion times smaller, causing:
- **Spot prices** to be 1 trillion times too small (due to quadratic formula)
- **Market caps** to be 1 trillion times too small
- **Progress bars** to show near 0% even with millions of tokens sold

## The Fix

### 1. **Indexer Fix** (`indexer/index.js`)

**Before:**
```javascript
const curveSupplyMist = BigInt(tokenResult.rows[0]?.curve_supply || '0');
const curveSupply = Number(curveSupplyMist) / 1e9; // Wrong!
```

**After:**
```javascript
// CRITICAL FIX: curve_supply is ALREADY in whole tokens (not mist!)
// Example: if curve_supply = "1000000", that's 1M tokens (NOT 0.001 tokens)
const curveSupply = Number(tokenResult.rows[0]?.curve_supply || '0');
```

### 2. **Frontend Fix** (`components/coins/CoinCard.tsx`)

**Before:**
```typescript
const progress = calculatePercentage(
  curve.curveSupply,
  BONDING_CURVE.MAX_CURVE_SUPPLY * 1e9 // Wrong!
);
```

**After:**
```typescript
// CRITICAL: curve.curveSupply is ALREADY in whole tokens (not mist!)
// MAX_CURVE_SUPPLY is also in whole tokens (737M), so compare directly
const progress = calculatePercentage(
  curve.curveSupply,
  BONDING_CURVE.MAX_CURVE_SUPPLY
);
```

### 3. **New Calculation Library** (`lib/utils/bondingCurveCalculations.ts`)

Implemented your developer friend's advice with:
- ✅ Exact contract formulas for spot price and TVL
- ✅ Newton-Raphson method for reverse calculations (TVL → supply)
- ✅ Prediction functions for future milestones
- ✅ Comprehensive documentation

## Contract Formulas (Exact)

### Spot Price Formula
```
p(s) = BASE_PRICE + (M_NUM * s²) / M_DEN
```
Where:
- `s` = token supply in **whole tokens** (e.g., 1,000,000 for 1M tokens)
- `BASE_PRICE` = 1,000 mist = 0.000001 SUI
- `M_NUM` = 1
- `M_DEN` = 10,593,721,631,205

### TVL Formula (Total SUI Raised)
```
TVL(s) = BASE_PRICE * s + (M_NUM * s³) / (3 * M_DEN)
```

### Market Cap Formula
```
Market Cap (FDV) = spot_price(s) × 1,000,000,000
```

## Verification Results

Run `node test-price-calculations.js` to verify:

```
Supply                   TVL (SUI)      Spot Price          Market Cap (SUI)
=================================================================================
Launch (0 tokens sold)   0.00           0.0000010000        1000.00
1M tokens sold           1.00           0.0000010000        1000.00
10M tokens sold          10.03          0.0000010090        1009.00
50M tokens sold          53.93          0.0000012350        1235.00
100M tokens sold         131.47         0.0000019430        1943.00
368.5M tokens (50%)      1943.00        0.0000138180        13818.00
500M tokens sold         4433.15        0.0000245980        24598.00
737M (Graduation)        13333.00       0.0000522720        52272.00
```

✅ **All invariants verified:**
- Initial market cap = exactly 1,000 SUI
- TVL at graduation (737M tokens) = exactly 13,333 SUI
- Market cap formula matches manual calculation
- Price increases monotonically with supply

## Newton-Raphson Implementation

Your friend's advice was **brilliant** - we implemented it for predictive features:

```typescript
// Find supply for a target TVL (reverse calculation)
export function findSupplyForTvl(targetTvlInSui: number): bigint {
  // Uses Newton-Raphson iteration: s_next = s - f(s) / f'(s)
  // where f(s) = TVL(s) - target, and f'(s) = spot_price(s)
  // Converges in ~10-15 iterations
}

// Predict price at future TVL
export function predictPriceAtTvl(targetTvlInSui: number): number {
  const supply = findSupplyForTvl(targetTvlInSui);
  return calculateSpotPrice(supply);
}

// Calculate milestones for progress displays
export function calculateMilestones(milestoneTvls: number[]) {
  // Returns [{tvl, supply, price, marketCap}, ...]
}
```

## Usage in Your Code

### Indexer (Backend)
```javascript
// When processing trades, update prices:
const curveSupply = Number(tokenResult.rows[0]?.curve_supply || '0');
const currentPrice = calculateSpotPrice(curveSupply);
const marketCap = currentPrice * 1_000_000_000;
```

### Frontend Components
```typescript
// Display market cap from indexer
const fdvSui = curve.fullyDilutedValuation || 0;
const marketCapUsd = fdvSui * suiPrice;

// Calculate progress
const progress = calculatePercentage(
  curve.curveSupply,
  BONDING_CURVE.MAX_CURVE_SUPPLY
);

// Calculate trade preview
const currentSupply = Number(curve.curveSupply);
const spotPrice = calculateSpotPrice(currentSupply);
```

## Files Changed

1. ✅ `indexer/index.js` - Fixed supply unit conversion (line 822)
2. ✅ `lib/utils/bondingCurve.ts` - Updated with correct formulas
3. ✅ `lib/utils/bondingCurveCalculations.ts` - NEW: Complete implementation with Newton-Raphson
4. ✅ `components/coins/CoinCard.tsx` - Fixed progress calculation (line 22-25)
5. ✅ `test-price-calculations.js` - NEW: Verification script

## Next Steps

1. **Restart your indexer** to recalculate all prices with the fix:
   ```bash
   pm2 restart indexer
   pm2 logs indexer --lines 100
   ```

2. **Monitor the database** - prices should update as trades happen:
   ```sql
   SELECT ticker, curve_supply, current_price_sui, market_cap_sui, fully_diluted_valuation_sui 
   FROM tokens 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Verify on frontend** - Market caps should now show realistic values:
   - At 1M tokens: ~$1,000 market cap
   - At 100M tokens: ~$1,943 market cap
   - At 737M tokens (graduation): ~$52,272 market cap

4. **Optional: Add milestone features** using the Newton-Raphson functions:
   ```typescript
   // Show "Price at 5000 SUI raised"
   const futurePrice = predictPriceAtTvl(5000);
   
   // Show all milestones
   const milestones = calculateMilestones([1000, 5000, 10000, 13333]);
   ```

## Why Your Friend's Advice Was Correct

Your developer friend correctly identified that:

1. ✅ **You CAN'T get supply from TVL directly** - need Newton-Raphson
2. ✅ **The formulas are "one-way streets"** - easy to go supply→price, hard to go TVL→supply
3. ✅ **Newton-Raphson is the right solution** for reverse calculations
4. ✅ **The exact constants and formulas** must match the contract

BUT - your current setup already had supply from the blockchain! The bug was just the unit conversion.

## Your Developer Friend's Full Contribution

Even though we didn't need Newton-Raphson for the main bug fix, their advice was **invaluable**:

1. **Diagnosed the real issue** - incorrect calculations
2. **Provided exact formulas** - which we used to fix everything
3. **Gave us Newton-Raphson** - which we'll use for cool features like:
   - "At 5000 SUI raised, price will be X"
   - Progress milestones with predicted values
   - Interactive price prediction charts

## Testing

```bash
# Run the test script
node test-price-calculations.js

# Expected output: All ✅ green checkmarks
```

---

**Status:** ✅ **FIXED**

All price calculations now match the contract exactly. Your website will display correct spot prices and market caps!
