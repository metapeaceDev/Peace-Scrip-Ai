/**
 * Firebase Admin Configuration
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let initialized = false;

export async function initializeFirebase() {
  if (initialized) {
    console.log('ℹ️  Firebase Admin already initialized');
    return;
  }

  try {
    // Method 1: Use service account JSON file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = JSON.parse(
        readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      console.log('✅ Firebase Admin initialized with service account');
    }
    // Method 2: Use environment variables
    else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      console.log('✅ Firebase Admin initialized with environment variables');
    }
    // Method 3: Application Default Credentials (for Cloud Run/GKE)
    else {
      admin.initializeApp();
      console.log('✅ Firebase Admin initialized with default credentials');
    }

    initialized = true;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

/**
 * Get Firestore instance
 */
export function getFirestore() {
  if (!initialized) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return admin.firestore();
}

/**
 * Get Storage instance
 */
export function getStorage() {
  if (!initialized) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return admin.storage();
}

/**
 * Get Auth instance
 */
export function getAuth() {
  if (!initialized) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return admin.auth();
}

export default admin;
