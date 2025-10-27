# Contract Improvements for Pool Creation

## Issue 1: LP Token Recipient Should Be Configurable

### Current Implementation (INSECURE):
```move
public entry fun prepare_liquidity_for_bot<T: drop>(
    _admin: &AdminCap,  // Anyone with AdminCap can call
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    burn_54m: bool,
    ctx: &mut TxContext
) {
    // ...
    transfer::public_transfer(lp_sui, sender(ctx));      // ⚠️ Goes to caller
    transfer::public_transfer(lp_tokens, sender(ctx));   // ⚠️ Goes to caller
}
```

**Problem:** Any address with AdminCap can call and receive LP tokens.

### Proposed Fix:
```move
// In platform_config.move - ADD this field:
public struct PlatformConfig has key {
    // ... existing fields ...
    lp_bot_address: address,  // ✅ Dedicated bot address for pool creation
}

// ADD admin function to change it:
public entry fun set_lp_bot_address(_admin: &AdminCap, cfg: &mut PlatformConfig, addr: address) {
    cfg.lp_bot_address = addr;
}

public fun get_lp_bot_address(cfg: &PlatformConfig): address { 
    cfg.lp_bot_address 
}

// In bonding_curve.move - MODIFY prepare_liquidity_for_bot:
public entry fun prepare_liquidity_for_bot<T: drop>(
    _admin: &AdminCap,
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    burn_54m: bool,
    ctx: &mut TxContext
) {
    assert!(curve.graduated, E_NOT_GRADUATED);
    assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
    assert!(curve.reward_paid, 9010);
    
    // ✅ SECURITY: Only configured bot address can receive LP tokens
    assert!(sender(ctx) == platform_config::get_lp_bot_address(cfg), E_UNAUTHORIZED_BOT);
    
    let sui_for_lp = 12_000_000_000_000;
    let tokens_for_lp = 207_000_000;
    let team_allocation = 2_000_000;
    let burn_or_treasury_amount = 54_000_000;
    
    let treasury_address = platform_config::get_treasury_address(cfg);
    let bot_address = platform_config::get_lp_bot_address(cfg);
    
    let lp_sui = coin::from_balance(balance::split(&mut curve.sui_reserve, sui_for_lp), ctx);
    let lp_tokens = coin::mint(&mut curve.treasury, tokens_for_lp * 1_000_000_000, ctx);
    let team_tokens = coin::mint(&mut curve.treasury, team_allocation * 1_000_000_000, ctx);
    transfer::public_transfer(team_tokens, treasury_address);
    
    let treasury_tokens = coin::mint(&mut curve.treasury, burn_or_treasury_amount * 1_000_000_000, ctx);
    if (burn_54m) {
        coin::burn(&mut curve.treasury, treasury_tokens);
    } else {
        transfer::public_transfer(treasury_tokens, treasury_address);
    };
    
    // ✅ Send to configured bot address (not sender)
    transfer::public_transfer(lp_sui, bot_address);
    transfer::public_transfer(lp_tokens, bot_address);
    
    curve.token_supply = curve.token_supply + tokens_for_lp + team_allocation + burn_or_treasury_amount;
    curve.lp_seeded = true;
}
```

**Benefits:**
- ✅ Only one specific bot address can receive LP tokens
- ✅ Admin can change the bot address anytime via `set_lp_bot_address`
- ✅ Even if AdminCap is compromised, attacker can't steal LP tokens
- ✅ Cleaner security model

---

## Issue 2: Special Launch Management - Which Approach is Easier?

### Approach A (Current): Bot Decides via Parameter ❌ HARDER
```move
// Bot needs to know which tokens are special
prepare_liquidity_for_bot(admin_cap, cfg, curve, burn_54m = false, ctx);  // Special
prepare_liquidity_for_bot(admin_cap, cfg, curve, burn_54m = true, ctx);   // Normal
```

**Bot Requirements:**
- ❌ Must track which tokens are "special" in database
- ❌ Must query database before each pool creation
- ❌ Must pass correct parameter for each token
- ❌ If database gets out of sync, wrong action happens

**Code Bot Needs:**
```typescript
// Bot has to do this:
const isSpecialLaunch = await db.query('SELECT is_special FROM tokens WHERE id = ?', [tokenId]);
const burn54m = !isSpecialLaunch;  // Confusing logic
await preparePool(burn54m);
```

---

### Approach B (Recommended): Contract Decides via Flag ✅ EASIER
```move
// In bonding_curve.move - USE the existing special_launch field:
public entry fun prepare_liquidity_for_bot<T: drop>(
    _admin: &AdminCap,
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    ctx: &mut TxContext  // ✅ No burn_54m parameter!
) {
    // ... validation ...
    
    let treasury_tokens = coin::mint(&mut curve.treasury, burn_or_treasury_amount * 1_000_000_000, ctx);
    
    // ✅ Contract decides based on curve.special_launch flag
    if (curve.special_launch) {
        // Special launch: send 54M to treasury
        transfer::public_transfer(treasury_tokens, treasury_address);
    } else {
        // Normal launch: burn 54M
        coin::burn(&mut curve.treasury, treasury_tokens);
    };
    
    // ... rest of code ...
}

// ADD admin function to mark special launches:
public entry fun set_special_launch<T: drop>(
    _admin: &AdminCap,
    curve: &mut BondingCurve<T>,
    is_special: bool
) {
    assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);  // Can only set before pool creation
    curve.special_launch = is_special;
}
```

**Bot Requirements:**
- ✅ Just calls same function for ALL tokens
- ✅ No tracking needed
- ✅ No database queries
- ✅ No conditional logic
- ✅ Admin marks special launches on-chain

**Code Bot Needs:**
```typescript
// Bot just does this (same for all tokens):
await preparePool(tokenId);  // That's it!
```

**Admin Workflow:**
```typescript
// Admin decides which launches are special ON-CHAIN:
await setSpecialLaunch(curveId, true);   // Mark as special (before graduation)
// Later bot creates pool automatically
```

---

## Comparison Table

| Factor | Approach A (Parameter) | Approach B (Flag) |
|--------|----------------------|-------------------|
| **Bot Complexity** | ❌ High (needs DB) | ✅ Low (simple call) |
| **Error Prone** | ❌ Yes (sync issues) | ✅ No (on-chain truth) |
| **Admin Control** | ❌ Off-chain (DB) | ✅ On-chain (contract) |
| **Transparency** | ❌ Not visible | ✅ Visible on-chain |
| **Bot Code** | ❌ Complex | ✅ Simple |
| **Maintenance** | ❌ Harder | ✅ Easier |

---

## 🎯 RECOMMENDATION

**Use Approach B (special_launch flag)** because:

1. ✅ **Bot is simpler** - One call for all tokens, no logic needed
2. ✅ **More secure** - Source of truth is on-chain, not in bot's database  
3. ✅ **More transparent** - Anyone can see which launches are special
4. ✅ **Less error-prone** - No database sync issues
5. ✅ **Easier to maintain** - Bot doesn't need updates for special launches

**Admin just needs to:**
- Call `set_special_launch(curve, true)` for special tokens (before graduation)
- Bot handles everything else automatically

---

## Implementation Order

1. **Fix LP recipient** (Issue 1) - Deploy as upgrade
2. **Switch to special_launch flag** (Issue 2) - Deploy as upgrade
3. **Update bot** - Simpler code, just calls `prepare_liquidity_for_bot()`
