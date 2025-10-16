# Fixing Cetus Dependency - Multiple Options

## Option 1: Clone Cetus Repo Manually (RECOMMENDED)

```bash
cd ~/sui-testnet
git clone https://github.com/CetusProtocol/cetus-clmm-sui.git
cd cetus-clmm-sui
git checkout testnet  # or main if testnet doesn't exist
```

Then in Move.toml:
```toml
Cetus = { local = "../cetus-clmm-sui/sui" }
```

## Option 2: Use Published Package Address (If Available)

```toml
[addresses]
cetus_clmm = "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb"
```

Then import directly:
```move
use 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::config::GlobalConfig;
```

## Option 3: Use Specific Commit Hash

```toml
Cetus = { git = "https://github.com/CetusProtocol/cetus-clmm-sui.git", subdir = "sui", rev = "COMMIT_HASH" }
```

## TRY THIS NOW:

```bash
cd ~/sui-testnet
git clone https://github.com/CetusProtocol/cetus-clmm-sui.git
cd suilfg_launch
sui move build
```

