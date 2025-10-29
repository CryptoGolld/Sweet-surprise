# Using Seed Phrase Instead of Private Key

## 🔑 Seed Phrase Configuration

You can configure the bot using your 12-word seed phrase instead of exporting the private key.

### Setup

Edit `.env`:

```bash
# Option 1: Seed Phrase (Recommended)
BOT_SEED_PHRASE=word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12

# Option 2: Private Key (Alternative - leave commented if using seed phrase)
# BOT_PRIVATE_KEY=suiprivkey1234...
```

**Important:**
- Use the seed phrase from your Sui wallet
- This should be the wallet that has the AdminCap object
- Keep this SECRET - never commit to git!

### Example .env

```bash
# Network Configuration
NETWORK=testnet
RPC_URL=https://fullnode.testnet.sui.io:443

# Bot Wallet - Using Seed Phrase
BOT_SEED_PHRASE=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about

# Platform Contracts (Testnet)
PLATFORM_PACKAGE=0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348
PLATFORM_STATE=0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9
ADMIN_CAP=0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11

# Cetus Configuration (Testnet)
CETUS_GLOBAL_CONFIG=0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
CETUS_POOLS=0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2
CETUS_PACKAGE=0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12

# Pool Parameters
TICK_SPACING=200
PAYMENT_COIN_TYPE=0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI

# Bot Settings
POLLING_INTERVAL_MS=10000
MAX_RETRIES=3
GAS_BUDGET=100000000

# Logging
LOG_LEVEL=info
```

### Verify It Works

```bash
# Start the bot
pm2 start ecosystem.config.js

# Check logs - should show bot address
pm2 logs pool-creation-bot --lines 20
```

You should see:
```
Initializing from seed phrase
Bot initialized { address: '0x86b38...' }
```

### Security Tips

1. **Never share your seed phrase**
2. **Never commit .env to git** (already in .gitignore)
3. **Use different seed phrase for testnet vs mainnet**
4. **Backup your seed phrase securely**

### Get Your Seed Phrase

If you need to find your seed phrase from Sui wallet:

**From Sui Wallet Browser Extension:**
1. Open extension
2. Settings → Show Recovery Phrase
3. Enter password
4. Copy 12 words

**From Sui CLI:**
```bash
# View your addresses
sui client addresses

# NOTE: Sui CLI doesn't store seed phrases directly
# You need to use the original seed phrase from wallet creation
```

### Troubleshooting

**Error: "Invalid credentials format"**
- Make sure seed phrase has exactly 12 words
- Words should be space-separated
- No extra quotes around the phrase in .env

**Error: "Address doesn't match"**
- Verify you're using the correct seed phrase
- Check that this wallet has the AdminCap
- Try deriving with: `sui keytool import "your seed phrase" ed25519`

### For Fee Collector

Same approach for fee collector:

```bash
# .env
LP_LOCKER_SEED_PHRASE=word1 word2 word3...

# Or
LP_LOCKER_PRIVATE_KEY=suiprivkey...
```

---

**Much easier than exporting private keys!** ✅
