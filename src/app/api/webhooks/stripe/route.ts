// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook, stripe } from '@/lib/stripe';
import { createSubscription, updateSubscriptionStatus } from '@/lib/subscription';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook
    const event = verifyWebhook(body, signature);

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await createSubscription({
            userId: parseInt(session.metadata?.userId || '0'),
            planType: session.metadata?.planId || 'monthly',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          await updateSubscriptionStatus(
            subscription.id,
            'ACTIVE',
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000)
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await updateSubscriptionStatus(
            invoice.subscription as string,
            'PAST_DUE'
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
        
        switch (subscription.status) {
          case 'active':
            status = 'ACTIVE';
            break;
          case 'past_due':
            status = 'PAST_DUE';
            break;
          case 'canceled':
            status = 'CANCELED';
            break;
          default:
            status = 'EXPIRED';
        }

        await updateSubscriptionStatus(
          subscription.id,
          status,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000)
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus(subscription.id, 'CANCELED');
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
