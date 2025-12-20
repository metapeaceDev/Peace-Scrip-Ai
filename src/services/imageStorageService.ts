/**
 * Image Storage Service
 * Handles uploading images to Firebase Storage and generating URLs
 * Replaces base64 storage to avoid Firestore 1MB limit
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

class ImageStorageService {
  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string): Blob {
    // Extract base64 data and mime type
    const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Decode base64
    const byteString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    return new Blob([arrayBuffer], { type: mimeType });
  }

  /**
   * Upload poster image to Firebase Storage
   * @param base64Image Base64 encoded image
   * @param projectId Project ID
   * @param userId User ID
   * @returns Download URL
   */
  async uploadPosterImage(base64Image: string, projectId: string, userId: string): Promise<string> {
    try {
      console.log('📤 Uploading poster image to Storage...');

      // Convert base64 to Blob
      const blob = this.base64ToBlob(base64Image);
      const sizeKB = (blob.size / 1024).toFixed(2);
      console.log(`📊 Image size: ${sizeKB} KB`);

      // Create storage reference
      const filename = `poster_${Date.now()}.png`;
      const storageRef = ref(storage, `posters/${userId}/${projectId}/${filename}`);

      // Upload
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: blob.type,
        customMetadata: {
          projectId,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ Poster uploaded:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading poster:', error);
      throw new Error('Failed to upload poster image');
    }
  }

  /**
   * Upload character image to Firebase Storage
   * @param base64Image Base64 encoded image
   * @param characterId Character ID
   * @param projectId Project ID
   * @param userId User ID
   * @returns Download URL
   */
  async uploadCharacterImage(
    base64Image: string,
    characterId: string,
    projectId: string,
    userId: string
  ): Promise<string> {
    try {
      console.log('📤 Uploading character image to Storage...');

      const blob = this.base64ToBlob(base64Image);
      const sizeKB = (blob.size / 1024).toFixed(2);
      console.log(`📊 Image size: ${sizeKB} KB`);

      const filename = `char_${characterId}_${Date.now()}.png`;
      const storageRef = ref(storage, `characters/${userId}/${projectId}/${filename}`);

      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: blob.type,
        customMetadata: {
          characterId,
          projectId,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ Character image uploaded:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading character image:', error);
      throw new Error('Failed to upload character image');
    }
  }

  /**
   * Upload storyboard image to Firebase Storage
   * @param base64Image Base64 encoded image
   * @param sceneId Scene ID
   * @param projectId Project ID
   * @param userId User ID
   * @returns Download URL
   */
  async uploadStoryboardImage(
    base64Image: string,
    sceneId: string,
    projectId: string,
    userId: string
  ): Promise<string> {
    try {
      console.log('📤 Uploading storyboard image to Storage...');

      const blob = this.base64ToBlob(base64Image);
      const sizeKB = (blob.size / 1024).toFixed(2);
      console.log(`📊 Image size: ${sizeKB} KB`);

      const filename = `storyboard_${sceneId}_${Date.now()}.png`;
      const storageRef = ref(storage, `storyboards/${userId}/${projectId}/${filename}`);

      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: blob.type,
        customMetadata: {
          sceneId,
          projectId,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ Storyboard image uploaded:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading storyboard image:', error);
      throw new Error('Failed to upload storyboard image');
    }
  }

  /**
   * Delete image from Firebase Storage
   * @param imageUrl Full download URL
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract path from URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (!pathMatch) {
        throw new Error('Invalid image URL format');
      }

      const path = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, path);

      await deleteObject(storageRef);
      console.log('✅ Image deleted from Storage');
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Create thumbnail from base64 image
   * @param base64Image Original base64 image
   * @param maxWidth Maximum width (default 300px)
   * @param maxHeight Maximum height (default 400px)
   * @returns Thumbnail as base64
   */
  async createThumbnail(
    base64Image: string,
    maxWidth: number = 300,
    maxHeight: number = 400
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 (compressed)
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64Image;
    });
  }
}

export const imageStorageService = new ImageStorageService();
export default imageStorageService;

