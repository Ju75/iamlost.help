// src/app/api/found-item/lookup/route.ts - PRODUCTION VERSION (No Debug Logs)
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

    if (!displayId) {
      const fakeToken = generateFakeToken('missing_id_' + Date.now());
      return NextResponse.json({
        success: true,
        encryptedToken: fakeToken
      });
    }

    const normalizedId = normalizeDisplayId(displayId);
    
    // Get user and encrypted token from display ID
    const result = await getUserFromDisplayId(normalizedId);

    if (!result) {
      const fakeToken = generateFakeToken(normalizedId);
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
      const fakeToken = generateFakeToken(normalizedId + '_expired');
      return NextResponse.json({
        success: true,
        encryptedToken: fakeToken
      });
    }

    // SUCCESS - Return the REAL encrypted token from database
    return NextResponse.json({
      success: true,
      encryptedToken: result.encryptedToken
    });

  } catch (error) {
    console.error('Error in lookup API:', error);
    const fakeToken = generateFakeToken('error_' + Date.now());
    return NextResponse.json({
      success: true,
      encryptedToken: fakeToken
    });
  }
}
