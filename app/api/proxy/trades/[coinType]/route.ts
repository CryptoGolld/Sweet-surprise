import { NextRequest, NextResponse } from 'next/server';

const INDEXER_API = 'http://13.60.235.109:3002';

export async function GET(
  request: NextRequest,
  { params }: { params: { coinType: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const indexerUrl = `${INDEXER_API}/api/trades/${params.coinType}${queryString ? `?${queryString}` : ''}`;
    
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
        'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=3',
      },
    });
  } catch (error: any) {
    console.error('Trades proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades', details: error.message },
      { status: 500 }
    );
  }
}
