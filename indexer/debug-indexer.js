/**
 * Debug script to check indexer performance and data
 */

import pg from 'pg';
import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const client = new SuiClient({ url: process.env.SUI_RPC_URL });

async function debugIndexer() {
  console.log('🔍 Indexer Debugging Report\n');
  console.log('═══════════════════════════════════════\n');
  
  try {
    // 1. Check database connectivity
    console.log('1️⃣ DATABASE CONNECTION');
    const start = Date.now();
    await db.query('SELECT NOW()');
    console.log(`   ✅ Connected (${Date.now() - start}ms)\n`);
    
    // 2. Check RPC connectivity and speed
    console.log('2️⃣ RPC CONNECTION');
    const rpcStart = Date.now();
    await client.getLatestCheckpointSequenceNumber();
    console.log(`   ✅ Connected (${Date.now() - rpcStart}ms)`);
    console.log(`   📍 URL: ${process.env.SUI_RPC_URL}\n`);
    
    // 3. Check tokens in database
    console.log('3️⃣ TOKENS IN DATABASE');
    const tokensResult = await db.query('SELECT COUNT(*) FROM tokens');
    console.log(`   📦 Total tokens: ${tokensResult.rows[0].count}\n`);
    
    // 4. Check trades
    console.log('4️⃣ TRADES');
    const tradesResult = await db.query('SELECT COUNT(*) FROM trades');
    const recentTrades = await db.query(
      "SELECT COUNT(*) FROM trades WHERE timestamp > NOW() - INTERVAL '1 hour'"
    );
    const latestTrade = await db.query(
      'SELECT timestamp, trade_type, coin_type FROM trades ORDER BY timestamp DESC LIMIT 1'
    );
    
    console.log(`   📊 Total trades: ${tradesResult.rows[0].count}`);
    console.log(`   ⏱️  Last hour: ${recentTrades.rows[0].count}`);
    if (latestTrade.rows.length > 0) {
      const trade = latestTrade.rows[0];
      const ageMinutes = Math.floor((Date.now() - new Date(trade.timestamp).getTime()) / 60000);
      console.log(`   🕐 Latest trade: ${ageMinutes} minutes ago (${trade.trade_type})\n`);
    } else {
      console.log(`   ⚠️  No trades found\n`);
    }
    
    // 5. Check candles
    console.log('5️⃣ PRICE CANDLES');
    const candlesResult = await db.query('SELECT COUNT(*) FROM price_snapshots');
    const recentCandles = await db.query(
      "SELECT COUNT(*) FROM price_snapshots WHERE timestamp > NOW() - INTERVAL '1 hour'"
    );
    const candlesByToken = await db.query(
      `SELECT coin_type, COUNT(*) as candle_count, MAX(timestamp) as latest
       FROM price_snapshots 
       GROUP BY coin_type 
       ORDER BY candle_count DESC 
       LIMIT 5`
    );
    
    console.log(`   📈 Total candles: ${candlesResult.rows[0].count}`);
    console.log(`   ⏱️  Last hour: ${recentCandles.rows[0].count}`);
    
    if (candlesByToken.rows.length > 0) {
      console.log(`   🔝 Top tokens with candles:`);
      candlesByToken.rows.forEach(row => {
        const ticker = row.coin_type.split('::').pop();
        const ageMinutes = Math.floor((Date.now() - new Date(row.latest).getTime()) / 60000);
        console.log(`      ${ticker}: ${row.candle_count} candles (latest: ${ageMinutes}min ago)`);
      });
    } else {
      console.log(`   ⚠️  NO CANDLES FOUND - This is why charts are empty!`);
    }
    console.log('');
    
    // 6. Check indexer state
    console.log('6️⃣ INDEXER STATE');
    const stateResult = await db.query('SELECT * FROM indexer_state WHERE id = 1');
    if (stateResult.rows.length > 0) {
      const state = stateResult.rows[0];
      const lastUpdate = new Date(state.updated_at);
      const ageSeconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
      console.log(`   📅 Last update: ${ageSeconds} seconds ago`);
      console.log(`   🔢 Last timestamp: ${state.last_timestamp}`);
    }
    console.log('');
    
    // 7. Check for graduated tokens
    console.log('7️⃣ GRADUATED TOKENS');
    const graduatedResult = await db.query(
      'SELECT ticker, graduated, cetus_pool_address FROM tokens WHERE graduated = true'
    );
    if (graduatedResult.rows.length > 0) {
      console.log(`   🎓 Graduated tokens: ${graduatedResult.rows.length}`);
      graduatedResult.rows.forEach(row => {
        console.log(`      ${row.ticker}: ${row.cetus_pool_address ? 'Has pool ✅' : 'No pool ⚠️'}`);
      });
    } else {
      console.log(`   📭 No graduated tokens yet`);
    }
    console.log('');
    
    // 8. Performance test
    console.log('8️⃣ PERFORMANCE TESTS');
    
    // Test query speed
    const queryStart = Date.now();
    await db.query('SELECT COUNT(*) FROM trades');
    console.log(`   💾 Database query: ${Date.now() - queryStart}ms`);
    
    // Test RPC speed
    const rpcStart2 = Date.now();
    await client.getLatestCheckpointSequenceNumber();
    console.log(`   🌐 RPC call: ${Date.now() - rpcStart2}ms`);
    
    // Test event query speed
    const eventStart = Date.now();
    await client.queryEvents({
      query: { MoveEventType: `${process.env.PLATFORM_PACKAGE}::bonding_curve::Bought` },
      limit: 10,
      order: 'descending',
    });
    console.log(`   🔍 Event query: ${Date.now() - eventStart}ms`);
    console.log('');
    
    // 9. Diagnosis
    console.log('9️⃣ DIAGNOSIS');
    
    if (candlesResult.rows[0].count === '0') {
      console.log(`   ❌ PROBLEM: No candles generated - charts will be empty`);
      console.log(`   💡 FIX: Run "node regenerate-candles.js"`);
    } else if (recentCandles.rows[0].count === '0') {
      console.log(`   ⚠️  WARNING: No recent candles - generation might be stuck`);
      console.log(`   💡 FIX: Check if candle generation is running`);
    } else {
      console.log(`   ✅ Candles are being generated`);
    }
    
    const rpcTime = Date.now() - rpcStart;
    if (rpcTime > 1000) {
      console.log(`   ⚠️  WARNING: RPC is slow (${rpcTime}ms)`);
      console.log(`   💡 FIX: Consider using a faster RPC provider`);
    } else {
      console.log(`   ✅ RPC speed is good (${rpcTime}ms)`);
    }
    
    if (latestTrade.rows.length > 0) {
      const ageMinutes = Math.floor((Date.now() - new Date(latestTrade.rows[0].timestamp).getTime()) / 60000);
      if (ageMinutes > 5) {
        console.log(`   ⚠️  WARNING: No trades in last ${ageMinutes} minutes`);
        console.log(`   💡 This might be normal if no one is trading`);
      } else {
        console.log(`   ✅ Recent trading activity (${ageMinutes}min ago)`);
      }
    }
    
    console.log('\n═══════════════════════════════════════\n');
    console.log('✅ Debug report complete!\n');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
    console.error(error.stack);
  } finally {
    await db.end();
    process.exit(0);
  }
}

debugIndexer();
