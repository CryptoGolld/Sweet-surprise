/**
 * Fix Chart Generation
 * 
 * Charts should show continuous candles even when there's no trading activity.
 * When no trades occur, the candle should be flat (O=H=L=C=last_close).
 * 
 * This script modifies the generateCandles function to fill forward prices.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function generateCandlesWithFillForward() {
  console.log('📊 Generating candles with fill-forward logic...\n');

  try {
    // Get all tokens
    const tokensResult = await db.query('SELECT DISTINCT coin_type FROM tokens');
    const tokens = tokensResult.rows;

    console.log(`Found ${tokens.length} tokens\n`);

    for (const { coin_type } of tokens) {
      console.log(`📈 Processing: ${coin_type.split('::').pop()}`);

      // Get all trades for this token, ordered by time
      const tradesResult = await db.query(
        `SELECT 
          timestamp,
          price_sui_per_token,
          CAST(token_amount AS NUMERIC) as token_amount,
          type
         FROM trades
         WHERE coin_type = $1
         ORDER BY timestamp ASC`,
        [coin_type]
      );

      const trades = tradesResult.rows;

      if (trades.length === 0) {
        console.log('   ⚠️  No trades found, skipping\n');
        continue;
      }

      // Get token creation time
      const tokenResult = await db.query(
        'SELECT created_at FROM tokens WHERE coin_type = $1',
        [coin_type]
      );
      const createdAt = tokenResult.rows[0]?.created_at;

      // Generate 1-minute candles from creation to now
      const startTime = new Date(createdAt || trades[0].timestamp);
      const endTime = new Date();
      const candles = [];

      let currentPrice = parseFloat(trades[0].price_sui_per_token);
      let tradeIndex = 0;

      // Generate candles for every minute
      for (let time = new Date(startTime); time <= endTime; time.setMinutes(time.getMinutes() + 1)) {
        const candleStart = new Date(time);
        const candleEnd = new Date(time.getTime() + 60000); // +1 minute

        // Find all trades in this candle period
        const candleTrades = [];
        while (tradeIndex < trades.length) {
          const trade = trades[tradeIndex];
          const tradeTime = new Date(trade.timestamp);
          
          if (tradeTime >= candleStart && tradeTime < candleEnd) {
            candleTrades.push(trade);
            tradeIndex++;
          } else if (tradeTime >= candleEnd) {
            break; // Move to next candle
          } else {
            tradeIndex++;
          }
        }

        let open, high, low, close, volume;

        if (candleTrades.length > 0) {
          // Candle with trades
          const prices = candleTrades.map(t => parseFloat(t.price_sui_per_token));
          open = prices[0];
          high = Math.max(...prices);
          low = Math.min(...prices);
          close = prices[prices.length - 1];
          volume = candleTrades.reduce((sum, t) => sum + parseFloat(t.token_amount), 0);
          
          currentPrice = close; // Update current price
        } else {
          // No trades - flat candle at last known price
          open = currentPrice;
          high = currentPrice;
          low = currentPrice;
          close = currentPrice;
          volume = 0;
        }

        candles.push({
          timestamp: candleStart,
          open,
          high,
          low,
          close,
          volume,
        });
      }

      // Clear old candles
      await db.query('DELETE FROM price_snapshots WHERE coin_type = $1', [coin_type]);

      // Insert new candles
      for (const candle of candles) {
        await db.query(
          `INSERT INTO price_snapshots (coin_type, timestamp, open, high, low, close, volume)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (coin_type, timestamp) DO UPDATE SET
             open = EXCLUDED.open,
             high = EXCLUDED.high,
             low = EXCLUDED.low,
             close = EXCLUDED.close,
             volume = EXCLUDED.volume`,
          [coin_type, candle.timestamp, candle.open, candle.high, candle.low, candle.close, candle.volume]
        );
      }

      console.log(`   ✅ Generated ${candles.length} candles (with fill-forward)\n`);
    }

    console.log('✅ Chart generation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.end();
  }
}

generateCandlesWithFillForward().catch(console.error);
