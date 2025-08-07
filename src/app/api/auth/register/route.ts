// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { registerUser, logUserActivity } from '@/lib/auth';
import { registerSchema, validateData } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    
    // Get client info for logging
    const ipAddress = request.ip || 
                     request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate input data
    const validation = validateData(registerSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: validation.error 
        },
        { status: 400 }
      );
    }

    // Register user
    const { user, token } = await registerUser(validation.data!);

    // Log registration activity
    await logUserActivity(
      user.id,
      'USER_REGISTERED',
      { email: user.email },
      ipAddress,
      userAgent
    );

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          preferredLanguage: user.preferredLanguage
        }
      },
      { status: 201 }
    );

    // Set HTTP-only cookie with JWT token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle known errors
    if (error.message === 'User already exists with this email') {
      return NextResponse.json(
        { 
          success: false,
          error: 'An account with this email address already exists' 
        },
        { status: 409 }
      );
    }

    // Handle database errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false,
          error: 'An account with this email address already exists' 
        },
        { status: 409 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        success: false,
        error: 'Registration failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}
