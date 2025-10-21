# Sui CLI Setup & Wallet Configuration

**Date:** October 21, 2025  
**Sui Version:** 1.58.3-a0545a819fba  
**Status:** ✅ Successfully Installed & Configured

---

## 📦 Installation Summary

### Sui CLI Installation
- **Version Installed:** 1.58.3 (Latest precompiled release)
- **Download Source:** [GitHub Releases - MystenLabs/sui](https://github.com/MystenLabs/sui/releases/download/mainnet-v1.58.3/sui-mainnet-v1.58.3-ubuntu-x86_64.tgz)
- **Installation Path:** `/usr/local/bin/sui`
- **Platform:** Ubuntu x86_64 (Linux 6.1.147)

### Installation Steps Executed

```bash
# 1. Downloaded latest precompiled Sui CLI
curl -fsSL https://github.com/MystenLabs/sui/releases/download/mainnet-v1.58.3/sui-mainnet-v1.58.3-ubuntu-x86_64.tgz -o /tmp/sui.tgz

# 2. Extracted binary to dedicated directory
mkdir -p /tmp/sui_extract
tar -xzf /tmp/sui.tgz -C /tmp/sui_extract

# 3. Installed to system PATH
sudo mv /tmp/sui_extract/sui /usr/local/bin/

# 4. Verified installation
sui --version
# Output: sui 1.58.3-a0545a819fba
```

---

## 🔐 Wallet Configuration

### Burner Wallet Setup

**Wallet Alias:** `burner`  
**Address:** `0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f`  
**Key Scheme:** ed25519  
**Public Key (Base64):** `AKmlpAwFyEFwOJUYAIA1TpVQdR3XiI3Cnj4g2C3L4uaO`  
**Peer ID:** `a9a5a40c05c841703895180080354e9550751dd7888dc29e3e20d82dcbe2e68e`

### Import Command Used

```bash
sui keytool import "royal stairs eye dizzy response educate fire edge smooth cruise skill say" ed25519 --alias burner
```

### Network Configuration

- **Active Network:** Mainnet
- **RPC Endpoint:** `https://fullnode.mainnet.sui.io:443`
- **Active Address:** `0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f` (burner)

---

## ✅ Verification Commands

### Check Active Address
```bash
sui client active-address
```

### List All Addresses
```bash
sui client addresses
```

### Check Sui Version
```bash
sui --version
```

### View Keystore
```bash
sui keytool list
```

---

## 📂 Configuration Files

- **Client Config:** `~/.sui/sui_config/client.yaml`
- **Keystore:** `~/.sui/sui_config/sui.keystore`
- **Aliases:** `~/.sui/sui_config/sui.aliases`

---

## 🚀 Integration with SuiLFG MemeFi Platform

This wallet is now ready to interact with:

### 1. **MemeFi Launchpad** (`suilfg_launch_with_memefi_testnet/`)
   - Base Currency: SUILFG_MEMEFI
   - Package ID: `0x443b752b268566bcc4c421afe5b055435766da9fce42a4801c77033b5a0b2999`
   - Faucet: `0xbfff12538463316d5b707e462d9045109ca50b3f6f35e5b8470cc6c1d6ab9afc`

### 2. **Sui MemeFi Faucet** (`test_sui_faucet/`)
   - Package ID: `0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f`
   - Coin Type: TEST_SUI
   - Claim Amount: 100 TEST_SUI every 6 hours

---

## 📝 Next Steps

1. **Get Testnet Tokens:**
   ```bash
   # Claim from official Sui testnet faucet
   sui client faucet
   
   # Or claim from SuiLFG MemeFi faucet
   sui client call \
     --package 0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f \
     --module faucet \
     --function claim \
     --args <FAUCET_ID> 0x6 \
     --gas-budget 50000000
   ```

2. **Check Balance:**
   ```bash
   sui client balance
   ```

3. **Deploy/Interact with Contracts:**
   ```bash
   cd suilfg_launch_with_memefi_testnet
   sui client publish --gas-budget 500000000
   ```

---

## 🔧 Useful Commands Reference

### Wallet Management
```bash
# Create new address
sui client new-address ed25519

# Switch active address
sui client switch --address <ADDRESS_OR_ALIAS>

# Export private key
sui keytool export <ADDRESS>

# Update alias
sui keytool update-alias <OLD_ALIAS> <NEW_ALIAS>
```

### Network Management
```bash
# List environments
sui client envs

# Switch network
sui client switch --env testnet

# Add custom RPC
sui client new-env --alias custom --rpc https://your-rpc-url
```

### Transaction Commands
```bash
# Transfer SUI
sui client transfer-sui --to <ADDRESS> --sui-coin-object-id <COIN_ID> --gas-budget 10000000

# Call contract function
sui client call \
  --package <PACKAGE_ID> \
  --module <MODULE_NAME> \
  --function <FUNCTION_NAME> \
  --args <ARG1> <ARG2> \
  --gas-budget 50000000

# Publish Move package
sui client publish --gas-budget 500000000
```

---

## 📊 Project Structure

```
/workspace/
├── suilfg_launch/                      # Mainnet version (Cetus CLMM)
├── suilfg_launch_testnet/              # Testnet version (Simple AMM)
├── suilfg_launch_with_memefi_testnet/  # ✨ MemeFi Platform
│   ├── sources/
│   │   ├── bonding_curve.move
│   │   ├── lp_locker.move
│   │   ├── platform_config.move
│   │   ├── referral_registry.move
│   │   └── ticker_registry.move
│   └── Move.toml
├── test_sui_faucet/                    # ✨ MemeFi Faucet
│   ├── sources/
│   │   ├── faucet.move
│   │   └── test_sui.move
│   └── Move.toml
└── SUI_CLI_SETUP.md                    # 📄 This file
```

---

## 🎯 Environment Information

- **OS:** Linux 6.1.147
- **Shell:** /bin/bash
- **Workspace:** /workspace
- **Git Branch:** `cursor/install-sui-cli-and-login-burner-wallet-5a0f`
- **Date:** October 21, 2025

---

## ⚠️ Security Notes

- This is a **burner wallet** for testing purposes only
- Never use this seed phrase for mainnet or real funds
- The seed phrase has been shared publicly in this documentation
- Private keys are stored in `~/.sui/sui_config/sui.keystore`

---

## 🎉 ROCKET Memecoin Launch

After setting up the Sui CLI, we successfully launched **ROCKET**, the first community memecoin on SuiLFG MemeFi Platform!

### Quick Stats
- **Package:** `0x498052323801da4a1b725fb1059829db1574832e61708296c9ccb9934c34d33c`
- **Symbol:** ROCKET
- **Full Type:** `0x498052323801da4a1b725fb1059829db1574832e61708296c9ccb9934c34d33c::rocket_memefi::ROCKET_MEMEFI`
- **Bonding Curve:** `0x638fed0937d9592716fc242a6eec1e99f867b5a7ef41d0075a9a06ed7ae6fd4c`

📖 **Full Documentation:** See [`ROCKET_MEMECOIN_LAUNCH.md`](/workspace/ROCKET_MEMECOIN_LAUNCH.md) for complete launch details!

---

**Generated by:** Sui CLI Setup Automation  
**Last Updated:** October 21, 2025 - 16:30 UTC
