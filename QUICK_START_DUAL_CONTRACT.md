# 🚀 Quick Start: Dual Contract Setup

## TL;DR

Your code is **ready**. Just set up the indexer on your server!

---

## On Your Ubuntu Server (5 Minutes)

### 1. Setup (First Time Only)

```bash
cd /path/to/your/project/indexer
./setup.sh
```

This installs PostgreSQL, creates the database, and installs dependencies.

### 2. Configure

```bash
cp .env.example .env
nano .env
```

**Required values:**
```bash
DATABASE_URL=postgresql://memeindexer:PASSWORD@localhost:5432/memecoins
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PLATFORM_PACKAGE=0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5
LEGACY_PLATFORM_PACKAGE=0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0
```

### 3. Start

```bash
npm install -g pm2
pm2 start index.js --name memecoin-indexer
pm2 save
```

### 4. Verify

```bash
pm2 logs memecoin-indexer
```

**You should see:**
```
🚀 Starting Memecoin Indexer...
📦 NEW Package: 0xf19ee4bbe...
📦 LEGACY Package: 0x98da9f73...
📚 Starting historical event indexing...
```

---

## That's It! ✅

The indexer now:
- ✅ Monitors BOTH contracts automatically
- ✅ Indexes all historical events
- ✅ Tracks new events in real-time
- ✅ Supports old AND new curves

---

## Test It

1. **Create a new curve** → Uses NEW contract ✅
2. **Trade an old curve** → Uses LEGACY contract ✅
3. **Both appear in your app** → Seamless! ✅

---

## Check Status

```bash
# Is it running?
pm2 status

# View logs
pm2 logs memecoin-indexer

# Check database
psql -U memeindexer -d memecoins
SELECT COUNT(*) FROM tokens;
SELECT COUNT(*) FROM trades;
```

---

## Need Help?

- **Full Guide**: `VERIFY_DUAL_CONTRACT_SETUP.md`
- **Summary**: `DUAL_CONTRACT_VERIFICATION_COMPLETE.md`
- **Check Script**: `scripts/check-contracts.sh`

---

## What Changed?

### Before
- ❌ Only ONE contract supported
- ❌ Upgrading would break old curves

### After
- ✅ TWO contracts supported simultaneously
- ✅ Old curves keep working
- ✅ New curves use improved contract
- ✅ Zero downtime upgrade

**Users won't notice anything changed!** 🎉
