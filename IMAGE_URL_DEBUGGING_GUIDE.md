# Image URL Debugging Guide

## Issue
Coin icons (imageUrl) appear empty on the blockchain explorer even though IPFS upload is working correctly.

## Root Cause Analysis

The system has the following flow for handling coin images:

1. **IPFS Upload** → `ImageUpload.tsx` uploads to `/api/upload` → returns IPFS URL
2. **State Update** → `onChange()` callback updates `formData.imageUrl` in `CreateCoinModal`
3. **Compilation** → `createCoinTransaction()` sends `imageUrl` to compilation service
4. **Move Code Generation** → Compilation service generates Move code with `icon_url` parameter
5. **Package Publishing** → User signs transaction to publish package with metadata
6. **Metadata Creation** → `coin::create_currency()` creates `CoinMetadata` with `icon_url` field

## Debugging Additions

I've added comprehensive logging throughout the entire flow:

### 1. IPFS Upload Logging (`components/ImageUpload.tsx`)
```
✅ IPFS upload successful, URL: <url>
```

### 2. Form State Logging (`components/modals/CreateCoinModal.tsx`)
```
📸 ImageUpload onChange called with URL: <url>
📋 formData.imageUrl updated: <url>
🎨 Creating coin with imageUrl: <url>
```

### 3. API Proxy Logging (`app/api/compile-proxy/route.ts`)
```
📸 Compile request - imageUrl: <url>
📦 Compile request - ticker: <ticker> name: <name>
```

### 4. Compilation Service Logging (`compilation-service/index.js`)
```
📸 Compilation request - imageUrl: <url>
```

### 5. User Warning
If no image is uploaded, users will now see a toast warning:
```
⚠️  No image uploaded - Your coin will be created without an icon
```

## How to Debug

### Step 1: Check Browser Console
Open browser DevTools and watch the console when creating a coin:

1. Upload an image
2. Look for: `✅ IPFS upload successful, URL: https://...`
3. Look for: `📸 ImageUpload onChange called with URL: https://...`
4. Look for: `📋 formData.imageUrl updated: https://...`
5. When submitting, look for: `🎨 Creating coin with imageUrl: https://...`

**If any of these logs show `(empty)`, the imageUrl is not being set correctly in the frontend.**

### Step 2: Check Vercel/Next.js Logs
Check the server-side logs for the compile-proxy:

```
📸 Compile request - imageUrl: https://...
📦 Compile request - ticker: XXX name: YYY
```

**If this shows `(empty)`, the imageUrl is not being sent to the backend.**

### Step 3: Check Compilation Service Logs
SSH to the Ubuntu server and check the compilation service logs:

```bash
# Check if service is running
pm2 list

# View logs
pm2 logs compilation-service
```

Look for:
```
📸 Compilation request - imageUrl: https://...
```

The generated Move code should include:
```move
option::some(url::new_unsafe_from_bytes(b"https://..."))
```

**If this shows `option::none()`, the imageUrl was not passed to the compilation service.**

### Step 4: Check Blockchain Explorer
After the coin is created, check the CoinMetadata object on the explorer:

1. Find the transaction digest
2. Look for the `CoinMetadata` object created
3. Check the `icon_url` field

**If the on-chain metadata shows an empty `icon_url`, but all the logs show the URL correctly, then there might be an issue with how the Sui blockchain or explorer displays the metadata.**

## Potential Issues & Solutions

### Issue 1: ImageUrl Not Being Set in Form State
**Symptom:** Browser console shows `(empty)` for imageUrl
**Solution:** 
- Check if IPFS upload is completing successfully
- Verify the `onChange` callback is being called
- Check for React state update issues

### Issue 2: ImageUrl Not Reaching Compilation Service
**Symptom:** Compilation service logs show `(empty)`
**Solution:**
- Check the compile-proxy is forwarding all parameters
- Verify the API request payload includes imageUrl
- Check network requests in browser DevTools

### Issue 3: Move Code Generation Issue
**Symptom:** Compilation service receives URL but generates `option::none()`
**Solution:**
- Check the compilation service code at line 98-100
- Verify the `imageUrl` variable is not undefined
- Check for string encoding issues

### Issue 4: Blockchain Metadata Not Displaying
**Symptom:** All logs show correct URL, but explorer shows empty
**Solution:**
- Verify the `coin::create_currency` call is using the correct parameters
- Check if the metadata object was actually frozen with the icon_url
- Try using a different explorer or query the object directly via RPC

## Testing the Fix

1. **Restart the compilation service** to pick up the new logging:
   ```bash
   pm2 restart compilation-service
   ```

2. **Create a test coin** and watch all the logs

3. **Follow the debug steps** above to identify where the imageUrl is being lost

4. **Check the transaction** on the explorer to verify the icon_url field

## Next Steps

If after checking all the logs you find that:

- ✅ IPFS upload works
- ✅ imageUrl is set in form state
- ✅ imageUrl reaches the compilation service
- ✅ Move code is generated with the correct icon_url
- ❌ But the explorer still shows empty icon_url

Then the issue is likely with:
1. How the Sui blockchain stores/displays optional URL fields
2. The explorer's display logic
3. The metadata object not being created correctly on-chain

In that case, we would need to:
1. Query the CoinMetadata object directly via RPC
2. Check the raw object data to see if icon_url is actually stored
3. Verify the Move contract is correctly passing the icon_url to `coin::create_currency`
