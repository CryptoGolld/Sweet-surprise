#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Verifying Dual Contract Setup..."
echo ""

# Contract addresses
NEW_CONTRACT="0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5"
LEGACY_CONTRACT="0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0"

echo "📦 NEW Contract (v0.0.7):"
echo "   Package: $NEW_CONTRACT"
echo ""

echo "📦 LEGACY Contract (v0.0.6):"
echo "   Package: $LEGACY_CONTRACT"
echo ""

# Check if indexer is running
echo "🔍 Checking indexer status..."
if command -v pm2 &> /dev/null; then
    pm2 status memecoin-indexer 2>&1 | grep -q "online"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✅ Indexer is running${NC}"
        echo "   View logs: pm2 logs memecoin-indexer"
    else
        echo -e "${YELLOW}   ⚠️  Indexer is not running${NC}"
        echo "   Start it: pm2 start /workspace/indexer/index.js --name memecoin-indexer"
    fi
else
    echo -e "${YELLOW}   ⚠️  PM2 not installed${NC}"
    echo "   Install: npm install -g pm2"
fi

echo ""

# Check if .env exists
echo "🔍 Checking indexer configuration..."
if [ -f "/workspace/indexer/.env" ]; then
    echo -e "${GREEN}   ✅ .env file exists${NC}"
    
    # Check if it has the right variables
    if grep -q "PLATFORM_PACKAGE" /workspace/indexer/.env; then
        echo -e "${GREEN}   ✅ PLATFORM_PACKAGE configured${NC}"
    else
        echo -e "${YELLOW}   ⚠️  PLATFORM_PACKAGE not found in .env${NC}"
    fi
    
    if grep -q "LEGACY_PLATFORM_PACKAGE" /workspace/indexer/.env; then
        echo -e "${GREEN}   ✅ LEGACY_PLATFORM_PACKAGE configured${NC}"
    else
        echo -e "${YELLOW}   ⚠️  LEGACY_PLATFORM_PACKAGE not found in .env${NC}"
    fi
else
    echo -e "${RED}   ❌ .env file not found${NC}"
    echo "   Create it: cp /workspace/indexer/.env.example /workspace/indexer/.env"
    echo "   Then edit it with your database credentials"
fi

echo ""

# Check database
echo "🔍 Checking database..."
if command -v psql &> /dev/null; then
    if psql -U memeindexer -d memecoins -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}   ✅ Database is accessible${NC}"
        
        # Get token count
        TOKEN_COUNT=$(psql -U memeindexer -d memecoins -t -c "SELECT COUNT(*) FROM tokens;" 2>/dev/null | tr -d ' ')
        echo "   Tokens indexed: $TOKEN_COUNT"
        
        # Get trade count
        TRADE_COUNT=$(psql -U memeindexer -d memecoins -t -c "SELECT COUNT(*) FROM trades;" 2>/dev/null | tr -d ' ')
        echo "   Trades indexed: $TRADE_COUNT"
    else
        echo -e "${YELLOW}   ⚠️  Cannot connect to database${NC}"
        echo "   Run setup: cd /workspace/indexer && ./setup.sh"
    fi
else
    echo -e "${YELLOW}   ⚠️  PostgreSQL not installed${NC}"
    echo "   Install: sudo apt install postgresql"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. If .env missing: Create /workspace/indexer/.env (see .env.example)"
echo "   2. If database not set up: cd /workspace/indexer && ./setup.sh"
echo "   3. Start indexer: pm2 start /workspace/indexer/index.js --name memecoin-indexer"
echo "   4. Save PM2: pm2 save"
echo "   5. View logs: pm2 logs memecoin-indexer"
echo ""
echo "🚀 Once indexer is running, it will monitor BOTH contracts automatically!"
