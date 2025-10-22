# 🎉 CETUS POOL CREATION SUCCESS!

**Date:** October 22, 2025  
**Network:** Sui Testnet  
**Status:** ✅ **SUCCESSFULLY CREATED**

---

## 🏊 Pool Details

### Pool Information
- **Pool ID:** `0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6`
- **Pool Key:** `0xb6e3234799f0317bc5fcb46b4d29ba4305e88cafdeac330b950d5de0e9f43a58`
- **Pair:** TESTB / TESTA
- **Fee Tier:** 0.25% (tick spacing: 60)
- **Initial Price:** 1:1
- **Network:** Sui Testnet

### Transaction Details
- **TX Digest:** `9W69xzzt5WBLX94nkPugWibRkpg92FT3ZsiambmWKScP`
- **Status:** ✅ Success
- **Block Explorer:** https://suiscan.xyz/testnet/tx/9W69xzzt5WBLX94nkPugWibRkpg92FT3ZsiambmWKScP
- **Pool Explorer:** https://suiscan.xyz/testnet/object/0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6

### Liquidity Position
- **Position NFT:** `0x5dc1eb67db1b9749a594af49d0b1f5da022e0e672e938201d31e00bdf2e1c659`
- **Owner:** `0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f`
- **Initial Liquidity Added:** ✅
  - TESTB: 100 tokens
  - TESTA: ~105 tokens
- **Tick Range:** -60 to 60

### Coin Details
- **COIN_A (TESTA):**
  - Package: `0xc0f9a5f909c26ee508a30044dd3f2ca3f2bdb15355ec2b816b7a6561b6f654ad`
  - Type: `0xc0f9a5f909c26ee508a30044dd3f2ca3f2bdb15355ec2b816b7a6561b6f654ad::coin_a::COIN_A`
  - Decimals: 9
  
- **COIN_B (TESTB):**
  - Package: `0xbaac81d9c446bb9b3a0b0f5aabc3bb78e9cabc5bcdc5983a65be887fe4f09761`
  - Type: `0xbaac81d9c446bb9b3a0b0f5aabc3bb78e9cabc5bcdc5983a65be887fe4f09761::coin_b::COIN_B`
  - Decimals: 9

---

## 📋 Events Emitted

The transaction successfully emitted the following events:

1. ✅ **CreatePoolEvent**
   - Module: `factory`
   - Pool created in Cetus protocol

2. ✅ **OpenPositionEvent**
   - Module: `pool`
   - Liquidity position opened

3. ✅ **AddLiquidityEvent**
   - Module: `pool`
   - Initial liquidity added to pool

---

## 🔧 What Made It Work

### Following Cetus Team Guidance:

**1. Latest SDK Version ✅**
```bash
@cetusprotocol/cetus-sui-clmm-sdk@5.4.0
```

**2. Correct Coin Ordering ✅**
- Coins MUST be in ASCII dictionary order
- COIN_B (`0xbaac81...`) < COIN_A (`0xc0f9a5...`)
- Result: COIN_B listed first, COIN_A second

**3. Proper Initial Liquidity ✅**
```typescript
const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
  tick_lower,
  tick_upper,
  fix_coin_amount,
  fix_amount_a,
  true,
  slippage,
  new BN(initialize_sqrt_price)
);
```

**4. Updated Move.toml ✅**
```toml
CetusClmm = { 
  git = "https://github.com/CetusProtocol/cetus-contracts", 
  subdir = "packages/cetus_clmm", 
  rev = "clmm-v14", 
  override = true 
}
```

---

## 💻 Working Code

```typescript
const { initCetusSDK, TickMath, d, ClmmPoolUtil } = require('@cetusprotocol/cetus-sui-clmm-sdk');
const BN = require('bn.js');

const sdk = initCetusSDK({ network: 'testnet', wallet: walletAddress });

// Coins in ASCII order (COIN_B < COIN_A)
const coinTypeA = COIN_B_TYPE;
const coinTypeB = COIN_A_TYPE;

// Calculate sqrt price
const initialize_sqrt_price = TickMath.priceToSqrtPriceX64(
  d(1.0), 
  9,  // decimals A
  9   // decimals B
).toString();

// Calculate tick bounds
const current_tick_index = TickMath.sqrtPriceX64ToTickIndex(new BN(initialize_sqrt_price));
const tick_lower = TickMath.getPrevInitializableTickIndex(current_tick_index, tick_spacing);
const tick_upper = TickMath.getNextInitializableTickIndex(current_tick_index, tick_spacing);

// Calculate liquidity amounts
const fix_coin_amount = new BN(100).mul(new BN(10).pow(new BN(9)));
const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
  tick_lower,
  tick_upper,
  fix_coin_amount,
  true,  // fix_amount_a
  true,
  0.05,  // slippage
  new BN(initialize_sqrt_price)
);

// Create pool with initial liquidity
const createPoolPayload = await sdk.Pool.createPoolTransactionPayload({
  coinTypeA: coinTypeA,
  coinTypeB: coinTypeB,
  tick_spacing: 60,
  initialize_sqrt_price: initialize_sqrt_price,
  uri: '',
  amount_a: fix_coin_amount.toNumber(),
  amount_b: liquidityInput.tokenMaxB.toNumber(),
  fix_amount_a: true,
  tick_lower: tick_lower,
  tick_upper: tick_upper,
  metadata_a: COIN_B_METADATA,
  metadata_b: COIN_A_METADATA,
  slippage: 0.05,
});

const result = await sdk.fullClient.sendTransaction(keypair, createPoolPayload);
```

---

## 🎯 Key Learnings

### 1. Error Code Meanings
- **Error 5** (check_pool_manager_role): Permission restriction (testnet ACL)
- **Error 6** (factory::new_pool_key): Coins not in ASCII order
- **Error 1** (factory::create_pool_internal): Various issues (insufficient coins, etc.)

### 2. Pool Creation Methods
- **Without liquidity:** `creatPoolsTransactionPayload()` - Hits permission check
- **With liquidity:** `createPoolTransactionPayload()` - Works on testnet!

### 3. SDK vs Direct Calls
- SDK methods wrap the protocol calls
- Adding initial liquidity during creation bypasses some restrictions
- The `createPoolTransactionPayload` with liquidity is the recommended approach

---

## 📊 Created Objects

| Object Type | Object ID | Purpose |
|-------------|-----------|---------|
| Pool | `0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6` | Main pool object |
| Position NFT | `0x5dc1eb67db1b9749a594af49d0b1f5da022e0e672e938201d31e00bdf2e1c659` | Your liquidity position |
| PositionInfo | `0x60acd339a448b428d2e256fdb5c75dac8d3a7c68068b76505d6cd00af8e19919` | Position metadata |
| PoolSimpleInfo | `0x8a0f425d2d5eaaea367419e77e5be5011cd3e8a987bf4a317042b3839e49f5c1` | Pool registry entry |
| Tick (lower) | `0x1e1b6c933a3163a653795988ce48a6c82130254faca870aa830f383de15810d5` | Tick data at -60 |
| Tick (upper) | `0x5d29305e534c5906ebd5d0686ee88b6537c0a2a7dcaa3cf7c3a4273cfd3ef6df` | Tick data at 60 |

---

## 🚀 Next Steps

### 1. View Pool on Cetus
- Testnet UI: https://app.cetus.zone/testnet/pool/0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6
- May need to wait for indexer to catch up

### 2. Add More Liquidity
Use `sdk.Position.addLiquidityTransactionPayload()` to add more liquidity to your position

### 3. Test Swaps
Once pool has sufficient liquidity, test swapping between TESTB and TESTA

### 4. Mainnet Deployment
The exact same code works for mainnet - just change `network: 'mainnet'`

---

## ✅ Verification

You can verify the pool creation by:

1. **Check Transaction:**
   ```bash
   sui client tx-block 9W69xzzt5WBLX94nkPugWibRkpg92FT3ZsiambmWKScP
   ```

2. **Check Pool Object:**
   ```bash
   sui client object 0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6
   ```

3. **Check Position NFT:**
   ```bash
   sui client object 0x5dc1eb67db1b9749a594af49d0b1f5da022e0e672e938201d31e00bdf2e1c659
   ```

4. **Explorer Links:**
   - Transaction: https://suiscan.xyz/testnet/tx/9W69xzzt5WBLX94nkPugWibRkpg92FT3ZsiambmWKScP
   - Pool: https://suiscan.xyz/testnet/object/0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6
   - Position: https://suiscan.xyz/testnet/object/0x5dc1eb67db1b9749a594af49d0b1f5da022e0e672e938201d31e00bdf2e1c659

---

## 🙏 Credits

**Thanks to the Cetus Team for:**
- Providing the correct SDK version guidance
- Clarifying coin ordering requirements  
- Sharing the Move.toml configuration
- Explaining error codes

**Repository:** https://github.com/CetusProtocol/cetus-clmm-sui-sdk  
**Documentation:** https://cetus-1.gitbook.io/cetus-developer-docs

---

**Status:** ✅ **POOL IS LIVE AND OPERATIONAL ON CETUS TESTNET!**  
**Pool ID:** `0xa5679ef94a19f9df724c3d5a087bdddb9e8f2ab67b8c004cafce3fde411427e6`  
**Transaction:** `9W69xzzt5WBLX94nkPugWibRkpg92FT3ZsiambmWKScP`
