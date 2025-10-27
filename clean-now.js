import pg from 'pg';

const { Pool } = pg;
const db = new Pool({ 
  connectionString: 'postgresql://memeindexer:suilfgindexer@localhost:5432/memecoins',
  host: '172.31.26.186' // Your server IP
});

async function cleanNow() {
  try {
    console.log('Deleting all data...');
    
    await db.query('DELETE FROM price_snapshots');
    await db.query('DELETE FROM token_holders');
    await db.query('DELETE FROM trades');
    await db.query('DELETE FROM tokens');
    await db.query('DELETE FROM indexer_state');
    
    console.log('✅ DONE. Database is clean.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

cleanNow();
