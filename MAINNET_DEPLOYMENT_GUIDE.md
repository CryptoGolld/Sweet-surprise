# Mainnet Deployment - Complete Guide

## Overview

You now have **TWO separate contract folders**:

1. **Testnet:** `contracts/suilfg_launch_with_memefi_testnet/` (uses SUILFG_MEMEFI faucet token)
2. **Mainnet:** `contracts/suilfg_launch_mainnet/` (uses native SUI) ✅ NEW!

## What Changed in Mainnet Contracts

### Single Change: Payment Token
- **Testnet:** `SUILFG_MEMEFI` (custom faucet token)
- **Mainnet:** `SUI` (native Sui token)

All references replaced:
- ✅ `Balance<SUILFG_MEMEFI>` → `Balance<SUI>`
- ✅ `Coin<SUILFG_MEMEFI>` → `Coin<SUI>`  
- ✅ `Pool<SUILFG_MEMEFI, T>` → `Pool<SUI, T>`
- ✅ Module names: `suilfg_launch_memefi` → `suilfg_launch_mainnet`

**Everything else is IDENTICAL!**

---

## Step 1: Build Mainnet Contracts

```bash
cd /workspace/contracts/suilfg_launch_mainnet

# Build
sui move build

# Test
sui move test

# Verify output
ls -la build/suilfg_launch_mainnet/
```

---

## Step 2: Deploy to Mainnet

### Prerequisites
1. **Sui CLI configured for mainnet:**
```bash
sui client new-env --alias mainnet --rpc https://fullnode.mainnet.sui.io:443
sui client switch --env mainnet
sui client active-address
```

2. **Fund your wallet** with SUI for gas (need ~1 SUI for deployment)

### Deploy Commands

```bash
cd /workspace/contracts/suilfg_launch_mainnet

# Deploy (costs ~0.5 SUI in gas)
sui client publish --gas-budget 500000000

# Save the output! You'll need:
# - Package ID
# - PlatformConfig object ID
# - ReferralRegistry object ID  
# - TickerRegistry object ID
# - AdminCap object ID
# - UpgradeCap object ID
```

---

## Step 3: Set Up Environment Variables

### Create Separate .env Files

**For Frontend (Vercel):**

Create `.env.testnet`:
```bash
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
NEXT_PUBLIC_PLATFORM_STATE=0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9
NEXT_PUBLIC_REFERRAL_REGISTRY=0x964b507850a0b51a736d28da9e8868ce82d99fe1faa580c9b4ac3a309e28c836
NEXT_PUBLIC_TICKER_REGISTRY=0xd8ba248944efc41c995a70679aabde9e05b509a7be7c10050f0a52a9029c0fcb
NEXT_PUBLIC_PAYMENT_TOKEN=0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI
NEXT_PUBLIC_RPC_URL=https://fullnode.testnet.sui.io:443
```

Create `.env.mainnet`:
```bash
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_PLATFORM_PACKAGE=<YOUR_MAINNET_PACKAGE_ID>
NEXT_PUBLIC_PLATFORM_STATE=<YOUR_MAINNET_STATE_ID>
NEXT_PUBLIC_REFERRAL_REGISTRY=<YOUR_MAINNET_REGISTRY_ID>
NEXT_PUBLIC_TICKER_REGISTRY=<YOUR_MAINNET_TICKER_ID>
NEXT_PUBLIC_PAYMENT_TOKEN=0x2::sui::SUI
NEXT_PUBLIC_RPC_URL=https://fullnode.mainnet.sui.io:443
```

**For Indexer (Ubuntu):**

Create `indexer/.env.testnet`:
```bash
# Database
DATABASE_URL=postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres

# Network
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348

# API
API_PORT=3002
```

Create `indexer/.env.mainnet`:
```bash
# Database (separate database for mainnet!)
DATABASE_URL=<YOUR_MAINNET_SUPABASE_URL>

# Network  
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
PLATFORM_PACKAGE=<YOUR_MAINNET_PACKAGE_ID>

# API
API_PORT=3003
```

---

## Step 4: Set Up Mainnet Database

### Option 1: Create New Supabase Project (Recommended)

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Name: **SuiLFG Mainnet**
4. Choose same region (eu-north-1)
5. Set password: `suilfgindexer` (or same as testnet)
6. Get connection string

### Option 2: Use Same Supabase, Different Schema

```sql
-- In Supabase SQL Editor
CREATE SCHEMA mainnet;

-- Update indexer queries to use schema
-- (More complex, not recommended)
```

### Import Schema to Mainnet Database

```bash
# Run schema on new mainnet database
psql "<MAINNET_SUPABASE_URL>" < indexer/schema.sql
```

---

## Step 5: Update Frontend for Multi-Network

Update `lib/constants.ts` to use env vars:

```typescript
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'testnet' | 'mainnet';

export const CONTRACTS = {
  PLATFORM_PACKAGE: process.env.NEXT_PUBLIC_PLATFORM_PACKAGE || '',
  PLATFORM_STATE: process.env.NEXT_PUBLIC_PLATFORM_STATE || '',
  // ... etc
} as const;

export const COIN_TYPES = {
  SUI: '0x2::sui::SUI',
  PAYMENT_TOKEN: process.env.NEXT_PUBLIC_PAYMENT_TOKEN || '0x2::sui::SUI',
} as const;
```

---

## Step 6: Run Separate Services for Each Network

### PM2 Ecosystem for Multi-Network

Update `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    // TESTNET SERVICES
    {
      name: 'testnet-indexer',
      script: './indexer/index.js',
      cwd: '/var/www/Sweet-surprise',
      env_file: './indexer/.env.testnet',
    },
    {
      name: 'testnet-api',
      script: './indexer/api-server.js',
      cwd: '/var/www/Sweet-surprise',
      env_file: './indexer/.env.testnet',
    },
    
    // MAINNET SERVICES  
    {
      name: 'mainnet-indexer',
      script: './indexer/index.js',
      cwd: '/var/www/Sweet-surprise',
      env_file: './indexer/.env.mainnet',
    },
    {
      name: 'mainnet-api',
      script: './indexer/api-server.js',
      cwd: '/var/www/Sweet-surprise',
      env_file: './indexer/.env.mainnet',
    },
    
    // SHARED SERVICES
    {
      name: 'compilation-service',
      script: './compilation-service/index.js',
      // ... same as before
    },
  ],
};
```

---

## Step 7: Deploy Frontend to Vercel

### For Testnet:
```bash
# In Vercel dashboard, set environment variables:
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PLATFORM_PACKAGE=0xa4997...
# ... etc
```

### For Mainnet:
Create a **separate Vercel project** OR use **Vercel Preview Deployments**:

**Option A: Separate Project (Recommended)**
- Create new Vercel project: **suilfg-mainnet**
- Set mainnet env vars
- Deploy from `main` branch

**Option B: Branch-based Deployment**
- Mainnet on `main` branch
- Testnet on `testnet` branch
- Vercel auto-deploys based on branch

---

## What You Need to Do (Step-by-Step)

### Today (Testnet Running):
1. ✅ Mainnet contracts created (DONE!)
2. ⏳ Test build mainnet contracts locally
3. ⏳ Keep testnet running as-is

### Tomorrow (Deploy Mainnet):
1. Build & deploy mainnet contracts
2. Create mainnet Supabase database
3. Update `.env.mainnet` with contract addresses
4. Run mainnet indexer on Ubuntu (port 3003)
5. Deploy mainnet frontend to Vercel

### Configuration (Both Networks):
1. Testnet: Port 3002, Supabase (current)
2. Mainnet: Port 3003, Supabase (new project)

---

## Testing Mainnet Contracts Locally

```bash
cd /workspace/contracts/suilfg_launch_mainnet

# Build
sui move build

# Should see:
# Successfully built package at /workspace/contracts/suilfg_launch_mainnet
```

If it builds successfully, you're ready to deploy to mainnet!

---

## Summary

**Created:**
- ✅ `contracts/suilfg_launch_mainnet/` - Mainnet contracts (uses SUI)
- ✅ All SUILFG_MEMEFI → SUI replacements done
- ✅ Module names updated
- ✅ README with instructions

**Next Steps:**
1. Test build locally
2. Deploy to mainnet  
3. Set up env vars
4. Run services

**Testnet:**
- ✅ Still works as before
- ✅ No changes needed
- ✅ Contracts untouched

Want me to help set up the environment variables configuration next?
