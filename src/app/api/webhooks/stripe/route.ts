// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createSubscription } from '@/lib/subscription';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // For now, skip signature verification in development
    // In production, you'd verify with: stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    const event = JSON.parse(body);
    console.log('Webhook received:', event.type);

    // Handle the checkout completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      console.log('Processing checkout session:', session.id);
      console.log('Subscription:', session.subscription);
      console.log('Customer:', session.customer);
      console.log('Metadata:', session.metadata);

      if (session.mode === 'subscription' && session.subscription) {
        // Get the subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Extract user info from metadata
        const userId = parseInt(session.metadata?.userId || '0');
        const planId = session.metadata?.planId;

        if (userId && planId) {
          // Create subscription and unique ID
          await createSubscription({
            userId,
            planType: planId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });

          console.log(`Subscription created for user ${userId} with plan ${planId}`);
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
