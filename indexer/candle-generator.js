import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const db = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 30000, // 30 second query timeout
});

console.log('📊 Starting Candle Generator Bot...');
console.log('⏱️  Generates OHLCV candles every 60 seconds');

// Clean up old candles (keep only 7 days)
async function cleanupOldCandles() {
  try {
    const result = await db.query(
      `DELETE FROM price_snapshots WHERE timestamp < NOW() - INTERVAL '7 days'`
    );
    if (result.rowCount > 0) {
      console.log(`🧹 Deleted ${result.rowCount} old candles (older than 7 days)`);
    }
  } catch (error) {
    console.error('❌ Failed to cleanup old candles:', error.message);
  }
}

// Generate OHLCV candles from trades
async function generateCandles() {
  try {
    console.log('\n📊 Generating candles...');
    const startTime = Date.now();
    
    // Get all tokens
    const tokensResult = await db.query('SELECT coin_type, created_at FROM tokens');
    
    if (tokensResult.rows.length === 0) {
      console.log('   No tokens found');
      return;
    }
    
    console.log(`   Processing ${tokensResult.rows.length} tokens...`);
    let tokensProcessed = 0;
    let candlesGenerated = 0;

    for (const { coin_type, created_at } of tokensResult.rows) {
      // Get all trades for this token
      const tradesResult = await db.query(
        `SELECT timestamp, price_per_token, CAST(token_amount AS NUMERIC) as token_amount
         FROM trades
         WHERE coin_type = $1
         ORDER BY timestamp ASC`,
        [coin_type]
      );

      if (tradesResult.rows.length === 0) {
        continue; // Skip tokens with no trades
      }

      const trades = tradesResult.rows;
      
      // Only generate candles for the last 24 hours
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endTime = now;
      
      // Get price at start of period
      let currentPrice = parseFloat(trades[0].price_per_token);
      if (trades.length > 0) {
        const recentTrades = trades.filter(t => new Date(t.timestamp) > startTime);
        if (recentTrades.length > 0) {
          currentPrice = parseFloat(recentTrades[0].price_per_token);
        }
      }
      
      let tradeIndex = 0;

      // Generate candles for every minute in last 24 hours
      const candles = [];
      for (let time = new Date(startTime); time <= endTime; time = new Date(time.getTime() + 60000)) {
        const candleStart = new Date(time);
        const candleEnd = new Date(time.getTime() + 60000);

        // Find trades in this minute
        const candleTrades = [];
        while (tradeIndex < trades.length) {
          const tradeTime = new Date(trades[tradeIndex].timestamp);
          if (tradeTime >= candleStart && tradeTime < candleEnd) {
            candleTrades.push(trades[tradeIndex]);
            tradeIndex++;
          } else if (tradeTime >= candleEnd) {
            break;
          } else {
            tradeIndex++;
          }
        }

        let open, high, low, close, volume;
        if (candleTrades.length > 0) {
          // Candle with trades
          const prices = candleTrades.map(t => parseFloat(t.price_per_token));
          open = prices[0];
          high = Math.max(...prices);
          low = Math.min(...prices);
          close = prices[prices.length - 1];
          volume = candleTrades.reduce((sum, t) => sum + parseFloat(t.token_amount), 0);
          currentPrice = close;
        } else {
          // No trades - flat candle at last price
          open = high = low = close = currentPrice;
          volume = 0;
        }

        candles.push({ time: candleStart, open, high, low, close, volume });
      }

      // Batch insert candles
      for (const candle of candles) {
        await db.query(
          `INSERT INTO price_snapshots (coin_type, timestamp, open, high, low, close, volume)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (coin_type, timestamp) DO UPDATE SET
             open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
             close = EXCLUDED.close, volume = EXCLUDED.volume`,
          [coin_type, candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume]
        );
      }
      
      tokensProcessed++;
      candlesGenerated += candles.length;
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Generated ${candlesGenerated} candles for ${tokensProcessed} tokens in ${duration}s`);
    
  } catch (error) {
    console.error('❌ Failed to generate candles:', error.message);
  }
}

// Main loop - generate candles every 60 seconds
async function main() {
  console.log('✅ Candle bot started!\n');
  
  // Clean up old candles on start
  await cleanupOldCandles();
  
  // Generate candles immediately on start
  await generateCandles();
  
  // Then generate every 60 seconds
  setInterval(async () => {
    await generateCandles();
  }, 60000); // 60 seconds
  
  // Clean up old candles every hour
  setInterval(async () => {
    await cleanupOldCandles();
  }, 60 * 60 * 1000); // 1 hour
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down candle generator...');
  await db.end();
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
