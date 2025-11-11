'use server';

import { NextResponse } from 'next/server';

interface CoinGeckoResponse {
  sui?: {
    usd?: number;
  };
}

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd';
const CACHE_TTL_MS = 30_000; // 30 seconds
const FALLBACK_PRICE = 2.1;

let cachedPrice = FALLBACK_PRICE;
let lastFetched = 0;

export async function GET() {
  const now = Date.now();

  if (now - lastFetched < CACHE_TTL_MS && cachedPrice > 0) {
    return NextResponse.json({
      price: cachedPrice,
      source: 'cache',
      lastUpdated: new Date(lastFetched).toISOString(),
    });
  }

  try {
    const response = await fetch(COINGECKO_URL, {
      headers: {
        Accept: 'application/json',
      },
      // Don't let Next cache this automatically—we manage it ourselves
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}`);
    }

    const data = (await response.json()) as CoinGeckoResponse;
    const price = data.sui?.usd;

    if (typeof price === 'number' && price > 0) {
      cachedPrice = price;
      lastFetched = now;

      return NextResponse.json({
        price,
        source: 'coingecko',
        lastUpdated: new Date(lastFetched).toISOString(),
      });
    }

    throw new Error('CoinGecko response missing price');
  } catch (error) {
    console.error('Failed to fetch SUI price from CoinGecko:', error);
    return NextResponse.json(
      {
        price: cachedPrice,
        source: 'fallback',
        lastUpdated: new Date(lastFetched || now).toISOString(),
      },
      { status: 200 },
    );
  }
}
