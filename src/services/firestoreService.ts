/**
 * Firestore Database Service
 * Replaces MongoDB operations
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject, getBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export interface ScriptProject {
  id: string;
  userId: string;
  title: string;
  genre: string;
  type: string;
  targetAudience?: string;
  tone?: string;
  themes?: string[];
  setting?: string;
  timeframe?: string;
  characters: any[];
  scenes: any[];
  acts?: any[];
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  // Storage-based fields
  storagePath?: string; // Firebase Storage path (not URL)
  fileSize?: number;    // Size in bytes
  posterImage?: string; // Cover image URL
}

class FirestoreService {
  private readonly PROJECTS_COLLECTION = 'projects';
  private readonly USERS_COLLECTION = 'users';

  /**
   * Create a new project (Storage-based)
   */
  async createProject(userId: string, projectData: Partial<ScriptProject>) {
    try {
      const projectRef = doc(collection(db, this.PROJECTS_COLLECTION));
      const projectId = projectRef.id;
      
      console.log('📤 Uploading project data to Storage...');
      
      // Upload full project data to Storage
      const storageRef = ref(storage, `projects/${userId}/${projectId}.json`);
      const jsonString = JSON.stringify(projectData);
      const fileSize = new Blob([jsonString]).size;
      
      console.log(`📊 Project size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      
      await uploadString(storageRef, jsonString, 'raw', {
        contentType: 'application/json'
      });
      
      const storagePath = `projects/${userId}/${projectId}.json`;
      console.log('✅ Upload complete:', storagePath);
      
      // Save metadata to Firestore (DO NOT include posterImage - too large for Firestore)
      const metadata: Partial<ScriptProject> = {
        id: projectId,
        userId,
        title: projectData.title || 'Untitled Script',
        genre: projectData.genre || '',
        type: projectData.type || 'feature',
        status: 'draft',
        storagePath,
        fileSize,
        // posterImage is stored in Storage JSON, not in Firestore metadata
        characters: [],
        scenes: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(projectRef, {
        ...metadata,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Metadata saved to Firestore');

      return {
        success: true,
        project: metadata as ScriptProject
      };
    } catch (error) {
      console.error('❌ Error creating project:', error);
      throw new Error('Failed to create project: ' + (error as Error).message);
    }
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string) {
    try {
      const q = query(
        collection(db, this.PROJECTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const projects: ScriptProject[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        projects.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ScriptProject);
      });

      return {
        success: true,
        projects
      };
    } catch (error) {
      console.error('Error getting projects:', error);
      throw new Error('Failed to get projects');
    }
  }

  /**
   * Get a single project (Storage-based)
   */
  async getProject(projectId: string) {
    try {
      const startTime = performance.now();
      console.log('⏱️ Starting project download...');
      
      // Get metadata from Firestore
      const docRef = doc(db, this.PROJECTS_COLLECTION, projectId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Project not found');
      }

      const metadata = docSnap.data();
      console.log(`⏱️ Metadata fetched in ${(performance.now() - startTime).toFixed(0)}ms`);
      
      if (!metadata.storagePath) {
        // Old format (direct Firestore storage) - return as is
        return {
          success: true,
          project: {
            id: docSnap.id,
            ...metadata,
            createdAt: metadata.createdAt?.toDate() || new Date(),
            updatedAt: metadata.updatedAt?.toDate() || new Date()
          } as ScriptProject
        };
      }
      
      // New format (Storage-based) - download full data
      console.log('📥 Downloading project from Storage...');
      console.log('📂 Storage path:', metadata.storagePath);
      console.log('📊 File size:', (metadata.fileSize / 1024 / 1024).toFixed(2), 'MB');
      
      const downloadStart = performance.now();
      // Download using Firebase SDK with path directly
      const storageRef = ref(storage, metadata.storagePath);
      const bytes = await getBytes(storageRef);
      console.log(`⏱️ Downloaded in ${(performance.now() - downloadStart).toFixed(0)}ms`);
      
      const parseStart = performance.now();
      const text = new TextDecoder().decode(bytes);
      const fullData = JSON.parse(text);
      console.log(`⏱️ Parsed in ${(performance.now() - parseStart).toFixed(0)}ms`);
      console.log(`✅ Total time: ${(performance.now() - startTime).toFixed(0)}ms`);

      return {
        success: true,
        project: {
          ...fullData,
          id: docSnap.id, // Use Firestore ID, not the ID from Storage
          createdAt: metadata.createdAt?.toDate() || new Date(),
          updatedAt: metadata.updatedAt?.toDate() || new Date()
        } as ScriptProject
      };
    } catch (error) {
      console.error('❌ Error getting project:', error);
      throw new Error('Failed to get project: ' + (error as Error).message);
    }
  }

  /**
   * Update a project (Storage-based)
   */
  async updateProject(projectId: string, updates: Partial<ScriptProject>) {
    try {
      console.log('🔍 Updating project:', projectId);
      const docRef = doc(db, this.PROJECTS_COLLECTION, projectId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error('❌ Project document not found in Firestore:', projectId);
        throw new Error('Project not found');
      }
      
      const metadata = docSnap.data();
      console.log('📋 Project metadata:', { storagePath: metadata.storagePath, userId: metadata.userId });
      
      if (!metadata.storagePath) {
        // Old format - update Firestore directly
        await updateDoc(docRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
      } else {
        // New format - update Storage file
        console.log('📤 Updating project in Storage...');
        
        const storageRef = ref(storage, metadata.storagePath);
        const jsonString = JSON.stringify(updates);
        const fileSize = new Blob([jsonString]).size;
        
        await uploadString(storageRef, jsonString, 'raw', {
          contentType: 'application/json'
        });
        
        // Update metadata in Firestore (DO NOT update posterImage - too large)
        await updateDoc(docRef, {
          title: updates.title || metadata.title,
          fileSize,
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Project updated');
      }

      return {
        success: true,
        message: 'Project updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating project:', error);
      throw new Error('Failed to update project: ' + (error as Error).message);
    }
  }

  /**
   * Delete a project (Storage-based)
   */
  async deleteProject(projectId: string) {
    try {
      const docRef = doc(db, this.PROJECTS_COLLECTION, projectId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const metadata = docSnap.data();
        
        // Delete from Storage if it exists
        if (metadata.storagePath) {
          try {
            const storageRef = ref(storage, metadata.storagePath);
            await deleteObject(storageRef);
            console.log('✅ Deleted from Storage');
          } catch (e) {
            console.warn('Storage file not found or already deleted');
          }
        }
      }
      
      // Delete metadata from Firestore
      await deleteDoc(docRef);
      console.log('✅ Deleted from Firestore');

      return {
        success: true,
        message: 'Project deleted successfully'
      };
    } catch (error) {
      console.error('❌ Error deleting project:', error);
      throw new Error('Failed to delete project: ' + (error as Error).message);
    }
  }

  /**
   * Save project to local storage (offline mode)
   */
  saveToLocalStorage(projectId: string, projectData: ScriptProject) {
    try {
      const key = `peace_project_${projectId}`;
      localStorage.setItem(key, JSON.stringify(projectData));
      return { success: true };
    } catch (error) {
      console.error('Error saving to local storage:', error);
      return { success: false };
    }
  }

  /**
   * Get project from local storage
   */
  getFromLocalStorage(projectId: string): ScriptProject | null {
    try {
      const key = `peace_project_${projectId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting from local storage:', error);
      return null;
    }
  }

  /**
   * Sync local projects from IndexedDB to Firestore
   */
  async syncLocalProjects(userId: string) {
    try {
      // Get all projects from IndexedDB
      const localProjects = await this.getAllFromIndexedDB();
      
      if (localProjects.length === 0) {
        console.log('No local projects to sync');
        return { success: true, synced: 0 };
      }

      // Upload to Firestore
      const uploadPromises = localProjects.map(async (project) => {
        try {
          const docRef = doc(db, this.PROJECTS_COLLECTION, project.id);
          await setDoc(docRef, {
            ...project,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log(`Synced project: ${project.title}`);
        } catch (e) {
          console.error(`Failed to sync project ${project.id}:`, e);
        }
      });

      await Promise.all(uploadPromises);

      return {
        success: true,
        synced: localProjects.length
      };
    } catch (error) {
      console.error('Error syncing projects:', error);
      throw new Error('Failed to sync projects');
    }
  }

  /**
   * Get all projects from IndexedDB
   */
  private async getAllFromIndexedDB(): Promise<any[]> {
    try {
      const DB_NAME = 'PeaceScriptDB';
      const DB_VERSION = 1;
      const STORE_NAME = 'projects';

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
          console.error('Failed to open IndexedDB');
          resolve([]);
        };
        
        request.onsuccess = () => {
          const db = request.result;
          
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            console.log('No projects store in IndexedDB');
            resolve([]);
            return;
          }

          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result || []);
          };
          
          getAllRequest.onerror = () => {
            console.error('Failed to get projects from IndexedDB');
            resolve([]);
          };
        };
      });
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
      return [];
    }
  }
}

export const firestoreService = new FirestoreService();
