# 🚀 SuiLFG MemeFi

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sui Network](https://img.shields.io/badge/Sui-Testnet-blue)](https://sui.io)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

The premier memecoin launchpad on Sui blockchain. Create, trade, and graduate memecoins with fair launch bonding curves.

**🌐 [Live Demo](#) • 📖 [Documentation](./V2_COMPLETE.md) • 🐛 [Report Bug](https://github.com/CryptoGolld/Sweet-surprise/issues)**

---

## ✨ Features

### Core Features
- 🚀 **Instant Launch** - Create your memecoin in 30 seconds
- 💰 **Fair Bonding Curve** - Mathematical pricing, no manipulation
- 🎯 **Live Trading** - Buy and sell directly from the interface
- 👛 **Wallet Integration** - Connect with Sui Wallet, Suiet, etc.
- 📊 **User Portfolio** - View all your holdings in one place
- 🎓 **Auto-Graduation** - Curves graduate at 737M tokens sold
- 🏊 **LP Creation** - Manual Cetus pool creation ready
- 📱 **Mobile First** - Fully responsive design

### Platform Highlights
- ✅ **No Presales** - Fair launch for everyone
- ✅ **Supply Protection** - 737M tokens on curve (tested & verified)
- ✅ **Real-time Data** - Live blockchain queries every 5-10 seconds
- ✅ **Toast Notifications** - Beautiful feedback for all actions
- ✅ **Explorer Links** - Direct links to SuiScan for transactions
- ✅ **Error Handling** - Comprehensive error messages

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

3. **Create a Coin**
   - Click "Create Coin"
   - Fill in details (ticker, name, description, image)
   - Submit and confirm transaction
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
- LP tokens are prepared for pooling
- Manual pool creation on Cetus DEX

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
- **Wallet:** @mysten/dapp-kit v0.14.53
- **Blockchain:** @mysten/sui v1.24.0
- **State:** React Query (TanStack Query)
- **Notifications:** Sonner

### Smart Contracts
- **Language:** Move
- **Network:** Sui Testnet
- **Version:** v0.0.5 (with critical fixes)

### Infrastructure
- **Deployment:** Vercel
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
```

### Install Dependencies
```bash
npm install
```

### Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PLATFORM_PACKAGE=0x39d07cf0e87e2f2c3cb1807b30ae49ba1e786d587b98ede8e36c7f23833e1de3
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

## 🚀 Deployment

### Deploy to Vercel (Recommended)

**Option 1: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option 2: Vercel Dashboard**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select branch: `main` or `cursor/install-sui-cli-and-login-burner-wallet-5a0f`
4. Framework: Next.js (auto-detected)
5. Click "Deploy"

**Option 3: GitHub Integration**
- Connect your repo to Vercel
- Auto-deploy on every push to main

---

## 📝 Smart Contract Addresses

### Testnet Deployment

| Contract | Address | Description |
|----------|---------|-------------|
| **Platform** | `0x39d07cf0e87e2f2c3cb1807b30ae49ba1e786d587b98ede8e36c7f23833e1de3` | Main bonding curve platform |
| **Faucet** | `0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81` | SUILFG_MEMEFI test token |
| **Platform State** | `0xa7dc3d82efc298e1f3c7f3b12b43b8cc1f8e7e6adfdfca6e8f99df1df9e0c29e` | Shared platform state |
| **Faucet Object** | `0x3ca9a86de98ae1f18d94c2d98db28d9d1b0fb2d5c1e57e8e0f90f2deefbf1bc4` | SUILFG faucet |

### Cetus Integration

| Object | Address | Description |
|--------|---------|-------------|
| **Global Config** | `0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e` | Cetus global config |
| **Pools** | `0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2` | Cetus pools registry |

**View on Explorer:**
- [Platform Contract](https://suiscan.xyz/testnet/object/0x39d07cf0e87e2f2c3cb1807b30ae49ba1e786d587b98ede8e36c7f23833e1de3)
- [Faucet Contract](https://suiscan.xyz/testnet/object/0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81)

---

## 📂 Project Structure

```
SuiLFG-MemeFi/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Main landing page
│   └── globals.css              # Global styles
├── components/
│   ├── coins/                   # Coin-related components
│   │   ├── CoinCard.tsx        # Individual coin card
│   │   └── CoinList.tsx        # Grid of coins
│   ├── modals/                  # Modal dialogs
│   │   ├── CreateCoinModal.tsx # Coin creation form
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
│   └── constants.ts             # Platform constants
├── contracts/                   # Smart contracts (Move)
│   ├── suilfg_launch_with_memefi_testnet/
│   │   ├── sources/
│   │   │   ├── bonding_curve.move
│   │   │   ├── platform_config.move
│   │   │   └── ticker_registry.move
│   │   └── Move.toml
│   ├── test_sui_faucet/
│   ├── scripts/                 # TypeScript interaction scripts
│   └── deployments/             # Deployment configs
├── public/                      # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vercel.json
```

---

## 🔧 Configuration

### Platform Constants (`lib/constants.ts`)

```typescript
export const CONTRACTS = {
  PLATFORM_PACKAGE: '0x39d07cf...',
  FAUCET_PACKAGE: '0x97daa9c...',
  // ... more addresses
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
- ABIs in transaction builders

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Connect Sui wallet
- [ ] Create a test memecoin
- [ ] View coin in list
- [ ] Buy tokens
- [ ] Check portfolio
- [ ] Sell tokens
- [ ] Test on mobile

### Get Test Tokens
1. Get SUI from [Sui Testnet Faucet](https://faucet.testnet.sui.io)
2. Get SUILFG_MEMEFI from our faucet (contract interaction)

---

## 📚 Documentation

- **[V2_COMPLETE.md](./V2_COMPLETE.md)** - Complete v2.0 feature guide
- **[FINAL_SUMMARY.md](./FINAL_SUMMARY.md)** - Project overview
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[/contracts/README.md](./contracts/README.md)** - Smart contract documentation

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

---

## 🐛 Known Issues & Limitations

### Current Limitations
- **Sell Function** - May need additional testing
- **Cetus Auto-Pool** - Manual pool creation required (auto in progress)
- **Price Estimation** - Simplified (exact calculation can be added)

### Testnet Specifics
- Using SUILFG_MEMEFI test token (not real SUI)
- Testnet can be slow or unstable
- Objects may need re-initialization after resets

---

## 🛣️ Roadmap

### Phase 1 (Current) ✅
- [x] Smart contracts deployed
- [x] Bonding curve with supply protection
- [x] Full frontend with wallet integration
- [x] Live trading (buy/sell)
- [x] User portfolio

### Phase 2 (In Progress) 🚧
- [ ] Automatic Cetus pool creation
- [ ] Advanced price charts
- [ ] Search and filtering
- [ ] Leaderboard

### Phase 3 (Planned) 📅
- [ ] Mainnet deployment
- [ ] Social features (comments, likes)
- [ ] Referral system
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
- Use at your own risk
- Not financial advice
- Test tokens have no real value
- Smart contracts may have bugs

**Do your own research before using any DeFi platform.**

---

## 🌟 Star Us!

If you find this project useful, please give it a ⭐️ on GitHub!

---

<div align="center">

**Built with ❤️ for the Sui ecosystem**

🚀 **[Launch Your Memecoin Now](#)** 🚀

</div>
