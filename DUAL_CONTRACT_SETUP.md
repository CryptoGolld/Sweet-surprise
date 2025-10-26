# 🎯 Dual Contract Setup - Complete Guide

## Overview

Your platform now supports **TWO contracts simultaneously**:
- ✅ **NEW Contract** - All bot features (auto-graduation, prepare_liquidity_for_bot, special launches)
- ✅ **LEGACY Contract** - Existing community curves (keeps working perfectly!)

## Contract Addresses

### NEW Contract (v0.0.7)
```
Package:          0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
PlatformConfig:   0x8df834a79efd8fca907a6d832e93f6301b5d6cf7ff6d16c363829b3267feacff
ReferralRegistry: 0xef3fa25c0cd5620f20197047c9b8ca9320bbff1625a185b2c8013dbe8fc41814
TickerRegistry:   0xd98a0a56468df8d1e8a9b692881eacac17750336c8e4cd4b2f8d7c9468096d5b
AdminCap:         0xbc5c6f4780194b28fbff659f6fd9abd91ab49a71d11bbeb40f7d08f265744ef9
UpgradeCap:       0x921f0f238e66e54108cbd81d983350bd70de1b75a1d404e12793de42e7f48aaf
```

### LEGACY Contract (v0.0.6)
```
Package:          0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
PlatformConfig:   0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c
ReferralRegistry: 0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d
TickerRegistry:   0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3
```

## How It Works

### Frontend
The frontend automatically detects which contract a curve belongs to:

```typescript
import { getContractForCurve } from '@/lib/constants';

// When interacting with a curve
const contract = getContractForCurve(curve.type);

// Use the correct package
await signAndExecute({
  transaction: {
    target: `${contract.package}::bonding_curve::buy`,
    arguments: [contract.state, curveId, ...],
  }
});
```

### Indexer
The indexer watches BOTH packages simultaneously:

```javascript
// indexer/index.js
const PLATFORM_PACKAGE = '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5'; // NEW
const LEGACY_PLATFORM_PACKAGE = '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0'; // OLD

// Indexes events from BOTH
const eventTypes = [
  `${PLATFORM_PACKAGE}::bonding_curve::Created`,
  `${LEGACY_PLATFORM_PACKAGE}::bonding_curve::Created`,
  // ... etc
];
```

## Features Comparison

| Feature | NEW Contract | LEGACY Contract |
|---------|--------------|-----------------|
| Buy/Sell | ✅ | ✅ |
| Graduation | ✅ | ✅ |
| Referrals | ✅ | ✅ |
| `prepare_liquidity_for_bot()` | ✅ | ❌ |
| Auto-graduation (freezes trading) | ✅ | ❌ |
| `mark_special_launch()` | ✅ | ❌ |
| 50 SUI creator payout | ✅ | ❌ (40 SUI) |
| Upgradeable | ✅ (additive) | ❌ (immutable) |

## For Your Community

**Announcement template:**

> 🎉 **Platform Upgrade!**
> 
> We've deployed an improved version of our contracts with exciting new features:
> - 🤖 Bot-driven pool creation (automated!)
> - 🎯 Auto-graduation (trading freezes when targets hit)
> - 💰 50 SUI creator rewards (up from 40!)
> - 🔧 Special launch controls for platform tokens
> 
> **Existing curves:** Keep working perfectly! All your existing curves are safe and functional.
> 
> **New launches:** Use the improved contract with all new features!

## Testing Checklist

Before mainnet:
- [ ] Create a new curve on NEW contract
- [ ] Buy/sell on new curve
- [ ] Test graduation on new curve
- [ ] Verify old curves still show up in UI
- [ ] Test buy/sell on old curve
- [ ] Verify indexer picks up events from both
- [ ] Test bot functions with AdminCap

## Deployment Info

- **Deployed:** 2025-10-26
- **Network:** Testnet
- **Upgrade Policy:** Additive (can add new features)
- **Testnet Reset:** Check Sui Foundation announcements

## Next Steps

1. ✅ Constants updated
2. ✅ Indexer updated
3. ✅ Helper functions added
4. 🔄 Test both contracts
5. 🔄 Verify indexer catches all events
6. 🔄 Test bot workflow on new contract
