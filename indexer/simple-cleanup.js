import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Old packages to remove (identified by checking coin_type)
const OLD_PACKAGES = [
  '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5', // v0.0.7
  '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0', // v0.0.6
];

// New package to keep
const NEW_PACKAGE = '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348';

async function cleanDatabase() {
  console.log('🗄️  Cleaning old package data from database...\n');

  try {
    // 1. First, let's see what we have
    console.log('📊 Step 1: Checking current database status...');
    
    const tokensCount = await db.query('SELECT COUNT(*) FROM tokens');
    const tradesCount = await db.query('SELECT COUNT(*) FROM trades');
    const snapshotsCount = await db.query('SELECT COUNT(*) FROM price_snapshots');
    
    console.log(`   Current tokens: ${tokensCount.rows[0].count}`);
    console.log(`   Current trades: ${tradesCount.rows[0].count}`);
    console.log(`   Current snapshots: ${snapshotsCount.rows[0].count}`);
    console.log('');

    // 2. Check which tokens are from old packages
    const oldTokensCheck = await db.query(
      `SELECT coin_type, name, ticker 
       FROM tokens 
       WHERE coin_type LIKE '%${OLD_PACKAGES[0]}%' 
          OR coin_type LIKE '%${OLD_PACKAGES[1]}%'`
    );
    
    console.log(`📦 Found ${oldTokensCheck.rows.length} tokens from old packages:`);
    oldTokensCheck.rows.forEach(token => {
      console.log(`   - ${token.ticker} (${token.name})`);
    });
    console.log('');

    // 3. Backup old data to JSON file
    console.log('💾 Step 2: Backing up old data...');
    
    const backup = {
      timestamp: new Date().toISOString(),
      packages: OLD_PACKAGES,
      data: {
        tokens: oldTokensCheck.rows,
      }
    };

    // Get trades for old tokens
    if (oldTokensCheck.rows.length > 0) {
      const oldCoinTypes = oldTokensCheck.rows.map(t => t.coin_type);
      
      const tradesResult = await db.query(
        `SELECT * FROM trades WHERE coin_type = ANY($1)`,
        [oldCoinTypes]
      );
      backup.data.trades = tradesResult.rows;
      console.log(`   ✅ Backed up ${tradesResult.rows.length} trades`);

      const snapshotsResult = await db.query(
        `SELECT * FROM price_snapshots WHERE coin_type = ANY($1)`,
        [oldCoinTypes]
      );
      backup.data.price_snapshots = snapshotsResult.rows;
      console.log(`   ✅ Backed up ${snapshotsResult.rows.length} price snapshots`);

      const holdersResult = await db.query(
        `SELECT * FROM token_holders WHERE coin_type = ANY($1)`,
        [oldCoinTypes]
      );
      backup.data.token_holders = holdersResult.rows;
      console.log(`   ✅ Backed up ${holdersResult.rows.length} token holders`);
    }

    // Save backup
    const backupPath = `./backup-old-data-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`   ✅ Backup saved to: ${backupPath}\n`);

    // 4. Delete old data
    console.log('🗑️  Step 3: Deleting old data...');

    if (oldTokensCheck.rows.length > 0) {
      const oldCoinTypes = oldTokensCheck.rows.map(t => t.coin_type);

      // Delete in order (respecting foreign keys)
      await db.query(
        `DELETE FROM price_snapshots WHERE coin_type = ANY($1)`,
        [oldCoinTypes]
      );
      console.log('   ✅ Deleted old price snapshots');

      await db.query(
        `DELETE FROM token_holders WHERE coin_type = ANY($1)`,
        [oldCoinTypes]
      );
      console.log('   ✅ Deleted old token holders');

      await db.query(
        `DELETE FROM trades WHERE coin_type = ANY($1)`,
        [oldCoinTypes]
      );
      console.log('   ✅ Deleted old trades');

      await db.query(
        `DELETE FROM tokens WHERE coin_type = ANY($1)`,
        [oldCoinTypes]
      );
      console.log('   ✅ Deleted old tokens');
    } else {
      console.log('   ℹ️  No old data to delete');
    }

    // 5. Reset indexer state
    console.log('\n🔄 Step 4: Resetting indexer state...');
    await db.query('DELETE FROM indexer_state');
    console.log('   ✅ Indexer state reset\n');

    // 6. Show final status
    console.log('📊 Final database status:');
    const finalTokens = await db.query('SELECT COUNT(*) FROM tokens');
    const finalTrades = await db.query('SELECT COUNT(*) FROM trades');
    const finalSnapshots = await db.query('SELECT COUNT(*) FROM price_snapshots');
    
    console.log(`   Tokens: ${finalTokens.rows[0].count}`);
    console.log(`   Trades: ${finalTrades.rows[0].count}`);
    console.log(`   Snapshots: ${finalSnapshots.rows[0].count}`);
    
    console.log('\n✅ Cleanup complete!');
    console.log(`   Backup saved to: ${backupPath}`);
    console.log('   Database is now clean and ready for v0.0.8 only!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart indexer: pm2 restart memecoin-indexer');
    console.log('   2. Indexer will re-sync with v0.0.8 events only');
    console.log('   3. Frontend will show only new v0.0.8 tokens\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await db.end();
  }
}

cleanDatabase().catch(console.error);
