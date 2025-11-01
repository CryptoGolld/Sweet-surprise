# Supabase Database Setup - Complete Guide

## Overview

We migrated from self-hosted PostgreSQL on Ubuntu to **Supabase** (managed PostgreSQL) on **Nov 1, 2025**.

### Why Supabase?

- ✅ **No disk space management** - Auto-scaling storage
- ✅ **Automatic backups** - Daily backups with point-in-time recovery
- ✅ **99.9% uptime** - Better reliability than self-hosted
- ✅ **Built-in monitoring** - Dashboard for queries and performance
- ✅ **Connection pooling** - pgBouncer included
- ✅ **Free tier** - 500 MB database (we use ~10 MB)

## Critical Information

### Database Details
- **Provider:** Supabase
- **Plan:** FREE tier (500 MB database)
- **Region:** eu-north-1 (Europe - Stockholm)
- **Project:** SuiLFG MemeFi
- **Database Size:** ~10 MB (well under 500 MB limit)

### Connection String (IPv4 Transaction Pooler)
```
DATABASE_URL=postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres
```

**CRITICAL:** We use **port 6543** (Transaction Mode Pooler) because:
- Our Ubuntu server doesn't have IPv6 connectivity
- Port 5432 uses IPv6 (won't work)
- Port 6543 uses IPv4 (works!)

### Password
```
suilfgindexer
```

## IPv4 vs IPv6 Issue - IMPORTANT!

### The Problem
- Supabase direct connection (port 5432) uses **IPv6 only**
- Our AWS EC2 Ubuntu server has **no IPv6 connectivity**
- Result: `ENETUNREACH` errors (network unreachable)

### The Solution
Use Supabase's **Transaction Mode Pooler** on port **6543**:
- ✅ Supports IPv4 (works with our server)
- ✅ Built-in connection pooling (better performance)
- ✅ Handles connection management automatically

### How We Discovered This
1. Tried direct connection: `db.xenzymhhojbqeovuvdfh.supabase.co:5432` ❌ Failed (IPv6)
2. Checked server: `ping6 google.com` ❌ Failed (no IPv6)
3. Used IPv4 pooler: `aws-1-eu-north-1.pooler.supabase.com:6543` ✅ Works!

## Connection Methods

### Method 1: Transaction Pooler (RECOMMENDED - What We Use)
```bash
# Port 6543 - IPv4, transaction mode
DATABASE_URL=postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres
```

### Method 2: Session Pooler (Alternative)
```bash
# Port 5432 - Requires IPv6 (won't work on our server)
DATABASE_URL=postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres
```

### Method 3: Direct Connection (Not Recommended)
```bash
# Direct to database - Requires IPv6 (won't work)
DATABASE_URL=postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres
```

## Migration Process (Completed)

### What We Did
1. Created Supabase project (FREE tier)
2. Dumped Ubuntu PostgreSQL database
3. Imported to Supabase using IPv4 pooler
4. Updated `.env` file with new connection string
5. Restarted all services

### Commands Used
```bash
# 1. Backup Ubuntu database
pg_dump "postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins" > backup.sql

# 2. Import to Supabase
psql "postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres" < backup.sql

# 3. Update .env
nano indexer/.env
# Changed DATABASE_URL to Supabase pooler URL

# 4. Restart services
pm2 restart all
```

### What Got Migrated
- ✅ 128 tokens
- ✅ 981 trades
- ✅ 440 token holders
- ✅ All indexes and relationships
- ✅ All user PnL data
- ✅ All referral data

## Configuration Files

### indexer/.env
```bash
# Database (Supabase - IPv4 Transaction Pooler)
DATABASE_URL=postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres

# Other settings...
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
```

### ecosystem.config.cjs
See the PM2 configuration file - all services use the same DATABASE_URL from `.env`

## Accessing Supabase

### Dashboard
1. Go to: https://supabase.com/dashboard
2. Select project: **SuiLFG MemeFi**
3. Navigate to:
   - **Database → Tables** - View data
   - **Database → Query Performance** - Monitor queries
   - **Settings → Database** - Connection strings
   - **Settings → Usage** - Check storage usage

### SQL Editor
Run queries directly in Supabase:
1. Go to: **SQL Editor** in dashboard
2. Write SQL queries
3. Run with Ctrl+Enter

Example:
```sql
-- Check row counts
SELECT 'tokens' as table, COUNT(*) FROM tokens
UNION ALL SELECT 'trades', COUNT(*) FROM trades;

-- Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));
```

### Command Line
```bash
# Connect via psql
psql "postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"

# Run a query
psql "postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres" -c "SELECT COUNT(*) FROM tokens;"
```

## Architecture

### Before (Self-Hosted)
```
Frontend (Vercel) → Ubuntu API (port 3002) → Ubuntu PostgreSQL (localhost:5432)
```

### After (Supabase)
```
Frontend (Vercel) → Ubuntu API (port 3002) → Supabase (eu-north-1:6543)
```

**Note:** Frontend didn't change! Only the API backend connection changed.

## Monitoring & Maintenance

### Check Storage Usage
```sql
-- Run in Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

Current usage: **~10 MB total** (2% of 500 MB free tier)

### Backups
- **Automatic:** Daily backups (enabled by default on FREE tier)
- **Manual:** Can export via dashboard or `pg_dump`

### Performance
- **Connection pooling:** Handled by pgBouncer (port 6543)
- **Query monitoring:** Available in Supabase dashboard
- **Slow queries:** Automatically tracked and displayed

## Troubleshooting

### Error: "Network unreachable" (ENETUNREACH)
**Cause:** Trying to use IPv6 connection on server without IPv6
**Solution:** Use IPv4 pooler (port 6543) instead of direct connection (port 5432)

### Error: "Tenant or user not found"
**Cause:** Wrong username format or wrong region
**Solution:** 
- Use format: `postgres.xenzymhhojbqeovuvdfh` (with dot)
- Verify region: `eu-north-1` (not us-west-1)

### Error: "relation does not exist"
**Cause:** Table wasn't created during migration
**Solution:** Run CREATE TABLE statement in Supabase SQL Editor

### Connection Timeout
**Cause:** Firewall or network issue
**Solution:** 
1. Check server can reach internet: `ping google.com`
2. Test pooler: `ping aws-1-eu-north-1.pooler.supabase.com`
3. Verify `.env` has correct URL

## Cost

### Current Plan: FREE
- **Database:** 500 MB (using ~10 MB = 2%)
- **Bandwidth:** 2 GB/month
- **Storage:** 1 GB
- **Cost:** $0/month ✅

### If We Need to Upgrade: PRO ($25/month)
- **Database:** 8 GB
- **Bandwidth:** 50 GB/month
- **Storage:** 100 GB
- **Daily backups**
- **Point-in-time recovery**

### When to Upgrade?
- When database reaches **400 MB** (80% of free tier)
- If we need more than 2 GB bandwidth/month
- If we want point-in-time recovery

## Important Notes

1. **Never delete this file!** Contains critical connection info
2. **Port 6543 is essential!** Don't change to 5432 (IPv6 won't work)
3. **Password is in .env** - Keep `indexer/.env` backed up
4. **FREE tier is enough** - We use 2% of storage limit
5. **No frontend changes needed** - API handles Supabase connection

## Useful Links

- **Dashboard:** https://supabase.com/dashboard
- **Documentation:** https://supabase.com/docs
- **Status:** https://status.supabase.com

## Quick Commands

```bash
# Test connection
psql "postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres" -c "SELECT version();"

# Check table counts
psql "postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres" -c "SELECT 'tokens', COUNT(*) FROM tokens UNION ALL SELECT 'trades', COUNT(*) FROM trades;"

# Backup database
pg_dump "postgresql://postgres.xenzymhhojbqeovuvdfh:suilfgindexer@aws-1-eu-north-1.pooler.supabase.com:6543/postgres" > supabase-backup-$(date +%Y%m%d).sql
```

---

**Last Updated:** November 1, 2025  
**Migration Status:** ✅ Complete  
**Services Status:** ✅ All running on Supabase
