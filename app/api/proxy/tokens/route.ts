import { NextRequest, NextResponse } from 'next/server';

const INDEXER_API = 'http://13.60.235.109:3002';

// Mark route as dynamic to avoid static rendering errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const indexerUrl = `${INDEXER_API}/api/tokens${queryString ? `?${queryString}` : ''}`;
    
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
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=5',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from indexer', details: error.message },
      { status: 500 }
    );
  }
}
