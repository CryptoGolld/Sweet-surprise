# 🚀 SuiLFG MemeFi Platform - Production Deployment

**Network:** Testnet  
**Status:** ✅ Production Ready  
**Deployed:** October 21, 2025

---

## 📦 Platform Contract

**Package ID:** `0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047`  
**Version:** 0.0.5

### Shared Objects
- **PlatformConfig:** `0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c`
- **TickerRegistry:** `0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3`
- **ReferralRegistry:** `0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d`

### Admin Objects
- **UpgradeCap:** `0xde83c90c02cdba98c82be080eb31a9f74950467b962b2d0e5720a7ca596b483d`

### Modules
- `bonding_curve` - Token launch and trading with cubic bonding curve
- `lp_locker` - Liquidity pool creation and locking
- `platform_config` - Platform configuration and fees
- `referral_registry` - Referral tracking and rewards
- `ticker_registry` - Token ticker reservation

---

## 💰 SUILFG_MEMEFI Faucet

**Package ID:** `0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81`  
**Coin Type:** `0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI`

### Objects
- **Faucet (Shared):** `0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde`
- **AdminCap:** `0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e`
- **TreasuryCap:** `0x4ced36674fb9f0db9345a919ded3edb72da6534fb9e735623de65378245b6596`

### Details
- **Symbol:** SUI_MEMEFI
- **Decimals:** 9
- **Claim Amount:** 100 SUI_MEMEFI
- **Claim Interval:** 6 hours

---

## 🔧 Usage

### Claim from Faucet
```bash
sui client call \
  --package 0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81 \
  --module faucet \
  --function claim \
  --args 0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde 0x6 \
  --gas-budget 50000000
```

### Create Memecoin Bonding Curve
```bash
sui client call \
  --package 0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047 \
  --module bonding_curve \
  --function create_new_meme_token \
  --type-args "<YOUR_COIN_TYPE>" \
  --args <PLATFORM_CONFIG> <TICKER_REGISTRY> <TREASURY_CAP> <COIN_METADATA> 0x6 \
  --gas-budget 100000000
```

### Buy Tokens
```bash
sui client call \
  --package 0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047 \
  --module bonding_curve \
  --function buy \
  --type-args "<MEMECOIN_TYPE>" \
  --args <CONFIG> <CURVE> <REFERRAL> <SUI_COIN> <MAX_IN> <MIN_OUT> <DEADLINE> "[]" 0x6 \
  --gas-budget 100000000
```

---

## ✅ Verified Fixes

1. **Supply Scaling:** All token minting correctly scales by 10^9 (decimals)
2. **Dependency:** Compiled with correct SUILFG_MEMEFI package
3. **Arithmetic:** No overflow issues in bonding curve calculations

---

## 📚 Resources

- **Blueprint:** See `SuiLFG-Launch-Blueprint.md` for architecture details
- **Source Code:** `suilfg_launch_with_memefi_testnet/sources/`
- **Faucet Code:** `test_sui_faucet/sources/`

---

**Publisher:** `0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f`
