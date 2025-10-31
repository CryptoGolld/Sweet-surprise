# Debug and Fix Current Issues

## Issue 1: Charts Show Stats But No Candles

### Diagnosis Commands (Run on Ubuntu):

```bash
# Check if candles exist in database
psql "postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins" -c "SELECT COUNT(*) as candle_count, coin_type FROM price_snapshots GROUP BY coin_type ORDER BY candle_count DESC LIMIT 5;"

# Check if trades exist
psql "postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins" -c "SELECT COUNT(*) FROM trades WHERE timestamp > NOW() - INTERVAL '1 hour';"

# Check candle generation time
psql "postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins" -c "SELECT coin_type, MAX(timestamp) as last_candle FROM price_snapshots GROUP BY coin_type;"
```

### Likely Cause:
- Candles aren't being generated
- The throttling (every 10 seconds) is preventing generation
- Price data is 0 or invalid

### Fix:
Manually trigger candle generation:

```bash
cd /var/www/Sweet-surprise/indexer
node regenerate-candles.js
```

Or force immediate generation by temporarily disabling throttle in indexer.

## Issue 2: Indexer Takes Up to 1 Minute

### Diagnosis:

```bash
# Watch indexer logs in real-time
pm2 logs memecoin-indexer

# You should see:
# 🔄 Polling for new events...
# Every 1 second

# If you see long delays between polls, there's an issue
```

### Possible Causes:

1. **RPC is slow** - Sui testnet RPC might be overloaded
2. **Database queries are slow** - Too many candles to process
3. **Candle generation blocking** - Even with throttle, it might be slow

### Test RPC Speed:

```bash
time curl -X POST https://fullnode.testnet.sui.io:443 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getLatestCheckpointSequenceNumber","params":[]}'

# Should be < 500ms
# If > 2 seconds, RPC is the problem
```

### Fixes:

#### Option A: Disable Candle Generation Temporarily

Edit `/var/www/Sweet-surprise/indexer/index.js`, find this section:

```javascript
if (totalNewEvents > 0) {
  console.log(`✨ Processed ${totalNewEvents} new events`);
  // Generate candles less frequently to speed up indexing
  const now = Date.now();
  if (!global.lastCandleGeneration || (now - global.lastCandleGeneration) > 10000) {
    await generateCandles(); // COMMENT THIS OUT
    global.lastCandleGeneration = now;
  }
}
```

Change to:

```javascript
if (totalNewEvents > 0) {
  console.log(`✨ Processed ${totalNewEvents} new events`);
  // Candles generated separately - don't block event processing!
  // await generateCandles(); // DISABLED
}
```

Then run candle generation separately:

```bash
# Add a cron job to generate candles every 30 seconds
crontab -e

# Add this line:
* * * * * cd /var/www/Sweet-surprise/indexer && node regenerate-candles.js > /dev/null 2>&1
```

#### Option B: Use a Faster RPC

If Sui testnet RPC is slow, try an alternative:
- QuickNode
- Alchemy
- Ankr

Update `.env`:
```bash
SUI_RPC_URL=https://your-faster-rpc-endpoint
```

## Issue 3: Trade History Not Updating

This is directly caused by slow indexer. Once indexer is fixed, trade history will update.

**Current flow:**
1. User makes trade → Transaction on chain
2. Indexer polls every 1 second → Finds new event
3. Indexer processes event → Inserts into trades table
4. Frontend polls API every 2 seconds → Gets new trades
5. Trade appears in UI

**If indexer is slow (1 minute), trade history will be slow.**

### Temporary Fix: Faster Frontend Polling

While we fix indexer, make frontend poll more aggressively:

In `/workspace/components/charts/TradeHistory.tsx`:
```typescript
refetchInterval: 1000, // Poll every 1 second (was 2000)
```

## Issue 4: Graduated Tokens & Manual Pool Creation

### Current Flow (Automatic):

```
Token graduates (sell 737M tokens)
   ↓
Indexer detects graduation
   ↓
Pool creation bot automatically:
  - Creates Cetus pool
  - Seeds liquidity
  - Burns LP tokens
   ↓
Bot calls /api/update-pool with pool address
   ↓
Frontend redirects to Cetus
```

### Your Flow (Manual):

```
Token graduates
   ↓
Indexer marks token as graduated=true
   ↓
Frontend shows "GRADUATED" badge
   ↓
User tries to trade → Frontend blocks trade
   ↓
[You manually create Cetus pool - 10 minutes]
   ↓
You call API to update pool address
   ↓
Frontend redirects to Cetus
```

### The Problem:

**Gap Period (10 minutes):**
- Token is graduated
- No pool exists yet
- Users can't trade
- UI shows confusing state

### Solutions:

#### Solution 1: Queue System (RECOMMENDED)

**Database:**
Add column to track pool creation status:
```sql
ALTER TABLE tokens ADD COLUMN pool_status VARCHAR(20) DEFAULT 'active';
-- Values: 'active', 'graduated_pending_pool', 'graduated_with_pool'
```

**When token graduates:**
1. Indexer sets `graduated=true`, `pool_status='graduated_pending_pool'`
2. Frontend shows: "🎓 Graduated! Pool creation in progress..."
3. Users see countdown: "Trading will resume on Cetus in ~10 minutes"

**When you create pool:**
```bash
curl -X POST http://localhost:3002/api/update-pool \
  -H "Content-Type: application/json" \
  -d '{
    "coinType": "0x...",
    "poolAddress": "0x...",
    "poolStatus": "graduated_with_pool"
  }'
```

**Frontend then:**
- Shows "Trade on Cetus" button
- Redirects to Cetus with pool address

#### Solution 2: Admin Dashboard (BEST UX)

Create admin panel to manage graduated tokens:

**Admin Page (`/admin/graduated`):**
```
Graduated Tokens Pending Pool Creation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOKEN  | GRADUATED AT | STATUS           | ACTION
PEPE   | 2 mins ago  | Waiting for pool | [Create Pool]
DOGE   | 5 mins ago  | Pool created ✅  | View on Cetus
SHIB   | 30 mins ago | Waiting for pool | [Create Pool]

[Create Pool] button opens Cetus pool creation with pre-filled data
After creation, admin pastes pool address and clicks "Save"
```

#### Solution 3: Automatic Notification (BEST FOR YOU)

**When token graduates:**
1. Indexer detects graduation
2. Sends you notification (email, Telegram, Discord bot)
3. You create pool within 10 minutes
4. You update via API or admin dashboard

### Implementation:

**Update Indexer to Track Pool Status:**

Add to `processGraduationEvent` (or create one):

```javascript
// In indexer/index.js
async function checkForGraduation(coinType) {
  const tokenResult = await db.query(
    'SELECT graduated, curve_supply FROM tokens WHERE coin_type = $1',
    [coinType]
  );
  
  if (!tokenResult.rows[0]) return;
  
  const { graduated, curve_supply } = tokenResult.rows[0];
  const supply = parseFloat(curve_supply);
  const GRADUATION_THRESHOLD = 737_000_000 * 1e9; // 737M tokens
  
  if (!graduated && supply >= GRADUATION_THRESHOLD) {
    // Token just graduated!
    await db.query(
      `UPDATE tokens 
       SET graduated = true, 
           pool_status = 'graduated_pending_pool',
           graduated_at = NOW()
       WHERE coin_type = $1`,
      [coinType]
    );
    
    console.log(`🎓 TOKEN GRADUATED: ${coinType}`);
    console.log(`⚠️  MANUAL POOL CREATION NEEDED!`);
    
    // Optional: Send notification
    // await sendTelegramNotification(`Token graduated: ${coinType}`);
  }
}

// Call this after processing each buy/sell
await checkForGraduation(coinType);
```

**Update Frontend Token Page:**

```typescript
// In token page
if (token.graduated) {
  if (token.poolStatus === 'graduated_pending_pool') {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🎓</div>
        <h3 className="text-2xl font-bold mb-2">Token Graduated!</h3>
        <p className="text-gray-300 mb-4">
          This token has completed its bonding curve.
        </p>
        <p className="text-yellow-400 mb-8">
          ⏳ Pool creation in progress (~10 minutes)
        </p>
        <p className="text-sm text-gray-400">
          Trading will resume on Cetus DEX shortly.
        </p>
      </div>
    );
  }
  
  if (token.poolStatus === 'graduated_with_pool' && token.cetusPoolAddress) {
    // Redirect to Cetus
    const cetusUrl = `https://app.cetus.zone/swap/?from=0x2::sui::SUI&to=${token.coinType}&poolAddress=${token.cetusPoolAddress}`;
    window.location.href = cetusUrl;
  }
}
```

**API Endpoint for You to Update Pool:**

Already exists at `/api/update-pool`, just add pool_status:

```javascript
// In indexer/api-server.js
app.post('/api/update-pool', async (req, res) => {
  const { coinType, poolAddress } = req.body;
  
  await db.query(
    `UPDATE tokens SET
      cetus_pool_address = $2,
      pool_status = 'graduated_with_pool',
      updated_at = NOW()
     WHERE coin_type = $1`,
    [coinType, poolAddress]
  );
  
  console.log(`🏊 Pool created for ${coinType}: ${poolAddress}`);
  res.json({ success: true });
});
```

### Your Workflow:

1. **Token graduates** → You get notification
2. **You create Cetus pool** (10 minutes)
3. **You call API:**
   ```bash
   curl -X POST http://13.60.235.109:3002/api/update-pool \
     -H "Content-Type: application/json" \
     -d '{
       "coinType": "0x123::token::TOKEN",
       "poolAddress": "0xabc...pool"
     }'
   ```
4. **Frontend auto-redirects** users to Cetus
5. **Done!**

### How Frontend Knows:

- Frontend polls `/api/proxy/tokens` every 3 seconds
- When `pool_status` changes to `graduated_with_pool`
- UI immediately updates
- Users redirected to Cetus

No manual refresh needed!

## Quick Fixes Summary

### Right Now (Immediate):

```bash
# 1. Check what's slow
pm2 logs memecoin-indexer | head -100

# 2. Disable candle generation temporarily
# (Edit indexer/index.js, comment out generateCandles())
pm2 restart memecoin-indexer

# 3. Generate candles separately
node /var/www/Sweet-surprise/indexer/regenerate-candles.js
```

### Tomorrow (Better Solution):

1. Add `pool_status` column to database
2. Update indexer to detect graduation
3. Update frontend to show pending pool state
4. Create admin dashboard for pool management

## Testing

After fixes:

1. **Make a test trade**
2. **Time how long until it appears** in trade history
3. **Check if candles show** on chart
4. **Should be < 5 seconds**

If still slow, the bottleneck is RPC or database, not code.
