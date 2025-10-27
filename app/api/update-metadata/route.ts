import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coinType, imageUrl, twitter, telegram, website } = body;

    if (!coinType) {
      return NextResponse.json({ error: 'coinType is required' }, { status: 400 });
    }

    // Use the same backend API URL as other proxies
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suilfg.fun';
    
    console.log('Updating metadata:', { coinType, hasImage: !!imageUrl, hasTwitter: !!twitter });
    
    const response = await fetch(`${backendUrl}/api/update-metadata`, {
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
      const error = await response.text();
      console.error('Indexer API error:', error);
      throw new Error(`Failed to update metadata: ${error}`);
    }

    const result = await response.json();
    console.log('Metadata update success:', result);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update metadata error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update metadata' },
      { status: 500 }
    );
  }
}
