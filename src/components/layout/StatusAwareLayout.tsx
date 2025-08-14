// src/components/layout/StatusAwareLayout.tsx
'use client';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredAccess?: 'canAccessDashboard' | 'canAccessPricing' | 'canAccessSubscriptionManagement';
}

export default function StatusAwareLayout({ 
  children, 
  requireAuth = false, 
  requiredAccess 
}: Props) {
  const { 
    user, 
    loading, 
    logout, 
    getAccessLevel, 
    getStatusMessage, 
    shouldRedirectToPricing 
  } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const accessLevel = getAccessLevel();
      
      // Handle special page redirects
      if (accessLevel.requiresSpecialPage && accessLevel.specialPageUrl) {
        const currentPath = window.location.pathname;
        if (currentPath !== accessLevel.specialPageUrl) {
          window.location.href = accessLevel.specialPageUrl;
          return;
        }
      }

      // Handle automatic redirects for PENDING/EXPIRED users trying to access dashboard
      if (shouldRedirectToPricing() && window.location.pathname === '/dashboard') {
        window.location.href = '/pricing';
        return;
      }

      // Check specific access requirements
      if (requiredAccess && !accessLevel[requiredAccess]) {
        if (user.status === 'PENDING' || user.status === 'EXPIRED') {
          window.location.href = '/pricing';
          return;
        }
      }
    }
  }, [user, loading, getAccessLevel, shouldRedirectToPricing, requiredAccess]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    window.location.href = '/login';
    return null;
  }

  const statusMessage = getStatusMessage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Status Message */}
      <header className="bg-white shadow-sm border-b relative">
        {/* Status Message Banner */}
        {statusMessage && (
          <div className={`w-full py-2 px-4 text-center text-sm ${
            statusMessage.color === 'orange' ? 'bg-orange-100 text-orange-800' :
            statusMessage.color === 'red' ? 'bg-red-100 text-red-800' :
            statusMessage.color === 'blue' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          } ${statusMessage.weight === 'bold' ? 'font-bold' : 'font-medium'}`}>
            {statusMessage.text}
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            iamlost.help
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.firstName?.[0] || user.email[0].toUpperCase()}
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-700 font-medium">
                      {user.firstName || user.email}
                    </div>
                    <div className={`text-xs ${
                      user.status === 'ACTIVE' ? 'text-green-600' :
                      user.status === 'PENDING' ? 'text-orange-600' :
                      user.status === 'EXPIRED' ? 'text-red-600' :
                      user.status === 'SUSPENDED' ? 'text-red-700' :
                      'text-gray-500'
                    }`}>
                      {user.status}
                    </div>
                  </div>
                </div>

                {/* Navigation based on status */}
                <div className="flex items-center gap-3">
                  {getAccessLevel().canAccessDashboard && (
                    <Link 
                      href="/dashboard"
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  
                  {getAccessLevel().canAccessPricing && (
                    <Link 
                      href="/pricing"
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Pricing
                    </Link>
                  )}

                  <button 
                    onClick={logout}
                    className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
