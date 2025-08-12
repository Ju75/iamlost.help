// src/app/api/found-item/validate/route.ts - COMPLETE VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromEncryptedToken } from '@/lib/unique-id';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Generate deterministic ID from token as fallback
function generateDeterministicIdFromToken(token: string): string {
  const hash = createHash('md5').update(token).digest('hex');
  
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
  const numbers = '123456789';
  
  let result = '';
  
  for (let i = 0; i < 3; i++) {
    const index = parseInt(hash.substring(i * 2, i * 2 + 2), 16) % letters.length;
    result += letters[index];
  }
  
  for (let i = 3; i < 6; i++) {
    const index = parseInt(hash.substring(i * 2, i * 2 + 2), 16) % numbers.length;
    result += numbers[index];
  }
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Validate API called');
    
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { encryptedToken } = body;

    if (!encryptedToken) {
      console.log('❌ No encrypted token provided');
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
      console.log('👤 No real user found for token');
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

    // For fake tokens, return a deterministic ID
    // The client should handle getting the original ID from sessionStorage
    console.log('✅ Fake ID validation - returning deterministic ID');

    const responseData = {
      success: true,
      displayId: generateDeterministicIdFromToken(encryptedToken),
      isRealUser: false
    };

    console.log('📤 Returning fake user data:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error in validate API:', error);
    
    return NextResponse.json({
      success: true,
      displayId: 'ERROR1',
      isRealUser: false
    });
  }
}
