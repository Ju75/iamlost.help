// src/app/api/found-item/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// Generate a realistic-looking encrypted token for any input
function generateToken(input: string): string {
  // Create a deterministic but realistic-looking token
  // Use the same length and pattern as real encrypted tokens
  const hash = createHash('sha256').update(`token_salt_${input}_${process.env.NEXTAUTH_SECRET || 'fallback'}`).digest('hex');
  return hash.substring(0, 64); // Same length as real tokens
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayId } = body;

    if (!displayId) {
      // Generate token even for missing IDs
      const token = generateToken('missing_id_' + Date.now());
      return NextResponse.json({
        success: true,
        encryptedToken: token
      });
    }

    // Always generate a token based on the input ID
    // This ensures the same ID always gets the same token
    // NO checking if ID is real or fake - same experience for all
    const token = generateToken(displayId.toUpperCase());

    return NextResponse.json({
      success: true,
      encryptedToken: token
    });

  } catch (error) {
    console.error('Error in lookup API:', error);
    
    // Even on errors, return a token
    const token = generateToken('error_' + Date.now());
    return NextResponse.json({
      success: true,
      encryptedToken: token
    });
  }
}
