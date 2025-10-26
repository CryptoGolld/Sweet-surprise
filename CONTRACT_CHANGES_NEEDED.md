# Contract Changes for Manual Pool Creation

## Changes Overview

1. ✅ Add `special_launch` flag to BondingCurve
2. ✅ Increase creator payout to 50 SUI
3. ✅ Add admin function to mark special launches
4. ✅ Add bot helper function to extract liquidity
5. ✅ Handle 54M tokens (burn vs treasury based on flag)

---

## Change 1: Update BondingCurve Struct

**File**: `bonding_curve.move`
**Location**: Around line 45

### BEFORE
```move
public struct BondingCurve<phantom T: drop> has key, store {
    id: UID,
    status: TradingStatus,
    sui_reserve: Balance<SUILFG_MEMEFI>,
    token_supply: u64,
    platform_fee_bps: u64,
    creator_fee_bps: u64,
    creator: address,
    whitelist: vector<address>,
    m_num: u64,
    m_den: u128,
    base_price_mist: u64,
    treasury: TreasuryCap<T>,
    graduation_target_mist: u64,
    graduated: bool,
    lp_seeded: bool,
    reward_paid: bool,
    lp_fee_recipient: address,
}
```

### AFTER
```move
public struct BondingCurve<phantom T: drop> has key, store {
    id: UID,
    status: TradingStatus,
    sui_reserve: Balance<SUILFG_MEMEFI>,
    token_supply: u64,
    platform_fee_bps: u64,
    creator_fee_bps: u64,
    creator: address,
    whitelist: vector<address>,
    m_num: u64,
    m_den: u128,
    base_price_mist: u64,
    treasury: TreasuryCap<T>,
    graduation_target_mist: u64,
    graduated: bool,
    lp_seeded: bool,
    reward_paid: bool,
    lp_fee_recipient: address,
    special_launch: bool,  // NEW: True = 54M to treasury, False = 54M burned
}
```

---

## Change 2: Update init_for_token Function

**File**: `bonding_curve.move`
**Location**: Around line 100-130 (wherever init_for_token is)

### Find this section and add `special_launch: false`:

```move
BondingCurve {
    id: object::new(ctx),
    status: TradingStatus::Open,
    sui_reserve: balance::zero<SUILFG_MEMEFI>(),
    token_supply: 0,
    platform_fee_bps,
    creator_fee_bps,
    creator,
    whitelist: vector::empty(),
    m_num,
    m_den,
    base_price_mist,
    treasury,
    graduation_target_mist,
    graduated: false,
    lp_seeded: false,
    reward_paid: false,
    lp_fee_recipient: creator,
    special_launch: false,  // NEW: Default to normal launch (burn 54M)
}
```

---

## Change 3: Add Admin Function to Mark Special Launches

**File**: `bonding_curve.move`
**Location**: Add near the end with other admin functions (around line 800+)

```move
/// ADMIN: Mark a curve as special launch (54M to treasury instead of burn)
/// This can only be called BEFORE graduation
public entry fun mark_special_launch<T: drop>(
    _admin: &AdminCap,
    curve: &mut BondingCurve<T>,
) {
    assert!(!curve.graduated, E_ALREADY_GRADUATED);
    curve.special_launch = true;
}

/// ADMIN: Unmark special launch (revert to normal burn)
public entry fun unmark_special_launch<T: drop>(
    _admin: &AdminCap,
    curve: &mut BondingCurve<T>,
) {
    assert!(!curve.graduated, E_ALREADY_GRADUATED);
    curve.special_launch = false;
}
```

---

## Change 4: Add Bot Helper Function

**File**: `bonding_curve.move`
**Location**: Add after `distribute_payouts` function

```move
/// BOT HELPER: Extract liquidity for manual pool creation
/// Called by bot after graduation to get SUI + tokens for Cetus pool
/// Handles 54M tokens based on special_launch flag
public entry fun prepare_liquidity_for_bot<T: drop>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    ctx: &mut TxContext
) {
    // Validations
    assert!(curve.graduated, E_NOT_GRADUATED);
    assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
    assert!(curve.reward_paid, E_REWARD_NOT_PAID);
    
    // Constants for liquidity extraction
    let sui_for_lp = 12_000_000_000_000; // 12,000 SUILFG
    let tokens_for_lp = 207_000_000; // 207M tokens
    let team_allocation = 2_000_000; // 2M tokens
    let burn_or_treasury_amount = 54_000_000; // 54M tokens
    
    let treasury_address = platform_config::get_treasury_address(cfg);
    let caller = sender(ctx);
    
    // 1. Extract SUI for LP
    let lp_sui_balance = balance::split(&mut curve.sui_reserve, sui_for_lp);
    let lp_sui = coin::from_balance(lp_sui_balance, ctx);
    
    // 2. Mint tokens for LP
    let lp_tokens = coin::mint(&mut curve.treasury, tokens_for_lp * 1_000_000_000, ctx);
    
    // 3. Mint and send team allocation
    let team_tokens = coin::mint(&mut curve.treasury, team_allocation * 1_000_000_000, ctx);
    transfer::public_transfer(team_tokens, treasury_address);
    
    // 4. Handle 54M tokens based on special_launch flag
    let treasury_tokens = coin::mint(&mut curve.treasury, burn_or_treasury_amount * 1_000_000_000, ctx);
    if (curve.special_launch) {
        // Special launch: send 54M to treasury (for platform-launched tokens)
        transfer::public_transfer(treasury_tokens, treasury_address);
    } else {
        // Normal launch: burn 54M tokens
        coin::burn(&mut curve.treasury, treasury_tokens);
    };
    
    // 5. Send LP liquidity to bot/caller
    transfer::public_transfer(lp_sui, caller);
    transfer::public_transfer(lp_tokens, caller);
    
    // 6. Update token supply to reflect minted tokens
    let total_minted = tokens_for_lp + team_allocation + burn_or_treasury_amount;
    curve.token_supply = curve.token_supply + total_minted;
    
    // 7. Mark as seeded (bot will create pool externally)
    curve.lp_seeded = true;
    
    // Event
    event::emit(LiquidityPrepared {
        curve_id: object::id(curve),
        sui_amount: sui_for_lp,
        token_amount: tokens_for_lp * 1_000_000_000,
        special_launch: curve.special_launch,
    });
}

// Add this event struct near the top with other events
public struct LiquidityPrepared has copy, drop {
    curve_id: ID,
    sui_amount: u64,
    token_amount: u64,
    special_launch: bool,
}
```

---

## Change 5: Update Creator Payout in Config

**File**: `platform_config.move`
**Location**: Around line 50

### BEFORE
```move
const DEFAULT_CREATOR_GRADUATION_PAYOUT_MIST: u64 = 500_000_000_000; // 500 SUILFG
```

### AFTER (Option 1 - 50 SUI - RECOMMENDED)
```move
const DEFAULT_CREATOR_GRADUATION_PAYOUT_MIST: u64 = 50_000_000_000_000; // 50 SUILFG (50 SUI equiv)
```

### AFTER (Option 2 - 100 SUI - if you want to be more generous)
```move
const DEFAULT_CREATOR_GRADUATION_PAYOUT_MIST: u64 = 100_000_000_000_000; // 100 SUILFG (100 SUI equiv)
```

---

## Change 6: Add Error Code

**File**: `bonding_curve.move`
**Location**: Top of file with other error constants (around line 15)

```move
const E_REWARD_NOT_PAID: u64 = 10; // Must distribute payouts before preparing liquidity
```

---

## Testing Checklist

After making these changes:

### 1. Test Normal Launch (Burn)
```typescript
// 1. Create token
// 2. Buy to graduation
// 3. Graduate
// 4. Distribute payouts
// 5. Call prepare_liquidity_for_bot
// ✅ Verify: 54M tokens burned (treasury balance unchanged)
// ✅ Verify: Bot receives 12,000 SUILFG + 207M tokens
// ✅ Verify: Team receives 2M tokens
```

### 2. Test Special Launch (Treasury)
```typescript
// 1. Create token
// 2. Admin calls mark_special_launch()
// 3. Buy to graduation
// 4. Graduate
// 5. Distribute payouts
// 6. Call prepare_liquidity_for_bot
// ✅ Verify: 54M tokens sent to treasury (not burned)
// ✅ Verify: Bot receives 12,000 SUILFG + 207M tokens
// ✅ Verify: Team receives 2M tokens
```

### 3. Test Creator Payout Increase
```typescript
// After graduation and distribute_payouts:
// ✅ Verify: Creator receives 50 SUILFG (or 100 if you chose that)
// ✅ Verify: Platform receives ~1,283 SUILFG (or ~1,233 if 100)
```

---

## Deployment Steps

1. **Make all changes** to `bonding_curve.move` and `platform_config.move`
2. **Update Move.toml** version (e.g., 0.0.7)
3. **Compile**: `sui move build`
4. **Test locally** with test suite
5. **Upgrade on testnet**: `sui client upgrade --gas-budget 500000000`
6. **Test with real graduated token**
7. **Build bot** to call `prepare_liquidity_for_bot`
8. **Upgrade on mainnet** when ready

---

## Bot Pseudo-code

```typescript
// Monitor graduated curves
async function monitorGraduatedCurves() {
  const curves = await db.query(`
    SELECT * FROM bonding_curves 
    WHERE graduated = true 
    AND lp_seeded = false 
    AND reward_paid = true
  `);
  
  for (const curve of curves) {
    try {
      // 1. Extract liquidity
      const prepareTx = await prepareLiquidityForBot(curve);
      const { suilfgCoin, tokenCoin } = extractCoinsFromTx(prepareTx);
      
      // 2. Create Cetus pool
      const poolTx = await createCetusPool(suilfgCoin, tokenCoin, curve);
      const { lpNft } = extractLpNftFromTx(poolTx);
      
      // 3. Burn LP tokens
      await burnLpNft(lpNft);
      
      console.log(`✅ Pool created and LP burned for ${curve.ticker}`);
    } catch (error) {
      console.error(`❌ Failed to create pool for ${curve.ticker}:`, error);
      // Retry or alert admin
    }
  }
}

// Run every 30 seconds
setInterval(monitorGraduatedCurves, 30000);
```

---

## FAQ

### Q: What if the bot fails?
**A**: Add an admin fallback function that lets you manually create pools. Or add retry logic to the bot.

### Q: Can we change special_launch after graduation?
**A**: No, the admin functions check `!curve.graduated`. This is by design - prevents abuse.

### Q: What happens to the remaining SUI in reserve?
**A**: After extracting 12,000 for LP, remainder stays in curve (platform profit or future use).

### Q: Should we use 50 or 100 SUI creator payout?
**A**: **50 SUI is recommended**. Generous enough to incentivize quality launches, not so high that it encourages spam.

### Q: Where do LP fees go?
**A**: If you burn LP NFT (send to 0x0), fees accumulate in pool but uncollectable. If you use lp_locker, fees go to `lp_fee_recipient` (treasury).

---

Ready to implement? Want me to make these changes to your contract now?
