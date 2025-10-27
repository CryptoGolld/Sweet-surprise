# 🎉 v0.0.8 Deployment - October 27, 2025

## 📦 Contract Deployment Details

**Transaction:** https://testnet.suivision.xyz/txblock/CZFLVEP58HSFiW1JY1fp8kV4duA7b9uR7nv25TR1H9f7

### Package & Objects

| Object | ID | Type |
|--------|-----|------|
| **Package** | `0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348` | Published |
| **PlatformConfig** | `0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9` | Shared |
| **AdminCap** | `0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11` | Owned |
| **UpgradeCap** | `0x7ef7bc39eea080ebddb61426c3b81d099690d3d2eab836e80e6e0a70b5cf6c5b` | Owned |
| **ReferralRegistry** | `0x964b507850a0b51a736d28da9e8868ce82d99fe1faa580c9b4ac3a309e28c836` | Shared |
| **TickerRegistry** | `0xd8ba248944efc41c995a70679aabde9e05b509a7be7c10050f0a52a9029c0fcb` | Shared |

**Deployer:** `0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f`  
**Gas Cost:** 164.08 SUI

---

## 🆕 What's New in v0.0.8

### 1. LP Bot Address Security 🔒
- **Feature:** Only configured bot address can receive LP tokens for pool creation
- **Security:** Even if AdminCap leaks, LP tokens only go to `lp_bot_address`
- **Flexibility:** Admin can change bot address anytime via `set_lp_bot_address()`

### 2. Special Launch Flag 🎯
- **Feature:** Simplified bot logic - same code for all tokens
- **How:** Admin marks special launches with `set_special_launch(curve, true)`
- **Auto:** Contract automatically sends 54M to treasury (instead of burning) for special launches
- **Bot:** No database tracking needed, no conditional logic

### 3. Improved prepare_liquidity_for_bot()
- **Removed:** `burn_54m` parameter (no longer needed)
- **Added:** Automatic detection via `special_launch` flag
- **Security:** Only `lp_bot_address` can call and receive tokens

---

## 🚀 Post-Deployment Setup

### Step 1: Update Indexer to Watch New Package

**On Ubuntu Server:**
```bash
cd /var/www/Sweet-surprise/indexer

# Update .env file
nano .env
```

Add these lines:
```bash
# NEW v0.0.8 Package (current)
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348

# PREVIOUS packages (for incentivized testnet rewards)
PREVIOUS_PLATFORM_PACKAGE_V7=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
```

**Restart indexer:**
```bash
pm2 restart memecoin-indexer
pm2 logs memecoin-indexer
```

---

### Step 2: Set LP Bot Address

**Set your bot's wallet address to receive LP tokens:**

```bash
sui client call \
  --package 0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348 \
  --module platform_config \
  --function set_lp_bot_address \
  --args \
    0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11 \
    0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9 \
    YOUR_BOT_WALLET_ADDRESS \
  --gas-budget 10000000
```

**Replace `YOUR_BOT_WALLET_ADDRESS`** with the address that will create Cetus pools.

---

### Step 3: Verify Configuration

**Check the bot address:**
```bash
sui client object 0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9 --json | grep lp_bot_address
```

---

## 🎯 Usage Guide

### Creating Normal Tokens
```bash
# 1. User creates token normally via frontend
# 2. Token launches with special_launch = false (default)
# 3. After graduation, bot calls prepare_liquidity_for_bot()
# 4. Contract automatically burns 54M tokens
```

### Creating Special Launch Tokens
```bash
# 1. User creates token normally via frontend
# 2. Admin marks it as special BEFORE graduation:
sui client call \
  --package 0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348 \
  --module bonding_curve \
  --function set_special_launch \
  --type-args "$COIN_TYPE" \
  --args \
    0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11 \
    $CURVE_ID \
    true \
  --gas-budget 10000000

# 3. After graduation, bot calls prepare_liquidity_for_bot()
# 4. Contract automatically sends 54M tokens to treasury
```

**Bot Code (Same for All!):**
```typescript
// Bot doesn't need to know if it's special or not!
await prepareLiquidityForBot(curveId);
```

---

## 📊 Token Distribution

### Normal Launch:
- 737M tokens: Sold on bonding curve
- 207M tokens: Cetus pool liquidity (to bot)
- 2M tokens: Team allocation (to treasury)
- 54M tokens: **BURNED** 🔥
- **Total Minted:** 946M tokens

### Special Launch:
- 737M tokens: Sold on bonding curve
- 207M tokens: Cetus pool liquidity (to bot)
- 2M tokens: Team allocation (to treasury)
- 54M tokens: **To Treasury** (not burned)
- **Total Minted:** 1,000M tokens (ALL)

---

## 🔐 Security Features

1. **LP Bot Address Enforcement:**
   - Only configured address can call `prepare_liquidity_for_bot()`
   - LP tokens only sent to `lp_bot_address`
   - Admin can change bot address anytime

2. **Special Launch Control:**
   - On-chain flag (not database)
   - Can only be set before `lp_seeded = true`
   - Transparent and auditable

3. **AdminCap Protection:**
   - All sensitive operations require AdminCap
   - AdminCap owned by deployer wallet
   - Can be transferred to multisig for extra security

---

## 🔄 Migration from Previous Versions

### From v0.0.7 (Previous):
- ✅ All new tokens will use v0.0.8
- ✅ Existing v0.0.7 curves still work (tracked for rewards)
- ✅ Indexer watches both packages
- ✅ Frontend automatically detects correct package

### From v0.0.6 (Legacy):
- ✅ All legacy curves still work (tracked for rewards)
- ✅ Indexer watches all three packages
- ✅ No user action needed

---

## 📝 Environment Variables Update

Update your `.env` files:

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
NEXT_PUBLIC_PLATFORM_STATE=0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9
NEXT_PUBLIC_REFERRAL_REGISTRY=0x964b507850a0b51a736d28da9e8868ce82d99fe1faa580c9b4ac3a309e28c836
NEXT_PUBLIC_TICKER_REGISTRY=0xd8ba248944efc41c995a70679aabde9e05b509a7be7c10050f0a52a9029c0fcb
```

**Indexer (.env):**
```bash
# Current package
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348

# Previous packages (for rewards tracking)
PREVIOUS_PLATFORM_PACKAGE_V7=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
```

---

## 🎁 Incentivized Testnet Tracking

**All packages tracked for future rewards:**

| Version | Package ID | Purpose |
|---------|-----------|---------|
| v0.0.8 (Current) | `0xa49978...` | Active trading |
| v0.0.7 (Previous) | `0xf19ee4...` | Reward eligible |
| v0.0.6 (Legacy) | `0x98da9f...` | Reward eligible |

The indexer tracks ALL trades on ALL packages to ensure testnet participants get proper rewards.

---

## ✅ Verification Checklist

- [ ] Frontend constants updated
- [ ] Indexer watching new package
- [ ] LP bot address configured
- [ ] Test token creation works
- [ ] Test buying works
- [ ] Test selling works
- [ ] Charts display correctly
- [ ] Special launch flag tested

---

## 🆘 Support Commands

**View PlatformConfig:**
```bash
sui client object 0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9
```

**Check if curve is special:**
```bash
sui client object $CURVE_ID --json | jq '.data.content.fields.special_launch'
```

**Change bot address:**
```bash
sui client call --function set_lp_bot_address --args $ADMIN_CAP $CONFIG $NEW_ADDRESS
```

---

## 🎊 Deployment Status: SUCCESSFUL ✅

All contract improvements are now live on testnet!
