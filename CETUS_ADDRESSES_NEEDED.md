# 🔍 Cetus Addresses Needed

## ✅ What We Already Have

### 1. Cetus Package Address
```
0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12
```
This is the **Cetus CLMM package** (smart contracts). ✅ We have this!

### 2. GlobalConfig Object
```
0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
```
This is the **Cetus configuration** shared object. ✅ We have this!

---

## ❌ What We're Missing

### 3. Pools Object (SHARED OBJECT - NOT A PACKAGE!)

**Type:** `0x<package>::factory::Pools`

**What it is:**
- A **shared object** (not a package address)
- Created when Cetus deployed on testnet
- Used by `pool_creator::create_pool_v2()` function
- Manages all Cetus pools

**What to look for:**

```bash
# Option 1: Check Cetus documentation
# Look for "Testnet Deployment" section
# Should list: Package, GlobalConfig, and Pools

# Option 2: Check Cetus GitHub
# Repository: https://github.com/CetusProtocol/cetus-clmm-interface
# Look in: deployment/testnet.json or similar

# Option 3: Query from Cetus UI
# Go to https://app.cetus.zone (testnet mode)
# Open browser console
# Look for Pools object ID in network requests

# Option 4: Ask Cetus Discord/Telegram
# They should have testnet deployment addresses
```

---

## 📝 Where to Find It

### Most Likely Sources:

1. **Cetus Official Docs**
   - URL: https://cetus-1.gitbook.io/cetus-docs
   - Look for: "Contract Addresses" → "Testnet"
   - Should show: `Pools: 0x...`

2. **Cetus GitHub**
   - Repo: https://github.com/CetusProtocol/cetus-clmm-interface
   - Check: `sui/cetus_clmm/` or deployment files
   - May have: `testnet-deployment.json`

3. **Cetus Explorer**
   - Search for recent pool creation transactions
   - Look at the arguments - should include Pools object

4. **Cetus Community**
   - Discord: https://discord.gg/cetus
   - Ask: "What's the Pools object ID for testnet?"

---

## 🎯 What We Need Exactly

**Please find:**
```
Pools Object ID: 0x????????????????????????????????????????????????
```

**It should be:**
- A 66-character hex string (0x + 64 chars)
- Different from the package address
- A **shared object** on Sui testnet
- Of type `<package>::factory::Pools`

**Example format:**
```
Pools: 0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0
```
(This is an old address that no longer works)

---

## 🔧 How We'll Use It

Once you provide the Pools object ID, I'll:

1. Update our TypeScript script to use correct address
2. Call `seed_pool_and_create_cetus_with_lock()`
3. Automatically create the Cetus LP pool
4. Lock the LP position permanently

**It's literally just ONE address we need!** 🎯

---

## 📋 Summary

**What you're looking for:**
- **Name:** Pools (or Factory Pools)
- **Type:** Shared Object
- **Chain:** Sui Testnet
- **Project:** Cetus Protocol
- **Use:** Pool creation/management

**Where to find:**
- Cetus documentation (testnet addresses)
- Cetus GitHub (deployment files)
- Cetus community (Discord/Telegram)
- Recent pool creation transactions on testnet

**Format:**
```
0x<64 hex characters>
```

That's it! Just need that one Pools object address and we can complete the automatic Cetus pool creation! 🚀
