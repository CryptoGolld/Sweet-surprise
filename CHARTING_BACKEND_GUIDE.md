# Charting Backend Integration Guide

## What You Need: **Indexer + Time-Series Database**

The term you're looking for is likely one of these:

### 1. **Blockchain Indexer** (Most Common)
An indexer watches blockchain events and stores historical data in a queryable database.

Popular options:
- **The Graph Protocol** (Subgraph) - Decentralized indexer
- **Ponder** - TypeScript-based indexer
- **Custom Indexer** - Your own Node.js service

### 2. **Time-Series Database**
For storing OHLCV (Open, High, Low, Close, Volume) data:
- **TimescaleDB** (PostgreSQL extension)
- **InfluxDB**
- **Cassandra**

---

## Recommended Solution: Custom Indexer + TimescaleDB

### Why?
- Full control over your data
- Can aggregate data into candles (1m, 5m, 1h, 1d)
- Fast queries for charts
- Can add custom metrics (holder count, transaction count, etc.)

---

## Architecture

```
Sui Blockchain
     ↓
[Your Indexer Service]
  - Watches events
  - Processes trades
  - Calculates OHLCV
     ↓
[TimescaleDB / PostgreSQL]
  - Stores price history
  - Stores volume data
  - Stores holder data
     ↓
[Your API]
  - GET /api/chart/:coinType?timeframe=1h
  - GET /api/price/:coinType
  - GET /api/volume/:coinType
     ↓
[Frontend Chart Library]
  - TradingView Lightweight Charts
  - Recharts
  - Chart.js
```

---

## Implementation Steps

### Step 1: Create Indexer Service

```typescript
// indexer/index.ts
import { SuiClient } from '@mysten/sui/client';
import { Pool } from 'pg';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function indexTrades() {
  let cursor = null;
  
  while (true) {
    // Query Buy events
    const buyEvents = await client.queryEvents({
      query: {
        MoveEventType: `${PLATFORM_PACKAGE}::bonding_curve::TokenPurchased`,
      },
      cursor,
      limit: 100,
    });
    
    for (const event of buyEvents.data) {
      const { coin_type, sui_amount, tokens_out, buyer, timestamp } = event.parsedJson;
      
      // Calculate price per token
      const price = Number(sui_amount) / Number(tokens_out);
      
      // Store in database
      await db.query(
        `INSERT INTO trades (coin_type, price, volume, timestamp, type)
         VALUES ($1, $2, $3, $4, $5)`,
        [coin_type, price, sui_amount, timestamp, 'buy']
      );
    }
    
    // Same for Sell events...
    
    if (buyEvents.hasNextPage) {
      cursor = buyEvents.nextCursor;
    } else {
      // Wait and poll for new events
      await new Promise(resolve => setTimeout(resolve, 2000));
      cursor = null;
    }
  }
}
```

### Step 2: Database Schema

```sql
-- TimescaleDB hypertable for trades
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  coin_type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL, -- 'buy' or 'sell'
  INDEX idx_coin_time (coin_type, timestamp DESC)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('trades', 'timestamp');

-- OHLCV aggregation (updated every minute by cron)
CREATE TABLE candles_1m (
  coin_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  PRIMARY KEY (coin_type, timestamp)
);
```

### Step 3: API Endpoints

```typescript
// api/chart/[coinType].ts
export async function GET(req: Request) {
  const { coinType, timeframe, from, to } = req.query;
  
  // Map timeframe to table
  const table = {
    '1m': 'candles_1m',
    '5m': 'candles_5m',
    '1h': 'candles_1h',
    '1d': 'candles_1d',
  }[timeframe] || 'candles_1h';
  
  const result = await db.query(
    `SELECT timestamp, open, high, low, close, volume
     FROM ${table}
     WHERE coin_type = $1
     AND timestamp >= $2
     AND timestamp <= $3
     ORDER BY timestamp ASC`,
    [coinType, from, to]
  );
  
  return Response.json(result.rows);
}
```

### Step 4: Frontend Integration

```typescript
// components/PriceChart.tsx
import { useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';

export function PriceChart({ coinType }: { coinType: string }) {
  const [chart, setChart] = useState(null);
  
  useEffect(() => {
    const chartInstance = createChart(document.getElementById('chart'), {
      width: 600,
      height: 300,
    });
    
    const candlestickSeries = chartInstance.addCandlestickSeries();
    
    // Fetch chart data
    fetch(`/api/chart/${coinType}?timeframe=1h&from=${Date.now() - 86400000}&to=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        candlestickSeries.setData(data.map(d => ({
          time: new Date(d.timestamp).getTime() / 1000,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })));
      });
    
    return () => chartInstance.remove();
  }, [coinType]);
  
  return <div id="chart" />;
}
```

---

## Simpler Alternative: Use Existing Services

### Option A: Dexscreener-style API
If you integrate with Cetus (DEX), you could use:
- Dexscreener API (if they support Sui)
- Birdeye API
- CoinGecko API (for listed tokens)

### Option B: Client-Side Chart (No Backend)
Calculate candles from recent trades on-the-fly:
- Fetch last 1000 trades from blockchain
- Aggregate into candles in the browser
- Good for MVP, not scalable

---

## Cost Comparison

| Solution | Setup Time | Monthly Cost | Scalability |
|----------|-----------|--------------|-------------|
| Custom Indexer + TimescaleDB | 2-3 days | $20-50 | Excellent |
| The Graph Subgraph | 1-2 days | Free (decentralized) | Good |
| Third-party API | 1 hour | $50-200 | Limited |
| Client-side only | 2 hours | Free | Poor |

---

## Recommended Stack

**For your platform:**
1. **Indexer**: Custom Node.js service (gives you full control)
2. **Database**: PostgreSQL + TimescaleDB extension (free, powerful)
3. **Hosting**: Railway or Render ($5-20/month)
4. **Chart Library**: TradingView Lightweight Charts (free, professional)

---

## Next Steps

1. Set up PostgreSQL with TimescaleDB
2. Create indexer service that watches your bonding curve events
3. Store trades and aggregate into candles
4. Build API endpoints for chart data
5. Integrate TradingView charts in your frontend

Want me to build a basic indexer service for you?
