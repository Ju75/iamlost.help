// src/app/api/admin/test-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);
    
    // Only allow admin (adjust user ID if needed)
    if (user.id !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create a test subscription for the current user
    const result = await createSubscription({
      userId: user.id,
      planType: 'TWELVE_MONTHS',
      stripeCustomerId: 'test_customer_123',
      stripeSubscriptionId: 'test_sub_123',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    return NextResponse.json({
      success: true,
      message: 'Test subscription created',
      uniqueId: result.uniqueId.displayId,
      encryptedToken: result.uniqueId.encryptedToken
    });

  } catch (error: any) {
    console.error('Test subscription error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
