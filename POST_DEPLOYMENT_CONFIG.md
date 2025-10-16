# 📋 Post-Deployment Configuration Checklist

## Overview
After deploying your contracts, you need to configure PlatformConfig. Some settings are CRITICAL, others are optional (have good defaults).

---

## 🚨 CRITICAL - MUST SET BEFORE FIRST GRADUATION

### 1. Cetus Global Config (REQUIRED!)
**Default:** `@0x0` (invalid, MUST be changed!)

**What it is:** Cetus protocol's configuration object ID

**Where to get it:**

**Official Cetus Documentation:**
- Main docs: https://cetus-1.gitbook.io/cetus-docs/developer/integrate-cetus-clmm-sdk
- Contract addresses: Look for "Deployed Contracts" or "Contract Addresses" section

**Testnet:**
- Check: https://cetus-1.gitbook.io/cetus-docs/developer/deployed-contracts
- Or search Cetus Discord/Telegram for "testnet GlobalConfig"

**Mainnet:**
- Check: https://cetus-1.gitbook.io/cetus-docs/developer/deployed-contracts
- Look for "Mainnet" section

**Command:**
```bash
# Get the GlobalConfig object ID from Cetus docs
CETUS_CONFIG="0x..." # Example: 0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f

sui client call \
  --package <YOUR_PACKAGE_ID> \
  --module platform_config \
  --function set_cetus_global_config_id \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $CETUS_CONFIG \
  --gas-budget 10000000
```

---

## ⚠️ IMPORTANT - Should Set Before Launch

### 2. Treasury Address
**Default:** Deployer address

**What it is:** Where team allocation (2M tokens) is sent on graduation

**When to set:** Before first token graduates

**Command:**
```bash
TREASURY="0xYOUR_TREASURY_WALLET"

sui client call \
  --package <YOUR_PACKAGE_ID> \
  --module platform_config \
  --function set_treasury_address \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $TREASURY \
  --gas-budget 10000000
```

---

### 3. LP Recipient Address
**Default:** Deployer address

**What it is:** Where LP Position NFT is sent (earns 0.3% LP fees forever)

**When to set:** Before first token graduates

**Command:**
```bash
LP_WALLET="0xYOUR_LP_WALLET"

sui client call \
  --package <YOUR_PACKAGE_ID> \
  --module platform_config \
  --function set_lp_recipient_address \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $LP_WALLET \
  --gas-budget 10000000
```

---

## ✅ OPTIONAL - Good Defaults (Adjust if Needed)

### 4. Platform Fee (Trading)
**Default:** 250 bps (2.5%)

**Command:**
```bash
# Example: Change to 3% (300 bps)
sui client call \
  --function set_platform_fee \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> 300 \
  --gas-budget 10000000
```

---

### 5. Creator Fee (Trading)
**Default:** 50 bps (0.5%)

**Command:**
```bash
# Example: Change to 1% (100 bps)
sui client call \
  --function set_creator_fee \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> 100 \
  --gas-budget 10000000
```

---

### 6. Graduation Target
**Default:** 13,333 SUI (13,333,000,000,000 mist)

**Note:** Changing this requires recalculating the entire bonding curve!

**Command (if you really need to):**
```bash
# 13,333 SUI in mist
TARGET_MIST=13333000000000

sui client call \
  --function set_default_graduation_target_mist \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $TARGET_MIST \
  --gas-budget 10000000
```

---

### 7. Platform Cut on Graduation
**Default:** 1000 bps (10%)

**Command:**
```bash
# Example: Change to 5% (500 bps)
sui client call \
  --function set_platform_cut_on_graduation \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> 500 \
  --gas-budget 10000000
```

---

### 8. Creator Graduation Payout
**Default:** 40 SUI (40,000,000,000 mist)

**Command:**
```bash
# Example: Change to 100 SUI
PAYOUT=100000000000

sui client call \
  --function set_creator_graduation_payout \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $PAYOUT \
  --gas-budget 10000000
```

---

### 9. First Buyer Fee
**Default:** 1 SUI (1,000,000,000 mist)

**Command:**
```bash
# Example: Change to 0.5 SUI
FEE=500000000

sui client call \
  --function set_first_buyer_fee \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $FEE \
  --gas-budget 10000000
```

---

### 10. Team Allocation
**Default:** 2,000,000 tokens

**Command:**
```bash
# Example: Change to 1M tokens
sui client call \
  --function set_team_allocation \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> 1000000 \
  --gas-budget 10000000
```

---

### 11. Ticker Max Lock Period
**Default:** 7 days (604,800,000 ms)

**Command:**
```bash
# Example: Change to 14 days
LOCK_MS=1209600000

sui client call \
  --function set_ticker_max_lock_ms \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $LOCK_MS \
  --gas-budget 10000000
```

---

### 12. Ticker Early Reuse Base Fee
**Default:** 33 SUI (33,000,000,000 mist)

**Command:**
```bash
# Example: Change to 50 SUI
FEE=50000000000

sui client call \
  --function set_ticker_early_reuse_base_fee \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $FEE \
  --gas-budget 10000000
```

---

### 13. Ticker Early Reuse Max Fee
**Default:** 666 SUI (666,000,000,000 mist)

**Command:**
```bash
# Example: Change to 1000 SUI cap
FEE=1000000000000

sui client call \
  --function set_ticker_early_reuse_max_fee \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> $FEE \
  --gas-budget 10000000
```

---

## 🔧 Emergency Controls

### Pause Token Creation
```bash
sui client call \
  --function pause_creation \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> \
  --gas-budget 10000000
```

### Resume Token Creation
```bash
sui client call \
  --function resume_creation \
  --args <ADMIN_CAP_ID> <PLATFORM_CONFIG_ID> \
  --gas-budget 10000000
```

---

## 📝 Complete Setup Script

```bash
#!/bin/bash

# Save these after deployment
ADMIN_CAP="0x..."
PLATFORM_CONFIG="0x..."
PACKAGE_ID="0x..."

# CRITICAL: Set Cetus config (get from Cetus docs!)
CETUS_CONFIG="0x..."  # https://cetus-1.gitbook.io/cetus-docs

sui client call \
  --package $PACKAGE_ID \
  --module platform_config \
  --function set_cetus_global_config_id \
  --args $ADMIN_CAP $PLATFORM_CONFIG $CETUS_CONFIG \
  --gas-budget 10000000

# Set your treasury wallet
TREASURY="0xYOUR_TREASURY"
sui client call \
  --package $PACKAGE_ID \
  --module platform_config \
  --function set_treasury_address \
  --args $ADMIN_CAP $PLATFORM_CONFIG $TREASURY \
  --gas-budget 10000000

# Set LP recipient wallet
LP_WALLET="0xYOUR_LP_WALLET"
sui client call \
  --package $PACKAGE_ID \
  --module platform_config \
  --function set_lp_recipient_address \
  --args $ADMIN_CAP $PLATFORM_CONFIG $LP_WALLET \
  --gas-budget 10000000

echo "✅ Critical configuration complete!"
```

---

## 🔍 Verify Configuration

Check what's currently set:

```bash
# View entire config
sui client object <PLATFORM_CONFIG_ID>

# Check specific values
sui client object <PLATFORM_CONFIG_ID> --json | jq '.data.content.fields'
```

---

## 🚨 REMEMBER:

1. **MUST set Cetus config before any graduation!**
2. **Set treasury and LP wallet before first graduation**
3. **All other settings have sensible defaults**
4. **Only you (AdminCap holder) can change these**
5. **Keep AdminCap secure!**

---

## 📚 Cetus Documentation Links:

**Primary:**
- GitBook: https://cetus-1.gitbook.io/cetus-docs
- GitHub: https://github.com/CetusProtocol

**Specific Pages:**
- SDK Integration: https://cetus-1.gitbook.io/cetus-docs/developer/integrate-cetus-clmm-sdk
- Deployed Contracts: https://cetus-1.gitbook.io/cetus-docs/developer/deployed-contracts
- API Reference: https://cetus-1.gitbook.io/cetus-docs/developer/api-reference

**If docs are unclear:**
- Join Cetus Discord: https://discord.gg/cetus
- Ask in their developer channel
- Check their GitHub for contract addresses

**What to look for:**
- "GlobalConfig" object address
- Look for your network (testnet or mainnet)
- Usually in "Deployed Contracts" or "Contract Addresses" section

