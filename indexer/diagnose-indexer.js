#!/usr/bin/env node

/**
 * Diagnose why indexer is not picking up new trades
 */

import { SuiClient } from '@mysten/sui/client';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const client = new SuiClient({ url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443' });
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const PLATFORM_PACKAGE = process.env.PLATFORM_PACKAGE || '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348';

async function diagnose() {
  try {
    console.log('🔍 INDEXER DIAGNOSTIC\n');
    
    // 1. Check indexer state
    console.log('1. Checking indexer_state table...\n');
    const stateResult = await db.query('SELECT * FROM indexer_state WHERE id = 1');
    if (stateResult.rows.length === 0) {
      console.log('❌ No indexer_state found! Indexer may not be initialized.\n');
    } else {
      const state = stateResult.rows[0];
      const lastTimestamp = parseInt(state.last_timestamp);
      const lastDate = new Date(lastTimestamp);
      const hoursAgo = Math.floor((Date.now() - lastTimestamp) / 1000 / 60 / 60);
      
      console.log(`   last_timestamp: ${lastTimestamp}`);
      console.log(`   Date: ${lastDate.toISOString()}`);
      console.log(`   Hours ago: ${hoursAgo}`);
      console.log(`   Historical sync complete: ${state.historical_sync_complete}`);
      console.log('');
    }
    
    // 2. Check recent blockchain events
    console.log('2. Checking recent Buy events on blockchain...\n');
    const buyEvents = await client.queryEvents({
      query: { MoveEventType: `${PLATFORM_PACKAGE}::bonding_curve::Bought` },
      limit: 10,
      order: 'descending'
    });
    
    console.log(`   Found ${buyEvents.data.length} recent Buy events:`);
    buyEvents.data.forEach((event, i) => {
      const timestamp = parseInt(event.timestampMs);
      const date = new Date(timestamp);
      const hoursAgo = Math.floor((Date.now() - timestamp) / 1000 / 60 / 60);
      console.log(`   ${i+1}. ${date.toISOString()} (${hoursAgo}h ago) - TX: ${event.id.txDigest.slice(0, 20)}...`);
    });
    console.log('');
    
    // 3. Check recent trades in database
    console.log('3. Checking recent trades in database...\n');
    const tradesResult = await db.query(`
      SELECT coin_type, timestamp, trade_type, tx_digest
      FROM trades
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    console.log(`   Found ${tradesResult.rows.length} recent trades in DB:`);
    tradesResult.rows.forEach((trade, i) => {
      const date = new Date(trade.timestamp);
      const hoursAgo = Math.floor((Date.now() - date.getTime()) / 1000 / 60 / 60);
      const ticker = trade.coin_type.split('::').pop();
      console.log(`   ${i+1}. ${date.toISOString()} (${hoursAgo}h ago) - ${trade.trade_type} ${ticker}`);
    });
    console.log('');
    
    // 4. Compare timestamps
    console.log('4. Analysis:\n');
    const stateTimestamp = parseInt(stateResult.rows[0]?.last_timestamp || 0);
    const latestBlockchainEvent = buyEvents.data[0];
    const latestBlockchainTimestamp = latestBlockchainEvent ? parseInt(latestBlockchainEvent.timestampMs) : 0;
    const latestDbTrade = tradesResult.rows[0];
    const latestDbTimestamp = latestDbTrade ? new Date(latestDbTrade.timestamp).getTime() : 0;
    
    console.log(`   Indexer state timestamp: ${new Date(stateTimestamp).toISOString()}`);
    console.log(`   Latest blockchain event: ${new Date(latestBlockchainTimestamp).toISOString()}`);
    console.log(`   Latest DB trade:         ${new Date(latestDbTimestamp).toISOString()}`);
    console.log('');
    
    if (latestBlockchainTimestamp > stateTimestamp) {
      const missedEvents = Math.floor((latestBlockchainTimestamp - stateTimestamp) / 1000 / 60);
      console.log(`   ⚠️  PROBLEM FOUND!`);
      console.log(`   Indexer is ${missedEvents} minutes behind!`);
      console.log(`   It's missing events from the last ${Math.floor(missedEvents / 60)} hours.`);
      console.log('');
      console.log(`   🔧 FIX: The indexer needs to catch up or be reset.`);
      console.log('');
    } else {
      console.log(`   ✅ Indexer state looks current.`);
      console.log(`   If trades are still missing, the indexer may be crashing during processing.`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

diagnose();
