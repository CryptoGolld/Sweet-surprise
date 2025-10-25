# Indexer Deployment - Ubuntu Only

## ⚠️ Important

This `indexer/` folder is **NOT deployed to Vercel**.

- ✅ **In Git**: Yes (so you can pull it on Ubuntu)
- ❌ **On Vercel**: No (ignored via `.vercelignore`)
- ✅ **On Ubuntu**: Yes (where it runs)

---

## Why Separate?

**Vercel = Frontend**
- Next.js app
- API routes
- Serverless functions
- No long-running processes

**Ubuntu Server = Backend**
- Blockchain indexer
- PostgreSQL database
- 24/7 background service
- Long-running PM2 process

---

## How It Works

### 1. **Git Structure**
```
your-repo/
├── app/              → Deployed to Vercel
├── components/       → Deployed to Vercel
├── lib/              → Deployed to Vercel
├── indexer/          → NOT deployed to Vercel (ignored)
│   ├── index.js
│   ├── schema.sql
│   ├── setup.sh
│   └── ...
└── .vercelignore     → Tells Vercel to ignore indexer/
```

### 2. **Vercel Deployment**
```bash
git push origin main
# Vercel auto-deploys, but skips indexer/
```

### 3. **Ubuntu Deployment**
```bash
# On your Ubuntu server
cd /var/www/your-project
git pull origin main
cd indexer
./setup.sh
pm2 start index.js --name memecoin-indexer
```

---

## Benefits

✅ **Vercel stays fast** (no heavy indexer code)  
✅ **Ubuntu runs 24/7** (background indexer)  
✅ **Single codebase** (both in same repo)  
✅ **Easy updates** (`git pull` on both)  

---

## Deployment Workflow

### **Frontend Changes** (app, components, lib)
```bash
git push
# Vercel auto-deploys ✅
# Ubuntu: No action needed ✅
```

### **Indexer Changes** (indexer/)
```bash
git push

# On Ubuntu:
ssh user@server
cd /var/www/your-project
git pull
pm2 restart memecoin-indexer
```

### **Both Changed**
```bash
git push
# Vercel auto-deploys frontend ✅

# On Ubuntu:
git pull
pm2 restart memecoin-indexer
```

---

## File Locations

### **Development** (Your Local Machine)
```
/workspace/
├── indexer/          ← You edit here
└── ...
```

### **Production Frontend** (Vercel)
```
(indexer/ folder is ignored and not deployed)
```

### **Production Backend** (Ubuntu)
```
/home/ubuntu/
└── your-project/
    └── indexer/      ← Runs here with PM2
        ├── index.js
        ├── .env      ← Your secret config
        └── ...
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Update indexer code | `git pull && pm2 restart memecoin-indexer` |
| View indexer logs | `pm2 logs memecoin-indexer` |
| Check indexer status | `pm2 status` |
| Restart indexer | `pm2 restart memecoin-indexer` |
| Stop indexer | `pm2 stop memecoin-indexer` |

---

## Security Notes

✅ `.env` is gitignored (secrets stay on Ubuntu)  
✅ `.env.example` is in git (template only)  
✅ Vercel never sees your database credentials  
✅ Ubuntu is the only place with PostgreSQL access  

---

## Summary

- 📦 **Git**: Entire repo (including `indexer/`)
- 🌐 **Vercel**: Just frontend (ignores `indexer/`)
- 🖥️ **Ubuntu**: Pulls entire repo, runs `indexer/` with PM2

This setup gives you:
- Fast Vercel deployments (no bloat)
- Reliable Ubuntu indexing (24/7)
- Single source of truth (one git repo)
- Easy updates (git pull everywhere)
