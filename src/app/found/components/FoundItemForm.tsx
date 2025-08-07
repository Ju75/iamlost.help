// src/app/found/components/FoundItemForm.tsx
'use client';
import { useState } from 'react';
import { normalizeDisplayId, validateAndSuggestId } from '@/lib/unique-id';

export default function FoundItemForm() {
  const [idInput, setIdInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  
  const handleIdChange = (value: string) => {
    const { normalizedId, suggestions } = validateAndSuggestId(value);
    setIdInput(value);
    setSuggestion(suggestions?.[0] || '');
  };
  
  return (
    <div>
      <input 
        value={idInput}
        onChange={(e) => handleIdChange(e.target.value)}
        placeholder="Enter ID (e.g., ABC123)"
      />
      {suggestion && (
        <div className="text-blue-600">
          Did you mean: <strong>{suggestion}</strong>?
        </div>
      )}
    </div>
  );
}
