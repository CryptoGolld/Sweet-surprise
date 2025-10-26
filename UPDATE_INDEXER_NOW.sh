#!/bin/bash

# 🚀 ONE-COMMAND UPDATE FOR YOUR INDEXER
# Run this on your Ubuntu server: ubuntu@ip-172-31-26-186

echo "🔄 Updating Indexer for Dual Contract Support..."
echo ""

# Navigate to indexer
cd /var/www/Sweet-surprise/indexer || {
  echo "❌ Error: Could not find /var/www/Sweet-surprise/indexer"
  echo "   Make sure you're running this on your server!"
  exit 1
}

# Backup current .env
echo "📦 Backing up current .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Create new .env with dual contract support
echo "✍️  Creating new .env with dual contract support..."
cat > .env << 'EOF'
# Database (keeping your existing credentials)
DATABASE_URL=postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins

# Sui Network
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# NEW Contract (v0.0.7 - Latest, all new curves use this)
PLATFORM_PACKAGE=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5

# LEGACY Contract (v0.0.6 - Recent existing curves)
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0

# API server port
API_PORT=3002

# Discord webhook (optional)
DISCORD_WEBHOOK_URL=
EOF

echo "✅ New .env created!"
echo ""

# Show the new config
echo "📄 New configuration:"
cat .env
echo ""

# Restart indexer
echo "🔄 Restarting indexer..."
pm2 restart memecoin-indexer

echo ""
echo "⏳ Waiting for indexer to start..."
sleep 3

echo ""
echo "📊 Current PM2 status:"
pm2 status

echo ""
echo "📝 Showing recent logs..."
pm2 logs memecoin-indexer --lines 30 --nostream

echo ""
echo "✅ Update complete!"
echo ""
echo "👀 You should see in the logs:"
echo "   🚀 Starting Memecoin Indexer..."
echo "   📦 NEW Package: 0xf19ee4bbe..."
echo "   📦 LEGACY Package: 0x98da9f73..."
echo ""
echo "📊 To check what packages you have curves on:"
echo "   psql -U memeindexer -d memecoins -c \"SELECT SUBSTRING(coin_type, 1, 66) as package, COUNT(*) as count FROM tokens GROUP BY package;\""
echo ""
echo "🔍 To monitor logs in real-time:"
echo "   pm2 logs memecoin-indexer"
echo ""
