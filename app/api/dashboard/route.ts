// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie or header
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

    // Require authentication
    const user = await requireAuth(token);

    // Get user's unique ID
    const uniqueId = await prisma.uniqueId.findUnique({
      where: { userId: user.id },
      select: {
        displayId: true,
        encryptedToken: true,
        status: true,
        createdAt: true
      }
    });

    // Get user's subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ['ACTIVE', 'PAST_DUE']
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        planType: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true
      }
    });

    // Get found reports count
    const foundReportsCount = await prisma.foundItemReport.count({
      where: {
        userId: user.id
      }
    });

    // Get recent found reports
    const recentReports = await prisma.foundItemReport.findMany({
      where: {
        userId: user.id
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        objectType: true,
        finderMessage: true,
        status: true,
        createdAt: true
      }
    });

    const dashboardData = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      uniqueId,
      subscription,
      stats: {
        foundReportsCount,
        isActive: subscription?.status === 'ACTIVE' && 
                 subscription?.currentPeriodEnd > new Date()
      },
      recentReports
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    
    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
