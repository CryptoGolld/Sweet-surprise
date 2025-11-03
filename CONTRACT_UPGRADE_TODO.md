# 🔧 CONTRACT UPGRADE TODO - MUST FIX BEFORE SCALING

**⚠️ DO NOT DELETE** - Critical for next contract deployment

---

## 📋 Issues to Fix in Next Contract Upgrade

### 1️⃣ HIGH PRIORITY: Fix `seed_pool_prepare` Frontrun Vulnerability

**File**: `contracts/suilfg_launch_mainnet/sources/bonding_curve.move`  
**Line**: 729  
**Revenue at Risk**: ~1,373 SUI per curve (~$2,060 USD)

**Current Code**:
```move
public entry fun seed_pool_prepare<T: drop>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    bump_bps: u64,
    ctx: &mut TxContext
) {
    if (!curve.graduated || curve.lp_seeded == true) { abort 9002; } else {};
    // ⚠️ MISSING: assert!(curve.reward_paid, 9010);
    // ⚠️ Anyone can call this before distribute_payouts!
    // ... withdraws all liquidity before platform takes 10% cut
}
```

**Fix**:
```move
public entry fun seed_pool_prepare<T: drop>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    bump_bps: u64,
    ctx: &mut TxContext
) {
    if (!curve.graduated || curve.lp_seeded == true) { abort 9002; } else {};
    assert!(curve.reward_paid, 9010);  // ✅ ADD THIS LINE
    // ... rest unchanged
}
```

**Alternative**: Delete `seed_pool_prepare` entirely (it's legacy, use `prepare_pool_liquidity` instead)

---

### 2️⃣ MEDIUM PRIORITY: Fix First Buyer Fee Re-charge

**File**: `contracts/suilfg_launch_mainnet/sources/bonding_curve.move`  
**Line**: 346 (buy function) & 48 (struct)  
**Impact**: First buyer fee can be charged multiple times

**Current Code**:
```move
// Struct (line 48)
public struct BondingCurve<phantom T: drop> has key, store {
    id: UID,
    status: TradingStatus,
    sui_reserve: Balance<SUI>,
    token_supply: u64,  // This can go back to 0 when all tokens sold!
    // ... other fields
}

// Buy function (line 346)
if (curve.token_supply == 0) {  // ⚠️ Can be true multiple times!
    let fee = platform_config::get_first_buyer_fee_mist(cfg); // 1 SUI
    let fee_coin = coin::split(&mut payment, fee, ctx);
    transfer::public_transfer(fee_coin, treasury);
}
```

**Fix Option A** (Add flag - Recommended):
```move
// Update struct (line 48)
public struct BondingCurve<phantom T: drop> has key, store {
    id: UID,
    status: TradingStatus,
    sui_reserve: Balance<SUI>,
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
    special_launch: bool,
    first_buyer_fee_collected: bool,  // ✅ ADD THIS
}

// Update buy function (line 346)
if (curve.token_supply == 0 && !curve.first_buyer_fee_collected) {  // ✅ ADD FLAG CHECK
    let fee = platform_config::get_first_buyer_fee_mist(cfg);
    if (fee > 0) {
        let fee_coin = coin::split(&mut payment, fee, ctx);
        transfer::public_transfer(fee_coin, treasury);
        curve.first_buyer_fee_collected = true;  // ✅ SET FLAG
    };
}
```

**Fix Option B** (Prevent selling to 0):
```move
// In sell function after line 498
let s2 = s1 - amount_tokens_whole;
assert!(s2 > 0, E_CANNOT_SELL_ALL_TOKENS);  // ✅ ADD THIS
// This prevents token_supply from ever reaching 0 again
```

**Decision**: Leaving as-is for now (acts as tax on full selloffs)

---

## 🤖 Bot Mitigation (Until Contract Fix)

**Location**: `pool-creation-bot/index.js`

**Add this code to handleGraduation function**:

```javascript
async function handleGraduation(event) {
  const curveId = event.parsedJson.curve_id;
  const coinType = event.type.split('::')[2]; // Extract coin type
  
  logger.info('🎓 Graduation detected!', { curveId, coinType });
  
  // ========================================
  // STEP 1: FRONTRUN PROTECTION
  // ========================================
  logger.warn('🚨 FRONTRUN PROTECTION: Calling distribute_payouts first!');
  
  try {
    const distributeTx = new Transaction();
    distributeTx.moveCall({
      target: `${CONFIG.platformPackage}::bonding_curve::distribute_payouts`,
      typeArguments: [coinType],
      arguments: [
        distributeTx.object(CONFIG.platformState),
        distributeTx.object(curveId),
      ],
    });
    
    const result = await client.signAndExecuteTransaction({
      signer: botKeypair,
      transaction: distributeTx,
      options: { showEffects: true },
    });
    
    if (result.effects.status.status === 'success') {
      logger.info('✅ Platform cut secured! (10% + creator payout)', {
        digest: result.digest,
      });
    } else {
      logger.warn('⚠️ distribute_payouts failed', {
        error: result.effects.status.error,
      });
    }
  } catch (error) {
    logger.warn('⚠️ distribute_payouts error (might already be called)', {
      error: error.message,
    });
  }
  
  // ========================================
  // STEP 2: VERIFY REWARD_PAID
  // ========================================
  logger.info('🔍 Verifying reward_paid before proceeding...');
  
  const curveObj = await client.getObject({
    id: curveId,
    options: { showContent: true },
  });
  
  const curveData = curveObj.data.content.fields;
  
  if (!curveData.reward_paid) {
    logger.error('❌ FRONTRUN DETECTED! reward_paid = false', {
      curveId,
      message: 'Someone called seed_pool_prepare and bypassed platform cut!',
      impact: 'We lost ~1,373 SUI revenue but funds are safe (in lp_recipient)',
      action: 'Check lp_recipient wallet and manually create pool',
    });
    
    // Track this for revenue reporting
    await trackLostRevenue(curveId, 1373);
    
    return; // Can't proceed with prepare_pool_liquidity
  }
  
  logger.info('✅ reward_paid = true, safe to proceed');
  
  // ========================================
  // STEP 3: Continue with normal flow
  // ========================================
  await extractLiquidityAndCreatePool(curveId, coinType);
}
```

---

## 📝 Contract Upgrade Checklist

When deploying upgraded contract:

- [ ] Add `first_buyer_fee_collected: bool` to BondingCurve struct
- [ ] Update buy function to check flag
- [ ] Add `assert!(curve.reward_paid, 9010)` to `seed_pool_prepare`
- [ ] OR delete `seed_pool_prepare` entirely (recommended)
- [ ] Test on testnet first
- [ ] Deploy to mainnet via upgrade
- [ ] Update bot code to remove frontrun protection (no longer needed)
- [ ] Monitor first few graduations after upgrade

---

## 🔍 Vulnerability Details

See **CRITICAL_VULNERABILITIES.md** for:
- Complete attack scenarios
- Security analysis
- Code examples
- Impact assessment

See **BOT_DETAILED_FLOW.md** for:
- Bot mitigation logic
- Frontrun protection code
- Fallback procedures

---

**Status**: Documented & Bot Mitigated  
**Next Action**: Fix in contract upgrade  
**Timeline**: Before aggressive scaling  
**Risk Level**: Medium (revenue loss, not theft)  

---

## ✅ Final Security Confirmation

**Q: Can anyone steal funds from graduated curves?**  
**A: NO!** All withdrawal paths send funds to admin-controlled addresses:
- `lp_recipient_address` (controlled by AdminCap)
- `treasury_address` (controlled by AdminCap)
- `bot_address` (controlled by AdminCap)

**Q: Can anyone withdraw to their own wallet?**  
**A: NO!** All functions either:
- Require AdminCap
- Require sender == bot_address
- Send to hardcoded config addresses

**The vulnerabilities only allow revenue loss, not theft.**

---

**⚠️ DO NOT DELETE THIS FILE** - Keep in repo permanently
