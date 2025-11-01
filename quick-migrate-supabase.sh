#!/bin/bash
# Quick Supabase Migration Script
# This migrates your database from Ubuntu PostgreSQL to Supabase

set -e  # Exit on any error

echo "🚀 Starting Supabase Migration..."
echo ""

# Configuration
OLD_DB="postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins"
NEW_DB="postgresql://postgres:suilfgindexer@db.xenzymhhojbqeovuvdfh.supabase.co:5432/postgres"
BACKUP_DIR="database-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Create backup
echo "📦 Step 1/6: Creating backup..."
mkdir -p $BACKUP_DIR
pg_dump "$OLD_DB" > "$BACKUP_DIR/ubuntu-backup-$TIMESTAMP.sql"
BACKUP_SIZE=$(du -h "$BACKUP_DIR/ubuntu-backup-$TIMESTAMP.sql" | cut -f1)
echo "   ✅ Backup created: $BACKUP_SIZE"
echo ""

# Step 2: Import to Supabase
echo "⬆️  Step 2/6: Importing to Supabase..."
echo "   This may take a few minutes..."
psql "$NEW_DB" < "$BACKUP_DIR/ubuntu-backup-$TIMESTAMP.sql" 2>&1 | grep -v "ERROR.*already exists" || true
echo "   ✅ Data imported to Supabase"
echo ""

# Step 3: Verify data
echo "🔍 Step 3/6: Verifying data..."
echo "   Checking row counts..."

OLD_TOKENS=$(psql "$OLD_DB" -t -c "SELECT COUNT(*) FROM tokens")
NEW_TOKENS=$(psql "$NEW_DB" -t -c "SELECT COUNT(*) FROM tokens")
echo "   Tokens: Ubuntu=$OLD_TOKENS, Supabase=$NEW_TOKENS"

OLD_TRADES=$(psql "$OLD_DB" -t -c "SELECT COUNT(*) FROM trades")
NEW_TRADES=$(psql "$NEW_DB" -t -c "SELECT COUNT(*) FROM trades")
echo "   Trades: Ubuntu=$OLD_TRADES, Supabase=$NEW_TRADES"

if [ "$OLD_TOKENS" != "$NEW_TOKENS" ] || [ "$OLD_TRADES" != "$NEW_TRADES" ]; then
    echo "   ⚠️  Row counts don't match! Check manually before proceeding."
    echo "   Press Ctrl+C to cancel, or Enter to continue anyway..."
    read
else
    echo "   ✅ All data verified!"
fi
echo ""

# Step 4: Backup .env
echo "💾 Step 4/6: Updating configuration..."
cp indexer/.env indexer/.env.backup
echo "   ✅ Backed up .env to .env.backup"

# Update DATABASE_URL
sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$NEW_DB|g" indexer/.env
echo "   ✅ Updated DATABASE_URL in .env"
echo ""

# Step 5: Restart services
echo "🔄 Step 5/6: Restarting services..."
pm2 stop all
sleep 2
pm2 restart all
echo "   ✅ Services restarted with Supabase"
echo ""

# Step 6: Verify services
echo "✅ Step 6/6: Verifying services..."
sleep 3
pm2 list
echo ""

echo "🎉 Migration Complete!"
echo ""
echo "Next steps:"
echo "1. Check logs: pm2 logs --lines 50"
echo "2. Test your website"
echo "3. If everything works, you can delete Ubuntu PostgreSQL:"
echo "   sudo systemctl stop postgresql"
echo ""
echo "Rollback if needed:"
echo "   cp indexer/.env.backup indexer/.env"
echo "   pm2 restart all"
echo ""
