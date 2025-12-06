import React, { useState } from 'react';
import { ScriptData, TeamMember } from '../../types';
import { TEAM_ROLES } from '../../constants';
import { RevenueManagementPage } from './RevenueManagementPage';

interface TeamManagerProps {
  scriptData: ScriptData;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  onClose: () => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ scriptData, setScriptData, onClose }) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState(TEAM_ROLES[0]);
  const [newEmail, setNewEmail] = useState('');
  const [showRevenueManagement, setShowRevenueManagement] = useState(false);

  const handleAddMember = () => {
    if (!newName.trim()) return;

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: newName,
      role: newRole,
      email: newEmail
    };

    setScriptData(prev => ({
      ...prev,
      team: [...(prev.team || []), newMember]
    }));

    setNewName('');
    setNewRole(TEAM_ROLES[0]);
    setNewEmail('');
  };

  const handleRemoveMember = (id: string) => {
    setScriptData(prev => ({
      ...prev,
      team: prev.team.filter(m => m.id !== id)
    }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               <span className="p-2 bg-cyan-900/50 rounded-lg text-cyan-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  จัดการรายได้
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

        <div className="p-6 bg-gray-900/50 border-b border-gray-700">
           <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Add Crew Member</h3>
           <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
               <div className="md:col-span-4">
                   <input 
                      type="text" 
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none"
                   />
               </div>
               <div className="md:col-span-4">
                   <select 
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none"
                   >
                       {TEAM_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                   </select>
               </div>
               <div className="md:col-span-3">
                   <input 
                      type="email" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="Email (Optional)"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none"
                   />
               </div>
               <div className="md:col-span-1">
                   <button 
                      onClick={handleAddMember}
                      className="w-full h-full bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold flex items-center justify-center transition-colors"
                   >
                       +
                   </button>
               </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Current Team ({scriptData.team?.length || 0})</h3>
            
            {(!scriptData.team || scriptData.team.length === 0) ? (
                <p className="text-center text-gray-500 italic py-8">No team members added yet.</p>
            ) : (
                <div className="space-y-3">
                    {scriptData.team.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-800 to-blue-900 flex items-center justify-center text-white font-bold text-sm">
                                    {member.name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{member.name}</h4>
                                    <p className="text-xs text-cyan-400">{member.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {member.email && <span className="text-xs text-gray-500 hidden sm:inline">{member.email}</span>}
                                <button 
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
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