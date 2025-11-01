#!/bin/bash
# Deploy Price Calculation Fix to Ubuntu Server
# Run this script on your Ubuntu server

set -e  # Exit on any error

echo "🚀 Deploying Price Calculation Fix..."

# 1. Pull latest changes from git
echo ""
echo "📥 Step 1: Pulling latest changes from branch..."
git fetch origin
git pull origin cursor/store-user-name-israel-a378  # Your current branch

# 2. Install any new dependencies (just in case)
echo ""
echo "📦 Step 2: Installing dependencies..."
npm install

# 3. Build the frontend
echo ""
echo "🔨 Step 3: Building Next.js frontend..."
npm run build

# 4. Restart all PM2 services
echo ""
echo "🔄 Step 4: Restarting services..."
pm2 restart all

# 5. Show logs
echo ""
echo "📊 Step 5: Checking logs..."
pm2 logs --lines 20

echo ""
echo "✅ Deploy complete!"
echo ""
echo "🔍 Verify the fix:"
echo "   1. Check indexer logs: pm2 logs indexer --lines 50"
echo "   2. Visit your website and check market caps"
echo "   3. Market caps should show realistic values (1K-52K SUI range)"
echo ""
