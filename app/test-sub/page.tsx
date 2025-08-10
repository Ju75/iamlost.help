// src/app/test-sub/page.tsx
'use client';
import { useState } from 'react';

export default function TestSubPage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const createTestSub = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-subscription', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Subscription Creation</h1>
      <button 
        onClick={createTestSub} 
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Creating...' : 'Create Test Subscription'}
      </button>
      
      {result && (
        <pre className="mt-4 bg-gray-100 p-4 rounded">
          {result}
        </pre>
      )}
    </div>
  );
}
