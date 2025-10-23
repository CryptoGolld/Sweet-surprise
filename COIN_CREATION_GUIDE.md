# 🚀 SuiLFG MemeFi - Coin Creation System

## How It Works

We use a **hybrid approach** that gives you the best of both worlds:

1. **Backend compiles** Move code → Fast & cached
2. **User signs & publishes** → They pay gas & own the package
3. **User creates curve** → Second signature
4. **Done in ~15 seconds!** ✅

### Flow Diagram

```
User fills form
      ↓
Frontend → POST /api/compile-coin
      ↓
Backend compiles Move code (5-10 sec)
      ↓
Frontend gets bytecode
      ↓
User signs TX 1: Publish package (they pay ~0.3 SUI)
      ↓
User signs TX 2: Create curve (they pay ~0.1 SUI)
      ↓
Coin is LIVE! 🎉
```

---

## Branding

**All coins have `_SUILFG_MEMEFI` suffix:**

- Ticker: `PEPE`
- Type: `0x{pkg}::pepe::PEPE_SUILFG_MEMEFI`

This brands every coin as launched on your platform!

---

## Setup

### Requirements

- Sui CLI installed (for backend compilation)
- Next.js app deployed
- No private keys needed! (users sign everything)

### Install Sui CLI

```bash
# Check if installed
sui --version

# If not, install:
curl -L https://github.com/MystenLabs/sui/releases/download/testnet-v1.42.2/sui-testnet-v1.42.2-ubuntu-x86_64.tgz -o sui.tgz
tar -xzf sui.tgz
sudo mv sui-testnet-v1.42.2-ubuntu-x86_64/sui /usr/local/bin/
sui --version
```

### Local Testing

```bash
# Build
npm run build

# Run dev server
npm run dev

# Visit http://localhost:3000
# Connect wallet
# Try creating a test coin
```

---

## User Experience

1. User clicks "Create Coin"
2. Fills form (ticker, name, description)
3. Clicks "Create"
4. Sees: "Compiling package..." (~5 sec)
5. Wallet popup: "Sign to publish package"
6. Signs (pays ~0.3 SUI)
7. Sees: "Creating bonding curve..."
8. Wallet popup again: "Sign to create curve"
9. Signs (pays ~0.1 SUI)
10. Success! Coin is live! 🎉

**Total time: ~15 seconds**
**Total cost to user: ~0.4-0.5 SUI**
**Cost to you: $0!** ✨

---

## Advantages

### vs Option A (Manual)
✅ No manual work for you
✅ Instant for users
✅ Scales infinitely

### vs Option B (You pay gas)
✅ Users pay gas (not you!)
✅ Users own the package
✅ Truly permissionless
✅ Sustainable long-term

### vs Full Option C (Complex backend)
✅ Simpler (just compilation)
✅ No Docker needed
✅ Works on Vercel free tier
✅ Same user experience

---

## Technical Details

### Backend API: `/api/compile-coin`

**Input:**
```json
{
  "ticker": "PEPE",
  "name": "Pepe Coin",
  "description": "Best frog"
}
```

**Output:**
```json
{
  "success": true,
  "modules": [[bytecode array]],
  "dependencies": ["0x1", "0x2"],
  "moduleName": "pepe",
  "structName": "PEPE_SUILFG_MEMEFI"
}
```

### Frontend Flow

```typescript
// 1. Compile on backend
const { modules, moduleName, structName } = 
  await fetch('/api/compile-coin', { ... });

// 2. Build publish transaction
const publishTx = new Transaction();
publishTx.publish({ modules, dependencies });

// 3. User signs to publish
const publishResult = await signAndExecuteTransaction({ 
  transaction: publishTx 
});

// 4. Extract package ID, TreasuryCap, Metadata
const { packageId, treasuryCapId, metadataId } = 
  extractFromResult(publishResult);

// 5. Build curve creation transaction
const curveTx = createCurveTransaction({
  packageId, treasuryCapId, metadataId
});

// 6. User signs to create curve
const curveResult = await signAndExecuteTransaction({ 
  transaction: curveTx 
});

// 7. Done!
```

---

## Deployment

### Vercel

```bash
# Push to GitHub
git push

# Vercel auto-deploys
# No environment variables needed!
```

### Testing on Vercel

1. Visit your Vercel URL
2. Connect wallet (make sure you have ~1 SUI)
3. Create test coin (ticker: TEST)
4. Sign both transactions
5. Verify on Suiscan

---

## Caching

The backend caches compiled bytecode for 1 hour.

Same ticker + name = instant response (no recompilation)

This makes it very fast for popular tickers!

---

## Rate Limiting

Currently: None (add if needed)

Possible limits:
- X compilations per IP per hour
- X coins per wallet per day
- Require wallet to have minimum balance

---

## Costs

### For Users
- Publish package: ~0.3 SUI
- Create curve: ~0.1 SUI
- **Total: ~0.4-0.5 SUI per coin**

### For You
- Compilation: Free (runs on Vercel)
- Gas: $0 (users pay!)
- Infrastructure: Free (Vercel free tier)

---

## Monitoring

### Check Compilations

Vercel logs show:
```
📦 Compiling package...
✅ Compilation successful!
```

### Check Creations

On-chain events:
- PackagePublished
- BondingCurveCreated

Track via Suiscan or custom indexer

---

## Troubleshooting

### "sui: command not found"
**Fix:** Install Sui CLI on server

### "Compilation failed"
**Fix:** Check Move.toml syntax, check sui CLI version

### "User rejected transaction"
**Fix:** Normal - user cancelled. No issue.

### "Insufficient gas"
**Fix:** User needs more SUI in wallet

---

## Security

### ✅ Secure
- No private keys on server
- Users sign everything
- Users own packages
- Users pay gas

### ⚠️ Consider
- Rate limiting (prevent spam compilations)
- Input validation (ticker/name format)
- Profanity filter (optional)

---

## Future Upgrades

### Short-term
- Add Redis caching (faster)
- Add rate limiting
- Add profanity filter

### Long-term
- Single-transaction flow (PTB magic)
- Metadata uploads (IPFS)
- Social graph integration

---

## FAQ

**Q: Why two signatures?**
A: Can't reference package ID in same transaction. Will fix in future with advanced PTB.

**Q: Can we make it one signature?**
A: Technically possible but complex. Current UX is good enough for launch.

**Q: What if compilation fails?**
A: User sees error, can try again. No gas wasted.

**Q: What if publish succeeds but curve fails?**
A: User owns package but no curve. They can create curve manually or retry.

**Q: How fast is compilation?**
A: 5-10 seconds first time, instant if cached.

---

## Summary

✅ Fast (~15 seconds)
✅ Cheap for users (~0.4 SUI)
✅ Free for you ($0 gas!)
✅ Fully decentralized (users own packages)
✅ Simple to maintain
✅ Works on Vercel free tier
✅ All coins branded with _SUILFG_MEMEFI

**Perfect for launch!** 🚀
