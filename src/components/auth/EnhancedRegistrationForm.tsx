"use client";
import { NextRequest, NextResponse } from 'next/server';
import { useState } from 'react';

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 590,
    displayPrice: '$5.90',
    period: 'month',
    description: 'Perfect for trying out',
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
    popular: false
  }
];

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' }
];

export default function EnhancedRegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1); // 1: Info, 2: Plan, 3: Payment
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    emailConfirmation: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'FR',
    password: '',
    confirmPassword: '',
    preferredLanguage: 'en',
    selectedPlan: null,
    agreeToTerms: false,
    marketingConsent: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const validateStep1 = () => {
    const errors = [];
    
    if (!formData.firstName.trim()) errors.push('First name is required');
    if (!formData.lastName.trim()) errors.push('Last name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (formData.email !== formData.emailConfirmation) errors.push('Emails do not match');
    if (!formData.password) errors.push('Password is required');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match');
    if (formData.password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.push('Password must contain uppercase, lowercase, and number');
    }
    if (!formData.agreeToTerms) errors.push('You must agree to the terms');
    
    return errors;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    const errors = validateStep1();
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          emailConfirmation: formData.emailConfirmation,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          preferredLanguage: formData.preferredLanguage,
          agreeToTerms: formData.agreeToTerms,
          marketingConsent: formData.marketingConsent
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save information');
      }

      setUserId(data.userId);
      setCurrentStep(2);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (plan) => {
    if (!userId) {
      setError('User ID not found. Please restart registration.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          selectedPlanId: plan.id
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save plan selection');
      }

      setFormData(prev => ({ ...prev, selectedPlan: plan }));
      setCurrentStep(3);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!userId) {
      setError('User ID not found. Please restart registration.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-blue-600">
            iamlost.help
          </a>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Create Your Account
          </h1>
          <p className="mt-2 text-gray-600">
            Start protecting your items in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[
              { step: 1, label: 'Your Information' },
              { step: 2, label: 'Choose Plan' },
              { step: 3, label: 'Payment' }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep >= item.step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {item.step}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= item.step ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
                {index < 2 && (
                  <div className={`mx-4 h-1 w-16 ${
                    currentStep > item.step ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Information Form */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold mb-6">Tell us about yourself</h2>
            
            <div className="space-y-6">
              
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Email Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Email Address *
                  </label>
                  <input
                    type="email"
                    name="emailConfirmation"
                    value={formData.emailConfirmation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Address Fields */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Address <span className="text-sm font-normal text-gray-500">(optional)</span>
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="123 Rue de la Paix"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Paris"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        placeholder="75001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Fields */}
              <div className="border-t pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      At least 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Language Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language
                </label>
                <select
                  name="preferredLanguage"
                  value={formData.preferredLanguage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="it">🇮🇹 Italiano</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    required
                  />
                  <div className="ml-3">
                    <label className="text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/terms" className="text-blue-600 hover:underline">
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a href="/privacy" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </a>
                      {' '}*
                    </label>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="marketingConsent"
                    checked={formData.marketingConsent}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <label className="text-sm text-gray-700">
                      I'd like to receive helpful tips and updates about iamlost.help
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleStep1Submit}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Continue to Plan Selection'}
              </button>
            </div>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-blue-600 hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Choose Your Protection Plan</h2>
              <button
                onClick={goBack}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Back
              </button>
            </div>
            
            <p className="text-gray-600 mb-8">
              All plans include unlimited QR codes, instant notifications, and 24/7 item protection.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg ${
                    plan.popular 
                      ? 'border-orange-400 bg-orange-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handlePlanSelect(plan)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.displayPrice}
                      </span>
                      {plan.monthlyPrice && (
                        <div className="text-sm text-gray-600 mt-1">
                          {plan.monthlyPrice}/month
                        </div>
                      )}
                    </div>
                    {plan.savings && (
                      <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                        Save {plan.savings}%
                      </div>
                    )}
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                    
                    <button 
                      disabled={loading}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                        plan.popular
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {loading ? 'Selecting...' : `Choose ${plan.name}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Payment Confirmation */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Complete Your Registration</h2>
              <button
                onClick={goBack}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Back
              </button>
            </div>

            {formData.selectedPlan && (
              <div className="bg-blue-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Selected Plan: {formData.selectedPlan.name}
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">
                    {formData.selectedPlan.description}
                  </span>
                  <span className="text-2xl font-bold text-blue-900">
                    {formData.selectedPlan.displayPrice}
                  </span>
                </div>
                {formData.selectedPlan.savings && (
                  <p className="text-green-700 text-sm mt-2">
                    🎉 You're saving {formData.selectedPlan.savings}% compared to monthly billing!
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <h4 className="font-semibold text-gray-900">What happens next:</h4>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Secure payment processing via Stripe
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Your account will be activated immediately
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Get your unique ID and QR codes instantly
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Start protecting your items right away
                </li>
              </ul>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-4 rounded-lg transition-colors disabled:opacity-50 text-lg"
            >
              {loading ? 'Processing...' : `Complete Registration & Pay ${formData.selectedPlan?.displayPrice}`}
            </button>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <span>🔒 Secure payment</span>
                <span>•</span>
                <span>💳 All major cards accepted</span>
                <span>•</span>
                <span>↩️ 30-day refund guarantee</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
