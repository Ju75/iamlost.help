// src/lib/email.ts
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
  // For now, just log the email (we'll implement real email later)
  console.log('EMAIL NOTIFICATION:');
  console.log(`To: ${userEmail}`);
  console.log(`Subject: Great News! Someone Found Your ${itemType}`);
  console.log(`Message: Hi ${userName}, someone found your ${itemType}!`);
  console.log(`Finder says: "${finderMessage}"`);
  console.log(`Contact them: ${finderContact} (${contactMethod})`);
  console.log(`Report ID: ${reportId}`);
  
  // TODO: Implement actual email sending with nodemailer
  return true;
}
