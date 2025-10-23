# 🚀 Hosting SuiLFG MemeFi on Ubuntu

Complete guide to deploy your Next.js app on an Ubuntu server.

---

## Prerequisites

- Ubuntu 20.04+ server
- Root or sudo access
- Domain name (optional but recommended)
- Sui CLI installed (for compilation)

---

## Step 1: Install Node.js & npm

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x
npm --version   # Should be v10.x
```

---

## Step 2: Install Sui CLI

```bash
# Download latest Sui CLI
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz

# Extract
tar -xzf sui.tgz

# Move to bin
sudo mv sui-testnet-v1.42.2-ubuntu-x86_64/sui /usr/local/bin/

# Verify
sui --version
```

---

## Step 3: Clone Your Repository

```bash
# Create app directory
sudo mkdir -p /var/www
cd /var/www

# Clone (replace with your repo)
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git suilfg-memefi

# Set ownership
sudo chown -R $USER:$USER /var/www/suilfg-memefi

cd suilfg-memefi
```

---

## Step 4: Install Dependencies & Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test it works
npm start
# Visit: http://YOUR_SERVER_IP:3000
# Press Ctrl+C to stop
```

---

## Step 5: Install PM2 (Process Manager)

PM2 keeps your app running 24/7 and restarts it if it crashes.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app with PM2
pm2 start npm --name "suilfg-memefi" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it outputs (run as sudo)

# Check status
pm2 status
pm2 logs suilfg-memefi  # View logs
```

### PM2 Useful Commands

```bash
pm2 restart suilfg-memefi   # Restart app
pm2 stop suilfg-memefi      # Stop app
pm2 delete suilfg-memefi    # Remove from PM2
pm2 logs suilfg-memefi      # View logs
pm2 monit                   # Monitor resources
```

---

## Step 6: Install & Configure Nginx

Nginx acts as a reverse proxy and handles SSL.

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/suilfg-memefi
```

Paste this config:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain

    # Client max body size (for uploads)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings (important for compilation)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Save and exit (Ctrl+X, Y, Enter)

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/suilfg-memefi /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 7: Setup SSL with Let's Encrypt (Free HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Test auto-renewal
sudo certbot renew --dry-run
```

Your site is now live at: https://your-domain.com 🎉

---

## Step 8: Setup Firewall

```bash
# Allow SSH (important!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 9: Environment Variables

```bash
cd /var/www/suilfg-memefi

# Create .env.local (if needed)
nano .env.local
```

Add any environment variables:
```
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PLATFORM_PACKAGE=0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047
```

Save and restart:
```bash
pm2 restart suilfg-memefi
```

---

## Step 10: Auto-Deploy on Git Push (Optional)

Setup automatic deployment when you push to GitHub:

```bash
# Install webhook
sudo npm install -g github-webhook-handler

# Create webhook script
nano ~/deploy-webhook.js
```

Paste:
```javascript
const http = require('http');
const createHandler = require('github-webhook-handler');
const { exec } = require('child_process');

const handler = createHandler({ path: '/webhook', secret: 'YOUR_SECRET_HERE' });

http.createServer((req, res) => {
  handler(req, res, (err) => {
    res.statusCode = 404;
    res.end('no such location');
  });
}).listen(7777);

handler.on('push', (event) => {
  console.log('Received push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref);
    
  exec('cd /var/www/suilfg-memefi && git pull && npm install && npm run build && pm2 restart suilfg-memefi', 
    (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    }
  );
});

console.log('Webhook server listening on port 7777');
```

```bash
# Start webhook with PM2
pm2 start ~/deploy-webhook.js --name "deploy-webhook"
pm2 save

# Allow port in firewall
sudo ufw allow 7777

# Add webhook in GitHub:
# Repo → Settings → Webhooks → Add webhook
# URL: http://YOUR_SERVER_IP:7777/webhook
# Secret: YOUR_SECRET_HERE
# Content type: application/json
# Events: Just the push event
```

---

## Monitoring & Maintenance

### Check App Logs
```bash
pm2 logs suilfg-memefi
pm2 logs suilfg-memefi --lines 100  # Last 100 lines
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Update App
```bash
cd /var/www/suilfg-memefi
git pull
npm install
npm run build
pm2 restart suilfg-memefi
```

### Monitor Resources
```bash
pm2 monit              # Real-time monitoring
htop                   # System resources (install: sudo apt install htop)
df -h                  # Disk usage
free -h                # Memory usage
```

### Backup
```bash
# Backup database/files (if any)
tar -czf ~/suilfg-backup-$(date +%Y%m%d).tar.gz /var/www/suilfg-memefi

# Copy to another server
scp ~/suilfg-backup-*.tar.gz user@backup-server:/backups/
```

---

## Troubleshooting

### App won't start
```bash
# Check logs
pm2 logs suilfg-memefi

# Try running manually
cd /var/www/suilfg-memefi
npm start

# Check if port 3000 is in use
sudo lsof -i :3000
```

### Nginx errors
```bash
# Test config
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Compilation fails
```bash
# Check Sui CLI
sui --version

# Test compilation manually
cd /tmp
mkdir test-coin
cd test-coin
# Create Move.toml and sources/
sui move build
```

### Out of disk space
```bash
# Check disk usage
df -h

# Clean PM2 logs
pm2 flush

# Clean old logs
sudo journalctl --vacuum-time=7d

# Clean apt cache
sudo apt clean
```

### High memory usage
```bash
# Check what's using memory
pm2 monit

# Restart app
pm2 restart suilfg-memefi

# Restart server (if needed)
sudo reboot
```

---

## Performance Optimization

### Enable Gzip in Nginx
Edit `/etc/nginx/nginx.conf`:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### Increase PM2 instances (if you have multiple CPU cores)
```bash
pm2 delete suilfg-memefi
pm2 start npm --name "suilfg-memefi" -i max -- start
pm2 save
```

### Cache compiled bytecode
Already implemented in the code with in-memory cache!

---

## Security Checklist

- ✅ Firewall enabled (UFW)
- ✅ SSL/HTTPS configured
- ✅ Regular updates: `sudo apt update && sudo apt upgrade`
- ✅ Fail2ban (optional): `sudo apt install fail2ban`
- ✅ SSH key authentication (disable password auth)
- ✅ Regular backups
- ✅ Monitor logs for suspicious activity

---

## Cost Estimate

### VPS Options
- **DigitalOcean Droplet:** $6/month (1GB RAM)
- **Linode:** $5/month (1GB RAM)
- **Vultr:** $6/month (1GB RAM)
- **Hetzner:** €4.5/month (~$5/month) (2GB RAM - best value!)

### Recommended Specs
- **Minimum:** 1GB RAM, 1 CPU, 25GB SSD
- **Recommended:** 2GB RAM, 2 CPU, 50GB SSD (for better compilation performance)

---

## Quick Start Script

Save this as `setup.sh` and run `bash setup.sh`:

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Sui CLI
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz
tar -xzf sui.tgz
sudo mv sui-testnet-v1.42.2-ubuntu-x86_64/sui /usr/local/bin/
rm sui.tgz

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Clone repo (EDIT THIS!)
cd /var/www
sudo git clone YOUR_REPO_URL suilfg-memefi
sudo chown -R $USER:$USER suilfg-memefi

# Setup app
cd suilfg-memefi
npm install
npm run build

# Start with PM2
pm2 start npm --name "suilfg-memefi" -- start
pm2 save
pm2 startup

echo "✅ Setup complete! Configure Nginx and SSL manually."
```

---

## Summary

Your app is now:
- ✅ Running 24/7 with PM2
- ✅ Behind Nginx reverse proxy
- ✅ Secured with SSL (if configured)
- ✅ Auto-restarts on crash
- ✅ Auto-starts on server reboot

Access at: https://your-domain.com 🚀

For support, check logs with: `pm2 logs suilfg-memefi`
