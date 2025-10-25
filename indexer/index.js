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

// Index historical events (run once on first start)
async function indexHistoricalEvents() {
  const stateResult = await db.query('SELECT last_cursor FROM indexer_state WHERE id = 1');
  const lastCursor = stateResult.rows[0]?.last_cursor;
  
  // Only run if this is the first time (no cursor saved)
  if (lastCursor) {
    console.log('⏭️  Skipping historical indexing (already synced)');
    return;
  }
  
  console.log('📚 Starting historical event indexing...');
  console.log('⏳ This may take a few minutes for all past events...');
  
  const eventTypes = [
    `${PLATFORM_PACKAGE}::bonding_curve::Created`,
    `${PLATFORM_PACKAGE}::bonding_curve::TokensPurchased`,
    `${PLATFORM_PACKAGE}::bonding_curve::TokensSold`,
  ];
  
  let totalIndexed = 0;
  
  for (const eventType of eventTypes) {
    console.log(`\n📥 Indexing ${eventType.split('::').pop()} events...`);
    let cursor = null;
    let pageCount = 0;
    const maxPages = 1000; // Safety limit
    
    while (pageCount < maxPages) {
      try {
        const queryParams = {
          query: { MoveEventType: eventType },
          limit: 50,
          order: 'ascending', // Start from oldest
        };
        
        if (cursor) {
          queryParams.cursor = cursor;
        }
        
        const events = await client.queryEvents(queryParams);
        
        if (events.data.length === 0) break;
        
        // Process events
        for (const event of events.data) {
          if (eventType.includes('Created')) {
            await processCreatedEvent(event);
          } else if (eventType.includes('TokensPurchased')) {
            await processBuyEvent(event);
          } else if (eventType.includes('TokensSold')) {
            await processSellEvent(event);
          }
          totalIndexed++;
        }
        
        pageCount++;
        console.log(`   Page ${pageCount}: Indexed ${events.data.length} events (Total: ${totalIndexed})`);
        
        if (!events.hasNextPage || !events.nextCursor) break;
        cursor = events.nextCursor;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`   Error on page ${pageCount}:`, error.message);
        break;
      }
    }
  }
  
  console.log(`\n✅ Historical indexing complete! Indexed ${totalIndexed} total events`);
  
  // Generate initial candles
  await generateCandles();
  console.log('📊 Generated initial chart candles\n');
}

// Main indexing loop
async function indexEvents() {
  while (true) {
    try {
      // Get last processed cursor
      const stateResult = await db.query('SELECT last_cursor FROM indexer_state WHERE id = 1');
      const lastCursor = stateResult.rows[0]?.last_cursor;
      
      console.log(`\n🔄 Polling for new events... (cursor: ${lastCursor || 'start'})`);
      
      // Query ALL event types
      const eventTypes = [
        `${PLATFORM_PACKAGE}::bonding_curve::Created`,
        `${PLATFORM_PACKAGE}::bonding_curve::TokensPurchased`,
        `${PLATFORM_PACKAGE}::bonding_curve::TokensSold`,
      ];
      
      let totalNewEvents = 0;
      
      for (const eventType of eventTypes) {
        const queryParams = {
          query: { MoveEventType: eventType },
          limit: 50,
          order: 'descending',
        };
        
        if (lastCursor) {
          queryParams.cursor = lastCursor;
        }
        
        const events = await client.queryEvents(queryParams);
        
        if (events.data.length > 0) {
          totalNewEvents += events.data.length;
          
          // Process each event
          for (const event of events.data) {
            if (eventType.includes('Created')) {
              await processCreatedEvent(event);
            } else if (eventType.includes('TokensPurchased')) {
              await processBuyEvent(event);
            } else if (eventType.includes('TokensSold')) {
              await processSellEvent(event);
            }
          }
          
          // Update cursor
          if (events.nextCursor) {
            await db.query(
              'UPDATE indexer_state SET last_cursor = $1, last_timestamp = $2, updated_at = NOW() WHERE id = 1',
              [JSON.stringify(events.nextCursor), Date.now()]
            );
          }
        }
      }
      
      if (totalNewEvents > 0) {
        console.log(`✨ Processed ${totalNewEvents} total events`);
        // Generate candles after processing trades
        await generateCandles();
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

// Process Buy event
async function processBuyEvent(event) {
  try {
    const fields = event.parsedJson;
    
    // Extract data
    const curveId = fields.curve_id;
    const buyer = fields.buyer;
    const tokensOut = fields.tokens_out;
    const suiIn = fields.sui_in;
    const timestamp = new Date(parseInt(event.timestampMs));
    
    // Calculate price per token (in SUI)
    const pricePerToken = parseFloat(suiIn) / parseFloat(tokensOut);
    
    // Get coin type from curve
    const tokenResult = await db.query('SELECT coin_type FROM tokens WHERE id = $1', [curveId]);
    const coinType = tokenResult.rows[0]?.coin_type;
    
    if (!coinType) {
      console.warn('Unknown curve:', curveId);
      return;
    }
    
    // Insert trade
    await db.query(
      `INSERT INTO trades (tx_digest, coin_type, curve_id, trader, trade_type, sui_amount, token_amount, price_per_token, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tx_digest) DO NOTHING`,
      [event.id.txDigest, coinType, curveId, buyer, 'buy', suiIn, tokensOut, pricePerToken, timestamp]
    );
    
    console.log(`💰 Buy: ${buyer.slice(0, 10)}... bought ${tokensOut} tokens`);
    
  } catch (error) {
    console.error('Failed to process buy event:', error.message);
  }
}

// Process Sell event
async function processSellEvent(event) {
  try {
    const fields = event.parsedJson;
    
    const curveId = fields.curve_id;
    const seller = fields.seller;
    const tokensIn = fields.tokens_in;
    const suiOut = fields.sui_out;
    const timestamp = new Date(parseInt(event.timestampMs));
    
    const pricePerToken = parseFloat(suiOut) / parseFloat(tokensIn);
    
    const tokenResult = await db.query('SELECT coin_type FROM tokens WHERE id = $1', [curveId]);
    const coinType = tokenResult.rows[0]?.coin_type;
    
    if (!coinType) {
      console.warn('Unknown curve:', curveId);
      return;
    }
    
    await db.query(
      `INSERT INTO trades (tx_digest, coin_type, curve_id, trader, trade_type, sui_amount, token_amount, price_per_token, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tx_digest) DO NOTHING`,
      [event.id.txDigest, coinType, curveId, seller, 'sell', suiOut, tokensIn, pricePerToken, timestamp]
    );
    
    console.log(`💸 Sell: ${seller.slice(0, 10)}... sold ${tokensIn} tokens`);
    
  } catch (error) {
    console.error('Failed to process sell event:', error.message);
  }
}

// Generate OHLCV candles from trades
async function generateCandles() {
  try {
    // Get all coin types with recent trades
    const coinsResult = await db.query(
      `SELECT DISTINCT coin_type FROM trades 
       WHERE timestamp > NOW() - INTERVAL '1 hour'`
    );
    
    for (const row of coinsResult.rows) {
      const coinType = row.coin_type;
      
      // Aggregate trades into 1-minute candles
      const candleResult = await db.query(
        `WITH candle_data AS (
          SELECT 
            date_trunc('minute', timestamp) as candle_time,
            (array_agg(price_per_token ORDER BY timestamp ASC))[1] as open,
            MAX(price_per_token) as high,
            MIN(price_per_token) as low,
            (array_agg(price_per_token ORDER BY timestamp DESC))[1] as close,
            SUM(token_amount) as volume
          FROM trades
          WHERE coin_type = $1 
            AND timestamp > NOW() - INTERVAL '1 hour'
          GROUP BY candle_time
        )
        INSERT INTO price_snapshots (coin_type, timestamp, open, high, low, close, volume)
        SELECT $1, candle_time, open, high, low, close, volume
        FROM candle_data
        ON CONFLICT (coin_type, timestamp) 
        DO UPDATE SET 
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume`,
        [coinType]
      );
    }
  } catch (error) {
    console.error('Failed to generate candles:', error.message);
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

// Index historical events first, then start live polling
indexHistoricalEvents()
  .then(() => {
    console.log('🔄 Switching to live polling mode...\n');
    indexEvents();
  })
  .catch(error => {
    console.error('❌ Historical indexing failed:', error);
    console.log('⚠️  Starting live polling anyway...\n');
    indexEvents();
  });
