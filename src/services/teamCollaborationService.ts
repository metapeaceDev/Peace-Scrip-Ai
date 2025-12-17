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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TeamMemberPermissions } from '../../types';

export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

// Role permission definitions
export const ROLE_PERMISSIONS: Record<CollaboratorRole, TeamMemberPermissions> = {
  owner: {
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canManageTeam: true,
    canExport: true,
    canManagePayments: true,
    canViewAnalytics: true,
  },
  admin: {
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canManageTeam: true,
    canExport: true,
    canManagePayments: true,
    canViewAnalytics: true,
  },
  editor: {
    canEdit: true,
    canDelete: false,
    canInvite: false,
    canManageTeam: false,
    canExport: true,
    canManagePayments: false,
    canViewAnalytics: true,
  },
  viewer: {
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canManageTeam: false,
    canExport: false,
    canManagePayments: false,
    canViewAnalytics: false,
  },
};

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

      // สร้าง notification สำหรับ invitee
      await this.createInvitationNotification(invitation);

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
      const collaboratorRef = doc(db, 'projects', projectId, 'collaborators', userId);

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
      const collaboratorRef = doc(db, 'projects', projectId, 'collaborators', userId);
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
  async getProjectCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
    try {
      const collaboratorsRef = collection(db, 'projects', projectId, 'collaborators');
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
      const collaboratorRef = doc(db, 'projects', projectId, 'collaborators', userId);
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
      const collaboratorRef = doc(db, 'projects', projectId, 'collaborators', userId);

      await updateDoc(collaboratorRef, {
        role: newRole,
      });

      console.log('✅ Collaborator role updated:', userId, '→', newRole);
    } catch (error) {
      console.error('❌ Error updating collaborator role:', error);
      throw error;
    }
  }

  /**
   * สร้าง notification สำหรับ invitee
   */
  private async createInvitationNotification(invitation: ProjectInvitation): Promise<void> {
    try {
      // สร้าง notification document
      const notificationId = `${invitation.id}_notification`;
      const notification = {
        id: notificationId,
        type: 'project_invitation',
        recipientEmail: invitation.inviteeEmail,
        title: `คำเชิญเข้าร่วมโปรเจ็ค: ${invitation.projectTitle}`,
        message: `${invitation.inviterName} เชิญคุณเข้าร่วมโปรเจ็ค "${invitation.projectTitle}" ในฐานะ ${invitation.role}`,
        invitationId: invitation.id,
        projectId: invitation.projectId,
        read: false,
        createdAt: Timestamp.now(),
      };

      // บันทึก notification
      await setDoc(doc(db, 'notifications', notificationId), notification);

      console.log('✅ Notification created for:', invitation.inviteeEmail);

      // ส่งอีเมลแจ้งเตือน
      await this.sendInvitationEmail(invitation);
    } catch (error) {
      console.error('⚠️ Warning: Could not create notification:', error);
      // ไม่ throw error เพราะ notification เป็นส่วนเสริม
    }
  }

  /**
   * ส่งอีเมลเชิญเข้าทีม
   */
  private async sendInvitationEmail(invitation: ProjectInvitation): Promise<void> {
    try {
      const { sendEmail, createTeamInvitationEmail } = await import('./emailService');

      // สร้าง invitation link
      const appUrl = import.meta.env.VITE_APP_URL || 'https://peace-script-ai.web.app';
      const invitationLink = `${appUrl}/invitations/${invitation.id}`;

      // สร้าง email template
      const emailTemplate = createTeamInvitationEmail({
        inviterName: invitation.inviterName,
        projectTitle: invitation.projectTitle,
        role: invitation.role,
        invitationLink,
      });

      // ส่งอีเมล
      const success = await sendEmail({
        to: invitation.inviteeEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      if (success) {
        console.log(`📧 Invitation email sent to: ${invitation.inviteeEmail}`);
      } else {
        console.warn(`⚠️ Failed to send invitation email to: ${invitation.inviteeEmail}`);
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
      // ไม่ throw error - email เป็น optional feature
    }
  }

  /**
   * อัพเดท role ของสมาชิกในทีม
   */
  async updateMemberRole(
    projectId: string,
    memberEmail: string,
    newRole: CollaboratorRole,
    updatedBy: string
  ): Promise<void> {
    try {
      console.log('🔄 Updating member role...');
      console.log('Project:', projectId);
      console.log('Member:', memberEmail);
      console.log('New Role:', newRole);
      console.log('Updated by:', updatedBy);

      // หา userId จาก email ก่อน
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', memberEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error('❌ User not found with email:', memberEmail);
        throw new Error('User not found');
      }

      const userId = querySnapshot.docs[0].id;
      console.log('✅ Found userId:', userId);

      // อัพเดทใน subcollection (วิธีที่ถูกต้อง)
      const collaboratorRef = doc(db, 'projects', projectId, 'collaborators', userId);

      // ตรวจสอบว่า document มีอยู่จริง
      const collaboratorDoc = await getDoc(collaboratorRef);
      if (!collaboratorDoc.exists()) {
        console.error('❌ Collaborator not found in subcollection:', userId);
        throw new Error('Collaborator not found in project');
      }

      await updateDoc(collaboratorRef, {
        role: newRole,
        updatedAt: Timestamp.now(),
        updatedBy: updatedBy,
      });

      console.log('✅ Member role updated successfully in subcollection');

      // อัพเดทใน top-level collection ด้วย (ถ้ามี - legacy support)
      const legacyCollaboratorId = `${projectId}_${memberEmail}`;
      const legacyCollaboratorRef = doc(db, 'collaborators', legacyCollaboratorId);
      const legacyDoc = await getDoc(legacyCollaboratorRef);

      if (legacyDoc.exists()) {
        await updateDoc(legacyCollaboratorRef, {
          role: newRole,
          updatedAt: Timestamp.now(),
          updatedBy: updatedBy,
        });
        console.log('✅ Legacy collaborator record also updated');
      }

      console.log('✅ Member role updated successfully in Firestore');
    } catch (error) {
      console.error('❌ Error updating member role:', error);
      throw error;
    }
  }

  /**
   * สร้าง notification สำหรับ user
   */
  async createNotification(
    userId: string,
    type: 'role_changed' | 'project_updated' | 'invitation',
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        read: false,
        createdAt: Timestamp.now(),
      });
      console.log('✅ Notification created for user:', userId);
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบ permission ของ user สำหรับ action ที่ต้องการทำ
   */
  async checkPermission(
    projectId: string,
    userId: string,
    permission: keyof TeamMemberPermissions
  ): Promise<boolean> {
    try {
      // ดึงข้อมูล collaborator
      const collaborator = await this.getCollaboratorRole(projectId, userId);

      if (!collaborator) {
        return false; // ไม่ใช่สมาชิกของโปรเจ็ค
      }

      // ตรวจสอบ permission จาก role
      const permissions = ROLE_PERMISSIONS[collaborator.role];
      return permissions[permission] || false;
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return false;
    }
  }

  /**
   * ดึงข้อมูล role ของ collaborator
   */
  async getCollaboratorRole(
    projectId: string,
    userIdOrEmail: string
  ): Promise<ProjectCollaborator | null> {
    try {
      // ลองค้นหาโดยใช้ userId ก่อน
      const collaboratorId = `${projectId}_${userIdOrEmail}`;
      const collaboratorDoc = await getDoc(doc(db, 'collaborators', collaboratorId));

      if (!collaboratorDoc.exists()) {
        // ถ้าไม่เจอ ลองค้นหาทุก collaborators ของโปรเจ็คนี้
        const q = query(collection(db, 'collaborators'), where('projectId', '==', projectId));

        const snapshot = await getDocs(q);
        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (data.userId === userIdOrEmail || data.email === userIdOrEmail) {
            return {
              userId: data.userId,
              email: data.email,
              name: data.name,
              role: data.role,
              addedAt: data.addedAt?.toDate() || new Date(),
              addedBy: data.addedBy,
            };
          }
        }
        return null;
      }

      const data = collaboratorDoc.data();
      return {
        userId: data.userId,
        email: data.email,
        name: data.name,
        role: data.role,
        addedAt: data.addedAt?.toDate() || new Date(),
        addedBy: data.addedBy,
      };
    } catch (error) {
      console.error('❌ Error getting collaborator role:', error);
      return null;
    }
  }

  /**
   * ดึง permissions ทั้งหมดสำหรับ role
   */
  getRolePermissions(role: CollaboratorRole): TeamMemberPermissions {
    return ROLE_PERMISSIONS[role];
  }

  /**
   * ตรวจสอบว่า user เป็น owner หรือ admin หรือไม่
   */
  async isAdminOrOwner(projectId: string, userId: string): Promise<boolean> {
    try {
      const collaborator = await this.getCollaboratorRole(projectId, userId);
      return collaborator?.role === 'owner' || collaborator?.role === 'admin';
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time invitation updates
   * ติดตาม invitation แบบ real-time และ callback เมื่อมีการเปลี่ยนแปลง
   */
  subscribeToInvitations(
    userEmail: string,
    callback: (count: number, latestInvitation?: ProjectInvitation) => void
  ): () => void {
    console.log('🔔 Subscribing to invitations for:', userEmail);

    // สร้าง query สำหรับ invitations ของ user
    const q = query(
      collection(db, 'projectInvitations'),
      where('inviteeEmail', '==', userEmail),
      where('status', '==', 'pending')
    );

    // ติดตาม real-time changes
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const invitations: ProjectInvitation[] = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          invitations.push({
            id: doc.id,
            projectId: data.projectId,
            projectTitle: data.projectTitle,
            inviterUserId: data.inviterUserId,
            inviterName: data.inviterName,
            inviterEmail: data.inviterEmail,
            inviteeEmail: data.inviteeEmail,
            inviteeName: data.inviteeName,
            role: data.role,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
            respondedAt: data.respondedAt?.toDate(),
            message: data.message,
          });
        });

        // เรียง invitation ตาม createdAt (ใหม่สุดก่อน)
        invitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const count = invitations.length;
        const latest = invitations[0];

        console.log(`🔔 Real-time update: ${count} pending invitation(s)`);
        if (latest) {
          console.log(`   Latest: ${latest.projectTitle} from ${latest.inviterName}`);
        }

        // Callback with count and latest invitation
        callback(count, latest);
      },
      error => {
        console.error('❌ Error in invitation subscription:', error);
      }
    );

    // Return unsubscribe function
    return unsubscribe;
  }
}

export const teamCollaborationService = new TeamCollaborationService();
export default teamCollaborationService;
