# Vercel Multi-Environment Setup (Mainnet + Testnet)

## Overview

Deploy **same codebase** to **two different URLs** with different configurations:
- **Mainnet**: `app.yourlaunchpad.io` → Mainnet contracts, mainnet RPC
- **Testnet**: `testnet.yourlaunchpad.io` → Testnet contracts, testnet RPC

## Step-by-Step Guide

### 1. Create Two Vercel Projects (Same Repo)

#### Project 1: Mainnet
1. Go to https://vercel.com/new
2. Import your repo: `Sweet-surprise`
3. **Project Name**: `suilfg-mainnet`
4. **Root Directory**: Leave as is
5. **Framework Preset**: Next.js
6. Click **"Deploy"** (we'll configure env vars after)

#### Project 2: Testnet
1. Go to https://vercel.com/new again
2. Import **same repo**: `Sweet-surprise`
3. **Project Name**: `suilfg-testnet`
4. **Root Directory**: Leave as is
5. **Framework Preset**: Next.js
6. Click **"Deploy"**

Now you have two projects from one repo! 🎉

### 2. Configure Custom Domains

#### For Mainnet Project:
1. Go to project settings → **Domains**
2. Add domain: `app.yourlaunchpad.io`
3. Add DNS record (in your DNS provider):
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

#### For Testnet Project:
1. Go to project settings → **Domains**
2. Add domain: `testnet.yourlaunchpad.io`
3. Add DNS record:
   ```
   Type: CNAME
   Name: testnet
   Value: cname.vercel-dns.com
   ```

### 3. Environment Variables

#### Mainnet Project Environment Variables

Go to **Project Settings → Environment Variables**:

```env
# Network Configuration
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_RPC_URL=https://fullnode.mainnet.sui.io:443

# Contract Addresses (deploy your contracts to mainnet first!)
NEXT_PUBLIC_PLATFORM_PACKAGE=0x[YOUR_MAINNET_PACKAGE_ID]
NEXT_PUBLIC_BONDING_CURVE_REGISTRY=0x[YOUR_MAINNET_REGISTRY_ID]
NEXT_PUBLIC_LP_LOCKER=0x[YOUR_MAINNET_LP_LOCKER_ID]
NEXT_PUBLIC_FAUCET_PACKAGE=0x2::sui::SUI

# Indexer (your mainnet Ubuntu server)
NEXT_PUBLIC_INDEXER_API=https://api-mainnet.yourlaunchpad.io

# Compilation Service (same for both)
NEXT_PUBLIC_COMPILER_URL=https://compile.yourlaunchpad.io

# Cetus (Mainnet pool IDs)
NEXT_PUBLIC_CETUS_GLOBAL_CONFIG=0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f
NEXT_PUBLIC_CETUS_POOLS_ID=0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0

# Payment Token (mainnet uses SUI)
NEXT_PUBLIC_PAYMENT_TOKEN=0x2::sui::SUI
NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL=SUI
NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS=9

# Feature Flags
NEXT_PUBLIC_ENABLE_TESTNET_FAUCET=false
```

**Important**: Set these for **Production** environment in Vercel!

#### Testnet Project Environment Variables

```env
# Network Configuration
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://fullnode.testnet.sui.io:443

# Contract Addresses (your current testnet contracts)
NEXT_PUBLIC_PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
NEXT_PUBLIC_BONDING_CURVE_REGISTRY=0x18084c55f2f4f8bb9bcd0f9e99c818df3ec98f5c22bd4f75aff70f8666d8b28e
NEXT_PUBLIC_LP_LOCKER=0x5ce3c45e2d32ecbe0e7e08e7d5f2b1dd57c5cc1e24b6086835f4cdb66936bddd
NEXT_PUBLIC_FAUCET_PACKAGE=0x344f97a405d33c899bd70a75a248554b7576070cc113d3322672bb1b22be5a70

# Indexer (your testnet Ubuntu server)
NEXT_PUBLIC_INDEXER_API=http://13.60.235.109:3002

# Compilation Service
NEXT_PUBLIC_COMPILER_URL=http://13.60.235.109:3003

# Cetus (Testnet pool IDs)
NEXT_PUBLIC_CETUS_GLOBAL_CONFIG=0x9fa8283788e88f4d69cec96a8d3c62b553d40cc35aad49e2f5a6e476ccd6e896
NEXT_PUBLIC_CETUS_POOLS_ID=0x75445b0c48b7ce76101fbed30fc4a60d5024e1f15de1048dcbbb697816b61b10

# Payment Token (testnet uses SUILFG_MEMEFI)
NEXT_PUBLIC_PAYMENT_TOKEN=0x344f97a405d33c899bd70a75a248554b7576070cc113d3322672bb1b22be5a70::suilfg_memefi::SUILFG_MEMEFI
NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL=SUILFG
NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS=9

# Feature Flags
NEXT_PUBLIC_ENABLE_TESTNET_FAUCET=true
```

### 4. Configure Branch Deployments (Optional)

Both projects can deploy from the same branch or different branches:

#### Mainnet Project:
- **Production Branch**: `main` (stable releases only)
- **Preview Branches**: Disabled (for safety)

#### Testnet Project:
- **Production Branch**: `cursor/say-hello-to-the-user-1d42` or `main`
- **Preview Branches**: All branches (test everything)

### 5. Update Code to Use Environment Variables

Create `/workspace/lib/config.ts`:

```typescript
// Network configuration from environment variables
export const NETWORK_CONFIG = {
  network: (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'mainnet' | 'testnet',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://fullnode.testnet.sui.io:443',
  
  // Contract addresses
  platformPackage: process.env.NEXT_PUBLIC_PLATFORM_PACKAGE!,
  bondingCurveRegistry: process.env.NEXT_PUBLIC_BONDING_CURVE_REGISTRY!,
  lpLocker: process.env.NEXT_PUBLIC_LP_LOCKER!,
  faucetPackage: process.env.NEXT_PUBLIC_FAUCET_PACKAGE!,
  
  // APIs
  indexerApi: process.env.NEXT_PUBLIC_INDEXER_API!,
  compilerUrl: process.env.NEXT_PUBLIC_COMPILER_URL!,
  
  // Cetus
  cetusGlobalConfig: process.env.NEXT_PUBLIC_CETUS_GLOBAL_CONFIG!,
  cetusPoolsId: process.env.NEXT_PUBLIC_CETUS_POOLS_ID!,
  
  // Payment token
  paymentToken: process.env.NEXT_PUBLIC_PAYMENT_TOKEN!,
  paymentTokenSymbol: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL || 'SUI',
  paymentTokenDecimals: parseInt(process.env.NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS || '9'),
  
  // Feature flags
  enableTestnetFaucet: process.env.NEXT_PUBLIC_ENABLE_TESTNET_FAUCET === 'true',
} as const;

// Validation
if (!NETWORK_CONFIG.platformPackage) {
  throw new Error('NEXT_PUBLIC_PLATFORM_PACKAGE is required');
}

// Export for convenience
export const IS_MAINNET = NETWORK_CONFIG.network === 'mainnet';
export const IS_TESTNET = NETWORK_CONFIG.network === 'testnet';
```

Then update your components to use `NETWORK_CONFIG`:

```typescript
import { NETWORK_CONFIG, IS_MAINNET } from '@/lib/config';

// Instead of hardcoded values
const PLATFORM_PACKAGE = NETWORK_CONFIG.platformPackage;
const RPC_URL = NETWORK_CONFIG.rpcUrl;

// Conditional features
{IS_TESTNET && <FaucetLink />}
```

## Deployment Workflow

### For Testnet:
1. Push to your branch
2. Vercel auto-deploys to testnet URL
3. Test features

### For Mainnet:
1. Merge tested code to `main` branch
2. Vercel auto-deploys to mainnet URL
3. Users see stable version

## Cost

**Free Tier**: 
- Hobby plan supports unlimited projects
- Two projects = FREE
- 100GB bandwidth/month combined

**Pro Plan** ($20/month):
- Unlimited bandwidth
- Better performance
- Team collaboration

## Backend Infrastructure

You'll also need separate backends:

### Option A: Same Ubuntu Machine (Different Ports)

```bash
# Testnet services (current)
PM2 Process           Port    Database
memecoin-indexer      -       testnet_db
memecoin-api         3002     testnet_db
compilation-service  3003     -
pool-creation-bot     -       testnet_db

# Mainnet services (add these)
PM2 Process              Port    Database
memecoin-indexer-main    -       mainnet_db
memecoin-api-main       4002     mainnet_db
compilation-service     3003     - (shared)
pool-creation-bot-main   -       mainnet_db
```

### Option B: Separate Machines (Recommended for Production)

```bash
# Testnet Server
testnet-api.yourlaunchpad.io → Ubuntu Server 1

# Mainnet Server  
api-mainnet.yourlaunchpad.io → Ubuntu Server 2 (separate!)
```

## Domain Setup Summary

```
yourlaunchpad.io                  → Landing/marketing page
├── app.yourlaunchpad.io         → Mainnet app (Vercel Project 1)
├── testnet.yourlaunchpad.io     → Testnet app (Vercel Project 2)
├── api-mainnet.yourlaunchpad.io → Mainnet indexer API (Ubuntu)
├── api-testnet.yourlaunchpad.io → Testnet indexer API (Ubuntu)
└── compile.yourlaunchpad.io     → Compilation service (shared)
```

## Testing the Setup

### Testnet:
1. Visit `testnet.yourlaunchpad.io`
2. Connect wallet (must be on testnet)
3. See "Testnet" badge in header
4. Faucet link visible

### Mainnet:
1. Visit `app.yourlaunchpad.io`
2. Connect wallet (must be on mainnet)
3. See "Mainnet" badge in header
4. No faucet link
5. Real SUI required

## Security Checklist

✅ Separate databases for mainnet/testnet
✅ Different contract addresses
✅ Different RPC endpoints
✅ Environment variables validated
✅ No shared state between environments
✅ Mainnet uses production branch only
✅ Testnet can use any branch for testing

## Next Steps

1. Deploy mainnet contracts
2. Set up mainnet Ubuntu server
3. Create two Vercel projects
4. Configure environment variables
5. Update code to use `NETWORK_CONFIG`
6. Add network indicator to UI
7. Test both deployments
8. Launch! 🚀

## Pro Tips

💡 **Always test on testnet first** - Deploy to testnet, test thoroughly, then deploy same code to mainnet

💡 **Use Git Tags for Mainnet** - Tag mainnet releases (`v1.0.0`) for easy rollback

💡 **Monitor Both Environments** - Set up separate alerts for mainnet (critical) vs testnet (nice to have)

💡 **Database Backups** - Mainnet DB should backup hourly, testnet can be daily

💡 **Rate Limiting** - Apply stricter limits on mainnet to prevent abuse
