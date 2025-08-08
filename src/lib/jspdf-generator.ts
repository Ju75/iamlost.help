// src/lib/jspdf-generator.ts
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface StickerData {
  uniqueId: string;
  qrCodeUrl: string;
  encryptedToken: string;
  userName?: string;
}

export async function generateStickerPDF(stickerData: StickerData): Promise<Buffer> {
  try {
    console.log('Starting jsPDF generation...');
    
    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Generate QR Code as data URL
    console.log('Generating QR code...');
    const qrCodeDataUrl = await QRCode.toDataURL(stickerData.qrCodeUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Title
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text('iamlost.help - Your Protection Stickers', 105, 30, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(102, 102, 102);
    doc.text('Print these stickers and attach them to your valuable items', 105, 40, { align: 'center' });

    // Create small stickers (3x4 grid)
    const stickerWidth = 50;
    const stickerHeight = 35;
    const startX = 20;
    const startY = 60;
    const spacingX = 60;
    const spacingY = 45;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const x = startX + (col * spacingX);
        const y = startY + (row * spacingY);

        // Draw border
        doc.setDrawColor(204, 204, 204);
        doc.rect(x, y, stickerWidth, stickerHeight);

        // Add QR Code (small)
        doc.addImage(qrCodeDataUrl, 'PNG', x + 2, y + 2, 20, 20);

        // Add text
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text('Found My Item?', x + 25, y + 8);

        doc.setFontSize(8);
        doc.setTextColor(51, 51, 51);
        doc.text('Scan QR or visit:', x + 25, y + 14);
        doc.text('iamlost.help', x + 25, y + 18);

        // ID
        doc.setFontSize(12);
        doc.setTextColor(37, 99, 235);
        doc.text(`ID: ${stickerData.uniqueId}`, x + 25, y + 26);

        // Thank you
        doc.setFontSize(6);
        doc.setTextColor(102, 102, 102);
        doc.text('Thanks for helping! 🙏', x + 2, y + 32);
      }
    }

    // Add new page for large stickers
    doc.addPage();
    
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('Large Format Stickers', 105, 30, { align: 'center' });

    // Create large stickers (2x2 grid)
    const largeStickerWidth = 80;
    const largeStickerHeight = 60;
    const largeStartX = 25;
    const largeStartY = 50;
    const largeSpacingX = 90;
    const largeSpacingY = 70;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const x = largeStartX + (col * largeSpacingX);
        const y = largeStartY + (row * largeSpacingY);

        // Draw border
        doc.setLineWidth(0.5);
        doc.setDrawColor(204, 204, 204);
        doc.rect(x, y, largeStickerWidth, largeStickerHeight);

        // Large QR Code
        doc.addImage(qrCodeDataUrl, 'PNG', x + 5, y + 5, 30, 30);

        // Content
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text('Found My Item?', x + 40, y + 12);

        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text('1. Scan this QR code', x + 40, y + 20);
        doc.text('2. Fill out the form', x + 40, y + 25);
        doc.text('3. I\'ll contact you soon!', x + 40, y + 30);

        // Manual entry
        doc.setFontSize(8);
        doc.setTextColor(102, 102, 102);
        doc.text('Or visit: iamlost.help', x + 40, y + 37);

        // Large ID
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text(`ID: ${stickerData.uniqueId}`, x + 5, y + 48);

        // Thank you
        doc.setFontSize(8);
        doc.setTextColor(16, 185, 129);
        doc.text('Thank you for helping! 🌟', x + 5, y + 55);
      }
    }

    // Add instructions page
    doc.addPage();
    
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text('How to Use Your Stickers', 105, 30, { align: 'center' });

    // Instructions
    const instructions = [
      'Print the Stickers: Print this PDF on regular paper or sticker paper.',
      'Cut Out the Stickers: Carefully cut along the border lines.',
      'Attach to Your Items: Stick them on keys, wallet, bag, laptop, etc.',
      'Stay Protected 24/7: Your items are now protected worldwide!'
    ];

    let instructionY = 60;
    instructions.forEach((instruction, index) => {
      // Step number
      doc.setFillColor(37, 99, 235);
      doc.circle(25, instructionY - 2, 4, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(`${index + 1}`, 25, instructionY + 1, { align: 'center' });

      // Instruction text
      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51);
      doc.text(instruction, 35, instructionY);
      
      instructionY += 15;
    });

    // Pro Tips
    doc.setFontSize(16);
    doc.setTextColor(249, 115, 22);
    doc.text('💡 Pro Tips:', 20, instructionY + 10);

    const tips = [
      '• Use waterproof stickers for outdoor items',
      '• Place stickers in visible but secure locations',
      '• Test the QR code with your phone before applying',
      '• Replace stickers if they become damaged',
      '• Keep your subscription active for continuous protection'
    ];

    let tipY = instructionY + 20;
    tips.forEach((tip) => {
      doc.setFontSize(10);
      doc.setTextColor(102, 102, 102);
      doc.text(tip, 25, tipY);
      tipY += 8;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated for: ${stickerData.userName || 'User'} | ID: ${stickerData.uniqueId} | iamlost.help`,
      105,
      280,
      { align: 'center' }
    );

    console.log('PDF generation completed');
    
    // Convert to buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);

  } catch (error) {
    console.error('jsPDF generation error:', error);
    throw error;
  }
}
