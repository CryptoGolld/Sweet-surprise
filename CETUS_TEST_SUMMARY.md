# Cetus Pool Testing Summary

**Date:** October 22, 2025  
**Network:** Sui Testnet  
**Wallet:** `0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f`

---

## ✅ What Was Accomplished

### 1. Sui CLI Setup
- ✅ Installed Sui CLI v1.59.0
- ✅ Configured for Sui Testnet
- ✅ Imported wallet from mnemonic
- ✅ Verified wallet balance: **2.34 SUI**

### 2. Test Coin A (TESTA)
- ✅ **Created** and published to testnet
- ✅ **Package ID:** `0xc0f9a5f909c26ee508a30044dd3f2ca3f2bdb15355ec2b816b7a6561b6f654ad`
- ✅ **Full Type:** `0xc0f9a5f909c26ee508a30044dd3f2ca3f2bdb15355ec2b816b7a6561b6f654ad::coin_a::COIN_A`
- ✅ **Metadata:** `0x6aa018535c8cf5008fb8ba6bd718657061336ec26d91c48321215f11f1d23b6f` (Frozen)
- ✅ **Treasury Cap:** `0x6e6f791bf72a4b144347756a511472422ff1a29ccc3f06098af56d47d2848c93`
- ✅ **Symbol:** TESTA
- ✅ **Decimals:** 9
- ✅ **Minted:** 1,000 TESTA tokens

#### Transaction Details:
- **Publish TX:** `FQ2FLrPZKemTZw6rTCUofLkDGzim3GWiTEPVFbkJ6kxj`
- **Mint TX:** `APWoMvbaX1rEtErJwPP7WcmFj2Ng8YEE2tvfyyWysGXv`
- **Coin Object:** `0xdca032be7a88a82910d0a9e75f3589f6c389c9e32c76aa200fb3d6a6f06b8018`

### 3. Test Coin B (TESTB)
- ✅ **Created** and published to testnet
- ✅ **Package ID:** `0xbaac81d9c446bb9b3a0b0f5aabc3bb78e9cabc5bcdc5983a65be887fe4f09761`
- ✅ **Full Type:** `0xbaac81d9c446bb9b3a0b0f5aabc3bb78e9cabc5bcdc5983a65be887fe4f09761::coin_b::COIN_B`
- ✅ **Metadata:** `0xf9a51bd21b14ca701e278f8682bce2b3db8516bea3e77aee38913a3ada723fc9` (Frozen)
- ✅ **Treasury Cap:** `0x14449f9a01fe69c444eb597e452e23c5185c95c37f3b3b0a33c90857d14b7408`
- ✅ **Symbol:** TESTB
- ✅ **Decimals:** 9
- ✅ **Minted:** 1,000 TESTB tokens

#### Transaction Details:
- **Publish TX:** `2aTc4A1SJ3uBFXSXzibTzhurPoFUo2z99meovguET5Dr`
- **Mint TX:** `GQfUqpdissS3bU2N7SySoKs3Gb6AAqgFHdM2JFzM4wZM`
- **Coin Object:** `0xbb782fc798b35394671d64f98fa84638d59127b480eed755e371113b831368a2`

---

## ⚠️ Cetus Pool Creation Status

### Attempted Pool Creation
We attempted to create a Cetus liquidity pool for the TESTA/TESTB pair using the Cetus SDK.

**Configuration Attempted:**
- Pair: TESTB / TESTA (sorted order)
- Tick Spacing: 60 (0.25% fee tier)
- Initial Price: 1:1
- Network: Sui Testnet

### Result: Permission Restriction

**Error Encountered:**
```
MoveAbort(MoveLocation { 
  module: pool_creator::config, 
  function: check_pool_manager_role 
}, error_code: 5)
```

**Root Cause:**
The Cetus testnet deployment restricts pool creation to authorized **pool managers** only. Regular wallets cannot create pools directly through the `pool_creator` module.

**Attempted Transactions:**
- TX 1: `6pEZW4BQrAtN2rDUV2xVRd8rW28eBePptqc9tX3adh5w` (coinTypeA/B order issue)
- TX 2: `EEHYPrYF3HAyMM63ZMVffwqv4THetPG171aYReZSZ4JJ` (coinTypeA/B order issue)
- TX 3: `Fz6GPHW5EAs42G87Qdxc2pwNk3rupb2Yj6qKwtipQk8H` (permission denied)

---

## 📋 Alternative Options for Pool Creation

### Option 1: Cetus UI (Recommended)
If Cetus testnet allows UI-based pool creation, you can:
1. Visit https://app.cetus.zone/liquidity/create
2. Connect your wallet
3. Create pool with TESTB/TESTA pair
4. Add initial liquidity

### Option 2: Partner Module
Cetus may have a partner/whitelist module for authorized users. You would need to:
- Contact Cetus team for whitelisting
- Or use a different Cetus deployment with open pool creation

### Option 3: Use Mainnet
On Sui mainnet, pool creation permissions may differ. The same coins could be deployed there for testing with real pool creation.

### Option 4: Deploy Custom Cetus Instance
For testing purposes, you could deploy your own instance of the Cetus CLMM contracts with modified permissions.

---

## 🎯 Summary

✅ **Successfully Completed:**
- Sui CLI installation and wallet setup
- Created and published two test coins (TESTA & TESTB)
- Minted initial supply for both coins
- Installed and configured Cetus SDK
- Identified pool creation restriction on Cetus testnet

⚠️ **Blocked:**
- Direct pool creation via SDK (requires pool manager authorization)

📝 **Next Steps:**
The coins are ready for pool creation through any of the alternative methods listed above. Both coins have:
- Frozen metadata (immutable)
- Minted supply available
- Valid coin types for Cetus pools

**Coins are production-ready for Cetus integration once pool creation authorization is obtained.**

---

## 📊 Coin Details Summary

| Property | COIN_A (TESTA) | COIN_B (TESTB) |
|----------|---------------|---------------|
| Package | `0xc0f9a5...f654ad` | `0xbaac81...f09761` |
| Symbol | TESTA | TESTB |
| Decimals | 9 | 9 |
| Supply Minted | 1,000 | 1,000 |
| Metadata | Frozen ✅ | Frozen ✅ |
| Treasury Cap | Held by wallet | Held by wallet |
| Network | Sui Testnet | Sui Testnet |

**Wallet Balance:** 2.34 SUI remaining for future operations

---

## 🔧 Technical Notes

### Cetus SDK Setup
```javascript
const { initTestnetSDK } = require('@cetusprotocol/cetus-sui-clmm-sdk');
const sdk = initTestnetSDK();
sdk.senderAddress = wallet_address;
```

### Coin Type Ordering
Cetus requires coin types to be **alphabetically sorted**:
```javascript
// Correct order for our coins:
coinTypeA: COIN_B (0xbaac81...) // Comes first
coinTypeB: COIN_A (0xc0f9a5...) // Comes second
```

### Gas Costs
- Coin publish: ~14.7 MIST each
- Coin mint: ~2.3 MIST each
- Total spent: ~34 MIST (~0.04 SUI)

---

**Test Status:** ✅ Coins Created | ⏸️ Pool Creation Pending Authorization
