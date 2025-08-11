// src/app/api/admin/process-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendReminderEmail } from '@/lib/email';

const prisma = new PrismaClient();

// Reminder schedule configuration
const REMINDER_SCHEDULE = [
  {
    delayHours: 1,
    emailType: 'PLAN_SELECTION' as const,
    subject: '⏰ Complete your iamlost.help setup in just 2 minutes',
    targetSteps: ['INFO_COLLECTED']
  },
  {
    delayHours: 24,
    emailType: 'PLAN_SELECTION' as const,
    subject: '🎯 Don\'t lose your items - finish your iamlost.help protection',
    targetSteps: ['INFO_COLLECTED']
  },
  {
    delayHours: 4,
    emailType: 'PAYMENT_RETRY' as const,
    subject: '💳 Complete your payment to start protecting your items',
    targetSteps: ['PLAN_SELECTED', 'PAYMENT_FAILED']
  },
  {
    delayHours: 72,
    emailType: 'PAYMENT_RETRY' as const,
    subject: '💡 Start protecting your items for just $1.24/month',
    targetSteps: ['PLAN_SELECTED', 'PAYMENT_FAILED']
  },
  {
    delayHours: 168, // 7 days
    emailType: 'FINAL_REMINDER' as const,
    subject: '👋 Last chance to protect your items with iamlost.help',
    targetSteps: ['INFO_COLLECTED', 'PLAN_SELECTED', 'PAYMENT_FAILED']
  }
];

export async function POST(request: NextRequest) {
  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Starting reminder email processing...');
    
    let totalSent = 0;
    const results = [];

    for (const config of REMINDER_SCHEDULE) {
      const cutoffTime = new Date(Date.now() - config.delayHours * 60 * 60 * 1000);
      
      // Find users who need this reminder
      const candidates = await prisma.user.findMany({
        where: {
          status: 'PENDING',
          registrationStep: {
            in: config.targetSteps
          },
          statusChangedAt: {
            lte: cutoffTime
          },
          reminderCount: {
            lt: 5 // Maximum 5 reminders total
          },
          // Don't send if we've sent a reminder in the last 23 hours
          OR: [
            { lastReminderSent: null },
            { 
              lastReminderSent: {
                lte: new Date(Date.now() - 23 * 60 * 60 * 1000)
              }
            }
          ]
        }
      });

      console.log(`📧 Found ${candidates.length} candidates for ${config.emailType} (${config.delayHours}h delay)`);

      let sentCount = 0;

      for (const user of candidates) {
        try {
          // Check if we've already sent this specific reminder type recently
          const recentReminder = await prisma.auditLog.findFirst({
            where: {
              userId: user.id,
              action: `REMINDER_SENT_${config.emailType}`,
              createdAt: {
                gte: new Date(Date.now() - config.delayHours * 60 * 60 * 1000)
              }
            }
          });

          if (recentReminder) {
            continue; // Skip if we've already sent this type recently
          }

          // Send reminder email
          const emailResult = await sendReminderEmail({
            email: user.email,
            firstName: user.firstName,
            emailType: config.emailType,
            subject: config.subject,
            registrationStep: user.registrationStep,
            selectedPlanId: user.selectedPlanId,
            userId: user.id
          });

          if (emailResult.success) {
            // Update user reminder tracking
            await prisma.user.update({
              where: { id: user.id },
              data: {
                lastReminderSent: new Date(),
                reminderCount: { increment: 1 }
              }
            });

            // Log the reminder
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: `REMINDER_SENT_${config.emailType}`,
                resourceType: 'User',
                resourceId: user.id,
                details: {
                  emailType: config.emailType,
                  subject: config.subject,
                  registrationStep: user.registrationStep,
                  delayHours: config.delayHours,
                  reminderCount: user.reminderCount + 1
                }
              }
            });

            sentCount++;
            totalSent++;
            console.log(`✅ Sent ${config.emailType} to ${user.email}`);
          } else {
            console.log(`❌ Failed to send ${config.emailType} to ${user.email}: ${emailResult.error}`);
          }

        } catch (emailError) {
          console.error(`Failed to send reminder to ${user.email}:`, emailError);
        }

        // Small delay to avoid overwhelming email service
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      results.push({
        emailType: config.emailType,
        delayHours: config.delayHours,
        candidates: candidates.length,
        sent: sentCount
      });
    }

    // Clean up old pending registrations (mark as abandoned after 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const abandonedResult = await prisma.user.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: thirtyDaysAgo },
        reminderCount: { gte: 3 } // Sent multiple reminders
      },
      data: {
        registrationStep: 'ABANDONED',
        statusChangedAt: new Date(),
        statusMetadata: JSON.stringify({
          abandonedAt: new Date().toISOString(),
          reason: 'No response after 30 days and multiple reminders'
        })
      }
    });

    console.log(`🧹 Marked ${abandonedResult.count} old registrations as abandoned`);

    const summary = {
      success: true,
      totalEmailsSent: totalSent,
      abandonedRegistrations: abandonedResult.count,
      results,
      processedAt: new Date().toISOString()
    };

    console.log('✅ Reminder processing completed:', summary);

    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('❌ Error processing reminder emails:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process reminders',
        processedAt: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
