// src/lib/subscription.ts - COMPLETE FIXED FILE
import { PrismaClient } from '@prisma/client';
import { stripe, createStripeCustomer, SUBSCRIPTION_PLANS } from './stripe';
import { generateUniqueId } from './unique-id';
import { logUserActivity } from './auth';

const prisma = new PrismaClient();

// Map plan IDs to enum values
function mapPlanType(planId: string) {
  const mapping: { [key: string]: any } = {
    'monthly': 'MONTHLY',
    '6months': 'SIX_MONTHS', 
    '12months': 'TWELVE_MONTHS',
    '24months': 'TWENTY_FOUR_MONTHS'
  };
  
  return mapping[planId] || planId;
}

export interface CreateSubscriptionData {
  userId: number;
  planType: string;
  stripeCustomerId?: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

// CRITICAL: This was the missing export causing webhook errors
export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED',
  currentPeriodStart?: Date,
  currentPeriodEnd?: Date
) {
  try {
    const updateData: any = { status };
    
    if (currentPeriodStart) updateData.currentPeriodStart = currentPeriodStart;
    if (currentPeriodEnd) updateData.currentPeriodEnd = currentPeriodEnd;

    const subscription = await prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: updateData,
    });

    // If subscription is canceled/expired, we keep the unique ID but could deactivate features
    // The unique ID stays with the user forever as per our business model

    console.log(`✅ Updated subscription ${stripeSubscriptionId} to ${status}`);
    return subscription;
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

// Create subscription after successful payment
export async function createSubscription(data: CreateSubscriptionData) {
  try {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create subscription record
      const subscription = await tx.subscription.create({
        data: {
          userId: data.userId,
          planType: mapPlanType(data.planType),
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          currentPeriodStart: data.currentPeriodStart,
          currentPeriodEnd: data.currentPeriodEnd,
          status: 'ACTIVE',
        },
      });

      // 2. Check if user already has a unique ID
      const existingId = await tx.uniqueId.findUnique({
        where: { userId: data.userId },
      });

      let uniqueId;
      if (!existingId) {
        // 3. Generate unique ID for new customer (one per customer forever)
        const { displayId, encryptedToken } = await generateUniqueId();
        
        uniqueId = await tx.uniqueId.create({
          data: {
            userId: data.userId,
            displayId,
            encryptedToken,
            status: 'ACTIVE',
          },
        });
      } else {
        // Reactivate existing ID if needed
        uniqueId = await tx.uniqueId.update({
          where: { id: existingId.id },
          data: { status: 'ACTIVE' },
        });
      }

      // 4. Create payment record
      const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === data.planType);
      await tx.payment.create({
        data: {
          userId: data.userId,
          subscriptionId: subscription.id,
          amount: plan?.price || 0,
          currency: 'USD',
          paymentType: 'SUBSCRIPTION',
          status: 'SUCCEEDED',
        },
      });

      return { subscription, uniqueId };
    });

    // Log activity
    await logUserActivity(
      data.userId,
      'SUBSCRIPTION_CREATED',
      {
        planType: data.planType,
        subscriptionId: data.stripeSubscriptionId,
        uniqueId: result.uniqueId.displayId,
      }
    );

    return result;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

// Get user's active subscription
export async function getUserSubscription(userId: number) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'PAST_DUE'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return subscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
}

// Get user's unique ID
export async function getUserUniqueId(userId: number) {
  try {
    const uniqueId = await prisma.uniqueId.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return uniqueId;
  } catch (error) {
    console.error('Error getting user unique ID:', error);
    throw error;
  }
}

// Cancel subscription
export async function cancelUserSubscription(userId: number, immediately: boolean = false) {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel in Stripe
    const stripeSubscription = immediately 
      ? await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
      : await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

    // Update local database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: !immediately,
        status: immediately ? 'CANCELED' : 'ACTIVE',
      },
    });

    // Log activity
    await logUserActivity(
      userId,
      'SUBSCRIPTION_CANCELED',
      {
        immediately,
        subscriptionId: subscription.stripeSubscriptionId,
      }
    );

    return stripeSubscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Check if user has active subscription
export async function hasActiveSubscription(userId: number): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: {
          gt: new Date(),
        },
      },
    });

    return !!subscription;
  } catch (error) {
    console.error('Error checking active subscription:', error);
    return false;
  }
}

// Get subscription stats for dashboard
export async function getSubscriptionStats(userId: number) {
  try {
    const [subscription, uniqueId, foundReports] = await Promise.all([
      getUserSubscription(userId),
      getUserUniqueId(userId),
      prisma.foundItemReport.count({
        where: {
          uniqueId: {
            userId,
          },
        },
      }),
    ]);

    return {
      subscription,
      uniqueId,
      foundReportsCount: foundReports,
      hasActiveSubscription: subscription?.status === 'ACTIVE' && 
                           subscription?.currentPeriodEnd > new Date(),
    };
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    throw error;
  }
}

// Reactivate expired subscription with penalty
export async function reactivateSubscription(
  userId: number,
  newPlanType: string,
  penaltyAmount: number = 999 // $9.99
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find old subscription
      const oldSubscription = await tx.subscription.findFirst({
        where: {
          userId,
          status: {
            in: ['EXPIRED', 'CANCELED'],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!oldSubscription) {
        throw new Error('No expired subscription found');
      }

      // Count held found reports during expiration
      const heldReports = await tx.foundItemReport.count({
        where: {
          uniqueId: { userId },
          status: 'PENDING',
          createdAt: {
            gte: oldSubscription.currentPeriodEnd,
          },
        },
      });

      // Create reactivation penalty record (if this table exists in your schema)
      try {
        const penalty = await tx.reactivationPenalty.create({
          data: {
            userId,
            oldSubscriptionId: oldSubscription.id,
            penaltyAmount,
            foundReportsHeld: heldReports,
          },
        });
        return { penalty, heldReports };
      } catch (error) {
        // If reactivationPenalty table doesn't exist, just return the counts
        console.log('ReactivationPenalty table not found, skipping penalty record');
        return { penalty: null, heldReports };
      }
    });

    return result;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}
