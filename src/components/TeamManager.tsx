import React, { useState, useEffect } from 'react';
import { ScriptData, TeamMember } from '../../types';
import { TEAM_ROLES } from '../../constants';
import { RevenueManagementPage } from './RevenueManagementPage';
import { teamCollaborationService, CollaboratorRole } from '../services/teamCollaborationService';
import { auth } from '../config/firebase';
import { RoleSelector, RoleBadge } from './RoleManagement';

interface TeamManagerProps {
  scriptData: ScriptData;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  onClose: () => void;
  onSaveProject?: (data: ScriptData) => Promise<boolean>; // Add save callback
}

const TeamManager: React.FC<TeamManagerProps> = ({ scriptData, setScriptData, onClose, onSaveProject }) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState(TEAM_ROLES[0]);
  const [newEmail, setNewEmail] = useState('');
  const [newAccessRole, setNewAccessRole] = useState<CollaboratorRole>('editor'); // New: Access role
  const [showRevenueManagement, setShowRevenueManagement] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null); // Track which member's role is being saved

  useEffect(() => {
    // Auto-hide status message after 5 seconds
    if (inviteStatus.type) {
      const timer = setTimeout(() => {
        setInviteStatus({ type: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [inviteStatus]);

  const handleAddMember = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      setInviteStatus({
        type: 'error',
        message: 'กรุณากรอกชื่อและอีเมล',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setInviteStatus({
        type: 'error',
        message: `❌ รูปแบบอีเมลไม่ถูกต้อง - ต้องมี @ และ domain (เช่น ${newEmail.includes('@') ? newEmail : newEmail + '@gmail.com'})`,
      });
      return;
    }

    setIsInviting(true);
    setInviteStatus({ type: null, message: '' });

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('กรุณาเข้าสู่ระบบก่อน');
      }

      // เพิ่มสมาชิกใน local state ก่อน (แสดงใน UI ทันที)
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: newName,
        role: newRole,
        email: newEmail,
        accessRole: newAccessRole, // เพิ่ม access role
        joinedAt: new Date(),
        invitedBy: currentUser.uid,
      };

      const updatedScriptData = {
        ...scriptData,
        team: [...(scriptData.team || []), newMember],
      };

      console.log('➕ DEBUG: Adding team member:', {
        memberName: newName,
        memberEmail: newEmail,
        memberRole: newRole,
        accessRole: newAccessRole,
        beforeCount: scriptData.team?.length || 0,
        afterCount: updatedScriptData.team.length,
      });

      // อัพเดท state ทันที
      setScriptData(updatedScriptData);

      // บันทึกทันที (CRITICAL: ต้องบันทึกก่อนส่ง invitation)
      if (onSaveProject) {
        console.log('💾 Saving project after adding team member...');
        const saveStartTime = performance.now();
        const saveSuccess = await onSaveProject(updatedScriptData);
        console.log(`✅ Save ${saveSuccess ? 'completed' : 'failed'} in ${(performance.now() - saveStartTime).toFixed(0)}ms`);
        
        if (!saveSuccess) {
          throw new Error('ไม่สามารถบันทึกข้อมูลทีมได้');
        }
      } else {
        console.warn('⚠️ onSaveProject is not provided!');
      }

      // ส่งคำเชิญผ่าน Firestore (ไม่ critical - ถ้าล้มเหลวก็ไม่ต้องลบทีม)
      try {
        await teamCollaborationService.inviteCollaborator(
          scriptData.id || 'temp-project',
          scriptData.title || 'Untitled Project',
          currentUser.uid,
          currentUser.displayName || 'Unknown User',
          currentUser.email || '',
          newEmail,
          newName,
          newAccessRole, // ใช้ access role ที่เลือก
          `คุณได้รับเชิญให้เข้าร่วมโปรเจ็ค "${scriptData.title || 'Untitled Project'}" ในฐานะ ${newRole} (สิทธิ์: ${newAccessRole})`
        );

        setInviteStatus({
          type: 'success',
          message: `✅ เพิ่มทีม ${newName} และส่งคำเชิญไปยัง ${newEmail} เรียบร้อยแล้ว!`,
        });
      } catch (inviteError) {
        console.warn('⚠️ Could not send invitation (but team member was added):', inviteError);
        setInviteStatus({
          type: 'success',
          message: `✅ เพิ่มทีม ${newName} เรียบร้อยแล้ว (คำเชิญจะถูกส่งภายหลัง)`,
        });
      }

      // ล้างฟอร์ม
      // ล้างฟอร์ม
      setNewName('');
      setNewRole(TEAM_ROLES[0]);
      setNewEmail('');
      setNewAccessRole('editor'); // รีเซ็ต access role
    } catch (err) {
      console.error('❌ Error adding member:', err);
      setInviteStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเพิ่มทีม',
      });

      // ลบสมาชิกที่เพิ่มไปชั่วคราว (ถ้า save ล้มเหลว)
      setScriptData(prev => ({
        ...prev,
        team: prev.team.filter(m => m.email !== newEmail),
      }));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      const memberToRemove = scriptData.team.find(m => m.id === id);
      if (!memberToRemove) return;

      // ยืนยันการลบ
      if (!confirm(`ต้องการลบ ${memberToRemove.name} ออกจากทีมหรือไม่?`)) {
        return;
      }

      // ลบจาก local state
      const updatedScriptData = {
        ...scriptData,
        team: scriptData.team.filter(m => m.id !== id),
      };

      console.log('🗑️ DEBUG: Removing team member:', {
        memberName: memberToRemove.name,
        beforeCount: scriptData.team.length,
        afterCount: updatedScriptData.team.length,
        remainingTeam: updatedScriptData.team.map(m => m.name),
      });

      setScriptData(updatedScriptData);

      // บันทึกทันที (save to Firestore/localStorage)
      if (onSaveProject) {
        console.log('💾 Saving project after removing team member...');
        const saveStartTime = performance.now();
        await onSaveProject(updatedScriptData);
        console.log(`✅ Save completed in ${(performance.now() - saveStartTime).toFixed(0)}ms`);
      } else {
        console.warn('⚠️ onSaveProject is not provided!');
      }

      // ยกเลิก invitation ใน Firestore (ถ้ามี)
      if (memberToRemove.email && scriptData.id) {
        try {
          // ค้นหา pending invitation
          const invitations = await teamCollaborationService.getPendingInvitations(memberToRemove.email);
          const projectInvitation = invitations.find(inv => inv.projectId === scriptData.id);
          
          if (projectInvitation) {
            console.log('🗑️ Cancelling invitation:', projectInvitation.id);
            await teamCollaborationService.rejectInvitation(projectInvitation.id);
          }
        } catch (error) {
          console.error('❌ Error cancelling invitation:', error);
        }
      }

      console.log('✅ Member removed from team and saved');
    } catch (error) {
      console.error('❌ Error removing member:', error);
      alert('เกิดข้อผิดพลาดในการลบสมาชิก');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: CollaboratorRole) => {
    try {
      const member = scriptData.team.find(m => m.id === memberId);
      if (!member) return;

      // Set saving state
      setSavingRoleFor(memberId);

      // Update in Firestore
      if (scriptData.id && member.email) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          alert('กรุณาเข้าสู่ระบบก่อน');
          setSavingRoleFor(null);
          return;
        }

        await teamCollaborationService.updateMemberRole(
          scriptData.id,
          member.email,
          newRole,
          currentUser.uid
        );

        console.log(`✅ Role updated: ${member.name} → ${newRole}`);
      }

      // Update local state
      const updatedTeam = scriptData.team.map(m =>
        m.id === memberId
          ? { ...m, accessRole: newRole }
          : m
      );

      const updatedScriptData = {
        ...scriptData,
        team: updatedTeam,
      };

      setScriptData(updatedScriptData);

      // Save project
      if (onSaveProject) {
        await onSaveProject(updatedScriptData);
      }

      // Show success message
      setInviteStatus({
        type: 'success',
        message: `✅ บันทึกแล้ว: เปลี่ยนสิทธิ์ของ ${member.name} เป็น ${getRoleLabel(newRole)}`,
      });

      // Clear saving state
      setSavingRoleFor(null);
    } catch (error) {
      console.error('❌ Error changing role:', error);
      setSavingRoleFor(null);
      setInviteStatus({
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์',
      });
    }
  };

  // Helper function to get role label
  const getRoleLabel = (role: CollaboratorRole): string => {
    const labels = {
      owner: 'เจ้าของ',
      admin: 'ผู้ดูแล',
      editor: 'แก้ไข',
      viewer: 'ดูอย่างเดียว',
    };
    return labels[role] || role;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-gray-800 rounded-xl w-full max-w-3xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header - Fixed */}
          <div className="p-6 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="p-2 bg-cyan-900/50 rounded-lg text-cyan-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </span>
              Production Team / Crew
            </h2>
            <div className="flex items-center gap-2">
              {scriptData.team && scriptData.team.length > 0 && (
                <button
                  onClick={() => setShowRevenueManagement(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  จัดการรายได้
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Add Member Form */}
            <div className="p-6 bg-gray-900/50 border-b border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Add Crew Member</h3>
              
              {/* Status Message */}
              {inviteStatus.type && (
                <div
                  className={`mb-4 p-3 rounded-lg border ${
                    inviteStatus.type === 'success'
                      ? 'bg-green-900/30 border-green-600 text-green-400'
                      : 'bg-red-900/30 border-red-600 text-red-400'
                  }`}
                >
                  <p className="text-sm">{inviteStatus.message}</p>
                </div>
              )}

              <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  ชื่อสมาชิก <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="เช่น: สมชาย ใจดี"
                  disabled={isInviting}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none disabled:opacity-50 transition-all"
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  ตำแหน่ง <span className="text-red-400">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  disabled={isInviting}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none disabled:opacity-50 transition-all"
                >
                  {TEAM_ROLES.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  อีเมล <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="somchai@gmail.com"
                  disabled={isInviting}
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none disabled:opacity-50 transition-all"
                />
              </div>

              {/* Access Role Selector */}
              <div>
                <RoleSelector
                  currentRole={newAccessRole}
                  onChange={setNewAccessRole}
                  disabled={isInviting}
                  showPermissions={true}
                />
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddMember}
                disabled={isInviting || !newName.trim() || !newEmail.trim()}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-bold py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isInviting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>เพิ่มสมาชิกทีม</span>
                  </>
                )}
              </button>
            </div>
          </div>

            {/* Current Team List */}
            <div className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center justify-between">
                <span>Current Team</span>
                <span className="px-3 py-1 bg-cyan-900/50 text-cyan-400 rounded-full text-xs font-bold">
                  {scriptData.team?.length || 0} Members
                </span>
              </h3>

              {!scriptData.team || scriptData.team.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 italic text-sm">ยังไม่มีสมาชิกในทีม</p>
                  <p className="text-gray-600 text-xs mt-1">เริ่มเพิ่มสมาชิกด้านบนเพื่อสร้างทีมผลิต</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scriptData.team.map(member => (
                    <div
                      key={member.id}
                      className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-cyan-600/50 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-lg">
                          {member.name.substring(0, 2).toUpperCase()}
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white text-base flex items-center gap-2 flex-wrap">
                                {member.name}
                                {member.email && (
                                  <span className="px-2 py-0.5 bg-green-900/40 border border-green-600/50 text-green-400 text-xs rounded flex-shrink-0">
                                    ✅ Invited
                                  </span>
                                )}
                              </h4>
                              
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-cyan-400 font-medium">{member.role}</span>
                                {member.accessRole && (
                                  <RoleBadge role={member.accessRole} size="sm" />
                                )}
                              </div>

                              {member.email && (
                                <p className="text-xs text-gray-400 mt-1.5 truncate">{member.email}</p>
                              )}

                              {/* Role Change Dropdown - Only for invited members */}
                              {member.email && (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs text-gray-500">เปลี่ยนสิทธิ์การเข้าถึง:</label>
                                    {savingRoleFor === member.id && (
                                      <span className="text-xs text-cyan-400 flex items-center gap-1">
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        กำลังบันทึก...
                                      </span>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <select
                                      value={member.accessRole || 'editor'}
                                      onChange={(e) => handleRoleChange(member.id, e.target.value as CollaboratorRole)}
                                      disabled={savingRoleFor === member.id}
                                      className="text-sm bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 hover:border-cyan-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none w-full max-w-xs disabled:opacity-50 disabled:cursor-wait pr-10"
                                    >
                                      <option value="admin">👑 ผู้ดูแล (Admin) - ทุกสิทธิ์</option>
                                      <option value="editor">✏️ แก้ไข (Editor) - แก้ไข + ส่งออก</option>
                                      <option value="viewer">👁️ ดูอย่างเดียว (Viewer) - อ่านอย่างเดียว</option>
                                    </select>
                                    {/* Auto-save indicator */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    บันทึกอัตโนมัติเมื่อเปลี่ยน
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="flex-shrink-0 text-gray-500 hover:text-red-400 hover:bg-red-900/20 p-2 rounded-lg transition-all"
                              title="ลบสมาชิก"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Management Modal */}
      {showRevenueManagement && (
        <RevenueManagementPage
          isOpen={showRevenueManagement}
          onClose={() => setShowRevenueManagement(false)}
          members={scriptData.team || []}
          projectId={scriptData.id || 'default'}
          projectTitle={scriptData.title || 'Untitled Project'}
        />
      )}
    </>
  );
};

export default TeamManager;
