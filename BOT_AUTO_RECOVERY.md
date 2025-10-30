# Bot Auto-Recovery System

## Problem Solved

Previously, if the bot crashed after receiving LP coins from the contract but before creating the Cetus pool, those coins would be "orphaned" in the bot's wallet. The bot wouldn't process them again because `lp_seeded = true` in the contract.

**Now the bot automatically recovers from crashes and completes partial graduations.**

---

## How It Works

### 1. **Persistent State Tracking**

The bot tracks each graduation's progress in `graduation-state.json`:

```json
{
  "graduations": {
    "0xf79cb75...": {
      "curveId": "0xf79cb75...",
      "coinType": "0x5d14c24...::tokyo::TOKYO",
      "status": "detected",
      "steps": {
        "payouts": true,
        "liquidity": true,   // ✅ Coins extracted
        "pool": false,       // ❌ Crash happened here
        "burn": false
      },
      "coins": {
        "suiCoinId": "0xe50e3e4a...",
        "suiAmount": "11999700036754",
        "tokenAmount": "207000000000000000"
      },
      "poolAddress": null
    }
  }
}
```

### 2. **State Updates at Each Step**

The bot saves progress after completing each step:

```javascript
// After distributing payouts
graduationState.markPayoutsComplete(curveId);

// After extracting liquidity from contract
graduationState.markLiquidityComplete(curveId, {
  suiCoinId,
  suiAmount,
  tokenAmount,
});

// After creating Cetus pool
graduationState.markPoolComplete(curveId, poolAddress);

// After burning LP
graduationState.markBurnComplete(curveId);
```

### 3. **Resume on Restart**

When the bot starts:

1. Loads `graduation-state.json`
2. Finds incomplete graduations
3. Resumes from the last completed step
4. Uses stored coin IDs (doesn't extract again from contract)

```javascript
async start() {
  await graduationState.load();
  
  const incomplete = graduationState.getIncomplete();
  for (const grad of incomplete) {
    await this.resumeGraduation(grad);
  }
  
  // Continue normal operation...
}
```

---

## Security: Ignoring Attacker Tokens

### The Attack Vector

Bad actors could send random tokens to the bot's wallet hoping to:
- Trick bot into creating pools for scam tokens
- Waste bot's gas
- Pollute the platform

### Protection

**The bot ONLY processes coins it explicitly tracked:**

```javascript
// ✅ Only these coins are used
if (steps.liquidity && coins) {
  const suiCoinId = coins.suiCoinId;  // Tracked when extracted
  const suiAmount = BigInt(coins.suiAmount);
  const tokenAmount = BigInt(coins.tokenAmount);
  
  // Continue with these specific coins...
}
```

**Random tokens sent by attackers are ignored** because:
- Not in `graduation-state.json`
- No corresponding `curveId` tracking
- Bot never queries for "largest coin" anymore

---

## Example Recovery Scenarios

### Scenario 1: Crash After Liquidity Extraction

**What Happens:**
1. Bot calls `prepare_pool_liquidity()` → coins sent to bot ✅
2. Bot saves coin IDs to state ✅
3. Bot crashes before creating pool ❌

**On Restart:**
1. Bot loads state → sees `liquidity: true, pool: false`
2. Bot finds exact coins using saved `suiCoinId`
3. Bot creates pool with those coins ✅
4. Bot burns LP ✅
5. Bot marks as complete ✅

### Scenario 2: Crash After Pool Creation

**What Happens:**
1. Bot creates Cetus pool ✅
2. Bot saves pool address to state ✅
3. Bot crashes before burning LP ❌

**On Restart:**
1. Bot loads state → sees `pool: true, burn: false`
2. Bot skips liquidity/pool steps
3. Bot burns LP for saved `poolAddress` ✅
4. Bot marks as complete ✅

### Scenario 3: Attacker Sends Random Tokens

**What Happens:**
1. Attacker sends 1M SCAM tokens to bot wallet
2. Bot has no graduation state for SCAM token
3. Bot ignores them completely ✅

---

## State Cleanup

The bot automatically cleans up old completed/failed graduations after 7 days:

```javascript
async cleanup() {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const [curveId, grad] of Object.entries(this.state.graduations)) {
    if ((grad.status === 'completed' || grad.status === 'failed') && 
        grad.updatedAt < sevenDaysAgo) {
      delete this.state.graduations[curveId];
    }
  }
}
```

---

## Manual Inspection

Check state anytime:

```bash
cd /var/www/Sweet-surprise/pool-creation-bot
cat graduation-state.json | python3 -m json.tool
```

Example output:
```json
{
  "graduations": {},
  "lastProcessedTime": 1698765432000
}
```

Empty `graduations` = all complete! ✅

---

## Deployment

```bash
cd /var/www/Sweet-surprise

# Pull latest code
git pull origin cursor/acknowledge-greeting-0ed7

# Restart bot (will auto-resume TOKYO)
cd pool-creation-bot
pm2 restart pool-creation-bot

# Watch logs - should see "Resuming graduation"
pm2 logs pool-creation-bot --lines 100
```

---

## What You'll See in Logs

### Normal Startup (Nothing to Resume):
```
📂 No existing state file, starting fresh
🤖 Pool Creation Bot Started
```

### Startup with Incomplete Graduation:
```
📂 Loaded state for 1 graduation(s)
🔄 Resuming incomplete graduations from previous session
Resuming graduation: curveId=0xf79cb75..., steps={liquidity:true,pool:false}
🔄 Resuming with tracked coins
📦 Creating pool (resumed)...
✅ Pool created!
🔥 Burning LP (resumed)...
✅ Resumed graduation complete!
```

### TOKYO Recovery (Your Case):
```
📂 Loaded state for 1 graduation(s)
🔄 Resuming incomplete graduations from previous session
Resuming graduation: curveId=0xf79cb75..., coinType=TOKYO
🔄 Resuming with tracked coins
  suiCoinId: 0xe50e3e4a...
  suiAmount: 11999700036754
  tokenAmount: 207000000000000000
📦 Creating pool (resumed)...
🏊 Creating Cetus pool
✅ Pool created: 0xabc123...
💧 Adding liquidity
✅ Liquidity added!
🔥 Burning LP tokens
✅ Position burned!
✅ Resumed graduation complete!
```

---

## Benefits

✅ **Crash-Resistant**: Bot can crash at any point and resume  
✅ **Attack-Resistant**: Only uses coins it explicitly tracked  
✅ **Zero Manual Work**: No recovery scripts needed  
✅ **Auditable**: State file shows exact progress  
✅ **Clean**: Auto-cleanup after 7 days  

---

## Contract Security Audit

You asked about contract functions - here's the audit:

### Secure (Bot-Only):
1. ✅ `prepare_liquidity_for_bot()` - Has `E_UNAUTHORIZED_BOT` check
2. ✅ `prepare_pool_liquidity()` - Has `E_UNAUTHORIZED_BOT` check

### Permissionless (Anyone Can Call):
3. ✅ `seed_pool_prepare()` - Tokens go to admin-controlled `lp_recipient_address`
4. ✅ `seed_pool_and_create_cetus_with_lock()` - LP permanently locked, fees to admin

**Verdict**: All functions are secure! Even permissionless ones can't steal tokens.

---

## Summary

Your bot now:
1. **Tracks progress** to disk at every step
2. **Auto-resumes** on restart from exact point of failure
3. **Ignores attacker tokens** by only using tracked coin IDs
4. **Cleans up** old state automatically
5. **Requires zero manual intervention**

Just restart the bot and it'll complete TOKYO automatically! 🚀
