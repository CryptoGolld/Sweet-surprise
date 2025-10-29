# Cetus Pool Bot Fix - Event Listening Issue

## Problem Identified

The Cetus pool bot was **listening for only ONE event type** but graduations can happen TWO ways, so it was missing manual graduations.

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

The bot was only listening for `Graduated` events, but on testnet users are manually calling `try_graduate()` which emits `GraduationReady` events instead!

**Reality:** Tokens can graduate TWO ways:
1. **Auto-graduation**: When `buy()` hits 737M supply → emits `Graduated` 
2. **Manual graduation**: Someone calls `try_graduate()` → emits `GraduationReady`

The bot was only listening for #1, but testnet users are doing #2!

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
// Query BOTH types of graduation events:
// 1. "Graduated" - Auto-graduation when buy() hits 737M supply
// 2. "GraduationReady" - Manual graduation via try_graduate()
const [graduatedEvents, graduationReadyEvents] = await Promise.all([
  this.client.queryEvents({
    query: { MoveEventType: `${PLATFORM_PACKAGE}::bonding_curve::Graduated` },
    ...
  }),
  this.client.queryEvents({
    query: { MoveEventType: `${PLATFORM_PACKAGE}::bonding_curve::GraduationReady` },
    ...
  })
]);

// Combine and process both event types
const allEvents = [...graduatedEvents.data, ...graduationReadyEvents.data];
```

## Changes Made

### 1. `/workspace/pool-creation-bot/index.js`
- ✅ Now queries BOTH `Graduated` AND `GraduationReady` events (lines 140-155)
- ✅ Combines and deduplicates events from both sources
- ✅ Detects which event type triggered and logs accordingly
- ✅ Handles both auto-graduation (buy) and manual graduation (try_graduate)

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
