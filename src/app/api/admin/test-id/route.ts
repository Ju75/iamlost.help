// src/app/api/admin/test-id/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateUniqueId } from '@/lib/unique-id';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);
    
    // Only allow specific admin users (add your user ID)
    const adminUserIds = [1]; // Replace with your actual user ID
    if (!adminUserIds.includes(user.id)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    // Generate test ID
    const { displayId, encryptedToken } = await generateUniqueId();
    
    return NextResponse.json({
      success: true,
      displayId,
      encryptedToken,
      note: "This is a test generation - not saved to database"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 401 });
  }
}
