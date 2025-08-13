// src/app/api/webhooks/stripe/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { updateSubscriptionStatus } from '@/lib/subscription';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text (critical for webhook verification)
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    console.log('🔔 Webhook received');
    console.log('📝 Body length:', body.length);
    console.log('🔐 Signature present:', !!signature);

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook with proper error handling
    let event: Stripe.Event;
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
        throw new Error('Webhook secret not configured');
      }

      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook verified successfully:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook verification failed:', err.message);
      return NextResponse.json({ 
        error: 'Webhook verification failed',
        details: err.message 
      }, { status: 400 });
    }

    // Process the event
    console.log(`🔄 Processing event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout completed for session:', session.id);
        
        if (session.mode === 'subscription' && session.metadata?.userId) {
          const userId = parseInt(session.metadata.userId);
          console.log('👤 Processing for user:', userId);
          
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Complete registration (this should trigger the rest of the process)
          await completeUserRegistration(userId, session, subscription);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Payment succeeded for invoice:', invoice.id);
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          await updateSubscriptionStatus(
            subscription.id,
            'ACTIVE',
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000)
          );

          console.log(`✅ Updated subscription ${subscription.id} to ACTIVE`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('❌ Payment failed for invoice:', invoice.id);
        
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
        console.log('🔄 Subscription updated:', subscription.id, 'Status:', subscription.status);
        
        let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
        
        switch (subscription.status) {
          case 'active':
            status = 'ACTIVE';
            break;
          case 'past_due':
            status = 'PAST_DUE';
            break;
          case 'canceled':
          case 'unpaid':
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
        console.log('🗑️ Subscription deleted:', subscription.id);
        
        await updateSubscriptionStatus(subscription.id, 'CANCELED');
        break;
      }

      // Handle events that don't need processing
      case 'plan.created':
      case 'price.created':
      case 'product.created':
      case 'customer.created':
        console.log(`ℹ️ Informational event: ${event.type} - no action needed`);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('💥 Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to complete user registration
async function completeUserRegistration(
  userId: number, 
  session: Stripe.Checkout.Session, 
  subscription: Stripe.Subscription
) {
  try {
    console.log(`🔄 Completing registration for user: ${userId}`);
    
    // Update user status to ACTIVE and COMPLETED
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        registrationStep: 'COMPLETED',
        statusChangedAt: new Date(),
        statusMetadata: JSON.stringify({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          completedAt: new Date().toISOString(),
          checkoutSessionId: session.id,
          completedVia: 'webhook'
        })
      }
    });

    console.log(`✅ User ${userId} registration completed via webhook`);
  } catch (error) {
    console.error('❌ Failed to complete user registration:', error);
    throw error;
  }
}
