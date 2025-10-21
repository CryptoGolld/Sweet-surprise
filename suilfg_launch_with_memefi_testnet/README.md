# SuiLFG Launch - MEMEFI Testnet Version

This is a modified version of the SuiLFG Launch contracts that uses **SUILFG_MEMEFI** instead of regular SUI.

## Key Differences from Original

1. **Base Currency:** Uses `SUILFG_MEMEFI` instead of `SUI`
2. **Faucet Integration:** Has generous testnet faucet (10,000 SUILFG_MEMEFI minted)
3. **Cetus Pools:** Creates pools with SUILFG_MEMEFI pairs
4. **Branded Coin Types:** All memecoins will end with `_memefi` or `_suilfg_memefi`

## Deployed SUILFG_MEMEFI Details

- **Package ID:** `0x443b752b268566bcc4c421afe5b055435766da9fce42a4801c77033b5a0b2999`
- **Coin Type:** `0x443b752b268566bcc4c421afe5b055435766da9fce42a4801c77033b5a0b2999::suilfg_memefi::SUILFG_MEMEFI`
- **Faucet:** `0xbfff12538463316d5b707e462d9045109ca50b3f6f35e5b8470cc6c1d6ab9afc`
- **Symbol:** SUI_MEMEFI
- **Decimals:** 9 (same as SUI)

## Directory Structure

```
suilfg_launch_with_memefi_testnet/
├── sources/
│   ├── bonding_curve.move      # Modified to use SUILFG_MEMEFI
│   ├── lp_locker.move          # LP locking for Cetus positions
│   ├── platform_config.move    # Platform configuration
│   ├── referral_registry.move  # Referral system
│   └── ticker_registry.move    # Ticker management
└── Move.toml                    # Package configuration
```

## Original Contract Location

The original contracts (using real SUI) are preserved at:
```
/workspace/suilfg_launch/sources/
```

## How to Deploy

```bash
cd /workspace/suilfg_launch_with_memefi_testnet
sui client publish --gas-budget 500000000
```

## Integration Points

### Using with Cetus

All Cetus pool creation functions now use `SUILFG_MEMEFI` as the base pair:

```move
// Old (original):
Pool<SUI, MEMECOIN>

// New (this version):
Pool<SUILFG_MEMEFI, MEMECOIN>
```

### Memecoin Branding

When users create memecoins, the naming pattern ensures branding:

**Module naming:** `{ticker}_memefi`  
**Struct naming:** `{TICKER}_MEMEFI` (uppercase of module)

Example:
```move
module package::pepe_memefi {
    public struct PEPE_MEMEFI has drop {}
}
// Results in coin type: 0x...::pepe_memefi::PEPE_MEMEFI
```

## Testing

1. Get SUILFG_MEMEFI from faucet (100 tokens every 6 hours, or use admin mint for 10,000+)
2. Deploy these contracts  
3. Create a memecoin
4. Test bonding curve with SUILFG_MEMEFI
5. Graduate to Cetus pool (SUILFG_MEMEFI/MEMECOIN pair)

## Why Two Versions?

- **Original (`suilfg_launch/`):** Uses real SUI, for mainnet deployment
- **This version (`suilfg_launch_with_memefi_testnet/`):** Uses SUILFG_MEMEFI for generous testnet testing

This allows thorough testing without being limited by testnet faucet restrictions (0.5 SUI every 24h).

## Balance Available

- **Current Balance:** 10,000+ SUILFG_MEMEFI tokens ready for testing!
- **Claim More:** Use admin mint for unlimited amounts
- **Regular Users:** 100 tokens every 6 hours from public faucet
