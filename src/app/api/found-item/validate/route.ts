// src/app/api/found-item/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromEncryptedToken } from '@/lib/unique-id';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Generate a display ID from token for fake IDs (same logic as lookup/route.ts)
function generateDisplayIdFromToken(token: string): string {
  // For fake tokens, just return a consistent display ID
  const hash = createHash('sha256').update(`display_${token}_${process.env.NEXTAUTH_SECRET || 'fallback'}`).digest('hex');
  return hash.substring(0, 6).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Validate API called');
    
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { encryptedToken } = body;

    if (!encryptedToken) {
      console.log('❌ No encrypted token provided');
      // Even for missing token, return success for demo
      return NextResponse.json({
        success: true,
        displayId: 'DEMO01',
        isRealUser: false
      });
    }

    console.log('🔐 Validating token:', encryptedToken.substring(0, 20) + '...');

    // Try to find the user by encrypted token (for real users)
    let userId = null;
    try {
      userId = await getUserFromEncryptedToken(encryptedToken);
      console.log('👤 User ID from token:', userId);
    } catch (error) {
      console.log('👤 No real user found for token (this is expected for fake IDs)');
    }

    if (userId) {
      // Real user found - do full validation
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            firstName: true,
            lastName: true,
            status: true
          }
        });

        console.log('👤 User found:', user ? 'YES' : 'NO');

        if (user && user.status === 'ACTIVE') {
          // Check if user has active subscription
          const subscription = await prisma.subscription.findFirst({
            where: {
              userId,
              status: 'ACTIVE',
              currentPeriodEnd: {
                gt: new Date()
              }
            }
          });

          console.log('💳 Subscription found:', subscription ? 'YES' : 'NO');

          if (subscription) {
            // Get the unique ID record
            const uniqueIdRecord = await prisma.uniqueId.findUnique({
              where: { encryptedToken },
              select: { 
                displayId: true,
                id: true
              }
            });

            console.log('🆔 Unique ID record found:', uniqueIdRecord ? 'YES' : 'NO');

            if (uniqueIdRecord) {
              console.log('✅ Real user validation successful');

              const responseData = {
                success: true,
                displayId: uniqueIdRecord.displayId,
                isRealUser: true
              };

              console.log('📤 Returning real user data:', responseData);
              return NextResponse.json(responseData);
            }
          }
        }
      } catch (error) {
        console.log('Error validating real user, falling back to fake user behavior');
      }
    }

    // If we get here, it's either a fake ID or invalid real ID
    // ALWAYS return success for demo purposes
    const fakeDisplayId = generateDisplayIdFromToken(encryptedToken);
    
    console.log('✅ Fake ID validation - returning success anyway');

    const responseData = {
      success: true,
      displayId: fakeDisplayId,
      isRealUser: false
    };

    console.log('📤 Returning fake user data:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error in validate API:', error);
    
    // Even on error, ALWAYS return success for demo purposes
    const fakeDisplayId = generateDisplayIdFromToken(encryptedToken || 'error');
    
    console.log('✅ Error case - still returning success for demo');
    
    return NextResponse.json({
      success: true,
      displayId: fakeDisplayId,
      isRealUser: false
    });
  }
}
