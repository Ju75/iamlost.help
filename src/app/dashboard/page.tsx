// src/app/dashboard/page.tsx
'use client';
import { useAuth, withAuth } from '@/components/auth/AuthProvider';
import { useEffect, useState } from 'react';

function DashboardPage() {
  const { user, logout } = useAuth();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    // Check for payment success parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setPaymentSuccess(true);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - same as before */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">iamlost.help</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.firstName || user?.email}!
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Payment Success Banner */}
        {paymentSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg mb-8">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold">🎉 Payment Successful!</h3>
                <p className="text-sm mt-1">
                  Your subscription is now active! Your unique ID and QR codes are being generated. 
                  <strong> Refresh this page in a few seconds to see your ABC123 ID.</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rest of your existing dashboard content... */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 Welcome to iamlost.help!
          </h2>
          <p className="text-gray-600 mb-4">
            {paymentSuccess 
              ? "Payment successful! Your subscription is now active and your unique ID is being generated."
              : "Your account has been successfully created. Soon you'll be able to:"
            }
          </p>
          {/* Rest of existing content */}
        </div>
      </main>
    </div>
  );
}

export default withAuth(DashboardPage);
