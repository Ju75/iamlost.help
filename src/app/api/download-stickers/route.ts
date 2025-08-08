// src/app/api/download-stickers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateStickerPDF } from '@/lib/jspdf-generator'; // Changed import
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const token = request.cookies.get('auth-token')?.value;
    const user = await requireAuth(token);

    // Get user's unique ID
    const uniqueId = await prisma.uniqueId.findUnique({
      where: { userId: user.id },
      select: {
        displayId: true,
        encryptedToken: true,
        status: true
      }
    });

    if (!uniqueId) {
      return NextResponse.json(
        { error: 'No unique ID found. Please subscribe first.' },
        { status: 404 }
      );
    }

    if (uniqueId.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Your unique ID is not active. Please renew your subscription.' },
        { status: 402 }
      );
    }

    // Generate QR code URL
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/found/${uniqueId.encryptedToken}`;

    // Generate PDF using jsPDF
    const pdfBuffer = await generateStickerPDF({
      uniqueId: uniqueId.displayId,
      qrCodeUrl,
      encryptedToken: uniqueId.encryptedToken,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    });

    // Return PDF as download
    const response = new NextResponse(pdfBuffer);
    
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="iamlost-stickers-${uniqueId.displayId}.pdf"`);
    response.headers.set('Cache-Control', 'no-cache');

    return response;

  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate stickers PDF' },
      { status: 500 }
    );
  }
}
