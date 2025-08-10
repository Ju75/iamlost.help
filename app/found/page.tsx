// src/app/found/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import FoundItemForm from '@/app/found/components/FoundItemForm';

export default function FoundPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [encryptedToken, setEncryptedToken] = useState('');

  // Check if there's an ID in the URL parameters
  const urlId = searchParams.get('id');

  useEffect(() => {
    // If there's an ID in the URL, encrypt it and get the token
    if (urlId) {
      encryptUrlId(urlId);
    }
  }, [urlId]);

  const encryptUrlId = async (displayId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/found-item/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId: displayId.toUpperCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid ID');
      }

      // Set the encrypted token so the form can use it
      setEncryptedToken(data.encryptedToken);
      
      // Update URL to remove the ID parameter for security (clean URL)
      router.replace('/found', { scroll: false });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state only if we're processing a URL ID
  if (loading && urlId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating item ID...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-2xl font-bold text-blue-600">
              iamlost.help
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <FoundItemForm 
          prefilledId={urlId} 
          encryptedToken={encryptedToken}
          initialError={error}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p className="mb-2">🌍 Helping people reunite with their belongings worldwide</p>
            <p className="text-sm">
              By using this service, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">Terms</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
