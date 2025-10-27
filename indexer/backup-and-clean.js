import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Old packages to remove
const OLD_PACKAGES = [
  '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5', // v0.0.7
  '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0', // v0.0.6 LEGACY
];

// New package to keep
const NEW_PACKAGE = '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348';

async function backupAndClean() {
  console.log('🗄️  Backing up and cleaning old package data...\n');

  try {
    // 1. Backup old data
    console.log('📦 Step 1: Backing up old data for testnet rewards...');
    
    const backup = {
      timestamp: new Date().toISOString(),
      packages: OLD_PACKAGES,
      data: {}
    };

    // Backup tokens
    const tokensResult = await db.query(
      `SELECT * FROM tokens WHERE package_id = ANY($1)`,
      [OLD_PACKAGES]
    );
    backup.data.tokens = tokensResult.rows;
    console.log(`   ✅ Backed up ${tokensResult.rows.length} old tokens`);

    // Backup trades
    const tradesResult = await db.query(
      `SELECT t.* FROM trades t
       JOIN tokens tok ON t.coin_type = tok.coin_type
       WHERE tok.package_id = ANY($1)`,
      [OLD_PACKAGES]
    );
    backup.data.trades = tradesResult.rows;
    console.log(`   ✅ Backed up ${tradesResult.rows.length} old trades`);

    // Backup price snapshots
    const snapshotsResult = await db.query(
      `SELECT ps.* FROM price_snapshots ps
       JOIN tokens tok ON ps.coin_type = tok.coin_type
       WHERE tok.package_id = ANY($1)`,
      [OLD_PACKAGES]
    );
    backup.data.price_snapshots = snapshotsResult.rows;
    console.log(`   ✅ Backed up ${snapshotsResult.rows.length} old price snapshots`);

    // Backup token holders
    const holdersResult = await db.query(
      `SELECT th.* FROM token_holders th
       JOIN tokens tok ON th.coin_type = tok.coin_type
       WHERE tok.package_id = ANY($1)`,
      [OLD_PACKAGES]
    );
    backup.data.token_holders = holdersResult.rows;
    console.log(`   ✅ Backed up ${holdersResult.rows.length} old token holders`);

    // Save backup to file
    const backupPath = `./backup-old-packages-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`   ✅ Backup saved to: ${backupPath}\n`);

    // 2. Delete old data
    console.log('🗑️  Step 2: Deleting old package data from database...');

    // Delete in order (respecting foreign keys)
    await db.query(
      `DELETE FROM price_snapshots
       WHERE coin_type IN (
         SELECT coin_type FROM tokens WHERE package_id = ANY($1)
       )`,
      [OLD_PACKAGES]
    );
    console.log('   ✅ Deleted old price snapshots');

    await db.query(
      `DELETE FROM token_holders
       WHERE coin_type IN (
         SELECT coin_type FROM tokens WHERE package_id = ANY($1)
       )`,
      [OLD_PACKAGES]
    );
    console.log('   ✅ Deleted old token holders');

    await db.query(
      `DELETE FROM trades
       WHERE coin_type IN (
         SELECT coin_type FROM tokens WHERE package_id = ANY($1)
       )`,
      [OLD_PACKAGES]
    );
    console.log('   ✅ Deleted old trades');

    await db.query(
      `DELETE FROM tokens WHERE package_id = ANY($1)`,
      [OLD_PACKAGES]
    );
    console.log('   ✅ Deleted old tokens');

    // 3. Reset indexer state to start fresh
    console.log('\n🔄 Step 3: Resetting indexer state...');
    await db.query('DELETE FROM indexer_state');
    console.log('   ✅ Indexer state reset (will re-sync on next start)\n');

    // 4. Show remaining data
    console.log('📊 Current database status:');
    const currentTokens = await db.query('SELECT COUNT(*) FROM tokens');
    const currentTrades = await db.query('SELECT COUNT(*) FROM trades');
    console.log(`   Tokens: ${currentTokens.rows[0].count}`);
    console.log(`   Trades: ${currentTrades.rows[0].count}`);
    
    console.log('\n✅ Cleanup complete!');
    console.log(`   Backup saved to: ${backupPath}`);
    console.log('   Old package data removed from database');
    console.log('   Indexer will re-sync on next restart\n');

  } catch (error) {
    console.error('❌ Error during backup/cleanup:', error);
    throw error;
  } finally {
    await db.end();
  }
}

backupAndClean().catch(console.error);
