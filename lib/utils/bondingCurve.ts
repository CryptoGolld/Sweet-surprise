/**
 * Bonding Curve Math Utilities
 * Simulates the quadratic bonding curve formula for price calculations
 */

import { BONDING_CURVE } from '../constants';

// Platform defaults from contract
const M_NUM = 1n;
const M_DEN = 10_000_000_000_000n; // 10^13
const BASE_PRICE_MIST = 1_000n; // 0.000001 SUI (1 micro-SUI)
const MIST_PER_SUI = 1_000_000_000n; // 1e9

/**
 * Calculate spot price at a given supply
 * Formula: price = base_price + (m * supply^2)
 * Where m = M_NUM / M_DEN
 */
export function calculateSpotPrice(supplyInTokens: number): number {
  const supply = BigInt(Math.floor(supplyInTokens));
  
  // price_mist = base_price + (m_num * supply^2) / m_den
  const supplySquared = supply * supply;
  const priceIncrease = (M_NUM * supplySquared) / M_DEN;
  const totalPriceMist = BASE_PRICE_MIST + priceIncrease;
  
  // Convert to SUI
  return Number(totalPriceMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate cost to buy tokens (area under curve)
 * This is the integral of the price function
 */
export function calculateBuyCost(currentSupply: number, tokensToBuy: number): number {
  const s0 = BigInt(Math.floor(currentSupply));
  const s1 = s0 + BigInt(Math.floor(tokensToBuy));
  
  // Integral: cost = base_price * delta_supply + (m_num / (3 * m_den)) * (s1^3 - s0^3)
  const deltaSupply = s1 - s0;
  const baseCost = BASE_PRICE_MIST * deltaSupply;
  
  const s1Cubed = s1 * s1 * s1;
  const s0Cubed = s0 * s0 * s0;
  const cubicTerm = (M_NUM * (s1Cubed - s0Cubed)) / (3n * M_DEN);
  
  const totalCostMist = baseCost + cubicTerm;
  
  // Convert to SUI
  return Number(totalCostMist) / Number(MIST_PER_SUI);
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
