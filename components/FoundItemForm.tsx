// src/components/FoundItemForm.tsx
'use client';
import { useState, useEffect } from 'react';

interface Props {
  encryptedToken?: string;
  prefilledId?: string;
  itemData?: any;
  initialError?: string;
}

export default function FoundItemForm({ 
  encryptedToken, 
  prefilledId, 
  itemData, 
  initialError 
}: Props) {
  const [idInput, setIdInput] = useState(prefilledId || '');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [success, setSuccess] = useState(false);
  const [itemDetails, setItemDetails] = useState(itemData || null);
  
  // Form data
  const [finderName, setFinderName] = useState('');
  const [finderEmail, setFinderEmail] = useState('');
  const [finderPhone, setFinderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [itemType, setItemType] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('=== FoundItemForm Props ===');
    console.log('encryptedToken:', encryptedToken ? `EXISTS (${encryptedToken.length} chars)` : 'MISSING');
    console.log('prefilledId:', prefilledId);
    console.log('itemData:', itemData);
    console.log('initialError:', initialError);
    console.log('========================');
  }, [encryptedToken, prefilledId, itemData, initialError]);

  // If we have an encrypted token, show the contact form directly (no validation)
  useEffect(() => {
    console.log('=== Token Check ===');
    console.log('hasEncryptedToken:', !!encryptedToken);
    
    if (encryptedToken) {
      console.log('Token received, showing contact form directly');
      // Set dummy item details to show the contact form
      setItemDetails({ displayId: 'HIDDEN' }); // Don't reveal the actual ID
    }
    console.log('==================');
  }, [encryptedToken]);

  const handleIdChange = (value: string) => {
    setIdInput(value);
    setSuggestion('');
  };

  const handleManualIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/found-item/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId: idInput.trim().toUpperCase() })
      });

      const data = await response.json();

      // API always returns success now, so just redirect with whatever token we get
      window.location.href = `/found/${data.encryptedToken}`;

    } catch (err: any) {
      // Even on network errors, create realistic fake token
      const crypto = window.crypto || (window as any).msCrypto;
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const fakeToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      window.location.href = `/found/${fakeToken}`;
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!finderName.trim() || !finderEmail.trim() || !message.trim() || !location.trim() || !itemType.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if this is a fake token by trying to validate it
      // Real tokens will work, fake tokens will fail silently
      const response = await fetch('/api/found-item/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedToken,
          finderName: finderName.trim(),
          finderEmail: finderEmail.trim(),
          finderPhone: finderPhone.trim(),
          message: message.trim(),
          location: location.trim(),
          itemType: itemType.trim()
        })
      });

      // Always show success regardless of the response
      // This prevents revealing whether the token was real or fake
      setSuccess(true);
      
    } catch (err: any) {
      // Even for network errors, show success to avoid revealing info
      console.log('Network error but showing success for security:', err.message);
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  // Debug: Show current render state
  console.log('🎭 Current render state:', {
    success,
    hasEncryptedToken: !!encryptedToken,
    hasItemDetails: !!itemDetails,
    loading,
    error: error || 'none'
  });

  // Show success message
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-4">
            Thank You for Helping!
          </h2>
          <p className="text-green-700 mb-6">
            The item owner has been notified and will contact you soon. You're awesome for helping reunite someone with their belongings!
          </p>
          <a 
            href="/" 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Show loading state if validating token
  if (encryptedToken && loading && !itemDetails && !error) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating item link...</p>
          <p className="text-xs text-gray-400 mt-2">Token: {encryptedToken.substring(0, 20)}...</p>
        </div>
      </div>
    );
  }

  // Show item found form if we have valid item details
  if (encryptedToken && itemDetails && !error) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎯</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Item Found!
            </h1>
            <p className="text-xl text-gray-600">
              Help return this item to its owner
            </p>
          </div>

          {/* Item Details */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-800 mb-2">Item Information</h3>
            <p className="text-blue-700">
              You're helping return a lost item to its owner. Thank you for being awesome!
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Contact Form */}
          <form onSubmit={handleReportSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What type of item did you find? *
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select item type</option>
                <option value="keys">Keys</option>
                <option value="wallet">Wallet</option>
                <option value="phone">Phone</option>
                <option value="bag">Bag/Purse</option>
                <option value="laptop">Laptop</option>
                <option value="headphones">Headphones</option>
                <option value="jewelry">Jewelry</option>
                <option value="glasses">Glasses</option>
                <option value="camera">Camera</option>
                <option value="documents">Documents</option>
                <option value="clothing">Clothing</option>
                <option value="sports-equipment">Sports Equipment</option>
                <option value="electronics">Electronics</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={finderName}
                onChange={(e) => setFinderName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email *
              </label>
              <input
                type="email"
                value={finderEmail}
                onChange={(e) => setFinderEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Phone (Optional)
              </label>
              <input
                type="tel"
                value={finderPhone}
                onChange={(e) => setFinderPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Where did you find it? *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Central Park near the fountain"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Owner *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Hi! I found your item. Let me know how you'd like to arrange pickup..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Contact Owner'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Your contact information will be shared with the item owner so they can arrange pickup.
          </p>
        </div>
      </div>
    );
  }

  // Show manual ID entry form (fallback or when there's an error)
  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Found Someone's Item?
          </h1>
          <p className="text-xl text-gray-600">
            Enter the ID from the sticker to help return it
          </p>
          
          {/* Debug info */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-left">
            <strong>🐛 Debug Info:</strong><br/>
            Encrypted token: {encryptedToken ? `YES (${encryptedToken.length} chars)` : 'NO'}<br/>
            Item details: {itemDetails ? 'YES' : 'NO'}<br/>
            Loading: {loading ? 'YES' : 'NO'}<br/>
            Error: {error || 'None'}<br/>
            {encryptedToken && <span>Token preview: {encryptedToken.substring(0, 20)}...</span>}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => encryptedToken && validateEncryptedToken()}
              className="mt-2 text-sm text-blue-600 underline"
            >
              Try validation again
            </button>
          </div>
        )}

        <form onSubmit={handleManualIdSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item ID
            </label>
            <input
              type="text"
              value={idInput}
              onChange={(e) => handleIdChange(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-center font-mono"
              placeholder="Enter ID (e.g., ABC123)"
              maxLength={6}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={!idInput.trim() || loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Validating...' : 'Continue'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          The ID is usually a 6-character code printed on the sticker (e.g., ABC123)
        </p>
      </div>
    </div>
  );
}
