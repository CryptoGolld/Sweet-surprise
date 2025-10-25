import { NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

const db = process.env.INDEXER_DB_URL 
  ? new Pool({ connectionString: process.env.INDEXER_DB_URL })
  : null;

export async function GET(
  request: Request,
  { params }: { params: { coinType: string } }
) {
  if (!db) {
    return NextResponse.json({ 
      error: 'Indexer not configured' 
    }, { status: 503 });
  }

  try {
    const coinType = decodeURIComponent(params.coinType);
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1m'; // 1m, 5m, 15m, 1h, 4h, 1d
    const limit = parseInt(searchParams.get('limit') || '100');

    // Map intervals to PostgreSQL intervals
    const intervalMap: Record<string, string> = {
      '1m': '1 minute',
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '4h': '4 hours',
      '1d': '1 day',
    };

    const pgInterval = intervalMap[interval] || '1 minute';

    // Aggregate candles based on interval
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

    return NextResponse.json({
      coinType,
      interval,
      candles,
    });
    
  } catch (error: any) {
    console.error('Chart API Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
