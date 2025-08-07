// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createCheckoutSession, createStripeCustomer, getPlanById } from '@/lib/stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);

    // Get request data
    const { planId } = await request.json();

    // Validate plan
    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({
        success: false,
        error: 'Invalid subscription plan'
      }, { status: 400 });
    }

    // Check if user already has active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        currentPeriodEnd: {
          gt: new Date()
        }
      }
    });

    if (existingSubscription) {
      return NextResponse.json({
        success: false,
        error: 'You already have an active subscription'
      }, { status: 409 });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    
    const existingCustomer = await prisma.subscription.findFirst({
      where: { userId: user.id },
      select: { stripeCustomerId: true }
    });

    if (existingCustomer?.stripeCustomerId) {
      stripeCustomerId = existingCustomer.stripeCustomerId;
    } else {
      const customer = await createStripeCustomer(
        user.email,
        user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined
      );
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    // Get the origin from the request headers
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      planId: plan.id,
      successUrl: `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/pricing?canceled=true`,
      userId: user.id
    });    

      return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 });
  }
}
