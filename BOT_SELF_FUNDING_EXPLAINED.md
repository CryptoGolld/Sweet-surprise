# Bot Self-Funding Strategy

## 🎯 How The Bot Pays For Its Own Gas

### The Smart Solution:

**Bot keeps 0.5 SUI from each pool for future operations!**

---

## 💡 How It Works

### Each Graduation:

```
1. Token graduates
   └─ Bonding curve has: ~12,000 SUI + 207M tokens

2. prepare_liquidity_for_bot()
   ├─ Extracts: ~12,000 SUI + 207M tokens
   └─ Splits SUI:
       ├─ 0.5 SUI → Bot wallet (gas reserve)
       └─ 11,999.5 SUI → Pool creation

3. Create pool with 11,999.5 SUI
   ├─ Gas (~0.15 SUI) paid from pool's SUI
   └─ Final pool: ~11,999.35 SUI + 207M tokens

4. Bot wallet grows!
   └─ +0.5 SUI per pool created
```

---

## 📊 Bot Wallet Growth

### Starting with 0 SUI:

| Pools Created | Bot Gas Reserve | Pool SUI Used | Bot Can Create |
|---------------|-----------------|---------------|----------------|
| 0 | 0 SUI | - | Need initial funding |
| 1 | 0.5 SUI | ~0.15 | 3 more pools |
| 10 | 5 SUI | ~1.5 | 33 more pools |
| 100 | 50 SUI | ~15 | 333 more pools |
| 1000 | 500 SUI | ~150 | 3,333 more pools |

**After first few pools, bot is self-sustaining!** ✅

---

## 🚀 Bootstrap Strategy

### Option 1: Minimal Initial Funding (Recommended)

```bash
# Testnet
Fund with: 0.5-1 SUI (from faucet)

# Create first 2-3 pools
# Bot accumulates: 1-1.5 SUI
# Now self-funding forever! ✅
```

### Option 2: Zero Initial Funding (Riskier)

```bash
# Start with: 0 SUI

# Problem: First call to prepare_liquidity_for_bot needs gas
# Solution: That call uses the curve's SUI for gas!

# After first pool:
# Bot has: 0.5 SUI
# Self-funding from here! ✅
```

---

## 💰 Math Breakdown

### Per Pool:

| Item | Amount | Goes To |
|------|--------|---------|
| **Curve SUI** | 12,000.00 | Extracted |
| **Bot Reserve** | -0.50 | Bot wallet (for future) |
| **Pool SUI** | 11,999.50 | Pool creation |
| **Gas Used** | -0.15 | Blockchain (from pool SUI) |
| **Final Pool** | **11,999.35** | Cetus pool ✅ |

**Difference:** 0.65 SUI (0.005% of pool) - negligible!

---

## 🔧 Technical Implementation

### Code:

```javascript
async prepareLiquidity(curveId, coinType) {
  const tx = new Transaction();
  
  // Extract from curve (NO AdminCap needed!)
  const [suiCoin, tokenCoin] = tx.moveCall({
    target: 'prepare_liquidity_for_bot',
    arguments: [
      tx.object(platformState),
      tx.object(curveId),
      tx.object('0x6'), // Clock
    ],
  });
  
  // Split: 0.5 SUI for bot, rest for pool
  const [botGasReserve, poolSui] = tx.splitCoins(suiCoin, [
    tx.pure.u64(500_000_000), // 0.5 SUI in MIST
  ]);
  
  // Transfer bot's share
  tx.transferObjects([botGasReserve], botAddress);
  
  // Transfer pool's share
  tx.transferObjects([poolSui, tokenCoin], botAddress);
  
  // Execute
  await executeTransaction(tx);
}
```

### Why This Works:

1. **First call:** Uses small amount of gas from curve's SUI
2. **Bot receives:** 0.5 SUI to its wallet
3. **Next call:** Can use that 0.5 SUI if needed
4. **Accumulates:** More and more gas reserve
5. **Eventually:** Hundreds of SUI in reserve

---

## 🎯 No AdminCap Needed!

### You Were Right:

```javascript
// OLD (WRONG):
tx.moveCall({
  arguments: [
    tx.object(adminCap),  // ❌ Not needed!
    tx.object(platformState),
    // ...
  ],
});

// NEW (CORRECT):
tx.moveCall({
  arguments: [
    tx.object(platformState),  // ✅ Just platform state
    tx.object(curveId),
    tx.object('0x6'),
  ],
});
```

### Why:

The contract checks:
```rust
// In bonding_curve.move
public entry fun prepare_liquidity_for_bot<T>(
    platform_state: &PlatformState,
    curve: &mut BondingCurve<T>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Checks if caller is configured LP bot address
    assert!(
        platform::get_lp_bot_address(platform_state) == tx_context::sender(ctx),
        ENotAuthorized
    );
    
    // No AdminCap needed! ✅
}
```

**The bot address is configured in platform_config, not via AdminCap ownership!**

---

## 📈 Growth Projections

### Testnet (Low Volume):

```
Initial: 1 SUI (from faucet)
Day 1: 2-5 pools → 2-3.5 SUI
Week 1: 10-20 pools → 6-11 SUI
Month 1: 50-100 pools → 26-51 SUI

After 1 month: Self-sustaining with huge buffer! ✅
```

### Mainnet (High Volume):

```
Initial: 0.5 SUI (or even 0!)
Day 1: 50-100 pools → 25-50 SUI
Week 1: 500-1000 pools → 250-500 SUI
Month 1: 5000-10000 pools → 2500-5000 SUI

After 1 week: Massive gas reserve! 🚀
```

---

## 🛡️ Security Benefits

### Before (If We Kept 100 SUI):

```
Bot wallet: 100 SUI
Risk if hacked: $200 loss
Refill: Every few days
```

### After (Self-Funding):

```
Bot wallet: 0.5 SUI → grows to 50-500 SUI over time
Risk if hacked: 
  - Early: $1-2 loss (minimal)
  - Later: $100-1000 (but earned, not deposited)
Refill: Never! Self-funding ✅
```

**Key difference:** You never deposit large amounts - bot earns its own gas!

---

## 💡 Configurable Reserve Amount

### Current: 0.5 SUI

```javascript
const BOT_RESERVE_MIST = 500_000_000; // 0.5 SUI

tx.splitCoins(suiCoin, [tx.pure.u64(BOT_RESERVE_MIST)]);
```

### Can Adjust:

| Reserve | Pool Impact | Bot Growth Rate | Recommendation |
|---------|-------------|-----------------|----------------|
| 0.1 SUI | 0.001% | Slow | ⚠️ Too low |
| 0.5 SUI | 0.004% | Good | ✅ **Recommended** |
| 1.0 SUI | 0.008% | Fast | ✅ Also good |
| 5.0 SUI | 0.04% | Very fast | ⚠️ Noticeable to users |

**0.5 SUI is perfect balance:** Bot self-funds quickly, pool barely affected (0.004%)

---

## 🎯 Bootstrap Scenarios

### Scenario 1: Start with 1 SUI

```
Fund: 1 SUI from faucet
Pool 1: +0.5 SUI → 1.5 SUI
Pool 2: +0.5 SUI → 2.0 SUI
Pool 3: +0.5 SUI → 2.5 SUI
...
Pool 10: +0.5 SUI → 6.0 SUI

After 10 pools: Healthy reserve, never need refill!
```

### Scenario 2: Start with 0.5 SUI

```
Fund: 0.5 SUI from faucet
Pool 1: +0.5 SUI → 1.0 SUI
Pool 2: +0.5 SUI → 1.5 SUI
...

Slightly slower start, but still self-funds!
```

### Scenario 3: Start with 0 SUI (Brave!)

```
Fund: 0 SUI

Pool 1: First call needs gas
  - Uses ~0.001 SUI from curve's 12K SUI for gas
  - Bot receives 0.5 SUI
  - Bot now has: 0.5 SUI ✅

Pool 2: +0.5 SUI → 1.0 SUI
...

Works! But slightly risky if first call fails.
```

**Recommendation: Start with 0.5-1 SUI to be safe** ✅

---

## 📊 Updated Funding Guide

### Testnet:

```bash
# Initial funding (one-time)
curl -X POST 'https://faucet.testnet.sui.io/gas' \
  -d '{"FixedAmountRequest":{"recipient":"<BOT_ADDRESS>"}}'

# Gets: 1 SUI
# After 10 pools: ~6 SUI (self-funded)
# After 100 pools: ~51 SUI (huge buffer)

# Refill needed: NEVER! ✅
```

### Mainnet:

```bash
# Initial funding (optional!)
sui client transfer --to <BOT_ADDRESS> --amount 500000000  # 0.5 SUI

# Or even start with 0 SUI and let first pool fund it!

# After 100 pools: ~50 SUI
# After 1000 pools: ~500 SUI

# Refill needed: NEVER! ✅
```

---

## 🎉 Benefits Summary

### Self-Funding Advantages:

1. **No AdminCap needed** - Just configured LP bot address
2. **Zero ongoing funding** - Earns its own gas
3. **Scales automatically** - More pools = more gas reserve
4. **Minimal initial cost** - 0.5-1 SUI to start
5. **Low risk** - Never deposit large amounts
6. **Pool impact negligible** - 0.004% (0.5 out of 12,000)

### Comparison:

| Approach | Initial Funding | Ongoing Funding | Risk | Complexity |
|----------|----------------|-----------------|------|------------|
| **Manual Refill** | 100-500 SUI | Every 2-3 days | High | High |
| **Use Curve SUI** | 1-2 SUI | Never | Low | Medium |
| **Self-Funding (NEW)** | 0.5-1 SUI | Never | Minimal | Low |

---

## ✅ Final Strategy

### What Bot Needs:

**Testnet:**
```bash
Initial: 0.5-1 SUI (from faucet)
Ongoing: Nothing! Self-funds from pools
Per pool: Keeps 0.5 SUI, uses 0.15 SUI for gas
Result: Grows 0.35 SUI per pool
```

**Mainnet:**
```bash
Initial: 0.5-1 SUI (or even 0!)
Ongoing: Nothing! Self-funds from pools
Per pool: Keeps 0.5 SUI, uses 0.15 SUI for gas
Result: Grows 0.35 SUI per pool
```

### Pool Impact:

```
User graduates token:
- Expects: ~12,000 SUI in pool
- Gets: ~11,999.35 SUI in pool
- Difference: 0.65 SUI (0.0054%)

User barely notices! ✅
```

---

**The bot is now truly self-sustaining!** 🚀

No AdminCap, no manual funding, just works! ✅
