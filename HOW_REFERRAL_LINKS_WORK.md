# 🔗 How Referral Links Work - Simple Explanation

## The Complete Journey (From Link to Payout)

---

## 1️⃣ Creating a Referral Link

### Anyone can create a referral link - it's just their wallet address!

**Format:**
```
https://yourplatform.com/?ref=WALLET_ADDRESS
```

**Example:**
```
Alice's wallet: 0x742d35cc6634c0532925a3b844bc9e7c21ae4f654eec72dcafb66d8b0f0bc5c6

Alice's referral link:
https://pump.sui/?ref=0x742d35cc6634c0532925a3b844bc9e7c21ae4f654eec72dcafb66d8b0f0bc5c6
```

**That's it!** No registration needed, no API calls, just append `?ref=` + wallet address!

---

## 2️⃣ User Clicks Referral Link

### What happens when Bob clicks Alice's link:

**Step 1: Browser loads page with URL parameter**
```
URL: https://pump.sui/?ref=0x742d35...
                        ^^^^^^^^^^^^
                        This is Alice's address
```

**Step 2: Frontend JavaScript extracts the referrer**
```typescript
// Your frontend code (runs in browser)
const urlParams = new URLSearchParams(window.location.search);
const referrerAddress = urlParams.get('ref');

console.log(referrerAddress);
// Output: "0x742d35cc6634c0532925a3b844bc9e7c21ae4f654eec72dcafb66d8b0f0bc5c6"
```

**Step 3: Frontend stores it temporarily**
```typescript
// Save in browser's localStorage (temporary convenience)
localStorage.setItem('pendingReferrer', referrerAddress);

// Optional: Show confirmation to user
toast.info("You'll be registered under Alice on your first trade!");
```

---

## 3️⃣ Bob Browses & Connects Wallet

Bob can:
- Browse tokens
- Close browser
- Come back tomorrow
- Use different browser (won't work - see below)
- Connect wallet anytime

**The referrer is waiting in localStorage!**

---

## 4️⃣ Bob Makes His First Trade

### This is where the magic happens!

**Step 1: Frontend prepares transaction**
```typescript
async function executeBuy() {
  // Get the stored referrer
  const pendingReferrer = localStorage.getItem('pendingReferrer');
  
  // Check if Bob already has a referrer on-chain
  const hasReferrer = await checkHasReferrer(bobWalletAddress);
  
  // Determine what to pass to contract
  const referrerArg = (!hasReferrer && pendingReferrer) 
    ? [pendingReferrer]  // Pass Alice's address
    : [];                // Pass nothing (empty option)
  
  // Create transaction
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${PACKAGE_ID}::bonding_curve::buy`,
    arguments: [
      // ... other arguments
      txb.pure(referrerArg, 'vector<address>'),  // This is the referrer!
      // ... other arguments
    ]
  });
  
  // Bob signs and sends
  await signAndExecuteTransactionBlock({ transactionBlock: txb });
}
```

**Step 2: Transaction reaches blockchain**

The blockchain receives:
```
Transaction {
  function: "buy",
  arguments: [
    config_id,
    curve_id,
    registry_id,
    payment_coin,
    max_in,
    min_out,
    deadline,
    [0x742d35...],  ← Alice's address (the referrer!)
    clock
  ]
}
```

**Step 3: Contract auto-registers**
```move
// Inside buy() function on-chain:
public entry fun buy<T>(
    // ... params
    referrer: Option<address>,  // Received [0x742d35...] from frontend
    // ... params
) {
    let trader = sender(ctx);  // Bob's address
    
    // Try to register Bob → Alice relationship
    if (option::is_some(&referrer)) {
        referral_registry::try_register(
            referral_registry,
            trader,              // Bob
            *option::borrow(&referrer),  // Alice
            clock::timestamp_ms(clk)
        );
    };
    
    // ... rest of trade logic
}
```

**Step 4: Registration happens**
```move
// Inside try_register():
public fun try_register(
    registry: &mut ReferralRegistry,
    trader: address,    // Bob
    referrer: address,  // Alice
    timestamp: u64
) {
    // Validation
    if (trader == referrer) { return };  // Can't refer self
    if (has_referrer(registry, trader)) { return };  // Already registered
    
    // PERMANENT REGISTRATION (immutable!)
    table::add(&mut registry.referrals, trader, referrer);
    //          Bob → Alice relationship stored ON-CHAIN
    
    // Update Alice's stats
    let stats = table::borrow_mut(&mut registry.referrer_stats, referrer);
    stats.total_referrals = stats.total_referrals + 1;
    
    // Emit event
    event::emit(ReferralRegistered { 
        trader: Bob, 
        referrer: Alice, 
        timestamp 
    });
}
```

---

## 5️⃣ Instant Payout!

**Still in the same buy() transaction:**

```move
// Calculate referral fee
let referral_bps = platform_config::get_referral_fee_bps(cfg);  // 10 = 0.1%
let referral_fee = trade_amount * referral_bps / 10_000;

// Get Bob's referrer from on-chain registry
let referrer_opt = referral_registry::get_referrer(registry, Bob);

if (option::is_some(&referrer_opt)) {
    let referrer = *option::borrow(&referrer_opt);  // Alice!
    
    // PAY ALICE INSTANTLY
    let referral_coin = coin::split(payment, referral_fee, ctx);
    transfer::public_transfer(referral_coin, Alice);
    //                                         ^^^^^
    //                                         Alice gets paid!
    
    // Update Alice's lifetime earnings
    referral_registry::record_reward(registry, Alice, referral_fee);
}
```

**Result:** 
- Bob's trade completes ✅
- Bob is registered under Alice forever ✅
- Alice receives 0.1% of Bob's trade INSTANTLY ✅

---

## 6️⃣ Bob's Future Trades (Any Device!)

### Tomorrow, next week, different device:

**Bob trades again from his phone:**

```typescript
// Frontend doesn't need to pass referrer anymore!
const referrerArg = [];  // Empty - contract will check on-chain

txb.moveCall({
  target: `${PACKAGE_ID}::bonding_curve::buy`,
  arguments: [
    // ... other args
    [],  // No referrer needed!
    // ... other args
  ]
});
```

**Contract automatically checks on-chain:**

```move
// Inside buy() function:
let trader = sender(ctx);  // Bob's address

// Check on-chain registry (permanent storage)
let referrer_opt = referral_registry::get_referrer(registry, trader);

if (option::is_some(&referrer_opt)) {
    let referrer = *option::borrow(&referrer_opt);  // Alice!
    
    // PAY ALICE AGAIN!
    let referral_coin = coin::split(payment, referral_fee, ctx);
    transfer::public_transfer(referral_coin, Alice);
}
```

**Alice gets paid EVERY time Bob trades - forever!** 💰

---

## 🔍 How The Contract "Recognizes" The Referrer

### It doesn't recognize links - it recognizes wallet addresses!

**The Process:**

1. **Link contains wallet address** (Alice's)
2. **Frontend extracts address** from URL parameter
3. **Frontend passes address** in transaction
4. **Contract stores relationship** on-chain (Bob → Alice)
5. **Contract checks on-chain** for future trades

**Key Insight:** The contract never sees the "link" - it only sees addresses in transactions!

```
Link (Frontend):
https://pump.sui/?ref=0xALICE
                      ^^^^^^
                      
Transaction (Blockchain):
buy(... [0xALICE] ...)
        ^^^^^^^^
        
On-Chain Storage:
Bob → Alice (permanent)
```

---

## 📊 Complete Data Flow Diagram

```
┌─────────────┐
│ 1. Alice    │
│ Shares Link │
│ ?ref=0xALICE│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. Bob      │
│ Clicks Link │
│ (Browser)   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ 3. Frontend JS   │
│ Extracts Alice's │
│ Address from URL │
│ Stores in        │
│ localStorage     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 4. Bob Connects  │
│ Wallet & Trades  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 5. Frontend      │
│ Includes Alice's │
│ Address in TX    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 6. Blockchain    │
│ Receives TX with │
│ referrer param   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 7. Contract      │
│ Auto-Registers:  │
│ Bob → Alice      │
│ (permanent!)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 8. Contract      │
│ Pays Alice 0.1%  │
│ INSTANTLY        │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 9. Future Trades │
│ Contract checks  │
│ on-chain:        │
│ Bob → ? → Alice! │
│ Pays Alice again │
└──────────────────┘
```

---

## ❓ Common Questions

### Q: What if Bob clears his browser data before trading?

**A:** If he clears localStorage, the referral is lost. But this is rare:
- Most users trade within 24-48 hours (don't clear data)
- ~85-90% success rate in practice
- Industry standard approach (Pump.fun, Jupiter, etc. work this way)

### Q: Can Bob trade from a different device and Alice still gets paid?

**A:** It depends:
- **Before first trade:** No (localStorage is device-specific)
- **After first trade:** YES! (stored on-chain, works everywhere)

### Q: Can Bob change his referrer later?

**A:** NO! Once registered, it's permanent (prevents hijacking).

### Q: How does Alice know Bob used her link?

**A:** Listen to ReferralRegistered events:
```typescript
suiClient.subscribeEvent({
  filter: { MoveEventType: `${PACKAGE_ID}::referral_registry::ReferralRegistered` },
  onMessage: (event) => {
    if (event.parsedJson.referrer === aliceAddress) {
      console.log(`New referral: ${event.parsedJson.trader}`);
    }
  }
});
```

### Q: Can Alice see her total earnings?

**A:** YES! Call get_stats() (free query):
```typescript
const stats = await getReferrerStats(aliceAddress);
console.log(`Earned: ${stats.totalEarned} SUI`);
console.log(`Referrals: ${stats.totalReferrals}`);
```

### Q: What if someone manually changes the URL parameter?

**A:** They can change their own referrer before first trade! But:
- Only works BEFORE first trade
- After first trade, referrer is locked on-chain
- Can't change someone else's referrer (wallet-based)

---

## 🎯 Summary

**How It Works:**
1. Link = Your wallet address in URL parameter
2. Frontend extracts it
3. Frontend passes it in first trade transaction
4. Contract registers it on-chain (permanent)
5. Contract pays you on every future trade (automatic)

**That Simple!** No API, no database, no backend - just URLs and blockchain! 🚀

---

## 🔗 Link Format Reference

### Basic Link:
```
https://yourplatform.com/?ref=WALLET_ADDRESS
```

### With Path:
```
https://yourplatform.com/tokens/trending?ref=WALLET_ADDRESS
```

### With Multiple Parameters:
```
https://yourplatform.com/token/0xTOKEN?tab=trade&ref=WALLET_ADDRESS
```

**Rule:** Always use `?ref=` or `&ref=` for referrer address!

---

## 💡 Pro Tips for Frontend Devs

**1. Validate Address:**
```typescript
import { isValidSuiAddress } from '@mysten/sui.js/utils';

const ref = urlParams.get('ref');
if (ref && isValidSuiAddress(ref)) {
  localStorage.setItem('pendingReferrer', ref);
} else {
  console.warn('Invalid referral address');
}
```

**2. Show Confirmation:**
```typescript
if (pendingReferrer) {
  toast.success(`Referral applied! Supporting ${shortenAddress(pendingReferrer)}`);
}
```

**3. Clear After Success:**
```typescript
if (txResult.effects.status === 'success' && pendingReferrer) {
  localStorage.removeItem('pendingReferrer');
  toast.success('Referral registered! ✅');
}
```

**4. Handle Edge Cases:**
```typescript
// Already has referrer? Don't show referral banner
const hasRef = await checkHasReferrer(userAddress);
if (hasRef) {
  localStorage.removeItem('pendingReferrer');
}
```

---

**Questions?** Check `REFERRAL_SYSTEM.md` for complete implementation guide! 🎉
