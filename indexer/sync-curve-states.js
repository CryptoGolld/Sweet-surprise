#!/usr/bin/env node

/**
 * Sync all curve states from blockchain to database
 * Run this to fix outdated curve_supply values
 */

import { SuiClient } from '@mysten/sui/client';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const client = new SuiClient({ url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443' });
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function syncAllCurveStates() {
  try {
    console.log('🔄 Starting curve state sync from blockchain...\n');
    
    // Get all tokens from database
    const result = await db.query(`
      SELECT id, coin_type, ticker, curve_supply 
      FROM tokens 
      WHERE graduated = FALSE
      ORDER BY ticker
    `);
    
    console.log(`Found ${result.rows.length} tokens to sync\n`);
    
    let updated = 0;
    let failed = 0;
    let unchanged = 0;
    
    for (const token of result.rows) {
      try {
        // Fetch curve state from blockchain
        const curveObj = await client.getObject({
          id: token.id,
          options: { showContent: true }
        });
        
        if (curveObj.data?.content?.dataType === 'moveObject') {
          const fields = curveObj.data.content.fields;
          const blockchainSupply = fields.token_supply || '0';
          const dbSupply = token.curve_supply;
          
          // Check if there's a difference
          if (blockchainSupply !== dbSupply) {
            const diff = parseInt(blockchainSupply) - parseInt(dbSupply);
            console.log(`📝 ${token.ticker}:`);
            console.log(`   Database:   ${dbSupply}`);
            console.log(`   Blockchain: ${blockchainSupply}`);
            console.log(`   Difference: ${diff > 0 ? '+' : ''}${diff}`);
            
            // Update database
            await db.query(
              `UPDATE tokens 
               SET curve_supply = $1, 
                   curve_balance = $2,
                   updated_at = NOW() 
               WHERE id = $3`,
              [blockchainSupply, fields.sui_reserve || '0', token.id]
            );
            
            console.log(`   ✅ Updated!\n`);
            updated++;
          } else {
            unchanged++;
          }
        } else {
          console.log(`⚠️  ${token.ticker}: Invalid curve object`);
          failed++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
        
      } catch (error) {
        console.error(`❌ ${token.ticker}: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n==========================================`);
    console.log(`✅ Sync complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log(`   Failed: ${failed}`);
    console.log(`==========================================\n`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

syncAllCurveStates();
