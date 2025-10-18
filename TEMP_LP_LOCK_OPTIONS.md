# 🔒 LP Lock Implementation Options

**CURRENT STATUS:** ✅ Plan A Implemented (Testing...)

---

## ⚡ PLAN A: On-Chain Package Addresses (CURRENTLY TESTING)

## PLAN 1: Custom Shared Object Lock (In Our Contracts)

### Implementation:
```move
// New module: lp_locker.move
public struct LockedLPPosition<phantom A, phantom B> has key {
    id: UID,
    position: Position,           // Cetus Position NFT locked inside
    pool_id: ID,
    fee_recipient: address,       // Changeable!
    locked_at: u64,
    bonding_curve_id: ID,
}

// Only these functions exist:
public fun lock_position() { ... }                    // Lock position
public entry fun collect_lp_fees() { ... }           // Collect fees
public entry fun set_fee_recipient(admin) { ... }    // Change recipient

// NO FUNCTION TO REMOVE LIQUIDITY!
// NO FUNCTION TO UNLOCK!
```

### Move.toml:
```toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", rev = "mainnet-v1.35.1" }

[addresses]
suilfg_launch = "0x0"
cetusclmm = "0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666"
```

### Pros:
✅ No dependency conflicts
✅ Automatic pool creation
✅ Position locked forever (no unlock function)
✅ Fee collection works
✅ Changeable fee recipient
✅ Simple, auditable code

### Cons:
❌ Future upgrades COULD add unlock function (see Question 1 below!)
❌ Custom code (not using Cetus's official LP burn)

---

## PLAN 2: Use On-Chain Packages Directly (No Git Dependencies)

### Implementation:
```move
// Use external types by referencing deployed packages
use cetusclmm::config::GlobalConfig;
use cetusclmm::pool_creator;
use lpburn::lp_burn::{BurnManager, CetusLPBurnProof};
// Compiler resolves from on-chain deployed packages
```

### Move.toml:
```toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", rev = "mainnet-v1.35.1" }

[addresses]
suilfg_launch = "0x0"
# Reference deployed packages by address (NO git dependencies!)
cetusclmm = "0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666"
lpburn = "0x9c751fccc633f3ebad2becbe7884e5f38b4e497127689be0d404b24f79d95d71"
```

### Pros:
✅ No dependency conflicts (no git deps!)
✅ Uses official Cetus LP burn (battle-tested)
✅ Permanent lock (Cetus's code, not ours)
✅ Automatic pool creation
✅ No maintenance of lock code

### Cons:
❌ Must trust Cetus's deployed packages
❌ Need correct package addresses for each network
❌ May need additional type dependencies

---

## QUESTION 1: Can Future Upgrades Add Unlock Functions?

**SHORT ANSWER:** Not for EXISTING tokens, only for NEW tokens!

**DETAILED EXPLANATION:**

### How Sui Upgrades Work:

When you upgrade a package, you can:
- ✅ Add NEW functions
- ✅ Add NEW fields to structs
- ✅ Modify function implementations
- ❌ **CANNOT change existing struct definitions**
- ❌ **CANNOT remove fields**

### For Plan 1 (Custom Lock):

**Scenario: You upgrade and add unlock function**

```move
// VERSION 1 (deployed now):
public struct LockedLPPosition<phantom A, phantom B> has key {
    position: Position,
    // ... fields
}
// No unlock function

// VERSION 2 (future upgrade):
public fun unlock_position<A, B>(
    locked: LockedLPPosition<A, B>
) {
    // Extract position
}
```

**What Happens:**
- ✅ NEW tokens created AFTER upgrade CAN be unlocked
- ❌ OLD tokens (created with v1) CANNOT be unlocked!

**Why?**

The upgrade would need to either:
1. Add a field like `is_unlockable: bool` to the struct
   - But you CAN'T modify existing objects' fields
   - Old objects don't have this field
   - Function can't work on old objects

2. Or apply unlock to ALL locked positions
   - But then you can't distinguish old vs new

**SOLUTION TO PREVENT THIS:**

Add an **immutable flag** from day 1:

```move
public struct LockedLPPosition<phantom A, phantom B> has key {
    id: UID,
    position: Position,
    fee_recipient: address,
    locked_at: u64,
    is_permanently_locked: bool,  // ← ADD THIS!
    bonding_curve_id: ID,
}

// In lock function:
public fun lock_position(...) {
    let locked = LockedLPPosition {
        // ...
        is_permanently_locked: true,  // ← SET TO TRUE
        // ...
    };
    transfer::share_object(locked);
}

// Even if we add unlock later:
public fun unlock_position<A, B>(
    locked: LockedLPPosition<A, B>
) {
    assert!(!locked.is_permanently_locked, E_CANNOT_UNLOCK);
    // ^ OLD positions have this = true, cannot unlock!
}
```

**Result:**
- ✅ Old positions PERMANENTLY locked (flag = true)
- ✅ Future positions could be time-locked (flag = false)
- ✅ Backwards compatible
- ✅ Community can verify flag on-chain

---

## QUESTION 2: Can We Use Plan 2 for Both Pool AND Burn?

**SHORT ANSWER:** YES! That's exactly what I'm proposing!

**DETAILED EXPLANATION:**

### What Plan 2 Means:

**Instead of including Cetus source code as git dependencies:**
```toml
# DON'T DO THIS (causes conflicts):
CetusClmm = { git = "https://github.com/..." }
LpBurn = { git = "https://github.com/..." }
```

**Just reference their deployed packages:**
```toml
# DO THIS (no conflicts!):
[addresses]
cetusclmm = "0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666"
lpburn = "0x9c751fccc633f3ebad2becbe7884e5f38b4e497127689be0d404b24f79d95d71"
```

**Then use both in code:**
```move
// Pool creation (from cetusclmm package)
use cetusclmm::pool_creator;
use cetusclmm::factory::Pools;
let (position, ...) = pool_creator::create_pool_v2(...);

// LP burning (from lpburn package)
use lpburn::lp_burn::{BurnManager, CetusLPBurnProof};
let burn_proof = lp_burn::burn_lp_v2(burn_manager, position, ctx);
```

**The compiler:**
1. Sees `cetusclmm::pool_creator`
2. Looks up package at address `0x0868...`
3. Finds `pool_creator` module
4. Uses its type definitions
5. Same for `lpburn` package

**No git dependencies = No version conflicts!**

---

## 🎯 COMBINED BEST SOLUTION

**Use Plan 2 approach + Plan 1 safety:**

### Move.toml:
```toml
[dependencies]
Sui = { git = "...", rev = "mainnet-v1.35.1" }

[addresses]
suilfg_launch = "0x0"
cetusclmm = "0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666"
lpburn = "0x9c751fccc633f3ebad2becbe7884e5f38b4e497127689be0d404b24f79d95d71"
```

### Option A: Use Cetus's LP Burn (Official)
```move
// Use official LP burn from deployed package
use lpburn::lp_burn;
let burn_proof = lp_burn::burn_lp_v2(burn_manager, position, ctx);
transfer::public_transfer(burn_proof, treasury);
```

**Pros:**
- ✅ Official Cetus code (battle-tested)
- ✅ Community recognizes "Cetus LP Burn"
- ✅ No custom code to audit

**Cons:**
- ❌ Still references external package
- ❌ Depends on Cetus's implementation

### Option B: Use Custom Lock (Our Code)
```move
// Our own lock in shared object
let locked = lp_locker::lock_position(position, ...);
transfer::share_object(locked);
```

**Pros:**
- ✅ 100% our code (fully auditable)
- ✅ Add `is_permanently_locked` flag (upgrade-safe!)
- ✅ Simpler to understand

**Cons:**
- ❌ Custom code (needs audit)
- ❌ Less "name brand" than Cetus burn

---

## 🔑 WHAT PACKAGE IDs DO WE NEED?

### For Pool Creation (Required):
```
Testnet CetusClmm: 0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666
Mainnet CetusClmm: 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb
```

### For LP Burn (If using Cetus's official burn):
```
Testnet LpBurn: 0x9c751fccc633f3ebad2becbe7884e5f38b4e497127689be0d404b24f79d95d71
Mainnet LpBurn: (Need to find - or use custom lock instead)
```

### Other Cetus Objects (Runtime, not build-time):
```
Testnet GlobalConfig: 0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
Testnet Pools: (Need to find)
Testnet BurnManager: (Need to find, if using LP burn)
```

---

## 🎯 MY RECOMMENDATION

**HYBRID APPROACH:**

1. **Use Plan 2 (on-chain package addresses) for pool creation**
   - Reference `cetusclmm` by address
   - Use `pool_creator::create_pool_v2`
   - No dependency conflicts! ✅

2. **Use Plan 1 (custom lock) for liquidity locking**
   - Create `lp_locker.move` module
   - Lock Position NFT in shared object
   - Add `is_permanently_locked: true` flag
   - No unlock function = permanent lock
   - Upgrade-safe! ✅

3. **Result:**
   - ✅ Automatic pool creation (via Cetus)
   - ✅ Permanent lock (our code, provable)
   - ✅ No dependency conflicts
   - ✅ Upgrade-safe
   - ✅ Fee collection works
   - ✅ Changeable recipient

---

## ✅ READY TO IMPLEMENT

**Which approach do you want?**

**Option A: Hybrid (Recommended)**
- Cetus for pool creation (by address)
- Our custom lock for position (with flag)

**Option B: Full Cetus**
- Cetus for pool creation (by address)
- Cetus LP burn for lock (by address)

**Option C: Minimal**
- Cetus for pool creation (by address)
- Just send Position NFT to treasury (no lock, trust-based)

**Tell me which and I'll implement immediately!** 🚀

---

## 🚀 CURRENT STATUS: PLAN A IMPLEMENTED

Move.toml updated to reference on-chain packages:
- ✅ cetusclmm: 0x0868...
- ✅ lpburn: 0x9c75...
- ✅ No git dependencies (only Sui framework)

**Next: Try building**
```bash
cd /workspace/suilfg_launch
sui move build
```

If successful: Uses official Cetus LP burn! 🎉
If fails: Implement Plan B (custom lp_locker.move)
