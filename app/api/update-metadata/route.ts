import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coinType, imageUrl, twitter, telegram, website } = body;

    if (!coinType) {
      return NextResponse.json({ error: 'coinType is required' }, { status: 400 });
    }

    // Update token metadata in indexer database via API
    const indexerApiUrl = process.env.INDEXER_API_URL || 'http://localhost:3002';
    
    const response = await fetch(`${indexerApiUrl}/api/update-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coinType,
        imageUrl,
        twitter,
        telegram,
        website,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update metadata in indexer');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update metadata error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update metadata' },
      { status: 500 }
    );
  }
}
