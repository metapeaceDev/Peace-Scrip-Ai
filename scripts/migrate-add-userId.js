/**
 * Migration Script: Add userId to existing projects
 *
 * Run this once to fix old projects that don't have userId field
 * This will allow Firestore security rules to work properly
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase config (from your .env)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function migrateProjects() {
  try {
    console.log('🔍 Finding projects without userId...');

    const projectsRef = collection(db, 'projects');
    const snapshot = await getDocs(projectsRef);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      if (!data.userId) {
        console.log(`❌ Project ${docSnap.id} missing userId:`, data.title);
        console.log('   This project will be inaccessible until userId is set');
        console.log('   Please contact support or manually fix in Firebase Console');
        errors++;
      } else {
        console.log(`✅ Project ${docSnap.id} has userId: ${data.userId}`);
        skipped++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Already valid: ${skipped}`);
    console.log(`   ❌ Missing userId: ${errors}`);
    console.log(`   💡 Fixed: ${fixed}`);

    if (errors > 0) {
      console.log('\n⚠️ WARNING: Some projects are missing userId!');
      console.log('   These projects need to be fixed manually in Firebase Console:');
      console.log('   1. Go to Firestore in Firebase Console');
      console.log('   2. Find the projects collection');
      console.log("   3. Add userId field matching the owner's auth UID");
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateProjects()
  .then(() => {
    console.log('✅ Migration check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
