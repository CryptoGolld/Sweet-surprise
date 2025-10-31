/**
 * Bonding Curve Math Utilities
 * EXACT implementation matching the Move contract
 * 
 * CRITICAL: The contract stores token_supply in WHOLE TOKENS (not mist)
 * See bonding_curve.move line 215-217 for proof
 */

import { BONDING_CURVE } from '../constants';

// Platform defaults from contract (EXACT values from platform_config.move)
const M_NUM = 1n;
const M_DEN = 10593721631205n; // From contract - mathematically correct for 737M tokens @ 13,333 SUI
const BASE_PRICE_MIST = 1_000n; // 0.000001 SUI (1 micro-SUI)
const MIST_PER_SUI = 1_000_000_000n; // 1e9

/**
 * Calculate spot price at a given supply
 * Formula: price = base_price + (m * supply^2)
 * Where m = M_NUM / M_DEN
 * 
 * IMPORTANT: supplyInTokens MUST be in whole tokens
 * If you're getting supply from blockchain, it's already in whole tokens!
 */
export function calculateSpotPrice(supplyInTokens: number): number {
  const supply = BigInt(Math.floor(supplyInTokens));
  
  // p(s) = base_price_mist + (m_num * s^2) / m_den
  // This EXACTLY matches bonding_curve.move spot_price_u128()
  const supplySquared = supply * supply;
  const priceIncrease = (M_NUM * supplySquared) / M_DEN;
  const totalPriceMist = BASE_PRICE_MIST + priceIncrease;
  
  // Convert to SUI
  return Number(totalPriceMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate TVL (total SUI raised) at a given supply
 * This is the INTEGRAL of the price function
 * Formula: TVL(s) = base_price * s + (m_num / (3 * m_den)) * s?
 */
function calculateTVL(supply: number): number {
  const s = BigInt(Math.floor(supply));
  const baseCost = BASE_PRICE_MIST * s;
  const sCubed = s * s * s;
  const cubicTerm = (M_NUM * sCubed) / (3n * M_DEN);
  const totalMist = baseCost + cubicTerm;
  return Number(totalMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate cost to buy tokens (area under curve)
 * This is the integral of the price function
 */
export function calculateBuyCost(currentSupply: number, tokensToBuy: number): number {
  const s0 = Math.floor(currentSupply);
  const s1 = s0 + Math.floor(tokensToBuy);
  
  // Cost = TVL(s1) - TVL(s0)
  return calculateTVL(s1) - calculateTVL(s0);
}

/**
 * Calculate how many tokens you get for X SUI
 */
export function calculateTokensOut(currentSupply: number, suiIn: number): number {
  // Binary search to find how many tokens we can buy with suiIn
  let low = 0;
  let high = BONDING_CURVE.MAX_CURVE_SUPPLY - currentSupply;
  let bestTokens = 0;
  
  for (let i = 0; i < 100; i++) {
    const mid = Math.floor((low + high) / 2);
    const cost = calculateBuyCost(currentSupply, mid);
    
    if (Math.abs(cost - suiIn) < 0.000001) {
      return mid;
    }
    
    if (cost < suiIn) {
      bestTokens = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return bestTokens;
}

/**
 * Calculate how much SUI you get for selling Y tokens
 */
export function calculateSuiOut(currentSupply: number, tokensToSell: number): number {
  // Selling is just the negative of buying (going backwards on the curve)
  const newSupply = currentSupply - tokensToSell;
  return calculateBuyCost(newSupply, tokensToSell);
}

/**
 * Calculate virtual market cap at any supply
 * MC = spot_price * total_supply
 */
export function calculateMarketCap(currentSupply: number): number {
  const spotPrice = calculateSpotPrice(currentSupply);
  return spotPrice * BONDING_CURVE.TOTAL_SUPPLY;
}

/**
 * Calculate initial (virtual) market cap at launch (supply = 0)
 * Should be ~1000 SUI according to formula
 */
export function getInitialMarketCap(): number {
  // At supply = 0: price = base_price = 0.000001 SUI
  // MC = 0.000001 * 1B tokens = 1000 SUI
  const initialPrice = Number(BASE_PRICE_MIST) / Number(MIST_PER_SUI);
  return initialPrice * BONDING_CURVE.TOTAL_SUPPLY;
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

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(currentSupply: number, tokensToBuy: number): number {
  const spotPriceBefore = calculateSpotPrice(currentSupply);
  const spotPriceAfter = calculateSpotPrice(currentSupply + tokensToBuy);
  
  if (spotPriceBefore === 0) return 0;
  
  return ((spotPriceAfter - spotPriceBefore) / spotPriceBefore) * 100;
}
