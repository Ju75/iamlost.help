// src/app/account/suspended/page.tsx
'use client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useEffect, useState } from 'react';
import StatusAwareLayout from '@/components/layout/StatusAwareLayout';

export default function SuspendedAccountPage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if user is not suspended
    if (user && user.status !== 'SUSPENDED') {
      window.location.href = '/dashboard';
    }
  }, [user]);

  const handleResubscribe = async () => {
    setLoading(true);
    // Redirect to pricing with suspended account context
    window.location.href = '/pricing?suspended=true';
  };

  const handleContactSupport = () => {
    window.location.href = '/contact?reason=suspended';
  };

  if (!user || user.status !== 'SUSPENDED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <StatusAwareLayout requireAuth>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Warning Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Account Suspended
            </h1>

            {/* Message */}
            <p className="text-gray-700 mb-6 leading-relaxed">
              Your account has been suspended. Your unique ID is temporarily deactivated 
              and will be permanently deleted if not reactivated soon.
            </p>

            {/* User Info */}
            <div className="bg-red-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-red-700">
                <div><strong>Account:</strong> {user.email}</div>
                <div><strong>Status:</strong> Suspended</div>
                <div><strong>Action Required:</strong> Immediate</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleResubscribe}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Resubscribe Now'}
              </button>

              <button
                onClick={handleContactSupport}
                className="w-full bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Contact Support
              </button>

              <button
                onClick={logout}
                className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Warning */}
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                ⚠️ Your unique ID will be permanently deleted in 7 days if no action is taken.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StatusAwareLayout>
  );
}

// src/app/account/deleted/page.tsx
'use client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useEffect, useState } from 'react';
import StatusAwareLayout from '@/components/layout/StatusAwareLayout';

export default function DeletedAccountPage() {
  const { user, logout } = useAuth();
  const [contactForm, setContactForm] = useState({
    reason: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Redirect if user is not deleted
    if (user && user.status !== 'DELETED') {
      window.location.href = '/dashboard';
    }
  }, [user]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/support/reactivation-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          reason: contactForm.reason,
          message: contactForm.message
        }),
        credentials: 'include'
      });

      if (response.ok) {
        alert('Your reactivation request has been submitted. Our support team will contact you within 24 hours.');
        setContactForm({ reason: '', message: '' });
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (error) {
      alert('Failed to submit request. Please try again or contact support directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.status !== 'DELETED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <StatusAwareLayout requireAuth>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Deleted Icon */}
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Account Deleted
            </h1>

            {/* Message */}
            <p className="text-gray-700 mb-6 leading-relaxed text-center">
              Your account has been deleted. Your unique ID has been permanently removed 
              from our system. Contact our support team to see if reactivation is possible.
            </p>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-700 text-center">
                <div><strong>Account:</strong> {user.email}</div>
                <div><strong>Status:</strong> Deleted</div>
                <div className="text-red-600 font-medium mt-2">
                  Contact support for possible reactivation
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Reactivation Request
                </label>
                <select
                  value={contactForm.reason}
                  onChange={(e) => setContactForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="accidental_deletion">Accidental deletion</option>
                  <option value="payment_issue">Payment processing issue</option>
                  <option value="technical_problem">Technical problem</option>
                  <option value="misunderstanding">Misunderstanding</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Please explain your situation and why you'd like to reactivate your account..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Request Reactivation'}
              </button>
            </form>

            {/* Alternative Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:support@iamlost.help"
                  className="w-full text-center bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Email Support Directly
                </a>

                <button
                  onClick={logout}
                  className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StatusAwareLayout>
  );
}
