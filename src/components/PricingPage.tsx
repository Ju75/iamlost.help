// src/components/PricingPage.tsx - FIXED VERSION
'use client';
import { useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import Link from 'next/link';

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 590,
    displayPrice: '$5.90',
    period: 'month',
    description: 'Perfect for trying out',
    features: [
      'Unlimited QR codes',
      'Instant notifications', 
      'Anonymous contact system',
      '24/7 recovery service',
      'Printable stickers'
    ],
    popular: false
  },
  {
    id: '6months',
    name: '6 Months',
    price: 990,
    displayPrice: '$9.90',
    monthlyPrice: '$1.65',
    period: '6 months',
    savings: 72,
    description: 'Great value for regular users',
    features: [
      'Everything in Monthly',
      'Better value per month',
      'Single payment convenience', 
      'Priority support',
      'Advanced sticker templates'
    ],
    popular: false
  },
  {
    id: '12months',
    name: '12 Months',
    price: 1490,
    displayPrice: '$14.90',
    monthlyPrice: '$1.24',
    period: 'year',
    savings: 79,
    description: 'Best value guaranteed',
    features: [
      'Everything in 6 Months',
      'Best value guaranteed',
      'Premium sticker designs',
      'Custom QR templates', 
      'Phone support'
    ],
    popular: true
  },
  {
    id: '24months',
    name: '24 Months',
    price: 1990,
    displayPrice: '$19.90',
    monthlyPrice: '$0.83',
    period: '2 years',
    savings: 86,
    description: 'Maximum savings',
    features: [
      'Everything in 12 Months',
      'Maximum savings',
      'VIP customer status',
      'Early access to features',
      'Dedicated support'
    ],
    popular: false
  }
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setLoading(planId);
    setError('');

    try {
      // FIXED: Check if user is PENDING (completing registration)
      if (user.status === 'PENDING') {
        console.log('Pending user selecting plan, using registration flow...');
        
        // Step 1: Update user's plan selection
        const step2Response = await fetch('/api/auth/register-step2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.id, 
            selectedPlanId: planId 
          }),
          credentials: 'include'
        });

        const step2Data = await step2Response.json();
        
        if (!step2Response.ok) {
          throw new Error(step2Data.error || 'Failed to save plan selection');
        }

        console.log('Plan selection saved, proceeding to payment...');

        // Step 2: Complete registration with payment
        const response = await fetch('/api/auth/register-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe checkout
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          throw new Error('No checkout URL received');
        }

      } else {
        // User is ACTIVE, use regular checkout flow
        console.log('Active user subscribing, using regular checkout...');
        
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }

    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              iamlost.help
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-700">
                    Welcome, {user.firstName || user.email}!
                    {user.status === 'PENDING' && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                        Completing Registration
                      </span>
                    )}
                  </span>
                  <Link 
                    href="/dashboard"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-600 hover:text-gray-900">
                    Login
                  </Link>
                  <Link 
                    href="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Choose Your <span className="text-blue-600">Protection Plan</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            All plans include unlimited QR codes, instant notifications, and anonymous contact system. 
            Start protecting your items today!
          </p>
          
          {/* Show registration progress for pending users */}
          {user?.status === 'PENDING' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-blue-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Step 2 of 3: Choose Your Plan</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                You're almost done! Select a plan below to complete your registration.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg inline-block mb-8">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
                  plan.popular 
                    ? 'border-orange-400 transform scale-105' 
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-blue-600 mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.displayPrice}
                      </span>
                      {plan.monthlyPrice && (
                        <div className="text-sm text-gray-600 mt-1">
                          {plan.monthlyPrice}/month
                        </div>
                      )}
                    </div>
                    {plan.savings && (
                      <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        Save {plan.savings}%
                      </div>
                    )}
                    <p className="text-gray-600 mt-4">{plan.description}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <svg className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.id ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {user?.status === 'PENDING' ? 'Completing...' : 'Processing...'}
                      </div>
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            What's Included in Every Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlimited Items</h3>
              <p className="text-gray-600">Protect as many items as you want with unlimited QR codes and unique IDs</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Universal Compatibility</h3>
              <p className="text-gray-600">Works with any smartphone camera - no app required for finders</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12.061 2.061A8.967 8.967 0 0118 12c0 2.138-.75 4.104-2 5.659V21l-3-3H8a8 8 0 014.061-15.939z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Alerts</h3>
              <p className="text-gray-600">Get notified immediately when someone finds your lost item</p>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">30-Day Money-Back Guarantee</h2>
          <p className="text-blue-700">
            Not satisfied? Get a full refund within 30 days, no questions asked. 
            We're confident you'll love our service.
          </p>
        </div>
      </section>
    </div>
  );
}
