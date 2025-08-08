// src/lib/pdf-generator.ts
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface StickerData {
  uniqueId: string;
  qrCodeUrl: string;
  encryptedToken: string;
  userName?: string;
}

export async function generateStickerPDF(stickerData: StickerData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF document with simplified font handling
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Collect PDF data
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate QR Code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(stickerData.qrCodeUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Convert data URL to buffer
      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

      // PDF Title - using default font
      doc.fontSize(24)
         .fillColor('#2563eb')
         .text('iamlost.help - Your Protection Stickers', { align: 'center' });

      doc.moveDown(0.5);

      // Subtitle
      doc.fontSize(14)
         .fillColor('#666666')
         .text('Print these stickers and attach them to your valuable items', { align: 'center' });

      doc.moveDown(1);

      // Create multiple sticker layouts per page
      const stickersPerRow = 3;
      const stickersPerColumn = 4;
      const stickerWidth = 150;
      const stickerHeight = 100;
      const startX = 70;
      const startY = 150;
      const spacingX = 170;
      const spacingY = 120;

      for (let row = 0; row < stickersPerColumn; row++) {
        for (let col = 0; col < stickersPerRow; col++) {
          const x = startX + (col * spacingX);
          const y = startY + (row * spacingY);

          // Draw sticker border
          doc.rect(x, y, stickerWidth, stickerHeight)
             .stroke('#cccccc')
             .lineWidth(1);

          // Add QR Code
          doc.image(qrCodeBuffer, x + 10, y + 10, { width: 60, height: 60 });

          // Add text content - using default font only
          doc.fontSize(12)
             .fillColor('#2563eb')
             .text('Found My Item?', x + 80, y + 15);

          doc.fontSize(10)
             .fillColor('#333333')
             .text('Scan QR code or visit:', x + 80, y + 30);

          doc.fontSize(8)
             .fillColor('#666666')
             .text('iamlost.help', x + 80, y + 45);

          // Manual ID
          doc.fontSize(10)
             .fillColor('#333333')
             .text('ID:', x + 80, y + 60);

          doc.fontSize(14)
             .fillColor('#2563eb')
             .text(stickerData.uniqueId, x + 95, y + 58);

          // Instructions
          doc.fontSize(7)
             .fillColor('#666666')
             .text('Thanks for helping return', x + 10, y + 75);
          
          doc.text('this item to its owner! 🙏', x + 10, y + 85);
        }
      }

      // Add page break and create second page with larger stickers
      doc.addPage();

      // Large stickers page
      doc.fontSize(20)
         .fillColor('#2563eb')
         .text('Large Format Stickers', { align: 'center' });

      doc.moveDown(1);

      // Create 2x2 grid of larger stickers
      const largeStickerWidth = 220;
      const largeStickerHeight = 150;
      const largeStartX = 60;
      const largeStartY = 120;
      const largeSpacingX = 250;
      const largeSpacingY = 180;

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const x = largeStartX + (col * largeSpacingX);
          const y = largeStartY + (row * largeSpacingY);

          // Draw border
          doc.rect(x, y, largeStickerWidth, largeStickerHeight)
             .stroke('#cccccc')
             .lineWidth(2);

          // Large QR Code
          doc.image(qrCodeBuffer, x + 15, y + 15, { width: 90, height: 90 });

          // Content
          doc.fontSize(16)
             .fillColor('#2563eb')
             .text('Found My Item?', x + 120, y + 20);

          doc.fontSize(12)
             .fillColor('#333333')
             .text('1. Scan this QR code', x + 120, y + 45);
          
          doc.text('2. Fill out the form', x + 120, y + 60);
          
          doc.text('3. I\'ll contact you soon!', x + 120, y + 75);

          // Manual entry option
          doc.fontSize(10)
             .fillColor('#666666')
             .text('Or visit: iamlost.help', x + 120, y + 95);

          // Large ID
          doc.fontSize(11)
             .fillColor('#333333')
             .text('Manual ID:', x + 15, y + 115);

          doc.fontSize(20)
             .fillColor('#2563eb')
             .text(stickerData.uniqueId, x + 85, y + 112);

          // Thank you message
          doc.fontSize(10)
             .fillColor('#10b981')
             .text('Thank you for helping! 🌟', x + 15, y + 135);
        }
      }

      // Instructions page
      doc.addPage();
      
      doc.fontSize(24)
         .fillColor('#2563eb')
         .text('How to Use Your Stickers', { align: 'center' });

      doc.moveDown(1);

      // Instructions
      const instructions = [
        {
          step: '1',
          title: 'Print the Stickers',
          details: 'Print this PDF on regular paper or sticker paper. For best results, use a color printer.'
        },
        {
          step: '2', 
          title: 'Cut Out the Stickers',
          details: 'Carefully cut along the border lines. You have both small and large format options.'
        },
        {
          step: '3',
          title: 'Attach to Your Items',
          details: 'Stick them on your keys, wallet, bag, laptop, or any valuable item you don\'t want to lose.'
        },
        {
          step: '4',
          title: 'Stay Protected 24/7',
          details: 'Your items are now protected! If someone finds them, they can scan the QR code or visit our website.'
        }
      ];

      let instructionY = 150;

      instructions.forEach((instruction) => {
        // Step number circle
        doc.circle(70, instructionY + 10, 15)
           .fillColor('#2563eb')
           .fill();

        doc.fontSize(14)
           .fillColor('white')
           .text(instruction.step, 65, instructionY + 5);

        // Step content
        doc.fontSize(16)
           .fillColor('#333333')
           .text(instruction.title, 100, instructionY);

        doc.fontSize(12)
           .fillColor('#666666')
           .text(instruction.details, 100, instructionY + 20, { width: 400 });

        instructionY += 80;
      });

      // Tips section
      doc.moveDown(2);
      
      doc.fontSize(16)
         .fillColor('#f97316')
         .text('💡 Pro Tips:', 50);

      const tips = [
        'Use waterproof stickers for outdoor items',
        'Place stickers in visible but secure locations',
        'Test the QR code with your phone before applying',
        'Replace stickers if they become damaged or unreadable',
        'Keep your subscription active for continuous protection'
      ];

      let tipY = doc.y + 10;

      tips.forEach((tip) => {
        doc.fontSize(11)
           .fillColor('#666666')
           .text(`• ${tip}`, 60, tipY);
        tipY += 20;
      });

      // Footer
      doc.fontSize(10)
         .fillColor('#94a3b8')
         .text(`Generated for: ${stickerData.userName || 'User'} | ID: ${stickerData.uniqueId} | iamlost.help`, 50, doc.page.height - 80, {
           align: 'center',
           width: doc.page.width - 100
         });

      // Finalize PDF
      doc.end();

    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}
