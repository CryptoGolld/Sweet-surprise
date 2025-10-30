# Pool Creation Bot - Complete Setup Guide

## 🚀 Quick Start

### 1. Install Bot

```bash
cd /var/www/Sweet-surprise/pool-creation-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Critical settings:**
```bash
# Your bot wallet private key (KEEP SECRET!)
BOT_PRIVATE_KEY=suiprivkey1234...

# Network (testnet or mainnet)
NETWORK=testnet

# Platform contracts (already filled for testnet)
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
ADMIN_CAP=0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11
```

### 3. Start Bot

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs pool-creation-bot
```

## ✅ Prerequisites Checklist

Before running the bot:

- [x] **LP Bot Address Set** - Already configured (`0x86b38b6c9406cb88ec4043d47c97df93152b75cbb6ade7c1fe0f63af5c42ff9f`)
- [ ] **Bot Wallet Funded** - Add SUI for gas to your bot wallet
- [ ] **AdminCap in Bot Wallet** - Transfer AdminCap to bot address
- [ ] **RPC Access** - Bot can access Sui RPC endpoint

## 📋 What the Bot Does

### On Each Graduation:

1. **Detects** - Listens for `Graduated` event on blockchain (auto-emitted when tokens hit 737M supply)
2. **Extracts** - Calls `prepare_liquidity_for_bot()` to get:
   - ~12,000 SUILFG tokens
   - 263M new tokens (207M for pool + 54M to burn + 2M team)
3. **Creates** - Creates Cetus pool with optimal parameters
4. **Adds** - Adds full-range liquidity to pool
5. **Burns** - Burns LP tokens using Cetus Burn Manager (permanent lock!)

### Process Flow:

```
Graduation Event
      ↓
prepare_liquidity_for_bot()
      ↓
Create Cetus Pool (Cetus SDK)
      ↓
Add Liquidity (Full Range)
      ↓
Burn LP Tokens (Cetus Burn Manager)
      ↓
✅ Pool Live & LP Permanently Locked!
```

## 🔐 Security Notes

### Bot Wallet
- Contains **AdminCap** (needed to call prepare_liquidity_for_bot)
- Needs **SUI for gas** (~0.5 SUI per pool creation)
- **Does NOT hold platform funds** (only receives LP tokens which are burned)

### LP Burning
- Uses **Cetus Burn Manager** for permanent locking
- LP tokens are **destroyed**, not just locked
- **Cannot be reversed** - truly permanent!

## 📊 Monitoring

### Check Bot Status
```bash
# Is bot running?
pm2 status

# View logs
pm2 logs pool-creation-bot --lines 100

# Real-time monitoring
pm2 monit
```

### Expected Log Output

**On startup:**
```
Bot initialized { address: '0x86b38...' }
Cetus SDK initialized
Cetus Burn Manager initialized
🤖 Pool Creation Bot Started
```

**On graduation:**
```
🎓 Graduation detected! { curveId: '0x...', coinType: '...' }
📦 Preparing liquidity { curveId: '0x...' }
🏊 Creating Cetus pool { coinType: '...' }
✅ Pool created! { poolAddress: '0x...', txDigest: '...' }
💧 Adding liquidity { poolAddress: '0x...' }
✅ Liquidity added! { positionId: '...' }
🔥 Burning LP tokens { poolAddress: '0x...' }
✅ LP tokens burned! { positionId: '...' }
✅ Pool creation complete! { status: 'success' }
```

## 🛠️ Troubleshooting

### Bot won't start
```bash
# Check Node.js version (need >= 18)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check environment variables
cat .env | grep -v "#"
```

### No graduations detected
```bash
# Test graduation detection manually
npm run test

# Check RPC connectivity
curl https://fullnode.testnet.sui.io:443/v1 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getLatestSuiSystemState"}'
```

### Transaction failures
- **Check gas balance**: Bot wallet needs SUI
- **Verify AdminCap**: Must be in bot wallet
- **Check contract addresses**: Verify in `.env`

### Pool creation fails
- **Coin ordering**: Cetus requires lexicographic order (handled automatically)
- **Tick spacing**: Default 60 should work
- **Price calculation**: Check sqrt price is valid

## 🌐 Mainnet Migration

When ready for mainnet:

1. **Update `.env`:**
```bash
NETWORK=mainnet
RPC_URL=https://fullnode.mainnet.sui.io:443

# Update all contract addresses to mainnet
PLATFORM_PACKAGE=0x...  # Mainnet package
ADMIN_CAP=0x...         # Mainnet AdminCap

# Mainnet Cetus addresses
CETUS_GLOBAL_CONFIG=0x...
CETUS_POOLS=0x...
```

2. **Security:**
- Use dedicated mainnet bot wallet
- Consider hardware wallet or KMS for private key
- Start with small test graduation

3. **Deploy:**
```bash
pm2 restart pool-creation-bot
pm2 logs pool-creation-bot
```

## 📞 Support

### Useful Commands

```bash
# Restart bot
pm2 restart pool-creation-bot

# Stop bot
pm2 stop pool-creation-bot

# Delete and restart fresh
pm2 delete pool-creation-bot
pm2 start ecosystem.config.js

# View detailed logs
tail -f logs/combined.log
```

### Resources
- Cetus Docs: https://cetus-1.gitbook.io/cetus-developer-docs
- Cetus LP Burn SDK: https://github.com/CetusProtocol/cetus-lp-burn-sdk
- Your logs: `/var/www/Sweet-surprise/pool-creation-bot/logs/`

---

**Status**: Bot ready to deploy! Just fund the wallet and start with PM2 🚀
