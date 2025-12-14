/**
 * Firebase Service
 * 
 * Handles job storage and retrieval from Firestore
 */

import { getFirestore, getStorage } from '../config/firebase.js';

const COLLECTION_NAME = 'comfyui_jobs';

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
    
    await db.collection(COLLECTION_NAME).doc(jobId).update({
      status,
      ...additionalData,
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
    const storage = getStorage();
    const bucket = storage.bucket();
    
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

    // Get public URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    
    console.log(`💾 Image saved to Storage: ${publicUrl}`);
    
    return publicUrl;
    
  } catch (error) {
    console.error('❌ Failed to save image to Storage:', error);
    throw error;
  }
}

export default {
  saveJobToFirebase,
  updateJobStatus,
  getJobFromFirebase,
  getUserJobs,
  saveImageToStorage
};
