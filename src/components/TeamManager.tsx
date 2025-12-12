import React, { useState, useEffect } from 'react';
import { ScriptData, TeamMember } from '../../types';
import { TEAM_ROLES } from '../../constants';
import { RevenueManagementPage } from './RevenueManagementPage';
import { teamCollaborationService, CollaboratorRole } from '../services/teamCollaborationService';
import { auth } from '../config/firebase';

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
  const [showRevenueManagement, setShowRevenueManagement] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

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
        message: 'รูปแบบอีเมลไม่ถูกต้อง',
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
      };

      setScriptData(prev => ({
        ...prev,
        team: [...(prev.team || []), newMember],
      }));

      // แปลง role เป็น CollaboratorRole
      let collaboratorRole: CollaboratorRole = 'editor';
      if (newRole.includes('ผู้กำกับ') || newRole.includes('Director')) {
        collaboratorRole = 'editor';
      } else if (newRole.includes('นักเขียน') || newRole.includes('Writer')) {
        collaboratorRole = 'editor';
      } else {
        collaboratorRole = 'viewer';
      }

      // ส่งคำเชิญผ่าน Firestore
      await teamCollaborationService.inviteCollaborator(
        scriptData.id || 'temp-project',
        scriptData.title || 'Untitled Project',
        currentUser.uid,
        currentUser.displayName || 'Unknown User',
        currentUser.email || '',
        newEmail,
        newName,
        collaboratorRole,
        `คุณได้รับเชิญให้เข้าร่วมโปรเจ็ค "${scriptData.title || 'Untitled Project'}" ในฐานะ ${newRole}`
      );

      setInviteStatus({
        type: 'success',
        message: `✅ ส่งคำเชิญไปยัง ${newEmail} เรียบร้อยแล้ว! ทีมจะได้รับอีเมลแจ้งเตือน`,
      });

      // ล้างฟอร์ม
      setNewName('');
      setNewRole(TEAM_ROLES[0]);
      setNewEmail('');
    } catch (error) {
      console.error('❌ Error inviting member:', error);
      setInviteStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งคำเชิญ',
      });

      // ลบสมาชิกที่เพิ่มไปชั่วคราว
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

      setScriptData(updatedScriptData);

      // บันทึกทันที (save to Firestore/localStorage)
      if (onSaveProject) {
        console.log('💾 Saving project after removing team member...');
        await onSaveProject(updatedScriptData);
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
          // ไม่ throw error เพราะอาจยังไม่มี invitation ใน Firestore
        }
      }

      console.log('✅ Member removed from team and saved');
    } catch (error) {
      console.error('❌ Error removing member:', error);
      alert('เกิดข้อผิดพลาดในการลบสมาชิก');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Full Name"
                  disabled={isInviting}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none disabled:opacity-50"
                />
              </div>
              <div className="md:col-span-4">
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  disabled={isInviting}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none disabled:opacity-50"
                >
                  {TEAM_ROLES.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email (Required)"
                  disabled={isInviting}
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none disabled:opacity-50"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  onClick={handleAddMember}
                  disabled={isInviting}
                  className="w-full h-full bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInviting ? (
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
                  ) : (
                    '+'
                  )}
                </button>
              </div>
            </div>
            
            <p className="mt-2 text-xs text-gray-500">
              💡 ทีมจะได้รับอีเมลแจ้งเตือนและสามารถเข้าดูโปรเจ็คได้ทันทีหลังจากยอมรับคำเชิญ
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">
              Current Team ({scriptData.team?.length || 0})
            </h3>

            {!scriptData.team || scriptData.team.length === 0 ? (
              <p className="text-center text-gray-500 italic py-8">No team members added yet.</p>
            ) : (
              <div className="space-y-3">
                {scriptData.team.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-800 to-blue-900 flex items-center justify-center text-white font-bold text-sm">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white flex items-center gap-2">
                          {member.name}
                          <span className="px-2 py-0.5 bg-yellow-900/40 border border-yellow-600/50 text-yellow-400 text-xs rounded">
                            📨 Pending Invitation
                          </span>
                        </h4>
                        <p className="text-xs text-cyan-400">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {member.email && (
                        <span className="text-xs text-gray-500 hidden sm:inline">
                          {member.email}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="ยกเลิกคำเชิญ"
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
                ))}
              </div>
            )}
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
