// src/app/api/found-item/lookup/route.ts - CLEAN VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromDisplayId, normalizeDisplayId } from '@/lib/unique-id';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Generate a realistic-looking encrypted token that's indistinguishable from real ones
function generateFakeToken(input: string): string {
  const hash = createHash('sha256').update(`fake_salt_${input}_${process.env.NEXTAUTH_SECRET || 'fallback'}`).digest('hex');
  return hash.substring(0, 64);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayId } = body;

    console.log('🔍 === LOOKUP API DEBUG ===');
    console.log('🔍 Input displayId:', displayId);

    if (!displayId) {
      const fakeToken = generateFakeToken('missing_id_' + Date.now());
      console.log('❌ No displayId provided');
      return NextResponse.json({
        success: true,
        encryptedToken: fakeToken
      });
    }

    const normalizedId = normalizeDisplayId(displayId);
    console.log('🔍 Normalized ID:', normalizedId);
    
    // Get user and encrypted token from display ID
    const result = await getUserFromDisplayId(normalizedId);
    console.log('📊 getUserFromDisplayId returned:', result ? 'FOUND' : 'NOT FOUND');

    if (!result) {
      const fakeToken = generateFakeToken(normalizedId);
      console.log('❌ No result from getUserFromDisplayId, returning fake token');
      return NextResponse.json({
        success: true,
        encryptedToken: fakeToken
      });
    }

    // Check subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: result.userId,
        status: 'ACTIVE',
        currentPeriodEnd: {
          gt: new Date()
        }
      }
    });

    if (!subscription) {
      console.log('❌ No active subscription, returning fake token');
      const fakeToken = generateFakeToken(normalizedId + '_expired');
      return NextResponse.json({
        success: true,
        encryptedToken: fakeToken
      });
    }

    // ✅ SUCCESS - Return the REAL encrypted token from database
    console.log('✅ SUCCESS: Returning REAL token:', result.encryptedToken);
    console.log('✅ Expected token should be: c39328af99cc3555ecd6c6ce2e373b2c8befbc366d05cad40e47108f2ebc7f1c');
    
    return NextResponse.json({
      success: true,
      encryptedToken: result.encryptedToken
    });

  } catch (error) {
    console.error('💥 Error in lookup API:', error);
    const fakeToken = generateFakeToken('error_' + Date.now());
    return NextResponse.json({
      success: true,
      encryptedToken: fakeToken
    });
  }
}
