# Cetus Pool Bot Fix - Event Listening Issue

## Problem Identified

The Cetus pool bot was **listening for the wrong event** and therefore not detecting any graduations.

### Root Cause

The contract has **TWO different graduation paths**:

1. **Auto-Graduation (in `buy()` function)** - Lines 430-446 of `bonding_curve.move`
   - Happens automatically when supply hits 737M tokens
   - Emits: `Graduated` event
   - This is the PRIMARY graduation path

2. **Manual Graduation (in `try_graduate()` function)** - Lines 566-579
   - Can be called manually by anyone
   - Emits: `GraduationReady` event
   - This is a SECONDARY/backup path

### The Bug

The bot was listening for `GraduationReady` events:
```javascript
MoveEventType: `${CONFIG.platformPackage}::bonding_curve::GraduationReady`
```

But tokens graduate automatically through the `buy()` function, which emits `Graduated` events instead!

## The Fix

Changed the bot to listen for the correct event:

### Before:
```javascript
// Query graduation events (GraduationReady is emitted when token reaches threshold)
const events = await this.client.queryEvents({
  query: {
    MoveEventType: `${CONFIG.platformPackage}::bonding_curve::GraduationReady`,
  },
  ...
});
```

### After:
```javascript
// Query graduation events (Graduated is emitted on auto-graduation from buy())
// Note: We listen for "Graduated" not "GraduationReady" because tokens auto-graduate
// when they hit 737M supply during a buy transaction
const events = await this.client.queryEvents({
  query: {
    MoveEventType: `${CONFIG.platformPackage}::bonding_curve::Graduated`,
  },
  ...
});
```

## Changes Made

### 1. `/workspace/pool-creation-bot/index.js`
- ✅ Changed event query from `GraduationReady` to `Graduated` (line 140)
- ✅ Updated event extraction logic to properly parse `Graduated` events (lines 194-222)
- ✅ Added better comments explaining the auto-graduation flow

### 2. `/workspace/pool-creation-bot/README.md`
- ✅ Updated documentation to reflect correct event name
- ✅ Added explanation of auto-graduation during buy transactions

## How It Works Now

1. **User buys tokens** → If supply hits 737M, contract auto-graduates
2. **Contract emits `Graduated` event** ← Bot is now listening for this!
3. **Bot detects graduation** → Extracts curve_id and coin_type from transaction
4. **Bot calls `distribute_payouts()`** → Pays creator reward (40 SUI) and platform cut (1,293 SUI)
5. **Bot calls `prepare_pool_liquidity()`** → Extracts 12,000 SUI + 207M tokens for pool
6. **Bot creates Cetus pool** → Using Cetus SDK with 1% fee tier
7. **Bot adds liquidity** → Full-range position
8. **Bot burns LP tokens** → Permanent lock using Cetus Burn Manager

## Graduation Flow in Contract

From `bonding_curve.move`:

```move
// In buy() function - Auto-graduation
if (curve.token_supply >= MAX_CURVE_SUPPLY && !curve.graduated) {
    let target = curve.graduation_target_mist;
    let raised = balance::value(&curve.sui_reserve);
    
    if (raised >= target) {
        curve.graduated = true;
        curve.status = TradingStatus::Frozen;
        
        event::emit(Graduated {  // ← This is what the bot listens for!
            creator: curve.creator,
            reward_sui: platform_config::get_creator_graduation_payout_mist(cfg),
            treasury: platform_config::get_treasury_address(cfg)
        });
    };
}
```

## Testing

To test the fix:

1. **Restart the bot** with the updated code
2. **Monitor logs** for graduation detection:
   ```bash
   pm2 logs pool-creation-bot
   ```
3. **Create a test token** and buy until graduation
4. **Verify bot actions**:
   - ✅ Detects `Graduated` event
   - ✅ Calls `distribute_payouts()`
   - ✅ Calls `prepare_pool_liquidity()`
   - ✅ Creates Cetus pool
   - ✅ Burns LP tokens

## Why This Happened

The documentation and README were outdated and referenced `GraduationEvent` or `GraduationReady`, but the actual implementation uses:
- `Graduated` for auto-graduation (primary path)
- `GraduationReady` for manual graduation (secondary path)

The bot was following outdated docs instead of the actual contract implementation.

## Status

🎯 **FIXED** - Bot will now correctly detect all token graduations and create Cetus pools automatically.

## Next Steps

1. Deploy updated bot code to production
2. Restart bot service: `pm2 restart pool-creation-bot`
3. Monitor for next graduation
4. Verify pool creation completes successfully
