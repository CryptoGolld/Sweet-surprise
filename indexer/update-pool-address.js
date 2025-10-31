/**
 * Helper script to update Cetus pool address for graduated tokens
 * 
 * Usage:
 *   node update-pool-address.js <ticker> <poolAddress>
 * 
 * Example:
 *   node update-pool-address.js PEPE 0x1234567890abcdef...
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function updatePoolAddress() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('❌ Usage: node update-pool-address.js <ticker> <poolAddress>');
    console.log('');
    console.log('Example:');
    console.log('  node update-pool-address.js PEPE 0x1234567890abcdef...');
    console.log('');
    process.exit(1);
  }
  
  const ticker = args[0].toUpperCase();
  const poolAddress = args[1];
  
  try {
    // Find token by ticker
    const tokenResult = await db.query(
      'SELECT coin_type, ticker, graduated, cetus_pool_address FROM tokens WHERE UPPER(ticker) = $1',
      [ticker]
    );
    
    if (tokenResult.rows.length === 0) {
      console.log(`❌ Token not found: ${ticker}`);
      console.log('');
      console.log('Available graduated tokens:');
      const graduated = await db.query(
        'SELECT ticker FROM tokens WHERE graduated = true ORDER BY ticker'
      );
      graduated.rows.forEach(row => console.log(`   - ${row.ticker}`));
      process.exit(1);
    }
    
    const token = tokenResult.rows[0];
    
    console.log(`\n📦 Token Found: ${token.ticker}`);
    console.log(`   Coin Type: ${token.coin_type}`);
    console.log(`   Graduated: ${token.graduated ? '✅ Yes' : '❌ No'}`);
    console.log(`   Current Pool: ${token.cetus_pool_address || 'None'}`);
    console.log('');
    
    if (!token.graduated) {
      console.log(`⚠️  WARNING: Token has not graduated yet!`);
      console.log('   Only graduated tokens should have Cetus pools.');
      console.log('');
      const confirm = await askConfirmation('Continue anyway?');
      if (!confirm) {
        process.exit(0);
      }
    }
    
    if (token.cetus_pool_address) {
      console.log(`⚠️  WARNING: This token already has a pool address!`);
      console.log(`   Current: ${token.cetus_pool_address}`);
      console.log(`   New: ${poolAddress}`);
      console.log('');
      const confirm = await askConfirmation('Overwrite with new pool address?');
      if (!confirm) {
        process.exit(0);
      }
    }
    
    // Update pool address
    console.log('💾 Updating pool address...');
    await db.query(
      `UPDATE tokens 
       SET cetus_pool_address = $1, 
           updated_at = NOW()
       WHERE coin_type = $2`,
      [poolAddress, token.coin_type]
    );
    
    console.log('✅ Pool address updated successfully!');
    console.log('');
    console.log('🎉 Users can now trade on Cetus!');
    console.log(`   Token: ${ticker}`);
    console.log(`   Pool: ${poolAddress}`);
    console.log('');
    console.log(`🔗 Cetus URL: https://app.cetus.zone/swap/?from=0x2::sui::SUI&to=${encodeURIComponent(token.coin_type)}&poolAddress=${poolAddress}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

function askConfirmation(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    readline.question(`${question} (y/n): `, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

updatePoolAddress();
