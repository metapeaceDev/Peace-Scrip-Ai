/**
 * Firebase Service
 * 
 * Handles job storage and retrieval from Firestore
 */

import { getFirestore, getStorage } from '../config/firebase.js';
import crypto from 'crypto';

const COLLECTION_NAME = 'comfyui_jobs';

function normalizeBucketName(bucketName) {
  if (!bucketName) return null;
  let name = String(bucketName).trim();
  if (!name) return null;
  name = name.replace(/^gs:\/\//, '');
  name = name.replace(/\/$/, '');
  return name || null;
}

let cachedBucketPromise = null;

async function getBucket() {
  if (cachedBucketPromise) return cachedBucketPromise;

  cachedBucketPromise = (async () => {
    const storage = getStorage();

    // Prefer explicit bucket.
    const explicit = normalizeBucketName(process.env.FIREBASE_STORAGE_BUCKET);
    if (explicit) {
      const explicitBucket = storage.bucket(explicit);

      // If validation is enabled, verify it exists; otherwise return as-is.
      const validate = String(process.env.FIREBASE_STORAGE_VALIDATE_BUCKET || '').toLowerCase();
      if (validate === 'false') {
        return explicitBucket;
      }

      try {
        const [exists] = await explicitBucket.exists();
        if (exists) {
          console.log(`✅ Using Firebase Storage bucket: ${explicitBucket.name}`);
          return explicitBucket;
        }
      } catch {
        // ignore and try fallbacks
      }

      // Common mismatch: projects now often use *.firebasestorage.app instead of *.appspot.com
      const fallbacks = [];
      if (explicit.endsWith('.appspot.com')) {
        fallbacks.push(explicit.replace(/\.appspot\.com$/, '.firebasestorage.app'));
      }
      if (explicit.endsWith('.firebasestorage.app')) {
        fallbacks.push(explicit.replace(/\.firebasestorage\.app$/, '.appspot.com'));
      }

      for (const candidate of fallbacks) {
        try {
          const bucket = storage.bucket(candidate);
          const [exists] = await bucket.exists();
          if (exists) {
            console.warn(
              `⚠️ FIREBASE_STORAGE_BUCKET="${explicit}" not found; using "${bucket.name}" instead.`
            );
            return bucket;
          }
        } catch {
          // ignore
        }
      }

      // If we got here, the explicit bucket isn't usable; fall through to projectId-based detection.
      console.warn(
        `⚠️ Firebase Storage bucket not found: "${explicit}". Trying to auto-detect bucket name...`
      );
    }

    // Try common Firebase default bucket names for the project.
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT;

    if (projectId) {
      const candidates = [`${projectId}.appspot.com`, `${projectId}.firebasestorage.app`];
      for (const candidate of candidates) {
        try {
          const bucket = storage.bucket(candidate);
          const [exists] = await bucket.exists();
          if (exists) {
            console.log(`✅ Using Firebase Storage bucket: ${bucket.name}`);
            return bucket;
          }
        } catch {
          // ignore and try next candidate
        }
      }
    }

    // Fallback to whatever firebase-admin considers default.
    const bucket = storage.bucket();
    console.log(`ℹ️  Using default Firebase Storage bucket: ${bucket.name}`);
    return bucket;
  })();

  return cachedBucketPromise;
}

function shouldMakePublic() {
  return String(process.env.FIREBASE_STORAGE_MAKE_PUBLIC || '').toLowerCase() === 'true';
}

function getUrlMode() {
  const mode = String(process.env.FIREBASE_STORAGE_URL_MODE || '').trim().toLowerCase();
  if (mode === 'public' || mode === 'signed' || mode === 'token') return mode;
  // Back-compat: if MAKE_PUBLIC=true, treat as public, else signed.
  return shouldMakePublic() ? 'public' : 'signed';
}

function getSignedUrlTtlMs() {
  const hoursRaw = process.env.FIREBASE_SIGNED_URL_TTL_HOURS;
  const hours = hoursRaw ? Number(hoursRaw) : 168; // default 7 days
  if (!Number.isFinite(hours) || hours <= 0) return 168 * 60 * 60 * 1000;
  return Math.floor(hours * 60 * 60 * 1000);
}

async function ensureBucketExists(bucket) {
  const validate = String(process.env.FIREBASE_STORAGE_VALIDATE_BUCKET || '').toLowerCase();
  if (validate === 'false') return;
  const [exists] = await bucket.exists();
  if (!exists) {
    throw new Error(
      `Firebase Storage bucket not found: "${bucket.name}". ` +
        `Set FIREBASE_STORAGE_BUCKET to the exact bucket name (e.g. <project-id>.appspot.com or <project-id>.firebasestorage.app) and ensure Storage is enabled in Firebase Console.`
    );
  }
}

async function getOrCreateFirebaseDownloadToken(file) {
  // Firebase-style token URL (non-expiring) via metadata.firebaseStorageDownloadTokens
  // If token already exists, reuse it to keep URLs stable.
  try {
    const [meta] = await file.getMetadata();
    const existing = meta?.metadata?.firebaseStorageDownloadTokens;
    if (existing) {
      // Can be a comma-separated list. Use the first.
      return String(existing).split(',')[0];
    }
  } catch {
    // ignore
  }

  const token = crypto.randomUUID();
  await file.setMetadata({
    metadata: {
      firebaseStorageDownloadTokens: token
    }
  });
  return token;
}

function getFirebaseTokenUrl(bucketName, objectPath, token) {
  // Firebase download URL format (works even with private buckets; access is via token).
  // Note: objectPath must be URL-encoded with '/' encoded as %2F.
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

async function getFileUrl(file, bucketName, filename) {
  const mode = getUrlMode();

  if (mode === 'public') {
    // Permanent public URL (requires object ACLs; may FAIL on UBLA).
    try {
      await file.makePublic();
      return `https://storage.googleapis.com/${bucketName}/${filename}`;
    } catch (err) {
      console.warn(
        `⚠️ makePublic() failed for ${filename} (likely UBLA enabled). Falling back to token URL.`,
        err?.message || err
      );
      const token = await getOrCreateFirebaseDownloadToken(file);
      return getFirebaseTokenUrl(bucketName, filename, token);
    }
  }

  if (mode === 'token') {
    const token = await getOrCreateFirebaseDownloadToken(file);
    return getFirebaseTokenUrl(bucketName, filename, token);
  }

  // mode === 'signed' (default)
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + getSignedUrlTtlMs()
  });
  return signedUrl;
}

/**
 * Save job to Firestore
 */
export async function saveJobToFirebase(jobId, jobData) {
  try {
    const db = getFirestore();
    
    await db.collection(COLLECTION_NAME).doc(jobId).set({
      ...jobData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`💾 Job ${jobId} saved to Firebase`);
    
  } catch (error) {
    console.error(`❌ Failed to save job ${jobId} to Firebase:`, error);
    // Don't throw - job can continue without Firebase storage
  }
}

/**
 * Update job status in Firestore
 */
export async function updateJobStatus(jobId, status, additionalData = {}) {
  try {
    const db = getFirestore();
    
    // Remove undefined values from additionalData
    const cleanData = Object.entries(additionalData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    await db.collection(COLLECTION_NAME).doc(jobId).update({
      status,
      ...cleanData,
      updatedAt: new Date()
    });

    console.log(`📝 Job ${jobId} updated: ${status}`);
    
  } catch (error) {
    console.error(`❌ Failed to update job ${jobId}:`, error);
  }
}

/**
 * Get job from Firestore
 */
export async function getJobFromFirebase(jobId) {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION_NAME).doc(jobId).get();
    
    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    };
    
  } catch (error) {
    console.error(`❌ Failed to get job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Get user's jobs from Firestore
 */
export async function getUserJobs(userId, limit = 50) {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error(`❌ Failed to get user jobs:`, error);
    throw error;
  }
}

/**
 * Save generated image to Firebase Storage
 */
export async function saveImageToStorage(imageData, userId, jobId) {
  try {
    const bucket = await getBucket();
    await ensureBucketExists(bucket);
    
    // Remove data:image/...;base64, prefix
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = `comfyui-images/${userId}/${jobId}.png`;
    const file = bucket.file(filename);
    
    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          userId,
          jobId,
          generatedAt: new Date().toISOString()
        }
      }
    });

    const url = await getFileUrl(file, bucket.name, filename);

    console.log(`💾 Image saved to Storage: ${url}`);

    return url;
    
  } catch (error) {
    console.error('❌ Failed to save image to Storage:', error);
    throw error;
  }
}

/**
 * Save generated video to Firebase Storage
 */
export async function saveVideoToStorage(videoData, userId, jobId) {
  try {
    console.log('🔍 DEBUG saveVideoToStorage input:', {
      videoDataType: typeof videoData,
      isBuffer: Buffer.isBuffer(videoData),
      isUndefined: videoData === undefined,
      isNull: videoData === null,
      length: videoData?.length,
      userId,
      jobId
    });
    
    const bucket = await getBucket();
    await ensureBucketExists(bucket);
    
    // Remove data:video/...;base64, prefix if present
    let buffer;
    if (typeof videoData === 'string') {
      const base64Data = videoData.replace(/^data:video\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = videoData; // Already a buffer
    }
    
    const filename = `comfyui-videos/${userId}/${jobId}.mp4`;
    const file = bucket.file(filename);
    
    await file.save(buffer, {
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          userId,
          jobId,
          generatedAt: new Date().toISOString()
        }
      }
    });

    const url = await getFileUrl(file, bucket.name, filename);

    console.log(`💾 Video saved to Storage: ${url}`);

    return url;
    
  } catch (error) {
    console.error('❌ Failed to save video to Storage:', error);
    throw error;
  }
}

export default {
  saveJobToFirebase,
  updateJobStatus,
  getJobFromFirebase,
  getUserJobs,
  saveImageToStorage,
  saveVideoToStorage
};
