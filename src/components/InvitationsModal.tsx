import React, { useState, useEffect } from 'react';
import { teamCollaborationService, ProjectInvitation } from '../services/teamCollaborationService';
import { auth } from '../config/firebase';

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationAccepted: () => void;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({
  isOpen,
  onClose,
  onInvitationAccepted,
}) => {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && auth.currentUser?.email) {
      loadInvitations();
    }
  }, [isOpen]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const userEmail = auth.currentUser?.email;
      if (!userEmail) return;

      const pendingInvitations = await teamCollaborationService.getPendingInvitations(userEmail);
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('❌ Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      setProcessingId(invitationId);
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('กรุณาเข้าสู่ระบบ');

      await teamCollaborationService.acceptInvitation(invitationId, userId);

      // Remove from list
      const remainingInvitations = invitations.filter(inv => inv.id !== invitationId);
      setInvitations(remainingInvitations);

      // Notify parent to refresh projects
      onInvitationAccepted();

      // Show success message
      alert('✅ ยอมรับคำเชิญเรียบร้อย! คุณสามารถเข้าถึงโปรเจ็คได้แล้ว');

      // Close modal if no more invitations
      if (remainingInvitations.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      alert('เกิดข้อผิดพลาดในการยอมรับคำเชิญ');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitationId: string) => {
    try {
      setProcessingId(invitationId);
      await teamCollaborationService.rejectInvitation(invitationId);

      // Remove from list
      const remainingInvitations = invitations.filter(inv => inv.id !== invitationId);
      setInvitations(remainingInvitations);

      alert('ปฏิเสธคำเชิญเรียบร้อย');

      // Close modal if no more invitations
      if (remainingInvitations.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('❌ Error rejecting invitation:', error);
      alert('เกิดข้อผิดพลาดในการปฏิเสธคำเชิญ');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 bg-cyan-900/50 rounded-lg text-cyan-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </span>
            คำเชิญเข้าร่วมโปรเจ็ค
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="animate-spin h-12 w-12 text-cyan-500"
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
              <p className="text-gray-400 mt-4">กำลังโหลดคำเชิญ...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📬</div>
              <p className="text-gray-400 text-lg mb-2">ไม่มีคำเชิญใหม่</p>
              <p className="text-gray-500 text-sm">เมื่อมีคนเชิญคุณเข้าร่วมโปรเจ็ค คำเชิญจะปรากฏที่นี่</p>
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-cyan-300">
                    <p className="font-semibold mb-1">📨 คุณมีคำเชิญเข้าร่วมโปรเจ็ค {invitations.length} รายการ</p>
                    <p className="text-cyan-400/80">
                      กดปุ่ม &quot;ยอมรับ&quot; เพื่อเข้าถึงโปรเจ็คและเริ่มงานร่วมกับทีม
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
              {invitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-5 hover:border-cyan-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{invitation.projectTitle}</h3>
                      <p className="text-gray-400 text-sm mb-3">
                        <span className="text-cyan-400">{invitation.inviterName}</span> เชิญคุณเข้าร่วมโปรเจ็คนี้
                      </p>
                      
                      {invitation.message && (
                        <p className="text-gray-500 text-sm italic mb-3 border-l-2 border-cyan-700 pl-3">
                          &ldquo;{invitation.message}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          {invitation.role === 'editor' ? 'สามารถแก้ไขได้' : 'ดูอย่างเดียว'}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {new Date(invitation.createdAt).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(invitation.id)}
                        disabled={processingId === invitation.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {processingId === invitation.id ? (
                          <svg
                            className="animate-spin h-4 w-4"
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
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        ยอมรับ
                      </button>
                      <button
                        onClick={() => handleReject(invitation.id)}
                        disabled={processingId === invitation.id}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationsModal;
