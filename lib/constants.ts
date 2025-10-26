/**
 * SuiLFG MemeFi Platform Constants
 * Testnet deployment addresses
 */

export const NETWORK = 'testnet' as const;

export const CONTRACTS = {
  // NEW Platform package (v0.0.7 - ALL BOT FEATURES!)
  // Includes: prepare_liquidity_for_bot, auto-graduation, special launches, 50 SUI payout
  PLATFORM_PACKAGE: '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5',
  PLATFORM_STATE: '0x8df834a79efd8fca907a6d832e93f6301b5d6cf7ff6d16c363829b3267feacff',
  REFERRAL_REGISTRY: '0xef3fa25c0cd5620f20197047c9b8ca9320bbff1625a185b2c8013dbe8fc41814',
  TICKER_REGISTRY: '0xd98a0a56468df8d1e8a9b692881eacac17750336c8e4cd4b2f8d7c9468096d5b',
  
  // LEGACY Platform package (v0.0.6 - existing community curves)
  // Kept for backwards compatibility - all existing curves still work!
  LEGACY_PLATFORM_PACKAGE: '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0',
  LEGACY_PLATFORM_STATE: '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c',
  LEGACY_REFERRAL_REGISTRY: '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d',
  LEGACY_TICKER_REGISTRY: '0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3',
  
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
 * Helper to detect which contract a curve belongs to
 * Curve types look like: "0xPACKAGE::bonding_curve::BondingCurve<TOKEN>"
 */
export function getContractForCurve(curveTypeOrPackage: string) {
  const isLegacy = curveTypeOrPackage.includes(CONTRACTS.LEGACY_PLATFORM_PACKAGE);
  
  return {
    package: isLegacy ? CONTRACTS.LEGACY_PLATFORM_PACKAGE : CONTRACTS.PLATFORM_PACKAGE,
    state: isLegacy ? CONTRACTS.LEGACY_PLATFORM_STATE : CONTRACTS.PLATFORM_STATE,
    referralRegistry: isLegacy ? CONTRACTS.LEGACY_REFERRAL_REGISTRY : CONTRACTS.REFERRAL_REGISTRY,
    tickerRegistry: isLegacy ? CONTRACTS.LEGACY_TICKER_REGISTRY : CONTRACTS.TICKER_REGISTRY,
    isLegacy,
  };
}

/**
 * Get all packages to watch (for indexer)
 */
export function getAllPlatformPackages() {
  return [
    CONTRACTS.PLATFORM_PACKAGE,
    CONTRACTS.LEGACY_PLATFORM_PACKAGE,
  ];
}

// RPC endpoints
export const RPC_ENDPOINTS = {
  TESTNET: 'https://fullnode.testnet.sui.io:443',
  TESTNET_FAUCET: 'https://faucet.testnet.sui.io/v1/gas',
} as const;
