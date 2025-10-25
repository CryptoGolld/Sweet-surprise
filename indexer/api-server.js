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
    if (sort === 'marketcap') orderBy = 'curve_balance DESC';
    if (sort === 'progress') orderBy = 'curve_supply DESC';
    if (sort === 'volume') orderBy = 'curve_supply DESC';

    const result = await db.query(
      `SELECT id, coin_type, ticker, name, description, image_url, creator, 
              curve_supply, curve_balance, graduated, created_at
       FROM tokens
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

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

// Get chart data
app.get('/api/chart/:coinType', async (req, res) => {
  try {
    const coinType = decodeURIComponent(req.params.coinType);
    const interval = req.query.interval || '1m';
    const limit = parseInt(req.query.limit || '100');

    const intervalMap = {
      '1m': '1 minute',
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '4h': '4 hours',
      '1d': '1 day',
    };

    const pgInterval = intervalMap[interval] || '1 minute';

    const result = await db.query(
      `SELECT 
        date_trunc($2, timestamp) as time,
        (array_agg(open ORDER BY timestamp ASC))[1] as open,
        MAX(high) as high,
        MIN(low) as low,
        (array_agg(close ORDER BY timestamp DESC))[1] as close,
        SUM(volume) as volume
       FROM price_snapshots
       WHERE coin_type = $1
         AND timestamp > NOW() - INTERVAL '7 days'
       GROUP BY time
       ORDER BY time DESC
       LIMIT $3`,
      [coinType, pgInterval, limit]
    );

    const candles = result.rows.map(row => ({
      time: new Date(row.time).getTime(),
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      volume: row.volume,
    }));

    res.json({ coinType, interval, candles });
  } catch (error) {
    console.error('Chart API Error:', error);
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
      txDigest: row.tx_digest,
      trader: row.trader,
      type: row.trade_type,
      suiAmount: row.sui_amount,
      tokenAmount: row.token_amount,
      price: parseFloat(row.price_per_token),
      timestamp: new Date(row.timestamp).getTime(),
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
