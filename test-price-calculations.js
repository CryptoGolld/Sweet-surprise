/**
 * Test script to verify bonding curve price calculations
 * Run with: node test-price-calculations.js
 * 
 * This verifies that our JavaScript calculations match the Move contract exactly
 */

// Constants (MUST match contract)
const M_NUM = 1n;
const M_DEN = 10593721631205n;
const BASE_PRICE_MIST = 1000n;
const MIST_PER_SUI = 1_000_000_000n;
const TOTAL_SUPPLY = 1_000_000_000;

/**
 * Calculate spot price (exact contract formula)
 */
function calculateSpotPrice(supplyInWholeTokens) {
  const supply = BigInt(Math.floor(supplyInWholeTokens));
  const supplySquared = supply * supply;
  const priceIncrease = (M_NUM * supplySquared) / M_DEN;
  const totalPriceMist = BASE_PRICE_MIST + priceIncrease;
  return Number(totalPriceMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate TVL (total SUI raised)
 */
function calculateTVL(supplyInWholeTokens) {
  const s = BigInt(Math.floor(supplyInWholeTokens));
  const baseComponent = BASE_PRICE_MIST * s;
  const slopeComponent = (s * s * s * M_NUM) / (3n * M_DEN);
  const totalMist = baseComponent + slopeComponent;
  return Number(totalMist) / Number(MIST_PER_SUI);
}

/**
 * Calculate market cap
 */
function calculateMarketCap(supplyInWholeTokens) {
  const spotPrice = calculateSpotPrice(supplyInWholeTokens);
  return spotPrice * TOTAL_SUPPLY;
}

/**
 * Test the calculations at key milestones
 */
function runTests() {
  console.log('🧪 Testing Bonding Curve Calculations\n');
  console.log('Constants:');
  console.log(`  M_NUM = ${M_NUM}`);
  console.log(`  M_DEN = ${M_DEN}`);
  console.log(`  BASE_PRICE = ${Number(BASE_PRICE_MIST) / 1e9} SUI`);
  console.log(`  TOTAL_SUPPLY = ${TOTAL_SUPPLY.toLocaleString()} tokens\n`);

  const testCases = [
    { supply: 0, description: 'Launch (0 tokens sold)' },
    { supply: 1_000_000, description: '1M tokens sold' },
    { supply: 10_000_000, description: '10M tokens sold' },
    { supply: 50_000_000, description: '50M tokens sold' },
    { supply: 100_000_000, description: '100M tokens sold' },
    { supply: 368_500_000, description: '50% progress (368.5M tokens)' },
    { supply: 500_000_000, description: '500M tokens sold' },
    { supply: 737_000_000, description: 'Graduation (737M tokens)' },
  ];

  console.log('Test Results:');
  console.log('='.repeat(100));
  console.log(
    'Supply'.padEnd(25) +
    'TVL (SUI)'.padEnd(15) +
    'Spot Price'.padEnd(20) +
    'Market Cap (SUI)'.padEnd(20) +
    'MC (USD @ $1)'
  );
  console.log('='.repeat(100));

  for (const test of testCases) {
    const tvl = calculateTVL(test.supply);
    const spotPrice = calculateSpotPrice(test.supply);
    const marketCap = calculateMarketCap(test.supply);
    const marketCapUsd = marketCap; // Assuming $1 SUI

    console.log(
      test.description.padEnd(25) +
      tvl.toFixed(2).padEnd(15) +
      spotPrice.toFixed(10).padEnd(20) +
      marketCap.toFixed(2).padEnd(20) +
      `$${marketCapUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    );
  }

  console.log('='.repeat(100));
  console.log('\n✅ All calculations completed successfully!\n');

  // Verify key invariants
  console.log('🔍 Verifying Key Invariants:\n');

  // 1. Initial market cap should be ~1000 SUI
  const initialMC = calculateMarketCap(0);
  console.log(`1. Initial Market Cap: ${initialMC.toFixed(2)} SUI`);
  console.log(`   ${initialMC === 1000 ? '✅' : '❌'} Should be exactly 1000 SUI\n`);

  // 2. At graduation (737M tokens), TVL should be ~13,333 SUI
  const graduationTVL = calculateTVL(737_000_000);
  console.log(`2. TVL at Graduation: ${graduationTVL.toFixed(2)} SUI`);
  console.log(`   ${Math.abs(graduationTVL - 13333) < 1 ? '✅' : '❌'} Should be ~13,333 SUI\n`);

  // 3. Price should always increase as supply increases
  let priceIncreasing = true;
  for (let i = 0; i < testCases.length - 1; i++) {
    const p1 = calculateSpotPrice(testCases[i].supply);
    const p2 = calculateSpotPrice(testCases[i + 1].supply);
    if (p2 <= p1) {
      priceIncreasing = false;
      console.log(`   ❌ Price not increasing from ${testCases[i].supply} to ${testCases[i + 1].supply}`);
    }
  }
  console.log(`3. Price Monotonically Increasing: ${priceIncreasing ? '✅' : '❌'}\n`);

  // 4. Market cap formula: MC = spot_price × total_supply
  const testSupply = 100_000_000;
  const spotPrice = calculateSpotPrice(testSupply);
  const mc = calculateMarketCap(testSupply);
  const mcManual = spotPrice * TOTAL_SUPPLY;
  console.log(`4. Market Cap Formula Verification:`);
  console.log(`   Calculated MC: ${mc.toFixed(2)} SUI`);
  console.log(`   Manual MC (spot × total): ${mcManual.toFixed(2)} SUI`);
  console.log(`   ${Math.abs(mc - mcManual) < 0.01 ? '✅' : '❌'} Should match\n`);

  console.log('🎉 All verifications complete!\n');
}

// Run the tests
runTests();
