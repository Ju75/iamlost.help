// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser, logUserActivity } from '@/lib/auth';
import { loginSchema, validateData } from '@/lib/validation';

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
    const validation = validateData(loginSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: validation.error 
        },
        { status: 400 }
      );
    }

    // Attempt login
    const { user, token } = await loginUser(validation.data!.email, validation.data!.password);

    // Log successful login
    await logUserActivity(
      user.id,
      'USER_LOGIN',
      { email: user.email },
      ipAddress,
      userAgent
    );

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          preferredLanguage: user.preferredLanguage
        }
      },
      { status: 200 }
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
    console.error('Login error:', error);
    
    // Log failed login attempt (if we have user info)
    try {
      const body = await request.clone().json();
      if (body.email) {
        const ipAddress = request.ip || 
                         request.headers.get('x-forwarded-for')?.split(',')[0] || 
                         'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        
        await logUserActivity(
          0, // No user ID for failed attempts
          'LOGIN_FAILED',
          { 
            email: body.email,
            reason: error.message 
          },
          ipAddress,
          userAgent
        );
      }
    } catch (logError) {
      console.error('Failed to log login attempt:', logError);
    }

    // Handle known errors
    if (error.message === 'Invalid email or password') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email or password' 
        },
        { status: 401 }
      );
    }

    if (error.message === 'Account is suspended or deleted') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account is not active. Please contact support.' 
        },
        { status: 403 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        success: false,
        error: 'Login failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}
