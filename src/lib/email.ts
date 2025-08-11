// src/lib/email.ts - FIXED VERSION
import nodemailer from 'nodemailer';

// Create transporter (you can use Gmail, SendGrid, or any SMTP provider)
const createTransporter = () => {
  console.log('📧 Starting email send process...');
  
  if (process.env.EMAIL_PROVIDER === 'gmail' && process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    console.log('📧 Using Gmail SMTP for:', process.env.EMAIL_USER);
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // Use App Password, not regular password
      }
    });
  } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    return nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else if (process.env.EMAIL_PROVIDER === 'smtp') {
    return nodemailer.createTransporter({
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
    console.log('📧 Using development mode - emails will be logged only');
    return nodemailer.createTransporter({
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
  reportId,
  additionalDetails
}: {
  userEmail: string;
  userName: string;
  itemType: string;
  finderMessage: string;
  finderContact: string;
  contactMethod: string;
  language: string;
  reportId: number;
  additionalDetails?: {
    location?: string;
    finderName?: string;
    finderPhone?: string;
  };
}) {
  try {
    console.log('📧 Recipient:', userEmail);
    console.log('📧 Report ID:', reportId);

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
                ${additionalDetails?.location ? `<p style="margin-top: 10px;"><strong>Location:</strong> ${additionalDetails.location}</p>` : ''}
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
${additionalDetails?.location ? `\nLocation: ${additionalDetails.location}` : ''}

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
      from: `"iamlost.help" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@iamlost.help'}>`,
      to: userEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Don't throw - we don't want the found item report to fail just because email failed
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendWelcomeEmail({
  userEmail,
  userName,
  verificationToken,
  language = 'en'
}: {
  userEmail: string;
  userName: string;
  verificationToken: string;
  language?: string;
}) {
  try {
    console.log('📧 Sending welcome email to:', userEmail);

    const transporter = createTransporter();
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    const subject = '🎉 Welcome to iamlost.help - Verify Your Email';
    
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
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to iamlost.help!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">You're one step away from protecting your items</p>
            </div>
            
            <div class="content">
              <p><strong>Hi ${userName},</strong></p>
              
              <p>Thank you for joining iamlost.help! You've taken the first step towards never losing your important items again.</p>
              
              <p><strong>Please verify your email address to complete your registration:</strong></p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify My Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #f8fafc; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 14px;">
                ${verificationUrl}
              </p>
              
              <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1e40af;">🔗 What's Next?</h3>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li>Verify your email (click the button above)</li>
                  <li>Complete your payment</li>
                  <li>Get your unique ID and QR codes</li>
                  <li>Start protecting your items!</li>
                </ol>
              </div>
              
              <p>If you didn't create this account, you can safely ignore this email.</p>
              
              <p>Best regards,<br>
              <strong>The iamlost.help Team</strong></p>
            </div>
            
            <div class="footer">
              <p>🌍 Helping people reunite with their belongings worldwide</p>
              <p>This link will expire in 24 hours for security.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #94a3b8;">Unsubscribe</a> | 
                 <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy" style="color: #94a3b8;">Privacy Policy</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
🎉 Welcome to iamlost.help!

Hi ${userName},

Thank you for joining iamlost.help! You've taken the first step towards never losing your important items again.

Please verify your email address to complete your registration:
${verificationUrl}

What's Next?
1. Verify your email (visit the link above)
2. Complete your payment
3. Get your unique ID and QR codes  
4. Start protecting your items!

If you didn't create this account, you can safely ignore this email.

Best regards,
The iamlost.help Team

---
🌍 Helping people reunite with their belongings worldwide
This link will expire in 24 hours for security.
    `;

    const info = await transporter.sendMail({
      from: `"iamlost.help" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@iamlost.help'}>`,
      to: userEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log('✅ Welcome email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    console.error('❌ Welcome email sending failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendPaymentSuccessEmail({
  userEmail,
  userName,
  planName,
  uniqueId,
  amount,
  language = 'en'
}: {
  userEmail: string;
  userName: string;
  planName: string;
  uniqueId: string;
  amount: number;
  language?: string;
}) {
  try {
    console.log('📧 Sending payment success email to:', userEmail);

    const transporter = createTransporter();
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;
    const formattedAmount = (amount / 100).toFixed(2);

    const subject = '🎉 Payment Successful - Your Items Are Now Protected!';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
            .id-box { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Payment Successful!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your items are now protected worldwide</p>
            </div>
            
            <div class="content">
              <p><strong>Hi ${userName},</strong></p>
              
              <p>Congratulations! Your payment has been processed successfully and your account is now active.</p>
              
              <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #15803d;">✅ Registration Complete</h3>
                <p style="margin: 0;"><strong>Plan:</strong> ${planName}</p>
                <p style="margin: 5px 0 0 0;"><strong>Amount Paid:</strong> $${formattedAmount}</p>
              </div>
              
              <div class="id-box">
                <h3 style="margin-top: 0; color: #0369a1;">🔑 Your Unique ID</h3>
                <div style="font-size: 32px; font-weight: bold; color: #0ea5e9; font-family: monospace; margin: 10px 0;">
                  ${uniqueId}
                </div>
                <p style="margin: 0; color: #0369a1;">This ID will help people return your lost items</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Go to Your Dashboard</a>
              </div>
              
              <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1e40af;">🚀 What You Can Do Now:</h3>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Download your stickers</strong> - Print QR codes for your items</li>
                  <li><strong>Attach to valuables</strong> - Keys, wallet, bag, laptop, etc.</li>
                  <li><strong>Share with family</strong> - They can help you attach stickers</li>
                  <li><strong>Test the system</strong> - Have friends scan your QR codes</li>
                </ol>
              </div>
              
              <p>Your items are now protected 24/7 by millions of helpful people worldwide. If someone finds your lost item, they can scan the QR code or enter your ID, and you'll be notified immediately.</p>
              
              <p>Questions? Just reply to this email - we're here to help!</p>
              
              <p>Best regards,<br>
              <strong>The iamlost.help Team</strong></p>
            </div>
            
            <div class="footer">
              <p>🌍 Helping people reunite with their belongings worldwide</p>
              <p>Your subscription will renew automatically. You can manage it anytime in your dashboard.</p>
              <p><a href="${dashboardUrl}" style="color: #94a3b8;">Dashboard</a> | 
                 <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #94a3b8;">Help Center</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
🎉 Payment Successful!

Hi ${userName},

Congratulations! Your payment has been processed successfully and your account is now active.

✅ Registration Complete
Plan: ${planName}
Amount Paid: $${formattedAmount}

🔑 Your Unique ID: ${uniqueId}
This ID will help people return your lost items.

🚀 What You Can Do Now:
1. Download your stickers - Print QR codes for your items
2. Attach to valuables - Keys, wallet, bag, laptop, etc.
3. Share with family - They can help you attach stickers  
4. Test the system - Have friends scan your QR codes

Visit your dashboard: ${dashboardUrl}

Your items are now protected 24/7 by millions of helpful people worldwide. If someone finds your lost item, they can scan the QR code or enter your ID, and you'll be notified immediately.

Questions? Just reply to this email - we're here to help!

Best regards,
The iamlost.help Team

---
🌍 Helping people reunite with their belongings worldwide
Your subscription will renew automatically. You can manage it anytime in your dashboard.
    `;

    const info = await transporter.sendMail({
      from: `"iamlost.help" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@iamlost.help'}>`,
      to: userEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log('✅ Payment success email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    console.error('❌ Payment success email sending failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
