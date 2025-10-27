/**
 * Regenerate all chart candles from existing trades
 * Run this script to populate price_snapshots table
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function regenerateCandles() {
  try {
    console.log('🔄 Regenerating chart candles from all trades...\n');
    
    // Get all coin types with trades
    const coinsResult = await db.query(
      `SELECT DISTINCT coin_type FROM trades ORDER BY coin_type`
    );
    
    console.log(`Found ${coinsResult.rows.length} tokens with trades\n`);
    
    // Clear existing candles
    console.log('🗑️  Clearing old candles...');
    await db.query('TRUNCATE price_snapshots');
    console.log('✅ Old candles cleared\n');
    
    let totalCandles = 0;
    
    // Generate candles for each token
    for (const row of coinsResult.rows) {
      const coinType = row.coin_type;
      const ticker = coinType.split('::').pop();
      
      console.log(`📊 Generating candles for ${ticker}...`);
      
      // Generate 1-minute candles from all trades
      const result = await db.query(
        `WITH candle_data AS (
          SELECT 
            date_trunc('minute', timestamp) as candle_time,
            (array_agg(price_per_token ORDER BY timestamp ASC))[1] as open,
            MAX(price_per_token) as high,
            MIN(price_per_token) as low,
            (array_agg(price_per_token ORDER BY timestamp DESC))[1] as close,
            SUM(CAST(token_amount AS NUMERIC)) as volume
          FROM trades
          WHERE coin_type = $1
          GROUP BY candle_time
        )
        INSERT INTO price_snapshots (coin_type, timestamp, open, high, low, close, volume)
        SELECT $1, candle_time, open, high, low, close, volume
        FROM candle_data
        ON CONFLICT (coin_type, timestamp) 
        DO UPDATE SET 
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume
        RETURNING *`,
        [coinType]
      );
      
      const candleCount = result.rowCount;
      totalCandles += candleCount;
      console.log(`   ✅ Generated ${candleCount} candles`);
    }
    
    console.log(`\n🎉 Complete! Generated ${totalCandles} total candles for ${coinsResult.rows.length} tokens`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await db.end();
  }
}

regenerateCandles();
