import { NextRequest, NextResponse } from 'next/server';

// Use env var to support both testnet and mainnet
const INDEXER_API = process.env.NEXT_PUBLIC_INDEXER_API || 'http://51.20.74.15:3002';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const indexerUrl = `${INDEXER_API}/api/referral/${params.address}`;
    
    const response = await fetch(indexerUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Indexer returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (error: any) {
    console.error('Referral proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral data', details: error.message },
      { status: 500 }
    );
  }
}
