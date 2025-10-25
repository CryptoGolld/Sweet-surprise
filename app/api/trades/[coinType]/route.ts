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
    const limit = parseInt(searchParams.get('limit') || '50');

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

    return NextResponse.json({
      coinType,
      trades,
      count: trades.length,
    });
    
  } catch (error: any) {
    console.error('Trades API Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
