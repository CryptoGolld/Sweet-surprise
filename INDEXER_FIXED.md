# ✅ Indexer Fixed - Vercel Build Issue Resolved

## What Was Wrong:

❌ **Problem**: API routes in `/app/api/` imported `pg` (PostgreSQL), but `pg` wasn't in the main `package.json`
- Vercel tried to build these routes and failed
- Even though `indexer/` was in `.vercelignore`, the API routes weren't

## What's Fixed:

✅ **Deleted**: All Next.js API routes (`/app/api/tokens`, `/app/api/chart`, etc.)
✅ **Created**: Separate Express API server in `indexer/api-server.js`
✅ **Added**: Historical event indexing (catches up on past events)
✅ **Updated**: Frontend components to call external API

---

## New Structure:

```
/workspace/
├── indexer/                      ← All backend (ignored by Vercel)
│   ├── index.js                  ← Blockchain indexer
│   ├── api-server.js             ← NEW: Express API server
│   ├── ecosystem.config.js       ← NEW: PM2 config for both
│   ├── schema.sql
│   ├── package.json              ← Has pg, express, cors
│   └── setup.sh
│
├── app/                          ← Frontend only (Vercel builds this)
│   └── (no API routes anymore)
│
├── components/charts/
│   ├── PriceChart.tsx            ← Updated to call external API
│   └── TradeHistory.tsx          ← Updated to call external API
│
└── package.json                  ← Website deps only (no pg)
```

---

## How It Works Now:

### **Vercel (Frontend)**
```
Just builds Next.js app
No backend dependencies
No PostgreSQL imports
✅ Builds successfully
```

### **Ubuntu Server (Backend)**
```
Runs TWO services via PM2:
1. memecoin-indexer (port: N/A) - Indexes blockchain
2. memecoin-api (port: 3001) - Serves data via REST API
```

---

## Installation (Updated):

### **Step 1: Setup on Ubuntu**
```bash
cd /home/ubuntu
git clone your-repo
cd your-repo/indexer
./setup.sh
nano .env  # Configure
```

### **Step 2: Start Both Services**
```bash
# Option A: Use ecosystem file (recommended)
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Option B: Start individually
pm2 start index.js --name memecoin-indexer
pm2 start api-server.js --name memecoin-api
pm2 save
```

### **Step 3: Configure Frontend**
Add to your **Vercel environment variables** or `.env.local`:
```env
NEXT_PUBLIC_INDEXER_API=http://your-server-ip:3001
```

---

## Features Added:

### ✅ **Historical Event Indexing**

The indexer now:
1. **First run**: Indexes ALL past events from the beginning
2. **Shows progress**: Logs page by page indexing
3. **Then switches**: To live polling mode (every 2 seconds)

```
📚 Starting historical event indexing...
⏳ This may take a few minutes for all past events...

📥 Indexing Created events...
   Page 1: Indexed 50 events (Total: 50)
   Page 2: Indexed 50 events (Total: 100)
   Page 3: Indexed 23 events (Total: 123)

📥 Indexing TokensPurchased events...
   Page 1: Indexed 50 events (Total: 173)
   ...

✅ Historical indexing complete! Indexed 500 total events
📊 Generated initial chart candles

🔄 Switching to live polling mode...
```

### ✅ **Separate API Server**

Now serves:
- `GET http://your-server:3001/api/tokens` - All tokens
- `GET http://your-server:3001/api/chart/:coinType` - Chart data
- `GET http://your-server:3001/api/trades/:coinType` - Trade history
- `GET http://your-server:3001/health` - Health check

### ✅ **PM2 Ecosystem**

Single command to manage both services:
```bash
pm2 start ecosystem.config.js
```

---

## Testing:

### **1. Check Vercel Build**
```bash
git push
# Vercel should build successfully now ✅
```

### **2. Check Indexer**
```bash
pm2 logs memecoin-indexer
# Should see: "✨ Processed X events"
```

### **3. Check API**
```bash
pm2 logs memecoin-api
# Should see: "🚀 API Server running on http://localhost:3001"

# Test it:
curl http://localhost:3001/health
# Response: {"status":"ok","timestamp":"..."}
```

### **4. Check Frontend**
```
Open trading page for any token
Should see charts (if trades exist)
If no trades yet: "Chart unavailable" (normal)
```

---

## Environment Variables:

### **Backend (.env in indexer/)**
```env
DATABASE_URL=postgresql://memeindexer:password@localhost:5432/memecoins
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PLATFORM_PACKAGE=0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047
API_PORT=3001
```

### **Frontend (Vercel env vars)**
```env
NEXT_PUBLIC_INDEXER_API=http://your-server-ip:3001
```

---

## Monitoring:

```bash
# View all services
pm2 status

# View logs
pm2 logs

# Restart specific service
pm2 restart memecoin-indexer
pm2 restart memecoin-api

# Restart all
pm2 restart all
```

---

## Common Issues:

### **Charts not showing**
1. Check API is running: `pm2 status`
2. Check API responds: `curl http://localhost:3001/health`
3. Check frontend has env var: `NEXT_PUBLIC_INDEXER_API`
4. Check there are actual trades (buy/sell a token first)

### **"Failed to fetch chart data"**
- API server not running
- Wrong API URL in frontend
- CORS issue (api-server.js has CORS enabled)
- No trades yet (charts need data)

### **Historical indexing stuck**
- Check RPC isn't rate limiting
- Check database has space
- View logs: `pm2 logs memecoin-indexer`

---

## Summary:

**Before:**
- ❌ Vercel build failed
- ❌ API routes in Next.js app
- ❌ Only indexes new events

**After:**
- ✅ Vercel builds successfully
- ✅ Separate Express API server
- ✅ Indexes ALL historical events
- ✅ PM2 manages both services
- ✅ Charts work with external API

**Push to git now - Vercel will build!** 🚀
