# Graduated Token Workflow (Manual Pool Creation)

## Overview

Since you're creating Cetus pools manually for graduated tokens (takes ~10 minutes), we need a smooth UX to handle the gap between graduation and pool creation.

## The Flow

### 1. Token Graduates (Automatic)

When a token sells 737M tokens, it graduates:

```
Bonding curve sells out (737M tokens sold)
   ↓
Indexer detects graduation
   ↓
Database: graduated = true
   ↓
Frontend: Shows "graduated" badge
```

### 2. Pool Creation Pending (Manual - 10 minutes)

While you're creating the pool:

```
Token page shows:
┌─────────────────────────────────────┐
│         🎓 Token Graduated!         │
│                                     │
│   ⏳ Pool Creation in Progress      │
│   Our team is creating a Cetus      │
│   pool. Usually takes 5-10 minutes. │
│                                     │
│   Page auto-updates when ready      │
│   [Spinner: Checking for pool...]   │
└─────────────────────────────────────┘
```

**Key Features:**
- ✅ Page auto-refetches every 2 seconds
- ✅ User sees progress message
- ✅ No trading allowed (prevents confusion)
- ✅ Automatically redirects when pool created

### 3. You Create the Pool (Manual)

**Steps:**
1. Get notified that token graduated (check admin panel or logs)
2. Create Cetus pool manually (~10 minutes)
3. Update database with pool address (use helper script!)

### 4. Update Pool Address

**Option A: Use Helper Script (EASIEST)**

```bash
cd /var/www/Sweet-surprise/indexer
node update-pool-address.js PEPE 0x1234567890abcdef...pooladdress
```

**Output:**
```
📦 Token Found: PEPE
   Graduated: ✅ Yes
   Current Pool: None

💾 Updating pool address...
✅ Pool address updated successfully!

🎉 Users can now trade on Cetus!
   Token: PEPE
   Pool: 0x1234...

🔗 Cetus URL: https://app.cetus.zone/swap/...
```

**Option B: Use API Call**

```bash
curl -X POST http://localhost:3002/api/update-pool \
  -H "Content-Type: application/json" \
  -d '{
    "coinType": "0xa49978...::pepe::PEPE",
    "poolAddress": "0x1234567890abcdef...pooladdress"
  }'
```

**Option C: Direct SQL**

```bash
psql "postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins" << EOF
UPDATE tokens 
SET cetus_pool_address = '0x1234...pooladdress',
    updated_at = NOW()
WHERE ticker = 'PEPE';
EOF
```

### 5. Users Redirected (Automatic)

Once pool address is updated:

```
Frontend polls /api/proxy/tokens every 2 seconds
   ↓
Detects cetusPoolAddress is now set
   ↓
Shows "Redirecting to Cetus..."
   ↓
Redirects to: https://app.cetus.zone/swap/...
```

**Total time from pool creation to redirect:** < 2 seconds

## Your Current Graduated Tokens

From debug report, you have 5 graduated tokens waiting for pools:
- BEANS
- TOKYO  
- PEOPLE
- SULE
- WINK

**To create pools for them:**

```bash
# For each token:
cd /var/www/Sweet-surprise/indexer

# 1. Create pool on Cetus (manual - use Cetus UI)
# 2. Copy pool address
# 3. Update database:
node update-pool-address.js BEANS 0x...pooladdress
node update-pool-address.js TOKYO 0x...pooladdress
# etc.
```

## Admin Dashboard (Future Enhancement)

**Create `/app/admin/graduated/page.tsx`:**

```
╔═══════════════════════════════════════════════════╗
║        Graduated Tokens - Pool Management         ║
╚═══════════════════════════════════════════════════╝

Pending Pool Creation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOKEN    GRADUATED        STATUS              ACTION
─────────────────────────────────────────────────────
BEANS    5 mins ago      ⏳ Waiting         [Create Pool]
TOKYO    10 mins ago     ⏳ Waiting         [Create Pool]
PEOPLE   1 hour ago      ⏳ Waiting         [Create Pool]

With Pool:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOKEN    POOL ADDRESS              CREATED        ACTION
─────────────────────────────────────────────────────
DOGE     0x1234...5678            2 hours ago    [View]
PEPE     0xabcd...efgh            1 day ago      [View]
```

Click **[Create Pool]** → Opens Cetus with pre-filled parameters
After creating, paste pool address and save.

## Monitoring Graduated Tokens

**Check for tokens waiting for pools:**

```bash
# SQL query
psql $DATABASE_URL << EOF
SELECT 
  ticker,
  graduated_at,
  EXTRACT(MINUTE FROM (NOW() - graduated_at)) as minutes_since_graduation,
  cetus_pool_address IS NULL as needs_pool
FROM tokens
WHERE graduated = true 
  AND cetus_pool_address IS NULL
ORDER BY graduated_at DESC;
EOF
```

**Get notified when tokens graduate:**

Add to your indexer (or create separate monitor):

```javascript
// When token graduates
if (justGraduated) {
  // Send Telegram notification
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: YOUR_CHAT_ID,
      text: `🎓 Token Graduated: ${ticker}\n\n⚠️ Pool creation needed!\n\nToken: ${coinType}`
    })
  });
}
```

## Handling High Graduation Volume

**If many tokens graduate at once:**

1. **Priority Queue:** Create pools in order of market cap
2. **Batch Creation:** Create multiple pools in one session
3. **Automation:** Eventually automate with pool creation bot

## User Communication

**On token list:** Show badge for graduated tokens

```tsx
{token.graduated && (
  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
    {token.cetusPoolAddress ? '🏊 On Cetus' : '🎓 Graduated'}
  </span>
)}
```

## Testing

**Test the flow:**

1. **Manually mark a token as graduated:**
```sql
UPDATE tokens SET graduated = true WHERE ticker = 'TEST';
```

2. **Visit token page** → Should show "Pool Creation in Progress"

3. **Update pool address:**
```bash
node update-pool-address.js TEST 0xtest123...
```

4. **Refresh token page** → Should redirect to Cetus

## Summary

✅ **Graduation detected** automatically by indexer
✅ **Frontend shows pending state** with nice UI
✅ **You create pool** manually (5-10 minutes)
✅ **Helper script** makes updating easy
✅ **Frontend auto-updates** and redirects users
✅ **No user confusion** - clear messaging throughout

**Files Created:**
- `indexer/update-pool-address.js` - Helper script for you
- `indexer/migrations/add_pool_status.sql` - Database migration
- `app/tokens/[id]/page.tsx` - Updated UI for graduated tokens

## Quick Reference

**Check graduated tokens:**
```bash
node update-pool-address.js
# (with no args, shows list of graduated tokens)
```

**Update pool:**
```bash
node update-pool-address.js <TICKER> <POOL_ADDRESS>
```

Done! 🚀
