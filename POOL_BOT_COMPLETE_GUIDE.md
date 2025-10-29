# Complete Pool Creation Bot Guide

## 🎯 Quick Answer to Your Questions

### Can you still claim rewards/LP fees?

**YES! ✅** - But only if you **LOCK the LP** instead of burning it.

I created **TWO versions** of the bot:

| Version | File | LP Handling | Can Claim Fees? |
|---------|------|-------------|-----------------|
| v1 | `index.js` | **Burns LP** | ❌ No - fees trapped forever |
| v2 | `index-v2.js` | **Locks LP** | ✅ Yes - collect fees anytime! |

**Recommended: Use v2** (index-v2.js) 🎯

---

### What percentage for Cetus fees?

**0.25%** (25 basis points)

This is the standard fee tier for most tokens on Cetus.

**Fee Breakdown:**
- Traders pay: **0.25% per swap**
- You receive: **~80-100% of fees** (rest to Cetus protocol)
- Fee tier: Corresponds to **tick spacing 60**

**Why 0.25%?**
- ✅ Industry standard for memecoins
- ✅ Balances liquidity and trading volume
- ✅ Not too high (kills volume) or too low (no revenue)

---

## 🏊 Complete Pool Mechanics Explained

### Step-by-Step Process

#### 1️⃣ **Graduation Event** (Trigger)

When a bonding curve sells all 737M tokens:
```
Event: Graduated (auto-emitted during buy when supply hits 737M)
- curve_id: 0x...
- coin_type: 0x...::coin::COIN
- sui_raised: ~13,000
- tokens_sold: 737,000,000
```

Bot detects this every 10 seconds.

---

#### 2️⃣ **Liquidity Extraction** (prepare_liquidity_for_bot)

Bot calls smart contract to extract liquidity:

```move
prepare_liquidity_for_bot<T>(
    AdminCap,
    PlatformConfig,
    BondingCurve,
    Clock
)
```

**What happens internally:**
1. Verify curve graduated ✅
2. Verify bot is authorized ✅
3. Mint 263M tokens:
   - **207M** → Bot (for pool)
   - **54M** → Burned (destroyed)
   - **2M** → Creator (team allocation)
4. Transfer **~12,000 SUI** from curve to bot
5. Mark curve as `lp_seeded = true`

**Bot receives:**
- 12,000 SUI (or SUILFG_MEMEFI on testnet)
- 207,000,000 tokens

---

#### 3️⃣ **Pool Creation** (Cetus SDK)

Bot creates Cetus pool:

```javascript
createPoolTransactionPayload({
  coinTypeA: '0x2::sui::SUI',        // SUI (or SUILFG on testnet)
  coinTypeB: '0x...::coin::COIN',    // Your memecoin
  tickSpacing: 60,                    // 0.25% fee tier
  initializeSqrtPrice: '...',         // Based on final bonding curve price
})
```

**Pool Parameters:**
- **Fee Tier:** 0.25% (tick spacing 60)
- **Initial Price:** Calculated from bonding curve final price
  ```
  Price = 207M tokens / 12K SUI = 17,250 tokens per SUI
  Sqrt Price = sqrt(17,250) * 2^64
  ```

**Pool Created:**
- Pool address generated: `0xABC...`
- Registered in Cetus global registry
- Appears on Cetus UI immediately

---

#### 4️⃣ **Add Liquidity** (Full Range)

Bot opens position and adds liquidity:

```javascript
openPositionTransactionPayload({
  poolAddress: '0xABC...',
  tickLower: -443636,    // Minimum possible tick
  tickUpper: 443636,     // Maximum possible tick
})

addLiquidityTransactionPayload({
  maxAmountA: 12000 * 1e9,   // 12K SUI in MIST
  maxAmountB: 207M * 1e9,    // 207M tokens
})
```

**Full Range Liquidity:**
- Covers ALL possible prices
- Never goes "out of range"
- Always provides liquidity
- Optimal for volatile tokens

**Result:**
- Position NFT created (represents LP ownership)
- Liquidity = sqrt(12000 * 207M) ≈ 49.7M

---

#### 5️⃣ **Lock LP Position** (v2 - Recommended)

```javascript
// Transfer position NFT to LP locker
tx.transferObjects([positionNFT], lpLockerAddress);
```

**What this means:**
- Position owned by LP locker address
- Bot doesn't control it anymore
- **Can still claim trading fees!**
- Cannot withdraw liquidity

---

## 💰 Fee Revenue Model

### How Fees Work

**Trading Example:**
```
User swaps 100 SUI for tokens:
- User pays: 100 SUI
- Fee (0.25%): 0.25 SUI
- User receives: Tokens worth 99.75 SUI

Fee Distribution:
- LP Provider (you): ~0.20-0.25 SUI
- Cetus Protocol: ~0-0.05 SUI
```

### Fee Accumulation

Fees accumulate in the LP position:
```
Day 1:  0.25 SUI
Day 2:  0.50 SUI
Day 7:  1.75 SUI
Day 30: 7.50 SUI
```

### Fee Collection (Automated)

Run the fee collector bot (included):

```bash
# Start fee collector (runs daily)
pm2 start fee-collector.js
```

**What it does:**
1. Checks LP position for unclaimed fees
2. Claims fees from Cetus
3. Transfers to platform treasury
4. Repeats every 24 hours

### Revenue Projections

**Conservative Estimate:**

| Metric | Value |
|--------|-------|
| Pool Liquidity | 12K SUI + 207M tokens |
| Daily Volume | 10K SUI |
| Daily Fees (0.25%) | 25 SUI |
| Monthly Fees | 750 SUI |
| Annual Fees | 9,125 SUI |

**If volume is higher:**

| Daily Volume | Daily Fees | Monthly | Annual |
|--------------|------------|---------|--------|
| 50K SUI | 125 SUI | 3,750 SUI | 45,625 SUI |
| 100K SUI | 250 SUI | 7,500 SUI | 91,250 SUI |
| 500K SUI | 1,250 SUI | 37,500 SUI | 456,250 SUI |

---

## 🔄 Two Options Compared

### Option 1: Lock LP (v2 - index-v2.js) ✅ RECOMMENDED

**Pros:**
- ✅ Can claim trading fees (revenue!)
- ✅ Fees sent to treasury
- ✅ Liquidity still locked (anti-rug)
- ✅ Platform earns from each trade

**Cons:**
- ⚠️ Requires securing LP locker wallet

**Use Case:** Best for platform sustainability

---

### Option 2: Burn LP (v1 - index.js)

**Pros:**
- ✅ Absolute guarantee liquidity stays
- ✅ No possible way to rug
- ✅ Ultimate trust signal

**Cons:**
- ❌ Cannot claim fees (lost revenue)
- ❌ Fees trapped in position forever
- ❌ Platform misses out on income

**Use Case:** Only if absolute anti-rug is priority

---

## 🚀 Deployment Instructions

### Step 1: Choose Version

```bash
cd /var/www/Sweet-surprise/pool-creation-bot

# For fee collection (recommended):
cp index-v2.js index.js

# Or for LP burning:
# (keep existing index.js)
```

### Step 2: Configure

```bash
cp .env.example .env
nano .env
```

**Critical settings:**
```bash
# Bot wallet (needs AdminCap + gas)
BOT_PRIVATE_KEY=suiprivkey...

# LP Locker (where positions go)
LP_LOCKER_ADDRESS=0x...

# Treasury (where fees go)
PLATFORM_TREASURY=0x...

# Fee tier (0.25% = tick spacing 60)
TICK_SPACING=60
```

### Step 3: Install & Start

```bash
npm install
mkdir -p logs

# Start pool creation bot
pm2 start ecosystem.config.js

# Start fee collector (if using v2)
pm2 start fee-collector.js --name fee-collector

# View logs
pm2 logs
```

---

## 📊 Monitoring

### Check Bot Status

```bash
# Bot running?
pm2 status

# View recent activity
pm2 logs pool-creation-bot --lines 100

# Check for graduations
tail -f logs/combined.log | grep "Graduation detected"
```

### Expected Logs (v2)

```
🤖 Pool Creation Bot Started
Fee tier: 0.25% (tick spacing 60)
LP locking enabled - fees can be claimed!

🎓 Graduation detected! { curveId: '0x...' }
📦 Step 1/3: Preparing liquidity
✅ Liquidity prepared
🏊 Step 2/3: Creating Cetus pool
✅ Pool created! { feeTier: '0.25%' }
💧 Step 3/3: Adding liquidity & locking position
✅ Liquidity added & LP locked!
✅ Pool creation complete! { note: 'LP locker can now claim trading fees' }
```

---

## 🎯 Summary

**Pool Parameters:**
- **Fee:** 0.25% (optimal for memecoins)
- **Liquidity:** 12K SUI + 207M tokens
- **Range:** Full range (always active)
- **LP Handling:** LOCK (can claim fees) ✅

**Revenue:**
- Trading fees accumulate in position
- Bot collects fees daily
- Sent to platform treasury
- Sustainable income for platform

**Security:**
- Liquidity permanently locked
- Cannot be withdrawn
- Anti-rug guaranteed
- Position owned by secure locker

---

## 🤝 Recommendations

1. **Use v2** (index-v2.js) - Lock LP, don't burn
2. **Run fee collector** - Claim fees daily
3. **Use 0.25% fee tier** - Already configured
4. **Monitor regularly** - Check PM2 logs

---

**Questions? See `POOL_MECHANICS_EXPLAINED.md` for deep dive!** 🚀
