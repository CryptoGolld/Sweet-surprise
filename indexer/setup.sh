#!/bin/bash
# Indexer setup script - Run once on your Ubuntu server

set -e

echo "🚀 Setting up Memecoin Indexer..."

# Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo "✅ PostgreSQL installed"
else
    echo "✅ PostgreSQL already installed"
fi

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "✅ Node.js installed"
else
    echo "✅ Node.js already installed ($(node --version))"
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed"
fi

# Create database
echo "🗄️  Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE memecoins;" 2>/dev/null || echo "Database already exists"

# Create database user
sudo -u postgres psql -c "CREATE USER memeindexer WITH PASSWORD 'changeme123';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE memecoins TO memeindexer;"

# Run schema
sudo -u postgres psql -d memecoins -f schema.sql

echo "✅ Database setup complete"

# Install dependencies
echo "📦 Installing indexer dependencies..."
npm install

# Create .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your settings!"
    echo "   nano .env"
else
    echo "✅ .env already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file:               nano .env"
echo "2. Test indexer:                 npm start"
echo "3. Run indexer in background:    pm2 start index.js --name memecoin-indexer"
echo "4. Run API server:               pm2 start api-server.js --name memecoin-api"
echo "5. View logs:                    pm2 logs"
echo "6. Auto-restart on boot:         pm2 startup && pm2 save"
echo ""
echo "📝 Don't forget to add to your frontend .env:"
echo "   NEXT_PUBLIC_INDEXER_API=http://your-server-ip:3001"
echo ""
