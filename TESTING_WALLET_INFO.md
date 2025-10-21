# Testing Wallet Information

## ⚠️ IMPORTANT - SAVE THIS INFORMATION SECURELY THEN DELETE THIS FILE

**Date Created:** 2025-10-21  
**Network:** Testnet (can also be used on devnet/mainnet)

---

## Wallet Details

**Address:**
```
0xa2e1e48f7c710c533f8d41e161e3dc32a3666265d0fd92e46f7f935e986fc84f
```

**Alias:** `amazing-diamond`

**Secret Recovery Phrase (12 words):**
```
throw verb rail wrong question movie merit edge uncle away film tooth
```

**Key Scheme:** ed25519

---

## How to Send Gas

Send **testnet SUI** to this address:
```
0xa2e1e48f7c710c533f8d41e161e3dc32a3666265d0fd92e46f7f935e986fc84f
```

### Recommended Amount for Testing:
- **Minimum:** 5 SUI (for basic testing)
- **Recommended:** 20-50 SUI (for comprehensive contract testing)
- **Heavy Testing:** 100+ SUI (for multiple token creations and graduations)

### Get Testnet SUI:
1. **Sui Testnet Faucet:** https://discord.gg/sui (use #testnet-faucet channel)
2. **Direct Faucet:** Use `sui client faucet` command after you send some initial gas
3. **From your wallet:** Send from your main testnet wallet

---

## Current Balance

Run this command to check balance:
```bash
sui client gas
```

---

## How to Use This Wallet

### Check balance:
```bash
sui client gas
```

### View addresses:
```bash
sui client addresses
```

### Switch networks:
```bash
sui client switch --env testnet   # For testnet
sui client switch --env devnet    # For devnet
sui client switch --env mainnet   # For mainnet
```

---

## Security Notes

1. ✅ **This is a BURNER/TESTING wallet** - Do NOT use for mainnet with real funds
2. ✅ **Environment variable ready** - The mnemonic is stored in Sui's keystore
3. ⚠️ **Delete this file** after saving the recovery phrase securely
4. ⚠️ **Never commit** this file to git

---

## Access from Scripts

The wallet is automatically available to Sui CLI commands. For your TypeScript scripts, you can export:

```bash
export SUI_NETWORK=testnet
```

Or use the Sui CLI directly:
```bash
sui client call --package <PKG> --module <MODULE> --function <FUNC> ...
```

---

## Wallet Location

Keystore: `~/.sui/sui_config/sui.keystore`  
Config: `~/.sui/sui_config/client.yaml`

---

**✅ Sui CLI Version:** 1.58.3  
**✅ Network:** Testnet (https://fullnode.testnet.sui.io:443)  
**✅ Ready for testing!**
