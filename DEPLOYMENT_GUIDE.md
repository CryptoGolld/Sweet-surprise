# 🚀 SuiLFG MemeFi - Deployment Guide

Complete guide for deploying the SuiLFG MemeFi platform to production.

---

## 📋 Overview

The platform consists of two main components:
1. **Frontend** - Next.js app deployed on Vercel
2. **Compilation Service** - Node.js API on Ubuntu server

---

## 🌐 Frontend Deployment (Vercel)

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Repository pushed to GitHub

### Quick Deploy

**Method 1: Vercel Dashboard**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `CryptoGolld/Sweet-surprise`
3. Select branch: `cursor/install-sui-cli-and-login-burner-wallet-5a0f`
4. Framework: Next.js (auto-detected)
5. Add environment variables (see below)
6. Click "Deploy"

**Method 2: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Required
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PLATFORM_PACKAGE=0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047

# Optional (defaults to 13.60.235.109:3001)
COMPILE_SERVICE_URL=http://YOUR_UBUNTU_IP:3001
```

### Vercel Build Settings

- **Framework:** Next.js
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (uses .npmrc)
- **Node Version:** 18.x or 20.x

---

## 🖥️ Compilation Service Deployment (Ubuntu)

### Server Requirements
- **OS:** Ubuntu 22.04 LTS
- **RAM:** 2 GB minimum
- **CPU:** 1 core minimum
- **Disk:** 10 GB free space
- **Provider:** AWS, Hetzner, DigitalOcean, Linode, etc.

### Prerequisites

**1. Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should be 18+
```

**2. Install Sui CLI:**
```bash
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz
tar -xzf sui.tgz
sudo mv sui-testnet-*/sui /usr/local/bin/
sui --version
```

**3. Install PM2:**
```bash
sudo npm install -g pm2
```

## Deployment Steps

### Step 1: Build Contracts
```bash
cd suilfg_launch
sui move build
```

**Expected output:**
```
BUILDING suilfg_launch
BUILDING Sui
Build Successful
```

**If errors occur:**
- Check all imports
- Verify Move.toml dependencies
- Ensure edition = 2024

### Step 2: Test Locally (Optional but Recommended)
```bash
# Run unit tests
sui move test

# Expected: All tests pass
```

### Step 3: Deploy to Testnet
```bash
# Deploy package
sui client publish --gas-budget 500000000

# Save the output!
```

**Important outputs to save:**
- Package ID: `0xABC...`
- PlatformConfig object ID: `0xDEF...`
- AdminCap object ID: `0x123...`
- TickerRegistry object ID: `0x456...`

### Step 4: Verify Deployment
```bash
# Check package exists
sui client object <PACKAGE_ID>

# Check PlatformConfig
sui client object <PLATFORM_CONFIG_ID>
```

### Step 5: Configure Parameters (Optional)

If you need to change any defaults:

```bash
# Set treasury address
sui client call --package <PKG> \
  --module platform_config \
  --function set_treasury_address \
  --args <ADMIN_CAP> <PLATFORM_CONFIG> <YOUR_TREASURY_ADDRESS> \
  --gas-budget 10000000

# Set LP recipient address  
sui client call --package <PKG> \
  --module platform_config \
  --function set_lp_recipient_address \
  --args <ADMIN_CAP> <PLATFORM_CONFIG> <YOUR_LP_WALLET> \
  --gas-budget 10000000

# Set team wallet for allocations
# (This is passed as parameter to seed_pool_prepare, not in config)
```

## Post-Deployment Setup

### 1. Save Deployment Info

Create `deployments/testnet.json`:
```json
{
  "network": "testnet",
  "packageId": "0xABC...",
  "platformConfig": "0xDEF...",
  "adminCap": "0x123...",
  "tickerRegistry": "0x456...",
  "deployedAt": "2024-10-12",
  "deployer": "0xYOUR_ADDRESS"
}
```

### 2. Update Frontend Config
```typescript
// config/contracts.ts
export const CONTRACTS = {
  PACKAGE_ID: '0xABC...',
  PLATFORM_CONFIG: '0xDEF...',
  TICKER_REGISTRY: '0x456...',
};
```

### 3. Configure Supabase
```sql
-- Add deployed contract addresses
INSERT INTO platform_config (
  package_id,
  platform_config_id,
  ticker_registry_id,
  network
) VALUES (
  '0xABC...',
  '0xDEF...',
  '0x456...',
  'testnet'
);
```

## Testing on Testnet

### Test 1: Create Token
```bash
# You'll need to:
# 1. Publish a test coin module first
# 2. Get TreasuryCap
# 3. Call create_new_meme_token with it

# This tests the full flow
```

### Test 2: Buy Tokens
```bash
sui client call --package <PKG> \
  --module bonding_curve \
  --function buy \
  --type-args <COIN_TYPE> \
  --args <CONFIG> <CURVE> <PAYMENT_COIN> 1000000000 0 999999999999999 <CLOCK> \
  --gas-budget 50000000
```

### Test 3: Graduation Flow
```bash
# Step 1: try_graduate
sui client call --package <PKG> \
  --module bonding_curve \
  --function try_graduate \
  --type-args <COIN_TYPE> \
  --args <CONFIG> <CURVE> \
  --gas-budget 50000000

# Step 2: distribute_payouts
sui client call --package <PKG> \
  --module bonding_curve \
  --function distribute_payouts \
  --type-args <COIN_TYPE> \
  --args <CONFIG> <CURVE> \
  --gas-budget 50000000

# Step 3: seed_pool_prepare
sui client call --package <PKG> \
  --module bonding_curve \
  --function seed_pool_prepare \
  --type-args <COIN_TYPE> \
  --args <CONFIG> <CURVE> 0 <TEAM_WALLET> \
  --gas-budget 50000000
```

## Common Issues & Solutions

### Issue 1: "Out of gas"
**Solution**: Increase gas-budget
```bash
--gas-budget 1000000000  # 1 SUI
```

### Issue 2: "Type mismatch"
**Solution**: Ensure correct type arguments
```bash
--type-args 0xABC::module::TYPE
```

### Issue 3: "Object not found"
**Solution**: Verify object IDs are correct
```bash
sui client object <OBJECT_ID>
```

### Issue 4: "Insufficient funds"
**Solution**: Get more testnet SUI from faucet

## Mainnet Deployment (Later)

**Differences from testnet:**
1. Change Sui dependency to mainnet framework
2. Use mainnet faucet (real SUI needed!)
3. Triple-check all parameters
4. Consider audit before mainnet
5. Have emergency pause plan

**Move.toml for mainnet:**
```toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }
```

## Security Checklist

Before deploying:
- [ ] All admin functions require AdminCap
- [ ] No hardcoded addresses (except framework)
- [ ] All parameters configurable
- [ ] Emergency pause works
- [ ] Graduation flow tested
- [ ] Fee calculations verified
- [ ] Token supply accounting correct
- [ ] Binary search converges
- [ ] No infinite loops possible

## Monitoring After Deployment

### Set Up Alerts
- Platform creation paused
- Large withdrawals
- Graduation events
- Error rates

### Track Metrics
- Tokens created
- Total volume
- Graduations
- Gas costs
- Error rates

---

## Quick Deploy Commands

```bash
# Full deployment in one go
cd suilfg_launch
sui move build
sui client publish --gas-budget 500000000

# Save the Package ID, Config IDs, etc.
# Update your frontend config
# Start indexer and graduation bot
# Test token creation
# Done!
```

---

**Ready to deploy!** 🚀
