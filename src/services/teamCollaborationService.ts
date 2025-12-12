/**
 * Team Collaboration Service
 * จัดการการเชิญทีมงาน, การแชร์โปรเจ็ค, และ permissions
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
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface ProjectCollaborator {
  userId: string;
  email: string;
  name: string;
  role: CollaboratorRole;
  addedAt: Date;
  addedBy: string; // userId of person who added them
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectTitle: string;
  inviterUserId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeName?: string; // from TeamMember
  role: CollaboratorRole;
  status: InvitationStatus;
  createdAt: Date;
  respondedAt?: Date;
  message?: string;
}

export interface ProjectAccess {
  projectId: string;
  userId: string;
  role: CollaboratorRole;
  grantedAt: Date;
  grantedBy: string;
}

class TeamCollaborationService {
  /**
   * ส่งคำเชิญเข้าร่วมโปรเจ็ค
   */
  async inviteCollaborator(
    projectId: string,
    projectTitle: string,
    inviterUserId: string,
    inviterName: string,
    inviterEmail: string,
    inviteeEmail: string,
    inviteeName: string,
    role: CollaboratorRole = 'editor',
    message?: string
  ): Promise<ProjectInvitation> {
    try {
      console.log('📧 Sending invitation...');
      console.log('Project:', projectId, projectTitle);
      console.log('From:', inviterName, inviterEmail);
      console.log('To:', inviteeName, inviteeEmail);
      console.log('Role:', role);

      // สร้าง invitation document
      const invitationId = `${projectId}_${inviteeEmail}_${Date.now()}`;
      const invitation: ProjectInvitation = {
        id: invitationId,
        projectId,
        projectTitle,
        inviterUserId,
        inviterName,
        inviterEmail,
        inviteeEmail,
        inviteeName,
        role,
        status: 'pending',
        createdAt: new Date(),
        message,
      };

      // บันทึกใน Firestore
      await setDoc(doc(db, 'projectInvitations', invitationId), {
        ...invitation,
        createdAt: Timestamp.fromDate(invitation.createdAt),
      });

      console.log('✅ Invitation saved to Firestore:', invitationId);

      // TODO: ส่งอีเมลแจ้งเตือน (Phase 2)
      // await this.sendInvitationEmail(invitation);

      return invitation;
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      throw error;
    }
  }

  /**
   * รับคำเชิญ
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      console.log('✅ Accepting invitation:', invitationId);

      const invitationRef = doc(db, 'projectInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invitation = invitationDoc.data() as ProjectInvitation;

      // อัพเดทสถานะ invitation
      await updateDoc(invitationRef, {
        status: 'accepted',
        respondedAt: Timestamp.now(),
      });

      // เพิ่ม collaborator เข้าโปรเจ็ค
      await this.addCollaboratorToProject(
        invitation.projectId,
        userId,
        invitation.inviteeEmail,
        invitation.inviteeName || 'Unknown',
        invitation.role,
        invitation.inviterUserId
      );

      console.log('✅ Invitation accepted successfully');
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * ปฏิเสธคำเชิญ
   */
  async rejectInvitation(invitationId: string): Promise<void> {
    try {
      console.log('❌ Rejecting invitation:', invitationId);

      const invitationRef = doc(db, 'projectInvitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'rejected',
        respondedAt: Timestamp.now(),
      });

      console.log('✅ Invitation rejected');
    } catch (error) {
      console.error('❌ Error rejecting invitation:', error);
      throw error;
    }
  }

  /**
   * เพิ่ม collaborator เข้าโปรเจ็ค
   */
  private async addCollaboratorToProject(
    projectId: string,
    userId: string,
    email: string,
    name: string,
    role: CollaboratorRole,
    addedBy: string
  ): Promise<void> {
    try {
      const collaborator: ProjectCollaborator = {
        userId,
        email,
        name,
        role,
        addedAt: new Date(),
        addedBy,
      };

      // บันทึกใน projectCollaborators subcollection
      const collaboratorRef = doc(
        db,
        'projects',
        projectId,
        'collaborators',
        userId
      );

      await setDoc(collaboratorRef, {
        ...collaborator,
        addedAt: Timestamp.fromDate(collaborator.addedAt),
      });

      // เพิ่ม projectId ใน user's sharedProjects
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        sharedProjects: arrayUnion(projectId),
      });

      console.log('✅ Collaborator added to project:', userId);
    } catch (error) {
      console.error('❌ Error adding collaborator:', error);
      throw error;
    }
  }

  /**
   * ลบ collaborator ออกจากโปรเจ็ค
   */
  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    try {
      console.log('🗑️ Removing collaborator:', userId, 'from project:', projectId);

      // ลบจาก collaborators subcollection
      const collaboratorRef = doc(
        db,
        'projects',
        projectId,
        'collaborators',
        userId
      );
      await deleteDoc(collaboratorRef);

      // ลบ projectId จาก user's sharedProjects
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        sharedProjects: arrayRemove(projectId),
      });

      console.log('✅ Collaborator removed');
    } catch (error) {
      console.error('❌ Error removing collaborator:', error);
      throw error;
    }
  }

  /**
   * ดึงรายการ collaborators ทั้งหมดของโปรเจ็ค
   */
  async getProjectCollaborators(
    projectId: string
  ): Promise<ProjectCollaborator[]> {
    try {
      const collaboratorsRef = collection(
        db,
        'projects',
        projectId,
        'collaborators'
      );
      const snapshot = await getDocs(collaboratorsRef);

      const collaborators: ProjectCollaborator[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          addedAt: data.addedAt?.toDate() || new Date(),
        } as ProjectCollaborator;
      });

      console.log('📋 Loaded collaborators:', collaborators.length);
      return collaborators;
    } catch (error) {
      console.error('❌ Error loading collaborators:', error);
      return [];
    }
  }

  /**
   * ตรวจสอบว่า user มีสิทธิ์เข้าถึงโปรเจ็คหรือไม่
   */
  async checkProjectAccess(
    projectId: string,
    userId: string
  ): Promise<{ hasAccess: boolean; role?: CollaboratorRole }> {
    try {
      // ตรวจสอบว่าเป็น owner
      const projectRef = doc(db, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);

      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        if (projectData.userId === userId) {
          return { hasAccess: true, role: 'owner' };
        }
      }

      // ตรวจสอบว่าเป็น collaborator
      const collaboratorRef = doc(
        db,
        'projects',
        projectId,
        'collaborators',
        userId
      );
      const collaboratorDoc = await getDoc(collaboratorRef);

      if (collaboratorDoc.exists()) {
        const data = collaboratorDoc.data() as ProjectCollaborator;
        return { hasAccess: true, role: data.role };
      }

      return { hasAccess: false };
    } catch (error) {
      console.error('❌ Error checking access:', error);
      return { hasAccess: false };
    }
  }

  /**
   * ดึงรายการ invitations ที่รอการตอบรับ (สำหรับ user)
   */
  async getPendingInvitations(userEmail: string): Promise<ProjectInvitation[]> {
    try {
      const invitationsRef = collection(db, 'projectInvitations');
      const q = query(
        invitationsRef,
        where('inviteeEmail', '==', userEmail),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);

      const invitations: ProjectInvitation[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          respondedAt: data.respondedAt?.toDate(),
        } as ProjectInvitation;
      });

      console.log('📨 Pending invitations:', invitations.length);
      return invitations;
    } catch (error) {
      console.error('❌ Error loading pending invitations:', error);
      return [];
    }
  }

  /**
   * ดึงรายการโปรเจ็คที่ user ถูกแชร์ให้
   */
  async getSharedProjects(userId: string): Promise<string[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.sharedProjects || [];
      }

      return [];
    } catch (error) {
      console.error('❌ Error loading shared projects:', error);
      return [];
    }
  }

  /**
   * อัพเดท role ของ collaborator
   */
  async updateCollaboratorRole(
    projectId: string,
    userId: string,
    newRole: CollaboratorRole
  ): Promise<void> {
    try {
      const collaboratorRef = doc(
        db,
        'projects',
        projectId,
        'collaborators',
        userId
      );

      await updateDoc(collaboratorRef, {
        role: newRole,
      });

      console.log('✅ Collaborator role updated:', userId, '→', newRole);
    } catch (error) {
      console.error('❌ Error updating collaborator role:', error);
      throw error;
    }
  }
}

export const teamCollaborationService = new TeamCollaborationService();
export default teamCollaborationService;
