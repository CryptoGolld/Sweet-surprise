# 🚀 Upgrade Guide: v0.0.8 → v0.0.9

## 📝 What's Changing

**Single change:** Remove AdminCap requirement from `prepare_liquidity_for_bot()`

### Before (v0.0.8):
```move
public entry fun prepare_liquidity_for_bot<T: drop>(
    _admin: &AdminCap,  // ← Had to pass AdminCap (even though unused)
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    ctx: &mut TxContext
)
```

**Problem:** Bot wallet had to OWN AdminCap object (security risk!)

### After (v0.0.9):
```move
public entry fun prepare_liquidity_for_bot<T: drop>(
    cfg: &PlatformConfig,  // ← AdminCap removed!
    curve: &mut BondingCurve<T>,
    ctx: &mut TxContext
)
```

**Better:** Authorization via `lp_bot_address` only (cleaner, safer!)

---

## ✅ What WON'T Break

**ALL other AdminCap functions still work:**
- ✅ Admin panel (`app/admin/page.tsx`) - Still uses AdminCap
- ✅ `set_lp_bot_address()` - Still requires AdminCap
- ✅ `set_special_launch()` - Still requires AdminCap
- ✅ `freeze_trading()` - Still requires AdminCap
- ✅ Platform config functions - Still require AdminCap

**Only `prepare_liquidity_for_bot()` changes!**

---

## 🔧 Upgrade Steps

### 1. Prerequisites

Make sure you have in your `.env`:
```bash
# Deployer wallet (MUST own UpgradeCap)
DEPLOYER_PRIVATE_KEY=your_private_key
# OR
DEPLOYER_SEED_PHRASE=your_seed_phrase
```

### 2. Run Upgrade Script

```bash
cd /workspace/contracts

# Install dependencies (if needed)
npm install

# Run upgrade
npx tsx upgrade-v0.0.9.ts
```

**What it does:**
1. ✅ Builds upgraded contract
2. ✅ Creates upgrade transaction using UpgradeCap
3. ✅ Deploys new package version
4. ✅ Gives you new PLATFORM_PACKAGE ID

### 3. Update Environment Variables

**Get new package ID from upgrade output:**
```bash
🎉 NEW PACKAGE ID: 0x...new_package_id...
```

**Update on Ubuntu Server:**

```bash
# Update frontend constants
cd /var/www/Sweet-surprise
nano lib/constants.ts
# Change PLATFORM_PACKAGE to new ID

# Update pool bot
cd /var/www/Sweet-surprise/pool-creation-bot
nano .env
# Change PLATFORM_PACKAGE to new ID
# REMOVE the ADMIN_CAP line!

# Update indexer (if it uses PLATFORM_PACKAGE)
cd /var/www/Sweet-surprise/indexer
nano .env
# Change PLATFORM_PACKAGE to new ID
```

### 4. Restart Services

```bash
# Restart pool bot
pm2 restart pool-creation-bot

# Rebuild and redeploy frontend (if on Ubuntu)
cd /var/www/Sweet-surprise
npm run build
pm2 restart your-frontend-service

# OR just push to GitHub and Vercel will auto-deploy
git add -A
git commit -m "Update to v0.0.9 package"
git push
```

### 5. Transfer AdminCap Back to Admin Wallet (Optional Security)

Since bot no longer needs AdminCap:

```bash
# Transfer AdminCap back to your admin wallet
sui client transfer \
  --object-id 0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11 \
  --to YOUR_ADMIN_WALLET_ADDRESS \
  --gas-budget 10000000
```

---

## 🧪 Testing Checklist

After upgrade, test:

- [ ] Existing tokens still trade normally
- [ ] New token creation works
- [ ] Buy/sell works
- [ ] Admin panel still works (with your admin wallet)
- [ ] Bot can still process graduations (test with graduated token)

---

## 🔄 Rollback Plan

If something breaks:

**Option 1: Revert constants**
```bash
# Change PLATFORM_PACKAGE back to v0.0.8:
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
```

**Option 2: Re-upgrade** (if you need to fix contract)
- Fix the contract code
- Run `upgrade-v0.0.9.ts` again
- Sui package upgrades are forward-only (can't downgrade)

---

## 📊 Expected Results

### Gas Cost
- **Upgrade tx:** ~0.2-0.5 SUI

### Downtime
- **0 seconds!** Upgrade is atomic
- Old package still works during upgrade
- No service interruption

### User Impact
- **None!** All existing tokens/curves work
- Users won't notice anything
- Only bot behavior changes (internal)

---

## 🆘 Troubleshooting

### Error: "Invalid upgrade - not backward compatible"

**Cause:** Changing struct definitions or removing public functions

**Fix:** This upgrade only modifies a function parameter (safe), so shouldn't happen

### Error: "Upgrade cap not owned by signer"

**Cause:** Wrong deployer wallet

**Fix:** Use the wallet that originally deployed v0.0.8

### Bot still failing after upgrade

**Checks:**
1. Did you update PLATFORM_PACKAGE in bot's `.env`?
2. Did you remove ADMIN_CAP from `.env`?
3. Did you restart bot (`pm2 restart pool-creation-bot`)?
4. Is bot address still configured in platform_config?

```bash
# Check bot address config
sui client object 0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9 --json | grep lp_bot_address
```

---

## 🎁 Benefits After Upgrade

1. **🔒 Better Security:** Bot wallet doesn't need AdminCap
2. **🧹 Cleaner Code:** Simpler function signature
3. **📉 Lower Risk:** AdminCap can stay with admin only
4. **✅ Same Functionality:** Everything else works exactly the same

---

## 📞 Support

If upgrade fails or something breaks:
1. Check the upgrade transaction on explorer
2. Check PM2 logs: `pm2 logs pool-creation-bot`
3. Verify package ID is correct in all `.env` files
4. Test a graduation manually to see exact error

---

Ready to upgrade? Run:
```bash
cd /workspace/contracts
npx tsx upgrade-v0.0.9.ts
```
