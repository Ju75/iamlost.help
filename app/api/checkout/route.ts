// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createCheckoutSession, createStripeCustomer, getPlanById } from '@/lib/stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;

    // Require authentication
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);

    // Validate plan
    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    
    // Check if user already has a Stripe customer ID
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      select: { stripeCustomerId: true }
    });

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await createStripeCustomer(
        user.email,
        `${user.firstName || ''} ${user.lastName || ''}`.trim()
      );
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      planId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      url: session.url
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
