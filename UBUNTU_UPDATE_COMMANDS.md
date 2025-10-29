# 🚀 Ubuntu Update Commands - Latest Changes

Run these on your Ubuntu server to deploy all the latest improvements!

---

## 📋 What's New

1. **Bot Package Updated** - New package ID (v0.0.9)
2. **Faster Indexing** - 3 seconds instead of ~1 minute
3. **Combined Launch PTB** - Users can create + buy in one transaction

---

## 🔧 Update Commands

```bash
# 1. Pull latest code
cd /var/www/Sweet-surprise
git pull origin cursor/handle-basic-instruction-55f2

# 2. Update bot package ID
cd pool-creation-bot
nano .env

# Change this line:
# FROM: PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
# TO:   PLATFORM_PACKAGE=0x84ac8c07fb96d2f6f22d4ddb5568b6ede2a973a08730b41991c49d6a8d48ce18

# Save and exit (Ctrl+X, Y, Enter)

# 3. Restart bot
pm2 restart pool-creation-bot

# 4. Check bot is using new package
pm2 logs pool-creation-bot --lines 20
# Should show: Platform package: 0x84ac8c07...

# 5. Update indexer for faster polling
cd ../indexer
nano .env

# Add or update this line:
# POLLING_INTERVAL_MS=3000

# Save and exit (Ctrl+X, Y, Enter)

# 6. Restart indexer
pm2 restart memecoin-indexer  # Or whatever your indexer process is named
# Check with: pm2 list

# 7. Rebuild frontend (to get combined PTB feature)
cd /var/www/Sweet-surprise
npm run build

# 8. If you're running frontend on PM2 (not Vercel), restart it:
pm2 restart your-frontend-process

# If you're using Vercel, just push to GitHub:
git push origin cursor/handle-basic-instruction-55f2
# Vercel will auto-deploy
```

---

## ✅ Verify Everything Works

### 1. Check Bot:
```bash
pm2 logs pool-creation-bot --lines 30 | grep -i "package\|error\|prepare_pool"
```

**Expected:** Should see new package ID and no errors

### 2. Check Indexer Speed:
```bash
# Create a test token on your website
# Time how long it takes to appear

# Before: ~60 seconds
# After: ~3-5 seconds ✅
```

### 3. Check Combined PTB:
```bash
# On your website:
# 1. Create a new token
# 2. On step 1, you should see an optional field:
#    "Buy Amount (Optional)" - For instant purchase at launch
# 3. Enter an amount (e.g., 10)
# 4. Complete step 1 (publish package)
# 5. Step 2 should say "Creating curve and buying tokens..."
# 6. It will combine steps 2+3 into ONE transaction! ✅
```

---

## 🎯 Expected Results

### Bot:
- ✅ Uses new package ID: `0x84ac8c07...`
- ✅ Calls `prepare_pool_liquidity` (no AdminCap needed)
- ✅ Processes graduations successfully

### Indexer:
- ✅ Polls every 3 seconds
- ✅ New tokens appear within 3-5 seconds
- ✅ Much faster user experience

### Frontend:
- ✅ Optional "Buy on Launch" field appears
- ✅ Users can combine launch + buy
- ✅ First-mover advantage for creators

---

## 🆘 Troubleshooting

### Bot Not Processing Graduations:

```bash
# Check bot config
cd /var/www/Sweet-surprise/pool-creation-bot
cat .env | grep PLATFORM_PACKAGE

# Should show: 0x84ac8c07fb96d2f6f22d4ddb5568b6ede2a973a08730b41991c49d6a8d48ce18

# If not, update it:
nano .env
# Change PLATFORM_PACKAGE line
pm2 restart pool-creation-bot
```

### Indexer Still Slow:

```bash
# Check polling interval
cd /var/www/Sweet-surprise/indexer
cat .env | grep POLLING

# Should show: POLLING_INTERVAL_MS=3000

# If not:
nano .env
# Add: POLLING_INTERVAL_MS=3000
pm2 restart memecoin-indexer
```

### Combined PTB Not Working:

```bash
# Frontend needs rebuild
cd /var/www/Sweet-surprise
npm run build

# If on PM2:
pm2 restart your-frontend

# If on Vercel:
git push  # Auto-deploys
```

### Frontend Build Errors:

```bash
# Install dependencies
cd /var/www/Sweet-surprise
npm install

# Try build again
npm run build
```

---

## 📝 Quick Summary

**Update bot:**
```bash
cd /var/www/Sweet-surprise/pool-creation-bot
nano .env  # Change PLATFORM_PACKAGE to 0x84ac8c07...
pm2 restart pool-creation-bot
```

**Speed up indexer:**
```bash
cd /var/www/Sweet-surprise/indexer
nano .env  # Add POLLING_INTERVAL_MS=3000
pm2 restart memecoin-indexer
```

**Update frontend:**
```bash
cd /var/www/Sweet-surprise
git pull
npm run build
pm2 restart frontend  # Or push to Vercel
```

**Check everything:**
```bash
pm2 logs pool-creation-bot --lines 10
pm2 logs memecoin-indexer --lines 10
# Create test token on website
```

---

## 🎉 Done!

All three improvements deployed:
- ✅ Bot on v0.0.9 (no AdminCap)
- ✅ Indexer polls every 3s (fast)
- ✅ Users can launch + buy together (PTB)

Your platform is now faster and more user-friendly! 🚀
