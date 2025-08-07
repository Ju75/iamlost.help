// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, logUserActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    // Log logout activity if user is authenticated
    if (token) {
      try {
        const user = await getUserFromToken(token);
        if (user) {
          const ipAddress = request.ip || 
                           request.headers.get('x-forwarded-for')?.split(',')[0] || 
                           'unknown';
          const userAgent = request.headers.get('user-agent') || 'unknown';

          await logUserActivity(
            user.id,
            'USER_LOGOUT',
            { email: user.email },
            ipAddress,
            userAgent
          );
        }
      } catch (logError) {
        console.error('Failed to log logout activity:', logError);
      }
    }

    // Create response and clear auth cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully'
      },
      { status: 200 }
    );

    // Clear the auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Immediately expire
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);
    
    // Even if there's an error, clear the cookie
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Logged out successfully' 
      },
      { status: 200 }
    );

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;
  }
}
