// src/app/api/found-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromDisplayId, getUserFromEncryptedToken, normalizeDisplayId } from '@/lib/unique-id';
import { sendFoundItemNotification } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log('Received found item report:', body);

    const {
      uniqueId,
      encryptedToken,
      message,
      objectType,
      finderContact,
      contactMethod
    } = body;

    // Validate required fields
    if (!message || !objectType || !finderContact || !contactMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the user - either by display ID or encrypted token
    let userId: number | null = null;
    let actualUniqueId: string | null = null;

    if (encryptedToken) {
      userId = await getUserFromEncryptedToken(encryptedToken);
      // If we have token, also need to get the display ID
      if (userId) {
        const uniqueIdRecord = await prisma.uniqueId.findUnique({
          where: { encryptedToken },
          select: { displayId: true }
        });
        actualUniqueId = uniqueIdRecord?.displayId || null;
      }
    } else if (uniqueId) {
      const normalizedId = normalizeDisplayId(uniqueId);
      userId = await getUserFromDisplayId(normalizedId);
      actualUniqueId = normalizedId;
    } else {
      return NextResponse.json(
        { error: 'Either uniqueId or encryptedToken is required' },
        { status: 400 }
      );
    }

    if (!userId || !actualUniqueId) {
      return NextResponse.json(
        { error: 'Invalid or inactive ID. This ID may be expired or not exist.' },
        { status: 404 }
      );
    }

    // Get user details for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        status: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 404 }
      );
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

    if (!subscription) {
      return NextResponse.json(
        { error: 'User subscription has expired. Please contact support.' },
        { status: 402 }
      );
    }

    // Get the unique ID record
    const uniqueIdRecord = await prisma.uniqueId.findUnique({
      where: { userId },
      select: { id: true, displayId: true }
    });

    if (!uniqueIdRecord) {
      return NextResponse.json(
        { error: 'Unique ID not found' },
        { status: 404 }
      );
    }

    // Get request details for tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create found item report
    const foundReport = await prisma.foundItemReport.create({
      data: {
        uniqueIdId: uniqueIdRecord.id,
        userId,
        finderContact,
        finderMessage: message,
        finderLanguage: 'en', // TODO: detect language
        objectType,
        finderIp: clientIp,
        userAgent,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });

    // Send notification email
    try {
      await sendFoundItemNotification({
        userEmail: user.email,
        userName: user.firstName || 'User',
        itemType: objectType,
        finderMessage: message,
        finderContact,
        contactMethod,
        language: user.preferredLanguage || 'en',
        reportId: foundReport.id
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the whole request if email fails
    }

    // Log the activity (optional)
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'FOUND_ITEM_REPORTED',
          resourceType: 'FoundItemReport',
          resourceId: foundReport.id,
          details: {
            uniqueId: actualUniqueId,
            objectType,
            contactMethod
          },
          ipAddress: clientIp,
          userAgent
        }
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Found item report submitted successfully',
      reportId: foundReport.id
    });

  } catch (error) {
    console.error('Error processing found item report:', error);
    
    // Return a proper JSON error response
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
