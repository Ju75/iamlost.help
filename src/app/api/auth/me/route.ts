// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Not authenticated' 
        },
        { status: 401 }
      );
    }

    // Get user from token
    const user = await getUserFromToken(token);
    if (!user) {
      // Token is invalid or expired, clear the cookie
      const response = NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      );

      response.cookies.delete('auth-token');
      return response;
    }

    // Return user info
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          preferredLanguage: user.preferredLanguage,
          status: user.status
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Get user info error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get user information' 
      },
      { status: 500 }
    );
  }
}
