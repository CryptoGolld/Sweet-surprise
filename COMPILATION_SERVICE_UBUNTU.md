# 🔧 Compilation Service on Ubuntu

## Overview

The compilation service is **built into your Next.js app** as an API route:
- **File:** `app/api/compile-coin/route.ts`
- **Endpoint:** `POST /api/compile-coin`
- **Function:** Compiles Move code and returns bytecode

When you run the Next.js app on Ubuntu, this API automatically works!

---

## How It Works

```
User Browser
     ↓
Frontend (React)
     ↓
POST /api/compile-coin
     ↓
Next.js API Route (Ubuntu)
     ↓
1. Generate Move code
2. Run: sui move build
3. Read bytecode
4. Return to frontend
     ↓
Frontend builds publish transaction
     ↓
User signs with wallet
```

---

## Setup on Ubuntu

### 1. Install Sui CLI (REQUIRED)

The compilation API needs Sui CLI to compile Move code.

```bash
# Download Sui CLI
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz

# Extract
tar -xzf sui.tgz

# Move to system path
sudo mv sui-testnet-v1.42.2-ubuntu-x86_64/sui /usr/local/bin/

# Clean up
rm sui.tgz

# Verify
sui --version
# Should output: sui 1.42.2-...
```

### 2. Deploy Your App

Follow the main `UBUNTU_HOSTING_GUIDE.md`:

```bash
# Clone repo
cd /var/www
sudo git clone <your-repo> suilfg-memefi
sudo chown -R $USER:$USER suilfg-memefi

# Install dependencies
cd suilfg-memefi
npm install

# Build
npm run build

# Start with PM2
pm2 start npm --name "suilfg-memefi" -- start
pm2 save
pm2 startup
```

### 3. Configure Nginx (if using reverse proxy)

Edit `/etc/nginx/sites-available/suilfg-memefi`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # IMPORTANT: Increase timeout for compilation
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Testing

### Test Sui CLI

```bash
sui --version
```

Should output: `sui 1.42.2-...`

### Test Manual Compilation

```bash
cd /tmp
mkdir test-coin
cd test-coin

# Create Move.toml
cat > Move.toml << 'EOF'
[package]
name = "test"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.42.2" }

[addresses]
test = "0x0"
EOF

# Create source file
mkdir sources
cat > sources/test.move << 'EOF'
module test::test {
    use sui::coin::{Self, TreasuryCap};
    use sui::tx_context::TxContext;
    use std::option;

    public struct TEST_SUILFG_MEMEFI has drop {}

    fun init(witness: TEST_SUILFG_MEMEFI, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness, 9,
            b"TEST", b"Test Coin", b"Testing",
            option::none(), ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
EOF

# Compile
sui move build

# Should output: "Build Successful"
```

If this works, the API will work! ✅

### Test the API Endpoint

```bash
# Start your app if not already running
pm2 start suilfg-memefi

# Test the compilation API
curl -X POST http://localhost:3000/api/compile-coin \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TEST",
    "name": "Test Coin",
    "description": "Testing compilation"
  }'
```

Expected response:
```json
{
  "success": true,
  "modules": [[...bytecode array...]],
  "dependencies": ["0x1", "0x2"],
  "moduleName": "test",
  "structName": "TEST_SUILFG_MEMEFI"
}
```

If you get this, compilation API is working! ✅

### Test from Frontend

1. Visit your site: `http://your-server-ip:3000` or `https://your-domain.com`
2. Connect wallet
3. Click "Create Coin"
4. Fill form:
   - Ticker: TEST
   - Name: Test Coin
5. Click "Create Coin"
6. Should see: "Compiling package..." (~5-10 seconds)
7. Then wallet popup to sign

If you get to the wallet popup, compilation worked! ✅

---

## How the API Works Internally

### File: `app/api/compile-coin/route.ts`

1. **Receives request:**
   ```json
   {
     "ticker": "PEPE",
     "name": "Pepe Coin",
     "description": "Best frog"
   }
   ```

2. **Generates temp directory:**
   ```
   /tmp/suilfg_coins/pepe_1729512345/
   ├── Move.toml
   └── sources/
       └── pepe.move
   ```

3. **Writes Move.toml:**
   ```toml
   [package]
   name = "pepe"
   version = "0.0.1"
   ...
   ```

4. **Writes Move source:**
   ```move
   module pepe::pepe {
       public struct PEPE_SUILFG_MEMEFI has drop {}
       ...
   }
   ```

5. **Compiles:**
   ```bash
   cd /tmp/suilfg_coins/pepe_1729512345
   sui move build
   ```

6. **Reads bytecode:**
   ```
   build/pepe/bytecode_modules/pepe.mv
   → Convert to byte array
   ```

7. **Returns to frontend:**
   ```json
   {
     "success": true,
     "modules": [[byte array]],
     "dependencies": ["0x1", "0x2"],
     "moduleName": "pepe",
     "structName": "PEPE_SUILFG_MEMEFI"
   }
   ```

8. **Cleans up:**
   ```bash
   rm -rf /tmp/suilfg_coins/pepe_1729512345
   ```

---

## Performance

### Compilation Time
- First compile: ~5-10 seconds
- Cached (same ticker/name): Instant (returns from memory)
- Cache duration: 1 hour

### Resource Usage
- CPU: ~50% of 1 core during compilation
- RAM: ~200MB during compilation
- Disk: Temp files cleaned up immediately

### Recommended Server Specs
- **Minimum:** 1GB RAM, 1 CPU core
- **Recommended:** 2GB RAM, 2 CPU cores (for faster compilation)

---

## Caching

The API has built-in in-memory caching:

```typescript
// Same ticker + name = same bytecode
const cacheKey = `${ticker}_${name}`.toLowerCase();

// Check cache
if (cached) {
  return cached; // Instant!
}

// Compile and cache for 1 hour
compileCache.set(cacheKey, result);
setTimeout(() => compileCache.delete(cacheKey), 3600000);
```

This means:
- Second request for "PEPE" coin: **Instant response!**
- Cache resets after 1 hour
- Cache cleared on app restart

For production, consider Redis caching (persistent).

---

## Troubleshooting

### Error: "sui: command not found"

**Fix:** Install Sui CLI

```bash
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz
tar -xzf sui.tgz
sudo mv sui-testnet-v1.42.2-ubuntu-x86_64/sui /usr/local/bin/
```

### Error: "Compilation failed"

**Check logs:**
```bash
pm2 logs suilfg-memefi
```

**Common causes:**
- Sui CLI not installed
- Permissions issue with /tmp directory
- Out of disk space

**Fix permissions:**
```bash
sudo chmod 1777 /tmp
```

### Error: "Request timeout"

**Cause:** Compilation takes > 30 seconds (Nginx default timeout)

**Fix:** Increase Nginx timeout in config:
```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

Then reload:
```bash
sudo systemctl reload nginx
```

### API returns error but manual compilation works

**Check:**
```bash
# Check if Next.js can execute sui
which sui

# Check PM2 environment
pm2 env suilfg-memefi | grep PATH

# If sui not in PATH for PM2:
pm2 delete suilfg-memefi
export PATH=$PATH:/usr/local/bin
pm2 start npm --name "suilfg-memefi" -- start
pm2 save
```

### Out of disk space

**Check disk:**
```bash
df -h
```

**Clean temp files:**
```bash
# Clean old temp coin directories (if any stuck)
rm -rf /tmp/suilfg_coins/*

# Clean PM2 logs
pm2 flush
```

---

## Monitoring

### Watch Compilation Logs

```bash
# Real-time logs
pm2 logs suilfg-memefi

# Filter for compilation
pm2 logs suilfg-memefi | grep "Compiling"
```

### Check Temp Directory

```bash
# See active compilations
ls -la /tmp/suilfg_coins/

# Should be mostly empty (cleaned up automatically)
```

### Monitor Resource Usage

```bash
# System resources
htop

# PM2 monitoring
pm2 monit
```

---

## Production Optimizations

### 1. Use Redis for Caching (Optional)

Install Redis:
```bash
sudo apt install redis-server
```

Update API to use Redis instead of in-memory cache for persistence across restarts.

### 2. Rate Limiting (Recommended)

Add rate limiting to prevent spam compilations:

```bash
npm install express-rate-limit
```

In `app/api/compile-coin/route.ts`:
```typescript
// Limit: 10 compilations per IP per hour
```

### 3. Queue System (For High Traffic)

If you expect many concurrent compilations:

```bash
npm install bull
```

Queue compilations to prevent server overload.

### 4. Increase PM2 Instances

If you have multiple CPU cores:
```bash
pm2 delete suilfg-memefi
pm2 start npm --name "suilfg-memefi" -i max -- start
pm2 save
```

This runs multiple instances in cluster mode.

---

## Security

### Considerations

✅ **Input Validation:** API validates ticker/name length
✅ **Sandboxing:** Compilations in isolated temp directories
✅ **Cleanup:** Temp files deleted immediately
✅ **No Code Injection:** Templates prevent arbitrary code

### Additional Hardening (Optional)

1. **Firewall rules:**
   ```bash
   sudo ufw limit 80/tcp
   sudo ufw limit 443/tcp
   ```

2. **Resource limits:**
   Edit `/etc/security/limits.conf`:
   ```
   * soft nofile 4096
   * hard nofile 8192
   ```

3. **Fail2ban:**
   ```bash
   sudo apt install fail2ban
   ```

---

## Summary

**To run compilation on Ubuntu:**

1. ✅ Install Sui CLI
2. ✅ Deploy Next.js app with PM2
3. ✅ Configure Nginx (optional)
4. ✅ Test compilation works

**That's it!** The compilation API is part of your Next.js app and runs automatically when you start the app with PM2.

**No separate service needed!** 🎉

**Files:**
- API Route: `app/api/compile-coin/route.ts`
- Template: `lib/coin-template.ts`
- Temp Dir: `/tmp/suilfg_coins/` (auto-created/cleaned)

**Testing:**
```bash
curl -X POST http://localhost:3000/api/compile-coin \
  -H "Content-Type: application/json" \
  -d '{"ticker":"TEST","name":"Test Coin"}'
```

If this returns JSON with bytecode, you're good! ✅
