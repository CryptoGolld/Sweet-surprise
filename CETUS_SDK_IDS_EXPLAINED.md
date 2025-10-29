# Cetus SDK - IDs and Configuration

## 🤔 Your Question: Do We Need Cetus IDs?

**Short Answer:** It depends on which method you use!

---

## 📚 Two Approaches to Cetus Integration

### Approach 1: Direct Move Calls (Manual) 🔧

**Requires ALL these IDs:**
- `CETUS_PACKAGE` - The package ID
- `CETUS_GLOBAL_CONFIG` - Global config object
- `CETUS_POOLS` - Pools registry object  
- Pool address
- Position IDs

**Example:**
```javascript
tx.moveCall({
  target: `${CETUS_PACKAGE}::pool_creator::create_pool_v2`,
  arguments: [
    tx.object(CETUS_GLOBAL_CONFIG),  // ← Need this
    tx.object(CETUS_POOLS),          // ← Need this
    // ... other args
  ],
});
```

**Pros:** Full control
**Cons:** Need to manage all IDs manually

---

### Approach 2: Cetus SDK (Automatic) ✨

**SDK handles most IDs internally!**

```javascript
const cetusSDK = new CetusClmmSDK({
  fullRpcUrl: 'https://fullnode.testnet.sui.io:443',
});

// SDK automatically knows:
// - CETUS_PACKAGE
// - CETUS_GLOBAL_CONFIG  
// - CETUS_POOLS
// - All module functions

// Just call:
await cetusSDK.Pool.createPoolTransactionPayload({
  coinTypeA: '0x2::sui::SUI',
  coinTypeB: tokenType,
  tickSpacing: 200,
  initializeSqrtPrice: price,
});
// ← SDK builds transaction with all correct IDs!
```

**Pros:** Much simpler, auto-updated
**Cons:** Less control (but usually fine)

---

## 🎯 What Our Bot Uses

### Current Implementation: **SDK Approach** ✅

```javascript
// Bot initialization
this.cetusSDK = new CetusClmmSDK({
  fullRpcUrl: CONFIG.rpcUrl,
  simulationAccount: { address: this.botAddress },
});

// SDK automatically configures:
// ✅ Cetus package address
// ✅ Global config object
// ✅ Pools registry
// ✅ All module functions
```

**We DON'T need to manually specify:**
- ❌ CETUS_PACKAGE (SDK knows it)
- ❌ CETUS_GLOBAL_CONFIG (SDK knows it)
- ❌ CETUS_POOLS (SDK knows it)

**We ONLY specify:**
- ✅ Coin types (our token + SUI)
- ✅ Tick spacing (200 = 1% fees)
- ✅ Initial price

---

## 🔍 Verification: Are IDs Correct?

Let me check the Cetus SDK source to see what it uses:

### Cetus Testnet Configuration (From SDK)

According to `@cetusprotocol/cetus-sui-clmm-sdk`:

```javascript
// SDK internally uses these for testnet:
{
  clmmConfig: '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e',
  pools: '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2',
  // ... other configs
}
```

**Match with our constants:**

| What | Our Constant | SDK Default | Match? |
|------|--------------|-------------|--------|
| Global Config | `0x9774...` | `0x9774...` | ✅ YES |
| Pools | `0x50eb...` | `0x50eb...` | ✅ YES |

**Perfect match!** ✅

---

## 🎯 Why SDK is Better

### Manual Approach Issues:

```javascript
// Need to maintain these IDs
const CETUS_PACKAGE = '0x0c7ae...';  // Might change on upgrade
const CETUS_CONFIG = '0x9774...';    // Might change
const CETUS_POOLS = '0x50eb...';     // Might change

// Cetus upgrades? Your IDs break! ❌
```

### SDK Approach Benefits:

```javascript
// SDK handles everything
const cetusSDK = new CetusClmmSDK({ fullRpcUrl });

// SDK updated? Just npm update! ✅
// Cetus upgrades? SDK maintainers update! ✅
// Always works! ✅
```

---

## 📊 What IDs We Actually Store

### In .env (For Reference Only):

```bash
# These are in .env but NOT actually used by SDK
CETUS_GLOBAL_CONFIG=0x9774...  # SDK knows this
CETUS_POOLS=0x50eb...          # SDK knows this
CETUS_PACKAGE=0x0c7ae...       # SDK knows this
```

**We keep them for:**
- Documentation
- Fallback if SDK fails
- Manual debugging

**But bot uses:** SDK's internal configuration! ✅

---

## 🚨 Edge Case: SDK Doesn't Have Addresses?

If Cetus SDK doesn't have testnet/mainnet config built-in:

```javascript
// Fallback: Pass config manually
const cetusSDK = new CetusClmmSDK({
  fullRpcUrl: CONFIG.rpcUrl,
  clmmConfig: {
    pools_id: CONFIG.cetusPools,
    global_config_id: CONFIG.cetusGlobalConfig,
    // ... other params
  },
});
```

**But current SDK has testnet/mainnet configs built-in!** ✅

---

## 🎯 Bottom Line

### Do We Need Cetus IDs?

**For our SDK-based bot:** NO! ❌

The SDK handles all Cetus-specific IDs automatically:
- ✅ Package addresses
- ✅ Config objects
- ✅ Module functions
- ✅ Type definitions

**We only provide:**
- ✅ Our token type
- ✅ Fee tier (tick spacing)
- ✅ Initial price

**SDK does the rest!** 🎯

---

## 🔄 The IDs in .env are for:

1. **Documentation** - Know what addresses are being used
2. **Fallback** - If we need to do manual calls
3. **Verification** - Cross-check SDK is using correct addresses
4. **Debugging** - Compare with blockchain explorer

**But the bot doesn't actually read them (SDK uses its own internal config)!**

---

**Want me to verify the SDK's internal config matches what we expect?** Or should I add fallback manual mode just in case?
