/**
 * Admin Email Templates
 * Email templates สำหรับการจัดการ Admin
 */

import { EmailTemplate } from './emailService';

const EMAIL_CONFIG = {
  from: import.meta.env.VITE_EMAIL_FROM || 'noreply@peace-script-ai.web.app',
  replyTo: import.meta.env.VITE_EMAIL_REPLY_TO || 'support@peace-script-ai.web.app',
};

/**
 * Email template: Admin Access Granted (to new admin)
 */
export function createAdminAccessGrantedEmail(params: {
  adminEmail: string;
  role: string;
  permissions: {
    canViewAnalytics: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
    canManageSubscriptions: boolean;
  };
  grantedBy: string;
  dashboardUrl: string;
}): EmailTemplate {
  const subject = `🎉 คุณได้รับสิทธิ์ Admin - Peace Script AI`;

  const roleNameTH =
    params.role === 'super-admin' ? 'Super Admin' : params.role === 'admin' ? 'Admin' : 'Viewer';

  const permissionsList = [
    params.permissions.canViewAnalytics && '📊 ดู Analytics และสถิติระบบ',
    params.permissions.canExportData && '📥 Export ข้อมูลและรายงาน',
    params.permissions.canManageUsers && '👥 จัดการผู้ใช้และ Admin อื่นๆ',
    params.permissions.canManageSubscriptions && '💳 จัดการ Subscriptions และแพ็คเกจ',
  ].filter(Boolean);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Sarabun', sans-serif; 
      line-height: 1.6; 
      color: #333; 
    }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
      border-radius: 10px 10px 0 0; 
    }
    .content { 
      background: #f9fafb; 
      padding: 30px; 
      border-radius: 0 0 10px 10px; 
    }
    .badge { 
      background: #fef3c7; 
      color: #92400e; 
      padding: 8px 16px; 
      border-radius: 20px; 
      display: inline-block; 
      font-weight: bold; 
      margin: 10px 0;
    }
    .info-box { 
      background: white; 
      border-left: 4px solid #667eea; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
    }
    .permission-list { 
      background: #eff6ff; 
      border: 2px solid #bfdbfe; 
      padding: 15px 20px; 
      border-radius: 8px; 
      margin: 15px 0; 
    }
    .permission-list ul { 
      margin: 10px 0; 
      padding-left: 20px; 
    }
    .button { 
      display: inline-block; 
      background: #667eea; 
      color: white; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 20px 0; 
    }
    .footer { 
      text-align: center; 
      margin-top: 30px; 
      color: #666; 
      font-size: 14px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ยินดีด้วย!</h1>
      <p>คุณได้รับสิทธิ์ Admin</p>
    </div>
    <div class="content">
      <h2>สวัสดีครับ!</h2>
      <p>คุณได้รับสิทธิ์เป็น <strong>Admin</strong> สำหรับระบบ <strong>Peace Script AI</strong></p>
      
      <div class="info-box">
        <p style="margin: 5px 0;"><strong>📧 อีเมล:</strong> ${params.adminEmail}</p>
        <p style="margin: 5px 0;"><strong>👤 บทบาท:</strong> <span class="badge">${roleNameTH}</span></p>
        <p style="margin: 5px 0;"><strong>✍️ ได้รับสิทธิ์โดย:</strong> ${params.grantedBy}</p>
      </div>

      <div class="permission-list">
        <h3 style="margin-top: 0;">🔐 สิทธิ์ที่คุณมี:</h3>
        <ul>
          ${permissionsList.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>

      <div style="background: #fef3c7; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ หมายเหตุสำคัญ:</strong><br>
          การเป็น Admin มาพร้อมกับความรับผิดชอบ กรุณาใช้สิทธิ์อย่างรอบคอบและถูกต้องตามนโยบาย
        </p>
      </div>

      <p style="text-align: center;">
        <a href="${params.dashboardUrl}" class="button">เข้าสู่ Admin Dashboard</a>
      </p>

      <h3>ขั้นตอนถัดไป:</h3>
      <ol>
        <li>คลิกปุ่มด้านบนเพื่อเข้าสู่ Admin Dashboard</li>
        <li>ทำความเข้าใจกับเมนูและฟังก์ชันต่างๆ</li>
        <li>ตรวจสอบสิทธิ์ที่คุณมีก่อนทำการใดๆ</li>
        <li>หากมีคำถาม ติดต่อ Super Admin ได้ทันที</li>
      </ol>
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
      <p>หากคุณไม่ได้คาดหวังอีเมลนี้ กรุณาติดต่อ ${EMAIL_CONFIG.replyTo} ทันที</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - คุณได้รับสิทธิ์ Admin 🎉

สวัสดีครับ!

คุณได้รับสิทธิ์เป็น Admin สำหรับระบบ Peace Script AI

อีเมล: ${params.adminEmail}
บทบาท: ${roleNameTH}
ได้รับสิทธิ์โดย: ${params.grantedBy}

สิทธิ์ที่คุณมี:
${permissionsList.map(p => `• ${p}`).join('\n')}

⚠️ หมายเหตุสำคัญ:
การเป็น Admin มาพร้อมกับความรับผิดชอบ กรุณาใช้สิทธิ์อย่างรอบคอบและถูกต้องตามนโยบาย

เข้าสู่ Admin Dashboard: ${params.dashboardUrl}

ขั้นตอนถัดไป:
1. เข้าสู่ Admin Dashboard
2. ทำความเข้าใจกับเมนูและฟังก์ชันต่างๆ
3. ตรวจสอบสิทธิ์ที่คุณมีก่อนทำการใดๆ
4. หากมีคำถาม ติดต่อ Super Admin ได้ทันที

© 2025 Peace Script AI
หากคุณไม่ได้คาดหวังอีเมลนี้ กรุณาติดต่อ ${EMAIL_CONFIG.replyTo} ทันที
  `;

  return { subject, html, text };
}

/**
 * Email template: Admin Action Confirmation (to granter)
 */
export function createAdminActionConfirmationEmail(params: {
  granterEmail: string;
  targetEmail: string;
  role: string;
  action: 'granted' | 'revoked' | 'updated';
  timestamp: string;
}): EmailTemplate {
  const actionNameTH =
    params.action === 'granted'
      ? 'เพิ่มสิทธิ์ Admin'
      : params.action === 'revoked'
        ? 'ลบสิทธิ์ Admin'
        : 'อัพเดทสิทธิ์ Admin';

  const actionIcon = params.action === 'granted' ? '✅' : params.action === 'revoked' ? '❌' : '🔄';

  const roleNameTH =
    params.role === 'super-admin' ? 'Super Admin' : params.role === 'admin' ? 'Admin' : 'Viewer';

  const subject = `${actionIcon} ยืนยันการ${actionNameTH} - Peace Script AI`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Sarabun', sans-serif; 
      line-height: 1.6; 
      color: #333; 
    }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { 
      background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
      border-radius: 10px 10px 0 0; 
    }
    .content { 
      background: #f9fafb; 
      padding: 30px; 
      border-radius: 0 0 10px 10px; 
    }
    .info-box { 
      background: white; 
      border: 2px solid #10b981; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
    }
    .footer { 
      text-align: center; 
      margin-top: 30px; 
      color: #666; 
      font-size: 14px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${actionIcon} การดำเนินการสำเร็จ</h1>
      <p>${actionNameTH}</p>
    </div>
    <div class="content">
      <h2>ยืนยันการดำเนินการ</h2>
      <p>ระบบได้บันทึกการ<strong>${actionNameTH}</strong>ของคุณเรียบร้อยแล้ว</p>
      
      <div class="info-box">
        <p style="margin: 5px 0;"><strong>👤 ผู้ดำเนินการ:</strong> ${params.granterEmail}</p>
        <p style="margin: 5px 0;"><strong>🎯 ผู้ได้รับผลกระทบ:</strong> ${params.targetEmail}</p>
        <p style="margin: 5px 0;"><strong>📋 บทบาท:</strong> ${roleNameTH}</p>
        <p style="margin: 5px 0;"><strong>🕐 เวลา:</strong> ${params.timestamp}</p>
      </div>

      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>ℹ️ หมายเหตุ:</strong><br>
          การเปลี่ยนแปลงนี้ได้ถูกบันทึกใน Audit Log และผู้ที่ได้รับผลกระทบจะได้รับอีเมลแจ้งเตือน
        </p>
      </div>

      <p>หากคุณไม่ได้ดำเนินการนี้ กรุณาติดต่อทีม Support ทันที</p>
    </div>
    <div class="footer">
      <p>© 2025 Peace Script AI. All rights reserved.</p>
      <p>Security Alert: ${EMAIL_CONFIG.replyTo}</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Peace Script AI - ยืนยันการ${actionNameTH} ${actionIcon}

ยืนยันการดำเนินการ

ระบบได้บันทึกการ${actionNameTH}ของคุณเรียบร้อยแล้ว

รายละเอียด:
• ผู้ดำเนินการ: ${params.granterEmail}
• ผู้ได้รับผลกระทบ: ${params.targetEmail}
• บทบาท: ${roleNameTH}
• เวลา: ${params.timestamp}

ℹ️ หมายเหตุ:
การเปลี่ยนแปลงนี้ได้ถูกบันทึกใน Audit Log และผู้ที่ได้รับผลกระทบจะได้รับอีเมลแจ้งเตือน

หากคุณไม่ได้ดำเนินการนี้ กรุณาติดต่อทีม Support ทันที

© 2025 Peace Script AI
Security Alert: ${EMAIL_CONFIG.replyTo}
  `;

  return { subject, html, text };
}

/**
 * Email template: Admin Access Revoked (to affected admin)
 */
export function createAdminAccessRevokedEmail(params: {
  adminEmail: string;
  revokedBy: string;
  timestamp: string;
}): EmailTemplate {
  const subject = `⚠️ สิทธิ์ Admin ของคุณถูกเพิกถอน - Peace Script AI`;

  const html = `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.info-box{background:white;border-left:4px solid#ef4444;padding:20px;border-radius:8px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>⚠️ สิทธิ์ถูกเพิกถอน</h1><p>การแจ้งเตือนความปลอดภัย</p></div><div class="content"><h2>แจ้งเตือนการเปลี่ยนแปลงสิทธิ์</h2><p>สิทธิ์ <strong>Admin</strong> ของคุณสำหรับระบบ <strong>Peace Script AI</strong> ถูกเพิกถอนแล้ว</p><div class="info-box"><p><strong>📧 อีเมล:</strong> ${params.adminEmail}</p><p><strong>👤 ถูกเพิกถอนโดย:</strong> ${params.revokedBy}</p><p><strong>🕐 เวลา:</strong> ${params.timestamp}</p></div><div style="background:#fee2e2;border:2px solid #fecaca;padding:15px;border-radius:8px;margin:20px 0"><p style="margin:0;color:#991b1b"><strong>⚠️ ผลกระทบ:</strong><br>คุณจะไม่สามารถเข้าถึง Admin Dashboard และฟังก์ชันสำหรับ Admin ได้อีกต่อไป</p></div><p>หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อ Super Admin ทันที</p></div><div class="footer"><p>© 2025 Peace Script AI. All rights reserved.</p></div></div></body></html>`;

  const text = `Peace Script AI - สิทธิ์ Admin ถูกเพิกถอน ⚠️

สิทธิ์ Admin ของคุณสำหรับระบบ Peace Script AI ถูกเพิกถอนแล้ว

รายละเอียด:
• อีเมล: ${params.adminEmail}
• ถูกเพิกถอนโดย: ${params.revokedBy}
• เวลา: ${params.timestamp}

หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อ Super Admin ทันที`;

  return { subject, html, text };
}

/**
 * Email template: Admin Permissions Updated (to affected admin)
 */
export function createAdminPermissionsUpdatedEmail(params: {
  adminEmail: string;
  newRole: string;
  newPermissions: {
    canViewAnalytics: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
    canManageSubscriptions: boolean;
  };
  updatedBy: string;
  timestamp: string;
  dashboardUrl: string;
}): EmailTemplate {
  const subject = `🔄 สิทธิ์ Admin ของคุณถูกอัพเดท - Peace Script AI`;

  const roleNameTH =
    params.newRole === 'super-admin'
      ? 'Super Admin'
      : params.newRole === 'admin'
        ? 'Admin'
        : 'Viewer';
  const permissionsList = [
    params.newPermissions.canViewAnalytics && '📊 ดู Analytics',
    params.newPermissions.canExportData && '📥 Export ข้อมูล',
    params.newPermissions.canManageUsers && '👥 จัดการ Admin',
    params.newPermissions.canManageSubscriptions && '💳 จัดการ Subscriptions',
  ].filter(Boolean);

  const html = `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.badge{background:#dbeafe;color:#1e40af;padding:8px 16px;border-radius:20px;display:inline-block;font-weight:bold}.info-box{background:white;border-left:4px solid #3b82f6;padding:20px;border-radius:8px;margin:20px 0}.permission-list{background:#eff6ff;border:2px solid #bfdbfe;padding:15px 20px;border-radius:8px;margin:15px 0}.button{display:inline-block;background:#3b82f6;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>🔄 สิทธิ์อัพเดทแล้ว</h1><p>การเปลี่ยนแปลงสิทธิ์ Admin</p></div><div class="content"><h2>แจ้งเตือนการอัพเดทสิทธิ์</h2><p>สิทธิ์ <strong>Admin</strong> ของคุณถูกอัพเดทแล้ว</p><div class="info-box"><p><strong>📧 อีเมล:</strong> ${params.adminEmail}</p><p><strong>👤 บทบาทใหม่:</strong> <span class="badge">${roleNameTH}</span></p><p><strong>✍️ อัพเดทโดย:</strong> ${params.updatedBy}</p><p><strong>🕐 เวลา:</strong> ${params.timestamp}</p></div><div class="permission-list"><h3 style="margin-top:0">🔐 สิทธิ์ปัจจุบัน:</h3><ul>${permissionsList.map(p => `<li>${p}</li>`).join('')}</ul></div><div style="background:#fef3c7;border:2px solid #fbbf24;padding:15px;border-radius:8px;margin:20px 0"><p style="margin:0;color:#92400e"><strong>💡 หมายเหตุ:</strong><br>กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่</p></div><p style="text-align:center"><a href="${params.dashboardUrl}" class="button">เข้าสู่ Admin Dashboard</a></p></div><div class="footer"><p>© 2025 Peace Script AI. All rights reserved.</p></div></div></body></html>`;

  const text = `Peace Script AI - สิทธิ์ Admin อัพเดทแล้ว 🔄

สิทธิ์ Admin ของคุณถูกอัพเดทแล้ว

รายละเอียด:
• อีเมล: ${params.adminEmail}
• บทบาทใหม่: ${roleNameTH}
• อัพเดทโดย: ${params.updatedBy}
• เวลา: ${params.timestamp}

สิทธิ์ปัจจุบัน:
${permissionsList.map(p => `• ${p}`).join('\n')}

กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่`;

  return { subject, html, text };
}

