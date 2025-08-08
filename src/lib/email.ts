// src/lib/email.ts (Updated with real email sending)
import nodemailer from 'nodemailer';

// Create transporter (you can use Gmail, SendGrid, or any SMTP provider)
const createTransporter = () => {
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // Use App Password, not regular password
      }
    });
  } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else if (process.env.EMAIL_PROVIDER === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // For development - use Ethereal Email (fake SMTP)
    console.log('Using Ethereal Email for development - emails will not be delivered');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
};

export async function sendFoundItemNotification({
  userEmail,
  userName,
  itemType,
  finderMessage,
  finderContact,
  contactMethod,
  language,
  reportId
}: {
  userEmail: string;
  userName: string;
  itemType: string;
  finderMessage: string;
  finderContact: string;
  contactMethod: string;
  language: string;
  reportId: number;
}) {
  try {
    const transporter = createTransporter();

    // Create email content
    const subject = `🎉 Great News! Someone Found Your ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
            .message-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; }
            .contact-box { background: #10b981; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
            .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Your Item Was Found!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone is helping to return your ${itemType}</p>
            </div>
            
            <div class="content">
              <p><strong>Hi ${userName},</strong></p>
              
              <p>Great news! Someone found your <strong>${itemType}</strong> and wants to return it to you.</p>
              
              <div class="message-box">
                <h3 style="margin-top: 0; color: #2563eb;">💬 Message from the Finder:</h3>
                <p style="font-style: italic; margin-bottom: 0;">"${finderMessage}"</p>
              </div>
              
              <div class="contact-box">
                <h3 style="margin-top: 0;">📞 Contact Information</h3>
                <p style="margin: 0; font-size: 18px;"><strong>${finderContact}</strong></p>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Contact method: ${contactMethod}</p>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Contact the finder using the information above</li>
                <li>Arrange a safe meeting place to collect your item</li>
                <li>Thank them for being awesome! 🙏</li>
              </ol>
              
              <p>We're so happy we could help reunite you with your belongings!</p>
              
              <p>Best regards,<br>
              <strong>The iamlost.help Team</strong></p>
            </div>
            
            <div class="footer">
              <p>🌍 Helping people reunite with their belongings worldwide</p>
              <p>Report ID: #${reportId} | This email was sent because someone reported finding an item with your unique ID.</p>
              <p><a href="https://iamlost.help/unsubscribe" style="color: #94a3b8;">Unsubscribe</a> | 
                 <a href="https://iamlost.help/privacy" style="color: #94a3b8;">Privacy Policy</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
🎉 Your Item Was Found!

Hi ${userName},

Great news! Someone found your ${itemType} and wants to return it to you.

Message from the Finder:
"${finderMessage}"

Contact Information:
${finderContact} (${contactMethod})

Next Steps:
1. Contact the finder using the information above
2. Arrange a safe meeting place to collect your item  
3. Thank them for being awesome!

We're so happy we could help reunite you with your belongings!

Best regards,
The iamlost.help Team

---
🌍 Helping people reunite with their belongings worldwide
Report ID: #${reportId}
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"iamlost.help" <${process.env.EMAIL_FROM || 'noreply@iamlost.help'}>`,
      to: userEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    // Don't throw - we don't want the found item report to fail just because email failed
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
