# Social Links & Image Display Fix

## Issues Found and Fixed

### ✅ Issue 1: Social Links Not Showing

**Problem:** Token pages have the UI for displaying Twitter, Telegram, and Website links, but they weren't showing up even though the data was being collected during token creation.

**Root Cause:** The API server was conditionally checking if social columns exist in the database, and if the check failed, it would skip including those fields in the response entirely.

**What Was Fixed:**

1. **API Server (`/workspace/indexer/api-server.js`):**
   - Changed from conditional column checking to always including social fields
   - Now explicitly includes: `twitter`, `telegram`, `website`, `cetus_pool_address`
   - If columns don't exist, the API will throw a clear error instead of silently skipping

2. **Migration Script Created:**
   - `/workspace/indexer/migrations/ensure_social_columns.sql`
   - Safely adds missing columns if they don't exist
   - Can be run multiple times (idempotent)

### ✅ Issue 2: Images Being Cropped

**Problem:** Token images were using `object-cover` CSS property which crops images to fill the container, cutting off parts of the image.

**What Was Fixed:**

Changed `object-cover` to `object-contain` in:
1. **Token Page** (`/workspace/app/tokens/[id]/page.tsx` - line 256)
   - Main token image now shows full image without cropping
2. **Token Cards** (`/workspace/components/coins/CoinCard.tsx` - line 65)
   - Small token thumbnails also show full image

**CSS Change:**
```css
/* OLD - Crops image */
object-cover

/* NEW - Shows full image */
object-contain
```

## How to Deploy

### Step 1: Run the Migration (Required for Social Links)

**On your Ubuntu server:**

```bash
# Connect to your database and run the migration
cd /workspace/indexer
psql $DATABASE_URL -f migrations/ensure_social_columns.sql
```

**Expected output:**
```
 column_name         | data_type 
---------------------+-----------
 cetus_pool_address  | text
 telegram            | text
 twitter             | text
 website             | text
(4 rows)
```

### Step 2: Restart Services

```bash
# Restart the API server to use the updated code
cd /workspace/indexer
pm2 restart api-server

# Also restart the main indexer
pm2 restart indexer

# Check everything is running
pm2 status
```

### Step 3: Verify the Fixes

#### For Social Links:

1. Go to any token page on your frontend
2. If the token was created with social links, you should now see them displayed:
   - 🐦 Twitter button (blue)
   - 📱 Telegram button (light blue)
   - 🌐 Website button (purple)

3. Create a new token with social links to test:
   - Fill in Twitter (can be username or full URL)
   - Fill in Telegram (can be handle or full URL)
   - Fill in Website (full URL)
   - After creation, visit the token page and verify links appear

#### For Images:

1. Visit any token page
2. The token image should now display in full without cropping
3. Check the token list - small thumbnails should also show complete images

## Technical Details

### Social Links Storage

Social links are stored in the `tokens` table with these columns:
```sql
twitter TEXT,           -- Twitter handle or URL
telegram TEXT,          -- Telegram handle or URL  
website TEXT,           -- Full website URL
cetus_pool_address TEXT -- Cetus DEX pool address (for graduated tokens)
```

### Social Links Flow

1. **During Token Creation:**
   - User fills in social fields in CreateCoinModal
   - After curve creation, metadata is sent via `/api/update-metadata`
   - Backend updates the database

2. **When Displaying Token:**
   - Frontend fetches token via `/api/proxy/tokens`
   - Backend includes social fields in response
   - Token page checks if fields exist and renders buttons
   - Links auto-format (e.g., `@username` → `https://twitter.com/username`)

### Image Display

Using `object-contain` ensures:
- ✅ Entire image is visible
- ✅ No cropping or distortion
- ✅ Maintains aspect ratio
- ✅ Centers in container with background gradient

The gradient background (`from-meme-pink/20 to-sui-blue/20`) shows through if the image doesn't fill the entire container (e.g., if it's portrait or landscape).

## Troubleshooting

### Social Links Still Not Showing?

**Check 1: Database columns exist**
```bash
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='tokens' AND column_name IN ('twitter', 'telegram', 'website');"
```

**Check 2: API is including the fields**
```bash
curl http://13.60.235.109:3002/api/tokens?limit=1 | jq '.'
```
Look for `twitter`, `telegram`, `website` in the response.

**Check 3: Token actually has social data**
```bash
psql $DATABASE_URL -c "SELECT ticker, twitter, telegram, website FROM tokens WHERE twitter IS NOT NULL OR telegram IS NOT NULL OR website IS NOT NULL;"
```

### If Migration Fails

If the SQL migration fails, you can add columns manually:
```sql
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS telegram TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS cetus_pool_address TEXT;
```

## Summary

✅ **Images now display fully** - Changed from `object-cover` to `object-contain`
✅ **Social links now display** - API always includes social fields
✅ **Migration provided** - Safely adds missing database columns
✅ **Backward compatible** - NULL values handled gracefully

After deploying these changes, both new and existing tokens will display correctly!
