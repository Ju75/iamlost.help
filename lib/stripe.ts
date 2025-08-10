// src/lib/stripe.ts
import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Client-side Stripe instance
let stripePromise: Promise<any>;
export const getStripe = () => {
  if (!stripePromise) {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set');
    }
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly Plan',
    description: 'Protect your items monthly',
    price: 590, // $5.90 in cents
    currency: 'usd',
    interval: 'month',
    interval_count: 1,
    stripePriceId: '', // We'll create this in Stripe
  },
  SIX_MONTHS: {
    id: '6months',
    name: '6 Months Plan',
    description: 'Save 72% with 6 months',
    price: 990, // $9.90 in cents
    currency: 'usd',
    interval: 'month',
    interval_count: 6,
    stripePriceId: '',
    savings: 72,
  },
  TWELVE_MONTHS: {
    id: '12months',
    name: '12 Months Plan',
    description: 'Best value - Save 79%',
    price: 1490, // $14.90 in cents
    currency: 'usd',
    interval: 'year',
    interval_count: 1,
    stripePriceId: '',
    savings: 79,
    popular: true,
  },
  TWENTY_FOUR_MONTHS: {
    id: '24months',
    name: '24 Months Plan',
    description: 'Maximum savings - 86% off',
    price: 1990, // $19.90 in cents
    currency: 'usd',
    interval: 'year',
    interval_count: 2,
    stripePriceId: '',
    savings: 86,
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

// Helper functions
export function formatPrice(priceInCents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}

export function calculateMonthlyPrice(totalPrice: number, months: number): string {
  const monthlyPrice = totalPrice / months;
  return formatPrice(monthlyPrice);
}

export function getPlanById(planId: string) {
  const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
  return plan || null;
}

// Stripe customer management
export async function createStripeCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'iamlost-app',
      },
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

export async function createCheckoutSession({
  customerId,
  planId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  userId: number;
}) {
  try {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error('Invalid plan ID');
    }

    // For now, we'll create prices on-the-fly
    // In production, you'd create these once and store the IDs
    let priceId = plan.stripePriceId;
    
    if (!priceId) {
       // Create price in Stripe
      const price = await stripe.prices.create({
        unit_amount: plan.price,
        currency: plan.currency,
        recurring: {
          interval: plan.interval as 'month' | 'year',
          interval_count: plan.interval_count,
        },
        product_data: {
          name: `iamlost.help - ${plan.name}`,
      
        },
        metadata: {
          plan_id: plan.id,
        },
      });
      priceId = price.id;
    }
    

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          planId: plan.id,
        },
      },
      allow_promotion_codes: true,
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Webhook helpers
export function verifyWebhook(body: string, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook verification failed:', error);
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, immediately: boolean = false) {
  try {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
}
