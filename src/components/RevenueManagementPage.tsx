import React from 'react';
import { RevenueManagementPanel } from './RevenueManagementPanel';
import type { TeamMember } from '../types';

interface RevenueManagementPageProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  projectId: string;
  projectTitle: string;
}

export const RevenueManagementPage: React.FC<RevenueManagementPageProps> = ({
  isOpen,
  onClose,
  members,
  projectId,
  projectTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <h2 className="text-2xl font-bold text-white">จัดการรายได้และทีม</h2>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <RevenueManagementPanel
            members={members}
            projectId={projectId}
            projectTitle={projectTitle}
          />
        </div>
      </div>
    </div>
  );
};

