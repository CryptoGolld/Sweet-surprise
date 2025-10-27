# 🖼️ Fix Images & Social Links - Run This NOW

The frontend is updated but needs database columns. Run this on Ubuntu server:

```bash
cd /var/www/Sweet-surprise
git pull origin main

# Add database columns (this is the fix!)
cd indexer
psql postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins << 'EOF'
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS telegram TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

CREATE INDEX IF NOT EXISTS idx_tokens_twitter ON tokens(twitter) WHERE twitter IS NOT NULL;
EOF

# Restart API
pm2 restart memecoin-api

# Test it works
curl http://localhost:3002/api/tokens | head -20
```

**Expected:** Should see tokens without errors

---

## After This:

✅ Images will display on token pages
✅ Social links will be saved
✅ New tokens will have all metadata
✅ No more 500 errors

---

## Quick Test:

1. Create a new token with image & Twitter
2. After Step 2 completes, check the database:

```bash
psql postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins -c "SELECT ticker, image_url, twitter FROM tokens;"
```

Should show the image URL and Twitter handle!

**That's it!** 🎉
