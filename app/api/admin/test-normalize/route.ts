// src/app/api/admin/test-normalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { normalizeDisplayId, validateAndSuggestId } from '@/lib/unique-id';

export async function GET(request: NextRequest) {
  const testInputs = [
    'v0m493',      // Should become VOM493
    'vom 493',     // Should become VOM493  
    'vom4g3',      // Should become VOM4G3
    'VoM493',      // Should become VOM493
    '0om493',      // Should become OOM493
  ];
  
  const results = testInputs.map(input => ({
    input,
    normalized: normalizeDisplayId(input),
    validation: validateAndSuggestId(input)
  }));
  
  return NextResponse.json({ results });
}
