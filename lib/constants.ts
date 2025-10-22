/**
 * SuiLFG MemeFi Platform Constants
 * Testnet deployment addresses
 */

export const NETWORK = 'testnet' as const;

export const CONTRACTS = {
  // Platform package (v0.0.5 - with supply cap fix)
  PLATFORM_PACKAGE: '0x39d07cf0e87e2f2c3cb1807b30ae49ba1e786d587b98ede8e36c7f23833e1de3',
  
  // Faucet package (SUILFG_MEMEFI token)
  FAUCET_PACKAGE: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81',
  
  // Shared objects
  PLATFORM_STATE: '0xa7dc3d82efc298e1f3c7f3b12b43b8cc1f8e7e6adfdfca6e8f99df1df9e0c29e',
  FAUCET_OBJECT: '0x3ca9a86de98ae1f18d94c2d98db28d9d1b0fb2d5c1e57e8e0f90f2deefbf1bc4',
  
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
