/**
 * Email Notification Service
 *
 * Sends email notifications for various events:
 * - Team invitations
 * - Project updates
 * - Payment receipts
 * - System notifications
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailNotification {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

// Email service configuration
const EMAIL_CONFIG = {
  from: import.meta.env.VITE_EMAIL_FROM || 'noreply@peace-script-ai.web.app',
  replyTo: import.meta.env.VITE_EMAIL_REPLY_TO || 'support@peace-script-ai.web.app',
  // Support for multiple email providers
  provider: (import.meta.env.VITE_EMAIL_PROVIDER as 'sendgrid' | 'ses' | 'firebase') || 'firebase',
};

/**
 * Send email notification
 */
export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  try {
    const provider = EMAIL_CONFIG.provider;

    console.log(`📧 Sending email via ${provider} to: ${notification.to}`);
    console.log(`Subject: ${notification.subject}`);

    switch (provider) {
      case 'sendgrid':
        return await sendWithSendGrid(notification);

      case 'ses':
        return await sendWithAWS_SES(notification);

      case 'firebase':
      default:
        return await sendWithFirebase(notification);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

/**
 * Send email via Firebase Extension (Trigger Email)
 * https://extensions.dev/extensions/firebase/firestore-send-email
 */
async function sendWithFirebase(notification: EmailNotification): Promise<boolean> {
  try {
    const { collection, addDoc, Timestamp } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');

    // Add to 'mail' collection (Firebase Extension will pick it up)
    await addDoc(collection(db, 'mail'), {
      to: notification.to,
      from: notification.from || EMAIL_CONFIG.from,
      replyTo: notification.replyTo || EMAIL_CONFIG.replyTo,
      message: {
        subject: notification.subject,
        html: notification.html,
        text: notification.text || stripHTML(notification.html),
      },
      createdAt: Timestamp.now(),
    });

    console.log('✅ Email queued in Firebase');
    return true;
  } catch (error) {
    console.error('Error sending email via Firebase:', error);
    return false;
  }
}

/**
 * Send email via SendGrid
 */
async function sendWithSendGrid(notification: EmailNotification): Promise<boolean> {
  try {
    const apiKey = import.meta.env.VITE_SENDGRID_API_KEY;

    if (!apiKey) {
      console.error('SendGrid API key not configured');
      return false;
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: notification.to }],
            subject: notification.subject,
          },
        ],
        from: {
          email: notification.from || EMAIL_CONFIG.from,
        },
        reply_to: {
          email: notification.replyTo || EMAIL_CONFIG.replyTo,
        },
        content: [
          {
            type: 'text/html',
            value: notification.html,
          },
          {
            type: 'text/plain',
            value: notification.text || stripHTML(notification.html),
          },
        ],
      }),
    });

    if (response.ok) {
      console.log('✅ Email sent via SendGrid');
      return true;
    } else {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return false;
    }
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    return false;
  }
}

/**
 * Send email via AWS SES
 */
async function sendWithAWS_SES(notification: EmailNotification): Promise<boolean> {
  try {
    // Note: AWS SDK should be used server-side, not client-side
    // This is a placeholder - implement in backend/Cloud Function
    console.warn('AWS SES should be called from backend, not frontend');

    const backendUrl = import.meta.env.VITE_API_URL;

    if (!backendUrl) {
      console.error('Backend API URL not configured');
      return false;
    }

    const response = await fetch(`${backendUrl}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (response.ok) {
      console.log('✅ Email sent via AWS SES (backend)');
      return true;
    } else {
      const error = await response.text();
      console.error('AWS SES error:', error);
      return false;
    }
  } catch (error) {
    console.error('Error sending email via AWS SES:', error);
    return false;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHTML(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Email Templates
 */

export function createTeamInvitationEmail(params: {
  inviterName: string;
  projectTitle: string;
  role: string;
  invitationLink: string;
}): EmailTemplate {
  const subject = `คำเชิญเข้าร่วมโปรเจ็ค: ${params.projectTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Peace Script AI</h1>
      <p>คำเชิญเข้าร่วมทีม</p>
    </div>
    <div class="content">
      <h2>สวัสดีครับ!</h2>
      <p><strong>${params.inviterName}</strong> เชิญคุณเข้าร่วมโปรเจ็ค</p>
      <h3>"${params.projectTitle}"</h3>
      <p>ในฐานะ: <strong>${params.role}</strong></p>
      <p>คลิกปุ่มด้านล่างเพื่อยอมรับคำเชิญ:</p>
      <p style="text-align: center;">
        <a href="${params.invitationLink}" class="button">ยอมรับคำเชิญ</a>
      </p>
      <p style="color: #666; font-size: 14px;">
        หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
        <code>${params.invitationLink}</code>
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
      <p>หากคุณไม่ได้คาดหวังอีเมลนี้ สามารถเพิกเฉยได้</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - คำเชิญเข้าร่วมทีม

สวัสดีครับ!

${params.inviterName} เชิญคุณเข้าร่วมโปรเจ็ค "${params.projectTitle}" ในฐานะ ${params.role}

คลิกลิงก์ด้านล่างเพื่อยอมรับคำเชิญ:
${params.invitationLink}

© 2025 Peace Script AI
  `;

  return { subject, html, text };
}

/**
 * Email template: Invitation Accepted (to inviter)
 */
export function createInvitationAcceptedEmail(params: {
  inviteeName: string;
  inviteeEmail: string;
  projectTitle: string;
  role: string;
}): EmailTemplate {
  const subject = `✅ ${params.inviteeName} ยอมรับคำเชิญเข้าร่วมโปรเจ็ค: ${params.projectTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-badge { background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .member-card { background: white; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ยอมรับคำเชิญแล้ว!</h1>
      <p>สมาชิกใหม่เข้าร่วมโปรเจ็คของคุณ</p>
    </div>
    <div class="content">
      <div class="success-badge">✅ คำเชิญได้รับการยอมรับ</div>
      
      <div class="member-card">
        <h3>👤 สมาชิกใหม่</h3>
        <p><strong>ชื่อ:</strong> ${params.inviteeName}</p>
        <p><strong>อีเมล:</strong> ${params.inviteeEmail}</p>
        <p><strong>บทบาท:</strong> ${params.role}</p>
      </div>

      <h3>📋 โปรเจ็ค</h3>
      <p><strong>"${params.projectTitle}"</strong></p>

      <p style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; border-radius: 4px; margin: 20px 0;">
        💡 <strong>ทำได้แล้ว:</strong><br>
        • ${params.inviteeName} สามารถเข้าถึงโปรเจ็คได้แล้ว<br>
        • เริ่มทำงานร่วมกันได้ทันที<br>
        • ดูกิจกรรมของสมาชิกได้ใน Team Manager
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - คำเชิญได้รับการยอมรับ

🎉 ยอมรับคำเชิญแล้ว!

สมาชิกใหม่:
- ชื่อ: ${params.inviteeName}
- อีเมล: ${params.inviteeEmail}
- บทบาท: ${params.role}

โปรเจ็ค: "${params.projectTitle}"

${params.inviteeName} สามารถเข้าถึงโปรเจ็คได้แล้ว และเริ่มทำงานร่วมกันได้ทันที

© 2025 Peace Script AI
  `;

  return { subject, html, text };
}

/**
 * Email template: Role Changed
 */
export function createRoleChangedEmail(params: {
  memberName: string;
  projectTitle: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
}): EmailTemplate {
  const subject = `🔄 บทบาทของคุณในโปรเจ็ค "${params.projectTitle}" ถูกเปลี่ยนแปลง`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .role-change { background: white; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .role-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 0 10px; }
    .old-role { background: #fee2e2; color: #991b1b; }
    .new-role { background: #d1fae5; color: #065f46; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔄 การเปลี่ยนแปลงบทบาท</h1>
      <p>มีการอัพเดทสิทธิ์ของคุณ</p>
    </div>
    <div class="content">
      <h2>สวัสดี ${params.memberName}!</h2>
      <p>บทบาทของคุณในโปรเจ็ค <strong>"${params.projectTitle}"</strong> ได้รับการเปลี่ยนแปลง</p>
      
      <div class="role-change">
        <h3>🎭 การเปลี่ยนแปลง</h3>
        <div style="margin: 20px 0;">
          <span class="role-badge old-role">${params.oldRole}</span>
          <span style="font-size: 24px;">→</span>
          <span class="role-badge new-role">${params.newRole}</span>
        </div>
        <p style="color: #666; font-size: 14px;">โดย: ${params.changedBy}</p>
      </div>

      <h3>📋 สิทธิ์ใหม่ของคุณ:</h3>
      ${
        params.newRole === 'admin'
          ? `
        <ul style="background: #dbeafe; padding: 20px; border-radius: 8px;">
          <li>✅ แก้ไขเนื้อหาโปรเจ็ค</li>
          <li>✅ จัดการสมาชิกในทีม</li>
          <li>✅ เปลี่ยนบทบาทสมาชิก</li>
          <li>✅ ลบสมาชิกออกจากโปรเจ็ค</li>
        </ul>
      `
          : params.newRole === 'editor'
            ? `
        <ul style="background: #dbeafe; padding: 20px; border-radius: 8px;">
          <li>✅ แก้ไขเนื้อหาโปรเจ็ค</li>
          <li>✅ จัดการสมาชิกในทีม</li>
          <li>✅ เปลี่ยนบทบาทสมาชิก</li>
          <li>❌ ไม่สามารถลบสมาชิกได้</li>
        </ul>
      `
            : `
        <ul style="background: #fee2e2; padding: 20px; border-radius: 8px;">
          <li>✅ ดูเนื้อหาโปรเจ็ค</li>
          <li>❌ ไม่สามารถแก้ไขได้</li>
          <li>❌ ไม่สามารถจัดการสมาชิกได้</li>
        </ul>
      `
      }
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - การเปลี่ยนแปลงบทบาท

สวัสดี ${params.memberName}!

บทบาทของคุณในโปรเจ็ค "${params.projectTitle}" ได้รับการเปลี่ยนแปลง

${params.oldRole} → ${params.newRole}

โดย: ${params.changedBy}

© 2025 Peace Script AI
  `;

  return { subject, html, text };
}

/**
 * Email template: Removed from Project
 */
export function createRemovedFromProjectEmail(params: {
  memberName: string;
  projectTitle: string;
  removedBy: string;
}): EmailTemplate {
  const subject = `⚠️ คุณถูกลบออกจากโปรเจ็ค "${params.projectTitle}"`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning-box { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ ถูกลบออกจากโปรเจ็ค</h1>
      <p>การเข้าถึงของคุณถูกยกเลิก</p>
    </div>
    <div class="content">
      <h2>สวัสดี ${params.memberName},</h2>
      
      <div class="warning-box">
        <h3 style="color: #dc2626; margin-top: 0;">📋 โปรเจ็ค</h3>
        <p><strong>"${params.projectTitle}"</strong></p>
        
        <h3 style="color: #dc2626;">👤 ดำเนินการโดย</h3>
        <p>${params.removedBy}</p>
        
        <h3 style="color: #dc2626;">🔒 ผลกระทบ</h3>
        <ul>
          <li>คุณไม่สามารถเข้าถึงโปรเจ็คนี้ได้อีกต่อไป</li>
          <li>ข้อมูลทั้งหมดของคุณในโปรเจ็คถูกลบออกแล้ว</li>
          <li>คุณจะไม่ได้รับการแจ้งเตือนจากโปรเจ็คนี้อีก</li>
        </ul>
      </div>

      <p style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; border-radius: 4px; margin: 20px 0;">
        💡 <strong>หมายเหตุ:</strong><br>
        หากคุณคิดว่านี่เป็นความผิดพลาด กรุณาติดต่อ ${params.removedBy} เพื่อขอเข้าร่วมโปรเจ็คอีกครั้ง
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
      <p>หากคุณมีคำถาม กรุณาติดต่อเจ้าของโปรเจ็ค</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - ถูกลบออกจากโปรเจ็ค

สวัสดี ${params.memberName},

คุณถูกลบออกจากโปรเจ็ค "${params.projectTitle}"

ดำเนินการโดย: ${params.removedBy}

ผลกระทบ:
- คุณไม่สามารถเข้าถึงโปรเจ็คนี้ได้อีกต่อไป
- ข้อมูลทั้งหมดของคุณในโปรเจ็คถูกลบออกแล้ว
- คุณจะไม่ได้รับการแจ้งเตือนจากโปรเจ็คนี้อีก

หากคุณคิดว่านี่เป็นความผิดพลาด กรุณาติดต่อเจ้าของโปรเจ็ค

© 2025 Peace Script AI
  `;

  return { subject, html, text };
}

export function createPaymentReceiptEmail(params: {
  userName: string;
  tier: string;
  amount: number;
  billingCycle: string;
  invoiceUrl?: string;
}): EmailTemplate {
  const subject = `ใบเสร็จการชำระเงิน - ${params.tier.toUpperCase()} Plan`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .total { font-size: 24px; font-weight: bold; color: #10b981; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ ชำระเงินสำเร็จ!</h1>
      <p>ขอบคุณที่ใช้บริการ Peace Script AI</p>
    </div>
    <div class="content">
      <h2>สวัสดี ${params.userName}!</h2>
      <p>เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว</p>
      
      <div class="receipt">
        <h3>รายละเอียดการชำระเงิน</h3>
        <div class="row">
          <span>แพ็คเกจ:</span>
          <strong>${params.tier.toUpperCase()} Plan</strong>
        </div>
        <div class="row">
          <span>รอบบิล:</span>
          <strong>${params.billingCycle === 'monthly' ? 'รายเดือน' : 'รายปี'}</strong>
        </div>
        <div class="row">
          <span>ยอดรวม:</span>
          <span class="total">฿${params.amount.toLocaleString()}</span>
        </div>
      </div>

      ${
        params.invoiceUrl
          ? `
      <p style="text-align: center;">
        <a href="${params.invoiceUrl}" class="button">ดาวน์โหลดใบเสร็จ</a>
      </p>
      `
          : ''
      }

      <p>บัญชีของคุณได้รับการอัพเกรดเรียบร้อยแล้ว เริ่มสร้างสรรค์บทหนังได้เลย!</p>
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
      <p>หากมีคำถาม ติดต่อ: ${EMAIL_CONFIG.replyTo}</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - ใบเสร็จการชำระเงิน

สวัสดี ${params.userName}!

เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว

รายละเอียด:
- แพ็คเกจ: ${params.tier.toUpperCase()} Plan
- รอบบิล: ${params.billingCycle === 'monthly' ? 'รายเดือน' : 'รายปี'}
- ยอดรวม: ฿${params.amount.toLocaleString()}

${params.invoiceUrl ? `ดาวน์โหลดใบเสร็จ: ${params.invoiceUrl}` : ''}

© 2025 Peace Script AI
  `;

  return { subject, html, text };
}

export function createWelcomeEmail(params: {
  userName: string;
  referralCode: string;
}): EmailTemplate {
  const subject = 'ยินดีต้อนรับสู่ Peace Script AI! 🎬';

  const appUrl = import.meta.env.VITE_APP_URL || 'https://peace-script-ai.web.app';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #667eea; }
    .code-box { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .code { font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 ยินดีต้อนรับสู่ Peace Script AI!</h1>
      <p>เครื่องมือสร้างบทหนังด้วย AI ที่มีจิตวิทยาพุทธ</p>
    </div>
    <div class="content">
      <h2>สวัสดี ${params.userName}!</h2>
      <p>ยินดีที่ได้พบคุณ! เรามีของขวัญพิเศษมาฝากครับ</p>

      <div class="code-box">
        <p style="margin: 0; font-size: 14px;">รหัส Referral ของคุณ:</p>
        <div class="code">${params.referralCode}</div>
        <p style="margin: 10px 0 0 0; font-size: 14px;">แชร์รหัสนี้กับเพื่อน รับ 50 credits!</p>
      </div>

      <h3>คุณสามารถทำอะไรได้บ้าง?</h3>
      
      <div class="feature">
        <strong>📝 สร้างบทหนัง</strong><br>
        AI จะช่วยเขียนบทให้ตาม genre, โครงสร้าง, และตัวละครที่คุณกำหนด
      </div>

      <div class="feature">
        <strong>🧠 จิตวิทยาตัวละคร</strong><br>
        ระบบจิตวิทยาพุทธ 10 Parami ทำให้ตัวละครมีชีวิตและพัฒนาการที่สมจริง
      </div>

      <div class="feature">
        <strong>🎨 Storyboard</strong><br>
        สร้างภาพ storyboard ด้วย AI พร้อมกำหนดมุมกล้องและการเคลื่อนไหว
      </div>

      <div class="feature">
        <strong>🎥 Video Generation</strong><br>
        แปลง storyboard เป็นวิดีโอด้วย Gemini Veo และ AnimateDiff
      </div>

      <p style="text-align: center;">
        <a href="${appUrl}" class="button">เริ่มสร้างบทหนังเลย!</a>
      </p>

      <p><strong>Tips:</strong></p>
      <ul>
        <li>เริ่มต้นที่ Step 1: เลือก Genre และ Theme</li>
        <li>สร้างตัวละครที่มีความลึก ระบบจิตวิทยาจะช่วยพัฒนา</li>
        <li>ลอง Motion Editor เพื่อควบคุมการเคลื่อนไหวของวิดีโอ</li>
        <li>แชร์รหัส Referral รับ credits เพิ่ม!</li>
      </ul>
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
      <p>ติดต่อเรา: ${EMAIL_CONFIG.replyTo}</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - ยินดีต้อนรับ! 🎬

สวัสดี ${params.userName}!

ยินดีที่ได้พบคุณ! 

รหัส Referral ของคุณ: ${params.referralCode}
แชร์กับเพื่อนรับ 50 credits!

คุณสามารถ:
✓ สร้างบทหนังด้วย AI
✓ ใช้จิตวิทยาพุทธ 10 Parami
✓ สร้าง Storyboard
✓ แปลงเป็นวิดีโอ

เริ่มเลย: ${appUrl}

© 2025 Peace Script AI
  `;

  return { subject, html, text };
}

