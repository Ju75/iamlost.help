// src/app/api/found-item/report/route.ts - COMPLETE FILE
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking up encrypted token:', encryptedToken);

    // Get request details for tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Try to find if this is a real encrypted token from the database
    let emailSent = false;
    let isRealToken = false;

    try {
      const uniqueIdRecord = await prisma.uniqueId.findUnique({
        where: { encryptedToken },
        select: { 
          userId: true, 
          displayId: true, 
          id: true,
          status: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              preferredLanguage: true,
              status: true
            }
          }
        }
      });

      console.log('🎯 Database lookup result:', uniqueIdRecord ? 'FOUND' : 'NOT FOUND');

      if (uniqueIdRecord && uniqueIdRecord.status === 'ACTIVE' && uniqueIdRecord.user.status === 'ACTIVE') {
        isRealToken = true;
        console.log('✅ Real token found for user:', uniqueIdRecord.user.email);

        // Check if user has active subscription
        const subscription = await prisma.subscription.findFirst({
          where: {
            userId: uniqueIdRecord.userId,
            status: 'ACTIVE',
            currentPeriodEnd: {
              gt: new Date()
            }
          }
        });

        console.log('💳 Subscription status:', subscription ? 'ACTIVE' : 'INACTIVE');

        if (subscription) {
          // This is a real user with active subscription - process everything!
          
          // Create found item report in database
          const foundReport = await prisma.foundItemReport.create({
            data: {
              uniqueIdId: uniqueIdRecord.id,
              userId: uniqueIdRecord.userId,
              finderContact: finderEmail,
              finderMessage: message,
              finderLanguage: 'en',
              objectType: itemType,
              finderIp: clientIp,
              userAgent,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              // Note: metadata field removed as it doesn't exist in schema
            }
          });

          console.log('📧 Sending email notification...');

          // Send notification email to the real owner
          try {
            const emailResult = await sendFoundItemNotification({
              userEmail: uniqueIdRecord.user.email,
              userName: uniqueIdRecord.user.firstName || 'User',
              itemType,
              finderMessage: `${message}\n\nLocation: ${location}\nFinder: ${finderName}${finderPhone ? `\nPhone: ${finderPhone}` : ''}`,
              finderContact: `${finderName} (${finderEmail}${finderPhone ? ', ' + finderPhone : ''})`,
              contactMethod: 'email',
              language: uniqueIdRecord.user.preferredLanguage || 'en',
              reportId: foundReport.id,
              additionalDetails: {
                location,
                finderName,
                finderPhone
              }
            });
            
            if (emailResult.success) {
              console.log('✅ Email sent successfully!');
              emailSent = true;
              
              // Update report status
              await prisma.foundItemReport.update({
                where: { id: foundReport.id },
                data: { 
                  status: 'DELIVERED',
                  deliveredAt: new Date()
                }
              });
            } else {
              console.log('❌ Email failed:', emailResult.error);
            }
            
          } catch (emailError) {
            console.error('❌ Email error:', emailError);
          }

          // Log the activity
          try {
            await prisma.auditLog.create({
              data: {
                userId: uniqueIdRecord.userId,
                action: 'FOUND_ITEM_REPORTED',
                resourceType: 'FoundItemReport',
                resourceId: foundReport.id,
                details: JSON.stringify({
                  uniqueId: uniqueIdRecord.displayId,
                  finderName,
                  location,
                  emailSent
                }),
                ipAddress: clientIp,
                userAgent
              }
            });
          } catch (logError) {
            console.error('Failed to log activity:', logError);
          }

        } else {
          console.log('🚫 User has no active subscription - email not sent');
        }
      } else {
        console.log('🚫 Token not found or inactive - no email sent');
      }

    } catch (dbError) {
      console.error('💥 Database error:', dbError);
      // Continue to show success even if database fails
    }

    // 🎯 ALWAYS RETURN SUCCESS - SAME BEHAVIOR FOR ALL CASES
    console.log(`📊 Final result: Real token: ${isRealToken}, Email sent: ${emailSent}`);
    
    return NextResponse.json({
      success: true,
      message: 'Found item report submitted successfully'
      // Don't reveal whether email was actually sent or if ID was real
    });

  } catch (error) {
    console.error('💥 Error processing found item report:', error);
    
    // Even on errors, ALWAYS return success to maintain consistent behavior
    return NextResponse.json({
      success: true,
      message: 'Found item report submitted successfully'
    });
  }
}

// Function to log fake reports for monitoring (optional)
async function logFakeReport(reportData: any, clientIp: string, userAgent: string) {
  try {
    console.log('📝 Fake report logged:', {
      ...reportData,
      clientIp,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // You could send this to a monitoring email or logging service
    // For now, just console log it
    
  } catch (error) {
    console.error('Failed to log fake report:', error);
  }
}
