/**
 * ComfyUI Settings Page
 * 
 * Centralized settings for backend management, preferences, and monitoring
 */

import React from 'react';
import { BackendSelectorEnhanced } from './BackendSelectorEnhanced';
import { CostCalculatorEnhanced } from './CostCalculatorEnhanced';
import { ComfyUIInstallerUI } from './ComfyUIInstallerUI';

type TabType = 'backend' | 'calculator' | 'installer' | 'monitoring';

export const ComfyUISettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabType>('backend');

  const tabs = [
    { id: 'backend' as TabType, label: '🎯 Backend Selection', icon: '🎯' },
    { id: 'calculator' as TabType, label: '💰 Cost Calculator', icon: '💰' },
    { id: 'installer' as TabType, label: '📦 Local Installer', icon: '📦' },
    { id: 'monitoring' as TabType, label: '📊 Monitoring', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">ComfyUI Settings</h1>
          <p className="text-gray-400">
            Manage your video generation backends, costs, and local installation
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg p-2 mb-6 flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 min-w-fit px-4 py-3 rounded-md font-medium transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-900/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === 'backend' && <BackendSelectorEnhanced />}
          {activeTab === 'calculator' && <CostCalculatorEnhanced />}
          {activeTab === 'installer' && <ComfyUIInstallerUI />}
          {activeTab === 'monitoring' && <MonitoringPanel />}
        </div>
      </div>
    </div>
  );
};

/**
 * Monitoring Panel Component
 */
const MonitoringPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Real-time Status */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">📊 Real-time Monitoring</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Active Jobs</div>
            <div className="text-3xl font-bold text-blue-400">0</div>
            <div className="text-xs text-gray-500 mt-1">Currently processing</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Queue Length</div>
            <div className="text-3xl font-bold text-yellow-400">0</div>
            <div className="text-xs text-gray-500 mt-1">Waiting in queue</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Completed Today</div>
            <div className="text-3xl font-bold text-green-400">0</div>
            <div className="text-xs text-gray-500 mt-1">Successfully generated</div>
          </div>
        </div>

        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <p className="text-sm text-gray-300">
            💡 Real-time monitoring requires ComfyUI Service to be running on http://localhost:8000
          </p>
        </div>
      </div>

      {/* Health Status */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4">🏥 Backend Health</h3>
        
        <div className="space-y-3">
          <HealthStatusCard
            name="Local ComfyUI"
            icon="🖥️"
            status="checking"
            url="http://localhost:8188"
          />
          <HealthStatusCard
            name="Cloud RunPod"
            icon="☁️"
            status="offline"
            url="Not configured"
          />
          <HealthStatusCard
            name="Gemini API"
            icon="🤖"
            status="online"
            url="Google AI"
          />
        </div>
      </div>

      {/* Cost Tracking */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4">💸 Cost Tracking</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Today's Costs</span>
              <span className="text-white font-semibold">$0.00</span>
            </div>
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="absolute h-full bg-green-500" style={{ width: '0%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">This Month</span>
              <span className="text-white font-semibold">$0.00</span>
            </div>
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="absolute h-full bg-blue-500" style={{ width: '0%' }} />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-400">Local</div>
              <div className="text-lg font-bold text-green-400">Free</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Cloud</div>
              <div className="text-lg font-bold text-blue-400">$0.00</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Gemini</div>
              <div className="text-lg font-bold text-purple-400">$0.00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4">⚡ Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Avg Processing Time</div>
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-xs text-gray-500 mt-1">Per video</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Success Rate</div>
            <div className="text-2xl font-bold text-green-400">-</div>
            <div className="text-xs text-gray-500 mt-1">Last 100 jobs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface HealthStatusCardProps {
  name: string;
  icon: string;
  status: 'online' | 'offline' | 'checking';
  url: string;
}

const HealthStatusCard: React.FC<HealthStatusCardProps> = ({ name, icon, status, url }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return '✅';
      case 'offline':
        return '❌';
      case 'checking':
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'text-green-400';
      case 'offline':
        return 'text-red-400';
      case 'checking':
        return 'text-yellow-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Healthy';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="font-semibold text-white">{name}</h4>
            <p className="text-xs text-gray-400">{url}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl">{getStatusIcon()}</span>
          <div className={`text-sm font-semibold ${getStatusColor()}`}>{getStatusText()}</div>
        </div>
      </div>
    </div>
  );
};
