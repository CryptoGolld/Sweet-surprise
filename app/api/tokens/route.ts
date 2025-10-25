import { NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

// Connect to indexer database
const db = process.env.INDEXER_DB_URL 
  ? new Pool({ connectionString: process.env.INDEXER_DB_URL })
  : null;

export async function GET(request: Request) {
  // If no indexer, fall back to blockchain query
  if (!db) {
    return NextResponse.json({ 
      error: 'Indexer not configured',
      fallback: true 
    }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'newest';

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

    return NextResponse.json({
      tokens,
      count: result.rows.length,
      hasMore: result.rows.length === limit,
    });
    
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: error.message,
      fallback: true 
    }, { status: 500 });
  }
}
