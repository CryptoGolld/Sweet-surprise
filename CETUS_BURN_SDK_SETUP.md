# Cetus LP Burn SDK Setup

## 📦 Installing from GitHub

The Cetus LP Burn SDK is not on npm registry, so we install directly from GitHub:

```json
{
  "dependencies": {
    "@cetusprotocol/cetus-lp-burn-sdk": "github:CetusProtocol/cetus-lp-burn-sdk"
  }
}
```

---

## 🔥 What LP Burning Does

### Traditional LP (Without Burning):

```
Create Pool → Add Liquidity → Get LP NFT
  ↓
LP NFT in wallet
  ├─ Can remove liquidity anytime
  ├─ Can sell/transfer LP NFT
  └─ Can claim trading fees

Problem: Creator can rug pull! ❌
```

### With LP Burning (Cetus Burn Manager):

```
Create Pool → Add Liquidity → Get LP NFT → BURN IT
  ↓
LP NFT burned (destroyed)
  ├─ ✅ CANNOT remove liquidity (locked forever)
  ├─ ✅ CANNOT sell/transfer LP NFT (doesn't exist)
  └─ ✅ CAN STILL claim trading fees! 🎉

Result: Liquidity permanently locked, anti-rug! ✅
```

---

## 🎯 How It Works

### 1. Create Pool & Add Liquidity (Normal)

```javascript
// Create Cetus pool
const pool = await cetusSDK.Pool.createPool({
  coinTypeA: '0x2::sui::SUI',
  coinTypeB: tokenType,
  tickSpacing: 200, // 1% fees
});

// Add full-range liquidity
const position = await cetusSDK.Position.addLiquidity({
  poolAddress: pool.poolAddress,
  tickLower: -443636,
  tickUpper: 443636,
  amount: '12000000000000', // 12K SUI
});

// Now you have: LP NFT (position)
```

### 2. Burn The LP NFT (Special)

```javascript
// Use Cetus LP Burn SDK
const burnTx = await lpBurnSDK.burnPositionTransactionPayload({
  pool_id: poolAddress,
  position_id: position.positionId,
  collect_fee: true, // Collect any fees before burning
});

await signAndExecuteTransaction(burnTx);

// LP NFT is now DESTROYED
// Liquidity is LOCKED FOREVER
// But fees can STILL be claimed!
```

---

## 💰 Fee Claiming After Burn

Even though LP NFT is burned, fees can still be claimed:

```javascript
// The burn creates a "fee collector" object
// Bot address owns this object
// Can claim fees anytime:

const claimTx = await lpBurnSDK.collectFeesTransactionPayload({
  pool_id: poolAddress,
  // Fee collector object automatically found
});

await signAndExecuteTransaction(claimTx);

// Fees sent to bot address! 💰
```

---

## 🔧 Bot Implementation

### Initialize SDK:

```javascript
import { LpBurnSDK } from '@cetusprotocol/cetus-lp-burn-sdk';

const lpBurnSDK = new LpBurnSDK({
  network: 'testnet', // or 'mainnet'
  fullNodeUrl: 'https://fullnode.testnet.sui.io:443',
});
```

### Burn LP After Pool Creation:

```javascript
async function burnLPTokens(poolAddress, positions) {
  for (const position of positions) {
    // Create burn transaction
    const burnPayload = await lpBurnSDK.burnPositionTransactionPayload({
      pool_id: poolAddress,
      position_id: position.pos_object_id,
      collect_fee: true,
    });
    
    // Execute
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: burnPayload,
    });
    
    console.log('✅ LP burned!', result.digest);
  }
}
```

---

## 📊 Before vs After

### Without LP Burn SDK:

| Action | Possible? | Risk |
|--------|-----------|------|
| Remove liquidity | ✅ Yes | High (rug pull) |
| Sell LP NFT | ✅ Yes | High (transfer risk) |
| Claim fees | ✅ Yes | N/A |

**Problem:** Creator can remove liquidity anytime! ❌

### With LP Burn SDK:

| Action | Possible? | Risk |
|--------|-----------|------|
| Remove liquidity | ❌ No | Zero (locked) |
| Sell LP NFT | ❌ No | Zero (burned) |
| Claim fees | ✅ Yes | N/A |

**Benefit:** Liquidity locked forever, but fees still claimable! ✅

---

## 🎉 Why This Is Perfect

1. **Anti-Rug Protection**
   - Liquidity cannot be removed
   - LP NFT is destroyed
   - Users can trade safely

2. **Platform Revenue**
   - Trading fees (1%) accumulate
   - Bot can claim fees regularly
   - Sustainable revenue model

3. **Full Transparency**
   - Users can verify LP is burned on-chain
   - Check burn transaction on explorer
   - See fee collector object

---

## 🚀 Complete Flow

```
1. Token graduates
   ↓
2. Bot extracts ~12K SUI + tokens from curve
   ↓
3. Bot creates Cetus pool (1% fees)
   ↓
4. Bot adds full-range liquidity
   ↓ Creates LP NFT
5. Bot BURNS LP NFT using Burn SDK
   ↓ LP NFT destroyed
   ↓ Creates fee collector object
6. Liquidity LOCKED FOREVER
   ↓
7. Trading fees accumulate
   ↓
8. Bot claims fees regularly
   ↓
9. Platform profits, users trade safely! 🎉
```

---

## 📝 Ubuntu Installation Commands

```bash
cd /var/www/Sweet-surprise

# Pull latest code with Burn SDK integration
git pull origin cursor/handle-basic-instruction-55f2

# Install from GitHub
cd pool-creation-bot
rm -rf node_modules package-lock.json
npm install

# Should now install from GitHub successfully!
```

---

## ✅ Verification

After bot burns LP, verify on blockchain:

1. **Check LP NFT is gone:**
   ```
   Visit: https://testnet.suivision.xyz/object/[POSITION_ID]
   Should show: "Object not found" or "Destroyed"
   ```

2. **Check fee collector exists:**
   ```
   Query bot's objects
   Should show: Fee collector object for that pool
   ```

3. **Verify liquidity locked:**
   ```
   Visit Cetus pool page
   Liquidity: Cannot be removed
   Fees: Still accumulating
   ```

---

## 🔍 API Reference

### burnPositionTransactionPayload

```typescript
await lpBurnSDK.burnPositionTransactionPayload({
  pool_id: string,      // Cetus pool address
  position_id: string,  // LP NFT position ID
  collect_fee: boolean, // Collect fees before burning
});
```

**Returns:** Transaction to burn LP position

### collectFeesTransactionPayload

```typescript
await lpBurnSDK.collectFeesTransactionPayload({
  pool_id: string,      // Cetus pool address
});
```

**Returns:** Transaction to claim accumulated fees

---

## 🎯 Summary

**Cetus LP Burn SDK allows:**
- ✅ Permanently lock liquidity (anti-rug)
- ✅ Still claim trading fees (revenue)
- ✅ Full transparency (on-chain verification)

**Perfect for:**
- Meme coin launches
- Fair launch tokens
- Anti-rug mechanisms
- Sustainable revenue models

**Our bot uses it to:**
- Lock all graduated tokens
- Generate 1% fees for platform
- Protect users from rug pulls

---

**This is exactly what we need!** 🚀
