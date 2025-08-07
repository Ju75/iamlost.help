// src/components/FoundItemForm.tsx
'use client';
import { useState, useEffect } from 'react';
import { normalizeDisplayId, validateAndSuggestId } from '@/lib/unique-id';

interface FoundItemFormProps {
  prefilledId?: string;
  encryptedToken?: string;
}

const OBJECT_TYPES = [
  { value: 'keys', label: '🔑 Keys' },
  { value: 'wallet', label: '💳 Wallet/Purse' },
  { value: 'phone', label: '📱 Phone/Mobile' },
  { value: 'bag', label: '🎒 Bag/Backpack' },
  { value: 'laptop', label: '💻 Laptop/Tablet' },
  { value: 'jewelry', label: '💍 Jewelry' },
  { value: 'glasses', label: '👓 Glasses' },
  { value: 'watch', label: '⌚ Watch' },
  { value: 'camera', label: '📷 Camera' },
  { value: 'headphones', label: '🎧 Headphones' },
  { value: 'documents', label: '📄 Documents/Cards' },
  { value: 'pet', label: '🐕 Pet Collar/Tag' },
  { value: 'other', label: '📦 Other' },
];

export default function FoundItemForm({ prefilledId, encryptedToken }: FoundItemFormProps) {
  const [formData, setFormData] = useState({
    uniqueId: prefilledId || '',
    message: '',
    objectType: '',
    contactMethod: '',
    email: '',
    phone: '',
    captchaAnswer: ''
  });

  const [idValidation, setIdValidation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(0);

  // Generate random captcha
  useEffect(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion(`What is ${num1} + ${num2}?`);
    setCaptchaAnswer(num1 + num2);
  }, []);

  // Validate ID when it changes
  useEffect(() => {
    if (formData.uniqueId) {
      const validation = validateAndSuggestId(formData.uniqueId);
      setIdValidation(validation);
      
      // Auto-correct if we have a suggestion
      if (validation.suggestions && validation.normalizedId !== formData.uniqueId.toUpperCase()) {
        setFormData(prev => ({ ...prev, uniqueId: validation.normalizedId }));
      }
    } else {
      setIdValidation(null);
    }
  }, [formData.uniqueId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (error) setError('');
  };

  const handleContactMethodChange = (method: string) => {
    setFormData(prev => ({ 
      ...prev, 
      contactMethod: method,
      email: method === 'email' ? prev.email : '',
      phone: method === 'phone' ? prev.phone : ''
    }));
  };

  const validateForm = (): boolean => {
    if (!idValidation?.isValid) {
      setError('Please enter a valid item ID');
      return false;
    }

    if (!formData.message.trim()) {
      setError('Please describe where you found the item');
      return false;
    }

    if (!formData.objectType) {
      setError('Please select what type of item you found');
      return false;
    }

    if (!formData.contactMethod) {
      setError('Please choose how the owner can contact you');
      return false;
    }

    if (formData.contactMethod === 'email' && !formData.email.trim()) {
      setError('Please enter your email address');
      return false;
    }

    if (formData.contactMethod === 'phone' && !formData.phone.trim()) {
      setError('Please enter your phone number');
      return false;
    }

    if (parseInt(formData.captchaAnswer) !== captchaAnswer) {
      setError('Please answer the security question correctly');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/found-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uniqueId: idValidation.normalizedId,
          encryptedToken,
          message: formData.message,
          objectType: formData.objectType,
          finderContact: formData.contactMethod === 'email' ? formData.email : formData.phone,
          contactMethod: formData.contactMethod
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-4">
            Thank You for Helping!
          </h2>
          <p className="text-green-700 mb-6">
            Your message has been sent to the owner. They'll contact you soon to arrange getting their item back.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">🎁 Special Thank You!</h3>
            <p className="text-orange-700 text-sm">
              People like you make the world better. If the owner confirms this is their item, 
              we'll send you a special discount code for protecting your own belongings!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🤝</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Help Return This Item!
          </h1>
          <p className="text-gray-600">
            Fill out the form below to contact the owner and help return their lost item.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item ID {!prefilledId && <span className="text-red-500">*</span>}
            </label>
            {prefilledId ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 font-mono">
                  {formData.uniqueId}
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  ID automatically detected from QR code
                </p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  name="uniqueId"
                  value={formData.uniqueId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center"
                  placeholder="Enter ID (e.g., ABC123)"
                  maxLength={6}
                  required
                />
                {idValidation?.suggestions && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm">
                      💡 {idValidation.suggestions[0]}
                    </p>
                  </div>
                )}
                {idValidation?.errors && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">
                      ❌ {idValidation.errors[0]}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to Owner <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Hi! I found your item at... Please let me know how we can arrange the return."
              required
            />
          </div>

          {/* Object Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What did you find? <span className="text-red-500">*</span>
            </label>
            <select
              name="objectType"
              value={formData.objectType}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select item type...</option>
              {OBJECT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How can the owner contact you? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleContactMethodChange('email')}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  formData.contactMethod === 'email'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">📧</div>
                <div className="font-medium">Email</div>
              </button>
              <button
                type="button"
                onClick={() => handleContactMethodChange('phone')}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  formData.contactMethod === 'phone'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">📱</div>
                <div className="font-medium">Phone</div>
              </button>
            </div>

            {formData.contactMethod === 'email' && (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your.email@example.com"
                required
              />
            )}

            {formData.contactMethod === 'phone' && (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+33 1 23 45 67 89"
                required
              />
            )}
          </div>

          {/* Captcha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Security Check <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3 font-medium">{captchaQuestion}</p>
              <input
                type="number"
                name="captchaAnswer"
                value={formData.captchaAnswer}
                onChange={handleChange}
                className="w-24 px-3 py-2 border border-gray-300 rounded text-center"
                placeholder="?"
                required
              />
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              🔒 <strong>Privacy Protected:</strong> Your contact information will only be shared with the item owner 
              to arrange the return. We never share your details with third parties.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !idValidation?.isValid}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Message...
              </div>
            ) : (
              '🚀 Send Message to Owner'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
