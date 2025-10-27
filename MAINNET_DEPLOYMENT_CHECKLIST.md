# 🚀 Mainnet Deployment Checklist

## ✅ What's Ready for Mainnet

All code is on GitHub `main` branch: **github.com/CryptoGolld/Sweet-surprise**

### Contract (v0.0.8)
- ✅ LP bot security (only configured address can receive LP tokens)
- ✅ Special launch flag (simplified bot logic)
- ✅ Prepare liquidity for bot (single function for all tokens)
- ✅ All improvements tested on testnet

### Frontend
- ✅ Mobile-first responsive design
- ✅ Big meme images
- ✅ Social links display (Twitter, Telegram, Website)
- ✅ Pinata IPFS image uploads
- ✅ Quick amount buttons (25%, 50%, 75%, 100%)
- ✅ Clean, optimized token pages
- ✅ Proper gas estimation (wallet + 20% buffer)

### Backend
- ✅ Indexer with fill-forward charts
- ✅ API server with metadata support
- ✅ Social links database columns
- ✅ Graceful fallbacks for missing columns
- ✅ Real-time trade tracking

---

## 🔄 Testnet → Mainnet Changes Needed

### 1. Environment Variables

**Frontend (`.env.local`):**
```bash
# Change network
NEXT_PUBLIC_NETWORK=mainnet

# Update Pinata (same keys work)
PINATA_JWT=your_jwt_here

# Update contract addresses (after mainnet deployment)
NEXT_PUBLIC_PLATFORM_PACKAGE=0x...mainnet_package...
NEXT_PUBLIC_PLATFORM_STATE=0x...mainnet_state...
NEXT_PUBLIC_REFERRAL_REGISTRY=0x...mainnet_registry...
NEXT_PUBLIC_TICKER_REGISTRY=0x...mainnet_ticker...
```

**Indexer (`.env`):**
```bash
# Mainnet RPC
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443

# Mainnet package
PLATFORM_PACKAGE=0x...mainnet_package...

# Database (new mainnet DB)
DATABASE_URL=postgresql://...mainnet_db...
```

### 2. Payment Token

**File:** `lib/constants.ts`

Change payment token from testnet token to SUI:

```typescript
// TESTNET (current):
PAYMENT_TOKEN: `${CONTRACTS.FAUCET_PACKAGE}::suilfg_memefi::SUILFG_MEMEFI`,

// MAINNET (change to):
PAYMENT_TOKEN: '0x2::sui::SUI',
```

### 3. Contract Deployment

**Testnet deployment saved in:** `deployments/testnet-v0.0.8.json`

**For mainnet:**
```bash
cd contracts/suilfg_launch_with_memefi_testnet

# Publish to mainnet
sui client publish --gas-budget 500000000

# Save addresses
# Create: deployments/mainnet-v0.0.8.json
```

**Then update:**
- `lib/constants.ts` - All contract addresses
- Indexer `.env` - Package address
- Frontend `.env.local` - All addresses

### 4. LP Bot Configuration

After mainnet deployment, set bot address:

```bash
sui client call \
  --package 0x...mainnet_package... \
  --module platform_config \
  --function set_lp_bot_address \
  --args \
    0x...mainnet_admin_cap... \
    0x...mainnet_platform_config... \
    0x...mainnet_bot_wallet... \
  --gas-budget 10000000
```

### 5. Database Setup

**Run migrations on mainnet database:**
```bash
# Create database
createdb mainnet_memecoins

# Run indexer setup (creates tables)
cd indexer
psql $MAINNET_DATABASE_URL < schema.sql

# Add social links columns
psql $MAINNET_DATABASE_URL < add-social-links.sql
```

---

## 📦 Key Files for Mainnet

### Contract Files:
- `contracts/suilfg_launch_with_memefi_testnet/sources/` (rename for clarity)
  - `bonding_curve.move`
  - `platform_config.move`
  - `referral_registry.move`
  - `ticker_registry.move`
  - `lp_locker.move`

### Frontend Config:
- `lib/constants.ts` - Update all addresses
- `lib/sui/transactions.ts` - Already generic (no changes needed)
- `.env.local` - Update environment variables

### Backend:
- `indexer/index.js` - Update PLATFORM_PACKAGE env
- `indexer/api-server.js` - No changes needed (uses env vars)
- `indexer/add-social-links.sql` - Run on mainnet DB

---

## 🔒 Security Checklist

- [ ] Contract audited (if needed)
- [ ] Admin private keys secured
- [ ] LP bot wallet secured (different from testnet)
- [ ] Database backups configured
- [ ] Rate limiting on API
- [ ] Monitoring/alerts setup
- [ ] Bug bounty program (optional)

---

## 🚦 Deployment Steps (Sequential)

### Phase 1: Contract
1. Deploy contract to mainnet
2. Save all object IDs (PlatformConfig, AdminCap, etc.)
3. Set LP bot address
4. Test with small token creation

### Phase 2: Backend
1. Setup mainnet database
2. Run migrations (tables + social columns)
3. Deploy indexer with mainnet package address
4. Deploy API server
5. Verify indexing works

### Phase 3: Frontend
1. Update all constants with mainnet addresses
2. Change PAYMENT_TOKEN to SUI
3. Update environment variables
4. Deploy to Vercel (production)
5. Test complete flow

### Phase 4: Testing
1. Create test token with real SUI
2. Buy/sell test
3. Verify charts display
4. Test image upload
5. Test social links
6. Verify metadata saves

---

## 💰 Cost Estimates (Mainnet)

### Contract Deployment:
- Package publish: ~0.1-0.15 SUI
- Initial setup: ~0.05 SUI
- **Total: ~0.2 SUI**

### User Operations:
- Create coin: ~0.1 SUI (gas)
- Create curve: ~0.05-0.1 SUI (gas)
- Buy/Sell: ~0.01-0.02 SUI (gas)
- First buy bonus: 0.001 SUI (from platform)

### Platform Fees:
- Platform fee: 1% of trade volume
- Creator fee: 0.5% of trade volume
- Referral fee: 0.1% of trade volume

---

## 📊 Monitoring

### Metrics to Track:
- [ ] Total tokens created
- [ ] Total trade volume
- [ ] Active users
- [ ] Graduated tokens
- [ ] Platform fees collected
- [ ] API response times
- [ ] Indexer lag

### Tools:
- PM2 for process monitoring
- PostgreSQL logs
- Sui Explorer for on-chain data
- Vercel analytics for frontend
- Custom dashboard (optional)

---

## 🆘 Rollback Plan

If something goes wrong:

1. **Frontend issues**: Revert Vercel deployment
2. **Indexer issues**: Restart with previous code
3. **Contract issues**: Can't roll back (upgrade or new deployment)

**Backup strategy:**
- Keep testnet running as staging
- Test all changes on testnet first
- Have mainnet "pause" function for emergencies

---

## ✅ Go-Live Checklist

- [ ] Contract deployed & configured
- [ ] Database running & migrated
- [ ] Indexer syncing correctly
- [ ] API responding correctly
- [ ] Frontend deployed
- [ ] Test token created successfully
- [ ] Test buy/sell working
- [ ] Charts displaying
- [ ] Images uploading to IPFS
- [ ] Social links saving & displaying
- [ ] Mobile experience tested
- [ ] Gas estimation working
- [ ] Admin controls verified
- [ ] Monitoring active
- [ ] Documentation complete
- [ ] Team trained

---

## 📞 Support

**GitHub Repository:** github.com/CryptoGolld/Sweet-surprise
**Branch:** main
**Latest Commit:** All improvements pushed ✅

**Key Folders:**
- `/contracts` - Smart contracts
- `/app` - Frontend pages
- `/components` - React components
- `/lib` - Utilities & configs
- `/indexer` - Backend services

Everything is ready for mainnet deployment! 🚀
