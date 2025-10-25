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
    `${PLATFORM_PACKAGE}::bonding_curve::Bought`,
    `${PLATFORM_PACKAGE}::bonding_curve::Sold`,
    `${PLATFORM_PACKAGE}::referral_registry::ReferralRegistered`,
    `${PLATFORM_PACKAGE}::referral_registry::ReferralRewardPaid`,
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
      const lastCursorStr = stateResult.rows[0]?.last_cursor;
      
      // Parse cursor if it exists (it's stored as JSON string)
      let lastCursor = null;
      if (lastCursorStr) {
        try {
          lastCursor = JSON.parse(lastCursorStr);
        } catch (e) {
          console.log('⚠️  Could not parse cursor, starting fresh');
          lastCursor = null;
        }
      }
      
      console.log(`\n🔄 Polling for new events... (cursor: ${lastCursorStr || 'start'})`);
      
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
    
    // Insert into database with initial price of 0
    await db.query(
      `INSERT INTO tokens (id, coin_type, ticker, name, description, image_url, creator, curve_supply, curve_balance, graduated, created_at, current_price_sui, market_cap_sui)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 0)
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
    
    // Extract data from Bought event
    const buyer = fields.buyer;
    const suiIn = fields.amount_sui;
    const referrer = fields.referrer;
    const timestamp = new Date(parseInt(event.timestampMs));
    
    // Get transaction to find curve and token amounts
    const txDetails = await client.getTransactionBlock({
      digest: event.id.txDigest,
      options: { showObjectChanges: true },
    });
    
    // Find minted tokens (newly created coins of the memecoin type)
    const mintedCoins = txDetails.objectChanges?.filter(
      obj => obj.type === 'created' && obj.objectType?.includes('::coin::Coin<') && !obj.objectType?.includes('SUILFG_MEMEFI')
    );
    
    if (!mintedCoins || mintedCoins.length === 0) {
      console.warn('No minted tokens found in buy tx:', event.id.txDigest);
      return;
    }
    
    // Extract coin type from minted coin
    const coinTypeMatch = mintedCoins[0].objectType.match(/<(.+)>/);
    const coinType = coinTypeMatch ? coinTypeMatch[1] : '';
    
    // Get curve ID from transaction
    const curveUsed = txDetails.objectChanges?.find(
      obj => obj.type === 'mutated' && obj.objectType?.includes('bonding_curve::BondingCurve')
    );
    const curveId = curveUsed?.objectId || '';
    
    // Estimate tokens (we don't have exact amount in event, use cost/price estimation)
    // This is approximate - for exact amounts, we'd need to parse BalanceChange
    const pricePerToken = 0.00001; // Rough estimate, will be refined by actual trades
    const tokensOut = BigInt(suiIn) / BigInt(10000); // Rough estimate
    
    // Insert trade
    await db.query(
      `INSERT INTO trades (tx_digest, coin_type, curve_id, trader, trade_type, sui_amount, token_amount, price_per_token, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tx_digest) DO NOTHING`,
      [event.id.txDigest, coinType, curveId, buyer, 'buy', suiIn, tokensOut.toString(), pricePerToken, timestamp]
    );
    
    // Update user PnL
    await db.query(
      `INSERT INTO user_pnl (user_address, coin_type, total_sui_spent, total_tokens_bought, buy_count, last_trade_at)
       VALUES ($1, $2, $3, $4, 1, $5)
       ON CONFLICT (user_address, coin_type) 
       DO UPDATE SET 
         total_sui_spent = user_pnl.total_sui_spent + $3,
         total_tokens_bought = user_pnl.total_tokens_bought + $4,
         buy_count = user_pnl.buy_count + 1,
         last_trade_at = $5`,
      [buyer, coinType, suiIn, tokensOut.toString(), timestamp]
    );
    
    // Update token holders (increase balance)
    await db.query(
      `INSERT INTO token_holders (user_address, coin_type, balance, first_acquired_at, last_updated_at)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (user_address, coin_type) 
       DO UPDATE SET 
         balance = token_holders.balance + $3,
         last_updated_at = $4`,
      [buyer, coinType, tokensOut.toString(), timestamp]
    );
    
    // Track referral if present
    if (referrer && referrer !== '0x0' && referrer !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      await db.query(
        `INSERT INTO referrals (referee, referrer, first_trade_at, trade_count)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (referee) 
         DO UPDATE SET trade_count = referrals.trade_count + 1`,
        [buyer, referrer, timestamp]
      );
    }
    
    // Update token price and market data
    await updateTokenPriceAndMarketCap(coinType);
    
    console.log(`💰 Buy: ${buyer.slice(0, 10)}... spent ${suiIn} SUI`);
    
  } catch (error) {
    console.error('Failed to process buy event:', error.message);
  }
}

// Process Sell event
async function processSellEvent(event) {
  try {
    const fields = event.parsedJson;
    
    // Extract data from Sold event
    const seller = fields.seller;
    const suiOut = fields.amount_sui;
    const referrer = fields.referrer;
    const timestamp = new Date(parseInt(event.timestampMs));
    
    // Get transaction to find curve and token amounts
    const txDetails = await client.getTransactionBlock({
      digest: event.id.txDigest,
      options: { showObjectChanges: true },
    });
    
    // Find curve from mutated objects
    const curveUsed = txDetails.objectChanges?.find(
      obj => obj.type === 'mutated' && obj.objectType?.includes('bonding_curve::BondingCurve')
    );
    
    if (!curveUsed) {
      console.warn('No curve found in sell tx:', event.id.txDigest);
      return;
    }
    
    // Extract coin type from curve type
    const coinTypeMatch = curveUsed.objectType.match(/<(.+)>/);
    const coinType = coinTypeMatch ? coinTypeMatch[1] : '';
    const curveId = curveUsed.objectId;
    
    // Estimate tokens sold (approximate)
    const pricePerToken = 0.00001; // Rough estimate
    const tokensIn = BigInt(suiOut) / BigInt(10000); // Rough estimate
    
    // Insert trade
    await db.query(
      `INSERT INTO trades (tx_digest, coin_type, curve_id, trader, trade_type, sui_amount, token_amount, price_per_token, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tx_digest) DO NOTHING`,
      [event.id.txDigest, coinType, curveId, seller, 'sell', suiOut, tokensIn.toString(), pricePerToken, timestamp]
    );
    
    // Update user PnL
    await db.query(
      `INSERT INTO user_pnl (user_address, coin_type, total_sui_received, total_tokens_sold, sell_count, last_trade_at)
       VALUES ($1, $2, $3, $4, 1, $5)
       ON CONFLICT (user_address, coin_type) 
       DO UPDATE SET 
         total_sui_received = user_pnl.total_sui_received + $3,
         total_tokens_sold = user_pnl.total_tokens_sold + $4,
         sell_count = user_pnl.sell_count + 1,
         realized_pnl = (user_pnl.total_sui_received + $3) - user_pnl.total_sui_spent,
         last_trade_at = $5`,
      [seller, coinType, suiOut, tokensIn.toString(), timestamp]
    );
    
    // Update token holders (decrease balance)
    await db.query(
      `INSERT INTO token_holders (user_address, coin_type, balance, first_acquired_at, last_updated_at)
       VALUES ($1, $2, -$3, $4, $4)
       ON CONFLICT (user_address, coin_type) 
       DO UPDATE SET 
         balance = token_holders.balance - $3,
         last_updated_at = $4`,
      [seller, coinType, tokensIn.toString(), timestamp]
    );
    
    // If balance is now 0 or negative, remove from holders
    await db.query(
      `DELETE FROM token_holders 
       WHERE user_address = $1 AND coin_type = $2 AND balance <= 0`,
      [seller, coinType]
    );
    
    // Track referral if present
    if (referrer && referrer !== '0x0' && referrer !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      await db.query(
        `INSERT INTO referrals (referee, referrer, first_trade_at, trade_count)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (referee) 
         DO UPDATE SET trade_count = referrals.trade_count + 1`,
        [seller, referrer, timestamp]
      );
    }
    
    // Update token price and market data
    await updateTokenPriceAndMarketCap(coinType);
    
    console.log(`💸 Sell: ${seller.slice(0, 10)}... received ${suiOut} SUI`);
    
  } catch (error) {
    console.error('Failed to process sell event:', error.message);
  }
}

// Process ReferralRegistered event
async function processReferralRegisteredEvent(event) {
  try {
    const fields = event.parsedJson;
    const trader = fields.trader;
    const referrer = fields.referrer;
    const timestamp = new Date(parseInt(fields.timestamp));
    
    await db.query(
      `INSERT INTO referrals (referee, referrer, first_trade_at, trade_count)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (referee) DO NOTHING`,
      [trader, referrer, timestamp]
    );
    
    console.log(`👥 Referral: ${trader.slice(0, 10)}... referred by ${referrer.slice(0, 10)}...`);
  } catch (error) {
    console.error('Failed to process referral registered event:', error.message);
  }
}

// Process ReferralRewardPaid event
async function processReferralRewardEvent(event) {
  try {
    const fields = event.parsedJson;
    const referrer = fields.referrer;
    const amount = fields.amount;
    
    await db.query(
      `UPDATE referrals 
       SET total_rewards = COALESCE(total_rewards, 0) + $1
       WHERE referrer = $2`,
      [amount, referrer]
    );
    
    console.log(`💵 Referral reward: ${referrer.slice(0, 10)}... earned ${amount}`);
  } catch (error) {
    console.error('Failed to process referral reward event:', error.message);
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

// Update token price and market cap based on latest trades
async function updateTokenPriceAndMarketCap(coinType) {
  try {
    // Get latest trade price
    const latestTradeResult = await db.query(
      `SELECT price_per_token, timestamp 
       FROM trades 
       WHERE coin_type = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [coinType]
    );
    
    if (latestTradeResult.rows.length === 0) {
      return; // No trades yet
    }
    
    const currentPrice = parseFloat(latestTradeResult.rows[0].price_per_token);
    const lastTradeAt = latestTradeResult.rows[0].timestamp;
    
    // Get 24h ago price for price change calculation
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const price24hAgoResult = await db.query(
      `SELECT price_per_token 
       FROM trades 
       WHERE coin_type = $1 AND timestamp <= $2
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [coinType, twentyFourHoursAgo]
    );
    
    const price24hAgo = price24hAgoResult.rows.length > 0 
      ? parseFloat(price24hAgoResult.rows[0].price_per_token) 
      : currentPrice;
    
    const priceChange24h = price24hAgo > 0 
      ? ((currentPrice - price24hAgo) / price24hAgo) * 100 
      : 0;
    
    // Calculate 24h volume
    const volume24hResult = await db.query(
      `SELECT SUM(sui_amount) as volume 
       FROM trades 
       WHERE coin_type = $1 AND timestamp > $2`,
      [coinType, twentyFourHoursAgo]
    );
    
    const volume24h = volume24hResult.rows[0]?.volume || '0';
    
    // Get curve data from tokens table
    const tokenResult = await db.query(
      `SELECT curve_supply, curve_balance FROM tokens WHERE coin_type = $1`,
      [coinType]
    );
    
    if (tokenResult.rows.length === 0) {
      return; // Token not found
    }
    
    const curveSupply = parseFloat(tokenResult.rows[0]?.curve_supply || '0');
    const curveBalance = parseFloat(tokenResult.rows[0]?.curve_balance || '0');
    
    // MARKET CAP = PRICE × TOTAL SUPPLY (1B)
    // For bonding curve tokens, market cap equals FDV
    // This gives consistent valuation across all tokens
    const totalSupply = 1_000_000_000;
    const marketCap = currentPrice * totalSupply;
    
    // FDV (Fully Diluted Valuation):
    // Same as market cap for bonding curve tokens
    const fullyDilutedValuation = marketCap;
    
    // Get ATH and ATL
    const athResult = await db.query(
      `SELECT MAX(price_per_token) as ath, 
              (SELECT timestamp FROM trades WHERE coin_type = $1 ORDER BY price_per_token DESC LIMIT 1) as ath_at
       FROM trades 
       WHERE coin_type = $1`,
      [coinType]
    );
    
    const atlResult = await db.query(
      `SELECT MIN(price_per_token) as atl,
              (SELECT timestamp FROM trades WHERE coin_type = $1 ORDER BY price_per_token ASC LIMIT 1) as atl_at
       FROM trades 
       WHERE coin_type = $1`,
      [coinType]
    );
    
    const ath = athResult.rows[0]?.ath || currentPrice;
    const athAt = athResult.rows[0]?.ath_at || lastTradeAt;
    const atl = atlResult.rows[0]?.atl || currentPrice;
    const atlAt = atlResult.rows[0]?.atl_at || lastTradeAt;
    
    // Update tokens table
    await db.query(
      `UPDATE tokens 
       SET 
         current_price_sui = $1,
         market_cap_sui = $2,
         fully_diluted_valuation_sui = $3,
         volume_24h_sui = $4,
         price_change_24h = $5,
         all_time_high_sui = $6,
         all_time_high_at = $7,
         all_time_low_sui = $8,
         all_time_low_at = $9,
         last_trade_at = $10,
         updated_at = NOW()
       WHERE coin_type = $11`,
      [
        currentPrice,
        marketCap,
        fullyDilutedValuation,
        volume24h,
        priceChange24h,
        ath,
        athAt,
        atl,
        atlAt,
        lastTradeAt,
        coinType
      ]
    );
    
  } catch (error) {
    console.error('Failed to update price/market cap:', error.message);
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
