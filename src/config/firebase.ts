// Firebase Configuration
// Get your config from: https://console.firebase.google.com/

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics is optional and can break initialization in some environments/bundlers.
// Load it lazily only in the browser.
export let analytics: unknown | null = null;
if (typeof window !== 'undefined') {
  // Fire-and-forget: app should not depend on analytics to render.
  import('firebase/analytics')
    .then(async m => {
      // Prefer isSupported() when available.
      if (typeof m.isSupported === 'function') {
        const ok = await m.isSupported().catch(() => false);
        if (!ok) return;
      }
      analytics = m.getAnalytics(app);
    })
    .catch(() => {
      // ignore
    });
}

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
