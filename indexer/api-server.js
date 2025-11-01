import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.API_PORT || 3001;

// Connect to database
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all tokens
app.get('/api/tokens', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50');
    const offset = parseInt(req.query.offset || '0');
    const sort = req.query.sort || 'newest';

    let orderBy = 'created_at DESC';
    if (sort === 'marketcap') orderBy = 'market_cap_sui DESC NULLS LAST';
    if (sort === 'volume') orderBy = 'volume_24h_sui DESC NULLS LAST';
    if (sort === 'price_change') orderBy = 'price_change_24h DESC NULLS LAST';
    if (sort === 'progress') orderBy = 'curve_supply DESC';

    // Get all tokens with social links and cetus pool
    // If columns don't exist, this will throw an error - user needs to run migration
    const query = `SELECT id, coin_type, ticker, name, description, image_url, creator, 
              curve_supply, curve_balance, graduated, created_at,
              current_price_sui, market_cap_sui, fully_diluted_valuation_sui,
              volume_24h_sui, price_change_24h, all_time_high_sui, all_time_low_sui,
              last_trade_at,
              twitter, telegram, website, cetus_pool_address
              FROM tokens ORDER BY ${orderBy} LIMIT $1 OFFSET $2`;
    
    const result = await db.query(query, [limit, offset]);

    const tokens = result.rows.map(row => ({
      id: row.id,
      coinType: row.coin_type,
      ticker: row.ticker,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      creator: row.creator,
      curveSupply: row.curve_supply,
      curveBalance: row.curve_balance,
      graduated: row.graduated,
      createdAt: new Date(row.created_at).getTime(),
      // Market data
      currentPrice: parseFloat(row.current_price_sui) || 0,
      marketCap: parseFloat(row.market_cap_sui) || 0,
      fullyDilutedValuation: parseFloat(row.fully_diluted_valuation_sui) || 0,
      volume24h: row.volume_24h_sui || '0',
      priceChange24h: parseFloat(row.price_change_24h) || 0,
      allTimeHigh: parseFloat(row.all_time_high_sui) || 0,
      allTimeLow: parseFloat(row.all_time_low_sui) || 0,
      lastTradeAt: row.last_trade_at ? new Date(row.last_trade_at).getTime() : null,
      // Social links (may be undefined if columns don't exist yet)
      twitter: row.twitter || null,
      telegram: row.telegram || null,
      website: row.website || null,
      cetusPoolAddress: row.cetus_pool_address || null,
    }));

    res.json({
      tokens,
      count: result.rows.length,
      hasMore: result.rows.length === limit,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chart data - Generate candles on-demand from trades
app.get('/api/chart/:coinType', async (req, res) => {
  try {
    const coinType = decodeURIComponent(req.params.coinType);
    const interval = req.query.interval || '1m';
    const limit = parseInt(req.query.limit || '1440'); // 24 hours of 1-minute candles

    // Fetch trades for the last 24 hours
    const tradesResult = await db.query(
      `SELECT 
        timestamp,
        price_per_token,
        CAST(token_amount AS NUMERIC) as token_amount
       FROM trades
       WHERE coin_type = $1
         AND timestamp > NOW() - INTERVAL '24 hours'
       ORDER BY timestamp ASC`,
      [coinType]
    );

    if (tradesResult.rows.length === 0) {
      return res.json({ coinType, interval, candles: [] });
    }

    const trades = tradesResult.rows;
    
    // Generate 1-minute candles from trades
    const currentTime = new Date();
    const chartStartTime = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    const candles = [];
    
    // Get initial price (first trade price or 0)
    let currentPrice = parseFloat(trades[0].price_per_token);
    let tradeIndex = 0;

    // Generate candles for each minute in last 24 hours
    // Safety: limit to max 1440 candles (24 hours × 60 minutes)
    let candleCount = 0;
    const MAX_CANDLES = 1440;
    
    for (let candleTime = new Date(chartStartTime); candleTime <= currentTime && candleCount < MAX_CANDLES; candleTime = new Date(candleTime.getTime() + 60000)) {
      const candleStart = candleTime;
      const candleEnd = new Date(candleTime.getTime() + 60000);
      candleCount++;

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
        // No trades - flat candle at last price
        open = high = low = close = currentPrice;
        volume = 0;
      }

      candles.push({
        time: candleStart.getTime(),
        open,
        high,
        low,
        close,
        volume: volume.toString(),
      });
    }

    res.json({ coinType, interval, candles: candles.slice(-limit) });
  } catch (error) {
    console.error('Chart API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update token metadata (image, social links)
app.post('/api/update-metadata', async (req, res) => {
  try {
    const { coinType, imageUrl, twitter, telegram, website } = req.body;

    if (!coinType) {
      return res.status(400).json({ error: 'coinType is required' });
    }

    // Update token metadata
    await db.query(
      `UPDATE tokens SET
        image_url = COALESCE($2, image_url),
        twitter = COALESCE($3, twitter),
        telegram = COALESCE($4, telegram),
        website = COALESCE($5, website),
        updated_at = NOW()
       WHERE coin_type = $1`,
      [coinType, imageUrl || null, twitter || null, telegram || null, website || null]
    );

    console.log(`📝 Updated metadata for ${coinType}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Cetus pool address (called by bot after pool creation)
app.post('/api/update-pool', async (req, res) => {
  try {
    const { coinType, poolAddress } = req.body;

    if (!coinType || !poolAddress) {
      return res.status(400).json({ error: 'coinType and poolAddress are required' });
    }

    // Update token with Cetus pool address
    await db.query(
      `UPDATE tokens SET
        cetus_pool_address = $2,
        updated_at = NOW()
       WHERE coin_type = $1`,
      [coinType, poolAddress]
    );

    console.log(`🏊 Updated Cetus pool for ${coinType}: ${poolAddress}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Update pool error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trade history
app.get('/api/trades/:coinType', async (req, res) => {
  try {
    const coinType = decodeURIComponent(req.params.coinType);
    const limit = parseInt(req.query.limit || '50');

    const result = await db.query(
      `SELECT 
        tx_digest,
        trader,
        trade_type,
        sui_amount,
        token_amount,
        price_per_token,
        timestamp
       FROM trades
       WHERE coin_type = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [coinType, limit]
    );

    const trades = result.rows.map(row => ({
      tx_digest: row.tx_digest,
      trader: row.trader,
      type: row.trade_type,
      sui_amount: row.sui_amount,
      token_amount: row.token_amount,
      price_per_token: parseFloat(row.price_per_token),
      timestamp: new Date(row.timestamp).toISOString(),
    }));

    res.json({ coinType, trades, count: trades.length });
  } catch (error) {
    console.error('Trades API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user referral info
app.get('/api/referral/:address', async (req, res) => {
  try {
    const address = req.params.address;
    
    // Get if user was referred by someone
    const refereeResult = await db.query(
      `SELECT referrer, first_trade_at, trade_count
       FROM referrals
       WHERE referee = $1`,
      [address]
    );
    
    // Get users this address has referred
    const referrerResult = await db.query(
      `SELECT referee, first_trade_at, trade_count, total_rewards
       FROM referrals
       WHERE referrer = $1
       ORDER BY first_trade_at DESC`,
      [address]
    );
    
    // Calculate total rewards earned as referrer
    const rewardsResult = await db.query(
      `SELECT COALESCE(SUM(total_rewards), 0) as total_earned
       FROM referrals
       WHERE referrer = $1`,
      [address]
    );
    
    res.json({
      address,
      referredBy: refereeResult.rows[0] || null,
      referrals: referrerResult.rows,
      totalReferrals: referrerResult.rows.length,
      totalEarned: rewardsResult.rows[0]?.total_earned || '0',
    });
  } catch (error) {
    console.error('Referral API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user PnL
app.get('/api/pnl/:address', async (req, res) => {
  try {
    const address = req.params.address;
    
    const result = await db.query(
      `SELECT 
        coin_type,
        total_sui_spent,
        total_sui_received,
        total_tokens_bought,
        total_tokens_sold,
        buy_count,
        sell_count,
        realized_pnl,
        last_trade_at
       FROM user_pnl
       WHERE user_address = $1
       ORDER BY last_trade_at DESC`,
      [address]
    );
    
    // Calculate overall PnL
    const totalPnl = result.rows.reduce((sum, row) => 
      sum + BigInt(row.realized_pnl), BigInt(0)
    );
    
    res.json({
      address,
      tokens: result.rows.map(row => ({
        coinType: row.coin_type,
        suiSpent: row.total_sui_spent,
        suiReceived: row.total_sui_received,
        tokensBought: row.total_tokens_bought,
        tokensSold: row.total_tokens_sold,
        buyCount: row.buy_count,
        sellCount: row.sell_count,
        realizedPnl: row.realized_pnl,
        lastTradeAt: new Date(row.last_trade_at).getTime(),
      })),
      totalPnl: totalPnl.toString(),
    });
  } catch (error) {
    console.error('PnL API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard (top PnL)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50');
    
    const result = await db.query(
      `SELECT 
        user_address,
        SUM(realized_pnl) as total_pnl,
        SUM(buy_count + sell_count) as total_trades,
        MAX(last_trade_at) as last_trade
       FROM user_pnl
       GROUP BY user_address
       ORDER BY total_pnl DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json({
      leaderboard: result.rows.map((row, index) => ({
        rank: index + 1,
        address: row.user_address,
        pnl: row.total_pnl,
        trades: parseInt(row.total_trades),
        lastTrade: new Date(row.last_trade).getTime(),
      })),
    });
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get token holders
app.get('/api/holders/:coinType', async (req, res) => {
  try {
    const coinType = decodeURIComponent(req.params.coinType);
    const limit = parseInt(req.query.limit || '100');
    const minBalance = req.query.minBalance || '0';
    
    // Get all holders with balance > minBalance
    const holdersResult = await db.query(
      `SELECT 
        user_address,
        balance,
        first_acquired_at,
        last_updated_at
       FROM token_holders
       WHERE coin_type = $1 AND balance > $2
       ORDER BY balance DESC
       LIMIT $3`,
      [coinType, minBalance, limit]
    );
    
    // Get total holder count
    const countResult = await db.query(
      `SELECT COUNT(*) as total_holders, SUM(balance) as total_held
       FROM token_holders
       WHERE coin_type = $1 AND balance > 0`,
      [coinType]
    );
    
    // Get top 10 holders for distribution stats
    const top10Result = await db.query(
      `SELECT SUM(balance) as top10_balance
       FROM (
         SELECT balance 
         FROM token_holders 
         WHERE coin_type = $1 AND balance > 0
         ORDER BY balance DESC 
         LIMIT 10
       ) as top10`,
      [coinType]
    );
    
    const totalHeld = countResult.rows[0]?.total_held || '0';
    const top10Balance = top10Result.rows[0]?.top10_balance || '0';
    const top10Percentage = totalHeld > 0 
      ? (parseFloat(top10Balance) / parseFloat(totalHeld) * 100).toFixed(2)
      : '0';
    
    res.json({
      coinType,
      holders: holdersResult.rows.map(row => ({
        address: row.user_address,
        balance: row.balance,
        percentage: totalHeld > 0 
          ? (parseFloat(row.balance) / parseFloat(totalHeld) * 100).toFixed(4)
          : '0',
        firstAcquiredAt: new Date(row.first_acquired_at).getTime(),
        lastUpdatedAt: new Date(row.last_updated_at).getTime(),
      })),
      stats: {
        totalHolders: parseInt(countResult.rows[0]?.total_holders || '0'),
        totalHeld: totalHeld,
        top10Percentage: top10Percentage,
      },
    });
  } catch (error) {
    console.error('Holders API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's token holdings
app.get('/api/holdings/:address', async (req, res) => {
  try {
    const address = req.params.address;
    
    const result = await db.query(
      `SELECT 
        coin_type,
        balance,
        first_acquired_at,
        last_updated_at
       FROM token_holders
       WHERE user_address = $1 AND balance > 0
       ORDER BY last_updated_at DESC`,
      [address]
    );
    
    res.json({
      address,
      holdings: result.rows.map(row => ({
        coinType: row.coin_type,
        balance: row.balance,
        firstAcquiredAt: new Date(row.first_acquired_at).getTime(),
        lastUpdatedAt: new Date(row.last_updated_at).getTime(),
      })),
      totalTokens: result.rows.length,
    });
  } catch (error) {
    console.error('Holdings API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get holder count for multiple tokens (batch query)
app.post('/api/holders/batch', async (req, res) => {
  try {
    const { coinTypes } = req.body;
    
    if (!Array.isArray(coinTypes) || coinTypes.length === 0) {
      return res.status(400).json({ error: 'coinTypes array required' });
    }
    
    // Limit to 50 tokens per request
    const limited = coinTypes.slice(0, 50);
    
    const result = await db.query(
      `SELECT 
        coin_type,
        COUNT(*) as holder_count,
        SUM(balance) as total_held
       FROM token_holders
       WHERE coin_type = ANY($1) AND balance > 0
       GROUP BY coin_type`,
      [limited]
    );
    
    // Create map for quick lookup
    const holderMap = {};
    result.rows.forEach(row => {
      holderMap[row.coin_type] = {
        holderCount: parseInt(row.holder_count),
        totalHeld: row.total_held,
      };
    });
    
    res.json({
      holders: limited.map(coinType => ({
        coinType,
        holderCount: holderMap[coinType]?.holderCount || 0,
        totalHeld: holderMap[coinType]?.totalHeld || '0',
      })),
    });
  } catch (error) {
    console.error('Batch Holders API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
