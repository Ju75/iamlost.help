// src/app/api/found-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromDisplayId, getUserFromEncryptedToken } from '@/lib/unique-id';
import { sendFoundItemNotification } from '@/lib/email'; // We'll create this

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uniqueId, encryptedToken, message, objectType, finderContact, contactMethod } = body;

    // Get client info for logging
    const ipAddress = request.ip || 
                     request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate required fields
    if (!message || !objectType || !finderContact || !contactMethod) {
      return NextResponse.json({
        success: false,
        error: 'Please fill in all required fields'
      }, { status: 400 });
    }

    // Find the owner - try encrypted token first (QR scan), then display ID
    let userId: number | null = null;
    let uniqueIdRecord: any = null;

    if (encryptedToken) {
      // QR code scan - use encrypted token
      userId = await getUserFromEncryptedToken(encryptedToken);
      if (userId) {
        uniqueIdRecord = await prisma.uniqueId.findFirst({
          where: { 
            userId,
            encryptedToken,
            status: 'ACTIVE'
          }
        });
      }
    } else if (uniqueId) {
      // Manual entry - use display ID
      userId = await getUserFromDisplayId(uniqueId);
      if (userId) {
        uniqueIdRecord = await prisma.uniqueId.findFirst({
          where: { 
            userId,
            displayId: uniqueId.toUpperCase(),
            status: 'ACTIVE'
          }
        });
      }
    }

    if (!userId || !uniqueIdRecord) {
      return NextResponse.json({
        success: false,
        error: 'Item ID not found. Please check the ID and try again.'
      }, { status: 404 });
    }

    // Check if user has active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: {
          gt: new Date()
        }
      }
    });

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Owner account not found'
      }, { status: 404 });
    }

    // Calculate expiration (30 days from now)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create found item report
    const foundReport = await prisma.foundItemReport.create({
      data: {
        uniqueIdId: uniqueIdRecord.id,
        userId: userId,
        finderContact,
        finderMessage: message,
        objectType,
        finderIp: ipAddress,
        userAgent,
        status: subscription ? 'PENDING' : 'PENDING', // Will be delivered or held based on subscription
        expiresAt,
        finderLanguage: 'en' // Could detect this from headers
      }
    });

    // Send notification based on subscription status
    if (subscription) {
      // Active subscription - send notification immediately
      try {
        await sendFoundItemNotification({
          userEmail: user.email,
          userName: user.firstName || 'there',
          itemType: objectType,
          finderMessage: message,
          finderContact,
          contactMethod,
          language: user.preferredLanguage || 'en',
          reportId: foundReport.id
        });

        // Mark as delivered
        await prisma.foundItemReport.update({
          where: { id: foundReport.id },
          data: { 
            status: 'DELIVERED',
            deliveredAt: new Date()
          }
        });

        // Log successful notification
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'FOUND_ITEM_NOTIFICATION_SENT',
            resourceType: 'FoundItemReport',
            resourceId: foundReport.id,
            details: {
              objectType,
              finderContact: contactMethod === 'email' ? finderContact : '[phone]'
            },
            ipAddress,
            userAgent
          }
        });

      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Continue - report is still saved
      }
    } else {
      // No active subscription - hold notification for reactivation
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'FOUND_ITEM_HELD_NO_SUBSCRIPTION',
          resourceType: 'FoundItemReport',
          resourceId: foundReport.id,
          details: {
            objectType,
            message: 'Notification held - no active subscription'
          },
          ipAddress,
          userAgent
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent to the owner!',
      hasActiveSubscription: !!subscription,
      reportId: foundReport.id
    });

  } catch (error: any) {
    console.error('Found item report error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process your report. Please try again.'
    }, { status: 500 });
  }
}
