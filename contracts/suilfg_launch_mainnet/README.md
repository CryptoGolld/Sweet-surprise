# SuiLFG Launch - MAINNET Version

This is the **MAINNET** version of the SuiLFG MemeFi platform contracts.

## Key Difference from Testnet

**Payment Token:**
- **Testnet:** Uses `SUILFG_MEMEFI` (custom faucet token)
- **Mainnet:** Uses native `SUI` ✅

All occurrences of `SUILFG_MEMEFI` have been replaced with `SUI` in this version.

## Files Modified

All references to the faucet token were replaced:
- `Balance<SUILFG_MEMEFI>` → `Balance<SUI>`
- `Coin<SUILFG_MEMEFI>` → `Coin<SUI>`
- `Pool<SUILFG_MEMEFI, T>` → `Pool<SUI, T>`
- `CoinMetadata<SUILFG_MEMEFI>` → `CoinMetadata<SUI>`
- `LockedLPPosition<SUILFG_MEMEFI, T>` → `LockedLPPosition<SUI, T>`

Module names updated:
- `suilfg_launch_memefi` → `suilfg_launch_mainnet`

## Build & Deploy

```bash
# Build contracts
cd contracts/suilfg_launch_mainnet
sui move build

# Deploy to mainnet
sui client publish --gas-budget 500000000
```

## Deployment

After deploying, update `.env.mainnet` with:
- PLATFORM_PACKAGE
- PLATFORM_STATE  
- REFERRAL_REGISTRY
- TICKER_REGISTRY
- ADMIN_CAP
- UPGRADE_CAP

See `MAINNET_DEPLOYMENT.md` for full deployment guide.

---

**Created:** Nov 1, 2025  
**Based on:** Testnet v0.0.7  
**Network:** Sui Mainnet  
**Payment Token:** Native SUI
