import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, selectedPlanId } = body;

    if (!userId || !selectedPlanId) {
      return NextResponse.json(
        { error: 'User ID and plan selection are required' },
        { status: 400 }
      );
    }

    // Verify user exists and is in correct state
    const user = await prisma.user.findUnique({
      where: { 
        id: userId,
        status: 'PENDING',
        registrationStep: 'INFO_COLLECTED'
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or not in correct registration state' },
        { status: 404 }
      );
    }

    // Validate plan ID
    const validPlans = ['monthly', '6months', '12months', '24months'];
    if (!validPlans.includes(selectedPlanId)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Update user with plan selection
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        selectedPlanId,
        registrationStep: 'PLAN_SELECTED',
        statusChangedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        selectedPlanId: true,
        registrationStep: true
      }
    });

    // Log the plan selection
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REGISTRATION_STEP2_COMPLETED',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({
          step: 'PLAN_SELECTED',
          selectedPlanId
        }),
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    console.log(`✅ User plan selected: ${user.email} chose ${selectedPlanId}`);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Plan selected successfully',
      nextStep: 'payment'
    });

  } catch (error: any) {
    console.error('Register step 2 error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save plan selection' },
      { status: 500 }
    );
  }
}
