import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route to forward compilation requests to Ubuntu server
 * This avoids HTTPS->HTTP mixed content issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the imageUrl being sent for debugging
    console.log('📸 Compile request - imageUrl:', body.imageUrl || '(empty)');
    console.log('📦 Compile request - ticker:', body.ticker, 'name:', body.name);
    
    // Forward to Ubuntu compilation service
    const ubuntuUrl = process.env.COMPILE_SERVICE_URL || 'http://13.60.235.109:3001';
    
    const response = await fetch(`${ubuntuUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(error, { status: response.status });
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reach compilation service',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
