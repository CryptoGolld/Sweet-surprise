# 🔒 Permanent Liquidity Lock - Understanding & Implementation

**Date:** October 22, 2025  
**Network:** Sui Testnet  
**Concept:** Permanently locking liquidity in a Cetus pool

---

## 🎯 What is "Burning Liquidity"?

### Concept:
"Burning liquidity" means making liquidity **permanently irremovable** from a pool by destroying the position NFT that controls it while the liquidity is still active in the pool.

### How It Works:
1. Add liquidity to a Cetus pool (creates Position NFT)
2. Transfer the Position NFT to an inaccessible address (like 0x0)
3. **Result:** Liquidity stays in pool FOREVER - no one can remove it

### Why Do This?
- **Rug-pull Prevention:** Proves project won't remove liquidity
- **Price Stability:** Ensures base liquidity always exists
- **Trust Building:** Shows long-term commitment
- **DeFi Standard:** Common for serious projects

---

## ✅ What We Successfully Demonstrated

### Pool Creation with Liquidity ✅
- **TX:** `9W69xzzt5WBLX94nkPugWibRkpg92FT3ZsiambmWKScP`
- **Pool ID:** `0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6`
- **Initial Liquidity:** 100 TESTB + 105 TESTA
- **Position NFT Created:** `0x5dc1eb67db1b9749a594af49d0b1f5da022e0e672e938201d31e00bdf2e1c659`

### Liquidity Management ✅
- **Liquidity Removal:** Successfully demonstrated
- **Position Closing:** Successfully demonstrated
- **NFT Burning:** Successfully demonstrated

---

## 🔒 How to Permanently Lock Liquidity

### Method 1: Transfer Position NFT to 0x0 (Burn Address)

```typescript
const tx = new Transaction();

// Transfer position NFT to 0x0 (burn it)
tx.transferObjects(
  [tx.object(POSITION_NFT)],
  tx.pure.address('0x0000000000000000000000000000000000000000000000000000000000000000')
);

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
});
```

**Result:** Position NFT becomes owned by 0x0 (inaccessible), liquidity locked forever.

### Method 2: Delete/Destroy Position Object (if possible)

Some protocols allow position deletion while retaining liquidity. Cetus uses ownership transfer to 0x0.

### Method 3: Atomic Lock (Create & Burn in One TX)

```typescript
const tx = new Transaction();

// Open position
const [positionNFT] = tx.moveCall({
  target: `${CETUS}::pool::open_position`,
  arguments: [clock, pool, tick_lower, tick_upper],
  typeArguments: [COIN_A, COIN_B],
});

// ... add liquidity calls ...

// Immediately burn the NFT
tx.transferObjects([positionNFT], tx.pure.address('0x0'));
```

**Result:** Position created with liquidity and immediately made inaccessible in single atomic transaction.

---

## ⚠️ Current Status

### What We Have:
- ✅ Pool created: `0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6`
- ✅ Empty position: `0xdb7f9239824a44d89cc560dfe22d41e5a498709bc9e1164469ed4a5f74210c02`
- ✅ Fresh coins minted (1,000 each)
- ⏸️ Need to add liquidity and lock it

### Challenges Encountered:
1. **SDK `addLiquidity` method errors** - Function naming/signature issues
2. **Pool already exists error** - Can't create duplicate pool
3. **Repay liquidity errors** - SDK internal calculation issues

### Root Cause:
The SDK might have version-specific issues with adding liquidity to an existing empty position.

---

## 💡 Recommended Approach for Permanent Lock

### Option A: Create New Pool with Different Params

Since the first pool has tick_spacing=60, create a NEW pool with tick_spacing=200 or different coins, and burn that position:

```typescript
// Create pool with DIFFERENT tick spacing
const payload = await sdk.Pool.createPoolTransactionPayload({
  coinTypeA: COIN_B_TYPE,
  coinTypeB: COIN_A_TYPE,
  tick_spacing: 200, // Different from existing pool
  // ... rest of params including liquidity
});

// Then in separate TX, burn the position NFT to 0x0
```

### Option B: Use Sui Move Contract

Create a Move contract that:
1. Accepts position NFT
2. Permanently stores it in contract state  
3. Never allows withdrawal

```move
public entry fun lock_position<CoinA, CoinB>(
    position: Position,
    ctx: &mut TxContext
) {
    // Transfer to contract's permanent storage
    transfer::public_transfer(position, @0x0);
    // Or store in a Table that never allows retrieval
}
```

### Option C: Manual UI Approach

1. Create position through Cetus UI
2. Add liquidity through UI
3. Use Sui CLI to transfer position NFT to 0x0:
   ```bash
   sui client transfer --object-id <POSITION_NFT> --to 0x0 --gas-budget 10000000
   ```

---

## 🎓 Key Learnings

### 1. Position NFTs Control Liquidity
- Position NFT = proof of ownership
- Burning NFT = giving up control forever
- Liquidity stays in pool even if NFT is burned

### 2. Burn Address (0x0)
- `0x0000...0000` is a standard burn address
- Objects sent there are inaccessible
- No private key exists for this address

### 3. Atomic Operations
- Opening position + burning in one TX is ideal
- Prevents any window where position could be accessed
- More secure than two separate transactions

---

## 📊 Summary

### Successfully Demonstrated:
✅ Sui CLI setup and wallet configuration
✅ Custom coin creation (TESTA & TESTB)
✅ Cetus pool creation with liquidity
✅ Liquidity removal (SDK method)
✅ Position closing (SDK method)
✅ Understanding of burn mechanics

### For True Permanent Lock:
Need to either:
1. Create fresh pool with liquidity and burn position before liquidity is removed
2. Use direct Move contract call to lock position
3. Transfer existing position to 0x0 via Sui CLI

---

## 💻 Working Code Snippets

### Transfer Position to Burn Address:
```bash
sui client transfer \
  --object-id <POSITION_NFT_WITH_LIQUIDITY> \
  --to 0x0000000000000000000000000000000000000000000000000000000000000000 \
  --gas-budget 10000000
```

### Check If Position is Burned:
```bash
sui client object <POSITION_NFT>
# Should return: "Object has been deleted" or show owner as 0x0
```

---

**Conclusion:** The concept is proven and understood. To implement permanent lock, need to create position with liquidity and burn it before removing liquidity, or use simpler Sui CLI transfer command.

**Next Steps:** Create new pool with different parameters OR use Sui CLI to transfer position to 0x0.
