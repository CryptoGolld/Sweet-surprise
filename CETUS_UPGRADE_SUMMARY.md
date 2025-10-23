# Cetus Pool Integration - Upgrade Summary

**Date:** October 22, 2025  
**Branch:** cursor/setup-sui-cli-and-login-wallet-4a10  
**Status:** ✅ Solution Documented | ⚠️ Upgrade Blocked

---

## 🎯 What We Learned from Cetus Team

### Critical Requirements for Pool Creation:

1. **Coin Type Ordering (MOST IMPORTANT!)**
   - Coins MUST be sorted by ASCII/dictionary order
   - Example: `SUI` (0x2::sui::SUI) comes before most custom tokens
   - Wrong order causes `Error 0x6` in `factory::new_pool_key`
   
2. **SDK Version**
   - Use latest: `@cetusprotocol/cetus-sui-clmm-sdk@5.4.0` ✅
   
3. **Initial Liquidity Required**
   - Can't create empty pool on testnet (ACL restricted)
   - Must provide initial liquidity amounts + tick ranges
   
4. **Metadata Parameters**
   - Both coins need metadata object IDs
   - Used for pool info display

5. **Move.toml Integration**
   ```toml
   CetusClmm = { git = "https://github.com/CetusProtocol/cetus-contracts", 
                 subdir = "packages/cetus_clmm", 
                 rev = "clmm-v14", override = true }
   ```

---

## ✅ What We Accomplished

### 1. Fixed Cetus SDK Usage
- ✅ Proper coin ordering (COIN_B < COIN_A alphabetically)
- ✅ Correct `createPoolTransactionPayload` parameters
- ✅ Initial liquidity calculation using `ClmmPoolUtil`
- ✅ Successfully created pool: `0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6`

### 2. Demonstrated Liquidity Locking
- ✅ Proved concept: Transfer Position NFT to 0x0 to lock liquidity forever
- ✅ Documented process for burning liquidity
- ✅ Created guides: `FINAL_BURN_INSTRUCTIONS.md`

### 3. Fixed Contract Code
- ✅ Added new function: `seed_pool_prepare_for_cetus()`
- ✅ Fixed `platform_coin` mutability issue in `distribute_payouts`
- ✅ Fixed `ticker_registry.move` field errors (`last_use_ts_ms`)
- ✅ Contract compiles successfully ✅

---

## ⚠️ Upgrade Challenge

### Problem: Incompatible Changes

The upgrade failed with `PackageUpgradeError { upgrade_error: IncompatibleUpgrade }`.

**Why:**
- Sui's upgrade system is VERY strict about backward compatibility
- Even minor changes can break compatibility:
  - Removing old unused functions
  - Changing dependencies
  - Modifying internal implementations

**What Happened:**
1. Original package: NO Cetus dependency (empty linkage table)
2. Attempted upgrade: Tried to add new function without Cetus dependency
3. Result: Incompatible (likely due to other subtle changes)

---

## 🚀 Recommended Path Forward

### Option 1: Publish New Package (RECOMMENDED)

**Pros:**
- Clean slate with correct implementation
- No compatibility issues
- Can use proper Cetus integration from day 1

**Steps:**
1. Update `Move.toml` with fresh address
2. Build and publish new package
3. Update `lib/constants.ts` with new package ID
4. Create migration plan for existing tokens (if any)

**Code Changes Needed:**
```typescript
// lib/constants.ts
export const CONTRACTS = {
  PLATFORM_PACKAGE: '0x<NEW_PACKAGE_ID>',  // Update this
  // ... rest
};
```

### Option 2: Use SDK for Pool Creation (CURRENT APPROACH)

**Keep current contract, handle pools in frontend:**

```typescript
// When token graduates:
// 1. Call seed_pool_prepare() on contract (existing function)
//    - Mints team allocation
//    - Transfers tokens+SUI to LP recipient

// 2. Frontend calls Cetus SDK:
const sdk = initCetusSDK({ network: 'testnet', wallet: lpRecipient });

// Determine coin order
const coinA = COIN_B_TYPE < COIN_A_TYPE ? COIN_B_TYPE : COIN_A_TYPE;
const coinB = COIN_B_TYPE < COIN_A_TYPE ? COIN_A_TYPE : COIN_B_TYPE;

const payload = await sdk.Pool.createPoolTransactionPayload({
  coinTypeA: coinA,
  coinTypeB: coinB,
  tick_spacing: 60,
  initialize_sqrt_price: calculateSqrtPrice(1.0),
  uri: '',
  amount_a: suiAmount,
  amount_b: tokenAmount,
  fix_amount_a: true,
  tick_lower: -60,
  tick_upper: 60,
  metadata_a: SUI_METADATA,
  metadata_b: TOKEN_METADATA,
  slippage: 0.05,
});

const result = await sdk.fullClient.sendTransaction(keypair, payload);

// 3. Optionally burn position NFT to lock liquidity forever:
//    sui client transfer --object-id <POSITION_NFT> --to 0x0
```

**Pros:**
- No contract upgrade needed
- More flexible (can adjust pool params)
- Easier to handle edge cases

**Cons:**
- Requires backend/admin wallet for pool creation
- Two-step process

---

## 📝 Solution Summary

### The Correct Cetus Integration Pattern:

```move
// bonding_curve.move - NEW FUNCTION (ready to add on next upgrade/publish)
public entry fun seed_pool_prepare_for_cetus<T: drop + store>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    bump_bps: u64,
    ctx: &mut TxContext
) {
    assert!(curve.graduated, E_NOT_GRADUATED);
    assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
    
    // 1. Mint team tokens → treasury
    let team_allocation = platform_config::get_team_allocation_tokens(cfg);
    let team_tokens = coin::mint(&mut curve.treasury, team_allocation, ctx);
    transfer::public_transfer(team_tokens, platform_config::get_treasury_address(cfg));
    curve.token_supply = curve.token_supply + team_allocation;
    
    // 2. Calculate & mint LP tokens → lp_recipient
    let total_sui = balance::value(&curve.sui_reserve);
    let sui_for_lp = total_sui - (total_sui * bump_bps) / 10000;
    let token_for_lp = TOTAL_SUPPLY - curve.token_supply;
    
    let lp_tokens = coin::mint(&mut curve.treasury, token_for_lp, ctx);
    let lp_sui = coin::from_balance(balance::split(&mut curve.sui_reserve, sui_for_lp), ctx);
    
    // 3. Transfer both to LP recipient
    let lp_recipient = platform_config::get_lp_recipient_address(cfg);
    transfer::public_transfer(lp_tokens, lp_recipient);
    transfer::public_transfer(lp_sui, lp_recipient);
    
    curve.lp_seeded = true;
    curve.token_supply = TOTAL_SUPPLY;
}
```

**Then SDK creates pool with proper ordering:**
```typescript
// Automatic ASCII sorting
const [coinA, coinB, metaA, metaB] = sortCoins(
  SUI_TYPE, TOKEN_TYPE, 
  SUI_METADATA, TOKEN_METADATA
);

await sdk.Pool.createPoolTransactionPayload({
  coinTypeA: coinA,  // Sorted!
  coinTypeB: coinB,  // Sorted!
  metadata_a: metaA,
  metadata_b: metaB,
  // ... rest of params
});
```

---

## 🎓 Key Learnings

### What Worked:
1. ✅ Cetus SDK integration (after team guidance)
2. ✅ Proper coin ordering (ASCII sort)
3. ✅ Initial liquidity calculation
4. ✅ Position NFT burning concept

### What Didn't:
1. ❌ Move-level Cetus integration (dependency conflicts)
2. ❌ Empty pool creation (testnet ACL)
3. ❌ Package upgrade (too many changes)

### Best Practice:
**Hybrid Approach**
- Contract: Token minting, supply management, security
- SDK: Pool creation, coin ordering, complex Cetus interactions
- Result: Flexible, maintainable, secure ✅

---

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Contract Code | ✅ Fixed | Compiles, new function ready |
| Cetus Integration | ✅ Validated | SDK approach works |
| Liquidity Locking | ✅ Documented | Burn to 0x0 method proven |
| Package Upgrade | ⚠️ Blocked | Incompatible changes |
| **Recommendation** | **Publish New** | Clean implementation |

---

## 🔗 References

- Successful Pool: https://suiscan.xyz/testnet/object/0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6
- Cetus Docs: https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-sdk/features-available
- Burn Guide: `/workspace/FINAL_BURN_INSTRUCTIONS.md`
- Pool Creation Success: `/workspace/POOL_CREATION_SUCCESS.md`

---

## ✅ Next Steps

1. **Immediate**: Use existing contract + SDK pool creation (Option 2 above)
2. **Long-term**: Plan new package publish with integrated function (Option 1)
3. **Testing**: Verify full graduation flow on testnet
4. **Documentation**: Update deployment guide with Cetus integration steps

**The solution is ready - just needs deployment decision! 🚀**
