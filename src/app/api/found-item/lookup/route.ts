// src/app/api/found-item/lookup/route.ts - CLEAN VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromDisplayId, normalizeDisplayId } from '@/lib/unique-id';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Generate a fake token that looks identical to real ones
function generateFakeToken(originalDisplayId: string): string {
  // Generate a realistic 64-character hex token that looks identical to real tokens
  const hash = createHash('sha256')
    .update(`fake_salt_${originalDisplayId}_${Date.now()}_${Math.random()}_${process.env.NEXTAUTH_SECRET || 'fallback'}`)
    .digest('hex');
  
  return hash;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayId } = body;

    console.log('🔍 === LOOKUP API DEBUG ===');
    console.log('🔍 Input displayId:', displayId);

    if (!displayId) {
      const fakeToken = generateFakeToken('DEMO01');
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
      // Generate fake token
      const fakeToken = generateFakeToken(normalizedId);
      console.log('❌ No result from getUserFromDisplayId, returning fake token for:', normalizedId);
      return NextResponse.json({
        success: true,
        encryptedToken: fakeToken,
        // Add the original ID in the response so the client can store it
        _originalId: normalizedId
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
      console.log('❌ No active subscription, returning fake token for:', normalizedId);
      const fakeToken = generateFakeToken(normalizedId);
      return NextResponse.json({
        success: true,
        encryptedToken: fakeToken,
        _originalId: normalizedId
      });
    }

    // ✅ SUCCESS - Return the REAL encrypted token from database
    console.log('✅ SUCCESS: Returning REAL token:', result.encryptedToken);
    
    return NextResponse.json({
      success: true,
      encryptedToken: result.encryptedToken
    });

  } catch (error) {
    console.error('💥 Error in lookup API:', error);
    const fakeToken = generateFakeToken('ERROR1');
    return NextResponse.json({
      success: true,
      encryptedToken: fakeToken,
      _originalId: 'ERROR1'
    });
  }
}
