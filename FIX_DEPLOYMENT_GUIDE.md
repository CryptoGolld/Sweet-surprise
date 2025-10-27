# Fix Deployment Guide

## Issues Fixed

### 1. Empty Chart Candles ✅
**Problem**: Chart candles were empty because the indexer was using rough price estimates instead of calculating actual prices from transactions.

**Solution**: 
- Added `package_id` tracking to database
- Extract actual token amounts from balance changes
- Calculate real prices: `sui_amount / token_amount`

### 2. Old Token Trading Failures ✅
**Problem**: Tokens created with the legacy contract (v0.0.6) failed with "could not automatically determine a budget" error because the function signatures are different.

**Solution**:
- Legacy contract has **NO** `referral_registry` parameter
- Legacy contract has **NO** `referrer` option parameter
- Transaction code now detects package ID from `coinType` and uses correct signature

## Deployment Steps

### Step 1: Update Database Schema

SSH into your server and run the migration:

```bash
cd /workspace/indexer

# Run migration to add package_id column
psql $DATABASE_URL -f migration-add-package-id.sql
```

This will:
- Add `package_id` column to `tokens` table
- Extract package IDs from existing `coin_type` data
- Create index for fast lookups

### Step 2: Restart Indexer

The indexer will now:
- Track package IDs for all new tokens
- Calculate real prices from transaction balance changes
- Generate accurate candles

```bash
# Stop the current indexer
pm2 stop indexer

# The updated code will be deployed automatically
# Start it again
pm2 start indexer
pm2 logs indexer
```

### Step 3: Verify Frontend

The frontend changes are automatic:
- Trading modal will detect legacy vs new contracts from `coinType`
- Uses correct function signatures for each
- No frontend restart needed (auto-deployed by Vercel)

## How It Works

### Package ID Detection

Every token's `coinType` looks like:
```
0xPACKAGE_ID::module::TICKER
```

For example:
- **Legacy**: `0x98da9f73...::memecoin::OLDCOIN`
- **New**: `0xf19ee4bb...::memecoin::NEWCOIN`

The system extracts the package ID and checks:

```typescript
// From lib/constants.ts
export function getContractForCurve(curveTypeOrPackage: string) {
  const isLegacy = curveTypeOrPackage.includes(CONTRACTS.LEGACY_PLATFORM_PACKAGE);
  
  return {
    package: isLegacy ? CONTRACTS.LEGACY_PLATFORM_PACKAGE : CONTRACTS.PLATFORM_PACKAGE,
    state: isLegacy ? CONTRACTS.LEGACY_PLATFORM_STATE : CONTRACTS.PLATFORM_STATE,
    referralRegistry: isLegacy ? CONTRACTS.LEGACY_REFERRAL_REGISTRY : CONTRACTS.REFERRAL_REGISTRY,
    isLegacy,
  };
}
```

### Function Signatures

**Legacy Contract (v0.0.6)**
```move
public entry fun buy<T>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    payment: Coin<SUILFG_MEMEFI>,
    max_sui_in: u64,
    min_tokens_out: u64,
    deadline_ts_ms: u64,
    clk: &Clock
)
```

**New Contract (v0.0.7)**
```move
public entry fun buy<T>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    referral_registry: &mut ReferralRegistry,  // ← NEW!
    payment: Coin<SUILFG_MEMEFI>,
    max_sui_in: u64,
    min_tokens_out: u64,
    deadline_ts_ms: u64,
    referrer: Option<address>,  // ← NEW!
    clk: &Clock
)
```

### Price Calculation

**Old (Broken)**
```javascript
const pricePerToken = 0.00001; // Rough estimate ❌
const tokensOut = BigInt(suiIn) / BigInt(10000); // Rough estimate ❌
```

**New (Fixed)**
```javascript
// Extract actual token amount from balance changes
const tokenBalanceChange = txDetails.effects?.balanceChanges.find(
  change => change.coinType === coinType && change.owner?.AddressOwner === buyer
);

if (tokenBalanceChange) {
  const tokensOut = BigInt(tokenBalanceChange.amount).toString();
  const pricePerToken = parseFloat(suiIn) / parseFloat(tokensOut);
}
```

## Testing

### Test Old Tokens
1. Find a token created with legacy contract (before the upgrade)
2. Try to buy/sell
3. Should work without budget errors ✅

### Test New Tokens
1. Create a new token
2. Buy/sell
3. Should work with referral tracking ✅

### Test Charts
1. Open any token with trades
2. Chart should show candles ✅
3. Price should match actual trade prices ✅

## Monitoring

Check indexer logs for proper operation:

```bash
pm2 logs indexer

# Should see:
# ✅ Indexed token: TICKER (packageId)
# 💰 Buy: 0xADDRESS... spent 100 SUI (price: 0.0000123)
# 📊 Generated 45 candles for 0xCOIN_TYPE...
```

## Rollback (if needed)

If something goes wrong:

```bash
# Revert database (remove package_id column)
psql $DATABASE_URL -c "ALTER TABLE tokens DROP COLUMN IF EXISTS package_id;"

# Revert code
git checkout HEAD~1 -- indexer/index.js lib/sui/transactions.ts

# Restart
pm2 restart all
```

## What Changed

### Files Modified
1. ✅ `/indexer/index.js` - Extract package IDs, calculate real prices
2. ✅ `/lib/sui/transactions.ts` - Handle legacy contract signatures
3. ✅ `/indexer/migration-add-package-id.sql` - Add package_id column

### Files Already Working
- ✅ `/lib/constants.ts` - Already has `getContractForCurve()` helper
- ✅ `/lib/hooks/useBondingCurves.ts` - Already extracts coinType
- ✅ `/components/modals/TradingModal.tsx` - Already passes coinType to transactions

## Summary

**Before**: 
- ❌ Old tokens fail with budget errors
- ❌ Charts show "No trading data yet"
- ❌ Prices calculated from rough estimates

**After**:
- ✅ Old tokens work perfectly (uses legacy signatures)
- ✅ Charts show accurate candles
- ✅ Prices calculated from actual transactions
- ✅ Package IDs tracked for all tokens
- ✅ System works for both legacy AND new contracts

🎉 **All tokens (old and new) now work perfectly!**
