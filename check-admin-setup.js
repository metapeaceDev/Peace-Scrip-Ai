// ตรวจสอบการตั้งค่า admin
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkSetup() {
  try {
    // ตรวจสอบ user
    const email = 'metapeaceofficial@gmail.com';
    const user = await admin.auth().getUserByEmail(email);
    
    console.log('📧 User found:', user.email);
    console.log('🆔 UID:', user.uid);
    console.log('🔐 Custom Claims:', user.customClaims || 'None');
    
    // ตรวจสอบ admin-users collection
    const adminDoc = await admin.firestore().collection('admin-users').doc(user.uid).get();
    if (adminDoc.exists) {
      console.log('👤 Admin record:', adminDoc.data());
    } else {
      console.log('⚠️ No admin record in Firestore');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkSetup();
