# 🔧 SuiLFG MemeFi - Compilation Service

Standalone service that compiles Move packages for memecoin creation.

## Quick Start on Ubuntu

### 1. Install Sui CLI
```bash
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz
tar -xzf sui.tgz
sudo mv sui-testnet-v1.42.2-ubuntu-x86_64/sui /usr/local/bin/
sui --version
```

### 2. Clone & Setup
```bash
cd ~
git clone https://github.com/CryptoGolld/Sweet-surprise.git suilfg-memefi
cd suilfg-memefi/compilation-service
npm install
```

### 3. Run with PM2
```bash
pm2 start index.js --name "compilation-service"
pm2 save
pm2 startup
```

### 4. Test It
```bash
curl -X POST http://localhost:3001/compile \
  -H "Content-Type: application/json" \
  -d '{"ticker":"TEST","name":"Test Coin"}'
```

Should return JSON with compiled bytecode!

## Configuration

### Environment Variables

```bash
# Port (default: 3001)
export PORT=3001

# Frontend URL (for CORS)
export FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Update Frontend

In your Vercel deployment, set environment variable:
```
NEXT_PUBLIC_COMPILE_API=http://your-ubuntu-ip:3001
```

Or if using domain:
```
NEXT_PUBLIC_COMPILE_API=https://compile.your-domain.com
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name compile.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Important: Increase timeout for compilation
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Monitoring

```bash
# View logs
pm2 logs compilation-service

# Check status
pm2 status

# Restart if needed
pm2 restart compilation-service
```

## Costs

- Server: ~$5/month (Hetzner/Linode/DO)
- Computation: Minimal (only during compilation)
- Gas: $0 (users pay when they publish)

## Security

- Enable firewall (only allow port 80/443)
- Use HTTPS with SSL certificate
- Add rate limiting if needed
- Monitor for abuse
