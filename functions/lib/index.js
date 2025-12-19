"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminPermissions = exports.revokeAdminAccess = exports.grantAdminAccess = exports.checkReplicateStatus = exports.replicateProxy = exports.confirmAdminInvitation = exports.createAdminInvitation = exports.initializeSuperAdmin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto = __importStar(require("crypto"));
admin.initializeApp();
/**
 * BOOTSTRAP FUNCTION: Initialize First Super Admin
 * ⚠️ ใช้ครั้งเดียวเพื่อสร้าง super-admin คนแรก
 * ⚠️ ลบออกหลังจากใช้งานเสร็จ
 */
exports.initializeSuperAdmin = functions.https.onCall(async (data, context) => {
    const targetEmail = data.email;
    const secretKey = data.secretKey;
    // Secret key เพื่อป้องกันการเรียกใช้งานโดยไม่ได้รับอนุญาต
    const INIT_SECRET = 'PEACE_INIT_2024'; // เปลี่ยนตามต้องการ
    if (secretKey !== INIT_SECRET) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid secret key');
    }
    if (!targetEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }
    try {
        console.log(`🚀 Initializing super-admin for: ${targetEmail}`);
        // หา user จาก email
        const user = await admin.auth().getUserByEmail(targetEmail);
        // ตั้งค่า custom claims
        await admin.auth().setCustomUserClaims(user.uid, {
            admin: true,
            adminRole: 'super-admin',
        });
        // บันทึกใน Firestore
        await admin.firestore().collection('admin-users').doc(user.uid).set({
            email: targetEmail,
            role: 'super-admin',
            permissions: {
                canViewAnalytics: true,
                canExportData: true,
                canManageUsers: true,
                canManageSubscriptions: true,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'bootstrap',
            lastAccess: null,
        });
        console.log(`✅ Super-admin initialized: ${targetEmail}`);
        return {
            success: true,
            message: `Super-admin access granted to ${targetEmail}`,
            userId: user.uid,
            note: 'Please logout and login again to apply changes'
        };
    }
    catch (error) {
        console.error('❌ Error initializing super-admin:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to initialize super-admin');
    }
});
/**
 * CREATE ADMIN INVITATION
 * สร้างคำเชิญให้ผู้ใช้เป็น Admin (ต้องยืนยันก่อน)
 */
exports.createAdminInvitation = functions.https.onCall(async (data, context) => {
    var _a;
    // ตรวจสอบ authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to create admin invitation');
    }
    // ตรวจสอบว่าเป็น super-admin
    const callerEmail = context.auth.token.email || 'unknown';
    const callerUid = context.auth.uid;
    const isAdmin = context.auth.token.admin === true;
    const adminRole = context.auth.token.adminRole;
    console.log('🔍 createAdminInvitation called by:', {
        email: callerEmail,
        uid: callerUid,
        isAdmin: isAdmin,
        adminRole: adminRole,
    });
    if (!isAdmin || adminRole !== 'super-admin') {
        console.error('❌ Permission denied:', {
            email: callerEmail,
            isAdmin: isAdmin,
            adminRole: adminRole,
            required: 'super-admin'
        });
        throw new functions.https.HttpsError('permission-denied', `Only super-admins can create admin invitations. Your role: ${adminRole || 'none'}`);
    }
    const { email, role = 'viewer', permissions = {
        canViewAnalytics: true,
        canExportData: false,
        canManageUsers: false,
        canManageSubscriptions: false,
    } } = data;
    // Validate inputs
    if (!email || typeof email !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid email');
    }
    if (!['super-admin', 'admin', 'viewer'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }
    try {
        // ตรวจสอบว่า user มีอยู่ในระบบ
        let targetUser;
        try {
            targetUser = await admin.auth().getUserByEmail(email);
        }
        catch (error) {
            throw new functions.https.HttpsError('not-found', `User with email ${email} not found. User must have an account first.`);
        }
        // ตรวจสอบว่ามี invitation ที่ pending อยู่แล้วหรือไม่
        const existingInvitations = await admin.firestore()
            .collection('admin-invitations')
            .where('email', '==', email)
            .where('status', '==', 'pending')
            .get();
        if (!existingInvitations.empty) {
            throw new functions.https.HttpsError('already-exists', 'An invitation for this email is already pending');
        }
        // ตรวจสอบว่าเป็น admin อยู่แล้วหรือไม่
        const existingAdmin = await admin.firestore()
            .collection('admin-users')
            .doc(targetUser.uid)
            .get();
        if (existingAdmin.exists) {
            throw new functions.https.HttpsError('already-exists', 'User is already an admin');
        }
        // สร้าง verification token (random 32 bytes)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        // Token หมดอายุใน 7 วัน
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        // บันทึก invitation ใน Firestore
        const invitationRef = await admin.firestore().collection('admin-invitations').add({
            email: email,
            userId: targetUser.uid,
            role: role,
            permissions: permissions,
            verificationToken: verificationToken,
            invitedBy: callerUid,
            invitedByEmail: callerEmail,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
        });
        console.log('✅ Admin invitation created:', invitationRef.id);
        // บันทึก audit log
        await admin.firestore().collection('admin-audit-log').add({
            adminId: callerUid,
            adminEmail: callerEmail,
            action: 'create-admin-invitation',
            targetUserId: targetUser.uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: ((_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.headers['user-agent']) || 'unknown',
            details: {
                targetEmail: email,
                role: role,
                permissions: permissions,
                invitationId: invitationRef.id,
            },
        });
        // สร้าง URL สำหรับยืนยัน
        const confirmUrl = `https://peace-script-ai.web.app/accept-admin-invitation?token=${verificationToken}`;
        // ส่งอีเมลไปยังผู้ที่ถูกเชิญ
        await admin.firestore().collection('mail').add({
            to: email,
            from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
            replyTo: 'support@peace-script-ai.web.app',
            message: {
                subject: '🎉 คุณได้รับคำเชิญเป็น Admin - Peace Script AI',
                html: generateAdminInvitationEmailHTML({
                    email: email,
                    role: role,
                    permissions: permissions,
                    invitedBy: callerEmail,
                    confirmUrl: confirmUrl,
                    expiresAt: expiresAt.toLocaleString('th-TH', {
                        timeZone: 'Asia/Bangkok',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                }),
                text: generateAdminInvitationEmailText({
                    email: email,
                    role: role,
                    permissions: permissions,
                    invitedBy: callerEmail,
                    confirmUrl: confirmUrl,
                    expiresAt: expiresAt.toLocaleString('th-TH', {
                        timeZone: 'Asia/Bangkok',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                }),
            },
        });
        console.log('📧 Invitation email sent to:', email);
        return {
            success: true,
            message: `Admin invitation sent to ${email}`,
            invitationId: invitationRef.id,
            expiresAt: expiresAt.toISOString(),
        };
    }
    catch (error) {
        console.error('❌ Error creating admin invitation:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to create admin invitation');
    }
});
/**
 * CONFIRM ADMIN INVITATION
 * ยืนยันการเป็น Admin โดยผู้ใช้ที่ได้รับคำเชิญ
 */
exports.confirmAdminInvitation = functions.https.onCall(async (data, context) => {
    var _a;
    const { verificationToken } = data;
    // ตรวจสอบ authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to confirm invitation');
    }
    const userEmail = context.auth.token.email || '';
    const userId = context.auth.uid;
    console.log('🔍 confirmAdminInvitation called by:', {
        email: userEmail,
        uid: userId,
        token: (verificationToken === null || verificationToken === void 0 ? void 0 : verificationToken.substring(0, 10)) + '...',
    });
    if (!verificationToken) {
        throw new functions.https.HttpsError('invalid-argument', 'Verification token is required');
    }
    try {
        // ค้นหา invitation จาก token
        const invitationsSnapshot = await admin.firestore()
            .collection('admin-invitations')
            .where('verificationToken', '==', verificationToken)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
        if (invitationsSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'Invalid or expired invitation token');
        }
        const invitationDoc = invitationsSnapshot.docs[0];
        const invitation = invitationDoc.data();
        // ตรวจสอบว่าหมดอายุหรือไม่
        const expiresAt = invitation.expiresAt.toDate();
        if (expiresAt < new Date()) {
            // อัปเดตสถานะเป็น expired
            await invitationDoc.ref.update({
                status: 'expired',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            throw new functions.https.HttpsError('deadline-exceeded', 'Invitation has expired');
        }
        // ตรวจสอบว่าเป็นคนเดียวกับที่ถูกเชิญ
        if (invitation.email !== userEmail) {
            throw new functions.https.HttpsError('permission-denied', 'This invitation is for a different email address');
        }
        // ตั้งค่า custom claims
        await admin.auth().setCustomUserClaims(userId, {
            admin: true,
            adminRole: invitation.role,
        });
        console.log('✅ Custom claims set for:', userEmail);
        // บันทึกข้อมูลใน Firestore
        await admin.firestore().collection('admin-users').doc(userId).set({
            email: invitation.email,
            role: invitation.role,
            permissions: invitation.permissions,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: invitation.invitedBy,
            lastAccess: null,
        });
        // อัปเดตสถานะ invitation
        await invitationDoc.ref.update({
            status: 'confirmed',
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            confirmedBy: userId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // บันทึก audit log
        await admin.firestore().collection('admin-audit-log').add({
            adminId: userId,
            adminEmail: userEmail,
            action: 'confirm-admin-invitation',
            targetUserId: userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: ((_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.headers['user-agent']) || 'unknown',
            details: {
                invitationId: invitationDoc.id,
                role: invitation.role,
                invitedBy: invitation.invitedByEmail,
            },
        });
        const dashboardUrl = 'https://peace-script-ai.web.app/admin';
        const timestamp = new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        // ส่งอีเมลยืนยันไปยังผู้ใช้ที่ยอมรับ
        await admin.firestore().collection('mail').add({
            to: invitation.email,
            from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
            replyTo: 'support@peace-script-ai.web.app',
            message: {
                subject: '✅ ยืนยันสิทธิ์ Admin สำเร็จ - Peace Script AI',
                html: generateAdminConfirmedEmailHTML({
                    adminEmail: invitation.email,
                    role: invitation.role,
                    permissions: invitation.permissions,
                    grantedBy: invitation.invitedByEmail,
                    dashboardUrl: dashboardUrl,
                }),
                text: generateAdminConfirmedEmailText({
                    adminEmail: invitation.email,
                    role: invitation.role,
                    permissions: invitation.permissions,
                    grantedBy: invitation.invitedByEmail,
                    dashboardUrl: dashboardUrl,
                }),
            },
        });
        // ส่งอีเมลแจ้งเตือนไปยัง Super Admin ที่เชิญ
        await admin.firestore().collection('mail').add({
            to: invitation.invitedByEmail,
            from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
            replyTo: 'support@peace-script-ai.web.app',
            message: {
                subject: '✅ ผู้ใช้ยอมรับคำเชิญ Admin - Peace Script AI',
                html: generateAdminConfirmationNotificationHTML({
                    granterEmail: invitation.invitedByEmail,
                    targetEmail: invitation.email,
                    role: invitation.role,
                    timestamp: timestamp,
                }),
                text: generateAdminConfirmationNotificationText({
                    granterEmail: invitation.invitedByEmail,
                    targetEmail: invitation.email,
                    role: invitation.role,
                    timestamp: timestamp,
                }),
            },
        });
        console.log('📧 Confirmation emails sent to both parties');
        return {
            success: true,
            message: 'Admin access confirmed successfully',
            role: invitation.role,
            permissions: invitation.permissions,
            note: 'Please refresh the page to access Admin Dashboard'
        };
    }
    catch (error) {
        console.error('❌ Error confirming admin invitation:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to confirm admin invitation');
    }
});
/**
 * Helper: Generate Admin Invitation Email HTML
 */
function generateAdminInvitationEmailHTML(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.permissions.canViewAnalytics && '📊 ดู Analytics และสถิติระบบ',
        params.permissions.canExportData && '📥 Export ข้อมูลและรายงาน',
        params.permissions.canManageUsers && '👥 จัดการผู้ใช้และ Admin อื่นๆ',
        params.permissions.canManageSubscriptions && '💳 จัดการ Subscriptions และแพ็คเกจ',
    ].filter(Boolean);
    return `
<!DOCTYPE html>
<html>
<head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.badge{background:#fef3c7;color:#92400e;padding:8px 16px;border-radius:20px;display:inline-block;font-weight:bold}.info-box{background:white;border-left:4px solid #f59e0b;padding:20px;border-radius:8px;margin:20px 0}.permission-list{background:#fffbeb;border:2px solid #fcd34d;padding:15px 20px;border-radius:8px;margin:15px 0}.button{display:inline-block;background:#f59e0b;color:white;padding:15px 40px;text-decoration:none;border-radius:8px;margin:20px 0;font-weight:bold;font-size:16px}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}.warning{background:#fef2f2;border:2px solid #fca5a5;padding:15px;border-radius:8px;margin:20px 0;color:#991b1b}</style></head>
<body>
<div class="container">
<div class="header"><h1>✉️ คำเชิญเป็น Admin</h1><p>Peace Script AI</p></div>
<div class="content">
<h2>สวัสดีครับ!</h2>
<p>คุณได้รับคำเชิญให้เป็น <strong>Admin</strong> สำหรับระบบ <strong>Peace Script AI</strong></p>
<div class="info-box">
<p><strong>📧 อีเมล:</strong> ${params.email}</p>
<p><strong>👤 บทบาท:</strong> <span class="badge">${roleNameTH}</span></p>
<p><strong>✍️ เชิญโดย:</strong> ${params.invitedBy}</p>
<p><strong>⏰ หมดอายุ:</strong> ${params.expiresAt}</p>
</div>
<div class="permission-list">
<h3>🔐 สิทธิ์ที่คุณจะได้รับ:</h3>
<ul>${permissionsList.map(p => `<li>${p}</li>`).join('')}</ul>
</div>
<div class="warning">
<p style="margin:0"><strong>⚠️ โปรดทราบ:</strong><br>
• คุณต้อง<strong>ยืนยันการเป็น Admin</strong> ภายใน 7 วัน<br>
• การเป็น Admin มาพร้อมกับความรับผิดชอบสูง<br>
• หากคุณไม่ได้ขอเป็น Admin โปรดเพิกเฉยอีเมลนี้</p>
</div>
<p style="text-align:center"><a href="${params.confirmUrl}" class="button">✅ ยืนยันการเป็น Admin</a></p>
<p style="text-align:center;color:#666;font-size:14px">หรือคัดลอกลิงก์:<br><a href="${params.confirmUrl}" style="color:#667eea;word-break:break-all">${params.confirmUrl}</a></p>
<h3>หลังจากยืนยัน:</h3>
<ol>
<li>คุณจะได้รับอีเมลยืนยันสิทธิ์ทันที</li>
<li>สามารถเข้าใช้ Admin Dashboard ได้ทันที</li>
<li>มีสิทธิ์ตามที่ระบุด้านบน</li>
</ol>
</div>
<div class="footer"><p>© 2025 Peace Script AI. All rights reserved.</p></div>
</div>
</body>
</html>`;
}
/**
 * Helper: Generate Admin Invitation Email Text
 */
function generateAdminInvitationEmailText(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.permissions.canViewAnalytics && '• 📊 ดู Analytics และสถิติระบบ',
        params.permissions.canExportData && '• 📥 Export ข้อมูลและรายงาน',
        params.permissions.canManageUsers && '• 👥 จัดการผู้ใช้และ Admin อื่นๆ',
        params.permissions.canManageSubscriptions && '• 💳 จัดการ Subscriptions',
    ].filter(Boolean);
    return `
Peace Script AI - คำเชิญเป็น Admin ✉️

สวัสดีครับ!

คุณได้รับคำเชิญให้เป็น Admin สำหรับระบบ Peace Script AI

อีเมล: ${params.email}
บทบาท: ${roleNameTH}
เชิญโดย: ${params.invitedBy}
หมดอายุ: ${params.expiresAt}

สิทธิ์ที่คุณจะได้รับ:
${permissionsList.join('\n')}

⚠️ โปรดทราบ:
• คุณต้องยืนยันการเป็น Admin ภายใน 7 วัน
• การเป็น Admin มาพร้อมกับความรับผิดชอบสูง
• หากคุณไม่ได้ขอเป็น Admin โปรดเพิกเฉยอีเมลนี้

ยืนยันการเป็น Admin: ${params.confirmUrl}

© 2025 Peace Script AI
  `;
}
/**
 * Helper: Generate Admin Confirmed Email HTML (ส่งให้ผู้ที่ยอมรับ)
 */
function generateAdminConfirmedEmailHTML(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.permissions.canViewAnalytics && '📊 ดู Analytics และสถิติระบบ',
        params.permissions.canExportData && '📥 Export ข้อมูลและรายงาน',
        params.permissions.canManageUsers && '👥 จัดการผู้ใช้และ Admin อื่นๆ',
        params.permissions.canManageSubscriptions && '💳 จัดการ Subscriptions และแพ็คเกจ',
    ].filter(Boolean);
    return `
<!DOCTYPE html>
<html>
<head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.badge{background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:20px;display:inline-block;font-weight:bold}.info-box{background:white;border-left:4px solid #10b981;padding:20px;border-radius:8px;margin:20px 0}.permission-list{background:#ecfdf5;border:2px solid #6ee7b7;padding:15px 20px;border-radius:8px;margin:15px 0}.button{display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:8px;margin:20px 0;font-weight:bold;font-size:16px}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head>
<body>
<div class="container">
<div class="header"><h1>🎉 ยืนยันสิทธิ์ Admin สำเร็จ!</h1><p>Peace Script AI</p></div>
<div class="content">
<h2>ยินดีด้วยครับ!</h2>
<p>คุณได้ยืนยันและรับสิทธิ์เป็น <strong>Admin</strong> เรียบร้อยแล้ว</p>
<div class="info-box">
<p><strong>📧 อีเมล:</strong> ${params.adminEmail}</p>
<p><strong>👤 บทบาท:</strong> <span class="badge">${roleNameTH}</span></p>
<p><strong>✍️ ได้รับสิทธิ์โดย:</strong> ${params.grantedBy}</p>
</div>
<div class="permission-list">
<h3>🔐 สิทธิ์ของคุณ:</h3>
<ul>${permissionsList.map(p => `<li>${p}</li>`).join('')}</ul>
</div>
<p style="text-align:center"><a href="${params.dashboardUrl}" class="button">🚀 เข้าสู่ Admin Dashboard</a></p>
<h3>ขั้นตอนถัดไป:</h3>
<ol>
<li><strong>Refresh หน้าเว็บ</strong> หรือ Login ใหม่เพื่ออัปเดตสิทธิ์</li>
<li>คลิกปุ่มด้านบนเพื่อเข้าสู่ Admin Dashboard</li>
<li>ทำความเข้าใจกับเมนูและฟังก์ชันต่างๆ</li>
<li>หากมีคำถาม ติดต่อ Super Admin ได้ทันที</li>
</ol>
<div style="background:#fef3c7;border:2px solid #fbbf24;padding:15px;border-radius:8px;margin:20px 0">
<p style="margin:0;color:#92400e"><strong>⚠️ หมายเหตุสำคัญ:</strong><br>การเป็น Admin มาพร้อมกับความรับผิดชอบ กรุณาใช้สิทธิ์อย่างรอบคอบและระมัดระวัง</p>
</div>
</div>
<div class="footer"><p>© 2025 Peace Script AI. All rights reserved.</p></div>
</div>
</body>
</html>`;
}
/**
 * Helper: Generate Admin Confirmed Email Text (ส่งให้ผู้ที่ยอมรับ)
 */
function generateAdminConfirmedEmailText(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.permissions.canViewAnalytics && '• 📊 ดู Analytics และสถิติระบบ',
        params.permissions.canExportData && '• 📥 Export ข้อมูลและรายงาน',
        params.permissions.canManageUsers && '• 👥 จัดการผู้ใช้และ Admin อื่นๆ',
        params.permissions.canManageSubscriptions && '• 💳 จัดการ Subscriptions',
    ].filter(Boolean);
    return `
Peace Script AI - ยืนยันสิทธิ์ Admin สำเร็จ! 🎉

ยินดีด้วยครับ!

คุณได้ยืนยันและรับสิทธิ์เป็น Admin เรียบร้อยแล้ว

อีเมล: ${params.adminEmail}
บทบาท: ${roleNameTH}
ได้รับสิทธิ์โดย: ${params.grantedBy}

สิทธิ์ของคุณ:
${permissionsList.join('\n')}

เข้าสู่ Admin Dashboard: ${params.dashboardUrl}

ขั้นตอนถัดไป:
1. Refresh หน้าเว็บหรือ Login ใหม่เพื่ออัปเดตสิทธิ์
2. คลิกลิงก์ด้านบนเพื่อเข้าสู่ Admin Dashboard
3. ทำความเข้าใจกับเมนูและฟังก์ชันต่างๆ
4. หากมีคำถาม ติดต่อ Super Admin ได้ทันที

⚠️ การเป็น Admin มาพร้อมกับความรับผิดชอบ กรุณาใช้สิทธิ์อย่างรอบคอบ

© 2025 Peace Script AI
  `;
}
/**
 * Helper: Generate Admin Confirmation Notification HTML (ส่งให้ Super Admin)
 */
function generateAdminConfirmationNotificationHTML(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    return `
<!DOCTYPE html>
<html>
<head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.info-box{background:#eff6ff;border:2px solid#60a5fa;padding:20px;border-radius:8px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head>
<body>
<div class="container">
<div class="header"><h1>✅ แจ้งเตือน: ยืนยัน Admin สำเร็จ</h1><p>Peace Script AI</p></div>
<div class="content">
<h2>สวัสดีครับ!</h2>
<p>ผู้ใช้ที่คุณเชิญได้<strong>ยอมรับและยืนยันสิทธิ์ Admin</strong> เรียบร้อยแล้ว</p>
<div class="info-box">
<p><strong>📧 ผู้ใช้:</strong> ${params.targetEmail}</p>
<p><strong>👤 บทบาท:</strong> ${roleNameTH}</p>
<p><strong>⏰ เวลายืนยัน:</strong> ${params.timestamp}</p>
</div>
<p>ผู้ใช้สามารถเข้าใช้งาน Admin Dashboard ได้ทันที</p>
</div>
<div class="footer"><p>© 2025 Peace Script AI. All rights reserved.</p></div>
</div>
</body>
</html>`;
}
/**
 * Helper: Generate Admin Confirmation Notification Text (ส่งให้ Super Admin)
 */
function generateAdminConfirmationNotificationText(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    return `
Peace Script AI - แจ้งเตือน: ยืนยัน Admin สำเร็จ ✅

สวัสดีครับ!

ผู้ใช้ที่คุณเชิญได้ยอมรับและยืนยันสิทธิ์ Admin เรียบร้อยแล้ว

ผู้ใช้: ${params.targetEmail}
บทบาท: ${roleNameTH}
เวลายืนยัน: ${params.timestamp}

ผู้ใช้สามารถเข้าใช้งาน Admin Dashboard ได้ทันที

© 2025 Peace Script AI
  `;
}
/**
 * Helper: Generate Admin Granted Email HTML
 */
function generateAdminGrantedEmailHTML(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.permissions.canViewAnalytics && '📊 ดู Analytics และสถิติระบบ',
        params.permissions.canExportData && '📥 Export ข้อมูลและรายงาน',
        params.permissions.canManageUsers && '👥 จัดการผู้ใช้และ Admin อื่นๆ',
        params.permissions.canManageSubscriptions && '💳 จัดการ Subscriptions และแพ็คเกจ',
    ].filter(Boolean);
    return `
<!DOCTYPE html>
<html>
<head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.badge{background:#fef3c7;color:#92400e;padding:8px 16px;border-radius:20px;display:inline-block;font-weight:bold}.info-box{background:white;border-left:4px solid #667eea;padding:20px;border-radius:8px;margin:20px 0}.permission-list{background:#eff6ff;border:2px solid #bfdbfe;padding:15px 20px;border-radius:8px;margin:15px 0}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head>
<body>
<div class="container">
<div class="header"><h1>🎉 ยินดีด้วย!</h1><p>คุณได้รับสิทธิ์ Admin</p></div>
<div class="content">
<h2>สวัสดีครับ!</h2>
<p>คุณได้รับสิทธิ์เป็น <strong>Admin</strong> สำหรับระบบ <strong>Peace Script AI</strong></p>
<div class="info-box">
<p><strong>📧 อีเมล:</strong> ${params.adminEmail}</p>
<p><strong>👤 บทบาท:</strong> <span class="badge">${roleNameTH}</span></p>
<p><strong>✍️ ได้รับสิทธิ์โดย:</strong> ${params.grantedBy}</p>
</div>
<div class="permission-list">
<h3>🔐 สิทธิ์ที่คุณมี:</h3>
<ul>${permissionsList.map(p => `<li>${p}</li>`).join('')}</ul>
</div>
<div style="background:#fef3c7;border:2px solid #fbbf24;padding:15px;border-radius:8px;margin:20px 0">
<p style="margin:0;color:#92400e"><strong>⚠️ หมายเหตุสำคัญ:</strong><br>การเป็น Admin มาพร้อมกับความรับผิดชอบ กรุณาใช้สิทธิ์อย่างรอบคอบ</p>
</div>
<p style="text-align:center"><a href="${params.dashboardUrl}" class="button">เข้าสู่ Admin Dashboard</a></p>
<h3>ขั้นตอนถัดไป:</h3>
<ol>
<li>คลิกปุ่มด้านบนเพื่อเข้าสู่ Admin Dashboard</li>
<li>ทำความเข้าใจกับเมนูและฟังก์ชันต่างๆ</li>
<li>ตรวจสอบสิทธิ์ที่คุณมีก่อนทำการใดๆ</li>
<li>หากมีคำถาม ติดต่อ Super Admin ได้ทันที</li>
</ol>
</div>
<div class="footer"><p>© 2025 Peace Script AI. All rights reserved.</p></div>
</div>
</body>
</html>`;
}
/**
 * Helper: Generate Admin Granted Email Text
 */
function generateAdminGrantedEmailText(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.permissions.canViewAnalytics && '• 📊 ดู Analytics และสถิติระบบ',
        params.permissions.canExportData && '• 📥 Export ข้อมูลและรายงาน',
        params.permissions.canManageUsers && '• 👥 จัดการผู้ใช้และ Admin อื่นๆ',
        params.permissions.canManageSubscriptions && '• 💳 จัดการ Subscriptions',
    ].filter(Boolean);
    return `
Peace Script AI - คุณได้รับสิทธิ์ Admin 🎉

สวัสดีครับ!

คุณได้รับสิทธิ์เป็น Admin สำหรับระบบ Peace Script AI

อีเมล: ${params.adminEmail}
บทบาท: ${roleNameTH}
ได้รับสิทธิ์โดย: ${params.grantedBy}

สิทธิ์ที่คุณมี:
${permissionsList.join('\n')}

⚠️ หมายเหตุสำคัญ:
การเป็น Admin มาพร้อมกับความรับผิดชอบ กรุณาใช้สิทธิ์อย่างรอบคอบ

เข้าสู่ Admin Dashboard: ${params.dashboardUrl}

© 2025 Peace Script AI
  `;
}
/**
 * Helper: Generate Admin Confirmation Email HTML
 */
function generateAdminConfirmationEmailHTML(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    return `
<!DOCTYPE html>
<html>
<head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.info-box{background:white;border:2px solid #10b981;padding:20px;border-radius:8px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head>
<body>
<div class="container">
<div class="header"><h1>✅ การดำเนินการสำเร็จ</h1><p>เพิ่มสิทธิ์ Admin</p></div>
<div class="content">
<h2>ยืนยันการดำเนินการ</h2>
<p>ระบบได้บันทึกการ<strong>เพิ่มสิทธิ์ Admin</strong>ของคุณเรียบร้อยแล้ว</p>
<div class="info-box">
<p><strong>👤 ผู้ดำเนินการ:</strong> ${params.granterEmail}</p>
<p><strong>🎯 ผู้ได้รับผลกระทบ:</strong> ${params.targetEmail}</p>
<p><strong>📋 บทบาท:</strong> ${roleNameTH}</p>
<p><strong>🕐 เวลา:</strong> ${params.timestamp}</p>
</div>
<div style="background:#dbeafe;border-left:4px solid #3b82f6;padding:15px;border-radius:8px">
<p style="margin:0;color:#1e40af"><strong>ℹ️ หมายเหตุ:</strong><br>การเปลี่ยนแปลงนี้ได้ถูกบันทึกใน Audit Log และผู้ที่ได้รับผลกระทบจะได้รับอีเมลแจ้งเตือน</p>
</div>
<p>หากคุณไม่ได้ดำเนินการนี้ กรุณาติดต่อทีม Support ทันที</p>
</div>
<div class="footer"><p>© 2025 Peace Script AI. All rights reserved.</p></div>
</div>
</body>
</html>`;
}
/**
 * Helper: Generate Admin Confirmation Email Text
 */
function generateAdminConfirmationEmailText(params) {
    const roleNameTH = params.role === 'super-admin' ? 'Super Admin' :
        params.role === 'admin' ? 'Admin' : 'Viewer';
    return `
Peace Script AI - ยืนยันการเพิ่มสิทธิ์ Admin ✅

ยืนยันการดำเนินการ

ระบบได้บันทึกการเพิ่มสิทธิ์ Adminของคุณเรียบร้อยแล้ว

รายละเอียด:
• ผู้ดำเนินการ: ${params.granterEmail}
• ผู้ได้รับผลกระทบ: ${params.targetEmail}
• บทบาท: ${roleNameTH}
• เวลา: ${params.timestamp}

ℹ️ หมายเหตุ:
การเปลี่ยนแปลงนี้ได้ถูกบันทึกใน Audit Log และผู้ที่ได้รับผลกระทบจะได้รับอีเมลแจ้งเตือน

หากคุณไม่ได้ดำเนินการนี้ กรุณาติดต่อทีม Support ทันที

© 2025 Peace Script AI
  `;
}
/**
 * Helper: Generate Admin Revoked Email HTML
 */
function generateAdminRevokedEmailHTML(params) {
    return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.info-box{background:white;border-left:4px solid#ef4444;padding:20px;border-radius:8px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>⚠️ สิทธิ์ถูกเพิกถอน</h1></div><div class="content"><h2>แจ้งเตือนการเปลี่ยนแปลงสิทธิ์</h2><p>สิทธิ์ Admin ของคุณถูกเพิกถอนแล้ว</p><div class="info-box"><p><strong>📧 อีเมล:</strong> ${params.adminEmail}</p><p><strong>👤 ถูกเพิกถอนโดย:</strong> ${params.revokedBy}</p><p><strong>🕐 เวลา:</strong> ${params.timestamp}</p></div><div style="background:#fee2e2;border:2px solid #fecaca;padding:15px;border-radius:8px"><p style="margin:0;color:#991b1b"><strong>⚠️ ผลกระทบ:</strong><br>คุณจะไม่สามารถเข้าถึง Admin Dashboard ได้อีกต่อไป</p></div></div><div class="footer"><p>© 2025 Peace Script AI</p></div></div></body></html>`;
}
/**
 * Helper: Generate Admin Revoked Email Text
 */
function generateAdminRevokedEmailText(params) {
    return `Peace Script AI - สิทธิ์ Admin ถูกเพิกถอน ⚠️

สิทธิ์ Admin ของคุณถูกเพิกถอนแล้ว

รายละเอียด:
• อีเมล: ${params.adminEmail}
• ถูกเพิกถอนโดย: ${params.revokedBy}
• เวลา: ${params.timestamp}`;
}
/**
 * Helper: Generate Admin Updated Email HTML
 */
function generateAdminUpdatedEmailHTML(params) {
    const roleNameTH = params.newRole === 'super-admin' ? 'Super Admin' : params.newRole === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.newPermissions.canViewAnalytics && '📊 ดู Analytics',
        params.newPermissions.canExportData && '📥 Export ข้อมูล',
        params.newPermissions.canManageUsers && '👥 จัดการ Admin',
        params.newPermissions.canManageSubscriptions && '💳 จัดการ Subscriptions'
    ].filter(Boolean);
    return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.badge{background:#dbeafe;color:#1e40af;padding:8px 16px;border-radius:20px;display:inline-block;font-weight:bold}.info-box{background:white;border-left:4px solid #3b82f6;padding:20px;border-radius:8px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>🔄 สิทธิ์อัพเดทแล้ว</h1></div><div class="content"><h2>แจ้งเตือนการอัพเดทสิทธิ์</h2><p>สิทธิ์ Admin ของคุณถูกอัพเดทแล้ว</p><div class="info-box"><p><strong>📧 อีเมล:</strong> ${params.adminEmail}</p><p><strong>👤 บทบาทใหม่:</strong> <span class="badge">${roleNameTH}</span></p><p><strong>✍️ อัพเดทโดย:</strong> ${params.updatedBy}</p><p><strong>🕐 เวลา:</strong> ${params.timestamp}</p></div><div style="background:#eff6ff;border:2px solid #bfdbfe;padding:15px;border-radius:8px"><h3>🔐 สิทธิ์ปัจจุบัน:</h3><ul>${permissionsList.map(p => `<li>${p}</li>`).join('')}</ul></div></div><div class="footer"><p>© 2025 Peace Script AI</p></div></div></body></html>`;
}
/**
 * Helper: Generate Admin Updated Email Text
 */
function generateAdminUpdatedEmailText(params) {
    const roleNameTH = params.newRole === 'super-admin' ? 'Super Admin' : params.newRole === 'admin' ? 'Admin' : 'Viewer';
    const permissionsList = [
        params.newPermissions.canViewAnalytics && '• 📊 ดู Analytics',
        params.newPermissions.canExportData && '• 📥 Export ข้อมูล',
        params.newPermissions.canManageUsers && '• 👥 จัดการ Admin',
        params.newPermissions.canManageSubscriptions && '• 💳 จัดการ Subscriptions'
    ].filter(Boolean);
    return `Peace Script AI - สิทธิ์ Admin อัพเดทแล้ว 🔄

สิทธิ์ Admin ของคุณถูกอัพเดทแล้ว

รายละเอียด:
• อีเมล: ${params.adminEmail}
• บทบาทใหม่: ${roleNameTH}
• อัพเดทโดย: ${params.updatedBy}
• เวลา: ${params.timestamp}

สิทธิ์ปัจจุบัน:
${permissionsList.join('\n')}`;
}
/**
 * Cloud Function เป็น Proxy สำหรับ Replicate API
 * แก้ปัญหา CORS เมื่อเรียก API จาก Browser
 */
exports.replicateProxy = functions.https.onCall(async (data, context) => {
    // ตรวจสอบ Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to use this function');
    }
    const { endpoint, method = 'POST', body } = data;
    // ตรวจสอบ REPLICATE_API_TOKEN - ใช้ environment variable แทน functions.config()
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
        throw new functions.https.HttpsError('failed-precondition', 'Replicate API token not configured');
    }
    try {
        const response = await (0, node_fetch_1.default)(`https://api.replicate.com${endpoint}`, {
            method,
            headers: {
                'Authorization': `Token ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        return { success: true, data: result };
    }
    catch (error) {
        console.error('Replicate proxy error:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Cloud Function สำหรับตรวจสอบสถานะการสร้างวิดีโอ
 */
exports.checkReplicateStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { predictionId } = data;
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
        throw new functions.https.HttpsError('failed-precondition', 'Replicate API token not configured');
    }
    try {
        const response = await (0, node_fetch_1.default)(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                'Authorization': `Token ${apiToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        return { success: true, data: result };
    }
    catch (error) {
        console.error('Check status error:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Cloud Function: Grant Admin Access
 * ให้สิทธิ์ admin แก่ user พร้อมกำหนด role และ permissions
 * เฉพาะ super-admin เท่านั้นที่เรียกใช้ได้
 */
exports.grantAdminAccess = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // ตรวจสอบ authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to grant admin access');
    }
    // ตรวจสอบว่าเป็น super-admin จาก token claims
    const callerEmail = context.auth.token.email || 'unknown';
    const callerUid = context.auth.uid;
    const isAdmin = context.auth.token.admin === true;
    const adminRole = context.auth.token.adminRole;
    console.log('🔍 grantAdminAccess called by:', {
        email: callerEmail,
        uid: callerUid,
        isAdmin: isAdmin,
        adminRole: adminRole,
        allClaims: context.auth.token
    });
    if (!isAdmin || adminRole !== 'super-admin') {
        console.error('❌ Permission denied:', {
            email: callerEmail,
            isAdmin: isAdmin,
            adminRole: adminRole,
            required: 'super-admin'
        });
        throw new functions.https.HttpsError('permission-denied', `Only super-admins can grant admin access. Your role: ${adminRole || 'none'}`);
    }
    console.log('✅ Permission granted for:', callerEmail);
    const { email, role = 'viewer', permissions = {
        canViewAnalytics: true,
        canExportData: false,
        canManageUsers: false,
        canManageSubscriptions: false,
    } } = data;
    // Validate inputs
    if (!email || typeof email !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid email');
    }
    if (!['super-admin', 'admin', 'viewer'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }
    try {
        // ค้นหา user จาก email
        let targetUser;
        try {
            targetUser = await admin.auth().getUserByEmail(email);
        }
        catch (error) {
            throw new functions.https.HttpsError('not-found', `User with email ${email} not found`);
        }
        // ตั้งค่า custom claims
        await admin.auth().setCustomUserClaims(targetUser.uid, {
            admin: true,
            adminRole: role,
        });
        // บันทึกข้อมูลใน Firestore
        await admin.firestore().collection('admin-users').doc(targetUser.uid).set({
            email: email,
            role: role,
            permissions: permissions,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid,
            lastAccess: null,
        });
        // บันทึก audit log
        await admin.firestore().collection('admin-audit-log').add({
            adminId: context.auth.uid,
            adminEmail: context.auth.token.email || 'unknown',
            action: 'grant-admin-access',
            targetUserId: targetUser.uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: ((_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.headers['user-agent']) || 'unknown',
            details: {
                targetEmail: email,
                role: role,
                permissions: permissions,
            },
        });
        // ส่งอีเมลแจ้งเตือน 2 ฝ่าย
        const dashboardUrl = 'https://peace-script-ai.web.app/admin';
        const granterEmail = context.auth.token.email || 'unknown';
        const timestamp = new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        try {
            // อีเมลถึงผู้ได้รับสิทธิ์ Admin
            await admin.firestore().collection('mail').add({
                to: email,
                from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
                replyTo: 'support@peace-script-ai.web.app',
                message: {
                    subject: '🎉 คุณได้รับสิทธิ์ Admin - Peace Script AI',
                    html: generateAdminGrantedEmailHTML({
                        adminEmail: email,
                        role: role,
                        permissions: permissions,
                        grantedBy: granterEmail,
                        dashboardUrl: dashboardUrl,
                    }),
                    text: generateAdminGrantedEmailText({
                        adminEmail: email,
                        role: role,
                        permissions: permissions,
                        grantedBy: granterEmail,
                        dashboardUrl: dashboardUrl,
                    }),
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // อีเมลยืนยันถึงผู้เพิ่มสิทธิ์
            await admin.firestore().collection('mail').add({
                to: granterEmail,
                from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
                replyTo: 'support@peace-script-ai.web.app',
                message: {
                    subject: '✅ ยืนยันการเพิ่มสิทธิ์ Admin - Peace Script AI',
                    html: generateAdminConfirmationEmailHTML({
                        granterEmail: granterEmail,
                        targetEmail: email,
                        role: role,
                        action: 'granted',
                        timestamp: timestamp,
                    }),
                    text: generateAdminConfirmationEmailText({
                        granterEmail: granterEmail,
                        targetEmail: email,
                        role: role,
                        action: 'granted',
                        timestamp: timestamp,
                    }),
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`📧 Sent notification emails for admin access grant`);
        }
        catch (emailError) {
            console.error('Error sending notification emails:', emailError);
            // ไม่ throw error เพราะการเพิ่ม admin สำเร็จแล้ว
        }
        console.log(`✅ Admin access granted to ${email} with role ${role}`);
        return {
            success: true,
            message: `Admin access granted to ${email}`,
            userId: targetUser.uid,
        };
    }
    catch (error) {
        console.error('❌ Error granting admin access:', error);
        // Log more details for debugging
        if (error instanceof Error) {
            console.error('📝 Error Details:');
            console.error('  - Name:', error.name);
            console.error('  - Message:', error.message);
            console.error('  - Stack:', error.stack);
        }
        // Log context for debugging
        console.error('📝 Context:');
        console.error('  - Target email:', email);
        console.error('  - Requested role:', role);
        console.error('  - Caller UID:', (_b = context.auth) === null || _b === void 0 ? void 0 : _b.uid);
        // Return more specific error messages
        if (error instanceof functions.https.HttpsError) {
            throw error; // Re-throw if already an HttpsError
        }
        // Check for specific Firebase errors
        const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเพิ่ม Admin';
        throw new functions.https.HttpsError('internal', `Failed to grant admin access: ${errorMessage}`);
    }
});
/**
 * Cloud Function: Revoke Admin Access
 * ลบสิทธิ์ admin ของ user
 * เฉพาะ super-admin เท่านั้นที่เรียกใช้ได้
 */
exports.revokeAdminAccess = functions.https.onCall(async (data, context) => {
    var _a;
    // ตรวจสอบ authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to revoke admin access');
    }
    // ตรวจสอบว่าเป็น super-admin
    const callerToken = await admin.auth().getUser(context.auth.uid);
    const callerClaims = callerToken.customClaims || {};
    if (callerClaims.adminRole !== 'super-admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only super-admins can revoke admin access');
    }
    const { userId } = data;
    if (!userId || typeof userId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid userId');
    }
    // ป้องกันการลบตัวเอง
    if (userId === context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Cannot revoke your own admin access');
    }
    try {
        // ลบ custom claims
        await admin.auth().setCustomUserClaims(userId, {
            admin: null,
            adminRole: null,
        });
        // ลบข้อมูลจาก Firestore
        await admin.firestore().collection('admin-users').doc(userId).delete();
        // บันทึก audit log
        const targetUser = await admin.auth().getUser(userId);
        await admin.firestore().collection('admin-audit-log').add({
            adminId: context.auth.uid,
            adminEmail: context.auth.token.email || 'unknown',
            action: 'revoke-admin-access',
            targetUserId: userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: ((_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.headers['user-agent']) || 'unknown',
            details: {
                targetEmail: targetUser.email,
            },
        });
        // ส่งอีเมลแจ้งเตือน 2 ฝ่าย
        const revokerEmail = context.auth.token.email || 'unknown';
        const timestamp = new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        try {
            // อีเมลถึงผู้ถูกลบสิทธิ์
            await admin.firestore().collection('mail').add({
                to: targetUser.email,
                from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
                replyTo: 'support@peace-script-ai.web.app',
                message: {
                    subject: '⚠️ สิทธิ์ Admin ของคุณถูกเพิกถอน - Peace Script AI',
                    html: generateAdminRevokedEmailHTML({
                        adminEmail: targetUser.email || 'unknown',
                        revokedBy: revokerEmail,
                        timestamp: timestamp,
                    }),
                    text: generateAdminRevokedEmailText({
                        adminEmail: targetUser.email || 'unknown',
                        revokedBy: revokerEmail,
                        timestamp: timestamp,
                    }),
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // อีเมลยืนยันถึงผู้ลบสิทธิ์
            await admin.firestore().collection('mail').add({
                to: revokerEmail,
                from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
                replyTo: 'support@peace-script-ai.web.app',
                message: {
                    subject: '❌ ยืนยันการลบสิทธิ์ Admin - Peace Script AI',
                    html: generateAdminConfirmationEmailHTML({
                        granterEmail: revokerEmail,
                        targetEmail: targetUser.email || 'unknown',
                        role: 'N/A',
                        action: 'revoked',
                        timestamp: timestamp,
                    }),
                    text: generateAdminConfirmationEmailText({
                        granterEmail: revokerEmail,
                        targetEmail: targetUser.email || 'unknown',
                        role: 'N/A',
                        action: 'revoked',
                        timestamp: timestamp,
                    }),
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`📧 Sent notification emails for admin access revoke`);
        }
        catch (emailError) {
            console.error('Error sending notification emails:', emailError);
        }
        console.log(`✅ Admin access revoked from user ${userId}`);
        return {
            success: true,
            message: 'Admin access revoked successfully',
        };
    }
    catch (error) {
        console.error('Error revoking admin access:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to revoke admin access');
    }
});
/**
 * Cloud Function: Update Admin Permissions
 * อัพเดท role และ permissions ของ admin
 * เฉพาะ super-admin เท่านั้นที่เรียกใช้ได้
 */
exports.updateAdminPermissions = functions.https.onCall(async (data, context) => {
    var _a;
    // ตรวจสอบ authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    // ตรวจสอบว่าเป็น super-admin
    const callerToken = await admin.auth().getUser(context.auth.uid);
    const callerClaims = callerToken.customClaims || {};
    if (callerClaims.adminRole !== 'super-admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only super-admins can update admin permissions');
    }
    const { userId, role, permissions } = data;
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid userId');
    }
    if (role && !['super-admin', 'admin', 'viewer'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }
    // ป้องกันการแก้ไขตัวเอง
    if (userId === context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Cannot modify your own permissions');
    }
    try {
        // ตรวจสอบว่า user เป็น admin
        const adminDoc = await admin.firestore().collection('admin-users').doc(userId).get();
        if (!adminDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Admin user not found');
        }
        const updateData = {};
        if (role) {
            // อัพเดท custom claims
            await admin.auth().setCustomUserClaims(userId, {
                admin: true,
                adminRole: role,
            });
            updateData.role = role;
        }
        if (permissions) {
            updateData.permissions = permissions;
        }
        // อัพเดท Firestore
        if (Object.keys(updateData).length > 0) {
            await admin.firestore().collection('admin-users').doc(userId).update(updateData);
        }
        // บันทึก audit log
        const targetUser = await admin.auth().getUser(userId);
        await admin.firestore().collection('admin-audit-log').add({
            adminId: context.auth.uid,
            adminEmail: context.auth.token.email || 'unknown',
            action: 'update-admin-permissions',
            targetUserId: userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: ((_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.headers['user-agent']) || 'unknown',
            details: {
                targetEmail: targetUser.email,
                updates: updateData,
            },
        });
        // ส่งอีเมลแจ้งเตือน 2 ฝ่าย
        const dashboardUrl = 'https://peace-script-ai.web.app/admin';
        const updaterEmail = context.auth.token.email || 'unknown';
        const timestamp = new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        try {
            // อีเมลถึงผู้ถูกอัพเดทสิทธิ์
            await admin.firestore().collection('mail').add({
                to: targetUser.email,
                from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
                replyTo: 'support@peace-script-ai.web.app',
                message: {
                    subject: '🔄 สิทธิ์ Admin ของคุณถูกอัพเดท - Peace Script AI',
                    html: generateAdminUpdatedEmailHTML({
                        adminEmail: targetUser.email || 'unknown',
                        newRole: role || updateData.role,
                        newPermissions: permissions || updateData.permissions,
                        updatedBy: updaterEmail,
                        timestamp: timestamp,
                        dashboardUrl: dashboardUrl,
                    }),
                    text: generateAdminUpdatedEmailText({
                        adminEmail: targetUser.email || 'unknown',
                        newRole: role || updateData.role,
                        newPermissions: permissions || updateData.permissions,
                        updatedBy: updaterEmail,
                        timestamp: timestamp,
                        dashboardUrl: dashboardUrl,
                    }),
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // อีเมลยืนยันถึงผู้อัพเดทสิทธิ์
            await admin.firestore().collection('mail').add({
                to: updaterEmail,
                from: 'Peace Script AI <noreply@peace-script-ai.web.app>',
                replyTo: 'support@peace-script-ai.web.app',
                message: {
                    subject: '🔄 ยืนยันการอัพเดทสิทธิ์ Admin - Peace Script AI',
                    html: generateAdminConfirmationEmailHTML({
                        granterEmail: updaterEmail,
                        targetEmail: targetUser.email || 'unknown',
                        role: role || updateData.role,
                        action: 'updated',
                        timestamp: timestamp,
                    }),
                    text: generateAdminConfirmationEmailText({
                        granterEmail: updaterEmail,
                        targetEmail: targetUser.email || 'unknown',
                        role: role || updateData.role,
                        action: 'updated',
                        timestamp: timestamp,
                    }),
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`📧 Sent notification emails for admin permissions update`);
        }
        catch (emailError) {
            console.error('Error sending notification emails:', emailError);
        }
        console.log(`✅ Admin permissions updated for user ${userId}`);
        return {
            success: true,
            message: 'Admin permissions updated successfully',
        };
    }
    catch (error) {
        console.error('Error updating admin permissions:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to update admin permissions');
    }
});
//# sourceMappingURL=index.js.map