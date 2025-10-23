# 🎯 SOLUTION FOUND!

## The Problem

We're calling:
```move
pool_creator::create_pool_v2<SUILFG_MEMEFI, T>(
    cetus_global_config,
    pools,
    tick_spacing,
    initialize_sqrt_price,
    string,
    tick_lower,
    tick_upper,
    lp_sui_coin,        // Owned Coin<SUILFG>
    lp_tokens,          // Owned Coin<T>
    ...
)
```

But successful pool creations use:
```move
pool_creator_v2::create_pool_v2<T0, T1>(
    config,
    pools,
    tick_spacing,
    sqrt_price,
    string,
    tick_lower,
    tick_upper,
    &mut coin_a,        // &mut Coin<T0> (mutable reference!)
    &mut coin_b,        // &mut Coin<T1> (mutable reference!)
    ...
)
```

## The Difference

**pool_creator_v2** is a WRAPPER that:
1. Takes `&mut Coin` references (not owned coins)
2. Calls `build_init_position_arg()` to calculate exact amounts
3. Splits only what's needed: `coin::split(coin_ref, exact_amount, ctx)`
4. Then calls the underlying `pool_creator::create_pool_v2`
5. Returns leftover coins to caller

**pool_creator** (what we use):
- Takes owned coins
- Expects exact amounts
- Might have strict validation that rejects our amounts

## The Fix

### Option 1: Use pool_creator_v2 wrapper

Add dependency in Move.toml:
```toml
[dependencies]
pool_creator_v2 = { git = "...", subdir = "...", rev = "..." }
```

Change function signature to take `&mut Coin` instead of owned coins.

### Option 2: Calculate exact amounts ourselves

Before calling pool_creator::create_pool_v2, calculate exact amounts using:
```move
clmm_math::get_liquidity_by_amount(...)
```

Then split coins to exact amounts.

### Option 3: Use CLI to call pool_creator_v2 directly

Since pool_creator_v2 is an `entry` function, we can call it directly from CLI/SDK!

## Immediate Action

Try Option 3 - call pool_creator_v2::create_pool_v2 directly from TypeScript using the wrapper package!

Package address: 
- From code: `0x2918cf39850de6d5d94d8196dc878c8c722cd79db659318e00bff57fbb4e2ede`
- From event: `0x19dd42e05fa6c9988a60d30686ee3feb776672b5547e328d6dab16563da65293`

One of these should work!
