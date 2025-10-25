import { NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

const db = process.env.INDEXER_DB_URL 
  ? new Pool({ connectionString: process.env.INDEXER_DB_URL })
  : null;

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  if (!db) {
    return NextResponse.json({ 
      error: 'Indexer not configured' 
    }, { status: 503 });
  }

  try {
    const address = params.address;

    // This would require tracking holdings - for now return token data
    // User's wallet will still query blockchain for actual balances
    const result = await db.query(
      `SELECT id, coin_type, ticker, name, description, image_url,
              curve_supply, curve_balance, graduated
       FROM tokens
       ORDER BY created_at DESC
       LIMIT 100`
    );

    return NextResponse.json({
      tokens: result.rows.map(row => ({
        id: row.id,
        coinType: row.coin_type,
        ticker: row.ticker,
        name: row.name,
        description: row.description,
        imageUrl: row.image_url,
        curveSupply: row.curve_supply,
        curveBalance: row.curve_balance,
        graduated: row.graduated,
      })),
    });
    
  } catch (error: any) {
    console.error('Portfolio API Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
