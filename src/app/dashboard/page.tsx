// src/app/dashboard/page.tsx - Enhanced with status-based access control
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import StatusAwareLayout from '@/components/layout/StatusAwareLayout';

interface DashboardData {
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    status: string;
    registrationStep: string;
  };
  uniqueId?: {
    displayId: string;
    encryptedToken: string;
    status: string;
    createdAt: string;
  };
  subscription?: {
    planType: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  stats: {
    foundReportsCount: number;
    isActive: boolean;
  };
  recentReports: Array<{
    id: number;
    objectType: string;
    finderMessage: string;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { user, logout, canAccessDashboard, getStatusMessage } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      // Check if user can access dashboard
      if (!canAccessDashboard()) {
        if (user.status === 'PENDING') {
          window.location.href = '/pricing';
          return;
        } else if (user.status === 'SUSPENDED') {
          window.location.href = '/account/suspended';
          return;
        } else if (user.status === 'DELETED') {
          window.location.href = '/account/deleted';
          return;
        }
      }
      
      loadDashboardData();
    }
  }, [user, canAccessDashboard]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to load dashboard');
      }

      const result = await response.json();
      setDashboardData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyQRUrl = () => {
    if (dashboardData?.uniqueId) {
      const qrUrl = `https://iamlost.help/found/${dashboardData.uniqueId.encryptedToken}`;
      navigator.clipboard.writeText(qrUrl);
      alert('QR code URL copied to clipboard!');
    }
  };

  const downloadStickers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/download-stickers', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download stickers');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `iamlost-stickers-${dashboardData?.uniqueId?.displayId || 'stickers'}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('✅ Stickers PDF downloaded! Print and attach to your items.');
      
    } catch (error: any) {
      console.error('Download error:', error);
      alert(`❌ Download failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = () => {
    window.location.href = '/pricing?renew=true';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <StatusAwareLayout requireAuth requiredAccess="canAccessDashboard">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </StatusAwareLayout>
    );
  }

  if (error) {
    return (
      <StatusAwareLayout requireAuth requiredAccess="canAccessDashboard">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={loadDashboardData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </StatusAwareLayout>
    );
  }

  if (!dashboardData) {
    return (
      <StatusAwareLayout requireAuth requiredAccess="canAccessDashboard">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <p>No dashboard data available</p>
          </div>
        </div>
      </StatusAwareLayout>
    );
  }

  const statusMessage = getStatusMessage();
  const qrCodeUrl = dashboardData.uniqueId 
    ? `https://iamlost.help/found/${dashboardData.uniqueId.encryptedToken}`
    : '';

  return (
    <StatusAwareLayout requireAuth requiredAccess="canAccessDashboard">
      <div className="max-w-6xl mx-auto p-6">
        
        {/* Status-based Welcome Section */}
        <div className={`rounded-lg text-white p-6 mb-6 ${
          user.status === 'ACTIVE' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
          user.status === 'EXPIRED' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
          'bg-gradient-to-r from-gray-600 to-gray-700'
        }`}>
          <h1 className="text-3xl font-bold mb-2">
            {user.status === 'ACTIVE' ? 
              `Welcome back, ${dashboardData.user.firstName || 'User'}! 👋` :
              user.status === 'EXPIRED' ?
              `Welcome back, ${dashboardData.user.firstName || 'User'}! ⚠️` :
              `Hello, ${dashboardData.user.firstName || 'User'}`
            }
          </h1>
          <p className={`text-lg ${
            user.status === 'ACTIVE' ? 'text-blue-100' :
            user.status === 'EXPIRED' ? 'text-orange-100' :
            'text-gray-100'
          }`}>
            {user.status === 'ACTIVE' ? 
              "Your items are protected and ready. Your unique ID is active and monitoring for any found reports." :
              user.status === 'EXPIRED' ?
              "Your subscription has expired, but you still have limited access. Renew now to restore full protection." :
              "Your account requires attention."
            }
          </p>
          
          {user.status === 'EXPIRED' && (
            <div className="mt-4">
              <button
                onClick={handleRenewSubscription}
                className="bg-white text-orange-600 font-semibold px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors"
              >
                Renew Subscription Now
              </button>
            </div>
          )}
        </div>

        {/* Status-based Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
              user.status === 'ACTIVE' ? 'bg-green-100' :
              user.status === 'EXPIRED' ? 'bg-orange-100' :
              'bg-red-100'
            }`}>
              <span className="text-2xl">
                {user.status === 'ACTIVE' ? '✅' :
                 user.status === 'EXPIRED' ? '⏰' :
                 '⚠️'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {user.status === 'ACTIVE' ? 'Active' :
               user.status === 'EXPIRED' ? 'Expired' :
               user.status}
            </div>
            <div className="text-gray-600">Account Status</div>
            {user.status === 'EXPIRED' && (
              <div className="mt-2">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  Limited Access
                </span>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🏷️</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {dashboardData.stats.isActive ? '∞' : '0'}
            </div>
            <div className="text-gray-600">Items Protected</div>
            {!dashboardData.stats.isActive && (
              <div className="mt-2">
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  Protection Inactive
                </span>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📧</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{dashboardData.stats.foundReportsCount}</div>
            <div className="text-gray-600">Found Reports</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - My Unique ID */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  🔑 My Unique ID
                </h2>
              </div>
              <div className="p-6">
                {dashboardData.uniqueId ? (
                  <>
                    {/* ID Display */}
                    <div className={`border-2 rounded-lg p-6 text-center mb-6 ${
                      user.status === 'ACTIVE' ? 'bg-blue-50 border-blue-200' :
                      user.status === 'EXPIRED' ? 'bg-orange-50 border-orange-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`font-mono text-4xl font-bold mb-2 ${
                        user.status === 'ACTIVE' ? 'text-blue-600' :
                        user.status === 'EXPIRED' ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {dashboardData.uniqueId.displayId}
                      </div>
                      <div className={`flex items-center justify-center gap-2 font-semibold mb-4 ${
                        user.status === 'ACTIVE' ? 'text-green-600' :
                        user.status === 'EXPIRED' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        <span>
                          {user.status === 'ACTIVE' ? '✅' :
                           user.status === 'EXPIRED' ? '⏰' :
                           '❌'}
                        </span>
                        <span>
                          {user.status === 'ACTIVE' ? 'Active & Monitoring' :
                           user.status === 'EXPIRED' ? 'Limited Access' :
                           'Inactive'}
                        </span>
                      </div>
                      
                      {/* QR Code Preview */}
                      {dashboardData.stats.isActive && (
                        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 max-w-xs mx-auto">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                            alt="QR Code"
                            className="w-full h-auto"
                          />
                          <p className="text-sm text-gray-600 mt-2">
                            Scan to report found item
                          </p>
                        </div>
                      )}

                      {/* Expired Warning */}
                      {user.status === 'EXPIRED' && (
                        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-orange-300 max-w-xs mx-auto">
                          <div className="text-orange-600 text-4xl mb-2">⏰</div>
                          <p className="text-sm text-orange-700">
                            QR codes are temporarily disabled.<br/>
                            Renew to reactivate protection.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <button 
                        onClick={downloadStickers}
                        disabled={loading || user.status !== 'ACTIVE'}
                        className={`flex items-center justify-center gap-2 font-semibold py-4 px-8 rounded-xl transition-all transform disabled:transform-none disabled:cursor-not-allowed shadow-lg ${
                          user.status === 'ACTIVE' ? 
                            'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105' :
                            'bg-gray-400 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        📄 Download Stickers
                      </button>
                      
                      <button 
                        onClick={copyQRUrl}
                        disabled={user.status !== 'ACTIVE'}
                        className={`flex items-center justify-center gap-2 font-semibold py-4 px-8 rounded-xl transition-all transform disabled:transform-none disabled:cursor-not-allowed ${
                          user.status === 'ACTIVE' ? 
                            'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 hover:scale-105' :
                            'bg-gray-100 text-gray-500 border-2 border-gray-300 cursor-not-allowed'
                        }`}
                      >
                        🔗 Copy QR Link
                      </button>
                    </div>

                    {/* URLs for sharing - only show if active */}
                    {user.status === 'ACTIVE' && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-3">Share Options:</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">QR Code:</span>{' '}
                            <code className="bg-white px-2 py-1 rounded text-blue-600 break-all">
                              {qrCodeUrl}
                            </code>
                          </div>
                          <div>
                            <span className="font-medium">Manual Entry:</span>{' '}
                            <code className="bg-white px-2 py-1 rounded text-blue-600">
                              https://iamlost.help/found?id={dashboardData.uniqueId.displayId}
                            </code>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🔑</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Unique ID Found</h3>
                    <p className="text-gray-600 mb-4">You need an active subscription to get your unique ID.</p>
                    <a 
                      href="/pricing" 
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Subscribe Now
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Subscription Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  📅 Subscription
                </h3>
              </div>
              <div className="p-6 text-center">
                {dashboardData.subscription ? (
                  <>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold mb-3 inline-block ${
                      dashboardData.subscription.status === 'ACTIVE' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {dashboardData.subscription.planType.replace('_', ' ')} Plan
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <div><strong>Status:</strong> {dashboardData.subscription.status}</div>
                      <div><strong>Expires:</strong> {new Date(dashboardData.subscription.currentPeriodEnd).toLocaleDateString()}</div>
                      <div><strong>Auto-renew:</strong> {dashboardData.subscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}</div>
                    </div>
                    
                    {user.status === 'EXPIRED' ? (
                      <button 
                        onClick={handleRenewSubscription}
                        className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                      >
                        Renew Subscription
                      </button>
                    ) : (
                      <button className="w-full bg-white text-blue-600 border-2 border-blue-600 py-2 px-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                        Manage Subscription
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">💳</div>
                    <h4 className="font-semibold text-gray-800 mb-2">No Active Subscription</h4>
                    <p className="text-gray-600 text-sm mb-4">Subscribe to protect your items</p>
                    <a 
                      href="/pricing"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
                    >
                      Subscribe Now
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Recent Found Reports */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  📧 Recent Reports
                </h3>
              </div>
              <div className="p-6">
                {dashboardData.recentReports.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentReports.map((report) => (
                      <div key={report.id} className="border-l-4 border-blue-500 pl-3 py-2">
                        <div className="font-semibold text-gray-800 text-sm">
                          {report.objectType} Found
                        </div>
                        <div className="text-gray-600 text-xs mb-1">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-gray-700 text-sm">
                          {report.finderMessage.length > 50 
                            ? `${report.finderMessage.substring(0, 50)}...`
                            : report.finderMessage
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-gray-600 text-sm">No found reports yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Testing Link */}
            {user.id === 1 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">🔧 Admin Tools</h4>
                <a 
                  href="/admin/test-registration"
                  className="text-yellow-700 hover:text-yellow-900 underline text-sm"
                >
                  Registration Testing Suite
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </StatusAwareLayout>
  );
}
