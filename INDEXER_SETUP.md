# Indexer Setup - Complete in 1 Hour

## What You're Getting

A real-time blockchain indexer that:
- ✅ Indexes all your memecoins automatically
- ✅ Stores everything in PostgreSQL (fast queries)
- ✅ Provides API endpoints for instant data
- ✅ Runs 24/7 on your Ubuntu server
- ✅ Auto-restarts on crashes

---

## Installation (30 minutes)

### On Your Ubuntu Server:

```bash
# 1. Copy indexer folder to your server
cd /workspace
scp -r indexer your-server:/home/ubuntu/

# OR if on same server
cd /home/ubuntu
# Copy the indexer folder from your project

# 2. Run setup script
cd /home/ubuntu/indexer
chmod +x setup.sh
./setup.sh

# 3. Configure
nano .env
# Change the password in DATABASE_URL

# 4. Test it
npm start
# You should see: "✨ Found X events"
# Press Ctrl+C to stop

# 5. Run in production
pm2 start index.js --name memecoin-indexer
pm2 save
pm2 startup
# Follow the command it shows

# 6. Verify it's working
pm2 logs memecoin-indexer
```

---

## Frontend Integration (15 minutes)

Add to your `.env.local`:
```bash
INDEXER_DB_URL=postgresql://memeindexer:changeme123@localhost:5432/memecoins
```

Your API routes are already created:
- `/api/tokens` - Fast token listing from DB
- `/api/portfolio/:address` - Portfolio data

---

## Usage

### Option 1: Use Indexer (Fast)

```typescript
// In useBondingCurves.ts
const response = await fetch('/api/tokens');
const { tokens } = await response.json();
// Instant! No blockchain queries
```

### Option 2: Keep Blockchain (Current)

Keep current code, indexer runs in background for future use.

---

## Monitoring

```bash
# View logs
pm2 logs memecoin-indexer

# Check if running
pm2 status

# See database
psql -U memeindexer -d memecoins
SELECT COUNT(*) FROM tokens;
```

---

## Costs

- **Server**: $0 (already have it)
- **PostgreSQL**: $0 (open source)
- **Disk space**: ~100MB/month
- **Total**: FREE 🎉

---

## Timeline

✅ **Now**: Indexer code ready
⏱️ **+10 min**: Run setup.sh on Ubuntu
⏱️ **+5 min**: Configure .env
⏱️ **+5 min**: Test and verify
⏱️ **+10 min**: Update frontend to use API
**Total: ~30 minutes**

---

## Next Steps

1. Copy indexer folder to your Ubuntu server
2. Run `./setup.sh`
3. Edit `.env` with database password
4. Run `pm2 start index.js --name memecoin-indexer`
5. Done! It's indexing in the background

Want me to also create the frontend integration code to use the API?
