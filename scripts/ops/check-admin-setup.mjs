// ตรวจสอบการตั้งค่า admin
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkSetup() {
  try {
    // ตรวจสอบ user ปัจจุบัน
    const email = 'metapeaceofficial@gmail.com';
    const user = await admin.auth().getUserByEmail(email);
    
    console.log('\n📧 Current User:', user.email);
    console.log('🆔 UID:', user.uid);
    console.log('🔐 Custom Claims:', user.customClaims || 'None');
    
    // ตรวจสอบ admin-users collection
    const adminDoc = await admin.firestore().collection('admin-users').doc(user.uid).get();
    if (adminDoc.exists) {
      console.log('👤 Admin Record:', JSON.stringify(adminDoc.data(), null, 2));
    } else {
      console.log('⚠️  No admin record in Firestore');
    }
    
    // ตรวจสอบว่ามี service account key หรือไม่
    console.log('\n✅ Service account is working');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
  }
  
  process.exit(0);
}

checkSetup();
