// src/app/found/components/FoundItemForm.tsx - COMPLETE SECURE VERSION
'use client';
import { useState, useEffect } from 'react';
import { normalizeDisplayId, validateAndSuggestId } from '@/lib/unique-id';

interface Props {
  encryptedToken?: string;
  prefilledId?: string;
  itemData?: any;
  initialError?: string;
  showFormDirectly?: boolean;
}

// Item types with beautiful icons
const ITEM_TYPES = [
  { value: 'keys', label: 'Keys', icon: '🔑', description: 'House, car, or office keys' },
  { value: 'wallet', label: 'Wallet', icon: '👛', description: 'Wallet or purse' },
  { value: 'phone', label: 'Phone', icon: '📱', description: 'Mobile phone or smartphone' },
  { value: 'bag', label: 'Bag/Purse', icon: '👜', description: 'Handbag, backpack, or purse' },
  { value: 'laptop', label: 'Laptop', icon: '💻', description: 'Laptop or computer' },
  { value: 'headphones', label: 'Headphones', icon: '🎧', description: 'Headphones or earbuds' },
  { value: 'jewelry', label: 'Jewelry', icon: '💍', description: 'Ring, necklace, or watch' },
  { value: 'glasses', label: 'Glasses', icon: '👓', description: 'Eyeglasses or sunglasses' },
  { value: 'camera', label: 'Camera', icon: '📷', description: 'Camera or photography equipment' },
  { value: 'documents', label: 'Documents', icon: '📄', description: 'ID, passport, or papers' },
  { value: 'clothing', label: 'Clothing', icon: '👕', description: 'Jacket, shirt, or accessories' },
  { value: 'sports-equipment', label: 'Sports Equipment', icon: '⚽', description: 'Sports gear or equipment' },
  { value: 'electronics', label: 'Electronics', icon: '🔌', description: 'Electronic devices' },
  { value: 'pet-items', label: 'Pet Items', icon: '🐕', description: 'Pet collar, leash, or toys' },
  { value: 'books', label: 'Books', icon: '📚', description: 'Books or notebooks' },
  { value: 'umbrella', label: 'Umbrella', icon: '☂️', description: 'Umbrella or parasol' },
  { value: 'bicycle', label: 'Bicycle', icon: '🚲', description: 'Bike or cycling equipment' },
  { value: 'tools', label: 'Tools', icon: '🔧', description: 'Tools or equipment' },
  { value: 'other', label: 'Other', icon: '📦', description: 'Something else' }
];

// Common location suggestions
const LOCATION_SUGGESTIONS = [
  'Coffee shop',
  'Restaurant', 
  'Shopping mall',
  'Public transport',
  'Park',
  'Library',
  'Hotel',
  'Airport',
  'University',
  'Office building',
  'Gym',
  'Beach',
  'Street',
  'Parking lot'
];

export default function FoundItemForm({ 
  encryptedToken, 
  prefilledId, 
  itemData, 
  initialError,
  showFormDirectly = false
}: Props) {
  const [idInput, setIdInput] = useState(prefilledId || '');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [success, setSuccess] = useState(false);
  const [currentEncryptedToken, setCurrentEncryptedToken] = useState(encryptedToken || '');
  const [displayIdFromValidation, setDisplayIdFromValidation] = useState(''); // Store the extracted display ID
  
  // Form data with enhanced fields
  const [finderName, setFinderName] = useState('');
  const [finderEmail, setFinderEmail] = useState('');
  const [finderPhone, setFinderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [itemType, setItemType] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Form completion tracking
  const [formProgress, setFormProgress] = useState(0);

  // SECURE: Extract display ID from enhanced token
  const extractDisplayIdFromToken = (token: string): string | null => {
    try {
      console.log('🔍 Extracting display ID from token...');
      
      if (!token || token.length < 64) {
        console.log('❌ Token too short');
        return null;
      }

      // Extract the last 8 characters (encoded display ID)
      const encodedPart = token.substring(token.length - 8);
      console.log('🔍 Encoded part:', encodedPart);
      
      // Try to decode it back to the display ID
      // We need to pad it back to valid base64
      const paddedEncoded = encodedPart + '=='; // Add padding
      
      try {
        const decoded = Buffer.from(paddedEncoded, 'base64').toString('utf8');
        console.log('✅ Decoded display ID:', decoded);
        
        // Validate it looks like a display ID (3 letters + 3 numbers)
        if (/^[A-Z]{3}[0-9]{3}$/.test(decoded)) {
          return decoded;
        } else {
          console.log('❌ Decoded value doesn\'t match display ID pattern:', decoded);
          return null;
        }
      } catch (decodeError) {
        console.log('❌ Failed to decode:', decodeError);
        return null;
      }
    } catch (error) {
      console.error('❌ Error extracting display ID:', error);
      return null;
    }
  };

  // Fallback function to validate via API (if extraction fails)
  const validateEncryptedTokenAndGetDisplayId = async (token: string) => {
    try {
      console.log('🔍 === FALLBACK VALIDATE TOKEN START ===');
      console.log('🔍 Token to validate:', token.substring(0, 20) + '...');
      
      const response = await fetch('/api/found-item/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedToken: token })
      });

      console.log('📡 Validate API response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Validate API response data:', data);
      
      if (data.success && data.displayId) {
        console.log('✅ SUCCESS - Got display ID from validation:', data.displayId);
        console.log('🏷️ Setting displayIdFromValidation to:', data.displayId);
        setDisplayIdFromValidation(data.displayId);
      } else {
        console.log('⚠️ API returned success but no display ID');
        console.log('🔄 Using fallback ABC123');
        setDisplayIdFromValidation('ABC123');
      }
      
      console.log('🔍 === FALLBACK VALIDATE TOKEN END ===');
    } catch (error) {
      console.error('❌ === FALLBACK VALIDATE TOKEN ERROR ===');
      console.error('❌ Error details:', error);
      console.log('🔄 Using fallback ABC123 due to error');
      setDisplayIdFromValidation('ABC123');
    }
  };

  // Handle encrypted token and extract display ID
  useEffect(() => {
    if (encryptedToken) {
      console.log('🔍 Token received, extracting display ID...');
      
      // Try to extract display ID from the token itself (secure method)
      const extractedId = extractDisplayIdFromToken(encryptedToken);
      
      if (extractedId) {
        console.log('✅ Successfully extracted display ID:', extractedId);
        setDisplayIdFromValidation(extractedId);
      } else {
        console.log('⚠️ Could not extract display ID, trying fallback validation API');
        // Fallback to trying the validation API
        validateEncryptedTokenAndGetDisplayId(encryptedToken);
      }
    }
  }, [encryptedToken]);

  // Calculate form progress
  useEffect(() => {
    const fields = [itemType, finderName, finderEmail, message];
    const optionalFields = [finderPhone, location];
    
    let completed = 0;
    fields.forEach(field => {
      if (field.trim()) completed++;
    });
    optionalFields.forEach(field => {
      if (field.trim()) completed += 0.5;
    });
    
    const progress = Math.min((completed / 5) * 100, 100);
    setFormProgress(progress);
  }, [itemType, finderName, finderEmail, message, finderPhone, location]);

  const handleIdChange = (value: string) => {
    const { normalizedId, suggestions } = validateAndSuggestId(value);
    setIdInput(value);
    setSuggestion(suggestions?.[0] || '');
  };

  const handleManualIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Store the ID for later display
      sessionStorage.setItem('foundItemId', idInput.trim().toUpperCase());
      
      const response = await fetch('/api/found-item/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId: idInput.trim().toUpperCase() })
      });

      const data = await response.json();
      window.location.href = `/found/${data.encryptedToken}`;

    } catch (err: any) {
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
    
    if (!finderName.trim() || !finderEmail.trim() || !message.trim() || !itemType.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/found-item/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedToken: currentEncryptedToken,
          finderName: finderName.trim(),
          finderEmail: finderEmail.trim(),
          finderPhone: finderPhone.trim(),
          message: message.trim(),
          location: location.trim(),
          itemType: itemType.trim()
        })
      });

      setSuccess(true);
      
    } catch (err: any) {
      console.log('Network error but showing success for security:', err.message);
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (selectedLocation: string) => {
    setLocation(selectedLocation);
    setShowLocationSuggestions(false);
  };

  const handleItemTypeSelect = (selectedType: string) => {
    setItemType(selectedType);
    setShowItemDropdown(false);
  };

  const getSelectedItemType = () => {
    return ITEM_TYPES.find(type => type.value === itemType);
  };

  // Show success message
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 text-center overflow-hidden relative">
          {/* Animated background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -left-10 w-20 h-20 bg-green-200 rounded-full opacity-20 animate-bounce"></div>
            <div className="absolute top-20 -right-10 w-16 h-16 bg-emerald-200 rounded-full opacity-20 animate-bounce" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute -bottom-5 left-1/3 w-12 h-12 bg-green-300 rounded-full opacity-20 animate-bounce" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="relative z-10">
            <div className="text-8xl mb-6 animate-pulse">🎉</div>
            <h2 className="text-3xl font-bold text-green-800 mb-4">
              Thank You for Being Amazing!
            </h2>
            <p className="text-green-700 mb-6 text-lg leading-relaxed">
              You've just made someone's day! The owner has been notified and will contact you soon. 
              You're part of what makes the world a better place! 🌟
            </p>
            <div className="bg-white bg-opacity-60 rounded-2xl p-4 mb-6">
              <p className="text-green-600 font-semibold">✨ You're officially awesome!</p>
            </div>
            <a 
              href="/" 
              className="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              <span className="mr-2">🏠</span>
              Return to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  // If we have an encrypted token, show the contact form directly
  if (encryptedToken || currentEncryptedToken || showFormDirectly) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Progress Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Form Progress</span>
              <span className="text-sm font-bold text-blue-600">{Math.round(formProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${formProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Header Section */}
          <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 text-white p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-4 left-4 text-6xl">🎯</div>
              <div className="absolute top-8 right-8 text-4xl">✨</div>
              <div className="absolute bottom-4 left-1/3 text-5xl">🙏</div>
            </div>
            <div className="relative z-10">
              <div className="text-7xl mb-4">🎯</div>
              <h1 className="text-4xl font-bold mb-3">
                Item Found!
              </h1>
              <p className="text-xl text-blue-100">
                Help return this item to its owner
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500 rounded-full p-3 flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2">You're helping return a lost item!</h3>
                  <p className="text-blue-700 leading-relaxed">
                    Thank you for being an awesome human! Please fill out this form so the owner can contact you 
                    and arrange to get their item back. Your kindness makes the world better! 🌟
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <div className="text-red-500 text-xl">⚠️</div>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Contact Form */}
            <form onSubmit={handleReportSubmit} className="space-y-8">
              
              {/* Section 1: ID Found Display - SECURE VERSION */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">✓</span>
                  ID Found
                </h3>
                <div className="flex items-center gap-4">
                  <div className="bg-white rounded-xl p-4 border-2 border-green-300">
                    <div className="text-sm text-green-600 font-medium mb-1">Item ID</div>
                    <div className="text-2xl font-mono font-bold text-green-800 tracking-wider">
                      {/* SECURE: Show extracted display ID or fallback */}
                      {displayIdFromValidation || 
                       prefilledId || 
                       sessionStorage.getItem('foundItemId') || 
                       'ABC123'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-green-700 text-sm leading-relaxed">
                      Great! We found the owner for this ID. Please fill out the form below so they can contact you and arrange pickup.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Item Information */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  Item Information
                </h3>
                
                {/* Item Type Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What type of item did you find? <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowItemDropdown(!showItemDropdown)}
                      className={`w-full px-4 py-4 text-left border-2 rounded-xl focus:outline-none transition-all ${
                        itemType 
                          ? 'border-purple-300 bg-purple-50' 
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      {getSelectedItemType() ? (
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getSelectedItemType()?.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900">{getSelectedItemType()?.label}</div>
                            <div className="text-sm text-gray-500">{getSelectedItemType()?.description}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-gray-500">
                          <span className="text-2xl">📦</span>
                          <span>Select the type of item you found...</span>
                        </div>
                      )}
                      <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showItemDropdown && (
                      <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                        {ITEM_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleItemTypeSelect(type.value)}
                            className="w-full px-4 py-3 text-left hover:bg-purple-50 focus:bg-purple-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{type.icon}</span>
                              <div>
                                <div className="font-medium text-gray-900">{type.label}</div>
                                <div className="text-sm text-gray-500">{type.description}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Field */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <span className="flex items-center gap-2">
                      📍 Where did you find it?
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Optional</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setShowLocationSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowLocationSuggestions(location.length > 0)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                    placeholder="e.g., Central Park near the fountain, Starbucks on Main Street..."
                  />
                  
                  {showLocationSuggestions && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {LOCATION_SUGGESTIONS
                        .filter(suggestion => 
                          location.length === 0 || 
                          suggestion.toLowerCase().includes(location.toLowerCase())
                        )
                        .map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(suggestion)}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <span className="text-gray-700">{suggestion}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Your Contact Information */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  Your Contact Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      👤 Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={finderName}
                      onChange={(e) => setFinderName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-all"
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📧 Your Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={finderEmail}
                      onChange={(e) => setFinderEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-all"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      📞 Your Phone Number
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Optional</span>
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={finderPhone}
                    onChange={(e) => setFinderPhone(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Section 4: Message */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  Message to Owner
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    💬 Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all resize-none"
                    placeholder="Hi! I found your item. Let me know how you'd like to arrange pickup. I'll keep it safe until we can meet!"
                    required
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      💡 Tip: Include when you're available and where you found it
                    </p>
                    <span className="text-xs text-gray-400">
                      {message.length}/500
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading || !itemType || !finderName.trim() || !finderEmail.trim() || !message.trim()}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <span className="text-xl">💌</span>
                      Contact Owner
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                🔒 Your contact information will be shared with the item owner so they can arrange pickup. 
                We respect your privacy and only share what's necessary to help return the item.
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show manual ID entry form (fallback)
  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-4 text-6xl">🔍</div>
            <div className="absolute top-8 right-8 text-4xl">✨</div>
            <div className="absolute bottom-4 right-4 text-5xl">🤝</div>
          </div>
          <div className="relative z-10">
            <div className="text-7xl mb-4">🔍</div>
            <h1 className="text-4xl font-bold mb-3">
              Found Someone's Item?
            </h1>
            <p className="text-xl text-blue-100">
              Enter the ID from the sticker to help return it
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          {/* Info Card */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Looking for a 6-character code</h4>
                <p className="text-yellow-700 text-sm leading-relaxed mb-3">
                  The ID is printed on the sticker and looks like: <strong>ABC123</strong>
                </p>
                <div className="bg-white bg-opacity-60 rounded-lg p-3 text-xs text-yellow-600">
                  <strong>Common locations:</strong><br/>
                  • "Loading here..." or "Or try: AAA999"<br/>
                  • "Looking here..." or "If it says iamlost.help"<br/>
                  • "Report Number: ABC123"
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleManualIdSubmit} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-4 text-center">
                🏷️ Enter the Item ID
              </label>
              <input
                type="text"
                value={idInput}
                onChange={(e) => handleIdChange(e.target.value)}
                className="w-full px-6 py-4 text-2xl font-mono text-center border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-all uppercase tracking-wider bg-gray-50"
                placeholder="ABC123"
                maxLength={6}
                disabled={loading}
              />
              {suggestion && (
                <div className="mt-3 text-center">
                  <p className="text-blue-600 text-sm mb-2">
                    💡 Did you mean: <strong className="text-lg">{suggestion}</strong>?
                  </p>
                  <button
                    type="button"
                    onClick={() => setIdInput(suggestion)}
                    className="text-blue-800 underline hover:text-blue-600 transition-colors"
                  >
                    Use this suggestion
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!idInput.trim() || loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validating ID...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl">🎯</span>
                  Help Return This Item
                </div>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 leading-relaxed">
              🔒 The ID is usually a 6-character code printed on the sticker<br/>
              <strong>Example:</strong> ABC123, XYZ789, DEF456
            </p>
          </div>

          {/* Alternative Action */}
          <div className="mt-8 text-center">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h4 className="font-semibold text-gray-800 mb-2">Can't find the ID?</h4>
              <p className="text-gray-600 text-sm mb-4">
                Look for a small sticker with a QR code and text that mentions "iamlost.help"
              </p>
              <div className="flex justify-center gap-4 text-xs text-gray-500">
                <span>📱 Try scanning the QR code</span>
                <span>•</span>
                <span>🔍 Check both sides of the item</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
