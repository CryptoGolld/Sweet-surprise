#!/bin/bash

echo "🔍 Checking Indexer Status..."
echo ""

# Check PM2 status
echo "1. PM2 Status:"
pm2 status memecoin-indexer 2>/dev/null || echo "   ❌ PM2 not found or indexer not running"
echo ""

# Check database connection and data
echo "2. Database Check:"
echo "   Checking tokens..."
sudo -u postgres psql memecoins -c "SELECT COUNT(*) as total_tokens FROM tokens;" 2>/dev/null || echo "   ❌ Cannot connect to database"

echo "   Checking trades..."
sudo -u postgres psql memecoins -c "SELECT COUNT(*) as total_trades FROM trades;" 2>/dev/null || echo "   ❌ Cannot query trades"

echo "   Checking recent trades..."
sudo -u postgres psql memecoins -c "SELECT coin_type, trade_type, timestamp FROM trades ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "   ❌ Cannot query recent trades"

echo "   Checking price snapshots (for charts)..."
sudo -u postgres psql memecoins -c "SELECT coin_type, COUNT(*) as candle_count FROM price_snapshots GROUP BY coin_type;" 2>/dev/null || echo "   ❌ Cannot query price snapshots"

echo ""

# Check indexer logs
echo "3. Recent Indexer Logs:"
pm2 logs memecoin-indexer --lines 30 --nostream 2>/dev/null || echo "   ❌ Cannot read logs"

echo ""
echo "✅ Check complete!"
echo ""
echo "If you see errors above, the indexer might not be running properly."
echo "To fix:"
echo "1. cd /var/www/Sweet-surprise/indexer"
echo "2. pm2 restart memecoin-indexer"
echo "3. pm2 logs memecoin-indexer"
