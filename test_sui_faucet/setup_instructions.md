# TestSUI Faucet Setup Instructions

## Current Status

✅ Package Published: `0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f`
✅ AdminCap Created: `0x74b4ed085d825b2f37c9a17dac5c7508397b4d08120527e9c11d5475029bfc13`
⚠️ Faucet Shared Object: **Needs to be created**

## Next Steps

### 1. Get a TreasuryCap

You need a TreasuryCap for TEST_SUI to create the faucet. You can either:

**Option A: Use the SDK to mint a new TreasuryCap** (recommended for fresh deployment)
```typescript
// This would require calling test_sui::init again, which only works on first publish
// So we need to publish a NEW instance or find the existing TreasuryCap
```

**Option B: Find the existing TreasuryCap** (it was consumed in a previous transaction)
The TreasuryCap `0x95f323ac037846024d40ca534199939a08797e8ebd5ab2960c3fc87e1f0bcc3d` was moved/consumed.

### 2. Recommended Solution: Fresh Deployment

Since we had some testing issues, the cleanest approach is:

```bash
# 1. Publish the package fresh
cd /workspace/test_sui_faucet
sui client publish --gas-budget 200000000

# 2. Note the TreasuryCap object ID from the output
# 3. Create the faucet with that TreasuryCap
sui client call \
  --package <NEW_PACKAGE_ID> \
  --module faucet \
  --function create_faucet \
  --args <TREASURY_CAP_ID> \
  --gas-budget 50000000

# 4. Test claiming
sui client call \
  --package <NEW_PACKAGE_ID> \
  --module faucet \
  --function claim \
  --args <FAUCET_ID> 0x6 \
  --gas-budget 50000000
```

## What You Have Now

1. **TEST_SUI Coin Package** - A testnet coin that mimics real SUI
2. **Faucet Module** with:
   - 100 TEST_SUI claims every 6 hours
   - Admin unlimited minting
   - Auto-refill mechanism
3. **Admin Cap** for unlimited minting

## Integration with SuiLFG Launch Platform

Once the faucet is set up, you can:
1. Use TEST_SUI instead of real SUI for all testnet operations
2. Create Cetus pools with TEST_SUI pairs
3. Test bonding curves with TEST_SUI
4. Display real SUI price in your frontend (but use TEST_SUI for transactions)

## Cetus Integration

YES! Cetus will work with TEST_SUI:
- You can create any pool: TEST_SUI/USDC, TEST_SUI/MEMECOIN, etc.
- All the same AMM mechanics work
- Your bonding curve can graduate tokens to TEST_SUI pools

## About Memecoin Vanity Addresses

Unfortunately, you **cannot** make contract addresses end with specific strings like "MemeFi" because:
- Addresses are SHA3-256 hashes of the transaction
- They're completely deterministic
- You'd need to brute-force billions of transactions to get "MemeFi" at the end (impractical and expensive)

**Alternative approaches:**
1. Use display names prominently (e.g., "PEPE_SuiLFG")
2. Add "Powered by SuiLFG MemeFi" branding
3. Use the coin symbol/name to include your branding
4. Focus on domain names and frontend URLs instead

Example:
- Coin: `PepeCoin` 
- Symbol: `PEPE_SuiLFG`
- Description: "Launched on SuiLFG MemeFi platform"
- Platform URL: `suilfg.memeFi` or similar
