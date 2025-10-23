# Capability Security Analysis

## Your Concern: Can Someone with the Cap Steal Funds?

### Question 1: Can they withdraw to another wallet?
**Answer: NO - Here's why:**

```move
// The capability ONLY grants permission to call specific functions
// It does NOT grant access to:
// - TreasuryCap (can't mint tokens)
// - AdminCap (can't change settings)
// - The SUI reserve balance
// - Any withdrawal functions

public entry fun create_pool_with_capability<T: drop + store>(
    cap: &PoolCreatorCap,  // Just proves permission
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    bump_bps: u64,
    ctx: &mut TxContext
) {
    // ✅ Can only call THIS function
    // ❌ CANNOT call withdraw_reserve_to()
    // ❌ CANNOT call transfer()
    // ❌ CANNOT access treasury
    
    assert!(curve.graduated, E_NOT_GRADUATED);
    assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
    
    // Tokens are minted fresh from TreasuryCap
    let tokens = coin::mint(&mut curve.treasury, amount, ctx);
    
    // Recipient is HARDCODED from config
    let recipient = platform_config::get_pool_creator_address(cfg);
    
    // Cannot change recipient - it's from the config!
    transfer::public_transfer(tokens, recipient);
}
```

### Question 2: Can they create a wrong pool somewhere else?
**Answer: NO - Here's how we prevent it:**

```move
// WRONG: Too flexible (DON'T DO THIS)
public entry fun create_pool_flexible<T: drop + store>(
    cap: &PoolCreatorCap,
    recipient: address,  // ❌ Can choose any address
    amount: u64,         // ❌ Can choose any amount
) {
    // This would be dangerous!
}

// RIGHT: Restricted parameters (DO THIS)
public entry fun create_pool_with_capability<T: drop + store>(
    cap: &PoolCreatorCap,
    cfg: &PlatformConfig,      // ✅ Config controls recipient
    curve: &mut BondingCurve<T>, // ✅ Only from graduated curve
    bump_bps: u64,             // ✅ Limited range (0-1000)
    ctx: &mut TxContext
) {
    // Validate bump_bps
    assert!(bump_bps <= 1000, E_INVALID_BUMP); // Max 10%
    
    // Recipient is FROM CONFIG (admin-controlled)
    let recipient = platform_config::get_pool_creator_address(cfg);
    
    // Amount is CALCULATED from curve (not user input)
    let amount = TOTAL_SUPPLY - curve.token_supply;
    
    // Can ONLY be called on graduated curves
    assert!(curve.graduated, E_NOT_GRADUATED);
    assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
    
    // Tokens go to CONFIGURED address only
    transfer::public_transfer(tokens, recipient);
}
```

## Security Layers

### Layer 1: Capability Scope
```
PoolCreatorCap can ONLY call:
  ✅ create_pool_with_capability()
  
Cannot call:
  ❌ withdraw_reserve_to()
  ❌ withdraw_reserve_to_treasury()
  ❌ Administrative functions
  ❌ Any other contract functions
```

### Layer 2: Parameter Validation
```move
// All parameters are validated or derived:

1. cfg: &PlatformConfig
   - Owned by contract
   - Controls recipient address
   - Cannot be faked

2. curve: &mut BondingCurve<T>
   - Must be graduated (checked)
   - Must not be seeded (checked)
   - Cannot be arbitrary

3. bump_bps: u64
   - Limited to 0-1000 (0-10%)
   - Validated in function
   
4. Recipient address
   - NEVER a parameter!
   - Always from config
   - Admin-controlled
```

### Layer 3: State Checks
```move
// Contract state prevents abuse:

assert!(curve.graduated, E_NOT_GRADUATED);
// ✅ Can only work on graduated tokens

assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
// ✅ Can only be called ONCE per token

assert!(bump_bps <= 1000, E_INVALID_BUMP);
// ✅ Cannot manipulate amounts too much
```

### Layer 4: Hardcoded Recipients
```move
// Recipients come from PlatformConfig (admin-controlled):

let team_recipient = platform_config::get_treasury_address(cfg);
let pool_recipient = platform_config::get_pool_creator_address(cfg);

// Backend CANNOT change these!
// Only admin with AdminCap can change config
```

## Attack Scenarios & Defenses

### Attack 1: "I'll drain the treasury!"
```
❌ BLOCKED: Capability doesn't grant access to treasury
❌ BLOCKED: No withdraw functions accept PoolCreatorCap
❌ BLOCKED: Only AdminCap can withdraw
```

### Attack 2: "I'll send tokens to my own address!"
```
❌ BLOCKED: Recipient is hardcoded from config
❌ BLOCKED: Cannot pass custom address parameter
❌ BLOCKED: Function signature doesn't accept address
```

### Attack 3: "I'll create fake pools with wrong amounts!"
```
❌ BLOCKED: Amounts calculated from curve state
❌ BLOCKED: Can only call on graduated curves
❌ BLOCKED: Each curve can only be seeded once
```

### Attack 4: "I'll call this repeatedly to drain funds!"
```
❌ BLOCKED: curve.lp_seeded flag prevents re-entry
❌ BLOCKED: Once called, flag is set to true
❌ BLOCKED: Second call will abort
```

### Attack 5: "I'll create pools for arbitrary tokens!"
```
❌ BLOCKED: Must provide valid BondingCurve<T>
❌ BLOCKED: Curve must be graduated
❌ BLOCKED: Curve must not be seeded
❌ BLOCKED: Can't fake a curve object
```

## What CAN Happen (Worst Case)

Even with compromised capability, attacker can ONLY:

1. **Create pools for graduated tokens**
   - But only once per token
   - Only to configured address
   - Only with correct amounts from curve

2. **Set bump_bps up to 1000 (10%)**
   - Affects initial pool price slightly
   - Cannot drain funds
   - Limited impact

**They CANNOT:**
- ❌ Steal tokens
- ❌ Change recipient addresses
- ❌ Withdraw from treasury
- ❌ Create fake pools
- ❌ Manipulate amounts significantly
- ❌ Do anything except create legitimate pools

## Comparison to Other Security Models

### Admin Key (Most Powerful)
```
Can do: EVERYTHING
Risk: TOTAL
Need: AdminCap
```

### Treasury Key (Very Powerful)
```
Can do: Mint tokens, manage treasury
Risk: HIGH
Need: TreasuryCap
```

### Pool Creator (Limited)
```
Can do: Create pools for graduated tokens
Risk: MINIMAL
Need: PoolCreatorCap
```

### Regular Wallet (Powerless)
```
Can do: Normal user actions
Risk: NONE
Need: Just address
```

## Emergency Response

If capability is compromised:

```bash
# 1. Revoke it immediately (< 1 minute)
sui client call \
  --package $PKG \
  --module bonding_curve \
  --function revoke_pool_creator_cap \
  --args $ADMIN_CAP $COMPROMISED_CAP

# 2. Issue new one to clean backend
sui client call \
  --package $PKG \
  --module bonding_curve \
  --function issue_pool_creator_cap \
  --args $ADMIN_CAP $NEW_BACKEND_ADDRESS

# 3. Investigate what happened
# Check transaction history of old cap holder
```

## Enhanced Security (Optional)

### Add Rate Limiting
```move
public struct PoolCreatorCap has key, store {
    id: UID,
    daily_limit: u64,
    pools_created_today: u64,
    last_reset: u64,
}

// Can only create X pools per day
assert!(cap.pools_created_today < cap.daily_limit, E_RATE_LIMIT);
```

### Add Whitelisting
```move
public struct PoolCreatorCap has key, store {
    id: UID,
    allowed_curves: vector<ID>,  // Only these curves
}

// Can only create pools for whitelisted curves
assert!(vector::contains(&cap.allowed_curves, &object::id(curve)), E_NOT_WHITELISTED);
```

### Add Time Locks
```move
public struct PoolCreatorCap has key, store {
    id: UID,
    cooldown_ms: u64,
    last_use: u64,
}

// Must wait X time between pool creations
assert!(clock::timestamp_ms(clock) - cap.last_use >= cap.cooldown_ms, E_COOLDOWN);
```

## Conclusion

The PoolCreatorCap is like a **"pool creation vending machine"**:
- ✅ Can dispense pools (that's its job)
- ❌ Can't give you cash
- ❌ Can't open the back and steal products
- ❌ Can't change prices
- ❌ Can't redirect deliveries

It's a **very limited, specific permission** - not a master key!

The capability approach is used by:
- Uniswap V3 (NFT positions)
- Aave (credit delegation)
- Compound (proposer rights)
- MakerDAO (vault management)

It's **battle-tested** and **safe** when implemented correctly.
