/**
 * SuiLFG MemeFi Platform Constants
 * Testnet deployment addresses
 */

export const NETWORK = 'testnet' as const;

export const CONTRACTS = {
  // Platform package (v0.0.5 - with supply cap fix) - PRODUCTION
  PLATFORM_PACKAGE: '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047',
  
  // Faucet package (SUILFG_MEMEFI token)
  FAUCET_PACKAGE: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81',
  
  // Shared objects - UPDATED from testnet_production.json
  PLATFORM_STATE: '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c',
  FAUCET_OBJECT: '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde',
  
  // Cetus integration (testnet)
  CETUS_GLOBAL_CONFIG: '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e',
  CETUS_POOLS: '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2',
} as const;

export const COIN_TYPES = {
  SUI: '0x2::sui::SUI',
  SUILFG_MEMEFI: `${CONTRACTS.FAUCET_PACKAGE}::faucet::SUILFG_MEMEFI`,
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
