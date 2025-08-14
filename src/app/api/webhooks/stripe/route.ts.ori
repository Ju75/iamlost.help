// src/app/api/webhooks/stripe/route.ts - ENHANCED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook, stripe } from '@/lib/stripe';
import { createSubscription, updateSubscriptionStatus } from '@/lib/subscription';
import { generateUniqueId } from '@/lib/unique-id';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook
    const event = verifyWebhook(body, signature);
    console.log('🔔 Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.metadata?.userId) {
          console.log('✅ Processing successful checkout for user:', session.metadata.userId);
          
          const userId = parseInt(session.metadata.userId);
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Start transaction to handle user activation and subscription creation
          await prisma.$transaction(async (tx) => {
            // 1. Update user status to ACTIVE
            const user = await tx.user.update({
              where: { id: userId },
              data: {
                status: 'ACTIVE',
                registrationStep: 'COMPLETED',
                statusChangedAt: new Date(),
                statusMetadata: JSON.stringify({
                  stripeCustomerId: session.customer as string,
                  stripeSubscriptionId: subscription.id,
                  completedAt: new Date().toISOString(),
                  checkoutSessionId: session.id
                })
              }
            });

            // 2. Create subscription record
            const subscriptionRecord = await tx.subscription.create({
              data: {
                userId,
                planType: mapPlanType(session.metadata?.planId || 'TWELVE_MONTHS'),
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscription.id,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                status: 'ACTIVE'
              }
            });

            // 3. Generate unique ID for the user
            const { displayId, encryptedToken } = await generateUniqueId();
            
            const uniqueId = await tx.uniqueId.create({
              data: {
                userId,
                displayId,
                encryptedToken,
                status: 'ACTIVE'
              }
            });

            // 4. Create payment record
            const plan = getPlanFromMetadata(session.metadata?.planId);
            await tx.payment.create({
              data: {
                userId,
                subscriptionId: subscriptionRecord.id,
                amount: plan?.price || subscription.items.data[0]?.price.unit_amount || 0,
                currency: 'USD',
                paymentType: 'SUBSCRIPTION',
                status: 'SUCCEEDED',
                stripePaymentIntentId: session.payment_intent as string
              }
            });

            // 5. Log successful registration completion
            await tx.auditLog.create({
              data: {
                userId,
                action: 'REGISTRATION_COMPLETED',
                resourceType: 'User',
                resourceId: userId,
                details: {
                  uniqueId: displayId,
                  planType: subscriptionRecord.planType,
                  subscriptionId: subscription.id,
                  checkoutSessionId: session.id,
                  completedViaWebhook: true
                }
              }
            });

            console.log(`🎉 User ${userId} registration completed! Unique ID: ${displayId}`);
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

          // Ensure user status is ACTIVE (in case they were EXPIRED)
          await prisma.user.updateMany({
            where: {
              subscriptions: {
                some: { stripeSubscriptionId: subscription.id }
              }
            },
            data: {
              status: 'ACTIVE',
              statusChangedAt: new Date()
            }
          });

          console.log(`💰 Payment succeeded for subscription: ${subscription.id}`);
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

          // User remains ACTIVE during PAST_DUE period
          console.log(`⚠️ Payment failed for subscription: ${invoice.subscription}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
        let userStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' = 'ACTIVE';
        
        switch (subscription.status) {
          case 'active':
            status = 'ACTIVE';
            userStatus = 'ACTIVE';
            break;
          case 'past_due':
            status = 'PAST_DUE';
            userStatus = 'ACTIVE'; // Keep user active during past due
            break;
          case 'canceled':
          case 'unpaid':
            status = 'CANCELED';
            userStatus = 'EXPIRED'; // User becomes expired when subscription is canceled
            break;
          default:
            status = 'EXPIRED';
            userStatus = 'EXPIRED';
        }

        // Update subscription
        await updateSubscriptionStatus(
          subscription.id,
          status,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000)
        );

        // Update user status if subscription is canceled/expired
        if (status === 'CANCELED' || status === 'EXPIRED') {
          await prisma.user.updateMany({
            where: {
              subscriptions: {
                some: { stripeSubscriptionId: subscription.id }
              }
            },
            data: {
              status: userStatus,
              statusChangedAt: new Date(),
              statusMetadata: JSON.stringify({
                reason: 'Subscription canceled/expired',
                subscriptionStatus: subscription.status,
                updatedAt: new Date().toISOString()
              })
            }
          });
        }

        console.log(`🔄 Subscription ${subscription.id} updated: ${subscription.status} → ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await updateSubscriptionStatus(subscription.id, 'CANCELED');
        
        // Set user to EXPIRED status
        await prisma.user.updateMany({
          where: {
            subscriptions: {
              some: { stripeSubscriptionId: subscription.id }
            }
          },
          data: {
            status: 'EXPIRED',
            statusChangedAt: new Date(),
            statusMetadata: JSON.stringify({
              reason: 'Subscription deleted',
              deletedAt: new Date().toISOString()
            })
          }
        });

        console.log(`🗑️ Subscription ${subscription.id} deleted, user set to EXPIRED`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}

// Helper functions
function mapPlanType(planId?: string): string {
  const mapping: { [key: string]: string } = {
    'monthly': 'MONTHLY',
    '6months': 'SIX_MONTHS',
    '12months': 'TWELVE_MONTHS',
    '24months': 'TWENTY_FOUR_MONTHS'
  };
  
  return mapping[planId || ''] || 'TWELVE_MONTHS';
}

function getPlanFromMetadata(planId?: string) {
  const plans = {
    'monthly': { price: 590 },
    '6months': { price: 990 },
    '12months': { price: 1490 },
    '24months': { price: 1990 }
  };
  
  return plans[planId as keyof typeof plans] || plans['12months'];
}
