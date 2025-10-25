import { SuiClient } from '@mysten/sui/client';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration
const PLATFORM_PACKAGE = process.env.PLATFORM_PACKAGE;
const SUI_RPC_URL = process.env.SUI_RPC_URL;
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const client = new SuiClient({ url: SUI_RPC_URL });

console.log('🚀 Starting Memecoin Indexer...');
console.log('📦 Package:', PLATFORM_PACKAGE);
console.log('🌐 RPC:', SUI_RPC_URL);

// Main indexing loop
async function indexEvents() {
  while (true) {
    try {
      // Get last processed cursor
      const stateResult = await db.query('SELECT last_cursor FROM indexer_state WHERE id = 1');
      const lastCursor = stateResult.rows[0]?.last_cursor;
      
      console.log(`\n🔄 Polling for new events... (cursor: ${lastCursor || 'start'})`);
      
      // Query Created events
      const queryParams = {
        query: {
          MoveEventType: `${PLATFORM_PACKAGE}::bonding_curve::Created`,
        },
        limit: 50,
        order: 'descending',
      };
      
      if (lastCursor) {
        queryParams.cursor = lastCursor;
      }
      
      const events = await client.queryEvents(queryParams);
      
      if (events.data.length > 0) {
        console.log(`✨ Found ${events.data.length} new events`);
        
        // Process each event
        for (const event of events.data) {
          await processCreatedEvent(event);
        }
        
        // Update cursor
        if (events.nextCursor) {
          await db.query(
            'UPDATE indexer_state SET last_cursor = $1, last_timestamp = $2, updated_at = NOW() WHERE id = 1',
            [JSON.stringify(events.nextCursor), Date.now()]
          );
        }
      } else {
        console.log('📭 No new events');
      }
      
      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('❌ Indexing error:', error.message);
      // Wait longer on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Process a Created event
async function processCreatedEvent(event) {
  try {
    // Get transaction details
    const txDetails = await client.getTransactionBlock({
      digest: event.id.txDigest,
      options: {
        showObjectChanges: true,
        showEffects: true,
      },
    });
    
    // Find the BondingCurve object
    const curveObj = txDetails.objectChanges?.find(
      obj => obj.type === 'created' && obj.objectType?.includes('bonding_curve::BondingCurve')
    );
    
    if (!curveObj) {
      console.warn('No curve object found in tx:', event.id.txDigest);
      return;
    }
    
    const curveId = curveObj.objectId;
    
    // Fetch curve details
    const curveObject = await client.getObject({
      id: curveId,
      options: { showContent: true, showType: true },
    });
    
    if (curveObject.data?.content?.dataType !== 'moveObject') {
      console.warn('Invalid curve object:', curveId);
      return;
    }
    
    const content = curveObject.data.content;
    const fields = content.fields;
    
    // Extract coin type
    const fullObjectType = content.type;
    const match = fullObjectType.match(/<(.+)>/);
    const coinType = match ? match[1] : '';
    
    if (!coinType) {
      console.warn('Could not extract coin type from:', fullObjectType);
      return;
    }
    
    const ticker = coinType.split('::').pop() || 'UNKNOWN';
    
    // Fetch metadata
    let name = ticker;
    let description = '';
    let imageUrl = '';
    
    try {
      const metadata = await client.getCoinMetadata({ coinType });
      if (metadata) {
        name = metadata.name || ticker;
        description = metadata.description || '';
        imageUrl = metadata.iconUrl || '';
      }
    } catch (e) {
      console.warn(`No metadata for ${ticker}`);
    }
    
    // Insert into database
    await db.query(
      `INSERT INTO tokens (id, coin_type, ticker, name, description, image_url, creator, curve_supply, curve_balance, graduated, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (coin_type) 
       DO UPDATE SET 
         curve_supply = EXCLUDED.curve_supply,
         curve_balance = EXCLUDED.curve_balance,
         graduated = EXCLUDED.graduated,
         updated_at = NOW()`,
      [
        curveId,
        coinType,
        ticker,
        name,
        description,
        imageUrl,
        fields.creator || '0x0',
        fields.token_supply || '0',
        fields.sui_reserve || '0',
        fields.graduated || false,
        new Date(parseInt(event.timestampMs)),
      ]
    );
    
    console.log(`✅ Indexed token: ${ticker} (${curveId.slice(0, 10)}...)`);
    
  } catch (error) {
    console.error('Failed to process event:', error.message);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  await db.end();
  process.exit(0);
});

// Start indexing
console.log('✅ Indexer started!\n');
indexEvents();
