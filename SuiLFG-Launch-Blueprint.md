# 🚀 SuiLFG MemeFi - Platform Blueprint

**Version:** 2.0 (Current Implementation)  
**Network:** Sui Testnet  
**Status:** Production Ready  
**Last Updated:** October 2025

---

## 📋 Executive Summary

SuiLFG MemeFi is a decentralized memecoin launchpad on Sui blockchain featuring:
- **Fair Launch Bonding Curves** - Mathematical pricing with no manipulation
- **User-Owned Packages** - Creators publish and own their coin packages
- **Decentralized Compilation** - On-demand Move package compilation service
- **Automated Graduation** - Seamless transition to Cetus DEX liquidity pools
- **Full Transparency** - All code open source, all transactions on-chain

---

## 🏛️ System Architecture

### High-Level Components

```
┌──────────────────────────────────────────────────────────┐
│                    User Interface                        │
│              (Next.js on Vercel HTTPS)                   │
└────────────┬─────────────────────────────┬───────────────┘
             │                             │
             │ Wallet Integration          │ API Calls
             │ (@mysten/dapp-kit)          │
             │                             │
             ↓                             ↓
┌────────────────────────┐    ┌──────────────────────────┐
│   Sui Blockchain       │    │  Compilation Service     │
│     (Testnet)          │    │  (Ubuntu HTTP)           │
│                        │    │  13.60.235.109:3001      │
│ • Platform Contracts   │    │                          │
│ • User Coin Packages   │    │  Compiles Move packages  │
│ • Bonding Curves       │    │  Returns bytecode        │
└────────────────────────┘    └──────────────────────────┘
```

### Smart Contract Layer

**Platform Package:** `0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047`

**Modules:**
1. **`bonding_curve`** - Core trading logic, curve mechanics, graduation
2. **`platform_config`** - Global configuration and admin controls
3. **`ticker_registry`** - Ticker management and collision prevention
4. **`referral_registry`** - Referral system (future activation)
5. **`lp_locker`** - LP token locking mechanism

**Test Token Package:** `0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81`
- Provides `SUILFG_MEMEFI` test tokens for trading

---

## 💰 Tokenomics & Economics

### Supply Distribution

For each memecoin:
- **737M tokens** (73.7%) - Available on bonding curve
- **200M tokens** (20.0%) - Reserved for LP (locked)
- **63M tokens** (6.3%) - Team allocation

**Total Supply:** 1,000,000,000 tokens (1 billion)

### Bonding Curve Mechanics

**Formula:** Quadratic bonding curve with supply-based pricing

**Key Parameters:**
- **Maximum Curve Supply:** 737,000,000 tokens
- **Target SUI Collection:** 13,000 SUI
- **Graduation Trigger:** 737M tokens sold OR 13K SUI collected
- **Decimals:** 9 (standard Sui token decimals)

**Price Progression:**
- Starts low for early buyers
- Increases mathematically as supply is purchased
- No manipulation possible (all on-chain)
- Transparent pricing for all participants

### Fees

**Platform Fee:** 4.5% on all trades
**Creator Fee:** 0.5% on all trades
**First Buyer Fee:** 1 SUI (one-time per curve)

---

## 🔄 Coin Creation Flow

### 2-Step Decentralized Process

**Step 1: Package Publication**
1. User fills form (ticker, name, description, image, socials)
2. Frontend calls compilation service via `/api/compile-proxy`
3. Compilation service generates Move code with proper witness pattern
4. Service compiles to bytecode and returns to frontend
5. Frontend builds `tx.publish()` transaction
6. **User signs transaction** (pays gas, owns package!)
7. Package published, user receives `UpgradeCap`

**Step 2: Bonding Curve Creation**
1. Frontend extracts `packageId`, `TreasuryCap`, `CoinMetadata` from Step 1
2. Frontend builds `create_new_meme_token<T>()` transaction
3. **User signs transaction** (pays gas)
4. Bonding curve created and live for trading

**Key Benefits:**
- ✅ Users own their coin packages (have UpgradeCap)
- ✅ Users pay their own gas fees
- ✅ Platform doesn't hold any user assets
- ✅ Fully decentralized package creation
- ✅ On-demand compilation (no pre-deployed templates)

### Move Package Structure

Every coin gets a unique Move package:

```move
module <ticker_lowercase>::<ticker_lowercase> {
    use sui::coin;

    /// One-time witness (must match module name in uppercase)
    public struct <TICKER> has drop {}

    fun init(witness: <TICKER>, ctx: &mut sui::tx_context::TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            9,
            b"<TICKER>",
            b"<Name>",
            b"<Description>",
            option::none(),
            ctx
        );
        
        sui::transfer::public_freeze_object(metadata);
        sui::transfer::public_transfer(treasury, sui::tx_context::sender(ctx));
    }
}
```

**Important:** The witness struct name MUST exactly match the module name in uppercase (Sui requirement).

---

## 🎯 Trading Mechanics

### Buy Flow

```
1. User selects coin and amount
2. Frontend calls bonding_curve::buy<T>()
3. Parameters:
   - curve: &mut BondingCurve<T>
   - config: &PlatformConfig
   - payment: Coin<PAYMENT_TOKEN>
   - min_tokens_out: u64
   - max_sui_in: u64
   - recipient: address
   - clock: &Clock
4. Contract calculates tokens based on curve
5. Mints tokens (scales by 1e9 for decimals)
6. Transfers to recipient
7. Collects fees (platform + creator)
```

### Sell Flow

```
1. User selects tokens to sell
2. Frontend calls bonding_curve::sell<T>()
3. Contract calculates SUI to return
4. Burns tokens
5. Returns SUI minus fees
6. Updates curve state
```

### Supply Protection

**Critical Fix (v0.0.5):**
```move
// Clamp to MAX_CURVE_SUPPLY, not TOTAL_SUPPLY
let tokens_out = min_u64(calculated_tokens, MAX_CURVE_SUPPLY - s1);
```

This ensures exactly 737M tokens are available on the curve, with 200M reserved for LP and 63M for team.

---

## 🎓 Graduation & Liquidity

### Graduation Criteria

A bonding curve graduates when:
- **737M tokens** have been sold from the curve, OR
- **13,000 SUI** has been collected

### Graduation Process

**Automatic Checks:**
```move
public fun try_graduate<T>(
    curve: &mut BondingCurve<T>,
    config: &PlatformConfig,
    clock: &Clock,
    ctx: &mut TxContext
)
```

Callable by anyone after graduation criteria are met.

**Steps:**
1. Mark curve as graduated
2. Mint remaining tokens (200M for LP, 63M for team)
3. Prepare LP tokens for pooling
4. Enable liquidity pool creation

### Cetus Integration

**Pool Creation:**
- Automated via `seed_pool_and_create_cetus_with_lock<T>()`
- Uses Cetus CLMM (Concentrated Liquidity Market Maker)
- Creates pool with collected SUI and LP tokens
- Locks LP position for community protection

**Cetus Objects:**
- Global Config: `0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e`
- Pools Registry: `0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2`

---

## 🛠️ Technical Stack

### Frontend (Vercel)

**Framework:** Next.js 14.2.0 (App Router)
- Server-side rendering
- API routes for proxying
- Static optimization
- Edge functions

**UI Libraries:**
- Tailwind CSS (styling)
- Sonner (toast notifications)
- Recharts (charts, future)

**Blockchain:**
- `@mysten/dapp-kit@0.19.6` (wallet integration)
- `@mysten/sui@1.43.1` (blockchain SDK)
- `@tanstack/react-query` (data fetching)

**Special Configuration:**
- `.npmrc` with `legacy-peer-deps=true`
- `next.config.mjs` with webpack externals
- `tsconfig.json` targeting ES2020 for BigInt support

### Backend (Ubuntu)

**Compilation Service:**
- Express.js server
- Port: 3001
- Process Manager: PM2
- CORS enabled for Vercel
- In-memory caching (1 hour TTL)

**Server:**
- Ubuntu 22.04 LTS
- Node.js 20.x
- Sui CLI v1.42.2+
- Public IP: 13.60.235.109

### Smart Contracts (Sui Move)

**Framework:** Sui Move v1.42.2
**Dependencies:**
- Sui Framework (mainnet-v1.42.2)
- Cetus CLMM (testnet-v1.26.0)

**Version:** v0.0.5 (production)
**Status:** All critical bugs fixed and tested

---

## 🔐 Security Model

### User Security

1. **Non-Custodial** - Users always control their wallets
2. **Package Ownership** - Creators own their coin packages (UpgradeCap)
3. **Transparent Fees** - All fees visible and enforced by contract
4. **Supply Protection** - Hard cap at MAX_CURVE_SUPPLY
5. **Emergency Controls** - Admin can pause platform (not individual curves)

### Contract Security

1. **Supply Caps** - Enforced at mint time
2. **Integer Overflow** - All calculations use safe math
3. **Reentrancy** - Move's ownership model prevents reentrancy
4. **Access Control** - AdminCap required for platform config changes
5. **Upgradeability** - Contracts upgradeable via UpgradeCap

### Service Security

1. **Server Isolation** - Compilation service runs in isolated environment
2. **Input Validation** - All inputs validated before compilation
3. **Temporary Files** - Cleaned up after each compilation
4. **Resource Limits** - Compilation timeout and memory limits
5. **Firewall** - Only necessary ports open

---

## 📊 Current Deployment

### Production Addresses (Testnet v0.0.5)

**Platform:**
```
Package: 0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047
Config:  0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c
Ticker:  0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3
```

**Faucet:**
```
Package: 0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81
Faucet:  0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde
```

**Cetus:**
```
GlobalConfig: 0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
Pools:        0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2
```

**Services:**
```
Frontend:     https://sweet-surprise.vercel.app (or your domain)
Compiler API: http://13.60.235.109:3001
Health:       http://13.60.235.109:3001/health
Compile:      http://13.60.235.109:3001/compile
```

### Critical Fixes Applied

**v0.0.5 Fixes:**
1. ✅ Supply cap calculation (`MAX_CURVE_SUPPLY` not `TOTAL_SUPPLY`)
2. ✅ Token minting scaling (`* 1_000_000_000` for 9 decimals)
3. ✅ Correct SUILFG_MEMEFI dependency
4. ✅ Arithmetic overflow protection

---

## 🔮 Future Enhancements

### Short-term (Next 30 days)
- [ ] Finalize automatic Cetus pool creation
- [ ] Advanced price charts with historical data
- [ ] Search and filtering for coins
- [ ] Leaderboard (top coins, top traders)
- [ ] Social features (comments, reactions)

### Medium-term (3-6 months)
- [ ] Mainnet deployment
- [ ] Referral system activation
- [ ] Custom branding for creators
- [ ] Advanced trading analytics
- [ ] Mobile app (React Native)

### Long-term (6-12 months)
- [ ] DAO governance for platform
- [ ] Multi-chain support
- [ ] Advanced DeFi integrations
- [ ] NFT integration for coin badges
- [ ] Gamification features

---

## 📚 Related Documentation

- **[README.md](./README.md)** - Main project documentation
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[UBUNTU_HOSTING_GUIDE.md](./contracts/UBUNTU_HOSTING_GUIDE.md)** - Server setup guide
- **[COIN_CREATION_GUIDE.md](./contracts/COIN_CREATION_GUIDE.md)** - Technical coin creation details
- **[V2_COMPLETE.md](./V2_COMPLETE.md)** - V2 feature documentation
- **[contracts/README.md](./contracts/README.md)** - Smart contract documentation

---

## 👥 Team & Contributions

### Current Implementation

Built by the SuiLFG team with:
- Smart contract development in Move
- Full-stack TypeScript/React development
- DevOps and infrastructure setup
- Comprehensive testing and documentation

### Open Source

This project is **100% open source** under MIT license.

Contributions welcome! See [Contributing](./README.md#contributing) section.

---

## 📞 Contact & Support

- **GitHub:** [CryptoGolld/Sweet-surprise](https://github.com/CryptoGolld/Sweet-surprise)
- **Issues:** [Report bugs](https://github.com/CryptoGolld/Sweet-surprise/issues)
- **Compilation Service Status:** http://13.60.235.109:3001/health

---

<div align="center">

**🚀 Built with ❤️ for the Sui Ecosystem**

**Compilation Service:** `http://13.60.235.109:3001`

</div>
