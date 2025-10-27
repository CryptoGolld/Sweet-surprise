# 🖼️ Pinata IPFS Setup Guide

Your platform now supports decentralized image storage via Pinata IPFS!

## Quick Setup (2 minutes)

### 1. Get Pinata API Key

1. Go to https://app.pinata.cloud/
2. Sign up / Login (free account works)
3. Go to "API Keys" in the sidebar
4. Click "New Key"
5. Enable these permissions:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
6. Give it a name like "SuiLFG MemeFi"
7. Click "Create Key"
8. **Copy the JWT** (you won't see it again!)

### 2. Add to Environment Variables

Create `/workspace/.env.local`:

```bash
PINATA_JWT=your_jwt_token_here
```

### 3. Deploy to Vercel

Add the environment variable in Vercel:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - **Key:** `PINATA_JWT`
   - **Value:** (paste your JWT)
   - **Environment:** Production, Preview, Development

4. Redeploy

---

## How It Works

### For Users:
1. Click "Create Token"
2. Click the image upload area
3. Select an image (PNG, JPG, GIF - max 10MB)
4. Image automatically uploads to IPFS
5. Permanent, decentralized storage! 🎉

### Technical:
- Images uploaded to Pinata's IPFS gateway
- Get permanent IPFS hash
- Accessible from any IPFS gateway
- No centralized hosting needed
- Images can't be deleted or taken down

---

## Benefits

✅ **Decentralized**: Images stored on IPFS, not your server  
✅ **Permanent**: Can't be deleted once uploaded  
✅ **Fast**: Pinata's global CDN  
✅ **Free**: Up to 1GB storage on free plan  
✅ **Secure**: Content-addressed (hash-based)  

---

## Testing Locally

```bash
# Add to .env.local
PINATA_JWT=your_jwt_here

# Start dev server
npm run dev

# Test upload in Create Token modal
```

---

## Free Plan Limits

- ✅ 1 GB total storage
- ✅ 100 GB bandwidth/month
- ✅ Unlimited uploads

**More than enough for a memecoin launch platform!**

---

## Fallback

Users can still paste image URLs manually if they prefer.
The upload is completely optional but recommended for best UX.

---

## Support

Issues with Pinata? Check:
- Pinata Dashboard: https://app.pinata.cloud/
- Pinata Docs: https://docs.pinata.cloud/
- Status Page: https://status.pinata.cloud/
