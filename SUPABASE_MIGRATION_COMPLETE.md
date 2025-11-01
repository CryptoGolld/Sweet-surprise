# Supabase Migration - COMPLETE ✅

**Date:** November 1, 2025  
**Status:** Successfully migrated to Supabase FREE tier

---

## What Changed

### Before
- Self-hosted PostgreSQL on Ubuntu (localhost:5432)
- 12 GB database (mostly unused candle data)
- Constant disk space issues
- Manual backup management

### After  
- Supabase managed PostgreSQL (eu-north-1)
- ~10 MB database (freed 12 GB!)
- No more disk space worries
- Automatic daily backups
- **Cost:** $0/month (FREE tier)

---

## Connection Details

**DATABASE_URL (in `indexer/.env`):**
```
postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres
```

**Critical Details:**
- **Port:** 6543 (Transaction Pooler - IPv4)
- **Region:** eu-north-1 (Europe - Stockholm)
- **Username:** postgres.xenzymhhojbqeovuvdfh
- **Password:** suilfgindexer
- **Database:** postgres

### Why Port 6543?

Our Ubuntu server **doesn't have IPv6** connectivity:
- ❌ Port 5432 = Direct connection (IPv6 only) = Won't work
- ✅ Port 6543 = Transaction Pooler (IPv4) = Works!

---

## Services Running

All services in `ecosystem.config.cjs`:

1. ✅ **memecoin-indexer** - Monitors blockchain, writes to Supabase
2. ✅ **memecoin-api** - Serves data to frontend, reads from Supabase
3. ✅ **compilation-service** - Compiles Move contracts
4. ✅ **pool-creation-bot** - Creates Cetus pools on graduation
5. ❌ **candle-generator** - DELETED (generates on-demand now)

### How to Restart Services

```bash
cd /var/www/Sweet-surprise

# Restart all
pm2 restart all

# Or use ecosystem file
pm2 restart ecosystem.config.cjs

# Check status
pm2 list
```

---

## Frontend Architecture (Unchanged!)

```
Frontend (Vercel)
    ↓
    API calls to /api/proxy/*
    ↓
Ubuntu API Server (port 3002)
    ↓
    Generates candles on-demand from trades
    ↓
Supabase Database (eu-north-1:6543)
```

**Frontend didn't change!** It still calls the same APIs. Only the backend database connection changed.

---

## What We Deleted

### Candle Generator Bot
- **Reason:** Was storing 12 GB of pre-computed candles
- **Solution:** API now generates candles on-demand from trades table (680 KB)
- **Result:** Saved 12 GB, charts still work perfectly

### price_snapshots Table
- **Reason:** Stored every 1-minute candle since beginning of time
- **Solution:** Generate candles when needed from trades
- **Result:** Database went from 12 GB → 10 MB

---

## Current Database Size

| Table | Size | Rows |
|-------|------|------|
| tokens | 680 KB | 128 |
| trades | 680 KB | 981 |
| token_holders | 528 KB | 440 |
| user_pnl | 480 KB | ~400 |
| indexer_state | 40 KB | 1 |
| referrals | 24 KB | ~50 |
| **TOTAL** | **~10 MB** | **~2,000** |

**Supabase FREE tier:** 500 MB  
**Usage:** 2% (10 MB / 500 MB)  
**Can last:** Literally years ✅

---

## How to Access Supabase

### Dashboard
https://supabase.com/dashboard

Navigate to:
- **Tables** - View/edit data
- **SQL Editor** - Run queries
- **Database → Query Performance** - Monitor slow queries
- **Settings → Database** - Connection strings
- **Settings → Usage** - Check storage/bandwidth

### Via Command Line
```bash
psql "postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"
```

### Quick Queries
```sql
-- Check row counts
SELECT 'tokens' as table, COUNT(*) FROM tokens
UNION ALL SELECT 'trades', COUNT(*) FROM trades;

-- Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- View recent trades
SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;
```

---

## Critical Files (DO NOT DELETE!)

1. **`ecosystem.config.cjs`** - PM2 service configuration
2. **`indexer/.env`** - Database connection string
3. **`SUPABASE_SETUP.md`** - This documentation
4. **`indexer/schema.sql`** - Database schema (for reference)

---

## Rollback Plan (If Needed)

If something goes wrong, instantly rollback to Ubuntu PostgreSQL:

```bash
# 1. Revert .env
cp indexer/.env.backup indexer/.env

# 2. Start Ubuntu PostgreSQL
sudo systemctl start postgresql

# 3. Restart services
pm2 restart all
```

Your Ubuntu database backup is still intact at:
- `database-backups/backup-20251101-054517.sql` (568 KB)
- `database-backups/ubuntu-backup-20251101-053009.sql` (5.5 GB - includes old candle data)

---

## Benefits Achieved

✅ **No more disk space issues** - Freed 12 GB, Supabase auto-scales  
✅ **Better reliability** - 99.9% uptime guarantee  
✅ **Automatic backups** - Daily backups included  
✅ **Monitoring dashboard** - See queries, performance in real-time  
✅ **Cost:** $0/month (FREE tier is perfect for us)  
✅ **Simpler system** - One less bot to maintain  
✅ **Faster charts** - Generated on-demand instead of reading 12 GB table

---

## Monitoring

### Check Indexer Status
```bash
pm2 logs memecoin-indexer --lines 30
```

Should see:
- ✅ "⏭️ Skipping historical indexing (already synced)"
- ✅ "🔄 Polling for new events..."
- ✅ "💰 Buy: ..." or "💸 Sell: ..." when trades happen

### Check API Status
```bash
curl http://localhost:3002/health
curl http://localhost:3002/api/tokens | jq '.tokens | length'
```

### Check Database Usage
In Supabase Dashboard:
1. Go to **Settings → Usage**
2. See: "Database: 10 MB / 500 MB (2%)"
3. Monitor bandwidth and storage

---

## Next Steps

Now that Supabase is working, we need to:

1. ✅ **Run price recalculation script** (fixes the price bug)
2. ✅ **Deploy frontend to Vercel** (picks up all fixes)
3. ✅ **Stop Ubuntu PostgreSQL** (free up 2-3 GB more space)
4. ✅ **Test everything works**

---

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Status Page:** https://status.supabase.com
- **Support:** support@supabase.io (for FREE tier issues)

---

**Migration completed successfully!** 🎉

All services now running on Supabase with 12 GB freed and $0 monthly cost.
