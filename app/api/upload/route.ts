import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Upload to Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `suilfg-meme-${Date.now()}`,
    });
    pinataFormData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });
    pinataFormData.append('pinataOptions', pinataOptions);

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: pinataFormData,
    });

    if (!pinataResponse.ok) {
      const error = await pinataResponse.text();
      console.error('Pinata upload failed:', error);
      return NextResponse.json(
        { error: 'Failed to upload to IPFS' },
        { status: 500 }
      );
    }

    const pinataData = await pinataResponse.json();
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${pinataData.IpfsHash}`;

    return NextResponse.json({
      success: true,
      ipfsHash: pinataData.IpfsHash,
      url: ipfsUrl,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';
export const maxDuration = 30;
