// src/middleware.ts - Enhanced middleware for registration flow
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication or special handling
  const publicRoutes = [
    '/',
    '/login', 
    '/register',
    '/pricing',  // IMPORTANT: Pricing must be accessible for pending users
    '/found',
    '/help',
    '/contact',
    '/terms',
    '/privacy'
  ];

  // API routes that should bypass middleware completely
  const apiRoutes = [
    '/api/auth',
    '/api/found-item',
    '/api/webhooks'
  ];

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // If no token and accessing protected route, redirect to login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If token exists, verify and check user status
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (!decoded) {
        // Invalid token, redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
        return response;
      }

      // Get user details to check status
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          status: true,
          registrationStep: true
        }
      });

      if (!user) {
        // User not found, redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
        return response;
      }

      // Handle different user statuses
      if (user.status === 'PENDING') {
        // User hasn't completed registration
        
        // Allow access to registration-related routes
        if (pathname.includes('/register') || pathname.includes('/pricing') || pathname.startsWith('/api/auth/register')) {
          return NextResponse.next();
        }

        // Redirect based on registration step
        if (user.registrationStep === 'INFO_COLLECTED') {
          // Need to select plan
          return NextResponse.redirect(new URL('/register?step=plan', request.url));
        } else if (user.registrationStep === 'PLAN_SELECTED') {
          // Need to complete payment
          return NextResponse.redirect(new URL('/register?step=payment', request.url));
        } else {
          // Restart registration
          return NextResponse.redirect(new URL('/register', request.url));
        }
      } else if (user.status === 'EXPIRED') {
        // Subscription expired, redirect to pricing
        if (!pathname.includes('/pricing') && !isPublicRoute) {
          return NextResponse.redirect(new URL('/pricing?expired=true', request.url));
        }
      } else if (user.status === 'ACTIVE') {
        // Active user - allow access to all routes
        return NextResponse.next();
      } else {
        // Suspended, deleted, or other status - redirect to login
        const response = NextResponse.redirect(new URL('/login?error=account_suspended', request.url));
        response.cookies.delete('auth-token');
        return response;
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      // On error, clear token and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (all auth endpoints including /api/auth/me)
     * - api/webhooks (webhooks)
     * - api/found-item (public found item API)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|api/webhooks|api/found-item|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
