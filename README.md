# 🚀 SuiLFG MemeFi

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sui Network](https://img.shields.io/badge/Sui-Testnet-blue)](https://sui.io)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

The premier memecoin launchpad on Sui blockchain. Create, trade, and graduate memecoins with fair launch bonding curves.

**🌐 [Live Demo](#) • 📖 [Documentation](./V2_COMPLETE.md) • 🐛 [Report Bug](https://github.com/CryptoGolld/Sweet-surprise/issues)**

---

## ✨ Features

### Core Features
- 🚀 **Instant Launch** - Create your memecoin in 30 seconds with decentralized compilation
- 💰 **Fair Bonding Curve** - Mathematical pricing, no manipulation
- 🎯 **Live Trading** - Buy and sell directly from the interface
- 👛 **Wallet Integration** - Connect with Sui Wallet, Suiet, etc.
- 📊 **User Portfolio** - View all your holdings in one place
- 🎓 **Auto-Graduation** - Curves graduate at 737M tokens sold
- 🏊 **LP Creation** - Automated Cetus pool creation
- 📱 **Mobile First** - Fully responsive design with mobile-friendly error handling

### Platform Highlights
- ✅ **Decentralized Compilation** - On-demand Move package compilation
- ✅ **User-Paid Gas** - Users own and pay for their coin packages
- ✅ **Supply Protection** - 737M tokens on curve (tested & verified)
- ✅ **Real-time Data** - Live blockchain queries every 5-10 seconds
- ✅ **Toast Notifications** - Beautiful feedback with copy-to-clipboard debugging
- ✅ **Explorer Links** - Direct links to SuiScan for transactions
- ✅ **Error Handling** - Comprehensive error messages with mobile debugging support

---

## 🎯 How It Works

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" 
   - Choose your preferred Sui wallet
   - Approve connection

2. **Browse Coins**
   - View all live memecoins
   - See real-time prices and progress
   - Check market cap and trading volume

3. **Create a Coin** (2-Step Process)
   - Click "Create Coin"
   - Fill in details (ticker, name, description, image)
   - **Step 1:** Sign to publish package (you own it!)
   - **Step 2:** Sign to create bonding curve
   - Your coin is live!

4. **Trade**
   - Click any coin card
   - Choose Buy or Sell
   - Enter amount
   - Confirm transaction

5. **Track Portfolio**
   - View all your tokens
   - See balances and values
   - Track your holdings

### Bonding Curve Mechanics

**Supply Distribution:**
- **737M tokens** (73.7%) - Available on bonding curve
- **200M tokens** (20%) - Reserved for LP
- **63M tokens** (6.3%) - Team allocation

**Graduation:**
- Curve graduates when **13,000 SUI** is collected
- Automatically triggers at 737M tokens sold
- LP tokens are prepared for Cetus pooling
- Automated pool creation ready

**Pricing:**
- Follows mathematical bonding curve formula
- Price increases as supply decreases
- Transparent and fair for all participants
- No team manipulation possible

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Wallet:** @mysten/dapp-kit v0.19.6
- **Blockchain:** @mysten/sui v1.43.1
- **State:** React Query (TanStack Query)
- **Notifications:** Sonner
- **Charts:** Recharts

### Backend Services
- **Compilation Service:** Standalone Node.js/Express API
- **Location:** Ubuntu server (13.60.235.109:3001)
- **Function:** On-demand Move package compilation
- **Architecture:** Vercel proxy → Ubuntu compiler

### Smart Contracts
- **Language:** Move
- **Network:** Sui Testnet
- **Version:** v0.0.5 (production-ready with all fixes)
- **Framework:** Sui Move v1.42.2

### Infrastructure
- **Frontend Deployment:** Vercel (HTTPS)
- **Compilation Service:** Ubuntu 22.04 LTS
- **Process Manager:** PM2
- **RPC:** Sui Testnet Fullnode
- **Explorer:** SuiScan

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Clone Repository
```bash
git clone https://github.com/CryptoGolld/Sweet-surprise.git
cd Sweet-surprise
git checkout cursor/install-sui-cli-and-login-burner-wallet-5a0f
```

### Install Dependencies
```bash
npm install
# Note: Uses legacy-peer-deps (configured in .npmrc)
```

### Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PLATFORM_PACKAGE=0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047

# Optional: Custom compilation service URL (defaults to built-in proxy)
# COMPILE_SERVICE_URL=http://13.60.235.109:3001
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production
```bash
npm run build
npm start
```

---

## 🔌 Compilation Service API

### Overview
The platform uses a standalone compilation service for on-demand Move package compilation.

### Architecture
```
User Browser (HTTPS)
    ↓
Vercel Frontend (HTTPS)
    ↓
Vercel API Proxy (/api/compile-proxy)
    ↓
Ubuntu Compilation Service (HTTP)
    ↓
Returns Compiled Bytecode
```

### API Endpoint

**Base URL:** `http://13.60.235.109:3001`

**Health Check:**
```bash
GET /health

Response:
{
  "status": "ok",
  "timestamp": 1234567890
}
```

**Compile Move Package:**
```bash
POST /compile
Content-Type: application/json

Request Body:
{
  "ticker": "COIN",
  "name": "Coin Name",
  "description": "Optional description"
}

Response (Success):
{
  "success": true,
  "modules": [[...bytecode array...]],
  "dependencies": ["0x1", "0x2"],
  "moduleName": "coin",
  "structName": "COIN",
  "timestamp": 1234567890
}

Response (Error):
{
  "success": false,
  "error": "Compilation failed",
  "details": "Error message here"
}
```

### Setup Your Own Compilation Service

See [UBUNTU_HOSTING_GUIDE.md](./contracts/UBUNTU_HOSTING_GUIDE.md) for detailed setup instructions.

**Quick Setup:**
```bash
# On Ubuntu server
cd ~/suilfg-memefi/compilation-service
npm install
pm2 start index.js --name "compilation-service"
pm2 save

# Open port 3001 in AWS Security Group/firewall
sudo ufw allow 3001
```

### Vercel Configuration

The frontend automatically proxies compilation requests through `/api/compile-proxy` to avoid HTTPS→HTTP mixed content issues.

**Optional Vercel Environment Variable:**
```
COMPILE_SERVICE_URL=http://YOUR_UBUNTU_IP:3001
```

If not set, defaults to `http://13.60.235.109:3001`.

---

## 🚀 Deployment

### Deploy Frontend to Vercel

**Option 1: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option 2: Vercel Dashboard**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select branch: `cursor/install-sui-cli-and-login-burner-wallet-5a0f`
4. Framework: Next.js (auto-detected)
5. Add environment variables (see below)
6. Click "Deploy"

**Environment Variables:**
```
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PLATFORM_PACKAGE=0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047
COMPILE_SERVICE_URL=http://13.60.235.109:3001
```

**Option 3: GitHub Integration**
- Connect your repo to Vercel
- Auto-deploy on every push to main

### Deploy Compilation Service

See [UBUNTU_HOSTING_GUIDE.md](./contracts/UBUNTU_HOSTING_GUIDE.md) for complete guide.

---

## 📝 Smart Contract Addresses

### Testnet Deployment (v0.0.5 - Production)

| Contract | Address | Description |
|----------|---------|-------------|
| **Platform** | `0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047` | Main bonding curve platform (v0.0.5) |
| **Faucet** | `0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81` | SUILFG_MEMEFI test token |
| **Platform Config** | `0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c` | Shared platform configuration |
| **Ticker Registry** | `0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3` | Coin ticker registry |
| **Referral Registry** | `0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d` | Referral system |
| **Faucet Object** | `0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde` | SUILFG faucet instance |

### Cetus Integration

| Object | Address | Description |
|--------|---------|-------------|
| **Global Config** | `0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e` | Cetus global config |
| **Pools** | `0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2` | Cetus pools registry |

### Coin Type
```
SUILFG_MEMEFI: 0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI
```

**View on Explorer:**
- [Platform Contract](https://suiscan.xyz/testnet/object/0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047)
- [Faucet Contract](https://suiscan.xyz/testnet/object/0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81)

---

## 📂 Project Structure

```
SuiLFG-MemeFi/
├── app/                          # Next.js app directory
│   ├── api/                     # API routes
│   │   └── compile-proxy/       # Compilation service proxy
│   │       └── route.ts
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Main landing page
│   └── globals.css              # Global styles
├── components/
│   ├── coins/                   # Coin-related components
│   │   ├── CoinCard.tsx        # Individual coin card
│   │   └── CoinList.tsx        # Grid of coins
│   ├── modals/                  # Modal dialogs
│   │   ├── CreateCoinModal.tsx # Coin creation form (2-step)
│   │   └── TradingModal.tsx    # Buy/sell interface
│   ├── portfolio/               # Portfolio components
│   │   └── UserPortfolio.tsx   # User holdings
│   ├── providers/               # Context providers
│   │   └── SuiProvider.tsx     # Sui wallet & query provider
│   ├── wallet/                  # Wallet components
│   │   └── ConnectButton.tsx   # Wallet connection
│   ├── Header.tsx               # Navigation header
│   └── Hero.tsx                 # Landing hero section
├── lib/
│   ├── hooks/                   # Custom React hooks
│   │   ├── useCoins.ts         # Fetch user coins
│   │   └── useBondingCurves.ts # Fetch curves
│   ├── sui/                     # Sui utilities
│   │   ├── client.ts           # Blockchain client
│   │   └── transactions.ts     # Transaction builders
│   ├── constants.ts             # Platform constants
│   └── coin-template.ts         # Move code generation (deprecated, moved to service)
├── contracts/                   # Smart contracts (Move)
│   ├── suilfg_launch_with_memefi_testnet/
│   │   ├── sources/
│   │   │   ├── bonding_curve.move
│   │   │   ├── platform_config.move
│   │   │   ├── ticker_registry.move
│   │   │   └── lp_locker.move
│   │   └── Move.toml
│   ├── test_sui_faucet/
│   ├── scripts/                 # TypeScript interaction scripts
│   └── deployments/             # Deployment configs
│       └── testnet_production.json
├── compilation-service/         # Standalone compilation API
│   ├── index.js                # Express server
│   ├── package.json
│   └── README.md
├── public/                      # Static assets
├── .npmrc                       # NPM configuration (legacy-peer-deps)
├── package.json
├── package-lock.json
├── tsconfig.json
├── tailwind.config.ts
└── vercel.json
```

---

## 🔧 Configuration

### Platform Constants (`lib/constants.ts`)

```typescript
export const CONTRACTS = {
  // Platform package (v0.0.5 - with supply cap fix) - PRODUCTION
  PLATFORM_PACKAGE: '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047',
  
  // Faucet package (SUILFG_MEMEFI token)
  FAUCET_PACKAGE: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81',
  
  // Shared objects
  PLATFORM_STATE: '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c',
  FAUCET_OBJECT: '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde',
  
  // Cetus integration (testnet)
  CETUS_GLOBAL_CONFIG: '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e',
  CETUS_POOLS: '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2',
};

export const BONDING_CURVE = {
  MAX_CURVE_SUPPLY: 737_000_000,  // 737M tokens
  TOTAL_SUPPLY: 1_000_000_000,    // 1B total
  TARGET_SUI: 13_000,              // 13K SUI
  DECIMALS: 9,
};
```

### Customization

**Update Branding:**
- Colors in `tailwind.config.ts`
- Logo in `components/Header.tsx`
- Metadata in `app/layout.tsx`

**Update Contracts:**
- Addresses in `lib/constants.ts`
- Update `NEXT_PUBLIC_PLATFORM_PACKAGE` in `.env.local`

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Connect Sui wallet
- [ ] Create a test memecoin (2-step process)
- [ ] Verify package ownership (you own the UpgradeCap)
- [ ] View coin in list
- [ ] Buy tokens
- [ ] Check portfolio
- [ ] Sell tokens
- [ ] Test on mobile
- [ ] Test error handling (copy error details)

### Get Test Tokens
1. Get SUI from [Sui Testnet Faucet](https://faucet.testnet.sui.io)
2. Get SUILFG_MEMEFI from our faucet: `0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde`

---

## 📚 Documentation

- **[V2_COMPLETE.md](./V2_COMPLETE.md)** - Complete v2.0 feature guide
- **[FINAL_SUMMARY.md](./FINAL_SUMMARY.md)** - Project overview
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[UBUNTU_HOSTING_GUIDE.md](./contracts/UBUNTU_HOSTING_GUIDE.md)** - Ubuntu server setup
- **[COMPILATION_SERVICE_UBUNTU.md](./contracts/COMPILATION_SERVICE_UBUNTU.md)** - Compilation service docs
- **[COIN_CREATION_GUIDE.md](./contracts/COIN_CREATION_GUIDE.md)** - Coin creation technical details
- **[contracts/README.md](./contracts/README.md)** - Smart contract documentation

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript strict mode
- Use Tailwind CSS for styling
- Write clear commit messages
- Test on testnet before PR
- Update documentation
- Use `legacy-peer-deps` for npm installs

---

## 🐛 Known Issues & Limitations

### Current Status
- **Coin Creation** - ✅ Working (2-step process with user-owned packages)
- **Trading** - ✅ Buy/Sell fully functional
- **Portfolio** - ✅ Real-time balance tracking
- **Cetus Auto-Pool** - 🚧 Integration ready, testing in progress
- **Price Estimation** - ✅ Based on bonding curve formula

### Testnet Specifics
- Using SUILFG_MEMEFI test token (not real SUI)
- Testnet can be slow or unstable
- Objects may need re-initialization after resets
- Compilation service requires Ubuntu server

---

## 🛣️ Roadmap

### Phase 1 (Completed) ✅
- [x] Smart contracts deployed (v0.0.5)
- [x] Bonding curve with supply protection
- [x] Decentralized coin creation (user-owned packages)
- [x] Full frontend with wallet integration
- [x] Live trading (buy/sell)
- [x] User portfolio
- [x] Mobile-friendly error handling

### Phase 2 (In Progress) 🚧
- [x] Compilation service on Ubuntu
- [x] HTTPS proxy for mixed content
- [ ] Automatic Cetus pool creation (integration ready)
- [ ] Advanced price charts
- [ ] Search and filtering
- [ ] Leaderboard

### Phase 3 (Planned) 📅
- [ ] Mainnet deployment
- [ ] Social features (comments, likes)
- [ ] Referral system activation
- [ ] Mobile app

### Phase 4 (Future) 🔮
- [ ] Advanced trading features
- [ ] Analytics dashboard
- [ ] DAO governance
- [ ] Multi-chain support

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Sui Foundation](https://sui.io)** - For the amazing Sui blockchain
- **[Mysten Labs](https://mystenlabs.com)** - For developer tools and SDKs
- **[Cetus Protocol](https://cetus.zone)** - For DEX integration
- **[Vercel](https://vercel.com)** - For hosting platform

---

## 📞 Support & Community

- **GitHub Issues:** [Report bugs or request features](https://github.com/CryptoGolld/Sweet-surprise/issues)
- **Sui Discord:** [Join Sui community](https://discord.gg/sui)
- **Cetus Discord:** [Get Cetus support](https://discord.gg/cetus)

---

## ⚠️ Disclaimer

**This is a testnet project for educational and testing purposes only.**

- Not audited for production use
- Test tokens have no real value
- Smart contracts may have bugs
- Compilation service requires secure server setup

**Do your own research before using any DeFi platform.**

---

## 🌟 Star Us!

If you find this project useful, please give it a ⭐️ on GitHub!

---

<div align="center">

**Built with ❤️ for the Sui ecosystem**

🚀 **[Launch Your Memecoin Now](#)** 🚀

**Compilation Service:** `http://13.60.235.109:3001`

</div>
