// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { validateData, registerSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateData(registerSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const userData = validation.data!;
    
    // Attempt registration
    const { user, token } = await registerUser(userData);
    
    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
