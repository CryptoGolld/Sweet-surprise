/**
 * SuiLFG MemeFi Platform Constants
 * Testnet deployment addresses
 */

export const NETWORK = 'testnet' as const;

export const CONTRACTS = {
  // Platform package (v0.0.7 - FRESH DEPLOYMENT WITH ALL BOT FEATURES!)
  // Includes: prepare_liquidity_for_bot, auto-graduation, special launches, 50 SUI payout
  PLATFORM_PACKAGE: '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5',
  
  // Faucet package (SUILFG_MEMEFI token)
  FAUCET_PACKAGE: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81',
  
  // Shared objects - FRESH deployment
  PLATFORM_STATE: '0x8df834a79efd8fca907a6d832e93f6301b5d6cf7ff6d16c363829b3267feacff',
  REFERRAL_REGISTRY: '0xef3fa25c0cd5620f20197047c9b8ca9320bbff1625a185b2c8013dbe8fc41814',
  TICKER_REGISTRY: '0xd98a0a56468df8d1e8a9b692881eacac17750336c8e4cd4b2f8d7c9468096d5b',
  FAUCET_OBJECT: '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde',
  
  // Cetus integration (testnet)
  CETUS_GLOBAL_CONFIG: '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e',
  CETUS_POOLS: '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2',
  
  // OTHER DEPLOYMENTS (not needed anymore)
  // FRESH_V2: '0xc6a2e71b87b181251bcc44662616afad81288f78c330a6172792c1ec2c59761f',
  // FRESH_V3: '0x344f97a405d33c899bd70a75a248554b7576070cc113d3322672bb1b22be5a70',
} as const;

export const COIN_TYPES = {
  SUI: '0x2::sui::SUI',
  SUILFG_MEMEFI: `${CONTRACTS.FAUCET_PACKAGE}::suilfg_memefi::SUILFG_MEMEFI`,
} as const;

// Bonding curve constants (from contract)
export const BONDING_CURVE = {
  MAX_CURVE_SUPPLY: 737_000_000, // 737M tokens available on curve
  TOTAL_SUPPLY: 1_000_000_000, // 1B total (263M for LP/team)
  TARGET_SUI: 13_000, // 13K SUI to graduate
  DECIMALS: 9,
  TICK_SPACING: 60, // 0.25% fee tier for Cetus
} as const;

export const FEES = {
  PLATFORM_FEE_BPS: 100, // 1% platform fee
  SLIPPAGE_BPS: 100, // 1% default slippage
} as const;

export const UI = {
  REFRESH_INTERVAL: 5000, // 5 seconds
  TOAST_DURATION: 5000,
} as const;

// RPC endpoints
export const RPC_ENDPOINTS = {
  TESTNET: 'https://fullnode.testnet.sui.io:443',
  TESTNET_FAUCET: 'https://faucet.testnet.sui.io/v1/gas',
} as const;
