/**
 * Script สำหรับตั้งค่า Super Admin
 * ใช้ Admin SDK โดยตรงเพื่อ bypass ข้อจำกัดของ Cloud Function
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// อ่าน service account key
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync('../serviceAccountKey.json', 'utf8'));
} catch (error) {
  console.error('❌ ไม่พบไฟล์ serviceAccountKey.json');
  console.log('📝 กรุณาดาวน์โหลดจาก Firebase Console:');
  console.log('   Project Settings → Service Accounts → Generate New Private Key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setSuperAdmin() {
  const email = 'metapeaceofficial@gmail.com';
  
  try {
    console.log(`\n🔍 กำลังค้นหา user: ${email}`);
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`✅ พบ user:`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - UID: ${user.uid}`);
    console.log(`   - Custom Claims (เดิม):`, user.customClaims || 'ไม่มี');
    
    // ตั้งค่า custom claims เป็น super-admin
    console.log(`\n🔧 กำลังตั้งค่า Super Admin...`);
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      adminRole: 'super-admin'
    });
    
    // บันทึกลง Firestore
    console.log(`�� กำลังบันทึกลง Firestore...`);
    await admin.firestore().collection('admin-users').doc(user.uid).set({
      email: email,
      role: 'super-admin',
      permissions: {
        canViewAnalytics: true,
        canExportData: true,
        canManageUsers: true,
        canManageSubscriptions: true,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      lastAccess: null,
    }, { merge: true });
    
    // ตรวจสอบอีกครั้ง
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log(`\n✅ อัพเดทสำเร็จ!`);
    console.log(`   - Custom Claims (ใหม่):`, updatedUser.customClaims);
    
    console.log(`\n⚠️  สำคัญ: กรุณา Logout แล้ว Login ใหม่เพื่อให้ Custom Claims มีผล`);
    
  } catch (error) {
    console.error(`\n❌ เกิดข้อผิดพลาด:`, error.message);
  }
  
  process.exit(0);
}

setSuperAdmin();
