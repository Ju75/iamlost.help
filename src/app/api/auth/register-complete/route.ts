import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createCheckoutSession, createStripeCustomer, getPlanById } from '@/lib/stripe';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user with plan selection
    const user = await prisma.user.findUnique({
      where: { 
        id: userId,
        status: 'PENDING',
        registrationStep: 'PLAN_SELECTED'
      }
    });

    if (!user || !user.selectedPlanId) {
      return NextResponse.json(
        { error: 'User not found or plan not selected' },
        { status: 404 }
      );
    }

    // Validate selected plan
    const plan = getPlanById(user.selectedPlanId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Create Stripe customer
    const customer = await createStripeCustomer(
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim()
    );

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: customer.id,
      planId: user.selectedPlanId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?welcome=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register?step=payment&canceled=true&user_id=${userId}`,
      userId: user.id
    });

    // Update user registration step
    await prisma.user.update({
      where: { id: userId },
      data: {
        registrationStep: 'PAYMENT_STARTED',
        statusChangedAt: new Date(),
        statusMetadata: JSON.stringify({
          stripeCustomerId: customer.id,
          checkoutSessionId: session.id,
          selectedPlan: plan.name,
          paymentStartedAt: new Date().toISOString()
        })
      }
    });

    // Log payment initiation
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REGISTRATION_PAYMENT_STARTED',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({
          step: 'PAYMENT_STARTED',
          planId: user.selectedPlanId,
          planName: plan.name,
          amount: plan.price,
          stripeCustomerId: customer.id,
          checkoutSessionId: session.id
        }),
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    console.log(`✅ Payment started for user: ${user.email} (Session: ${session.id})`);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      message: 'Redirecting to payment...'
    });

  } catch (error: any) {
    console.error('Register complete error:', error);
    
    // Log the error
    if (body?.userId) {
      try {
        await prisma.user.update({
          where: { id: body.userId },
          data: {
            registrationStep: 'PAYMENT_FAILED',
            statusChangedAt: new Date(),
            statusMetadata: JSON.stringify({
              error: error.message,
              failedAt: new Date().toISOString()
            })
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: body.userId,
            action: 'REGISTRATION_PAYMENT_FAILED',
            resourceType: 'User',
            resourceId: body.userId,
            details: JSON.stringify({
              error: error.message,
              step: 'PAYMENT_FAILED'
            })
          }
        });
      } catch (logError) {
        console.error('Failed to log payment error:', logError);
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
