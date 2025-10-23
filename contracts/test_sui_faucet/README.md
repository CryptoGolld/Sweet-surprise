# TestSUI Faucet - SuiLFG MemeFi

A generous testnet faucet that provides 100 TEST_SUI every 6 hours, designed for the SuiLFG MemeFi platform.

## Features

- **Regular Claims**: 100 TEST_SUI every 6 hours per address
- **Admin Minting**: Unlimited minting capability for admins
- **Auto-Refill**: Faucet automatically mints more coins when balance runs low
- **Rate Limiting**: Built-in cooldown tracking per address

## Deployed on Testnet

- **Package ID**: `0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f`
- **Coin Type**: `0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f::test_sui::TEST_SUI`

## Setup

The faucet requires a TreasuryCap to operate. To create the shared Faucet object:

```bash
sui client call \
  --package 0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f \
  --module faucet \
  --function create_faucet \
  --args <TREASURY_CAP_ID> \
  --gas-budget 50000000
```

## Usage

### Claim TEST_SUI (Regular Users)

```bash
sui client call \
  --package 0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f \
  --module faucet \
  --function claim \
  --args <FAUCET_ID> 0x6 \
  --gas-budget 50000000
```

Note: `0x6` is the Clock object (a system shared object on Sui)

### Admin Mint (Unlimited)

```bash
sui client call \
  --package 0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f \
  --module faucet \
  --function admin_mint \
  --args <FAUCET_ID> <ADMIN_CAP_ID> <AMOUNT> \
  --gas-budget 50000000
```

Amount is in the smallest unit (9 decimals), so for 1000 TEST_SUI: `1000000000000`

### Admin Refill

```bash
sui client call \
  --package 0x2cf6aa53988c88614ac4e9e5dfb16c2443db471eb7518b27043aba3b4abca15f \
  --module faucet \
  --function admin_refill \
  --args <FAUCET_ID> <ADMIN_CAP_ID> <AMOUNT> \
  --gas-budget 50000000
```

## Integration with Cetus

YES! You can use TEST_SUI with Cetus pools. Cetus accepts any coin type, so you can:
- Create TEST_SUI/USDC pools
- Create TEST_SUI/memecoin pools
- Test liquidity provision and swaps

## About Memecoin Addresses

Contract addresses on Sui (and all blockchains) are deterministic hashes and cannot be controlled to end with specific strings like "MemeFi". However, you can:
- Use prominent display names and symbols (e.g., "PEPE_SuiLFG")
- Show "Powered by SuiLFG MemeFi" branding in your UI
- Use vanity address generation (very expensive and time-consuming)
