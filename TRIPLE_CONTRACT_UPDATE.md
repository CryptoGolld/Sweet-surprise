# 🔄 Update: You May Have THREE Contract Versions

## Your Situation

Your old `.env` had: `0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047`

This is a **very old version** (before v0.0.6). You might have curves deployed on:

1. **VERY OLD** `0x39d07cf...` (what you currently have in .env)
2. **LEGACY** `0x98da9f73...` (v0.0.6)  
3. **NEW** `0xf19ee4bbe...` (v0.0.7 - latest)

---

## Quick Check: Do You Have Old Curves?

**On your server, run:**

```bash
# Check your database
psql -U memeindexer -d memecoins -c "
SELECT 
  SUBSTRING(coin_type, 1, 66) as package_id,
  COUNT(*) as curve_count
FROM tokens
GROUP BY SUBSTRING(coin_type, 1, 66)
ORDER BY curve_count DESC;
"
```

**What you'll see:**
- If you only see `0xf19ee4bbe...` and `0x98da9f73...` → You're good! Use the 2-contract setup
- If you also see `0x39d07cf...` → You need the 3-contract setup below

---

## Option A: Two Contracts (Recommended)

**If you DON'T have curves on the old `0x39d07cf...` package:**

Update your `.env`:

```bash
cd /var/www/Sweet-surprise/indexer

# Backup
cp .env .env.backup

# Update to new .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PLATFORM_PACKAGE=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
API_PORT=3002
DISCORD_WEBHOOK_URL=
EOF

# Restart
pm2 restart memecoin-indexer
pm2 logs memecoin-indexer
```

---

## Option B: Three Contracts (If You Have Old Curves)

**If you DO have curves on `0x39d07cf...`:**

### Step 1: Update indexer code to support 3 packages

**On your server:**

```bash
cd /var/www/Sweet-surprise/indexer

# Backup the indexer
cp index.js index.js.backup

# Update index.js to add OLD_PLATFORM_PACKAGE support
```

I'll need to modify `index.js` to watch THREE packages. Let me know if you need this!

### Step 2: Update .env

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PLATFORM_PACKAGE=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
OLD_PLATFORM_PACKAGE=0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047
API_PORT=3002
DISCORD_WEBHOOK_URL=
EOF
```

### Step 3: Restart

```bash
pm2 restart memecoin-indexer
pm2 logs memecoin-indexer
```

---

## Simple Commands (Copy & Paste)

**On your Ubuntu server:**

```bash
# 1. Check what packages you have curves on
cd /var/www/Sweet-surprise/indexer
psql -U memeindexer -d memecoins -c "SELECT SUBSTRING(coin_type, 1, 66) as package, COUNT(*) as count FROM tokens GROUP BY package;"

# 2. Backup current .env
cp .env .env.backup

# 3. Create new .env (with both NEW and LEGACY)
cat > .env << 'EOF'
DATABASE_URL=postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PLATFORM_PACKAGE=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
API_PORT=3002
DISCORD_WEBHOOK_URL=
EOF

# 4. Verify the new .env
cat .env

# 5. Restart indexer
pm2 restart memecoin-indexer

# 6. Watch logs to ensure it's working
pm2 logs memecoin-indexer --lines 50
```

**You should see:**
```
🚀 Starting Memecoin Indexer...
📦 NEW Package: 0xf19ee4bbe...
📦 LEGACY Package: 0x98da9f73...
🌐 RPC: https://fullnode.testnet.sui.io:443
✅ Indexer started!
```

---

## What This Does

- ✅ Watches NEW contract (v0.0.7) - for all new curves
- ✅ Watches LEGACY contract (v0.0.6) - for existing curves
- ✅ Ignores VERY OLD contract (v0.0.5) - unless you have curves there

**If you have curves on the very old contract and need them indexed, let me know and I'll update the indexer code to support 3 packages!**

---

## Need Help?

Let me know the result of:
```bash
psql -U memeindexer -d memecoins -c "SELECT SUBSTRING(coin_type, 1, 66) as package, COUNT(*) as count FROM tokens GROUP BY package;"
```

This will tell me which packages you actually have curves on, and I can provide the exact solution you need!
