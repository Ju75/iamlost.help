// src/app/dashboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface DashboardData {
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
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
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if not authenticated
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

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `iamlost-stickers-${dashboardData?.uniqueId?.displayId || 'stickers'}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Show success message
      alert('✅ Stickers PDF downloaded! Print and attach to your items.');
      
    } catch (error: any) {
      console.error('Download error:', error);
      alert(`❌ Download failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <p>No dashboard data available</p>
        </div>
      </div>
    );
  }

  const qrCodeUrl = dashboardData.uniqueId 
    ? `https://iamlost.help/found/${dashboardData.uniqueId.encryptedToken}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">iamlost.help</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {dashboardData.user.firstName?.[0] || dashboardData.user.email[0].toUpperCase()}
              </div>
              <span className="text-gray-700">
                {dashboardData.user.firstName} {dashboardData.user.lastName}
              </span>
            </div>
            <button 
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {dashboardData.user.firstName || 'User'}! 👋
          </h1>
          <p className="text-blue-100 text-lg">
            {dashboardData.stats.isActive 
              ? "Your items are protected and ready. Your unique ID is active and monitoring for any found reports."
              : "Your subscription needs attention. Please renew to keep your items protected."
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">{dashboardData.stats.isActive ? '✅' : '⚠️'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {dashboardData.stats.isActive ? 'Active' : 'Inactive'}
            </div>
            <div className="text-gray-600">Subscription Status</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🏷️</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">∞</div>
            <div className="text-gray-600">Items Protected</div>
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
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center mb-6">
                      <div className="font-mono text-4xl font-bold text-blue-600 mb-2">
                        {dashboardData.uniqueId.displayId}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-green-600 font-semibold mb-4">
                        <span>✅</span>
                        <span>{dashboardData.uniqueId.status === 'ACTIVE' ? 'Active & Monitoring' : 'Inactive'}</span>
                      </div>
                      
                      {/* QR Code Preview */}
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
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <button 
                        onClick={downloadStickers}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        📄 Download Stickers
                      </button>
                      <button 
                        onClick={copyQRUrl}
                        className="flex items-center justify-center gap-2 bg-white text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                      >
                        🔗 Copy QR Link
                      </button>
                    </div>

                    {/* URLs for sharing */}
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

            {/* Protection Status */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  📊 Your Protection Status
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className={`flex items-start gap-3 p-3 rounded-lg ${
                    dashboardData.stats.isActive ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      dashboardData.stats.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {dashboardData.stats.isActive ? '🛡️' : '⚠️'}
                    </div>
                    <div>
                      <div className={`font-semibold ${
                        dashboardData.stats.isActive ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Protection {dashboardData.stats.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <div className={`text-sm ${
                        dashboardData.stats.isActive ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {dashboardData.stats.isActive 
                          ? `Your unique ID ${dashboardData.uniqueId?.displayId} is monitoring 24/7`
                          : 'Your subscription has expired. Renew to reactivate protection.'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      📄
                    </div>
                    <div>
                      <div className="font-semibold text-blue-800">Stickers Ready</div>
                      <div className="text-blue-700 text-sm">Download and print your QR codes anytime</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">
                      🌍
                    </div>
                    <div>
                      <div className="font-semibold text-purple-800">Global Network</div>
                      <div className="text-purple-700 text-sm">Protected by millions of helpful people worldwide</div>
                    </div>
                  </div>
                </div>
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
                    <button className="w-full bg-white text-blue-600 border-2 border-blue-600 py-2 px-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                      Manage Subscription
                    </button>
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

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  🔗 Quick Links
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {[
                    { icon: '🎨', label: 'Sticker Templates', href: '/sticker-templates' },
                    { icon: '📧', label: 'Found Reports', href: '/found-reports' },
                    { icon: '⚙️', label: 'Account Settings', href: '/account-settings' },
                    { icon: '❓', label: 'Help Center', href: '/help' },
                    { icon: '💬', label: 'Contact Support', href: '/contact' }
                  ].map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="flex items-center gap-3 p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  💡 Pro Tips
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                  <div>
                    <strong className="text-gray-800">Print multiple stickers</strong> for all your important items - keys, wallet, bag, laptop!
                  </div>
                  <div>
                    <strong className="text-gray-800">Check your email regularly</strong> for found item notifications.
                  </div>
                  <div>
                    <strong className="text-gray-800">Test the system</strong> by sharing your QR code with friends and family.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
