import { SuiClient } from '@mysten/sui/client';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration - v0.0.8 package only
const PLATFORM_PACKAGE = process.env.PLATFORM_PACKAGE || '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348'; // v0.0.8
const SUI_RPC_URL = process.env.SUI_RPC_URL;
const db = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  query_timeout: 10000, // 10 second query timeout
});
const client = new SuiClient({ url: SUI_RPC_URL });

// Timeout wrapper to prevent hanging
function withTimeout(promise, timeoutMs, operation = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

console.log('🚀 Starting Memecoin Indexer (v0.0.8 only)...');
console.log('📦 Package:', PLATFORM_PACKAGE);
console.log('🌐 RPC:', SUI_RPC_URL);

// Index historical events (run once on first start)
async function indexHistoricalEvents() {
  const stateResult = await db.query('SELECT last_timestamp FROM indexer_state WHERE id = 1');
  const lastTimestamp = stateResult.rows[0]?.last_timestamp;
  
  // Only run if this is the first time (no timestamp saved) OR timestamp is very old
  if (lastTimestamp && parseInt(lastTimestamp) > 0) {
    console.log('⏭️  Skipping historical indexing (already synced)');
    console.log(`   Last indexed: ${new Date(parseInt(lastTimestamp)).toISOString()}`);
    return;
  }
  
  console.log('📚 Starting historical event indexing...');
  console.log('⏳ This may take a few minutes for all past events...');
  
  // Index events from v0.0.8 package only
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
          } else if (eventType.includes('Bought') || eventType.includes('TokensPurchased')) {
            await processBuyEvent(event);
          } else if (eventType.includes('Sold') || eventType.includes('TokensSold')) {
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

// Main indexing loop with pagination
async function indexEvents() {
  while (true) {
    try {
      // Get last processed timestamp
      const stateResult = await db.query('SELECT last_timestamp FROM indexer_state WHERE id = 1');
      const lastTimestamp = parseInt(stateResult.rows[0]?.last_timestamp) || 0;
      
      // Handle case where timestamp might be null/invalid
      let lastDate;
      try {
        lastDate = lastTimestamp > 0 ? new Date(lastTimestamp).toISOString() : 'beginning';
      } catch (e) {
        lastDate = 'beginning';
      }
      console.log(`\n🔄 Polling for new events (after ${lastDate})...`);
      console.log(`   Watching: ${PLATFORM_PACKAGE.substring(0, 20)}...`);
      
      // Poll v0.0.8 package for new events
      const eventTypes = [
        `${PLATFORM_PACKAGE}::bonding_curve::Created`,
        `${PLATFORM_PACKAGE}::bonding_curve::Bought`,
        `${PLATFORM_PACKAGE}::bonding_curve::Sold`,
      ];
      
      let totalNewEvents = 0;
      let latestTimestamp = lastTimestamp;
      
      for (const eventType of eventTypes) {
        // OPTIMIZATION: Limit pagination to prevent re-scanning old events
        // Since we poll every 500ms, we only need to check recent events
        let pageCount = 0;
        const MAX_PAGES = 10; // Max 500 events (10 pages × 50 events) per poll
        let cursor = null;
        
        while (pageCount < MAX_PAGES) {
          const queryParams = {
            query: { MoveEventType: eventType },
            limit: 50,
            order: 'descending',
          };
          
          if (cursor) {
            queryParams.cursor = cursor;
          }
          
          const events = await withTimeout(
            client.queryEvents(queryParams),
            10000,
            'queryEvents'
          );
          
          if (events.data.length === 0) {
            break; // No more events
          }
          
          let foundOldEvent = false;
          
          for (const event of events.data) {
            const eventTimestamp = parseInt(event.timestampMs);
            
            // Stop if we've reached events we've already processed
            if (eventTimestamp <= lastTimestamp) {
              foundOldEvent = true;
              break;
            }
            
            // Track latest timestamp
            if (eventTimestamp > latestTimestamp) {
              latestTimestamp = eventTimestamp;
            }
            
            totalNewEvents++;
            
            // Process the event
            if (eventType.includes('Created')) {
              console.log(`   📦 Processing Created event from ${eventType.split('::')[0].substring(0, 20)}...`);
              await processCreatedEvent(event);
            } else if (eventType.includes('Bought') || eventType.includes('TokensPurchased')) {
              console.log(`   💰 Processing Buy event from ${eventType.split('::')[0].substring(0, 20)}...`);
              await processBuyEvent(event);
            } else if (eventType.includes('Sold') || eventType.includes('TokensSold')) {
              console.log(`   💸 Processing Sell event from ${eventType.split('::')[0].substring(0, 20)}...`);
              await processSellEvent(event);
            }
          }
          
          // Stop if we found old events or no more pages
          if (foundOldEvent || !events.hasNextPage) {
            break;
          }
          
          cursor = events.nextCursor;
          pageCount++;
        }
        
        if (pageCount >= MAX_PAGES) {
          console.log(`   ⚠️  Hit max pagination limit for ${eventType.split('::').pop()}, will catch up on next poll`);
        }
      }
      
      // Update last processed timestamp
      if (latestTimestamp > lastTimestamp) {
        await db.query(
          'UPDATE indexer_state SET last_timestamp = $1, updated_at = NOW() WHERE id = 1',
          [latestTimestamp]
        );
      }
      
      if (totalNewEvents > 0) {
        console.log(`✨ Processed ${totalNewEvents} new events`);
        // NOTE: Candle generation moved to separate bot (candle-generator.js)
        // This keeps the indexer fast and responsive
      } else {
        // Reduce console spam when no events
        // console.log('📭 No new events');
      }
      
      // Wait before next poll (2 seconds is more stable for production)
      const pollingInterval = parseInt(process.env.POLLING_INTERVAL_MS || '2000');
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
      
    } catch (error) {
      console.error('❌ Indexing error:', error.message);
      console.error('Stack:', error.stack);
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Continue the loop - don't let errors break it
    }
  }
  // This should never be reached, but just in case
  console.error('⚠️ Indexing loop exited unexpectedly! Restarting...');
  setTimeout(() => indexEvents(), 5000);
}

// Process a Created event
async function processCreatedEvent(event) {
  try {
    // Get transaction details with timeout
    const txDetails = await withTimeout(
      client.getTransactionBlock({
        digest: event.id.txDigest,
        options: {
          showObjectChanges: true,
          showEffects: true,
        },
      }),
      10000,
      'getTransactionBlock'
    );
    
    // Find the BondingCurve object
    const curveObj = txDetails.objectChanges?.find(
      obj => obj.type === 'created' && obj.objectType?.includes('bonding_curve::BondingCurve')
    );
    
    if (!curveObj) {
      console.warn('No curve object found in tx:', event.id.txDigest);
      return;
    }
    
    const curveId = curveObj.objectId;
    
    // Fetch curve details with timeout
    const curveObject = await withTimeout(
      client.getObject({
        id: curveId,
        options: { showContent: true, showType: true },
      }),
      10000,
      'getObject'
    );
    
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
      const metadata = await withTimeout(
        client.getCoinMetadata({ coinType }),
        5000,
        'getCoinMetadata'
      );
      if (metadata) {
        name = metadata.name || ticker;
        description = metadata.description || '';
        imageUrl = metadata.iconUrl || '';
      }
    } catch (e) {
      console.warn(`No metadata for ${ticker}:`, e.message);
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
    
    // Get transaction to find curve and token amounts with balance changes
    const txDetails = await withTimeout(
      client.getTransactionBlock({
        digest: event.id.txDigest,
        options: { 
          showObjectChanges: true,
          showBalanceChanges: true,
          showEffects: true,
        },
      }),
      10000,
      'getTransactionBlock (buy)'
    );
    
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
    
    // Extract ACTUAL token amount from balance changes
    let tokensOut = '0';
    if (txDetails.balanceChanges) {
      const tokenBalanceChange = txDetails.balanceChanges.find(
        bc => bc.coinType === coinType && bc.owner?.AddressOwner === buyer
      );
      if (tokenBalanceChange) {
        // Balance change amount is a string that can be negative, we want absolute value
        tokensOut = tokenBalanceChange.amount.replace('-', '');
      }
    }
    
    // If we couldn't find it in balance changes, try to estimate from object changes
    if (tokensOut === '0' && mintedCoins.length > 0) {
      console.warn(`⚠️  Could not find balance change for ${coinType}, using fallback estimation`);
      // Fallback: rough estimation
      tokensOut = (BigInt(suiIn) * BigInt(100000)).toString(); // Very rough estimate
    }
    
    // Calculate ACTUAL price per token
    const pricePerToken = BigInt(suiIn) > 0n && BigInt(tokensOut) > 0n
      ? parseFloat(suiIn) / parseFloat(tokensOut)
      : 0
    
    // Insert trade
    await db.query(
      `INSERT INTO trades (tx_digest, coin_type, curve_id, trader, trade_type, sui_amount, token_amount, price_per_token, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tx_digest) DO NOTHING`,
      [event.id.txDigest, coinType, curveId, buyer, 'buy', suiIn, tokensOut, pricePerToken, timestamp]
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
      [buyer, coinType, suiIn, tokensOut, timestamp]
    );
    
    // Update token holders (increase balance)
    await db.query(
      `INSERT INTO token_holders (user_address, coin_type, balance, first_acquired_at, last_updated_at)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (user_address, coin_type) 
       DO UPDATE SET 
         balance = token_holders.balance + $3,
         last_updated_at = $4`,
      [buyer, coinType, tokensOut, timestamp]
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
    
    // Fetch latest curve state from blockchain to get accurate supply
    try {
      const curveObject = await withTimeout(
        client.getObject({
          id: curveId,
          options: { showContent: true },
        }),
        10000,
        'getObject (refresh curve)'
      );
      
      if (curveObject.data?.content?.dataType === 'moveObject') {
        const fields = curveObject.data.content.fields;
        await db.query(
          `UPDATE tokens SET curve_supply = $1, curve_balance = $2, updated_at = NOW() WHERE coin_type = $3`,
          [fields.token_supply || '0', fields.sui_reserve || '0', coinType]
        );
      }
    } catch (error) {
      console.warn('Failed to refresh curve state:', error.message);
    }
    
    // Update token price and market data (using fresh supply)
    await updateTokenPriceAndMarketCap(coinType);
    
    console.log(`💰 Buy: ${buyer.slice(0, 10)}... spent ${(parseFloat(suiIn) / 1e9).toFixed(4)} SUILFG for ${(parseFloat(tokensOut) / 1e9).toFixed(2)} tokens @ ${pricePerToken.toFixed(10)}`);
    
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
    
    // Get transaction to find curve and token amounts with balance changes
    const txDetails = await withTimeout(
      client.getTransactionBlock({
        digest: event.id.txDigest,
        options: { 
          showObjectChanges: true,
          showBalanceChanges: true,
          showEffects: true,
        },
      }),
      10000,
      'getTransactionBlock (sell)'
    );
    
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
    
    // Extract ACTUAL token amount from balance changes
    let tokensIn = '0';
    if (txDetails.balanceChanges) {
      const tokenBalanceChange = txDetails.balanceChanges.find(
        bc => bc.coinType === coinType && bc.owner?.AddressOwner === seller
      );
      if (tokenBalanceChange) {
        // For sells, the balance change is negative (tokens leaving), we want absolute value
        tokensIn = tokenBalanceChange.amount.replace('-', '');
      }
    }
    
    // If we couldn't find it in balance changes, estimate
    if (tokensIn === '0') {
      console.warn(`⚠️  Could not find balance change for ${coinType} sell, using fallback estimation`);
      // Fallback: rough estimation
      tokensIn = (BigInt(suiOut) * BigInt(100000)).toString(); // Very rough estimate
    }
    
    // Calculate ACTUAL price per token
    const pricePerToken = BigInt(tokensIn) > 0n && BigInt(suiOut) > 0n
      ? parseFloat(suiOut) / parseFloat(tokensIn)
      : 0
    
    // Insert trade
    await db.query(
      `INSERT INTO trades (tx_digest, coin_type, curve_id, trader, trade_type, sui_amount, token_amount, price_per_token, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tx_digest) DO NOTHING`,
      [event.id.txDigest, coinType, curveId, seller, 'sell', suiOut, tokensIn, pricePerToken, timestamp]
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
      [seller, coinType, suiOut, tokensIn, timestamp]
    );
    
    // Update token holders (decrease balance)
    await db.query(
      `INSERT INTO token_holders (user_address, coin_type, balance, first_acquired_at, last_updated_at)
       VALUES ($1, $2, -$3::bigint, $4, $4)
       ON CONFLICT (user_address, coin_type) 
       DO UPDATE SET 
         balance = token_holders.balance - $3::bigint,
         last_updated_at = $4`,
      [seller, coinType, tokensIn, timestamp]
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
    
    // Fetch latest curve state from blockchain to get accurate supply
    try {
      const curveObject = await withTimeout(
        client.getObject({
          id: curveId,
          options: { showContent: true },
        }),
        10000,
        'getObject (refresh curve)'
      );
      
      if (curveObject.data?.content?.dataType === 'moveObject') {
        const fields = curveObject.data.content.fields;
        await db.query(
          `UPDATE tokens SET curve_supply = $1, curve_balance = $2, updated_at = NOW() WHERE coin_type = $3`,
          [fields.token_supply || '0', fields.sui_reserve || '0', coinType]
        );
      }
    } catch (error) {
      console.warn('Failed to refresh curve state:', error.message);
    }
    
    // Update token price and market data (using fresh supply)
    await updateTokenPriceAndMarketCap(coinType);
    
    console.log(`💸 Sell: ${seller.slice(0, 10)}... sold ${(parseFloat(tokensIn) / 1e9).toFixed(2)} tokens for ${(parseFloat(suiOut) / 1e9).toFixed(4)} SUILFG @ ${pricePerToken.toFixed(10)}`);
    
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

// Generate OHLCV candles from trades with fill-forward for continuous charts
async function generateCandles() {
  try {
    // Get all tokens
    const tokensResult = await db.query('SELECT coin_type, created_at FROM tokens');
    
    for (const { coin_type, created_at } of tokensResult.rows) {
      // Get all trades for this token
      const tradesResult = await db.query(
        `SELECT timestamp, price_per_token, CAST(token_amount AS NUMERIC) as token_amount
         FROM trades
         WHERE coin_type = $1
         ORDER BY timestamp ASC`,
        [coin_type]
      );

      if (tradesResult.rows.length === 0) continue;

      const trades = tradesResult.rows;
      
      // Only generate candles for the last 24 hours (not from creation!)
      // This makes candle generation 100x faster
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endTime = now;
      
      // Get price at start of period (or first trade price)
      let currentPrice = parseFloat(trades[0].price_per_token);
      if (trades.length > 0) {
        const recentTrades = trades.filter(t => new Date(t.timestamp) > startTime);
        if (recentTrades.length > 0) {
          currentPrice = parseFloat(recentTrades[0].price_per_token);
        }
      }
      
      let tradeIndex = 0;

      // Generate candles for every minute in last 24 hours
      const candles = [];
      for (let time = new Date(startTime); time <= endTime; time = new Date(time.getTime() + 60000)) {
        const candleStart = new Date(time);
        const candleEnd = new Date(time.getTime() + 60000);

        // Find trades in this minute
        const candleTrades = [];
        while (tradeIndex < trades.length) {
          const tradeTime = new Date(trades[tradeIndex].timestamp);
          if (tradeTime >= candleStart && tradeTime < candleEnd) {
            candleTrades.push(trades[tradeIndex]);
            tradeIndex++;
          } else if (tradeTime >= candleEnd) {
            break;
          } else {
            tradeIndex++;
          }
        }

        let open, high, low, close, volume;
        if (candleTrades.length > 0) {
          // Candle with trades
          const prices = candleTrades.map(t => parseFloat(t.price_per_token));
          open = prices[0];
          high = Math.max(...prices);
          low = Math.min(...prices);
          close = prices[prices.length - 1];
          volume = candleTrades.reduce((sum, t) => sum + parseFloat(t.token_amount), 0);
          currentPrice = close;
        } else {
          // No trades - flat candle at last price (fill-forward)
          open = high = low = close = currentPrice;
          volume = 0;
        }

        candles.push({ time: candleStart, open, high, low, close, volume });
      }

      // Batch insert candles
      for (const candle of candles) {
        await db.query(
          `INSERT INTO price_snapshots (coin_type, timestamp, open, high, low, close, volume)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (coin_type, timestamp) DO UPDATE SET
             open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
             close = EXCLUDED.close, volume = EXCLUDED.volume`,
          [coin_type, candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume]
        );
      }
    }
  } catch (error) {
    console.error('Failed to generate candles:', error.message);
  }
}

// Calculate bonding curve spot price at given supply (EXACT contract formula!)
function calculateSpotPrice(supplyInWholeTokens) {
  const M_NUM = 1n;
  const M_DEN = 10593721631205n; // EXACT value from contract (line 48)
  const BASE_PRICE_MIST = 1_000n; // 0.000001 SUI
  const MIST_PER_SUI = 1_000_000_000n; // 1e9
  
  const supply = BigInt(Math.floor(supplyInWholeTokens));
  
  // p(s) = base_price_mist + (m_num * s^2) / m_den
  // This EXACT formula is from bonding_curve.move line 946-952
  const supplySquared = supply * supply;
  const priceIncrease = (M_NUM * supplySquared) / M_DEN;
  const totalPriceMist = BASE_PRICE_MIST + priceIncrease;
  
  // Convert to SUI
  return Number(totalPriceMist) / Number(MIST_PER_SUI);
}

// Update token price and market cap based on BONDING CURVE (not last trade!)
async function updateTokenPriceAndMarketCap(coinType) {
  try {
    // Get curve data from tokens table
    const tokenResult = await db.query(
      `SELECT curve_supply, curve_balance FROM tokens WHERE coin_type = $1`,
      [coinType]
    );
    
    if (tokenResult.rows.length === 0) {
      return; // Token not found
    }
    
    const curveSupplyMist = BigInt(tokenResult.rows[0]?.curve_supply || '0');
    const curveSupply = Number(curveSupplyMist) / 1e9; // Convert to whole tokens
    
    // Calculate REAL current price from bonding curve (like pump.fun!)
    const currentPrice = calculateSpotPrice(curveSupply);
    
    // Get last trade timestamp
    const latestTradeResult = await db.query(
      `SELECT timestamp 
       FROM trades 
       WHERE coin_type = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [coinType]
    );
    
    const lastTradeAt = latestTradeResult.rows.length > 0 
      ? latestTradeResult.rows[0].timestamp 
      : null;
    
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
    
    // MARKET CAP = CURRENT BONDING CURVE PRICE × TOTAL SUPPLY (1B)
    // This is the CORRECT way like pump.fun does it!
    const totalSupply = 1_000_000_000;
    const marketCap = currentPrice * totalSupply;
    
    // FDV (Fully Diluted Valuation):
    // Same as market cap for bonding curve tokens (all tokens exist)
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
