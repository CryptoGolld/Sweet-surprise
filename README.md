# SuiLFG MemeFi Platform

**Fair launch memecoin platform on Sui blockchain with bonding curves and automatic liquidity provision.**

🚀 **Live on Mainnet & Testnet**  
💎 **Native SUI trading on Mainnet**  
🎯 **SUILFG_MEMEFI faucet token on Testnet**

---

## 🌟 Features

### For Users
- 🔥 **Fair Launch** - Quadratic bonding curve ensures fair pricing
- 💰 **Trade Instantly** - Buy and sell tokens directly on the curve
- 📊 **Real-time Charts** - TradingView Lightweight Charts integration
- 💼 **Portfolio Tracking** - Track holdings with live USD valuations
- 🎁 **Referral System** - Earn rewards by inviting friends
- 🏊 **Auto Liquidity** - Tokens automatically graduate to Cetus DEX at 13,333 SUI

### For Creators
- ⚡ **One-Click Launch** - Create tokens in 2 simple steps
- 🎨 **Custom Branding** - Upload images, add socials
- 💵 **Creator Fees** - Earn from every trade
- 🚀 **No Upfront Cost** - Just gas fees

---

## 🏗️ Architecture

### Smart Contracts
- **Network:** Sui Mainnet & Testnet
- **Language:** Move
- **Features:** Bonding curves, referral registry, ticker registry, LP locking

### Backend Services (Ubuntu)
- **Indexer** - Monitors blockchain events (ports 3002 & 3003)
- **API Server** - Serves data to frontend
- **Pool Creation Bot** - Auto-creates Cetus pools on graduation
- **Compilation Service** - Compiles Move contracts on-demand

### Frontend (Vercel)
- **Framework:** Next.js 14
- **UI:** TailwindCSS
- **Wallet:** Mysten dApp Kit
- **Charts:** TradingView Lightweight Charts

### Database
- **Provider:** Supabase (PostgreSQL)
- **Cost:** $0/month (FREE tier)
- **Size:** ~10 MB
- **Backups:** Automatic daily backups

---

## 📦 Deployed Contracts

### Mainnet (v1.0.0)
```
Package:          0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04
Platform State:   0xb2b9568567fb4f8983425581511e9931b0feb5e7ca485c9f0263e0593cfb7c00
Referral Registry: 0xac8b25db1c44cbb28d8cdbdbdac3d0eddc15c5a59aabb8bb8ba5bda9c9754f51
Ticker Registry:  0xc61c5a6a1085a07a6737441e508bfebef90e3e987eb219cea06f6b2b1029a8eb
Payment Token:    0x2::sui::SUI (Native SUI)
```

**Explorer:** https://suiscan.xyz/mainnet/object/0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04

### Testnet (v0.0.8)
```
Package:          0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
Platform State:   0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9
Referral Registry: 0x964b507850a0b51a736d28da9e8868ce82d99fe1faa580c9b4ac3a309e28c836
Ticker Registry:  0xd8ba248944efc41c995a70679aabde9e05b509a7be7c10050f0a52a9029c0fcb
Payment Token:    SUILFG_MEMEFI (Faucet Token)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.17.0
- Sui Wallet browser extension
- Some SUI for gas (mainnet) or faucet tokens (testnet)

### Frontend Setup

```bash
# Clone repository
git clone https://github.com/CryptoGolld/Sweet-surprise.git
cd Sweet-surprise

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Backend Setup (Ubuntu)

```bash
# Install dependencies
cd indexer
npm install

# Configure environment
cp .env.example .env
nano .env  # Add your database credentials

# Run with PM2
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 📊 Bonding Curve Math

### Spot Price Formula
```
p(s) = BASE_PRICE + (M_NUM * s²) / M_DEN
```

Where:
- `s` = token supply in whole tokens
- `BASE_PRICE` = 0.000001 SUI
- `M_NUM` = 1
- `M_DEN` = 10,593,721,631,205

### Total Value Locked (TVL)
```
TVL(s) = BASE_PRICE * s + (M_NUM * s³) / (3 * M_DEN)
```

### Market Cap
```
Market Cap = spot_price(s) × 1,000,000,000
```

### Key Milestones

| Supply | TVL (SUI) | Spot Price | Market Cap (SUI) |
|--------|-----------|------------|------------------|
| 0 tokens | 0 | 0.000001 | 1,000 |
| 100M | 131 | 0.000001943 | 1,943 |
| 368.5M (50%) | 1,943 | 0.000013818 | 13,818 |
| 737M (Graduation) | 13,333 | 0.000052272 | 52,272 |

---

## 🔧 Environment Variables

### Testnet
```bash
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_INDEXER_API=http://YOUR_SERVER:3002
NEXT_PUBLIC_PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
NEXT_PUBLIC_PAYMENT_TOKEN=0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI
```

### Mainnet
```bash
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_INDEXER_API=http://YOUR_SERVER:3003
NEXT_PUBLIC_PLATFORM_PACKAGE=0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04
NEXT_PUBLIC_PAYMENT_TOKEN=0x2::sui::SUI
```

See `.env.mainnet.template` for complete configuration.

---

## 🎯 How It Works

### 1. Create Token
- Upload image and set metadata
- Publish Move package to Sui
- Create bonding curve

### 2. Fair Launch
- Initial market cap: 1,000 SUI
- Quadratic bonding curve pricing
- 737M tokens available on curve
- 263M reserved for LP/team

### 3. Trade & Grow
- Users buy/sell on bonding curve
- Price increases with supply
- No rug pulls - liquidity locked in curve

### 4. Graduate to DEX
- Automatic graduation at 13,333 SUI raised
- Creates Cetus liquidity pool
- LP tokens permanently locked
- Continues trading on DEX

---

## 💡 Key Innovations

### Newton-Raphson Price Calculations
Implemented advanced mathematical methods for accurate price predictions:
- Forward calculations: Supply → Price → Market Cap
- Reverse calculations: TVL → Supply (using Newton-Raphson iteration)
- Milestone predictions for future valuations

### Gas Optimization
- On **Mainnet:** Uses `tx.gas` for payment (SUI = payment = gas)
- On **Testnet:** Separate payment token (SUILFG_MEMEFI) and gas (SUI)
- Automatic gas estimation by wallet SDK

### Supabase Integration
- Migrated from self-hosted PostgreSQL to Supabase
- Freed 12 GB by generating candles on-demand
- FREE tier supports both testnet and mainnet
- Automatic backups and monitoring

---

## 📁 Project Structure

```
/
├── app/                      # Next.js pages
│   ├── tokens/              # Token list and detail pages
│   ├── portfolio/           # User portfolio
│   ├── referrals/           # Referral program
│   └── api/proxy/           # API proxy routes
├── components/              # React components
│   ├── coins/              # Token cards and lists
│   ├── modals/             # Trading and creation modals
│   └── charts/             # TradingView charts
├── contracts/              # Move smart contracts
│   ├── suilfg_launch_mainnet/   # Mainnet contracts (uses SUI)
│   └── suilfg_launch_with_memefi_testnet/  # Testnet contracts (uses SUILFG_MEMEFI)
├── indexer/                # Backend services
│   ├── index.js            # Event indexer
│   ├── api-server.js       # REST API
│   └── schema.sql          # Database schema
├── lib/                    # Utilities and hooks
│   ├── sui/               # Sui blockchain utilities
│   ├── hooks/             # React hooks
│   └── utils/             # Helper functions
└── pool-creation-bot/      # Automated pool creation
```

---

## 🔐 Security

- ✅ **Admin functions** protected by AdminCap
- ✅ **Referral system** - first trade only, no self-referral
- ✅ **LP tokens** permanently locked
- ✅ **Gas handling** properly managed on both networks
- ✅ **No private keys** in code or config

---

## 📖 Documentation

### Key Documents
- **`PRICE_CALCULATION_FIX.md`** - Bonding curve math and Newton-Raphson
- **`SUPABASE_SETUP.md`** - Database configuration and IPv4 pooler setup
- **`MAINNET_DEPLOYMENT_GUIDE.md`** - Complete mainnet deployment guide
- **`MAINNET_READY.md`** - Deployment summary and checklist

### Technical Guides
- **`POOL_BOT_COMPLETE_GUIDE.md`** - Automated pool creation
- **`PM2_SERVICES.md`** - Service management
- **`CHART_IMPROVEMENTS.md`** - TradingView integration

---

## 🌐 Network Support

### Dual Network Architecture

**Same Codebase, Different Configs:**
- Testnet Vercel → Port 3002 → Testnet Contracts → Supabase #1
- Mainnet Vercel → Port 3003 → Mainnet Contracts → Supabase #2

**Environment-Based Switching:**
- Uses `NEXT_PUBLIC_NETWORK` env var
- Automatic network detection
- Network-aware UI text (SUI vs SUILFG)
- Faucet only on testnet

---

## 🛠️ Development

### Run Local Development

```bash
# Frontend
npm run dev

# Indexer (testnet)
cd indexer
node index.js

# Indexer (mainnet)
NODE_ENV=mainnet node index.js
```

### Build Contracts

```bash
# Mainnet
cd contracts/suilfg_launch_mainnet
sui move build
sui client publish --gas-budget 500000000

# Testnet
cd contracts/suilfg_launch_with_memefi_testnet
sui move build
sui client publish --gas-budget 500000000
```

### Run Tests

```bash
# Price calculations test
node test-price-calculations.js

# Contract tests
cd contracts/suilfg_launch_mainnet
sui move test
```

---

## 📈 Performance

### Database Optimization
- **Before:** 12 GB (pre-generated candles)
- **After:** ~10 MB (on-demand generation)
- **Improvement:** 1200x reduction!

### API Response Times
- Token list: ~50ms
- Chart data: ~100ms (generates 1440 candles on-the-fly)
- Trade history: ~30ms

---

## 💰 Cost Breakdown

### Monthly Costs
- **Ubuntu Server (EC2):** ~$50/month
- **Supabase Testnet:** $0 (FREE tier, 10 MB / 500 MB)
- **Supabase Mainnet:** $0 (FREE tier, 10 MB / 500 MB)
- **Vercel (2 projects):** $0 (FREE tier)
- **Total:** ~$50/month

### Gas Costs (Mainnet)
- Deploy contracts: ~0.16 SUI (one-time)
- Create token: ~0.01 SUI per token
- Buy/Sell: ~0.002 SUI per trade
- Pool creation: ~0.5 SUI (automated)

---

## 🎁 Referral System

### How It Works
1. Share your link: `yoursite.com/tokens?ref=YOUR_ADDRESS`
2. Friend trades using your link → You're registered as referrer
3. Earn rewards from all their future trades automatically
4. First referral only - can't be changed later

### Features
- ✅ On-chain registration (permanent)
- ✅ Automatic reward distribution
- ✅ Real-time stats tracking
- ✅ Protected against self-referral

---

## 🔄 Recent Updates (Nov 1, 2025)

### Price Calculation Fix ✅
- Fixed critical `/1e9` bug (prices were 1 billion times too small!)
- Implemented Newton-Raphson method for accurate calculations
- Market caps now display correctly (1,000 - 52,000 SUI range)

### Supabase Migration ✅
- Migrated from Ubuntu PostgreSQL to Supabase
- Deleted candle-generator bot (freed 12 GB!)
- API generates candles on-demand from trades
- Using IPv4 Transaction Pooler (port 6543)

### Mainnet Deployment ✅
- Deployed mainnet contracts (uses native SUI)
- Running dual indexers (testnet + mainnet)
- Separate Supabase databases for each network
- Zero code changes between networks

### Network-Aware Frontend ✅
- Environment variable based configuration
- Shows "SUI" on mainnet, "SUILFG" on testnet
- Faucet hidden on mainnet
- Proper gas handling on both networks

---

## 🐛 Troubleshooting

### Port 3003 Not Accessible
Open port 3003 in AWS Security Group:
- EC2 → Security Groups → Edit Inbound Rules
- Add: Custom TCP, Port 3003, Source 0.0.0.0/0

### Mainnet Buying Issues
Ensure wallet is on **Mainnet** network, not testnet.

### Charts Not Showing
Charts require trade history. New tokens will show placeholder.

### Portfolio Prices Missing
Check browser console - might be indexer API connection issue.

---

## 📞 Support

- **Documentation:** See markdown files in root directory
- **Issues:** GitHub Issues
- **Supabase Dashboard:** https://supabase.com/dashboard

---

## 📜 License

Proprietary - All Rights Reserved

---

## 🙏 Credits

**Developed by:** Israel & Team  
**Blockchain:** Sui Network  
**DEX Integration:** Cetus Protocol  
**Database:** Supabase  
**Hosting:** Vercel + AWS

---

**Last Updated:** November 1, 2025  
**Version:** 1.0.0 (Mainnet) / 0.0.8 (Testnet)  
**Status:** ✅ Production Ready

🚀 **Launch your memecoin today!**
