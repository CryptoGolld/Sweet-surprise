# Migrate to Supabase - Complete Guide

## Connection Strings

**Current (Ubuntu PostgreSQL):**
```
postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins
```

**New (Supabase):**
```
postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres
```

## Migration Steps

### Step 1: Dump Current Database

```bash
cd /var/www/Sweet-surprise

# Create backup directory
mkdir -p database-backups

# Dump current database (includes schema + data)
pg_dump "postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins" > database-backups/ubuntu-backup-$(date +%Y%m%d-%H%M%S).sql

# Check the dump file
ls -lh database-backups/
```

### Step 2: Import to Supabase

```bash
# Import schema and data to Supabase
psql "postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres" < database-backups/ubuntu-backup-*.sql

# This will create all tables, indexes, and copy all data
```

### Step 3: Verify Migration

```bash
# Check tables exist on Supabase
psql "postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres" -c "\dt"

# Check row counts
psql "postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres" -c "SELECT 'tokens' as table_name, COUNT(*) FROM tokens UNION ALL SELECT 'trades', COUNT(*) FROM trades UNION ALL SELECT 'token_holders', COUNT(*) FROM token_holders;"

# Compare with current database
psql "postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins" -c "SELECT 'tokens' as table_name, COUNT(*) FROM tokens UNION ALL SELECT 'trades', COUNT(*) FROM trades UNION ALL SELECT 'token_holders', COUNT(*) FROM token_holders;"
```

### Step 4: Update .env File

```bash
# Backup current .env
cp indexer/.env indexer/.env.backup

# Update DATABASE_URL
nano indexer/.env
```

Change this line:
```bash
# OLD
DATABASE_URL=postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins

# NEW
DATABASE_URL=postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres
```

### Step 5: Restart Services

```bash
# Stop all services
pm2 stop all

# Restart all services (they'll now use Supabase)
pm2 restart all

# Watch logs
pm2 logs --lines 50
```

### Step 6: Verify Everything Works

```bash
# Check indexer is processing events
pm2 logs memecoin-indexer --lines 30

# Check API is serving data
curl http://localhost:3002/api/tokens | jq '.tokens | length'

# Check your website (should show correct data)
```

## Rollback Plan (If Something Goes Wrong)

If anything doesn't work, instantly rollback:

```bash
# Stop services
pm2 stop all

# Restore old .env
cp indexer/.env.backup indexer/.env

# Restart services
pm2 restart all
```

Your Ubuntu database is untouched, so rollback is instant!

## What to Check After Migration

### ✅ Indexer Working
```bash
pm2 logs memecoin-indexer --lines 20
```
Should see: "✅ Indexed token: XXX" when trades happen

### ✅ API Working
```bash
curl http://localhost:3002/health
curl http://localhost:3002/api/tokens | jq '.tokens[0]'
```

### ✅ Frontend Working
- Visit your website
- Check tokens page loads
- Check portfolio page loads
- Prices should be correct

### ✅ No Database Errors
```bash
pm2 logs | grep -i error
```
Should not see "connection refused" or "database" errors

## Benefits After Migration

### Immediate Benefits:
- ✅ Never worry about disk space
- ✅ Automatic backups (daily)
- ✅ Better connection pooling
- ✅ Monitoring dashboard

### Long-term Benefits:
- ✅ Easy scaling (just upgrade plan)
- ✅ Point-in-time recovery
- ✅ Better performance
- ✅ 99.9% uptime guarantee

## Cost

- **Current setup:** ~$40-70/month (EC2 + storage)
- **With Supabase Pro:** ~$55-75/month (EC2 + Supabase $25)
- **Difference:** +$0-5/month for way better database

## Monitoring (New Feature!)

After migration, you can monitor your database in Supabase dashboard:

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "Database" → "Query Performance"
4. See all queries, slow queries, connections

No more blind debugging!

## Next Steps After Successful Migration

1. **Delete Ubuntu PostgreSQL** (free up 2-3 GB space):
   ```bash
   sudo systemctl stop postgresql
   sudo systemctl disable postgresql
   sudo apt-get remove --purge postgresql* -y
   ```

2. **Enable automatic backups** in Supabase dashboard:
   - Go to Settings → Backups
   - Backups are already enabled!

3. **Set up monitoring alerts** (optional):
   - Supabase can email you when database is slow
   - Or when it's getting full

---

## Summary

**Time to migrate:** 10-15 minutes  
**Downtime:** 2-3 minutes (during service restart)  
**Risk:** Very low (easy rollback)  
**Difficulty:** Easy (just copy-paste commands)

**Ready to migrate? Just follow Step 1!** 🚀
