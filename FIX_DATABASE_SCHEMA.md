# Fix Database Schema - Add Social Media Columns

## The Problem

The indexer database is missing columns for social media links (twitter, telegram, website).

Error:
```
column "twitter" does not exist
```

## The Solution

Run this SQL migration on your Ubuntu server's PostgreSQL database.

## Commands to Run

```bash
# SSH to your Ubuntu server
ssh ubuntu@13.60.235.109

# Connect to PostgreSQL
sudo -u postgres psql

# Connect to your database (replace 'memefi' with your actual database name)
\c memefi

# Run the migration
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS telegram TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

# Create indexes (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_twitter ON tokens(twitter) WHERE twitter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_telegram ON tokens(telegram) WHERE telegram IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_website ON tokens(website) WHERE website IS NOT NULL;

# Verify the columns were added
\d tokens

# Exit psql
\q
```

## Alternative: Run Migration File

If you want to use the migration file:

```bash
# SSH to server
ssh ubuntu@13.60.235.109

# Navigate to indexer
cd /var/www/Sweet-surprise/indexer

# Pull latest changes (includes migration file)
git fetch
git checkout cursor/handle-basic-instruction-55f2
git pull origin cursor/handle-basic-instruction-55f2

# Run the migration
sudo -u postgres psql memefi < migrations/add_social_columns.sql

# Restart the API server (if using pm2)
pm2 restart indexer-api
```

## Verify It Worked

After running the migration, try creating a coin with social media links. The error should be gone!

You should see in the logs:
```
📝 Updated metadata for 0x...::coin::COIN
```

Instead of:
```
❌ column "twitter" does not exist
```

## Note

The **imageUrl issue is FIXED!** Your coins are now being created with icons. This database issue is a separate problem that only affects the optional social media metadata.
