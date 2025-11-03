# 🚨 CRITICAL VULNERABILITIES - FIX BEFORE SCALING

**⚠️ DO NOT DELETE THIS FILE** - Required for contract upgrade planning

## Quick Summary

| Issue | Severity | Can Steal? | Revenue Loss | Fixed? |
|-------|----------|------------|--------------|--------|
| Multi First Buyer Fee | Medium | ❌ NO | Minor | ⏳ Later |
| Bypass Platform Cut | HIGH | ❌ NO | 1,373 SUI/curve | ⏳ TODO |

**Key Point**: ✅ **NO THEFT POSSIBLE** - All funds go to admin-controlled wallets
- Attacker can only DOS revenue, NOT steal funds
- `lp_recipient_address` is admin-controlled (only AdminCap can change)
- Bot mitigation in place until contract upgrade

---

**Status**: Documented for contract upgrade  
**Severity**: HIGH (Revenue Loss) - NOT Theft Risk  
**Impact**: Platform loses ~1,373 SUI per curve if exploited  
**Funds Safe**: YES - All withdrawals go to admin wallets  

---

## Vulnerability #1: First Buyer Fee Can Be Charged Multiple Times

### Location
`bonding_curve.move` - Line 346 (buy function)

### Issue
The 1 SUI first buyer fee check only looks at `token_supply == 0`, but the sell function allows supply to go back to 0.

### Attack Scenario
```
1. Alice buys 100 tokens
   - token_supply: 0 → 100
   - Pays: 1 SUI first buyer fee ✅
   
2. Alice sells all 100 tokens
   - token_supply: 100 → 0
   
3. Bob buys 50 tokens
   - token_supply == 0 (TRUE again!)
   - Pays: 1 SUI first buyer fee ❌ (charged again!)
   
4. Repeat indefinitely...
```

### Impact
- First buyer fee charged every time supply hits 0
- Unfair to subsequent buyers after complete selloffs
- Potential for malicious repeated fee extraction

### Fix Options

**Option A: Add a flag (Recommended)**
```move
public struct BondingCurve<phantom T: drop> has key, store {
    // ... existing fields ...
    first_buyer_fee_collected: bool,  // ADD THIS
}

// In buy function:
if (curve.token_supply == 0 && !curve.first_buyer_fee_collected) {
    let fee = platform_config::get_first_buyer_fee_mist(cfg);
    if (fee > 0) {
        let fee_coin = coin::split(&mut payment, fee, ctx);
        transfer::public_transfer(fee_coin, treasury);
        curve.first_buyer_fee_collected = true;  // SET FLAG
    };
}
```

**Option B: Prevent selling to 0**
```move
// In sell function after line 498:
let s2 = s1 - amount_tokens_whole;
assert!(s2 > 0, E_CANNOT_SELL_ALL_TOKENS); // Require at least 1 token remains
```

### Decision
**Leaving as-is for now** - adds "tax" on full selloffs, may discourage dumps

---

## Vulnerability #2: Anyone Can Bypass 10% Platform Graduation Cut

### Location
`bonding_curve.move` - Line 729 (`seed_pool_prepare` function)

### Issue
**NO ACCESS CONTROL** + Missing `reward_paid` check allows anyone to frontrun and withdraw full liquidity BEFORE platform takes its 10% cut.

### The Vulnerable Function
```move
public entry fun seed_pool_prepare<T: drop>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    bump_bps: u64,
    ctx: &mut TxContext
) {
    if (!curve.graduated || curve.lp_seeded == true) { abort 9002; } else {};
    // ⚠️ NO CHECK FOR reward_paid!
    // ⚠️ NO CHECK FOR sender (anyone can call!)
    
    let reserve = balance::value<SUI>(&curve.sui_reserve);  // Gets ALL reserve
    // ... 
    let bal_sui_lp = balance::split(&mut curve.sui_reserve, sui_lp);
    let sui_lp_coin = coin::from_balance(bal_sui_lp, ctx);
    
    // Sends to lp_recipient (admin controlled - NOT attacker!)
    let lp_recipient = platform_config::get_lp_recipient_address(cfg);
    transfer::public_transfer(sui_lp_coin, lp_recipient);  // ✅ Still goes to us!
    curve.lp_seeded = true;
}
```

### Normal Flow (What Should Happen)
```
1. Curve graduates with ~13,333 SUI in reserve
2. Anyone calls distribute_payouts()
   → Platform takes 10% = 1,333 SUI
   → Creator gets 40 SUI payout
   → Remaining: 12,000 SUI
3. Bot calls prepare_pool_liquidity() (bot-only function)
   → Withdraws 12,000 SUI to lp_recipient
   → Creates Cetus pool
```

### Attack Flow (Bypasses Platform Cut)
```
1. Curve graduates with ~13,333 SUI in reserve
2. Attacker immediately calls seed_pool_prepare() ❌
   → Withdraws ALL 13,333 SUI (no platform cut taken!)
   → Sends to lp_recipient (still OUR wallet ✅)
   → Sets lp_seeded = true
3. Bot tries to call prepare_pool_liquidity()
   → FAILS (lp_seeded = true)
4. distribute_payouts() becomes useless (no SUI left)
```

### Impact Analysis

**✅ FUNDS ARE SAFE:**
- Attacker **CANNOT steal funds**
- All funds go to `lp_recipient_address` (admin-controlled)
- Only AdminCap can change lp_recipient address
- This is **revenue loss**, NOT theft

**❌ REVENUE LOSS:**
- Platform loses 10% cut (~1,333 SUI per curve)
- Creator loses graduation payout (40 SUI)
- Bot gets DOS'd (can't create pool properly)
- Per curve loss: **~1,373 SUI** ($2,060 at $1.50/SUI)

### Fix Required

**Add reward_paid check:**
```move
public entry fun seed_pool_prepare<T: drop>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    bump_bps: u64,
    ctx: &mut TxContext
) {
    if (!curve.graduated || curve.lp_seeded == true) { abort 9002; } else {};
    assert!(curve.reward_paid, 9010);  // ✅ ADD THIS CHECK!
    
    // ... rest of function unchanged
}
```

**OR deprecate function entirely:**
- Remove `seed_pool_prepare` completely
- Only use `prepare_pool_liquidity` (has proper checks)
- Update any code that calls the old function

### Why It Exists
- Legacy function for backwards compatibility
- Was meant for manual pool creation
- Bot functions (`prepare_pool_liquidity`) have proper security

---

## Vulnerability #3: distribute_payouts Has No Access Control

### Location
`bonding_curve.move` - Line 582

### Issue
Anyone can call `distribute_payouts()` - allows frontrunning

### Code
```move
public entry fun distribute_payouts<T: drop>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    ctx: &mut TxContext
) {
    if (!curve.graduated || curve.reward_paid) { return; } else {};
    // ⚠️ NO CHECK FOR sender - anyone can call!
    
    // Takes platform cut and creator payout
    // Sends to correct addresses (treasury, creator)
}
```

### Impact
**LOW SEVERITY:**
- Attacker can frontrun, but funds still go to correct addresses
- No financial loss
- Just prevents bot from calling it first
- Functions correctly regardless of who calls

### Fix (Optional)
```move
// Add bot-only check:
let bot_address = platform_config::get_lp_bot_address(cfg);
assert!(sender(ctx) == bot_address, E_UNAUTHORIZED_BOT);
```

---

## Summary

| Vulnerability | Severity | Theft Risk | Revenue Loss | Action Required |
|--------------|----------|------------|--------------|-----------------|
| #1: Multi First Buyer Fee | Medium | No | Yes (minor) | Decide & Fix |
| #2: Bypass Platform Cut | **HIGH** | **NO** | **YES (1,373 SUI/curve)** | **FIX ASAP** |
| #3: distribute_payouts Open | Low | No | No | Optional |

## Priority Action Items

### 1. Immediate (Contract Upgrade)
- [ ] Fix `seed_pool_prepare` by adding `reward_paid` check
- [ ] OR deprecate `seed_pool_prepare` completely

### 2. Bot Protection (Until Fix)
- [x] Bot monitors for graduation events
- [ ] Bot frontrunss `distribute_payouts` immediately
- [ ] Bot verifies `reward_paid = true` before calling `prepare_pool_liquidity`
- [ ] Bot has backup logic if `seed_pool_prepare` gets called first

### 3. Future Upgrade
- [ ] Decide on first buyer fee behavior
- [ ] Add access control to `distribute_payouts` if needed
- [ ] Remove all legacy functions

---

## Contract Upgrade Checklist

When upgrading mainnet contract:

```move
// In bonding_curve.move

// FIX #1: Add to struct (line 48)
public struct BondingCurve<phantom T: drop> has key, store {
    // ... existing fields ...
    first_buyer_fee_collected: bool,  // NEW
}

// FIX #2: Update buy function (line 346)
if (curve.token_supply == 0 && !curve.first_buyer_fee_collected) {
    let fee = platform_config::get_first_buyer_fee_mist(cfg);
    if (fee > 0) {
        let fee_coin = coin::split(&mut payment, fee, ctx);
        transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
        curve.first_buyer_fee_collected = true;  // NEW
    };
};

// FIX #3: Update seed_pool_prepare (line 735)
if (!curve.graduated || curve.lp_seeded == true) { abort 9002; } else {};
assert!(curve.reward_paid, 9010);  // NEW - Enforces platform cut taken first
```

---

---

## ✅ Security Confirmation

### Can Anyone Steal Funds?

**NO! Funds are 100% safe:**

1. ✅ `seed_pool_prepare` sends funds to: `platform_config::get_lp_recipient_address(cfg)`
2. ✅ Only **AdminCap** can change `lp_recipient_address` (via `set_lp_recipient_address`)
3. ✅ Attacker can only **DOS the 10% platform cut**, NOT withdraw to their wallet
4. ✅ All funds still go to **admin-controlled wallet**

### Can Anyone Withdraw to Their Own Wallet?

**NO! All withdrawal paths are secured:**

- `seed_pool_prepare()` → Sends to `lp_recipient_address` (admin-controlled)
- `prepare_pool_liquidity()` → Requires `sender == bot_address` (admin-set)
- `prepare_liquidity_for_bot()` → Requires `sender == bot_address` (admin-set)
- `distribute_payouts()` → Sends to `treasury` & `creator` (correct addresses)
- `withdraw_reserve_to*()` → Requires **AdminCap** (admin-only)

**Conclusion**: This is a **revenue loss bug**, NOT a **theft vulnerability**.

---

**Created**: 2025-11-03  
**Last Updated**: 2025-11-03  
**Next Review**: Before next mainnet deployment  
**Priority**: High (Revenue Protection)

**⚠️ DO NOT DELETE THIS FILE** - Required for contract upgrade planning
