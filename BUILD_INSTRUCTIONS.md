# BUILD INSTRUCTIONS FOR CETUS INTEGRATION

## IMPORTANT: Special Build Command Required

According to Cetus documentation, their CLMM interface is not complete in terms of code base 
(only function definitions are provided). This causes `sui client` to fail version checks.

**However, this does NOT affect actual functionality!**

## Build Commands:

### For Testing/Development:
```bash
cd suilfg_launch
sui move build --dependencies-are-root
```

### For Publishing to Testnet:
```bash
cd suilfg_launch
sui client publish --gas-budget 500000000 --dependencies-are-root
```

### For Publishing to Mainnet (later):
First update Move.toml:
```toml
CetusClmm = { git = "https://github.com/CetusProtocol/cetus-contracts.git", subdir = "packages/cetus_clmm", rev = "clmm-v14", override = true }
```

And update platform_config.move:
```move
cetus_global_config_id: @0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f
```

Then:
```bash
sui client publish --gas-budget 500000000 --dependencies-are-root
```

## Global Config IDs:

**Testnet:** `0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e`
**Mainnet:** `0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f`

## What Changed:

✅ Move.toml updated with official Cetus testnet dependency
✅ Removed duplicate cetus_clmm address (provided by dependency)
✅ platform_config.move now defaults to correct testnet Global Config ID
✅ All Cetus code uncommented and ready to use

## Next Steps:

1. Try building: `sui move build --dependencies-are-root`
2. If successful, publish: `sui client publish --gas-budget 500000000 --dependencies-are-root`
3. After deployment, configure PlatformConfig settings
4. Test automatic Cetus pool creation!

