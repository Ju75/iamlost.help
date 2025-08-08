'use client';
import React, { useState } from 'react';

export default function TestSubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const createTestSubscription = async (planType: string) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/test-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="text-2xl font-bold text-blue-600">iamlost.help - Test Subscription</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Development Mode</h3>
              <p className="text-yellow-700 text-sm">
                This is a test subscription system for development. No real payment will be processed.
                Once you configure Stripe, this will be replaced with real payment processing.
              </p>
            </div>
          </div>
        </div>

        {/* Test Subscription Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Test Subscription</h2>
          
          {/* Plan Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { id: 'monthly', name: 'Monthly', price: '$5.90', period: '/month' },
              { id: '6months', name: '6 Months', price: '$9.90', period: 'total', savings: '72% off' },
              { id: '12months', name: '12 Months', price: '$14.90', period: 'total', savings: '79% off', popular: true },
              { id: '24months', name: '24 Months', price: '$19.90', period: 'total', savings: '86% off' }
            ].map((plan) => (
              <div
                key={plan.id}
                className={`relative border-2 rounded-lg p-4 text-center transition-all hover:shadow-md ${
                  plan.popular ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      Popular
                    </span>
                  </div>
                )}
                
                <h3 className="font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-2xl font-bold text-gray-900 mb-1">{plan.price}</div>
                <div className="text-sm text-gray-600 mb-2">{plan.period}</div>
                
                {plan.savings && (
                  <div className="text-xs text-green-600 font-semibold mb-3">
                    {plan.savings}
                  </div>
                )}
                
                <button
                  onClick={() => createTestSubscription(plan.id)}
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                    plan.popular
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading ? 'Creating...' : `Test ${plan.name}`}
                </button>
              </div>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Creating test subscription...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-red-500 text-xl">❌</div>
                <div>
                  <h4 className="font-semibold text-red-800 mb-1">Error</h4>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  Test Subscription Created!
                </h3>
                <p className="text-green-700 mb-4">{result.message}</p>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">Subscription Details:</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Plan:</strong> {result.data.planType}</div>
                  <div><strong>Subscription ID:</strong> {result.data.subscriptionId}</div>
                  <div><strong>Your Unique ID:</strong> 
                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2 font-mono text-lg">
                      {result.data.uniqueId}
                    </code>
                  </div>
                </div>
              </div>

              <button
                onClick={goToDashboard}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                🚀 Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-blue-800 mb-2">🔧 Development Instructions:</h4>
          <ol className="text-blue-700 text-sm space-y-1 ml-4 list-decimal">
            <li>Create a test subscription using the buttons above</li>
            <li>Go to your dashboard to see your unique ID and QR code</li>
            <li>Test the found item system with your new unique ID</li>
            <li>Later, replace this with real Stripe payment processing</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
