// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { validateData, loginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateData(loginSchema, body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password } = validation.data!;
    
    // Attempt login
    const { user, token } = await loginUser(email, password);
    
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
      { error: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}
