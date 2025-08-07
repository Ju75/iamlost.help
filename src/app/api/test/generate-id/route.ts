// src/app/api/test/generate-id/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateUniqueId } from '@/lib/unique-id';

export async function GET(request: NextRequest) {
  try {
    // Generate a test unique ID
    const { displayId, encryptedToken } = await generateUniqueId();
    
    return NextResponse.json({
      success: true,
      displayId,
      encryptedToken,
      qrUrl: `https://iamlost.help/found/${encryptedToken}`,
      manualUrl: `https://iamlost.help/found?id=${displayId}`
    });
  } catch (error: any) {
    console.error('Test ID generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
