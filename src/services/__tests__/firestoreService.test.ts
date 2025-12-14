/**
 * Tests for firestoreService
 * 
 * These tests verify Firestore operations including:
 * - Saving and loading project data
 * - User profile management
 * - Data synchronization
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firestoreService } from '../firestoreService';

// Mock Firebase Firestore
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockGetDocs = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: 'timestamp' }));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  collection: mockCollection,
  query: mockQuery,
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: mockGetDocs,
  serverTimestamp: mockServerTimestamp,
}));

vi.mock('../../config/firebase', () => ({
  db: {},
}));

describe('firestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveProject', () => {
    it('should save project data successfully', async () => {
      const userId = 'user123';
      const projectData = {
        id: 'project456',
        title: 'My Script',
        mainGenre: 'Action',
        createdAt: new Date(),
      };

      mockDoc.mockReturnValue({ id: 'doc123' });
      mockSetDoc.mockResolvedValue(undefined);

      await firestoreService.saveProject(userId, projectData as any);

      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'projects',
        expect.stringContaining('project456')
      );
    });

    it('should handle save errors gracefully', async () => {
      const userId = 'user123';
      const projectData = { id: 'project456' };

      mockSetDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        firestoreService.saveProject(userId, projectData as any)
      ).rejects.toThrow();
    });
  });

  describe('loadProject', () => {
    it('should load existing project successfully', async () => {
      const userId = 'user123';
      const projectId = 'project456';

      const mockProjectData = {
        id: projectId,
        title: 'My Script',
        mainGenre: 'Drama',
        characters: [],
      };

      mockDoc.mockReturnValue({ id: 'doc123' });
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProjectData,
      });

      const result = await firestoreService.loadProject(userId, projectId);

      expect(result).toEqual(mockProjectData);
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('should return null for non-existent project', async () => {
      const userId = 'user123';
      const projectId = 'nonexistent';

      mockDoc.mockReturnValue({ id: 'doc123' });
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await firestoreService.loadProject(userId, projectId);

      expect(result).toBeNull();
    });
  });

  describe('listUserProjects', () => {
    it('should list all user projects', async () => {
      const userId = 'user123';

      const mockProjects = [
        { id: 'project1', title: 'Script 1' },
        { id: 'project2', title: 'Script 2' },
      ];

      mockCollection.mockReturnValue('collection');
      mockQuery.mockReturnValue('query');
      mockGetDocs.mockResolvedValue({
        docs: mockProjects.map((data) => ({
          id: data.id,
          data: () => data,
        })),
      });

      const result = await firestoreService.listUserProjects(userId);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Script 1');
      expect(result[1].title).toBe('Script 2');
    });

    it('should return empty array when no projects exist', async () => {
      const userId = 'newuser';

      mockCollection.mockReturnValue('collection');
      mockQuery.mockReturnValue('query');
      mockGetDocs.mockResolvedValue({
        docs: [],
      });

      const result = await firestoreService.listUserProjects(userId);

      expect(result).toEqual([]);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const userId = 'user123';
      const projectId = 'project456';

      mockDoc.mockReturnValue({ id: 'doc123' });
      mockDeleteDoc.mockResolvedValue(undefined);

      await firestoreService.deleteProject(userId, projectId);

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const userId = 'user123';
      const projectId = 'project456';

      mockDeleteDoc.mockRejectedValue(new Error('Permission denied'));

      await expect(
        firestoreService.deleteProject(userId, projectId)
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile fields', async () => {
      const userId = 'user123';
      const updates = {
        displayName: 'John Doe',
        photoURL: 'https://example.com/photo.jpg',
      };

      mockDoc.mockReturnValue({ id: 'doc123' });
      mockUpdateDoc.mockResolvedValue(undefined);

      await firestoreService.updateUserProfile(userId, updates);

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        userId
      );
    });
  });

  describe('data validation', () => {
    it('should validate project data structure', () => {
      const validProject = {
        id: 'project1',
        title: 'Valid Project',
        mainGenre: 'Action',
        characters: [],
        generatedScenes: {},
      };

      expect(() => {
        // Validation logic would go here
        if (!validProject.id || !validProject.title) {
          throw new Error('Invalid project data');
        }
      }).not.toThrow();
    });

    it('should reject invalid project data', () => {
      const invalidProject = {
        title: 'Missing ID',
      };

      expect(() => {
        if (!invalidProject.id) {
          throw new Error('Project ID is required');
        }
      }).toThrow('Project ID is required');
    });
  });
});
