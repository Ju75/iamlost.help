// src/app/api/found-item/validate/route.ts - FIXED VERSION
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

    // Try to find the real display ID from the encrypted token
    try {
      const uniqueIdRecord = await prisma.uniqueId.findUnique({
        where: { encryptedToken },
        select: { 
          displayId: true,
          userId: true,
          status: true,
          user: {
            select: {
              status: true
            }
          }
        }
      });

      console.log('👤 Database lookup result:', uniqueIdRecord ? 'FOUND' : 'NOT FOUND');

      if (uniqueIdRecord && uniqueIdRecord.status === 'ACTIVE' && uniqueIdRecord.user.status === 'ACTIVE') {
        // Check if user has active subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            userId: uniqueIdRecord.userId,
            status: 'ACTIVE',
            currentPeriodEnd: {
              gt: new Date()
            }
          }
        });

        console.log('💳 Subscription found:', subscription ? 'YES' : 'NO');

        if (subscription) {
          console.log('✅ Real user validation successful');

          const responseData = {
            success: true,
            displayId: uniqueIdRecord.displayId, // FIXED: Return the REAL display ID from database
            isRealUser: true
          };

          console.log('📤 Returning real user data:', responseData);
          return NextResponse.json(responseData);
        }
      }
    } catch (error) {
      console.log('Error validating real user, falling back to fake user behavior');
    }

    // For fake tokens, check if we have the original ID in sessionStorage (handled client-side)
    // or return a deterministic ID based on the token
    console.log('✅ Fake ID validation - returning deterministic ID');

    // Check if this might be a fake token with stored original ID
    // The client should handle getting the original ID from sessionStorage
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
