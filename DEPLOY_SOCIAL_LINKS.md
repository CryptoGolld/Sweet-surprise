# 🚀 Deploy Social Links & Image Support

## On Ubuntu Server:

```bash
cd /var/www/Sweet-surprise

# 1. Pull latest changes
git pull origin main

# 2. Add database columns
cd indexer
psql postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins < add-social-links.sql

# 3. Restart services
pm2 restart memecoin-api
pm2 restart memecoin-indexer

# 4. Verify
pm2 logs
```

## What This Adds:

✅ **Image uploads** - IPFS via Pinata
✅ **Social links** - Twitter, Telegram, Website
✅ **Database columns** - twitter, telegram, website
✅ **API endpoint** - POST /api/update-metadata
✅ **Token pages** - Display images and social links

## How It Works:

1. User creates token with image & socials
2. Image uploads to IPFS (if using upload)
3. After step 2, metadata sent to API
4. Database updated with image URL & social links
5. Token page shows image & clickable social links

## Test:

Create a new token with:
- Uploaded image (or URL)
- Twitter handle
- Telegram handle
- Website URL

Token page will show all of them! 🎉
