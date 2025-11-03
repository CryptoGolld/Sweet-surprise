# ⚠️ CRITICAL FILES - DO NOT DELETE

These files are **ESSENTIAL** for production operations. Deleting them will break the platform.

---

## 🔴 Configuration Files (NEVER DELETE)

### **ecosystem.config.cjs**
- **Purpose**: PM2 configuration for all production services
- **What it does**: Defines how to start/restart all bots and services
- **Used by**: `pm2 start ecosystem.config.cjs`
- **If deleted**: You'll lose the master config for all services

### **PM2_SERVICES.md**
- **Purpose**: Documentation of all production services
- **What it does**: Explains what each service does and how to manage them
- **Used by**: Reference when managing production server
- **If deleted**: You'll lose knowledge of what services are needed

---

## 🟡 Service Directories (NEVER DELETE)

### **/indexer/**
- **Contains**: `memecoin-indexer` and `memecoin-api`
- **Critical files**: `index.js`, `api-server.js`, `.env`
- **If deleted**: Token pages won't load, no blockchain indexing

### **/pool-creation-bot/**
- **Contains**: Pool creation automation
- **Critical files**: `index.js`, `.env`, `graduation-state.json`
- **If deleted**: Graduated tokens won't get Cetus pools

### **/compilation-service/**
- **Contains**: Move contract compiler
- **Critical files**: `index.js`, `.env`
- **If deleted**: Users can't create new tokens

---

## 🟢 Auto-Generated (Safe to Delete if Needed)

These files are regenerated automatically:

### **pool-creation-bot/graduation-state.json**
- **Purpose**: Tracks pool creation progress
- **Regenerates**: Automatically when bot processes graduations
- **Can delete if**: Bot needs fresh start (rare)

### **node_modules/**
- **Purpose**: NPM dependencies
- **Regenerates**: `npm install`
- **Can delete if**: Freeing disk space (then reinstall)

### **logs/** directories
- **Purpose**: Service logs
- **Regenerates**: Automatically as services run
- **Can delete if**: Freeing disk space

---

## 🔵 Documentation Files

### 🔴 NEVER DELETE (Critical Security & Operations)

**CRITICAL_VULNERABILITIES.md**
- **Purpose**: Documents known contract vulnerabilities for future upgrade
- **Contains**: 
  - First buyer fee re-charge bug
  - seed_pool_prepare frontrun vulnerability
  - Security confirmations (no theft possible)
- **Used for**: Contract upgrade planning
- **⚠️ DO NOT DELETE** - Required before any contract upgrade

**CONTRACT_UPGRADE_TODO.md**
- **Purpose**: Actionable checklist for contract upgrade
- **Contains**: 
  - Exact code fixes needed
  - Bot mitigation code
  - Contract upgrade checklist
  - Revenue loss calculations
- **Used for**: Next contract deployment
- **⚠️ DO NOT DELETE** - Blueprint for contract fix

**BOT_DETAILED_FLOW.md**
- **Purpose**: Complete bot operational flow + vulnerability mitigations
- **Contains**:
  - Step-by-step bot logic
  - Frontrun protection code
  - Fallback procedures
- **Used for**: Bot upgrades and troubleshooting
- **⚠️ DO NOT DELETE** - Critical for bot development

**PM2_SERVICES.md**
- **Purpose**: Production services documentation
- **⚠️ DO NOT DELETE** - Critical for operations

### 🟡 Keep Until Verified Obsolete

**BOT_AUTO_RECOVERY.md**
- Explains how pool bot recovers from crashes
- Useful for understanding system

**BOT_WALLET_SECURITY.md**
- Bot wallet security best practices
- Keep for security reference

**BOT_COIN_TRACKING_SAFETY.md**
- Bot coin tracking mechanisms
- Keep for debugging

**BOT_SELF_FUNDING_EXPLAINED.md**
- Bot self-funding mechanism
- Keep for operations

### 🟢 Safe to Delete (Historical/Obsolete)

**FIX_GRADUATION_BALANCE.md**
- Historical deployment guide
- Can delete after verifying obsolete

**Other *.md files** (review first)
- Most are historical documentation
- Can clean up old guides once verified they're obsolete

---

## 📋 Quick Reference

### Files You Should NEVER Delete:
```
ecosystem.config.cjs             ← PM2 config
PM2_SERVICES.md                  ← Service docs
CRITICAL_VULNERABILITIES.md      ← Vulnerability analysis ⚠️
CONTRACT_UPGRADE_TODO.md         ← Contract fix blueprint ⚠️
BOT_DETAILED_FLOW.md            ← Bot logic + security mitigations ⚠️
indexer/                        ← Entire directory
pool-creation-bot/              ← Entire directory
compilation-service/            ← Entire directory
.env files                      ← ALL OF THEM
```

### Files Safe to Clean Up:
```
node_modules/                ← Reinstall with npm install
logs/                        ← Regenerates automatically
*.log files                  ← Can delete old logs
graduation-state.json        ← Only if bot needs reset
Old *.md docs                ← After verifying obsolete
```

---

## 🗑️ Safe Cleanup Process

When freeing space:

1. **Delete old markdown docs** (after reading them first)
   ```bash
   # Example old docs that might be obsolete:
   rm CETUS_FIXED.md
   rm DEPLOYMENT_V0.0.8.md
   rm UBUNTU_FIX_COMMANDS.md
   # etc...
   ```

2. **Clean node_modules** (can reinstall)
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Clean old logs** (keep recent ones)
   ```bash
   find . -name "*.log" -mtime +30 -delete
   ```

4. **Clean build artifacts**
   ```bash
   rm -rf .next/
   rm -rf build/
   ```

---

## ✅ Before Deleting Anything

Ask yourself:
1. Is it in the "NEVER DELETE" list above? → **Don't delete**
2. Is it a `.env` file? → **Don't delete**
3. Is it in `/indexer`, `/pool-creation-bot`, or `/compilation-service`? → **Don't delete**
4. Is it `ecosystem.config.cjs` or `PM2_SERVICES.md`? → **Don't delete**
5. Is it a markdown file you've never read? → **Read it first, then maybe delete**
6. Is it `node_modules` or `logs`? → **Safe to delete** (can regenerate)

---

**When in doubt, DON'T DELETE IT!**

Ask someone or check `PM2_SERVICES.md` first.
