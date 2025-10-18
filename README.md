# 🚀 SuiLFG Launch - Memecoin Launchpad Contracts

**Version:** 6.0  
**Status:** Production Ready ✅  
**Network:** Sui Blockchain  

---

## ✨ Features

### Core Platform
- ✅ Modified quadratic bonding curve with 1k SUI starting market cap
- ✅ Automatic graduation at 13,333 SUI
- ✅ Platform fees: 2.5% | Creator fees: 0.5%
- ✅ First buyer fee: 1 SUI
- ✅ Ticker economy with 7-day max lock
- ✅ Team allocation: 2M tokens (0.2%)
- ✅ Emergency controls (pause, freeze, whitelist)

### 🎁 Referral System (NEW!)
- ✅ **Flat 0.1% rate** for all referrers (no tiers)
- ✅ **Auto-registration** on first trade (zero extra gas!)
- ✅ **Instant payouts** on every trade
- ✅ **Cross-device persistence** (stored on-chain)
- ✅ **Stats tracking** (total referrals, lifetime earnings)
- ✅ **Admin customizable** rate

### 🔒 Permanent LP Lock (NEW!)
- ✅ **Permanent liquidity lock** via Cetus LP Burn
- ✅ **LP fees still collectible** even when burned
- ✅ **Changeable fee recipient** (admin configurable)
- ✅ **Zero rug-pull risk** (mathematically impossible)
- ✅ **Community verifiable** on-chain

---

## 📦 Contracts

### Modules:
1. **platform_config.move** - Central configuration & admin controls
2. **bonding_curve.move** - Trading engine with referral integration
3. **ticker_registry.move** - Ticker lifecycle management
4. **referral_registry.move** - Referral tracking & payouts

### Shared Objects:
- `PlatformConfig` - Global settings
- `TickerRegistry` - Ticker states
- `ReferralRegistry` - Referral relationships
- `BondingCurve<T>` - Per-token trading curve
- `AdminCap` - Admin authority

---

## 📚 Documentation

**START HERE:** 📖 **[SuiLFG-Launch-Blueprint.md](SuiLFG-Launch-Blueprint.md)** - Complete implementation guide

This single document contains:
- ✅ Architecture overview
- ✅ All smart contract modules explained
- ✅ Referral system implementation
- ✅ Permanent LP lock details
- ✅ Fee structure (all fees in SUI!)
- ✅ Deployment guide
- ✅ Frontend integration examples
- ✅ Testing checklist
- ✅ Admin operations

**Additional Resources:**
- **[BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)** - Build troubleshooting

---

## 🚀 Quick Start

### 1. Build Contracts
```bash
cd suilfg_launch
sui move build
```

### 2. Deploy
```bash
sui client publish --gas-budget 500000000
```

### 3. Configure
```bash
# Set Cetus config (for LP burn)
sui client call \
  --package <PACKAGE_ID> \
  --module platform_config \
  --function set_cetus_global_config_id \
  --args <ADMIN_CAP> <CONFIG> 0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e

# Set treasury
sui client call \
  --package <PACKAGE_ID> \
  --module platform_config \
  --function set_treasury_address \
  --args <ADMIN_CAP> <CONFIG> <YOUR_TREASURY>
```

### 4. Frontend Integration
See [SuiLFG-Launch-Blueprint.md](SuiLFG-Launch-Blueprint.md) Section 8 for complete frontend examples!

```typescript
// Basic referral link handling
const referrer = new URLSearchParams(window.location.search).get('ref');
if (referrer) {
  localStorage.setItem('pendingReferrer', referrer);
}

// Pass in trade
const referrerArg = pendingReferrer ? [pendingReferrer] : [];
txb.moveCall({
  target: `${PACKAGE_ID}::bonding_curve::buy`,
  arguments: [
    // ... other args
    txb.pure(referrerArg, 'vector<address>'),
    // ... other args
  ]
});
```

---

## 🔑 Key Addresses (Testnet)

```
Cetus GlobalConfig: 0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
Cetus BurnManager: <Get from Cetus docs>
```

---

## 💰 Revenue Model

### Per Trade (Example: 100 SUI)
```
100 SUI trade:
├─ 0.1 SUI → Referrer (0.1%)
├─ 2.4 SUI → Platform (2.5% - 0.1%)
└─ 0.5 SUI → Creator (0.5%)

Total: 3% fees
```

### Per Graduation (13,333 SUI pool)
```
13,333 SUI:
├─ 1,333 SUI → Platform cut (10%)
│   ├─ 40 SUI → Creator reward
│   └─ 1,293 SUI → Treasury
├─ 12,000 SUI → LP (90%)
└─ 2M tokens → Team allocation (0.2%)
```

---

## 🧪 Testing

### Test on Devnet/Testnet First!
```bash
sui client switch --env testnet
sui client publish --gas-budget 500000000
```

### Test Referral Flow:
1. Create referral link: `?ref=YOUR_ADDRESS`
2. Trade with referrer parameter
3. Check registration event
4. Verify stats update
5. Trade again (should auto-pay referrer)

### Test LP Lock:
1. Graduate token (13,333 SUI)
2. Create Cetus pool with burn
3. Verify CetusLPBurnProof exists
4. Try to remove liquidity (should fail)
5. Collect LP fees (should work)

---

## 🛡️ Security

### Referral System:
- ✅ No self-referral allowed
- ✅ One referrer per user (immutable)
- ✅ On-chain verification
- ✅ No manipulation possible

### LP Lock:
- ✅ Permanent burn (cannot be undone)
- ✅ Cetus config validated
- ✅ Burn manager validated
- ✅ Team allocation always to treasury

### Platform:
- ✅ Admin-only sensitive functions
- ✅ Emergency pause/freeze controls
- ✅ Slippage & deadline protection
- ✅ Fully auditable on-chain

---

## 📊 Admin Functions

### Referral Management:
```bash
# Change referral rate (default: 10 = 0.1%)
sui client call --function set_referral_fee_bps --args <ADMIN> <CONFIG> 15
```

### Platform Configuration:
```bash
# Pause token creation
sui client call --function pause_creation --args <ADMIN> <CONFIG>

# Change platform fee
sui client call --function set_platform_fee --args <ADMIN> <CONFIG> 300  # 3%

# Change creator fee
sui client call --function set_creator_fee --args <ADMIN> <CONFIG> 100  # 1%
```

### Query Functions (Free):
```typescript
// Check if user has referrer
await suiClient.devInspectTransactionBlock({
  transactionBlock: {
    kind: 'moveCall',
    data: {
      function: 'has_referrer',
      arguments: [REGISTRY_ID, userAddress]
    }
  }
});

// Get referrer stats
await suiClient.devInspectTransactionBlock({
  transactionBlock: {
    kind: 'moveCall',
    data: {
      function: 'get_stats',
      arguments: [REGISTRY_ID, referrerAddress]
    }
  }
});
```

---

## 🎯 Roadmap

### Completed ✅
- [x] Bonding curve v5.0
- [x] Ticker economy
- [x] Referral system
- [x] Permanent LP lock
- [x] Cetus integration
- [x] Admin controls

### Future (Optional)
- [ ] Referral tiers (if needed)
- [ ] Referral code mapping (user-friendly codes)
- [ ] Leaderboard backend
- [ ] Analytics dashboard
- [ ] DAO governance
- [ ] Cross-chain bridging

---

## 🤝 Contributing

This is a production-ready implementation. For modifications:

1. Update contracts in `suilfg_launch/sources/`
2. Test thoroughly on devnet/testnet
3. Update documentation
4. Deploy carefully

---

## 📝 License

See LICENSE file.

---

## 🆘 Support

### Documentation:
- Start with [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- For referrals, see [REFERRAL_SYSTEM.md](REFERRAL_SYSTEM.md)
- For LP lock, see [PERMANENT_LP_LOCK.md](PERMANENT_LP_LOCK.md)

### Key Concepts:
- **Referral Links:** Just append `?ref=WALLET_ADDRESS` to any URL
- **Auto-Registration:** Happens on first trade (zero extra gas)
- **Instant Payouts:** Referrer paid every trade automatically
- **Permanent Lock:** LP burned via Cetus, cannot be removed

---

## 🎉 You're Ready!

All contracts are implemented and documented. Next steps:

1. ✅ Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. ✅ Build contracts: `sui move build`
3. ✅ Deploy to testnet
4. ✅ Test referral flow
5. ✅ Build frontend (see examples in docs)
6. ✅ Launch! 🚀

**Questions?** Everything is documented in the files above!
