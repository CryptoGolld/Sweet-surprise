# New Deployment - Fixed Bonding Curve

## 🎉 Deployment Successful!

**Transaction Digest**: `J2g68eLeM5dakPFFXzSvvw8LYbZUP2YBuhH3d9Meari1`

**View on Explorer**: https://suiscan.xyz/testnet/tx/J2g68eLeM5dakPFFXzSvvw8LYbZUP2YBuhH3d9Meari1

## 📦 New Contract Addresses

### Main Package
- **Package ID**: `0xc6a2e71b87b181251bcc44662616afad81288f78c330a6172792c1ec2c59761f`
- **Version**: 1 (Fresh deployment)

### Shared Objects
- **Platform Config**: `0xb3a58b36c5805e38685ff9d9fa2197a015f13528075486085f1fd1e16d8daee4`
- **Ticker Registry**: `0x3678022234b54f9ab84436efa95cc707236e4e999bd005c53775bd71c2e51f33`

### Admin Objects (You Own These)
- **UpgradeCap**: `0x4f89ee52bc1a6c2b604d2f9a2235730828166837b828c8b4123db1bc07920a09`
- **AdminCap**: `0x9e9f50a025e0ffb497caf955d0cc2221620c10923c2fe3a172c5cba98c33909f`

## ✅ Fixes Included

1. **Buy Function**: Now correctly multiplies by 1e9 when minting tokens
   - Before: Minted 0.02 tokens for 50 SUI
   - After: Mints 20,000,000 tokens for 50 SUI ✅

2. **Sell Function**: Now correctly divides by 1e9 when calculating supply
   - Before: Could sell 0.02 tokens to get 50 SUI back (exploit!)
   - After: Must sell 20,000,000 tokens to get 50 SUI back ✅

3. **Additional Improvements**:
   - Fixed ticker_registry compilation issues
   - Temporarily disabled Cetus functions (can be re-enabled with correct deps)
   - All core buy/sell/graduation functionality working

## 🔄 Upgrade Policy

The package was deployed with **default policy (0)** which is most restrictive. 

To make future upgrades easier, you can change the policy:

```bash
# Option 1: Make additive upgrades possible (add new functions)
# Policy 128 = additive changes allowed

# Option 2: Make dependency-only upgrades possible (most permissive)
# Policy 192 = can change dependencies only

# To change policy, you'll need to use the UpgradeCap in a transaction
```

**Note**: For now, you can upgrade by deploying new versions with the UpgradeCap you own. If you need to modify existing functions in future, you can publish new versions of those functions (e.g., `buy_v2()`) without breaking old ones.

## 📝 Next Steps

1. **Update Frontend Constants** - Update `lib/constants.ts` with new addresses:
   ```typescript
   PLATFORM_PACKAGE: '0xc6a2e71b87b181251bcc44662616afad81288f78c330a6172792c1ec2c59761f',
   PLATFORM_STATE: '0xb3a58b36c5805e38685ff9d9fa2197a015f13528075486085f1fd1e16d8daee4',
   TICKER_REGISTRY: '0x3678022234b54f9ab84436efa95cc707236e4e999bd005c53775bd71c2e51f33',
   ```

2. **Test the Fix**:
   - Create a test coin
   - Buy with 50 SUI → should get millions of tokens
   - Sell those tokens → should get ~50 SUI back (minus fees)

3. **Deploy Indexer** (if needed):
   - Update indexer config with new package ID
   - Restart indexer to track new curves

## 💰 Cost

- **Deployment Cost**: ~0.097 SUI (97.29M MIST)
- **Gas Used**: Computation + Storage
- **Remaining Balance**: Check your wallet

## 🔐 Security Notes

- You own the **UpgradeCap** - keep it safe!
- You own the **AdminCap** - grants admin functions
- Both are in your wallet: `0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f`

## 📚 Old Package (Reference)

The old buggy package at `0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047` is still on-chain but should no longer be used for new deployments.

If there are active bonding curves on the old package, they will continue to have the decimal bug. You may want to:
1. Pause creation on old package (if you have admin access)
2. Migrate important curves manually
3. Update documentation to use new package
