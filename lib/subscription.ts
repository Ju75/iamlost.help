// src/lib/subscription.ts

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

import { PrismaClient } from '@prisma/client';
import { stripe, createStripeCustomer, SUBSCRIPTION_PLANS } from './stripe';
import { generateUniqueId } from './unique-id';
import { logUserActivity } from './auth';

const prisma = new PrismaClient();

export interface CreateSubscriptionData {
  userId: number;
  planType: string;
  stripeCustomerId?: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
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
