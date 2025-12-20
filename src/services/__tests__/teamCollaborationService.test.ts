import { describe, it, expect, vi, beforeEach } from 'vitest';
import { teamCollaborationService } from '../teamCollaborationService';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('../config/firebase', () => ({
  db: {},
}));

describe('TeamCollaborationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inviteCollaborator', () => {
    it('should create an invitation document in Firestore', async () => {
      const mockInvitation = {
        projectId: 'proj-1',
        projectTitle: 'Test Project',
        inviterUserId: 'user-1',
        inviterName: 'Inviter',
        inviterEmail: 'inviter@test.com',
        inviteeEmail: 'invitee@test.com',
        inviteeName: 'Invitee',
        role: 'editor',
      };

      (doc as any).mockReturnValue('doc-ref');
      (setDoc as any).mockResolvedValue(undefined);

      const result = await teamCollaborationService.inviteCollaborator(
        mockInvitation.projectId,
        mockInvitation.projectTitle,
        mockInvitation.inviterUserId,
        mockInvitation.inviterName,
        mockInvitation.inviterEmail,
        mockInvitation.inviteeEmail,
        mockInvitation.inviteeName,
        mockInvitation.role as any
      );

      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          projectId: mockInvitation.projectId,
          inviteeEmail: mockInvitation.inviteeEmail,
          status: 'pending',
        })
      );
      expect(result).toMatchObject({
        projectId: mockInvitation.projectId,
        status: 'pending',
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and add collaborator to project', async () => {
      const invitationId = 'inv-1';
      const userId = 'user-2';
      const mockInvitationData = {
        projectId: 'proj-1',
        projectTitle: 'Test Project',
        role: 'editor',
        inviterName: 'Inviter',
        inviteeEmail: 'invitee@test.com',
        inviteeName: 'Invitee',
        inviterUserId: 'user-1',
      };

      (doc as any).mockReturnValue('doc-ref');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => mockInvitationData,
      });
      (updateDoc as any).mockResolvedValue(undefined);
      (setDoc as any).mockResolvedValue(undefined);

      await teamCollaborationService.acceptInvitation(invitationId, userId);

      // Verify status update
      expect(updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          status: 'accepted',
        })
      );

      // Verify collaborator added (this checks the private method logic indirectly)
      expect(setDoc).toHaveBeenCalledTimes(2); // Once for collaborator, once for user sharedProjects
    });

    it('should throw error if invitation does not exist', async () => {
      (doc as any).mockReturnValue('doc-ref');
      (getDoc as any).mockResolvedValue({
        exists: () => false,
      });

      await expect(
        teamCollaborationService.acceptInvitation('inv-1', 'user-1')
      ).rejects.toThrow('Invitation not found');
    });
  });

  describe('rejectInvitation', () => {
    it('should update invitation status to rejected', async () => {
      const invitationId = 'inv-1';
      (doc as any).mockReturnValue('doc-ref');
      (updateDoc as any).mockResolvedValue(undefined);

      await teamCollaborationService.rejectInvitation(invitationId);

      expect(updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          status: 'rejected',
        })
      );
    });
  });

  describe('removeCollaborator', () => {
    it('should remove collaborator from project and update user shared projects', async () => {
      const projectId = 'proj-1';
      const userId = 'user-2';
      
      (doc as any).mockReturnValue('doc-ref');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({ email: 'test@test.com', name: 'Test' }),
      });
      (deleteDoc as any).mockResolvedValue(undefined);
      (setDoc as any).mockResolvedValue(undefined);

      await teamCollaborationService.removeCollaborator(projectId, userId);

      expect(deleteDoc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled(); // For removing from sharedProjects
    });
  });
});

