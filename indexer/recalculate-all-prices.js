/**
 * Recalculate All Token Prices - One-Time Fix Script
 * 
 * This script recalculates prices and market caps for ALL tokens in the database
 * using the correct formulas (without the /1e9 bug).
 * 
 * Run once after deploying the indexer fix:
 * node indexer/recalculate-all-prices.js
 */

import { SuiClient } from '@mysten/sui/client';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration
const SUI_RPC_URL = process.env.SUI_RPC_URL;
const db = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});
const client = new SuiClient({ url: SUI_RPC_URL });

// Constants (MUST match contract)
const M_NUM = 1n;
const M_DEN = 10593721631205n;
const BASE_PRICE_MIST = 1_000n;
const MIST_PER_SUI = 1_000_000_000n;
const TOTAL_SUPPLY = 1_000_000_000;

/**
 * Calculate spot price from supply (CORRECT formula)
 */
function calculateSpotPrice(supplyInWholeTokens) {
  const supply = BigInt(Math.floor(supplyInWholeTokens));
  const supplySquared = supply * supply;
  const priceIncrease = (M_NUM * supplySquared) / M_DEN;
  const totalPriceMist = BASE_PRICE_MIST + priceIncrease;
  return Number(totalPriceMist) / Number(MIST_PER_SUI);
}

/**
 * Main recalculation function
 */
async function recalculateAllPrices() {
  console.log('🔧 Starting price recalculation for all tokens...\n');
  
  try {
    // Get all tokens from database
    const tokensResult = await db.query(
      'SELECT id, coin_type, ticker, curve_supply, curve_balance FROM tokens ORDER BY created_at ASC'
    );
    
    const tokens = tokensResult.rows;
    console.log(`📊 Found ${tokens.length} tokens to recalculate\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const token of tokens) {
      try {
        const { id, coin_type, ticker, curve_supply } = token;
        
        // Fetch latest curve state from blockchain
        console.log(`Processing ${ticker} (${id.slice(0, 10)}...)...`);
        
        const curveObject = await client.getObject({
          id: id,
          options: { showContent: true },
        });
        
        if (curveObject.data?.content?.dataType !== 'moveObject') {
          console.log(`  ⚠️  Skipped: Invalid curve object`);
          skipped++;
          continue;
        }
        
        const fields = curveObject.data.content.fields;
        const freshCurveSupply = fields.token_supply || '0';
        const freshCurveBalance = fields.sui_reserve || '0';
        
        // CRITICAL: curve_supply is ALREADY in whole tokens (not mist!)
        const curveSupply = Number(freshCurveSupply);
        
        // Calculate CORRECT current price from bonding curve
        const currentPrice = calculateSpotPrice(curveSupply);
        
        // Calculate market cap and FDV
        const marketCap = currentPrice * TOTAL_SUPPLY;
        const fullyDilutedValuation = marketCap; // Same for bonding curve tokens
        
        // Get 24h stats (keep existing if available)
        const statsResult = await db.query(
          `SELECT volume_24h_sui, price_change_24h, all_time_high_sui, all_time_low_sui, 
                  all_time_high_at, all_time_low_at, last_trade_at
           FROM tokens WHERE coin_type = $1`,
          [coin_type]
        );
        
        const stats = statsResult.rows[0] || {};
        
        // Get ATH/ATL from trades if not set
        let ath = stats.all_time_high_sui || currentPrice;
        let athAt = stats.all_time_high_at;
        let atl = stats.all_time_low_sui || currentPrice;
        let atlAt = stats.all_time_low_at;
        
        if (!stats.all_time_high_sui) {
          const athResult = await db.query(
            `SELECT MAX(price_per_token) as ath, 
                    (SELECT timestamp FROM trades WHERE coin_type = $1 ORDER BY price_per_token DESC LIMIT 1) as ath_at
             FROM trades WHERE coin_type = $1`,
            [coin_type]
          );
          if (athResult.rows[0]?.ath) {
            ath = parseFloat(athResult.rows[0].ath);
            athAt = athResult.rows[0].ath_at;
          }
        }
        
        if (!stats.all_time_low_sui) {
          const atlResult = await db.query(
            `SELECT MIN(price_per_token) as atl,
                    (SELECT timestamp FROM trades WHERE coin_type = $1 ORDER BY price_per_token ASC LIMIT 1) as atl_at
             FROM trades WHERE coin_type = $1`,
            [coin_type]
          );
          if (atlResult.rows[0]?.atl) {
            atl = parseFloat(atlResult.rows[0].atl);
            atlAt = atlResult.rows[0].atl_at;
          }
        }
        
        // Update database with correct values
        await db.query(
          `UPDATE tokens 
           SET 
             curve_supply = $1,
             curve_balance = $2,
             current_price_sui = $3,
             market_cap_sui = $4,
             fully_diluted_valuation_sui = $5,
             all_time_high_sui = $6,
             all_time_high_at = $7,
             all_time_low_sui = $8,
             all_time_low_at = $9,
             updated_at = NOW()
           WHERE coin_type = $10`,
          [
            freshCurveSupply,
            freshCurveBalance,
            currentPrice,
            marketCap,
            fullyDilutedValuation,
            ath,
            athAt,
            atl,
            atlAt,
            coin_type
          ]
        );
        
        console.log(`  ✅ Updated: Supply=${(curveSupply/1e6).toFixed(1)}M, Price=${currentPrice.toFixed(9)} SUI, MC=${marketCap.toFixed(0)} SUI`);
        updated++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Error processing ${token.ticker}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Recalculation Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Updated: ${updated} tokens`);
    console.log(`   Skipped: ${skipped} tokens`);
    console.log(`   Errors:  ${errors} tokens`);
    console.log('='.repeat(80));
    console.log('\n🎉 All token prices have been recalculated with the correct formula!');
    console.log('💡 The indexer will now continue updating prices as new trades happen.\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  await db.end();
  process.exit(0);
});

// Run the recalculation
console.log('🚀 Price Recalculation Script\n');
console.log('This will recalculate prices for ALL tokens using the correct formula.');
console.log('The indexer should be stopped while running this script.\n');

recalculateAllPrices()
  .then(() => {
    console.log('✅ Done! You can now restart the indexer.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
