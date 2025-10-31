/**
 * Bonding Curve Calculations - EXACT implementation from contract
 * 
 * These functions implement the EXACT mathematical formulas used in the Move contract.
 * DO NOT modify these constants or formulas unless the contract changes!
 * 
 * Key insight: token_supply is stored in WHOLE TOKENS (not mist/base units)
 * Example: 1,000,000 tokens = 1,000,000 (not 1,000,000,000,000,000)
 */

// Platform constants (MUST match contract exactly!)
const M_NUM = 1n;
const M_DEN = 10593721631205n; // From platform_config.move
const BASE_PRICE_MIST = 1000n; // 0.000001 SUI (1 micro-SUI)
const SUI_DECIMALS = 9;
const MIST_PER_SUI = 1_000_000_000n; // 1e9
const THREE = 3n;
const TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens

/**
 * Calculate TVL (total SUI raised) for a given supply
 * This is the INTEGRAL of the price function
 * Formula: TVL(s) = base_price * s + (m_num / (3 * m_den)) * s³
 */
function calculateTvlInMist(s: bigint): bigint {
  const baseComponent = BASE_PRICE_MIST * s;
  const slopeComponent = (s * s * s * M_NUM) / (THREE * M_DEN);
  return baseComponent + slopeComponent;
}

/**
 * Calculate spot price at a given supply
 * This is the DERIVATIVE of the TVL function
 * Formula: price(s) = base_price + (m_num / m_den) * s²
 * 
 * This EXACTLY matches the contract's spot_price_u128 function
 */
function calculateSpotPriceInMist(s: bigint): bigint {
  const slopeComponent = (s * s * M_NUM) / M_DEN;
  return BASE_PRICE_MIST + slopeComponent;
}

/**
 * Calculate spot price (in SUI) from supply in whole tokens
 * @param supplyInWholeTokens - Token supply in whole tokens (e.g., 1000000 = 1M tokens)
 * @returns Spot price in SUI
 */
export function calculateSpotPrice(supplyInWholeTokens: number): number {
  const supply = BigInt(Math.floor(supplyInWholeTokens));
  const priceMist = calculateSpotPriceInMist(supply);
  return Number(priceMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate TVL (total SUI raised) from supply in whole tokens
 * @param supplyInWholeTokens - Token supply in whole tokens
 * @returns TVL in SUI
 */
export function calculateTvl(supplyInWholeTokens: number): number {
  const supply = BigInt(Math.floor(supplyInWholeTokens));
  const tvlMist = calculateTvlInMist(supply);
  return Number(tvlMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate market cap (FDV) from current supply
 * FDV = spot_price × total_supply (1B tokens)
 * This is the "Fully Diluted Valuation"
 */
export function calculateMarketCap(supplyInWholeTokens: number): number {
  const spotPrice = calculateSpotPrice(supplyInWholeTokens);
  return spotPrice * TOTAL_SUPPLY;
}

/**
 * NEWTON-RAPHSON METHOD: Find supply for a target TVL
 * 
 * This solves the inverse problem: given TVL, find supply
 * Uses iterative Newton-Raphson method for accurate results
 * 
 * @param targetTvlInSui - Target SUI raised (e.g., 5000, 10000, 13333)
 * @returns Token supply in whole tokens
 */
export function findSupplyForTvl(targetTvlInSui: number): bigint {
  const targetTvlMist = BigInt(Math.round(targetTvlInSui * (10 ** SUI_DECIMALS)));

  // Initial guess for supply (linear approximation)
  let s = (targetTvlMist * 1000000000n) / (BigInt(Math.round(1000 * (10 ** SUI_DECIMALS))));
  if (s === 0n) s = 1n; // Avoid starting with zero

  // Newton-Raphson iteration: s_next = s - f(s) / f'(s)
  // where f(s) = TVL(s) - target, and f'(s) = spot_price(s)
  for (let i = 0; i < 15; i++) {
    const currentTvl = calculateTvlInMist(s);
    const currentSpotPrice = calculateSpotPriceInMist(s);

    if (currentSpotPrice === 0n) return s; // Avoid division by zero

    const error = currentTvl - targetTvlMist;

    // Newton-Raphson formula
    const adjustment = error / currentSpotPrice;
    
    s = s - adjustment;

    // If adjustment is zero, we've converged
    if (adjustment === 0n) {
      break;
    }
  }

  return s;
}

/**
 * Predict spot price at a target TVL
 * Useful for showing "At X SUI raised, price will be Y"
 */
export function predictPriceAtTvl(targetTvlInSui: number): number {
  const supply = findSupplyForTvl(targetTvlInSui);
  const priceMist = calculateSpotPriceInMist(supply);
  return Number(priceMist) / Number(MIST_PER_SUI);
}

/**
 * Predict market cap at a target TVL
 */
export function predictMarketCapAtTvl(targetTvlInSui: number): number {
  const price = predictPriceAtTvl(targetTvlInSui);
  return price * TOTAL_SUPPLY;
}

/**
 * Calculate milestone data for progress displays
 * Returns array of {tvl, supply, price, marketCap} objects
 * 
 * Example: calculateMilestones([1000, 5000, 10000, 13333])
 */
export function calculateMilestones(milestoneTvls: number[]) {
  return milestoneTvls.map(tvl => {
    const supply = findSupplyForTvl(tvl);
    const price = Number(calculateSpotPriceInMist(supply)) / Number(MIST_PER_SUI);
    const marketCap = price * TOTAL_SUPPLY;
    return {
      tvl,
      supply: Number(supply),
      price,
      marketCap,
    };
  });
}

/**
 * Calculate buy cost (area under curve from s0 to s1)
 * This is what the contract uses to determine cost
 */
export function calculateBuyCost(currentSupply: number, tokensToBuy: number): number {
  const s0 = BigInt(Math.floor(currentSupply));
  const s1 = s0 + BigInt(Math.floor(tokensToBuy));
  
  const tvl1 = calculateTvlInMist(s1);
  const tvl0 = calculateTvlInMist(s0);
  const costMist = tvl1 - tvl0;
  
  return Number(costMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate sell proceeds (area under curve from s1 to s0)
 */
export function calculateSellProceeds(currentSupply: number, tokensToSell: number): number {
  return calculateBuyCost(currentSupply - tokensToSell, tokensToSell);
}

/**
 * Get initial market cap at launch (supply = 0)
 * Should be ~1000 SUI according to formula
 */
export function getInitialMarketCap(): number {
  // At supply = 0: price = base_price = 0.000001 SUI
  // MC = 0.000001 * 1B tokens = 1000 SUI
  const initialPrice = Number(BASE_PRICE_MIST) / Number(MIST_PER_SUI);
  return initialPrice * TOTAL_SUPPLY;
}

/**
 * Calculate price impact percentage for a buy
 */
export function calculatePriceImpact(currentSupply: number, tokensToBuy: number): number {
  const spotPriceBefore = calculateSpotPrice(currentSupply);
  const spotPriceAfter = calculateSpotPrice(currentSupply + tokensToBuy);
  
  if (spotPriceBefore === 0) return 0;
  
  return ((spotPriceAfter - spotPriceBefore) / spotPriceBefore) * 100;
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toFixed(2);
}
