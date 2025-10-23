# 🚀 SuiLFG Launch Platform

The official memecoin launchpad for the Sui blockchain - combining Pump.fun's viral appeal with robust security and transparent fees.

---

## 📁 Project Structure

### Two Deployment Versions:

#### 1. **`suilfg_launch/`** - MAINNET (Cetus CLMM)
- Full-featured with Cetus concentrated liquidity integration
- Permanent LP lock with automated pool creation
- Production-ready for mainnet launch

#### 2. **`suilfg_launch_testnet/`** - TESTNET (Simple AMM)
- Uses custom constant-product AMM (x * y = k)
- No external dependencies (testnet-compatible)
- Identical contract names for seamless frontend integration

---

## 🔧 Quick Start

### Testnet Deployment:
```bash
cd suilfg_launch_testnet
sui move build
sui client publish --gas-budget 500000000
```

### Mainnet Deployment:
```bash
cd suilfg_launch
sui move build --dependencies-are-root
sui client publish --gas-budget 500000000 --dependencies-are-root
```

---

## 📖 Documentation

- **Complete Blueprint**: [`SuiLFG-Launch-Blueprint.md`](./SuiLFG-Launch-Blueprint.md)
- **Build Instructions**: [`BUILD_INSTRUCTIONS.md`](./BUILD_INSTRUCTIONS.md)

---

## 🎯 Why Two Versions?

**Cetus CLMM testnet compatibility issue**: Cetus dependencies are built for older Sui versions, causing `VMVerificationOrDeserializationError` on current testnet (v1.58.2).

**Solution**:
- ✅ **Testnet**: Simple AMM (works perfectly, no external deps)
- ✅ **Mainnet**: Cetus CLMM (stable, production-ready)

Both versions feature:
- Identical bonding curve mechanics
- Same buy/sell logic
- Compatible frontend APIs
- Only difference: graduation pool type

---

## ✨ Key Features

- 🎮 **Bonding Curve Trading** - Fair price discovery
- 💰 **Referral System** - On-chain rewards
- 🔒 **Permanent LP Lock** - Rug-proof graduation
- 👥 **Platform Fees** - Sustainable revenue model
- 🏆 **Creator Rewards** - Incentivize quality launches
- 🎯 **Admin Controls** - Emergency pause & configuration

---

## 🚀 Deployment Strategy

1. **Launch Testnet** → Use `suilfg_launch_testnet/` for community testing
2. **Test Mainnet** → Verify Cetus integration (~0.5 SUI cost)
3. **Production** → Deploy `suilfg_launch/` for real launch

---

## 📦 What's Inside

### Common Modules (both versions):
- `platform_config.move` - Central configuration & admin controls
- `referral_registry.move` - On-chain referral tracking
- `ticker_registry.move` - Token ticker management

### Mainnet-Specific:
- `bonding_curve.move` - Cetus CLMM graduation
- `lp_locker.move` - Permanent Cetus position lock

### Testnet-Specific:
- `bonding_curve.move` - Simple AMM graduation  
- `simple_amm.move` - Custom constant-product AMM

---

## 🤝 Contributing

This is production code. Please test thoroughly before deploying.

---

## 📄 License

Proprietary - SuiLFG Platform
