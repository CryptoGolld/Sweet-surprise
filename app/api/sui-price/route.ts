import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 }, // Cache on server side for 30 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      price: data.sui.usd,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to fetch SUI price from CoinGecko:', error);
    
    // Return fallback price with error indicator
    return NextResponse.json(
      {
        price: 2.1, // Reasonable fallback
        timestamp: Date.now(),
        error: 'Failed to fetch from CoinGecko',
      },
      { status: 200 } // Still return 200 so frontend doesn't break
    );
  }
}
