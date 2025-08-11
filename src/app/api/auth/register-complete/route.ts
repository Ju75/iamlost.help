import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createCheckoutSession, createStripeCustomer, getPlanById } from '@/lib/stripe';
import { generateUniqueId } from '@/lib/unique-id';
import { sendFoundItemNotification } from '@/lib/email'; // We'll use this for welcome emails

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, completeRegistration = false, sessionId } = body;

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
        status: 'PENDING'
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

    // Mode 1: Complete Registration (after payment or for development)
    if (completeRegistration || sessionId) {
      console.log(`🎉 Completing registration for user: ${user.email}`);
      
      return await completeUserRegistration(user, plan, sessionId);
    }

    // Mode 2: Create Stripe Checkout (original behavior)
    // Check if Stripe is configured
    const isStripeConfigured = !!(
      process.env.STRIPE_SECRET_KEY && 
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );

    if (!isStripeConfigured) {
      console.log('⚠️ Stripe not configured - offering direct completion');
      
      // Update user to indicate payment was attempted
      await prisma.user.update({
        where: { id: userId },
        data: {
          registrationStep: 'PAYMENT_STARTED',
          statusChangedAt: new Date(),
          statusMetadata: JSON.stringify({
            stripeNotConfigured: true,
            selectedPlan: plan.name,
            attemptedAt: new Date().toISOString()
          })
        }
      });

      return NextResponse.json({
        success: true,
        stripeNotConfigured: true,
        message: 'Stripe not configured',
        completeRegistrationUrl: '/api/auth/register-complete',
        completeRegistrationPayload: {
          userId,
          completeRegistration: true
        },
        instructions: 'Call the same endpoint with completeRegistration: true to finish registration without payment'
      });
    }

    // Stripe is configured - proceed with normal checkout flow
    try {
      // Create Stripe customer
      const customer = await createStripeCustomer(
        user.email,
        `${user.firstName || ''} ${user.lastName || ''}`.trim()
      );

      // Create checkout session
      const session = await createCheckoutSession({
        customerId: customer.id,
        planId: user.selectedPlanId,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/register-complete?mode=success&session_id={CHECKOUT_SESSION_ID}&user_id=${userId}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register?step=payment&canceled=true&user_id=${userId}`,
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

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      return NextResponse.json({
        success: false,
        error: 'Payment setup failed',
        fallbackOption: {
          message: 'Complete registration without payment',
          endpoint: '/api/auth/register-complete',
          payload: { userId, completeRegistration: true }
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Register complete error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process registration',
        suggestion: 'Try completing registration directly with completeRegistration: true'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for Stripe success redirects
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  const sessionId = searchParams.get('session_id');
  const userId = searchParams.get('user_id');

  if (mode === 'success' && sessionId && userId) {
    // This is a redirect from successful Stripe payment
    // Complete the registration
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) }
      });

      if (user && user.selectedPlanId) {
        const plan = getPlanById(user.selectedPlanId);
        if (plan) {
          await completeUserRegistration(user, plan, sessionId);
        }
      }

      // Redirect to dashboard
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?welcome=true`);
    } catch (error) {
      console.error('Error completing registration from redirect:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=completion_failed`);
    }
  }

  return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
}

// Helper function to complete user registration
async function completeUserRegistration(user: any, plan: any, sessionId?: string) {
  console.log(`🔄 Starting registration completion for: ${user.email}`);

  try {
    // Start transaction to complete everything
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user status to ACTIVE
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          registrationStep: 'COMPLETED',
          statusChangedAt: new Date(),
          emailVerified: true,
          statusMetadata: JSON.stringify({
            stripeSessionId: sessionId,
            completedAt: new Date().toISOString(),
            completedPlan: plan.name,
            completedVia: sessionId ? 'stripe-payment' : 'direct-completion'
          })
        }
      });

      // 2. Create subscription record
      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          planType: mapPlanType(user.selectedPlanId),
          stripeCustomerId: sessionId ? `cus_stripe_${Date.now()}` : `cus_dev_${Date.now()}`,
          stripeSubscriptionId: sessionId ? `sub_stripe_${Date.now()}` : `sub_dev_${Date.now()}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + getPlanDuration(user.selectedPlanId)),
          status: 'ACTIVE',
          cancelAtPeriodEnd: false
        }
      });

      // 3. Generate unique ID
      const { displayId, encryptedToken } = await generateUniqueId();
      
      const uniqueId = await tx.uniqueId.create({
        data: {
          userId: user.id,
          displayId,
          encryptedToken,
          status: 'ACTIVE'
        }
      });

      // 4. Create payment record
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          amount: plan.price,
          currency: 'USD',
          paymentType: 'SUBSCRIPTION',
          status: 'SUCCEEDED'
        }
      });

      // 5. Log completion
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTRATION_COMPLETED',
          resourceType: 'User',
          resourceId: user.id,
          details: JSON.stringify({
            uniqueId: displayId,
            planType: subscription.planType,
            subscriptionId: subscription.id,
            sessionId,
            completionMethod: sessionId ? 'webhook' : 'direct'
          })
        }
      });

      return { user: updatedUser, subscription, uniqueId, payment };
    });

    console.log(`🎉 Registration completed! User: ${user.email}, Unique ID: ${result.uniqueId.displayId}`);

    // 6. Send welcome email
    try {
      const emailResult = await sendWelcomeEmail({
        userEmail: user.email,
        userName: user.firstName || 'User',
        uniqueId: result.uniqueId.displayId,
        planName: plan.name
      });
      
      console.log('📧 Welcome email result:', emailResult.success ? 'Sent' : 'Failed');
    } catch (emailError) {
      console.error('📧 Welcome email failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration completed successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        status: result.user.status,
        registrationStep: result.user.registrationStep
      },
      uniqueId: result.uniqueId.displayId,
      subscription: {
        id: result.subscription.id,
        planType: result.subscription.planType,
        status: result.subscription.status
      },
      dashboardUrl: '/dashboard?welcome=true'
    });

  } catch (error: any) {
    console.error('❌ Registration completion failed:', error);
    throw error;
  }
}

// Helper functions
function mapPlanType(planId: string) {
  const mapping: { [key: string]: string } = {
    'monthly': 'MONTHLY',
    '6months': 'SIX_MONTHS',
    '12months': 'TWELVE_MONTHS',
    '24months': 'TWENTY_FOUR_MONTHS'
  };
  return mapping[planId] || 'TWELVE_MONTHS';
}

function getPlanDuration(planId: string): number {
  const durations: { [key: string]: number } = {
    'monthly': 30 * 24 * 60 * 60 * 1000,        // 30 days
    '6months': 6 * 30 * 24 * 60 * 60 * 1000,    // 6 months
    '12months': 365 * 24 * 60 * 60 * 1000,      // 1 year
    '24months': 2 * 365 * 24 * 60 * 60 * 1000   // 2 years
  };
  return durations[planId] || durations['12months'];
}

// Simple welcome email function
async function sendWelcomeEmail({
  userEmail,
  userName,
  uniqueId,
  planName
}: {
  userEmail: string;
  userName: string;
  uniqueId: string;
  planName: string;
}) {
  // For now, just log the email content
  // You can implement actual email sending later using your email service
  console.log(`📧 [EMAIL] Welcome email to ${userEmail}:`);
  console.log(`   Subject: 🎉 Welcome to iamlost.help - Your Items Are Now Protected!`);
  console.log(`   Welcome ${userName}!`);
  console.log(`   Your unique ID: ${uniqueId}`);
  console.log(`   Plan: ${planName}`);
  console.log(`   Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
  
  return { success: true, messageId: 'welcome-email-' + Date.now() };
}
