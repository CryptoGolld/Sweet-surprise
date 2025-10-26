# Manual Pool Creation & Bot Guide

## Overview

Since automatic Cetus integration is unreliable, we'll use a **bot-based approach** for pool creation after graduation.

---

## 🤖 How It Works in Your Case

### Phase 1: Normal Trading (Bonding Curve)
```
Users buy/sell → Bonding curve manages liquidity → Reaches 737M tokens sold
```

### Phase 2: Graduation Trigger
```
Anyone calls: try_graduate()
✅ Sets graduated = true
✅ Locks trading on curve
```

### Phase 3: Payout Distribution
```
Anyone calls: distribute_payouts()
✅ Platform gets 10% (~1,333 SUILFG)
✅ Creator gets 50-100 SUILFG (your new amount)
✅ Remaining ~12,000 SUILFG stays in curve.sui_reserve
```

### Phase 4: Bot Creates Pool (NEW MANUAL FLOW)
```
Your Bot:
1. Monitors for graduated curves
2. Reads curve.sui_reserve (~12,000 SUILFG)
3. Calculates tokens needed:
   - Regular launch: 207M for LP, 54M BURNED, 2M to team
   - Special launch: 207M for LP, 54M to TREASURY, 2M to team
4. Mints tokens via admin function
5. Creates Cetus pool with 12,000 SUILFG + 207M tokens
6. BURNS LP tokens (sends to 0x0 or locks permanently)
```

---

## 💰 Updated Tokenomics

### Current (Before Changes)
- **Creator Payout**: 500 SUILFG (0.5 SUI equivalent)
- **Platform Cut**: ~1,333 SUILFG (10%)
- **54M Tokens**: Always burned

### Proposed (Your Changes)
- **Creator Payout**: 50,000 or 100,000 SUILFG (50-100 SUI)
- **Platform Cut**: ~1,233 or ~1,133 SUILFG (reduced by creator increase)
- **54M Tokens**: Burned for normal launches, sent to treasury for special launches

### My Recommendation
**Use 50 SUI (50,000 SUILFG) for creator payout**

Why?
- Platform still gets decent cut (~1,283 SUILFG ≈ $1,283 at $1/SUILFG)
- Creators get meaningful reward ($50 vs $0.50)
- Not too generous that it encourages spam launches
- Leaves buffer for platform operations

Math:
```
Total raised: 13,333 SUILFG
Platform 10%: 1,333 SUILFG
Creator payout: -50 SUILFG
Platform net: 1,283 SUILFG
Remaining for LP: ~12,000 SUILFG
```

---

## 🔥 LP Token Burning

### What "Burning" Means in Cetus/AMM Context

When you create a Cetus pool and add liquidity, you receive **LP tokens** (NFT position). "Burning" these means making them **permanently inaccessible**:

1. **Option 1: Send to Dead Address**
   ```typescript
   // Transfer LP NFT to 0x0 (inaccessible)
   tx.transferObjects([lpNft], '0x0000000000000000000000000000000000000000000000000000000000000000');
   ```

2. **Option 2: Use Your LP Locker (BETTER)**
   ```typescript
   // Lock in your lp_locker module (can collect fees but never remove liquidity)
   await lp_locker::lock_position_permanent(lpNft, poolId, feeRecipient);
   ```

### Why LP Locker Is Better
- ✅ **Fees stay claimable** (additional revenue for platform)
- ✅ **Provably locked** (users can verify on-chain)
- ✅ **Upgrade safe** (can't be unlocked even with contract upgrade)
- ✅ **Professional** (shows you built proper infrastructure)

---

## 📝 Contract Changes Needed

### Change 1: Add Special Launch Flag

Add to `BondingCurve` struct:
```move
public struct BondingCurve<phantom T: drop> has key, store {
    // ... existing fields ...
    lp_fee_recipient: address,
    special_launch: bool,  // NEW: If true, 54M goes to treasury instead of burn
}
```

### Change 2: Update Creator Payout Config

```move
// In platform_config.move
const DEFAULT_CREATOR_GRADUATION_PAYOUT_MIST: u64 = 50_000_000_000_000; // 50 SUILFG (50 SUI equivalent)
```

Or for 100 SUI:
```move
const DEFAULT_CREATOR_GRADUATION_PAYOUT_MIST: u64 = 100_000_000_000_000; // 100 SUILFG
```

### Change 3: Add Admin Function to Mark Special Launches

```move
/// Admin marks a curve as special launch (54M to treasury instead of burn)
public entry fun mark_special_launch<T: drop>(
    _admin: &AdminCap,
    curve: &mut BondingCurve<T>,
) {
    curve.special_launch = true;
}
```

### Change 4: Add Bot Helper Function

```move
/// Bot calls this after graduation to extract liquidity for manual pool creation
/// Returns: (sui_amount, token_amount, should_send_54m_to_treasury)
public entry fun prepare_liquidity_for_bot<T: drop>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    ctx: &mut TxContext
) {
    assert!(curve.graduated, E_NOT_GRADUATED);
    assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
    
    let sui_for_lp = 12_000_000_000_000; // 12,000 SUILFG
    let tokens_for_lp = 207_000_000; // 207M tokens
    let team_allocation = 2_000_000; // 2M tokens
    let burn_or_treasury = 54_000_000; // 54M tokens
    
    // Extract SUI
    let lp_sui_balance = balance::split(&mut curve.sui_reserve, sui_for_lp);
    let lp_sui = coin::from_balance(lp_sui_balance, ctx);
    
    // Mint tokens for LP
    let lp_tokens = coin::mint(&mut curve.treasury, tokens_for_lp * 1_000_000_000, ctx);
    
    // Mint team allocation
    let team_tokens = coin::mint(&mut curve.treasury, team_allocation * 1_000_000_000, ctx);
    let team_recipient = platform_config::get_treasury_address(cfg);
    transfer::public_transfer(team_tokens, team_recipient);
    
    // Handle 54M tokens based on special_launch flag
    let treasury_tokens = coin::mint(&mut curve.treasury, burn_or_treasury * 1_000_000_000, ctx);
    if (curve.special_launch) {
        // Special launch: send to treasury
        transfer::public_transfer(treasury_tokens, team_recipient);
    } else {
        // Normal launch: burn
        coin::burn(&mut curve.treasury, treasury_tokens);
    };
    
    // Send liquidity to bot/caller
    transfer::public_transfer(lp_sui, sender(ctx));
    transfer::public_transfer(lp_tokens, sender(ctx));
    
    // Mark as seeded (bot will create pool)
    curve.lp_seeded = true;
}
```

---

## 🤖 Bot Implementation

### Bot Workflow

```typescript
// 1. Monitor for graduated curves
const graduatedCurves = await indexer.getGraduatedCurves();

for (const curve of graduatedCurves) {
  if (curve.lp_seeded) continue; // Already processed
  
  // 2. Call prepare_liquidity_for_bot
  const tx = new Transaction();
  tx.moveCall({
    target: `${PLATFORM_PACKAGE}::bonding_curve::prepare_liquidity_for_bot`,
    typeArguments: [curve.coinType],
    arguments: [
      tx.object(PLATFORM_STATE),
      tx.object(curve.id),
    ],
  });
  
  const result = await signAndExecute(tx);
  
  // 3. Extract received coins from transaction
  const suilfgCoin = result.objectChanges.find(o => o.objectType.includes('SUILFG_MEMEFI'));
  const tokenCoin = result.objectChanges.find(o => o.objectType.includes(curve.coinType));
  
  // 4. Create Cetus pool
  const poolTx = new Transaction();
  
  // Calculate sqrt price from final curve price
  const sqrtPrice = calculateSqrtPrice(curve.final_price);
  
  const [positionNft] = poolTx.moveCall({
    target: `${CETUS_PACKAGE}::pool_creator::create_pool_v2`,
    typeArguments: [SUILFG_TYPE, curve.coinType],
    arguments: [
      poolTx.object(CETUS_GLOBAL_CONFIG),
      poolTx.object(CETUS_POOLS),
      poolTx.pure.u32(60), // tick_spacing
      poolTx.pure.u128(sqrtPrice),
      poolTx.pure.string("SuiLFG Pool"),
      poolTx.pure.i32(-443580), // full range tick lower
      poolTx.pure.i32(443580),  // full range tick upper
      poolTx.object(suilfgCoin.objectId),
      poolTx.object(tokenCoin.objectId),
      poolTx.object(SUILFG_METADATA),
      poolTx.object(curve.metadata),
      poolTx.pure.bool(true), // fix_amount_a
      poolTx.object('0x6'), // clock
    ],
  });
  
  // 5. BURN LP TOKENS (send to 0x0)
  poolTx.transferObjects(
    [positionNft],
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  );
  
  await signAndExecute(poolTx);
  
  console.log(`✅ Pool created and LP burned for ${curve.ticker}`);
}
```

### Bot Safety Checks

```typescript
// Before processing
assert(curve.graduated === true, "Not graduated");
assert(curve.lp_seeded === false, "Already seeded");
assert(curve.sui_reserve >= 12_000 * 1e9, "Insufficient reserve");

// After pool creation
assert(lpNftSentTo === "0x0", "LP not burned");
```

---

## 🎯 Summary of Changes

### 1. Creator Payout Increase
- **Current**: 500 SUILFG (~$0.50)
- **Proposed**: 50,000 SUILFG (~$50)
- **Change**: Update `creator_graduation_payout_mist` in config

### 2. Special Launch Override
- **Add**: `special_launch: bool` flag to BondingCurve
- **Add**: `mark_special_launch()` admin function
- **Behavior**: If true, 54M tokens → treasury; if false, 54M burned

### 3. Bot Pool Creation
- **Add**: `prepare_liquidity_for_bot()` function
- **Bot**: Monitors graduated curves
- **Bot**: Creates Cetus pool manually
- **Bot**: Burns LP tokens (sends to 0x0)

### 4. LP Burn Method
- **Recommended**: Send LP NFT to 0x0 address
- **Alternative**: Use your lp_locker (can collect fees)

---

## 🚀 Next Steps

1. **Update contract** with changes above
2. **Upgrade package** on testnet
3. **Build bot** with monitoring + pool creation
4. **Test end-to-end** with a test coin
5. **Deploy to production**

---

## 💡 Additional Thoughts

### Why This Approach Is Better
- ✅ **More control** over pool creation
- ✅ **Can retry** if Cetus has issues
- ✅ **Easier debugging**
- ✅ **Flexible** for special launches
- ✅ **Better creator incentives** (50 SUI vs 0.5 SUI)

### Potential Issues to Watch
- ⚠️ Bot downtime = delayed pool creation
- ⚠️ Bot needs gas for transactions
- ⚠️ Cetus testnet can be unstable
- ⚠️ Need monitoring/alerting for failed pools

### Future Improvements
- Add fallback if bot fails (manual admin function)
- Add pool creation queue/retry logic
- Add notifications for graduated tokens
- Consider using your lp_locker for fee collection

Want me to implement these contract changes now?
