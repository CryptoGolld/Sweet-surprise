# Pool Creation Security Upgrade

## 🔒 Changes Implemented

### 1. LP Bot Address Security

**Added to PlatformConfig:**
```move
lp_bot_address: address  // Only this address can receive LP tokens
```

**New Admin Functions:**
```move
// Set the authorized bot address
public entry fun set_lp_bot_address(_admin: &AdminCap, cfg: &mut PlatformConfig, addr: address)

// Get the bot address
public fun get_lp_bot_address(cfg: &PlatformConfig): address
```

**Modified prepare_liquidity_for_bot:**
```move
public entry fun prepare_liquidity_for_bot<T: drop>(
    _admin: &AdminCap,
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    ctx: &mut TxContext  // ✅ No more burn_54m parameter!
) {
    // SECURITY: Only configured bot address can call
    let bot_address = platform_config::get_lp_bot_address(cfg);
    assert!(sender(ctx) == bot_address, E_UNAUTHORIZED_BOT);
    
    // ... rest of code ...
    
    // LP tokens go to bot_address (not sender)
    transfer::public_transfer(lp_sui, bot_address);
    transfer::public_transfer(lp_tokens, bot_address);
}
```

**Benefits:**
- ✅ Even if AdminCap leaks, only configured bot can receive LP tokens
- ✅ Admin can change bot address anytime
- ✅ Extra security layer

---

### 2. Special Launch Flag (Simplified Bot Logic)

**Added Functions:**
```move
// ADMIN: Mark curve as special launch BEFORE graduation
public entry fun set_special_launch<T: drop>(
    _admin: &AdminCap,
    curve: &mut BondingCurve<T>,
    is_special: bool
) {
    assert!(!curve.lp_seeded, E_ALREADY_SEEDED);
    curve.special_launch = is_special;
}

// View function
public fun is_special_launch<T: drop>(curve: &BondingCurve<T>): bool {
    curve.special_launch
}
```

**Modified prepare_liquidity_for_bot:**
```move
// Handle 54M tokens based on special_launch flag
let treasury_tokens = coin::mint(&mut curve.treasury, burn_or_treasury_amount * 1_000_000_000, ctx);
if (curve.special_launch) {
    // ✅ Special launch: 54M to treasury
    transfer::public_transfer(treasury_tokens, treasury_address);
} else {
    // ✅ Normal launch: burn 54M
    coin::burn(&mut curve.treasury, treasury_tokens);
};
```

**Benefits:**
- ✅ Bot doesn't need to track which tokens are special
- ✅ Bot calls same function for ALL tokens
- ✅ Admin controls it on-chain, not in database
- ✅ More transparent and less error-prone

---

## 📊 Token Distribution After Pool Creation

### Normal Launch (special_launch = false):
```
Total Supply: 1,000,000,000 tokens

On Bonding Curve: 737,000,000 (sold to users)
For Cetus Pool:   207,000,000 (liquidity)
Team Allocation:    2,000,000 (to treasury)
Burned:            54,000,000 (deflationary!)
-----------------------------------
Total Minted:     946,000,000 tokens
```

### Special Launch (special_launch = true):
```
Total Supply: 1,000,000,000 tokens

On Bonding Curve: 737,000,000 (sold to users)
For Cetus Pool:   207,000,000 (liquidity)
Team Allocation:    2,000,000 (to treasury)
Treasury Reserve:  54,000,000 (to treasury, not burned!)
-----------------------------------
Total Minted:   1,000,000,000 tokens (ALL)
```

---

## 🚀 Deployment Steps

### Step 1: Upgrade Contract
```bash
cd contracts/suilfg_launch_with_memefi_testnet
sui move build
sui client upgrade --gas-budget 500000000
```

### Step 2: Configure Bot Address
```bash
# Set your bot's address
sui client call \
  --package $PLATFORM_PACKAGE \
  --module platform_config \
  --function set_lp_bot_address \
  --args $ADMIN_CAP $PLATFORM_STATE $BOT_ADDRESS \
  --gas-budget 10000000
```

### Step 3: Mark Special Launches (Optional)
```bash
# For special launches only (BEFORE graduation):
sui client call \
  --package $PLATFORM_PACKAGE \
  --module bonding_curve \
  --function set_special_launch \
  --type-args "$COIN_TYPE" \
  --args $ADMIN_CAP $CURVE_ID true \
  --gas-budget 10000000
```

### Step 4: Bot Creates Pool (Same for All Tokens!)
```bash
# Bot runs this (same code for normal AND special launches):
sui client call \
  --package $PLATFORM_PACKAGE \
  --module bonding_curve \
  --function prepare_liquidity_for_bot \
  --type-args "$COIN_TYPE" \
  --args $ADMIN_CAP $PLATFORM_STATE $CURVE_ID \
  --gas-budget 100000000
```

---

## 🤖 Bot Code Simplification

### BEFORE (Complex):
```typescript
// Bot needed database tracking
const tokenInfo = await db.query('SELECT is_special FROM tokens WHERE id = ?', [curveId]);
const isSpecial = tokenInfo.is_special;
const burn54m = !isSpecial;  // Confusing!

await preparePool({
  curveId,
  burn_54m: burn54m,  // Different for each token
});
```

### AFTER (Simple):
```typescript
// Bot just calls same function for ALL tokens
await preparePool({
  curveId,  // That's it! Contract handles special launches automatically
});
```

**Bot doesn't need to know or care if it's special!**

---

## 🔐 Security Improvements

| Before | After |
|--------|-------|
| LP tokens → `sender(ctx)` | LP tokens → `lp_bot_address` |
| Anyone with AdminCap can receive | Only configured bot receives |
| No audit trail of bot | Clear bot address on-chain |
| Special status in DB | Special status on-chain |
| Database sync issues | Single source of truth |

---

## 📝 Admin Cheat Sheet

### Change Bot Address:
```bash
sui client call --function set_lp_bot_address --args $ADMIN_CAP $CONFIG $NEW_BOT_ADDRESS
```

### Mark Token as Special Launch:
```bash
# Do this BEFORE graduation completes
sui client call --function set_special_launch --type-args "$COIN_TYPE" --args $ADMIN_CAP $CURVE_ID true
```

### Remove Special Launch Flag:
```bash
sui client call --function set_special_launch --type-args "$COIN_TYPE" --args $ADMIN_CAP $CURVE_ID false
```

### Check if Token is Special:
```bash
# Query the curve object to see special_launch field
sui client object $CURVE_ID --json | jq '.data.content.fields.special_launch'
```

---

## ⚠️ Important Notes

1. **Special launch flag** must be set BEFORE `lp_seeded = true`
2. **Bot address** should be set immediately after contract deployment
3. **Bot needs AdminCap** to call `prepare_liquidity_for_bot`
4. **Only bot address** receives LP tokens (extra security)
5. **All existing curves** have `special_launch = false` (normal behavior)

---

## Next Steps

After deploying this upgrade:

1. ✅ Set bot address: `set_lp_bot_address(admin, cfg, bot_wallet)`
2. ✅ For special launches: `set_special_launch(admin, curve, true)`
3. ✅ Bot calls same function for all tokens
4. ✅ Contract automatically handles burn vs treasury based on flag
