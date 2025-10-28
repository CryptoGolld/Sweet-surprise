import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('📁 File received:', { name: file.name, size: file.size, type: file.type });

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Check Pinata JWT
    if (!process.env.PINATA_JWT) {
      console.error('❌ PINATA_JWT not configured');
      return NextResponse.json({ error: 'IPFS upload not configured' }, { status: 500 });
    }

    console.log('☁️ Uploading to Pinata...');

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

    console.log('📡 Pinata response status:', pinataResponse.status);

    if (!pinataResponse.ok) {
      const error = await pinataResponse.text();
      console.error('❌ Pinata upload failed:', error);
      return NextResponse.json(
        { error: 'Failed to upload to IPFS: ' + error },
        { status: 500 }
      );
    }

    const pinataData = await pinataResponse.json();
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${pinataData.IpfsHash}`;

    console.log('✅ Upload successful!', { ipfsHash: pinataData.IpfsHash, url: ipfsUrl });

    return NextResponse.json({
      success: true,
      ipfsHash: pinataData.IpfsHash,
      url: ipfsUrl,
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
