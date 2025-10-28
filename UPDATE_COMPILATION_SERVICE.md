# Update Compilation Service with Logging

## Changes Made

Added logging to the compilation service at line 46 in `compilation-service/index.js`:

```javascript
// Log imageUrl for debugging
console.log(`📸 Compilation request - imageUrl: ${imageUrl || '(empty)'}`);
```

## How to Deploy the Update

### Option 1: Manual Update on Server

1. **SSH to the Ubuntu server:**
   ```bash
   ssh ubuntu@13.60.235.109
   ```

2. **Navigate to the compilation service directory:**
   ```bash
   cd /path/to/compilation-service
   ```

3. **Pull the latest code:**
   ```bash
   git pull
   ```

4. **Restart the service:**
   ```bash
   pm2 restart compilation-service
   ```

5. **Check logs:**
   ```bash
   pm2 logs compilation-service
   ```

### Option 2: Manual File Edit (Quick Fix)

1. **SSH to the server:**
   ```bash
   ssh ubuntu@13.60.235.109
   ```

2. **Edit the file directly:**
   ```bash
   nano /path/to/compilation-service/index.js
   ```

3. **Add logging after line 43:**
   ```javascript
   const { ticker, name, description, imageUrl } = req.body;
   
   // Log imageUrl for debugging
   console.log(`📸 Compilation request - imageUrl: ${imageUrl || '(empty)'}`);
   ```

4. **Save and restart:**
   ```bash
   pm2 restart compilation-service
   pm2 logs compilation-service
   ```

### Option 3: Copy the Updated File

1. **From your local workspace, copy the file to the server:**
   ```bash
   scp /workspace/compilation-service/index.js ubuntu@13.60.235.109:/path/to/compilation-service/
   ```

2. **SSH to server and restart:**
   ```bash
   ssh ubuntu@13.60.235.109
   pm2 restart compilation-service
   ```

## Verify the Update

After restarting, create a test coin and check the logs:

```bash
pm2 logs compilation-service --lines 50
```

You should see:
```
📸 Compilation request - imageUrl: https://ipfs.io/ipfs/...
```

Or if no image is provided:
```
📸 Compilation request - imageUrl: (empty)
```

## Next Steps

Once the logging is active:
1. Try creating a coin with an image
2. Watch the logs to see if the imageUrl is being received
3. Follow the debugging guide in `IMAGE_URL_DEBUGGING_GUIDE.md`
