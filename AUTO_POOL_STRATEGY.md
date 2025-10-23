# Automatic Cetus Pool Creation Strategy

## The Problem
Cetus Move integration has dependency conflicts that prevent clean compilation and deployment.

## The Solution: Hybrid Approach

Instead of pure Move integration, use a **Move + PTB hybrid**:

### 1. Move Contract (On-Chain)
```move
public entry fun seed_pool_and_trigger_graduation<T: drop + store>(
    cfg: &PlatformConfig,
    curve: &mut BondingCurve<T>,
    bump_bps: u64,
    ctx: &mut TxContext
) {
    // 1. Check graduation
    assert!(curve.graduated, E_NOT_GRADUATED);
    assert!(!curve.lp_seeded, E_LP_SEEDED);
    
    // 2. Mint team allocation
    let team_tokens = coin::mint(&mut curve.treasury, TEAM_ALLOCATION, ctx);
    transfer::public_transfer(team_tokens, treasury_address);
    
    // 3. Prepare LP amounts
    let sui_for_lp = calculate_lp_sui(curve, bump_bps);
    let tokens_for_lp = TOTAL_SUPPLY - curve.token_supply - TEAM_ALLOCATION;
    
    // 4. Mint LP tokens
    let lp_tokens = coin::mint(&mut curve.treasury, tokens_for_lp, ctx);
    let lp_sui = coin::from_balance(split_sui(curve, sui_for_lp), ctx);
    
    // 5. Send to LP RECIPIENT (controlled address)
    transfer::public_transfer(lp_tokens, lp_recipient);
    transfer::public_transfer(lp_sui, lp_recipient);
    
    // 6. Mark as seeded
    curve.lp_seeded = true;
    
    // 7. Emit event with pool creation parameters
    event::emit(ReadyForPoolCreation {
        coin_type: type_name::get<T>(),
        sui_amount: sui_for_lp,
        token_amount: tokens_for_lp,
        creator: curve.creator
    });
}
```

### 2. Backend Service (Off-Chain)
Listens for `ReadyForPoolCreation` events and automatically:

```typescript
// Event listener
suiClient.subscribeEvent({
  filter: { MoveEventType: `${PKG}::bonding_curve::ReadyForPoolCreation` },
  onMessage: async (event) => {
    const { coin_type, sui_amount, token_amount } = event.parsedJson;
    
    // Automatically create Cetus pool
    await createCetusPool({
      coinTypeA: SUI_TYPE,
      coinTypeB: coin_type,
      amountA: sui_amount,
      amountB: token_amount,
      lpRecipientKeypair, // Controlled by platform
    });
  }
});

async function createCetusPool(params) {
  const sdk = initCetusSDK({ network: 'testnet', wallet: lpRecipient });
  
  // Sort coins properly (Cetus requirement)
  const [coinA, coinB] = sortCoins(params.coinTypeA, params.coinTypeB);
  
  // Create pool with liquidity
  const payload = await sdk.Pool.createPoolTransactionPayload({
    coinTypeA: coinA,
    coinTypeB: coinB,
    tick_spacing: 60,
    initialize_sqrt_price: calculatePrice(params),
    amount_a: params.amountA,
    amount_b: params.amountB,
    fix_amount_a: true,
    tick_lower: -443580, // Full range
    tick_upper: 443580,
    slippage: 0.05,
  });
  
  const result = await sdk.fullClient.sendTransaction(lpRecipientKeypair, payload);
  
  // OPTIONAL: Burn Position NFT for permanent lock
  const positionNFT = extractPositionNFT(result);
  await burnPositionNFT(positionNFT); // Transfer to 0x0
  
  return result.digest;
}
```

### 3. Benefits of This Approach

✅ **No Move Dependency Issues**
- Contract remains clean and compilable
- No Cetus framework conflicts

✅ **Automatic & Instant**
- Event triggers pool creation immediately
- No manual intervention needed

✅ **Proper Coin Ordering**
- Backend handles ASCII sorting correctly
- No on-chain complexity

✅ **Upgradeable**
- Can update pool creation logic without contract upgrade
- Easy to adapt to Cetus changes

✅ **Observable**
- All actions logged
- Easy monitoring and debugging

### 4. Security

- LP recipient keypair controlled by platform
- Tokens sent on-chain (trustless)
- Pool creation deterministic
- Position NFT burned (optional, permanent lock)

### 5. Implementation Steps

1. ✅ Fix Move contract (remove Cetus imports)
2. ✅ Add `ReadyForPoolCreation` event
3. ✅ Deploy upgraded contract
4. 🔄 Create backend event listener
5. 🔄 Test end-to-end flow
6. 🔄 Deploy to production

This gives you **fully automatic** Cetus pool creation without the dependency hell!
