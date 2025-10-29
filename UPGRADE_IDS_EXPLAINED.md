# 🆔 What IDs Change During Upgrade?

## 📋 Quick Answer

**Only 1 ID changes:** `PLATFORM_PACKAGE`  
**Everything else stays the same!**

---

## 🔄 What Changes

### PLATFORM_PACKAGE ✏️
```typescript
// Before (v0.0.8)
PLATFORM_PACKAGE: '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348'

// After (v0.0.9)
PLATFORM_PACKAGE: '0x...new_package_id_from_upgrade...'
```

**Why?** This is the Move package that contains the code. When you upgrade, you publish a new version with a new ID.

---

## ✅ What DOESN'T Change (Stays the Same)

### All Shared/Owned Objects:
```typescript
// These are OBJECTS, not code packages - they persist!

PLATFORM_STATE:     '0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9' ✅
REFERRAL_REGISTRY:  '0x964b507850a0b51a736d28da9e8868ce82d99fe1faa580c9b4ac3a309e28c836' ✅
TICKER_REGISTRY:    '0xd8ba248944efc41c995a70679aabde9e05b509a7be7c10050f0a52a9029c0fcb' ✅
ADMIN_CAP:          '0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11' ✅
UPGRADE_CAP:        '0x7ef7bc39eea080ebddb61426c3b81d099690d3d2eab836e80e6e0a70b5cf6c5b' ✅

FAUCET_PACKAGE:     '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81' ✅
FAUCET_OBJECT:      '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde' ✅

CETUS_GLOBAL_CONFIG: '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e' ✅
CETUS_POOLS:        '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2' ✅
```

**Why?** These are data objects that exist on-chain. Package upgrades don't change objects, only the code that operates on them.

---

## 🌐 Frontend: Dynamic or Hardcoded?

### Answer: **Centralized in `lib/constants.ts`** ✅

**Good news:** All IDs come from ONE file!

```typescript
// lib/constants.ts
export const CONTRACTS = {
  PLATFORM_PACKAGE: '0xa499...',  // ← Only this needs updating
  PLATFORM_STATE: '0x3db4...',    // ← These stay same
  REFERRAL_REGISTRY: '0x964b...',
  TICKER_REGISTRY: '0xd8ba...',
  // ...
}
```

**How the frontend uses it:**

```typescript
// components/modals/CreateCoinModal.tsx
import { CONTRACTS } from '@/lib/constants';

tx.moveCall({
  target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::create_new_meme_token`,
  arguments: [
    tx.object(CONTRACTS.PLATFORM_STATE),  // ← All from constants
    tx.object(CONTRACTS.TICKER_REGISTRY),
    // ...
  ]
});
```

**To update the entire website:**
1. Change line 12 in `lib/constants.ts`
2. Rebuild/redeploy
3. Done! ✅

---

## 🤔 What About Old Tokens?

### Great question! Here's what happens:

### Old Tokens (created with v0.0.8):
```typescript
Coin type: 0xa49978cdb7a2...::my_token::MY_TOKEN
           ↑ Old package ID
```

**Can users still trade them?** **YES!** ✅

**How?**
- Their `BondingCurve<T>` object was created by v0.0.8 package
- The coin type includes the OLD package ID
- When users buy/sell, they pass the coin type with OLD package ID
- The OLD package code still exists on-chain (immutable!)
- Sui will use the OLD package to execute the trade

**Example transaction:**
```typescript
// User buys old token created with v0.0.8
tx.moveCall({
  target: `0xa49978cdb7a2...::bonding_curve::buy`,  // OLD package
  typeArguments: ['0xa49978cdb7a2...::old_token::OLD_TOKEN'],  // OLD coin type
  arguments: [/* ... */]
});

// ✅ This still works! Old package still exists on-chain
```

### New Tokens (created with v0.0.9):
```typescript
Coin type: 0x...new_package...::new_token::NEW_TOKEN
           ↑ New package ID
```

**Users will trade these using the NEW package.**

---

## 🎯 So What Do You Need to Update?

### **Only 1 file in the frontend:**

```bash
# File: lib/constants.ts
# Line: 12

# Change from:
PLATFORM_PACKAGE: '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348',

# Change to:
PLATFORM_PACKAGE: '0x...new_package_id...',
```

### **Why this works:**

1. ✅ **New tokens** will be created with new package ID
2. ✅ **Old tokens** still work - frontend doesn't need to know about old package
3. ✅ **Indexer** already tracks both packages (for rewards)
4. ✅ **Buy/sell** transactions are built dynamically based on coin type

---

## 🔍 How Frontend Handles Different Packages

### Token Creation (uses current package):
```typescript
// Always uses CONTRACTS.PLATFORM_PACKAGE (from constants.ts)
tx.moveCall({
  target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::create_new_meme_token`,
  // ...
});
```

### Buying/Selling (uses token's package):
```typescript
// Uses the package ID embedded in the coin type
const coinType = '0xa49978...::token::TOKEN';  // From token metadata
//                ↑ This package ID (old or new)

// Transaction automatically uses correct package
tx.moveCall({
  target: `${extractPackageFromCoinType(coinType)}::bonding_curve::buy`,
  typeArguments: [coinType],
  // ...
});
```

**Wait, where does this happen?**

Actually, the frontend doesn't even need to know! The Sui blockchain handles it:
- Each `BondingCurve<T>` object knows which package created it
- The `T` type parameter includes the package ID
- Sui automatically uses the correct package when you call functions

---

## 📊 Upgrade Impact Summary

### What You Update:
| File | Line | What to Change |
|------|------|---------------|
| `lib/constants.ts` | 12 | `PLATFORM_PACKAGE` ID |
| `pool-creation-bot/.env` | 13 | `PLATFORM_PACKAGE` ID |
| `indexer/.env` (maybe) | ? | `PLATFORM_PACKAGE` ID |

### What Stays the Same:
- ✅ All other IDs in `constants.ts`
- ✅ All shared objects (PLATFORM_STATE, etc.)
- ✅ All old tokens and their curves
- ✅ Faucet, Cetus config
- ✅ User wallets, balances

### What Happens to Users:
- ✅ Can still trade OLD tokens (seamlessly)
- ✅ Can create NEW tokens (with new package)
- ✅ Don't notice any difference
- ✅ No action required on their part

---

## 🧪 Testing After Upgrade

### Test 1: Old Token Still Works
```bash
# 1. Find an old token (created before upgrade)
# 2. Try to buy it
# 3. Try to sell it
# Expected: Works perfectly ✅
```

### Test 2: New Token Uses New Package
```bash
# 1. Create a new token (after upgrade)
# 2. Check its coin type on explorer
# Expected: Coin type starts with new package ID ✅
```

### Test 3: Frontend Builds Correct Transactions
```bash
# 1. Create token → Should use new PLATFORM_PACKAGE
# 2. Buy old token → Should use old package (from coin type)
# 3. Buy new token → Should use new package (from coin type)
# Expected: All work ✅
```

---

## 💡 Key Insight

**Sui package upgrades are ADDITIVE, not REPLACEMENT:**

- Old package: `0xa49978...` (v0.0.8) - Still exists, still works
- New package: `0x...new...` (v0.0.9) - New version, new features
- Both live on-chain simultaneously
- Objects remember which package created them
- Transactions automatically use the correct version

**It's like:**
- Old tokens are "v0.0.8 coins" - they'll always use v0.0.8 code
- New tokens are "v0.0.9 coins" - they'll use v0.0.9 code
- Frontend just needs to know the CURRENT package for NEW creations
- Everything else is handled by the blockchain

---

## ✅ Conclusion

**You only need to update:**
1. `PLATFORM_PACKAGE` in `lib/constants.ts`
2. `PLATFORM_PACKAGE` in bot `.env`
3. Rebuild frontend (or Vercel auto-deploys)

**Everything else:**
- Stays the same
- Works automatically
- No user impact

**Old tokens:**
- Still tradeable
- Still functional
- No migration needed

🎉 **Super clean upgrade!**
