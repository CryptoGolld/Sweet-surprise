# 🔌 SuiLFG MemeFi - API Documentation

## Overview

The SuiLFG MemeFi platform uses a **standalone compilation service** for on-demand Move package compilation. This allows users to create memecoins without requiring the platform to pay gas fees or manage package ownership.

---

## 🏗️ Architecture

```
┌─────────────────┐
│  User Browser   │
│    (HTTPS)      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Vercel Frontend │
│    (HTTPS)      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Vercel API      │
│ /api/compile-   │
│     proxy       │
└────────┬────────┘
         │ HTTP (server-to-server)
         ↓
┌─────────────────┐
│ Ubuntu Server   │
│ Compilation API │
│   Port: 3001    │
└─────────────────┘
```

**Why this architecture?**
- Vercel frontend uses HTTPS (secure)
- Direct browser → HTTP calls are blocked (mixed content)
- Vercel API → HTTP is allowed (server-to-server)
- Ubuntu server compiles Move packages on-demand

---

## 🌐 Compilation Service API

### Base URL

```
Production: http://13.60.235.109:3001
Health Check: http://13.60.235.109:3001/health
Compile: http://13.60.235.109:3001/compile
```

### Endpoints

#### 1. Health Check

**Request:**
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1761166727040
}
```

**Example:**
```bash
curl http://13.60.235.109:3001/health
```

---

#### 2. Compile Move Package

**Request:**
```http
POST /compile
Content-Type: application/json

{
  "ticker": "COIN",
  "name": "Coin Name",
  "description": "Optional description"
}
```

**Parameters:**
| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `ticker` | string | Yes | 10 chars | Coin ticker symbol (uppercase) |
| `name` | string | Yes | 50 chars | Coin display name |
| `description` | string | No | - | Coin description |

**Response (Success):**
```json
{
  "success": true,
  "modules": [[161,28,235,11,6,0,0,0,...]],
  "dependencies": ["0x1", "0x2"],
  "moduleName": "coin",
  "structName": "COIN",
  "timestamp": 1761166727040
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Compilation status |
| `modules` | number[][] | Compiled bytecode modules |
| `dependencies` | string[] | Package dependencies |
| `moduleName` | string | Module name (lowercase ticker) |
| `structName` | string | Witness struct name (uppercase ticker) |
| `timestamp` | number | Unix timestamp |

**Response (Error):**
```json
{
  "success": false,
  "error": "Compilation failed",
  "details": "Error message with details"
}
```

**Example:**
```bash
curl -X POST http://13.60.235.109:3001/compile \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "ROCKET",
    "name": "Rocket Coin",
    "description": "To the moon! 🚀"
  }'
```

---

## 🔄 Frontend Integration

### Using the Compilation Service

The frontend calls the service through a **Vercel proxy** to avoid HTTPS→HTTP mixed content issues.

**Frontend Code (`lib/sui/transactions.ts`):**
```typescript
export async function createCoinTransaction(params: {
  ticker: string;
  name: string;
  description: string;
}): Promise<{
  transaction: Transaction;
  moduleName: string;
  structName: string;
}> {
  // Call Vercel proxy (which forwards to Ubuntu)
  const compileUrl = '/api/compile-proxy';
  
  const response = await fetch(compileUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to compile coin');
  }
  
  const { modules, dependencies, moduleName, structName } = await response.json();
  
  // Build publish transaction
  const tx = new Transaction();
  const [upgradeCap] = tx.publish({
    modules: modules.map(m => new Uint8Array(m)),
    dependencies: dependencies,
  });
  
  tx.transferObjects([upgradeCap], tx.gas);
  
  return { transaction: tx, moduleName, structName };
}
```

---

## ⚙️ Setup Your Own Compilation Service

### Prerequisites
- Ubuntu 22.04 LTS (or similar)
- Node.js 18+
- Sui CLI v1.42.2+
- PM2 (process manager)

### Quick Setup

```bash
# 1. Clone repository
cd ~
git clone https://github.com/CryptoGolld/Sweet-surprise.git suilfg-memefi
cd suilfg-memefi
git checkout cursor/install-sui-cli-and-login-burner-wallet-5a0f

# 2. Install Sui CLI (if not already installed)
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz
tar -xzf sui.tgz
sudo mv sui-testnet-*/sui /usr/local/bin/
sui --version

# 3. Setup compilation service
cd compilation-service
npm install

# 4. Start with PM2
pm2 start index.js --name "compilation-service"
pm2 save
pm2 startup  # Follow instructions to enable auto-start

# 5. Open firewall (if using ufw)
sudo ufw allow 3001
sudo ufw reload

# 6. Test
curl http://localhost:3001/health
```

### Configuration

**Environment Variables:**
```bash
# Port (default: 3001)
export PORT=3001

# Sui CLI path (default: /home/ubuntu/sui/sui)
export SUI_PATH=/usr/local/bin/sui

# Frontend URL for CORS (default: *)
export FRONTEND_URL=https://your-vercel-app.vercel.app
```

### AWS Security Group

If running on AWS EC2, open port 3001:
1. Go to EC2 Console → Security Groups
2. Select your instance's security group
3. Edit inbound rules → Add rule:
   - Type: **Custom TCP**
   - Port: **3001**
   - Source: **0.0.0.0/0** (or restrict to Vercel IPs)
4. Save

---

## 🔒 Security Considerations

### CORS Configuration

The service uses permissive CORS (`origin: *`) for ease of development. For production:

**Restrict to your Vercel domain:**
```javascript
app.use(cors({
  origin: 'https://your-domain.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
```

### Rate Limiting

For production, add rate limiting:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/compile', limiter);
```

### Firewall

Only expose necessary ports:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3001
sudo ufw enable
```

---

## 📊 Monitoring

### PM2 Commands

```bash
# View logs
pm2 logs compilation-service

# Check status
pm2 status

# Restart service
pm2 restart compilation-service

# View monitoring dashboard
pm2 monit

# Save current process list
pm2 save
```

### Health Monitoring

Set up a cron job or monitoring service to check `/health` endpoint:

```bash
# Add to crontab (check every 5 minutes)
*/5 * * * * curl -f http://localhost:3001/health || pm2 restart compilation-service
```

---

## 🧪 Testing the API

### Test Health Endpoint

```bash
curl http://13.60.235.109:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":1761166727040}
```

### Test Compilation

```bash
curl -X POST http://13.60.235.109:3001/compile \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TEST",
    "name": "Test Coin",
    "description": "Just a test"
  }'
```

Expected response:
```json
{
  "success": true,
  "modules": [[161,28,235,...]],
  "dependencies": ["0x1", "0x2"],
  "moduleName": "test",
  "structName": "TEST",
  "timestamp": 1761166727040
}
```

### Test via Vercel Proxy

```bash
curl -X POST https://your-vercel-app.vercel.app/api/compile-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "TEST",
    "name": "Test Coin"
  }'
```

---

## 🐛 Troubleshooting

### Common Issues

#### Service not starting
```bash
# Check logs
pm2 logs compilation-service --lines 50

# Check if sui is installed
which sui
sui --version

# If sui path is different, set SUI_PATH env var
export SUI_PATH=/path/to/sui
pm2 restart compilation-service
```

#### Port already in use
```bash
# Find what's using port 3001
sudo lsof -i :3001

# Kill the process or change port
export PORT=3002
pm2 restart compilation-service
```

#### Compilation fails
```bash
# Test sui manually
cd /tmp
mkdir test_coin && cd test_coin
echo '[package]
name = "test"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.42.2" }

[addresses]
test = "0x0"' > Move.toml

mkdir sources
echo 'module test::test {
    use sui::coin;
    
    public struct TEST has drop {}
    
    fun init(witness: TEST, ctx: &mut sui::tx_context::TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness, 9, b"TEST", b"Test", b"Test coin",
            option::none(), ctx
        );
        sui::transfer::public_freeze_object(metadata);
        sui::transfer::public_transfer(treasury, sui::tx_context::sender(ctx));
    }
}' > sources/test.move

sui move build
```

#### Can't connect from outside
```bash
# Check if service is listening on 0.0.0.0
sudo netstat -tlnp | grep 3001

# Should show: 0.0.0.0:3001 (not 127.0.0.1:3001)

# Check firewall
sudo ufw status
sudo ufw allow 3001

# For AWS: Check Security Group in AWS Console
```

---

## 📈 Performance

### Caching

The service uses in-memory caching:
- Same ticker + name = cached bytecode (1 hour TTL)
- Significantly speeds up repeated requests
- Cache cleared on service restart

### Compilation Times

| Metric | Time |
|--------|------|
| First compilation | ~2-3 seconds |
| Cached compilation | <100ms |
| Cold start | ~1 second |

### Resource Usage

| Resource | Usage |
|----------|-------|
| Memory | ~20-30 MB |
| CPU | Minimal (spikes during compilation) |
| Disk | Temporary files cleaned after compilation |
| Bandwidth | ~2 KB per request |

---

## 🔄 Updating the Service

### Pull Latest Changes

```bash
cd ~/suilfg-memefi
git pull origin cursor/install-sui-cli-and-login-burner-wallet-5a0f
cd compilation-service
pm2 restart compilation-service
```

### Update Dependencies

```bash
cd ~/suilfg-memefi/compilation-service
npm install
pm2 restart compilation-service
```

---

## 📞 Support

**Service Issues:**
- Check PM2 logs: `pm2 logs compilation-service`
- GitHub Issues: [Report bugs](https://github.com/CryptoGolld/Sweet-surprise/issues)

**Current Service:**
- **IP:** 13.60.235.109
- **Port:** 3001
- **Status:** Check at `http://13.60.235.109:3001/health`

---

<div align="center">

**🚀 Compilation Service Running**

`http://13.60.235.109:3001`

</div>
