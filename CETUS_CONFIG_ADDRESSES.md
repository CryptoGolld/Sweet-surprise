# Cetus GlobalConfig Addresses

## Mainnet
```
0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f
```

## Testnet
```
0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e
```

---

## After Deployment - Set This:

**Testnet:**
```bash
sui client call \
  --package <YOUR_PACKAGE_ID> \
  --module platform_config \
  --function set_cetus_global_config_id \
  --args <ADMIN_CAP> <PLATFORM_CONFIG> 0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e \
  --gas-budget 10000000
```

**Mainnet:**
```bash
sui client call \
  --package <YOUR_PACKAGE_ID> \
  --module platform_config \
  --function set_cetus_global_config_id \
  --args <ADMIN_CAP> <PLATFORM_CONFIG> 0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f \
  --gas-budget 10000000
```

---

✅ Full Cetus integration enabled!
✅ 100-year LP lock ready!
✅ Ready to deploy!

