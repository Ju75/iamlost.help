// src/app/api/admin/test-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);
    
    // Only allow admin user (ID 1)
    if (user.id !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { email: { contains: '@example.com' } },
          { firstName: { contains: 'Test' } }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        registrationStep: true,
        createdAt: true,
        statusChangedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error: any) {
    console.error('Get test users error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// src/app/api/admin/create-test-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth, hashPassword } from '@/lib/auth';
import { generateUniqueId } from '@/lib/unique-id';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);
    
    // Only allow admin user (ID 1)
    if (user.id !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { email, firstName, lastName, password, status, registrationStep } = body;

    // Validate required fields
    if (!email || !firstName || !password || !status || !registrationStep) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: email, firstName, password, status, registrationStep'
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User with this email already exists'
      }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          firstName,
          lastName: lastName || 'User',
          passwordHash,
          status,
          registrationStep,
          statusChangedAt: new Date(),
          emailVerified: status === 'ACTIVE',
          reminderCount: 0,
          preferredLanguage: 'en'
        }
      });

      let subscription = null;
      let uniqueId = null;
      let payment = null;

      // If user is ACTIVE or EXPIRED, create subscription and unique ID
      if (status === 'ACTIVE' || status === 'EXPIRED') {
        // Generate unique ID
        const { displayId, encryptedToken } = await generateUniqueId();

        // Create unique ID
        uniqueId = await tx.uniqueId.create({
          data: {
            userId: newUser.id,
            displayId,
            encryptedToken,
            status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
          }
        });

        // Create subscription
        subscription = await tx.subscription.create({
          data: {
            userId: newUser.id,
            planType: 'TWELVE_MONTHS',
            stripeCustomerId: `test_customer_${newUser.id}`,
            stripeSubscriptionId: `test_sub_${newUser.id}`,
            currentPeriodStart: new Date(),
            currentPeriodEnd: status === 'ACTIVE' 
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
              : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (expired)
            status: status === 'ACTIVE' ? 'ACTIVE' : 'EXPIRED',
            cancelAtPeriodEnd: false
          }
        });

        // Create payment record
        payment = await tx.payment.create({
          data: {
            userId: newUser.id,
            subscriptionId: subscription.id,
            amount: 1490, // $14.90
            currency: 'USD',
            paymentType: 'SUBSCRIPTION',
            status: 'SUCCEEDED'
          }
        });
      }

      // Log the creation
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'TEST_USER_CREATED',
          resourceType: 'User',
          resourceId: newUser.id,
          details: {
            createdBy: user.id,
            testScenario: `${status}_${registrationStep}`,
            hasSubscription: !!subscription,
            hasUniqueId: !!uniqueId
          }
        }
      });

      return { 
        user: newUser, 
        subscription, 
        uniqueId, 
        payment 
      };
    });

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      email: result.user.email,
      status: result.user.status,
      registrationStep: result.user.registrationStep,
      uniqueId: result.uniqueId?.displayId || null,
      hasSubscription: !!result.subscription
    });

  } catch (error: any) {
    console.error('Create test user error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// src/app/api/admin/change-user-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const adminUser = await requireAuth(token);
    
    // Only allow admin user (ID 1)
    if (adminUser.id !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({
        success: false,
        error: 'userId and status are required'
      }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED', 'DELETED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, email: true }
    });

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Update user status in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user status
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          status,
          statusChangedAt: new Date(),
          statusMetadata: JSON.stringify({
            changedBy: adminUser.id,
            changedAt: new Date().toISOString(),
            reason: 'Admin testing',
            previousStatus: currentUser.status
          })
        }
      });

      // Update related records based on status
      if (status === 'EXPIRED' || status === 'SUSPENDED') {
        // Update subscription status
        await tx.subscription.updateMany({
          where: { userId },
          data: {
            status: status === 'EXPIRED' ? 'EXPIRED' : 'CANCELED',
            currentPeriodEnd: status === 'EXPIRED' 
              ? new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
              : new Date() // Now
          }
        });

        // Update unique ID status
        await tx.uniqueId.updateMany({
          where: { userId },
          data: {
            status: status === 'SUSPENDED' ? 'INACTIVE' : 'ACTIVE'
          }
        });

      } else if (status === 'ACTIVE') {
        // Reactivate subscription
        await tx.subscription.updateMany({
          where: { userId },
          data: {
            status: 'ACTIVE',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          }
        });

        // Reactivate unique ID
        await tx.uniqueId.updateMany({
          where: { userId },
          data: {
            status: 'ACTIVE'
          }
        });

      } else if (status === 'DELETED') {
        // Mark subscription as canceled
        await tx.subscription.updateMany({
          where: { userId },
          data: {
            status: 'CANCELED'
          }
        });

        // Mark unique ID as inactive
        await tx.uniqueId.updateMany({
          where: { userId },
          data: {
            status: 'INACTIVE'
          }
        });
      }

      // Log the change
      await tx.auditLog.create({
        data: {
          userId,
          action: 'STATUS_CHANGED_BY_ADMIN',
          resourceType: 'User',
          resourceId: userId,
          details: {
            oldStatus: currentUser.status,
            newStatus: status,
            changedBy: adminUser.id,
            userEmail: currentUser.email
          }
        }
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      userId,
      oldStatus: currentUser.status,
      newStatus: status,
      email: currentUser.email
    });

  } catch (error: any) {
    console.error('Change user status error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// src/app/api/admin/cleanup-test-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);
    
    // Only allow admin user (ID 1)
    if (user.id !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find all test users
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { email: { contains: '@example.com' } },
          { firstName: { contains: 'Test' } }
        ]
      },
      select: { id: true, email: true }
    });

    const userIds = testUsers.map(u => u.id);

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: 'No test users found'
      });
    }

    // Delete in the correct order to respect foreign key constraints
    const deletionResult = await prisma.$transaction(async (tx) => {
      // Delete audit logs
      const auditLogsDeleted = await tx.auditLog.deleteMany({
        where: { userId: { in: userIds } }
      });

      // Delete found item reports
      const reportsDeleted = await tx.foundItemReport.deleteMany({
        where: { userId: { in: userIds } }
      });

      // Delete payments
      const paymentsDeleted = await tx.payment.deleteMany({
        where: { userId: { in: userIds } }
      });

      // Delete subscriptions
      const subscriptionsDeleted = await tx.subscription.deleteMany({
        where: { userId: { in: userIds } }
      });

      // Delete unique IDs
      const uniqueIdsDeleted = await tx.uniqueId.deleteMany({
        where: { userId: { in: userIds } }
      });

      // Finally delete users
      const usersDeleted = await tx.user.deleteMany({
        where: { id: { in: userIds } }
      });

      return {
        usersDeleted: usersDeleted.count,
        auditLogsDeleted: auditLogsDeleted.count,
        reportsDeleted: reportsDeleted.count,
        paymentsDeleted: paymentsDeleted.count,
        subscriptionsDeleted: subscriptionsDeleted.count,
        uniqueIdsDeleted: uniqueIdsDeleted.count
      };
    });

    // Log the cleanup
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEST_USERS_CLEANUP',
        resourceType: 'User',
        resourceId: user.id,
        details: {
          ...deletionResult,
          deletedUserEmails: testUsers.map(u => u.email),
          cleanupBy: user.id
        }
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: deletionResult.usersDeleted,
      details: deletionResult,
      message: `Successfully deleted ${deletionResult.usersDeleted} test users and all related data`
    });

  } catch (error: any) {
    console.error('Cleanup test users error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}

// src/app/api/support/reactivation-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);

    const body = await request.json();
    const { userId, reason, message } = body;

    if (!reason || !message) {
      return NextResponse.json({
        success: false,
        error: 'Reason and message are required'
      }, { status: 400 });
    }

    // Validate reason
    const validReasons = [
      'accidental_deletion',
      'payment_issue', 
      'technical_problem',
      'misunderstanding',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      return NextResponse.json({
        success: false,
        error: `Invalid reason. Must be one of: ${validReasons.join(', ')}`
      }, { status: 400 });
    }

    // Create reactivation request record
    const requestRecord = await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REACTIVATION_REQUEST',
        resourceType: 'User',
        resourceId: user.id,
        details: {
          reason,
          message: message.trim(),
          requestedAt: new Date().toISOString(),
          userStatus: user.status,
          userEmail: user.email,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      }
    });

    // In a real application, you would:
    // 1. Send email notification to support team
    // 2. Create a support ticket in your ticketing system
    // 3. Add to admin queue for review
    // 4. Send confirmation email to user

    console.log('📧 Reactivation request submitted:', {
      requestId: requestRecord.id,
      userId: user.id,
      email: user.email,
      reason,
      message: message.substring(0, 100) + '...'
    });

    // TODO: Send email notifications
    // await sendReactivationRequestEmail({
    //   supportEmail: 'support@iamlost.help',
    //   userEmail: user.email,
    //   reason,
    //   message,
    //   requestId: requestRecord.id
    // });

    return NextResponse.json({
      success: true,
      requestId: requestRecord.id,
      message: 'Your reactivation request has been submitted successfully. Our support team will review it within 24 hours.',
      expectedResponse: '24 hours'
    });

  } catch (error: any) {
    console.error('Reactivation request error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
