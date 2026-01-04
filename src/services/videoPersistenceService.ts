/**
 * Video Persistence Service
 *
 * Handles conversion of temporary video URLs to permanent storage
 * Supports both base64 encoding and Firebase Storage upload
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../config/firebase';

interface DownloadVideoOptions {
  maxSizeMB?: number;
  timeout?: number;
}

interface UploadVideoOptions {
  projectId?: string;
  shotId?: string;
  sceneId?: string;
}

/**
 * Download video from URL and convert to base64
 * WARNING: Only use for small videos (< 1MB) due to localStorage size limits
 */
export async function downloadVideoToBase64(
  videoUrl: string,
  options: DownloadVideoOptions = {}
): Promise<string> {
  const { maxSizeMB = 5, timeout = 60000 } = options;

  try {
    console.log('📥 Downloading video from URL:', videoUrl.substring(0, 100) + '...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(videoUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const sizeMB = blob.size / (1024 * 1024);

    console.log(`📦 Video size: ${sizeMB.toFixed(2)} MB`);

    if (sizeMB > maxSizeMB) {
      throw new Error(
        `Video too large (${sizeMB.toFixed(2)} MB). Maximum: ${maxSizeMB} MB. Use Firebase Storage instead.`
      );
    }

    // Convert to base64
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        console.log('✅ Video converted to base64:', base64.substring(0, 100) + '...');
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read video blob'));
      reader.readAsDataURL(blob);
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'AbortError') {
      throw new Error(`Video download timeout (${timeout}ms)`);
    }
    console.error('❌ Failed to download video:', err);
    throw new Error(`Failed to download video: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Upload video to Firebase Storage for permanent storage
 * Returns permanent download URL that never expires
 */
export async function uploadVideoToStorage(
  videoUrl: string,
  options: UploadVideoOptions = {}
): Promise<string> {
  const { projectId, shotId, sceneId } = options;

  try {
    console.log('📤 Uploading video to Firebase Storage...');

    // Download video blob
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const sizeMB = blob.size / (1024 * 1024);
    console.log(`📦 Video size: ${sizeMB.toFixed(2)} MB`);

    // Detect actual content type from response or blob
    const detectedType = response.headers.get('content-type') || blob.type || 'video/mp4';
    const isGif = detectedType.includes('gif') || videoUrl.endsWith('.gif');
    console.log(`📋 Detected content type: ${detectedType} (isGif: ${isGif})`);

    // Get current user ID
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated. Cannot upload video.');
    }

    // Generate storage path with correct extension
    const timestamp = Date.now();
    const extension = isGif ? 'gif' : 'mp4';
    const filename = `video_${timestamp}.${extension}`;
    const storagePath = [
      'videos',
      userId,
      projectId || 'default',
      sceneId || 'scenes',
      shotId || 'shots',
      filename,
    ].join('/');

    console.log('📁 Storage path:', storagePath);

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: detectedType, // Use detected content type instead of hardcoded 'video/mp4'
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalUrl: videoUrl.substring(0, 200),
        originalType: detectedType,
        projectId: projectId || 'unknown',
        sceneId: sceneId || 'unknown',
        shotId: shotId || 'unknown',
      },
    });

    // Get permanent download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Video uploaded successfully:', downloadURL.substring(0, 100) + '...');

    return downloadURL;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('❌ Failed to upload video to storage:', err);
    throw new Error(`Failed to upload video: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Check if URL is temporary (needs conversion)
 */
export function isTemporaryVideoUrl(url: string): boolean {
  if (!url) return false;

  // base64 data URLs are permanent (stored inline)
  if (url.startsWith('data:video/')) {
    return false;
  }

  // Firebase Storage URLs are permanent
  if (url.includes('firebasestorage.googleapis.com')) {
    return false;
  }

  // ComfyUI local URLs are temporary (server dependent)
  if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
    return true;
  }

  // Replicate URLs are temporary (typically expire in 24-48 hours)
  if (url.includes('replicate.delivery') || url.includes('replicate.com')) {
    return true;
  }

  // Google Generative AI URLs are temporary
  if (url.includes('generativelanguage.googleapis.com')) {
    return true;
  }

  // LTX, Hotshot, and other cloud provider URLs are typically temporary
  if (
    url.includes('pbxt.replicate.delivery') ||
    url.includes('cdn.replicate.com') ||
    url.includes('storage.googleapis.com/generative-')
  ) {
    return true;
  }

  // Default: assume temporary if not explicitly permanent
  return true;
}

/**
 * Persist video URL (auto-detect best method)
 * - Small videos (< 1MB): Convert to base64
 * - Large videos: Upload to Firebase Storage
 */
export async function persistVideoUrl(
  videoUrl: string,
  options: UploadVideoOptions & DownloadVideoOptions = {}
): Promise<string> {
  // Already permanent?
  if (!isTemporaryVideoUrl(videoUrl)) {
    console.log('✅ Video URL is already permanent, no conversion needed');
    return videoUrl;
  }

  try {
    console.log('🔄 Converting temporary video URL to permanent storage...');

    // Try Firebase Storage first (recommended for all videos)
    try {
      const permanentUrl = await uploadVideoToStorage(videoUrl, options);
      console.log('✅ Video persisted to Firebase Storage');
      return permanentUrl;
    } catch (storageError) {
      console.warn('⚠️ Firebase Storage upload failed, trying base64 fallback:', storageError);

      // Fallback to base64 for small videos
      const base64 = await downloadVideoToBase64(videoUrl, options);
      console.log('✅ Video persisted as base64');
      return base64;
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('❌ Failed to persist video URL:', err);

    // Return original URL as last resort (will expire eventually)
    console.warn('⚠️ Returning original temporary URL (may expire later)');
    return videoUrl;
  }
}

/**
 * Validate video URL and check if accessible
 */
export async function validateVideoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get video metadata (size, duration, codec)
 */
export async function getVideoMetadata(
  url: string
): Promise<{ size: number; duration?: number; type?: string }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    return {
      size: contentLength ? parseInt(contentLength, 10) : 0,
      type: contentType || undefined,
    };
  } catch (error) {
    console.error('Failed to get video metadata:', error);
    return { size: 0 };
  }
}
