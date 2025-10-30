# Fix: Graduation Balance Issue (11,999.7 SUI vs 12,000 SUI)

## Problem
After graduation payouts (10% of 13,333 SUI), curves have **~11,999.7 SUI** remaining due to rounding.  
The contract was hardcoded to require EXACTLY **12,000 SUI**, causing `balance::split error 2`.

## Solution
Changed both `prepare_pool_liquidity()` and `prepare_liquidity_for_bot()` to use the **actual reserve balance** instead of hardcoded 12,000 SUI.

## Changes Made

### Contract (`bonding_curve.move`)
```move
// OLD - Line 675/629:
let sui_for_lp = 12_000_000_000_000;
let lp_sui = coin::from_balance(balance::split(&mut curve.sui_reserve, sui_for_lp), ctx);

// NEW:
let sui_for_lp = balance::value(&curve.sui_reserve);
let lp_sui = coin::from_balance(balance::withdraw_all(&mut curve.sui_reserve), ctx);
```

### Bot (`pool-creation-bot/index.js`)
- Changed minimum balance check from 12,000 to **10,000 SUI** (safety threshold)
- Added warning log for balances < 11,999 SUI (but still processes them)
- Removed hard rejection at 11,999.7 SUI

---

## Deployment Steps

### 1. Pull Latest Code
```bash
cd /var/www/Sweet-surprise
git pull origin cursor/acknowledge-greeting-0ed7
```

### 2. Upgrade Contract on Sui
```bash
cd contracts/suilfg_launch_with_memefi_testnet

# Build the contract
sui move build

# Upgrade the contract (you'll need your UpgradeCap)
sui client upgrade \
  --upgrade-capability <YOUR_UPGRADE_CAP_ID> \
  --gas-budget 500000000

# Note the new package ID from the output
```

### 3. Update Bot Environment (if needed)
```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# If the upgrade changed your PLATFORM_PACKAGE, update .env:
# PLATFORM_PACKAGE=<new_package_id>

# The PLATFORM_STATE ID stays the same (shared objects persist)
```

### 4. Restart Bot
```bash
cd /var/www/Sweet-surprise/pool-creation-bot

pm2 stop pool-creation-bot
pm2 start pool-creation-bot
pm2 logs pool-creation-bot --lines 50
```

---

## What to Expect

### Before Fix:
```
❌ MoveAbort(..., balance, ..., split, ..., 2) in command 0
⚠️  Insufficient balance in curve reserve!
required: "12,000 SUI"
current: "11999 SUI"
```

### After Fix:
```
✅ Curve state: sui_reserve_sui: "11999"
💡 Balance slightly lower than ideal (this is normal due to rounding)
📦 Preparing liquidity...
✅ Successfully prepared liquidity
🏊 Creating Cetus pool...
✅ Pool created successfully
```

---

## Technical Details

### Why 11,999.7 SUI?
1. Graduation target: `13,333 SUI`
2. Platform cut (10%): `1,333.3 SUI`
3. Remaining for LP: `13,333 - 1,333.3 = 11,999.7 SUI`

The 0.3 SUI discrepancy comes from:
- Integer division in Move: `reserve * 1000 / 10_000`
- Rounding during the bonding curve's final trade
- Transaction fees

### Functions Fixed
1. **`prepare_pool_liquidity()`** - Current recommended function (no AdminCap)
2. **`prepare_liquidity_for_bot()`** - Legacy function (kept for V1 compatibility)

Both now use `balance::withdraw_all()` to extract whatever SUI remains after payouts.

---

## Affected Curves

Your 3 V1 graduations will now work:
- `0xf79cb75957032816...` (TOKYO)
- `0x00814028f283e22c...` (BEANS)
- `0xe0e852256e5f736d...` (SULE)

After upgrade, the bot will process them automatically on its next polling cycle.

---

## Questions?

**Q: Will this affect the pool liquidity amounts?**  
A: Slightly - pools will have ~11,999.7 SUI instead of 12,000 SUI. The difference is negligible (0.0025%).

**Q: Do I need to manually process the 3 stuck graduations?**  
A: No! After upgrade, the bot will auto-detect and process them.

**Q: What about future graduations?**  
A: All future graduations will work correctly. The contract now adapts to the actual balance.
