# 🧪 Testing Instructions

## ✅ THE BUG WAS FOUND!

**Problem:** We required `T: drop + store` but standard Sui coin witness types only have `drop`!

**Fix:** Changed all `T: drop + store` → `T: drop` in bonding_curve.move

---

## 📦 Deployed Testnet Contract (ALREADY LIVE)

**Package:** `0xd7eda5f21b7f1d83b401566dc6355eb3370b03c32da7c593fb4d02db5d5628e1`  
**PlatformConfig:** `0x75f3b9dafc4c85bc6b42386ff5f25863522d9aaa1b88b01b54dac7ae3c5c6745`

⚠️ **This deployment still has the bug** (deployed before we found it)

---

## 🚀 Test With Your Own Wallet

You already have my MOON token TreasuryCap:
- **TreasuryCap:** `0x1e42b69f959c01ff60bf7d57feb4669acbb51919913599c5b4c7529df5d8ef9a`
- **Token Type:** `0x86d6038ce4bc879b1c25d39b407ef3617a6feeff3c1d142a3319a32dc070fb07::moon::MOON`

### Option 1: Deploy Fresh From Git (RECOMMENDED)

```bash
cd /path/to/your/workspace
git pull origin feat/fix-compilation-clean

# Deploy testnet version with fix
cd suilfg_launch_testnet
sui move build
sui client publish --gas-budget 500000000

# Save the PackageID and PlatformConfig ObjectID from output
```

### Option 2: Test Against My Old Deployment

```bash
# This will likely still fail with VM error since deployment has bug
sui client call \
  --package 0xd7eda5f21b7f1d83b401566dc6355eb3370b03c32da7c593fb4d02db5d5628e1 \
  --module bonding_curve \
  --function create_new_meme_token \
  --type-args "0x86d6038ce4bc879b1c25d39b407ef3617a6feeff3c1d142a3319a32dc070fb07::moon::MOON" \
  --args 0x75f3b9dafc4c85bc6b42386ff5f25863522d9aaa1b88b01b54dac7ae3c5c6745 0x1e42b69f959c01ff60bf7d57feb4669acbb51919913599c5b4c7529df5d8ef9a \
  --gas-budget 100000000
```

---

## 📝 What Changed

### Before (WRONG):
```move
public struct BondingCurve<phantom T: drop + store> has key, store {
    ...
}

public entry fun create_new_meme_token<T: drop + store>(...) {
    ...
}
```

### After (CORRECT):
```move
public struct BondingCurve<phantom T: drop> has key, store {
    ...
}

public entry fun create_new_meme_token<T: drop>(...) {
    ...
}
```

**Why:** Standard Sui coin witness types (like MOON, FIRE, etc.) only have `drop` ability, not `store`. Phantom type parameters don't need `store` since they're not actually stored.

---

## 🎯 Expected Result

With the fix, bonding curve creation should **SUCCEED** instead of failing with:
```
Error: VMVerificationOrDeserializationError in command 0
```

---

## 💾 Code is in Git

Branch: `feat/fix-compilation-clean`  
Commit: Latest push includes the fix

Both versions ready:
- `suilfg_launch/` - Mainnet with Cetus (fixed)
- `suilfg_launch_testnet/` - Testnet with Simple AMM (fixed)

---

**Please test on your end and let me know if it works!** 🚀
