# Mainnet Deployment - READY! ✅

**Date:** November 1, 2025  
**Status:** Mainnet contracts deployed and services running

---

## ✅ What's Been Fixed

### 1. Price Calculations
- ✅ Fixed `/1e9` bug (prices were 1 billion times too small)
- ✅ Implemented Newton-Raphson method
- ✅ Market caps now show correct values

### 2. Database Migration
- ✅ Migrated to Supabase (from Ubuntu PostgreSQL)
- ✅ Deleted candle-generator (freed 12 GB!)
- ✅ API generates candles on-demand

### 3. Mainnet Deployment
- ✅ Created mainnet contracts (uses native SUI)
- ✅ Deployed to Sui Mainnet
- ✅ Set up separate Supabase database for mainnet
- ✅ Running mainnet indexer and API (port 3003)

### 4. Frontend Network Support
- ✅ All hardcoded testnet references removed
- ✅ Uses environment variables for network selection
- ✅ Faucet hidden on mainnet
- ✅ Text shows "SUI" on mainnet, "SUILFG" on testnet

---

## 📋 Current Setup

### Testnet
- **Contracts:** v0.0.8
- **API:** Port 3002
- **Database:** Supabase #1 (xenzymhhojbqeovuvdfh)
- **Payment Token:** SUILFG_MEMEFI (faucet token)
- **Vercel:** Existing project

### Mainnet
- **Contracts:** v1.0.0 ✅ DEPLOYED
- **API:** Port 3003 ✅ RUNNING
- **Database:** Supabase #2 (pfdbchphspxwiuekezkx) ✅ SETUP
- **Payment Token:** SUI (native)
- **Vercel:** New project (needs deployment)

---

## 🔧 Mainnet Contract Addresses

```
Package ID:        0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04
Platform State:    0xb2b9568567fb4f8983425581511e9931b0feb5e7ca485c9f0263e0593cfb7c00
Referral Registry: 0xac8b25db1c44cbb28d8cdbdbdac3d0eddc15c5a59aabb8bb8ba5bda9c9754f51
Ticker Registry:   0xc61c5a6a1085a07a6737441e508bfebef90e3e987eb219cea06f6b2b1029a8eb
Admin Cap:         0x70e125d5ce65ac943a9e7552d82e8d95e82e4942eda70b825041a09decc9ca37
Upgrade Cap:       0xf3d4ae6beda075f65fbb89d20201c99fcf996acfed0e959c66fef438aaf50b93
```

**Explorer:** https://suiscan.xyz/mainnet/object/0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04

---

## 🚀 Final Step: Deploy Mainnet Frontend on Vercel

### Environment Variables for Mainnet Vercel

Copy-paste these into your **NEW mainnet Vercel project**:

```bash
NEXT_PUBLIC_INDEXER_API=http://51.20.74.15:3003
NEXT_PUBLIC_COMPILE_SERVICE_URL=http://51.20.74.15:3001
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_RPC_URL=https://fullnode.mainnet.sui.io:443
NEXT_PUBLIC_PLATFORM_PACKAGE=0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04
NEXT_PUBLIC_PLATFORM_STATE=0xb2b9568567fb4f8983425581511e9931b0feb5e7ca485c9f0263e0593cfb7c00
NEXT_PUBLIC_REFERRAL_REGISTRY=0xac8b25db1c44cbb28d8cdbdbdac3d0eddc15c5a59aabb8bb8ba5bda9c9754f51
NEXT_PUBLIC_TICKER_REGISTRY=0xc61c5a6a1085a07a6737441e508bfebef90e3e987eb219cea06f6b2b1029a8eb
NEXT_PUBLIC_ADMIN_CAP=0x70e125d5ce65ac943a9e7552d82e8d95e82e4942eda70b825041a09decc9ca37
NEXT_PUBLIC_UPGRADE_CAP=0xf3d4ae6beda075f65fbb89d20201c99fcf996acfed0e959c66fef438aaf50b93
NEXT_PUBLIC_PAYMENT_TOKEN=0x2::sui::SUI
NEXT_PUBLIC_CETUS_GLOBAL_CONFIG=0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f
NEXT_PUBLIC_CETUS_POOLS=0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0
```

### Environment Variables for Testnet Vercel  

Update your **existing testnet Vercel project** with these:

```bash
NEXT_PUBLIC_INDEXER_API=http://51.20.74.15:3002
NEXT_PUBLIC_COMPILE_SERVICE_URL=http://51.20.74.15:3001
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
NEXT_PUBLIC_PLATFORM_STATE=0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9
NEXT_PUBLIC_REFERRAL_REGISTRY=0x964b507850a0b51a736d28da9e8868ce82d99fe1faa580c9b4ac3a309e28c836
NEXT_PUBLIC_TICKER_REGISTRY=0xd8ba248944efc41c995a70679aabde9e05b509a7be7c10050f0a52a9029c0fcb
NEXT_PUBLIC_ADMIN_CAP=0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11
NEXT_PUBLIC_UPGRADE_CAP=0x7ef7bc39eea080ebddb61426c3b81d099690d3d2eab836e80e6e0a70b5cf6c5b
NEXT_PUBLIC_PAYMENT_TOKEN=0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI
NEXT_PUBLIC_FAUCET_PACKAGE=0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81
NEXT_PUBLIC_FAUCET_OBJECT=0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde
NEXT_PUBLIC_CETUS_GLOBAL_CONFIG=0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
NEXT_PUBLIC_CETUS_POOLS=0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2
```

---

## ✅ What Works Now

### On Mainnet:
- ✅ Uses native SUI for all trades
- ✅ No faucet page (redirects to home)
- ✅ Text shows "SUI" instead of "SUILFG_MEMEFI"
- ✅ Wallet connects to mainnet
- ✅ Transactions go to mainnet
- ✅ Indexer monitors mainnet events
- ✅ API serves mainnet data (port 3003)

### On Testnet:
- ✅ Uses SUILFG_MEMEFI faucet token
- ✅ Faucet page available
- ✅ Text shows "SUILFG_MEMEFI"
- ✅ Everything works as before

---

## 🔍 Verify After Deployment

### Check Mainnet API

```bash
# Test mainnet API (from Ubuntu)
curl http://localhost:3003/health
curl http://localhost:3003/api/tokens | jq '.tokens | length'
```

### Check Mainnet Services

```bash
# On Ubuntu
pm2 list

# Should see:
# - mainnet-indexer (online)
# - mainnet-api (online)
# - memecoin-indexer (testnet, online)
# - memecoin-api (testnet, online)
```

### Check Mainnet Frontend

After Vercel deploys:
1. ✅ No "Faucet" link in header
2. ✅ Trades show "SUI" (not "SUILFG")
3. ✅ Wallet shows "Mainnet"
4. ✅ Tokens page loads (fetches from port 3003)

---

## 🎯 Summary

**Testnet and Mainnet both running!**

- **Same codebase** (`main` branch)
- **Different env vars** (network, contracts, API ports)
- **Separate databases** (2 Supabase projects)
- **No code changes needed** between them

**Cost:**
- Testnet Supabase: $0 (FREE tier)
- Mainnet Supabase: $0 (FREE tier)
- Ubuntu server: ~$50/month (same as before)
- **Total: $0 extra for mainnet!** 🎉

---

## 📝 Files Changed Today

All changes pushed to `main` branch:
- ✅ Price calculation fixes
- ✅ Mainnet contracts
- ✅ Environment variable support
- ✅ Network-aware text helpers
- ✅ Faucet hidden on mainnet
- ✅ API proxy using env vars
- ✅ SuiProvider network selection
- ✅ All hardcoded testnet refs removed

**Ready to go live!** 🚀
