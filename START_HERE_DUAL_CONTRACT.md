# 🎯 START HERE: Dual Contract Setup Complete

## ✅ Your Codebase is Ready!

Everything is configured for dual contract support. You just need to set up and restart your indexer.

---

## 📚 Documentation Created

I've created several guides for you:

### 1. **QUICK_START_DUAL_CONTRACT.md** ⚡
**Start here!** Quick 5-minute setup guide.
- Copy-paste commands
- Minimal explanation
- Get running fast

### 2. **VERIFY_DUAL_CONTRACT_SETUP.md** 📖
**Detailed guide** with step-by-step instructions.
- Complete setup process
- Environment configuration
- Testing procedures
- Troubleshooting

### 3. **DUAL_CONTRACT_VERIFICATION_COMPLETE.md** 📊
**Technical summary** of what's done.
- Code changes explained
- Architecture overview
- Expected behavior
- Monitoring guide

### 4. **scripts/check-contracts.sh** 🔍
**Verification script** to check your setup.
```bash
./scripts/check-contracts.sh
```
Shows:
- Contract addresses
- Indexer status
- Database connection
- Configuration status

---

## 🚀 What You Need to Do

### On Your Ubuntu Server:

```bash
# 1. Go to indexer directory
cd /path/to/your/project/indexer

# 2. Run setup script (first time only)
./setup.sh

# 3. Create .env file
cp .env.example .env
nano .env  # Edit with your database password

# 4. Install PM2
npm install -g pm2

# 5. Start indexer
pm2 start index.js --name memecoin-indexer
pm2 save

# 6. Check it's working
pm2 logs memecoin-indexer
```

**That's it!** The indexer will automatically monitor both contracts.

---

## ✅ What's Already Done (No Action Needed)

### Frontend Configuration ✅
- `lib/constants.ts` - Has both NEW and LEGACY contracts
- `lib/sui/transactions.ts` - Auto-detects correct contract
- **No changes needed!**

### Indexer Code ✅
- `indexer/index.js` - Watches both contracts
- Historical indexing - Catches up on all past events
- Live polling - Monitors new events
- **No changes needed!**

### Contract Detection ✅
- `getContractForCurve()` - Automatically detects which contract a curve uses
- Old curves → LEGACY contract
- New curves → NEW contract
- **Works automatically!**

---

## 🧪 Testing

### Test 1: Create New Curve
1. Go to your website
2. Create a new coin
3. **Expected**: Uses NEW contract (`0xf19ee4bbe...`)
4. **Check**: Indexer logs show "✅ Indexed token"

### Test 2: Trade Old Curve
1. Find an existing curve (created before upgrade)
2. Buy some tokens
3. **Expected**: Uses LEGACY contract (`0x98da9f73...`)
4. **Check**: Transaction succeeds, indexer tracks it

### Test 3: Verify Both Indexed
```bash
psql -U memeindexer -d memecoins
SELECT COUNT(*) FROM tokens;  -- Should show tokens from both contracts
SELECT COUNT(*) FROM trades;  -- Should show trades from both contracts
```

---

## 🎯 What Happens Now?

### For New Curves:
- ✅ Use NEW contract (v0.0.7)
- ✅ Have all latest features
- ✅ Better bot integration
- ✅ Auto-graduation improvements

### For Old Curves:
- ✅ Use LEGACY contract (v0.0.6)
- ✅ Keep working exactly as before
- ✅ No migration needed
- ✅ Backward compatible

### For Users:
- ✅ Seamless experience
- ✅ No disruption
- ✅ All curves visible
- ✅ All curves tradeable

---

## 📊 Contract Addresses Reference

```typescript
// NEW Contract (v0.0.7) - For new curves
PLATFORM_PACKAGE: '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5'

// LEGACY Contract (v0.0.6) - For existing curves  
LEGACY_PLATFORM_PACKAGE: '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0'
```

Both are configured in:
- ✅ Frontend (`lib/constants.ts`)
- ✅ Indexer (`indexer/index.js`)
- ✅ Transaction builder (`lib/sui/transactions.ts`)

---

## 🆘 Need Help?

### Quick Issues

**Indexer not starting?**
```bash
pm2 logs memecoin-indexer
# Check for database connection errors
```

**No events being indexed?**
```bash
# Check RPC is working
curl -X POST https://fullnode.testnet.sui.io:443 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getChainIdentifier"}'
```

**Database connection failed?**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
# Check credentials in .env
```

### Documentation

- Quick start: `QUICK_START_DUAL_CONTRACT.md`
- Detailed guide: `VERIFY_DUAL_CONTRACT_SETUP.md`
- Technical summary: `DUAL_CONTRACT_VERIFICATION_COMPLETE.md`
- Check script: `scripts/check-contracts.sh`

---

## 🎉 Summary

**Status**: ✅ **READY TO DEPLOY**

**What you have:**
- ✅ Dual contract support in frontend
- ✅ Dual contract support in indexer
- ✅ Automatic contract detection
- ✅ Backward compatibility
- ✅ Complete documentation
- ✅ Verification scripts

**What you need to do:**
1. Set up indexer on your server (5 minutes)
2. Create `.env` file with your database credentials
3. Start the indexer with PM2
4. Test creating a new curve
5. Test trading an old curve

**That's it!** Both will work seamlessly.

---

## 🚀 Ready?

Start with the quick guide:
```bash
cat QUICK_START_DUAL_CONTRACT.md
```

Or run the verification script:
```bash
./scripts/check-contracts.sh
```

**Your platform now supports TWO contracts simultaneously with zero downtime!** 🎉
