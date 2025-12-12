import React, { useState, useRef, useEffect } from 'react';
import { ProjectMetadata, ProjectType } from '../../types';
import { PROJECT_TYPES } from '../../constants';
import ComfyUIStatus from './ComfyUIStatus';
import InvitationsModal from './InvitationsModal';
import { teamCollaborationService } from '../services/teamCollaborationService';
import { auth } from '../config/firebase';
import { PermissionGuard } from './RoleManagement';

interface StudioProps {
  projects: ProjectMetadata[];
  onCreateProject: (title: string, type: ProjectType) => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (file: File) => void;
  onExportProject: (id: string) => void;
  onRefreshProjects?: () => void; // Add callback for refreshing projects
}

const Studio: React.FC<StudioProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onImportProject,
  onExportProject,
  onRefreshProjects,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [latestInvitation, setLatestInvitation] = useState<{ projectTitle: string; inviterName: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ProjectType>('Movie');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time listener for invitations
  useEffect(() => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) return;

    console.log('🔔 Setting up real-time invitation listener for:', userEmail);

    // Subscribe to real-time updates
    const unsubscribe = teamCollaborationService.subscribeToInvitations(
      userEmail,
      (count, latestInvite) => {
        console.log('🔔 Real-time update: invitation count =', count);
        setInvitationCount(count);

        // Show notification popup for new invitation
        if (latestInvite && count > invitationCount) {
          setLatestInvitation({
            projectTitle: latestInvite.projectTitle,
            inviterName: latestInvite.inviterName,
          });
          setShowNotification(true);

          // Auto-hide notification after 5 seconds
          setTimeout(() => {
            setShowNotification(false);
          }, 5000);
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('🔕 Cleaning up invitation listener');
      unsubscribe();
    };
  }, [invitationCount]);

  const loadInvitationCount = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) return;

      const invitations = await teamCollaborationService.getPendingInvitations(userEmail);
      setInvitationCount(invitations.length);
    } catch (error) {
      console.error('Error loading invitation count:', error);
    }
  };

  const handleInvitationAccepted = () => {
    // Refresh projects list when invitation is accepted
    if (onRefreshProjects) {
      onRefreshProjects();
    }
    // Reload invitation count
    loadInvitationCount();
  };

  const handleCreate = () => {
    if (!newTitle.trim()) {
      alert('Please enter a project title');
      return;
    }
    onCreateProject(newTitle, newType);
    setIsModalOpen(false);
    setNewTitle('');
    setNewType('Movie');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportProject(e.target.files[0]);
      e.target.value = ''; // Reset
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmationId === id) {
      onDeleteProject(id);
      setDeleteConfirmationId(null);
    } else {
      setDeleteConfirmationId(id);
      // Auto-reset after 3 seconds if not confirmed
      setTimeout(() => setDeleteConfirmationId(prev => (prev === id ? null : prev)), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-700 pb-6">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider mb-1">
              PEACE STUDIO
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-gray-400 text-sm">Manage your creative stories in one place</p>
              {/* Minimal ComfyUI Status in Header */}
              <ComfyUIStatus compact />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsInvitationsOpen(true);
                loadInvitationCount(); // Refresh count when opening
              }}
              className="relative flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg border border-purple-600 transition-all shadow-md text-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              คำเชิญ
              {invitationCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {invitationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg border border-gray-700 transition-all shadow-md text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Import
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,.txt,.docx,.pdf"
              className="hidden"
            />

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              New Project
            </button>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h2 className="text-xl font-bold text-gray-500 mb-2">No projects yet</h2>
            <p className="text-gray-400 mb-6 text-sm">Create your first story to get started</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {projects
              .sort((a, b) => b.lastModified - a.lastModified)
              .map(project => (
                <div
                  key={project.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-900/10 group flex flex-col h-[280px] relative overflow-hidden"
                >
                  {/* Poster Background */}
                  <div className="absolute inset-0 bg-gray-900 z-0">
                    {project.posterImage ? (
                      <img
                        src={project.posterImage}
                        alt={project.title}
                        className="w-full h-full object-cover"
                        onError={e => {
                          console.error('❌ Failed to load poster:', project.posterImage);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-10 w-10 text-gray-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
                  </div>

                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
                    <PermissionGuard
                      permission="canExport"
                      userRole={project.userRole || 'viewer'}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onExportProject(project.id);
                        }}
                        className="bg-black/50 hover:bg-green-900/80 text-gray-300 hover:text-green-400 p-1.5 rounded-full backdrop-blur-sm transition-colors"
                        title="Export Project (Backup)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </PermissionGuard>

                    {/* 2-Step Delete Button */}
                    <PermissionGuard
                      permission="canDelete"
                      userRole={project.userRole || 'viewer'}
                    >
                      <button
                        onClick={e => handleDeleteClick(e, project.id)}
                        className={`p-1.5 rounded-full backdrop-blur-sm transition-all flex items-center gap-1 ${
                          deleteConfirmationId === project.id
                            ? 'bg-red-600 text-white w-auto px-3 animate-pulse'
                            : 'bg-black/50 hover:bg-red-900/80 text-gray-300 hover:text-red-400'
                        }`}
                        title="Delete Project"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {deleteConfirmationId === project.id && (
                          <span className="text-[10px] font-bold whitespace-nowrap">CONFIRM</span>
                        )}
                      </button>
                    </PermissionGuard>
                  </div>

                  <div
                    className="flex-1 cursor-pointer z-10 flex flex-col p-4"
                    onClick={() => onOpenProject(project.id)}
                  >
                    <div className="flex items-start justify-between mb-auto">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-900/80 text-cyan-400 border border-cyan-500/30 backdrop-blur-sm shadow-sm">
                        {PROJECT_TYPES.find(t => t.value === project.type)?.label.split('(')[0] ||
                          project.type}
                      </span>
                    </div>

                    <div className="mt-auto">
                      <h3 className="text-lg font-bold text-white mb-1 leading-tight group-hover:text-cyan-400 transition-colors drop-shadow-md line-clamp-2">
                        {project.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-2 pt-3 border-t border-gray-700/50 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {new Date(project.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl p-6 animate-fade-in-scene">
            <h2 className="text-xl font-bold text-white mb-6">Create New Project</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Project Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  placeholder="e.g. The Matrix 5"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Project Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as ProjectType)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                >
                  {PROJECT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded-lg transition-colors shadow-lg shadow-cyan-900/50 text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitations Modal */}
      <InvitationsModal
        isOpen={isInvitationsOpen}
        onClose={() => {
          setIsInvitationsOpen(false);
          loadInvitationCount(); // Refresh count when closing
        }}
        onInvitationAccepted={handleInvitationAccepted}
      />

      {/* Real-time Notification Popup */}
      {showNotification && latestInvitation && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 border-2 border-purple-500 rounded-lg shadow-2xl p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center animate-bounce">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm mb-1">
                  🎉 คำเชิญใหม่!
                </h4>
                <p className="text-purple-200 text-xs mb-1">
                  <strong>{latestInvitation.inviterName}</strong> เชิญคุณเข้าร่วมโปรเจ็ค
                </p>
                <p className="text-white font-medium text-sm mb-2">
                  &quot;{latestInvitation.projectTitle}&quot;
                </p>
                <button
                  onClick={() => {
                    setShowNotification(false);
                    setIsInvitationsOpen(true);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-3 rounded transition-colors"
                >
                  ดูคำเชิญ →
                </button>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-purple-300 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Studio;
