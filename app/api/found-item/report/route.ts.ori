// src/app/api/found-item/report/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromEncryptedToken } from '@/lib/unique-id';
import { sendFoundItemNotification } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Received found item report:', body);

    const {
      encryptedToken,
      finderName,
      finderEmail,
      finderPhone,
      message,
      location,
      itemType
    } = body;

    // Validate required fields
    if (!encryptedToken || !finderName || !finderEmail || !message || !location || !itemType) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get request details for tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log('🔍 Looking up user from encrypted token...');

    // Find the user by encrypted token
    const userId = await getUserFromEncryptedToken(encryptedToken);

    if (!userId) {
      console.log('❌ Invalid or expired token');
      // For security, still return success to avoid revealing token validity
      return NextResponse.json({
        success: true,
        message: 'Found item report submitted successfully'
      });
    }

    console.log('✅ Found user ID:', userId);

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
      console.log('❌ User not found or not active');
      // Still return success for security
      return NextResponse.json({
        success: true,
        message: 'Found item report submitted successfully'
      });
    }

    console.log('✅ User found:', user.email);

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
      console.log('❌ User subscription expired');
      // Still return success for security
      return NextResponse.json({
        success: true,
        message: 'Found item report submitted successfully'
      });
    }

    console.log('✅ User has active subscription');

    // Get the unique ID record
    const uniqueIdRecord = await prisma.uniqueId.findUnique({
      where: { encryptedToken },
      select: { id: true, displayId: true }
    });

    if (!uniqueIdRecord) {
      console.log('❌ Unique ID record not found');
      return NextResponse.json({
        success: true,
        message: 'Found item report submitted successfully'
      });
    }

    console.log('✅ Unique ID record found:', uniqueIdRecord.displayId);

    // Create found item report in database
    console.log('💾 Creating found item report...');
    const foundReport = await prisma.foundItemReport.create({
      data: {
        uniqueIdId: uniqueIdRecord.id,
        userId,
        finderContact: finderEmail,
        finderMessage: message,
        finderLanguage: 'en',
        objectType: itemType,
        finderIp: clientIp,
        userAgent,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        // Store additional details as JSON metadata if your schema supports it
        // metadata: {
        //   finderName,
        //   finderPhone,
        //   location
        // }
      }
    });

    console.log('✅ Found item report created with ID:', foundReport.id);

    // Send notification email to the real owner
    console.log('📧 Sending notification email...');
    try {
      const emailResult = await sendFoundItemNotification({
        userEmail: user.email,
        userName: user.firstName || 'User',
        itemType,
        finderMessage: message,
        finderContact: `${finderName} (${finderEmail}${finderPhone ? ', ' + finderPhone : ''})`,
        contactMethod: 'email',
        language: user.preferredLanguage || 'en',
        reportId: foundReport.id,
        additionalDetails: {
          location,
          finderName,
          finderPhone
        }
      });
      
      if (emailResult.success) {
        console.log('✅ Email sent successfully!');
        if (emailResult.previewUrl) {
          console.log('🔗 Email preview URL:', emailResult.previewUrl);
        }
      } else {
        console.log('⚠️ Email failed but continuing:', emailResult.error);
      }
      
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the whole request if email fails
    }

    // Log the activity
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'FOUND_ITEM_REPORTED',
          resourceType: 'FoundItemReport',
          resourceId: foundReport.id,
          details: {
            uniqueId: uniqueIdRecord.displayId,
            finderName,
            location,
            itemType
          },
          ipAddress: clientIp,
          userAgent
        }
      });
      console.log('✅ Activity logged');
    } catch (logError) {
      console.error('⚠️ Failed to log activity:', logError);
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Found item report submitted successfully',
      reportId: foundReport.id
    });

  } catch (error) {
    console.error('❌ Error processing found item report:', error);
    
    // Return success for security (don't reveal internal errors)
    return NextResponse.json({
      success: true,
      message: 'Found item report submitted successfully'
    });
  }
}
