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
import { db } from '../config/firebase';

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
}

class FirestoreService {
  private readonly PROJECTS_COLLECTION = 'projects';
  private readonly USERS_COLLECTION = 'users';

  /**
   * Create a new project
   */
  async createProject(userId: string, projectData: Partial<ScriptProject>) {
    try {
      const projectRef = doc(collection(db, this.PROJECTS_COLLECTION));
      const project: ScriptProject = {
        id: projectRef.id,
        userId,
        title: projectData.title || 'Untitled Script',
        genre: projectData.genre || '',
        type: projectData.type || 'feature',
        characters: projectData.characters || [],
        scenes: projectData.scenes || [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...projectData
      };

      await setDoc(projectRef, {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        project
      };
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
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
   * Get a single project
   */
  async getProject(projectId: string) {
    try {
      const docRef = doc(db, this.PROJECTS_COLLECTION, projectId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Project not found');
      }

      const data = docSnap.data();
      return {
        success: true,
        project: {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ScriptProject
      };
    } catch (error) {
      console.error('Error getting project:', error);
      throw new Error('Failed to get project');
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, updates: Partial<ScriptProject>) {
    try {
      const docRef = doc(db, this.PROJECTS_COLLECTION, projectId);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Project updated successfully'
      };
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string) {
    try {
      const docRef = doc(db, this.PROJECTS_COLLECTION, projectId);
      await deleteDoc(docRef);

      return {
        success: true,
        message: 'Project deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
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
   * Sync local projects to Firestore
   */
  async syncLocalProjects(userId: string) {
    try {
      const localProjects: { [key: string]: ScriptProject } = {};
      
      // Get all local projects
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('peace_project_')) {
          const data = localStorage.getItem(key);
          if (data) {
            const project = JSON.parse(data);
            localProjects[project.id] = project;
          }
        }
      }

      // Upload to Firestore
      const uploadPromises = Object.values(localProjects).map(async (project) => {
        const docRef = doc(db, this.PROJECTS_COLLECTION, project.id);
        await setDoc(docRef, {
          ...project,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(uploadPromises);

      return {
        success: true,
        synced: Object.keys(localProjects).length
      };
    } catch (error) {
      console.error('Error syncing projects:', error);
      throw new Error('Failed to sync projects');
    }
  }
}

export const firestoreService = new FirestoreService();
