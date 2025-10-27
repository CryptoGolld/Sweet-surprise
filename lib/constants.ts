/**
 * SuiLFG MemeFi Platform Constants
 * Testnet deployment addresses
 */

export const NETWORK = 'testnet' as const;

export const CONTRACTS = {
  // CURRENT Platform package (v0.0.8 - UPGRADED with LP bot security + special launch flag)
  // Deployed: 2025-10-27 | TX: CZFLVEP58HSFiW1JY1fp8kV4duA7b9uR7nv25TR1H9f7
  // Features: LP bot address security, special launch flag, prepare_liquidity_for_bot
  PLATFORM_PACKAGE: '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348',
  PLATFORM_STATE: '0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9',
  REFERRAL_REGISTRY: '0x964b507850a0b51a736d28da9e8868ce82d99fe1faa580c9b4ac3a309e28c836',
  TICKER_REGISTRY: '0xd8ba248944efc41c995a70679aabde9e05b509a7be7c10050f0a52a9029c0fcb',
  ADMIN_CAP: '0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11',  // Store for admin operations
  UPGRADE_CAP: '0x7ef7bc39eea080ebddb61426c3b81d099690d3d2eab836e80e6e0a70b5cf6c5b',  // For future upgrades
  
  // PREVIOUS Platform packages (for reference - incentivized testnet rewards tracking)
  // v0.0.7: '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5',
  // v0.0.6 (LEGACY): '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0',
  
  // Faucet package (SUILFG_MEMEFI token) - same for both
  FAUCET_PACKAGE: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81',
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
  // Payment token for trades (testnet uses SUILFG_MEMEFI, mainnet will use SUI)
  PAYMENT_TOKEN: `${CONTRACTS.FAUCET_PACKAGE}::suilfg_memefi::SUILFG_MEMEFI`,
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

/**
 * Helper to get current contract addresses
 * Frontend only uses v0.0.8 package (legacy tracked by indexer for rewards)
 */
export function getContractForCurve(curveTypeOrPackage: string) {
  // Always use current package for all operations
  return {
    package: CONTRACTS.PLATFORM_PACKAGE,
    state: CONTRACTS.PLATFORM_STATE,
    referralRegistry: CONTRACTS.REFERRAL_REGISTRY,
    tickerRegistry: CONTRACTS.TICKER_REGISTRY,
    isLegacy: false,
  };
}

// RPC endpoints
export const RPC_ENDPOINTS = {
  TESTNET: 'https://fullnode.testnet.sui.io:443',
  TESTNET_FAUCET: 'https://faucet.testnet.sui.io/v1/gas',
} as const;
