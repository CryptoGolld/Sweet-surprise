# Pool Creation Bot - Complete Step-by-Step Flow

## 🔍 Exactly How The Bot Works

### Overview Timeline

```
Every 10 seconds: Check for graduations
When graduation found: Execute full pool creation flow
After completion: Continue monitoring
```

---

## 📋 Step-by-Step Detailed Flow

### STEP 0: Bot Initialization (Startup)

**What happens:**
```javascript
1. Load environment variables (.env file)
2. Connect to Sui RPC (testnet or mainnet)
3. Load bot private key → create keypair
4. Initialize Cetus SDK
5. Initialize Cetus Burn Manager
6. Set processedGraduations = empty set
7. Start main loop
```

**Bot address:**
- Derived from BOT_PRIVATE_KEY
- This address needs:
  - AdminCap object (to call prepare_liquidity_for_bot)
  - SUI for gas (~0.5 SUI per pool creation)

**Log output:**
```
Bot initialized { address: '0x86b38...' }
Cetus SDK initialized
Pool configuration: 1% fee tier (tick spacing 200)
Cetus Burn Manager initialized
LP will be burned but fees can still be claimed! 🔥
🤖 Pool Creation Bot Started
```

---

### STEP 1: Monitoring Loop (Every 10 seconds)

**What the bot does:**

```javascript
async checkForGraduations() {
  // Query blockchain for graduation events
  const events = await client.queryEvents({
    query: {
      MoveEventType: `${PLATFORM_PACKAGE}::bonding_curve::Graduated`
    },
    limit: 50,
    order: 'descending',
    cursor: lastCheckedCursor  // Resume from last check
  });
  
  // Filter out already processed
  for (event of events) {
    if (!processedGraduations.has(event.id.txDigest)) {
      handleGraduation(event);
      processedGraduations.add(event.id.txDigest);
    }
  }
  
  // Wait 10 seconds
  await sleep(10000);
}
```

**Event data structure:**
```json
{
  "id": {
    "txDigest": "0xABC...",
    "eventSeq": "0"
  },
  "parsedJson": {
    "curve_id": "0x123...",
    "coin_type": "0xPKG::module::COIN",
    "sui_raised": "13000123456789",  // In MIST (smallest units)
    "tokens_sold": "737000000000000000",  // 737M in smallest units
    "timestamp": "1234567890"
  },
  "type": "0xPKG::bonding_curve::Graduated"
}
```

**Deduplication:**
- Uses `processedGraduations` Set to track txDigests
- Prevents processing same graduation twice
- Persists in memory (lost on restart, but events query handles it)

---

### STEP 2: Prepare Liquidity (Extract from Curve)

**Function call:**
```javascript
await prepareLiquidity(curveId, coinType)
```

**What happens:**

#### 2.1: Build Transaction

```javascript
const tx = new Transaction();

tx.moveCall({
  target: `${PLATFORM_PACKAGE}::bonding_curve::prepare_liquidity_for_bot`,
  typeArguments: [coinType],  // e.g., "0xPKG::coin::MYCOIN"
  arguments: [
    tx.object(ADMIN_CAP),        // Bot must own this
    tx.object(PLATFORM_STATE),   // Platform config
    tx.object(curveId),          // The graduated curve
    tx.object('0x6'),            // Clock (system object)
  ],
});

tx.setGasBudget(100_000_000);  // 0.1 SUI gas budget
```

#### 2.2: What Happens On-Chain

**Inside `prepare_liquidity_for_bot` function:**

```move
public entry fun prepare_liquidity_for_bot<T: drop>(
    _admin: &AdminCap,
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    clk: &Clock,
    ctx: &mut TxContext
) {
    // 1. Verify caller is authorized LP bot
    assert!(sender(ctx) == cfg.lp_bot_address, E_UNAUTHORIZED);
    
    // 2. Verify curve is graduated
    assert!(curve.graduated, E_NOT_GRADUATED);
    
    // 3. Verify not already seeded
    assert!(!curve.lp_seeded, E_ALREADY_SEEDED);
    
    // 4. Get exact SUI balance from curve
    let sui_balance = balance::value(&curve.sui_reserve);
    // This is EXACT amount - could be 11,999, 12,000, or 12,001 SUI!
    
    // 5. Mint tokens
    let tokens_for_pool = 207_000_000;  // 207M for liquidity
    let tokens_to_burn = 54_000_000;    // 54M burned
    let tokens_for_team = 2_000_000;     // 2M for creator
    
    // 6. Extract SUI from curve
    let sui_coin = coin::take(&mut curve.sui_reserve, sui_balance, ctx);
    // Takes EXACT amount, whatever it is!
    
    // 7. Mint pool tokens
    let pool_tokens = coin::mint(&mut curve.treasury_cap, 207M * 1e9, ctx);
    
    // 8. Burn 54M tokens
    let burn_tokens = coin::mint(&mut curve.treasury_cap, 54M * 1e9, ctx);
    burn_treasury_tokens(burn_tokens);
    
    // 9. Send team tokens (2M + 500 SUI)
    let team_tokens = coin::mint(&mut curve.treasury_cap, 2M * 1e9, ctx);
    let team_sui = coin::split(&mut sui_coin, 500 * 1e9, ctx);
    transfer::public_transfer(team_tokens, curve.creator);
    transfer::public_transfer(team_sui, curve.creator);
    
    // 10. Transfer remaining SUI + pool tokens to bot
    transfer::public_transfer(sui_coin, sender(ctx));  // Bot gets SUI
    transfer::public_transfer(pool_tokens, sender(ctx)); // Bot gets 207M tokens
    
    // 11. Mark as LP seeded
    curve.lp_seeded = true;
}
```

**Key Point:** The function takes **EXACT sui_balance** from curve, not a hardcoded 12,000!

#### 2.3: Bot Receives Coins

After transaction succeeds, bot address now has:
- **SUI coins:** Whatever was in curve (could be 11,999.7 SUI, 12,000.3 SUI, etc.)
- **Token coins:** Exactly 207,000,000 tokens (always exact)

**How bot gets amounts:**

```javascript
// Option 1: From transaction balance changes
const balanceChanges = result.balanceChanges;
const suiChange = balanceChanges.find(c => c.coinType.includes('SUI'));
const suiAmount = BigInt(suiChange.amount);  // e.g., 11999700000000

const tokenChange = balanceChanges.find(c => c.coinType === coinType);
const tokenAmount = BigInt(tokenChange.amount);  // Always 207000000000000000
```

**Or Option 2: Query coin objects after transaction:**

```javascript
// Wait for indexing
await sleep(3000);

// Get all SUI coins bot owns
const suiCoins = await client.getCoins({
  owner: botAddress,
  coinType: '0x2::sui::SUI'
});

// Get all token coins bot owns
const tokenCoins = await client.getCoins({
  owner: botAddress,
  coinType: coinType
});

// Calculate total amounts
const totalSui = suiCoins.data.reduce((sum, coin) => 
  sum + BigInt(coin.balance), 0n
);

const totalTokens = tokenCoins.data.reduce((sum, coin) => 
  sum + BigInt(coin.balance), 0n
);
```

**Result:**
- Bot knows EXACT amounts (not hardcoded 12,000!)
- Handles any amount: 11,999, 12,000, 12,001, etc.

---

### STEP 3: Create Cetus Pool

**Function call:**
```javascript
await createCetusPool(coinType, suiAmount, tokenAmount)
```

#### 3.1: Determine Coin Order

Cetus requires coins in **lexicographic order**:

```javascript
const paymentCoinType = '0x2::sui::SUI';
const [coinA, coinB] = sortCoinTypes(paymentCoinType, coinType);

function sortCoinTypes(a, b) {
  return a < b ? [a, b] : [b, a];
}

// Example:
// If SUI = "0x2::sui::SUI" and token = "0xabc::coin::TOKEN"
// Result: coinA = "0x2::sui::SUI", coinB = "0xabc::coin::TOKEN"
```

#### 3.2: Calculate Initial Price

**CRITICAL: Price calculation uses ACTUAL amounts!**

```javascript
// Determine which is coinA
const isPaymentCoinA = (coinA === paymentCoinType);

// Calculate price based on actual amounts
let price;
if (isPaymentCoinA) {
  // Price = how many tokens per SUI
  // Example: 207M tokens / 11999.7 SUI = 17,250 tokens per SUI
  price = Number(tokenAmount) / Number(suiAmount);
} else {
  // Price = how many SUI per token
  price = Number(suiAmount) / Number(tokenAmount);
}

// Convert to sqrt price (Cetus format)
const sqrtPrice = Math.sqrt(price);

// Convert to Q64 fixed-point
const Q64 = 2n ** 64n;
const sqrtPriceX64 = BigInt(Math.floor(sqrtPrice * Number(Q64)));
```

**Example with 11,999.7 SUI:**
```javascript
tokenAmount = 207_000_000 * 1e9  // 207M tokens in smallest units
suiAmount = 11_999.7 * 1e9        // 11,999.7 SUI in MIST

price = 207_000_000 / 11_999.7 = 17,250.72 tokens per SUI
sqrtPrice = sqrt(17,250.72) = 131.34
sqrtPriceX64 = 131.34 * 2^64 = 2,422,872,448,235,618,368
```

**Price adjusts automatically based on actual amounts!**

#### 3.3: Create Pool Transaction

```javascript
const createPoolPayload = await cetusSDK.Pool.createPoolTransactionPayload({
  coinTypeA: coinA,                    // Ordered correctly
  coinTypeB: coinB,                    // Ordered correctly
  tickSpacing: 200,                    // 1% fee tier
  initializeSqrtPrice: sqrtPriceX64.toString(),  // Based on actual amounts!
  uri: '',                             // Optional metadata
});

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: createPoolPayload,
  options: {
    showEffects: true,
    showObjectChanges: true,
  },
});
```

**What Cetus does:**
1. Validates tick spacing (200 is valid ✅)
2. Validates sqrt price (must be within bounds)
3. Checks coins are in correct order
4. Creates Pool object
5. Registers in global pools registry
6. Returns pool address

**Extract pool address:**
```javascript
const poolObject = result.objectChanges.find(
  change => change.type === 'created' && 
            change.objectType.includes('Pool')
);

const poolAddress = poolObject.objectId;
```

---

### STEP 4: Add Liquidity to Pool

**Function call:**
```javascript
await addLiquidity(poolAddress, coinType, suiAmount, tokenAmount)
```

#### 4.1: Get Coin Objects

Bot needs to pass coin objects (not just amounts):

```javascript
// Get all SUI coin objects
const suiCoins = await client.getCoins({
  owner: botAddress,
  coinType: '0x2::sui::SUI'
});
const suiCoinIds = suiCoins.data.map(c => c.coinObjectId);

// Get all token coin objects
const tokenCoins = await client.getCoins({
  owner: botAddress,
  coinType: coinType
});
const tokenCoinIds = tokenCoins.data.map(c => c.coinObjectId);
```

**Note:** Bot might have multiple coin objects, need to merge them!

#### 4.2: Build Add Liquidity Transaction

```javascript
const tx = new Transaction();

// Merge SUI coins if multiple
let suiCoin;
if (suiCoinIds.length === 1) {
  suiCoin = tx.object(suiCoinIds[0]);
} else {
  // Merge all SUI coins into first one
  suiCoin = tx.object(suiCoinIds[0]);
  const restSui = suiCoinIds.slice(1).map(id => tx.object(id));
  tx.mergeCoins(suiCoin, restSui);
}

// Merge token coins if multiple
let tokenCoin;
if (tokenCoinIds.length === 1) {
  tokenCoin = tx.object(tokenCoinIds[0]);
} else {
  tokenCoin = tx.object(tokenCoinIds[0]);
  const restTokens = tokenCoinIds.slice(1).map(id => tx.object(id));
  tx.mergeCoins(tokenCoin, restTokens);
}

// Open position (full range)
const tickLower = -443636;  // Minimum tick
const tickUpper = 443636;   // Maximum tick

const [position] = tx.moveCall({
  target: `${CETUS_PACKAGE}::position::open_position`,
  typeArguments: [coinA, coinB],
  arguments: [
    tx.object(CETUS_GLOBAL_CONFIG),
    tx.object(poolAddress),
    tx.pure.i32(tickLower),
    tx.pure.i32(tickUpper),
  ],
});

// Add liquidity to position
tx.moveCall({
  target: `${CETUS_PACKAGE}::position::add_liquidity`,
  typeArguments: [coinA, coinB],
  arguments: [
    tx.object(CETUS_GLOBAL_CONFIG),
    tx.object(poolAddress),
    position,
    suiCoin,      // Pass entire merged coin
    tokenCoin,    // Pass entire merged coin
    tx.pure.u64('1000000000'),  // Delta liquidity (Cetus calculates actual)
    tx.object('0x6'),  // Clock
  ],
});
```

**What happens:**
1. Cetus calculates optimal amounts to use from each coin
2. Deposits into pool
3. Returns any leftover coins to bot
4. Creates position NFT
5. Position represents LP ownership

**Position NFT:**
- Represents bot's liquidity position
- Contains info: pool, tick range, liquidity amount
- Can be transferred or burned
- Used to claim fees later

#### 4.3: Handle Leftover Amounts

**Important:** Cetus might not use ALL coins due to:
- Price slippage
- Rounding
- Optimal ratio calculations

**Example:**
```
Bot has: 11,999.7 SUI + 207M tokens
Cetus uses: 11,995.2 SUI + 206.8M tokens
Bot keeps: 4.5 SUI + 0.2M tokens (leftovers)
```

**Leftover handling options:**

**Option 1: Leave in bot wallet (current implementation)**
```javascript
// Do nothing - leftovers stay in bot wallet
// Can be used for gas or next pool creation
```

**Option 2: Send leftovers to treasury**
```javascript
// After adding liquidity, transfer remaining coins
if (leftoverSui > 0) {
  tx.transferObjects([suiCoin], TREASURY_ADDRESS);
}
if (leftoverTokens > 0) {
  tx.transferObjects([tokenCoin], TREASURY_ADDRESS);
}
```

**Option 3: Burn leftover tokens**
```javascript
// If very small amount, just burn them
if (leftoverTokens < 1000) {
  tx.moveCall({
    target: '0x2::coin::burn',
    arguments: [tokenCoin],
  });
}
```

---

### STEP 5: Burn LP Position (Cetus Burn Manager)

**Function call:**
```javascript
await burnLPTokens(poolAddress, coinType)
```

#### 5.1: Get Position ID

After adding liquidity, we have position NFT:

```javascript
// Extract position ID from previous transaction
const positionObject = result.objectChanges.find(
  change => change.type === 'created' && 
            change.objectType.includes('Position')
);

const positionId = positionObject.objectId;
```

Or query positions:

```javascript
const positions = await cetusSDK.Position.getPositionList({
  poolAddress,
  ownerAddress: botAddress,
});

const positionId = positions[0].id;
```

#### 5.2: Burn Using Cetus Burn Manager

```javascript
const burnTx = await burnManager.createBurnTransaction({
  positionId: positionId,
  recipient: botAddress,  // Who can claim fees (bot or treasury)
});

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: burnTx,
  options: {
    showEffects: true,
  },
});
```

**What Cetus Burn Manager does:**
1. Marks position as "burned"
2. Makes position non-transferable
3. Locks liquidity permanently (can't withdraw)
4. **BUT keeps fee collection enabled!**
5. Sets recipient as authorized fee claimer

**On-chain state after burn:**
```javascript
Position {
  pool_id: "0xPOOL...",
  liquidity: 49_699_000,  // Locked forever
  tick_lower: -443636,
  tick_upper: 443636,
  burned: true,  // 🔥 Marked as burned
  fee_claimer: "0xRECIPIENT...",  // Can claim fees
  unclaimed_fee_a: 0,  // Accumulates over time
  unclaimed_fee_b: 0,  // Accumulates over time
}
```

---

### STEP 6: Completion & Logging

**What bot does:**

```javascript
logger.info('✅ Pool creation complete!', {
  curveId: curveId,
  poolAddress: poolAddress,
  positionId: positionId,
  status: 'success',
  suiAmount: suiAmount.toString(),  // Actual amount used
  tokenAmount: tokenAmount.toString(),
  feeTier: '1%',
  tickSpacing: 200,
  liquidityLocked: 'forever',
  feesClaimable: true,
});

// Add to processed set
processedGraduations.add(eventTxDigest);

// Continue monitoring
await sleep(10000);
```

---

## 🔧 Edge Cases & Error Handling

### Case 1: SUI Amount is 11,999 (not exactly 12,000)

**What happens:**

```javascript
// On-chain: curve.sui_reserve = 11,999.234567 SUI (in MIST)
// prepare_liquidity_for_bot extracts EXACT amount
let sui_balance = balance::value(&curve.sui_reserve);
// sui_balance = 11999234567000 (exact MIST)

// Subtract team allocation (500 SUI)
let team_sui = coin::split(&mut sui_coin, 500 * 1e9, ctx);

// Bot receives: 11999.234567 - 500 = 11499.234567 SUI

// Pool creation uses this EXACT amount:
price = 207_000_000 / 11_499.234567 = 18,000.67 tokens per SUI
sqrtPrice = sqrt(18,000.67) = 134.16

// Pool created with correct price for actual amounts!
```

**Result:** Works perfectly! Price auto-adjusts to actual amounts.

---

### Case 2: Multiple Graduation Events at Once

**What happens:**

```javascript
// Query returns 3 graduations
events = [event1, event2, event3]

// Bot processes sequentially
for (event of events) {
  if (!processedGraduations.has(event.txDigest)) {
    await handleGraduation(event);  // Waits for completion
    processedGraduations.add(event.txDigest);
  }
}
```

**Order:** First-come-first-served
**Gas:** Bot needs enough for all pools
**Time:** ~30-60 seconds per pool

---

### Case 3: Transaction Fails (Retry Logic)

**Built-in retry:**

```javascript
async executeTransaction(tx, retries = 0) {
  try {
    const result = await client.signAndExecuteTransaction({...});
    
    if (result.effects.status.status !== 'success') {
      throw new Error(result.effects.status.error);
    }
    
    return result;
  } catch (error) {
    if (retries < MAX_RETRIES) {  // MAX_RETRIES = 3
      logger.warn(`Retry ${retries + 1}/${MAX_RETRIES}`);
      await sleep(2000 * (retries + 1));  // Exponential backoff
      return executeTransaction(tx, retries + 1);
    }
    throw error;  // Give up after 3 tries
  }
}
```

**Failure scenarios:**

**Scenario A: prepare_liquidity_for_bot fails**
- Logs error
- Moves to next graduation
- Does NOT create pool
- Admin must manually fix

**Scenario B: Pool creation fails**
- Bot has SUI + tokens
- Retries 3 times
- If still fails, logs error
- Coins remain in bot wallet
- Admin can manually create pool later

**Scenario C: Add liquidity fails**
- Pool exists but empty
- Bot retries 3 times
- If fails, pool exists but has no liquidity
- Admin can add liquidity manually

**Scenario D: Burn fails**
- Pool has liquidity
- Position NOT burned
- Bot owns position (can still withdraw!)
- Admin must manually burn
- Or bot retries on next run

---

### Case 4: Gas Runs Out Mid-Process

**Prevention:**

```javascript
// Check gas before each step
const gasBefore = await client.getBalance({
  owner: botAddress,
  coinType: '0x2::sui::SUI'
});

if (BigInt(gasBefore.totalBalance) < 500_000_000n) {  // 0.5 SUI
  logger.error('Insufficient gas!', {
    balance: gasBefore.totalBalance,
    needed: '500000000',
  });
  // Send alert
  // Skip this graduation
  return;
}
```

**If gas runs out during transaction:**
- Transaction fails
- Retry logic kicks in
- Bot logs error
- Admin must add more gas

---

### Case 5: Coin Type Ordering Wrong

**Cetus requires lexicographic order:**

```javascript
// Wrong order causes pool creation to fail
coinA = '0xZZZ::token::TOKEN'  // Wrong!
coinB = '0x2::sui::SUI'

// Cetus error: "Invalid coin order"

// Bot handles automatically:
function sortCoinTypes(a, b) {
  return a < b ? [a, b] : [b, a];
}

// Result: Correct order
coinA = '0x2::sui::SUI'
coinB = '0xZZZ::token::TOKEN'
```

**Always works!** Bot sorts automatically.

---

### Case 6: Position Already Exists

**If pool already has position from bot:**

```javascript
// Bot tries to create another position
// Cetus allows it (multiple positions OK)

// Result: 2 positions in same pool
// Both get burned separately
// Both collect fees

// Prevention (if desired):
const existingPositions = await getPositionsForPool(poolAddress);
if (existingPositions.length > 0) {
  logger.warn('Position already exists, skipping');
  return;
}
```

**Current implementation:** Doesn't check, creates anyway (harmless)

---

## 🎯 Summary of Key Points

### Bot Handles Variable Amounts Automatically

✅ **11,999 SUI:** Price calculated as `207M / 11,999`
✅ **12,000 SUI:** Price calculated as `207M / 12,000`
✅ **12,001 SUI:** Price calculated as `207M / 12,001`

**Formula:**
```javascript
price = tokenAmount / suiAmount  // Uses actual amounts!
sqrtPrice = sqrt(price) * 2^64
```

### No Hardcoded Values

❌ Not hardcoded: `12000 SUI`
✅ Uses: `balance::value(&curve.sui_reserve)`

❌ Not hardcoded: `price = 17250`
✅ Calculates: `price = actualTokens / actualSui`

### Automatic Adjustments

- Price adjusts to actual amounts
- Handles any SUI amount
- Coin ordering automatic
- Retry logic built-in
- Error handling comprehensive

### The Only Fixed Values

1. **Token amount:** Always exactly 207,000,000 (minted on-chain)
2. **Fee tier:** Always 1% (tick spacing 200)
3. **Tick range:** Always full range (-443636 to 443636)
4. **Burn recipient:** Bot address (can claim fees)

**Everything else adapts to actual on-chain state!** ✅

---

## 📊 Example: 11,999.7 SUI Case

**Step-by-step with actual numbers:**

```
1. Graduation detected
   - Curve has: 11,999.7 SUI

2. prepare_liquidity_for_bot()
   - Extract: 11,999.7 SUI
   - Team gets: 500 SUI
   - Bot gets: 11,499.7 SUI + 207M tokens

3. Create pool
   - Price = 207M / 11,499.7 = 18,000.67 tokens/SUI
   - SqrtPrice = sqrt(18,000.67) = 134.16
   - Pool created with this price ✅

4. Add liquidity
   - Deposit: 11,499.7 SUI + 207M tokens
   - Cetus uses: ~11,495 SUI + ~206.9M tokens
   - Leftover: ~4.7 SUI + ~0.1M tokens (stays in bot)
   - Position created ✅

5. Burn position
   - Position burned ✅
   - Fees claimable ✅

Result: Pool works perfectly with 11,499.7 SUI!
```

**No issues! Bot handles any amount!** 🎯
