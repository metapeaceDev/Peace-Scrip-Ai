/**
 * Backend Status Indicator
 * 
 * แสดงสถานะของ backend ที่กำลังใช้งาน
 * Real-time status updates
 */

import React, { useEffect, useState } from 'react';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

export type BackendStatus = 'online' | 'offline' | 'checking' | 'error';

interface BackendInfo {
  name: string;
  status: BackendStatus;
  responseTime?: number; // ms
  lastChecked?: Date;
  error?: string;
}

export const BackendStatusIndicator: React.FC = () => {
  const { resources, recommendedBackend, isDetecting } = useDeviceDetection();
  const deviceInfo = resources;
  const backend = recommendedBackend;
  const [statuses, setStatuses] = useState<Map<string, BackendInfo>>(new Map());

  useEffect(() => {
    // Check backend status periodically
    const checkStatuses = async () => {
      const backends = [
        { name: 'Local ComfyUI', url: 'http://localhost:8188/system_stats' },
        // Add more backends here when implemented
      ];

      for (const backend of backends) {
        const startTime = performance.now();
        try {
          const response = await fetch(backend.url, {
            signal: AbortSignal.timeout(2000)
          });
          
          const responseTime = performance.now() - startTime;
          
          setStatuses(prev => new Map(prev).set(backend.name, {
            name: backend.name,
            status: response.ok ? 'online' : 'error',
            responseTime: Math.round(responseTime),
            lastChecked: new Date()
          }));
        } catch (error) {
          setStatuses(prev => new Map(prev).set(backend.name, {
            name: backend.name,
            status: 'offline',
            lastChecked: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
        <span>Detecting backends...</span>
      </div>
    );
  }

  const currentBackend = backend?.name || 'Auto-selecting...';
  const currentStatus = statuses.get('Local ComfyUI');

  return (
    <div className="flex items-center gap-3">
      <StatusDot status={currentStatus?.status || 'checking'} />
      
        <div className="flex flex-col">
        <span className="text-sm font-medium text-white">
          {currentBackend}
        </span>
        {currentStatus?.responseTime && (
          <span className="text-xs text-gray-400">
            {currentStatus.responseTime}ms response time
          </span>
        )}
      </div>

      {deviceInfo && (
        <div className="ml-auto text-xs text-gray-400">
          {deviceInfo.devices.find((d: any) => d.isRecommended)?.name || 'CPU'}
        </div>
      )}
    </div>
  );
};

const StatusDot: React.FC<{ status: BackendStatus }> = ({ status }) => {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    checking: 'bg-yellow-500 animate-pulse',
    error: 'bg-orange-500'
  };

  const tooltips = {
    online: 'Backend is online and ready',
    offline: 'Backend is offline',
    checking: 'Checking backend status...',
    error: 'Backend error'
  };

  return (
    <div
      className={`h-3 w-3 rounded-full ${colors[status]}`}
      title={tooltips[status]}
    />
  );
};

/**
 * Compact backend status for header
 */
export const BackendStatusBadge: React.FC = () => {
  const { recommendedBackend, isDetecting } = useDeviceDetection();
  const backend = recommendedBackend;

  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-300">Detecting...</span>
      </div>
    );
  }

  const isFree = backend?.cost === 0;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className={`h-2 w-2 rounded-full ${isFree ? 'bg-green-500' : 'bg-blue-500'}`} />
      <span className="text-xs text-gray-300">
        {backend?.name || 'Auto'}
      </span>
      {!isFree && backend?.cost && (
        <span className="text-xs text-gray-400">
          ${backend.cost}/video
        </span>
      )}
    </div>
  );
};

/**
 * Detailed backend health panel
 */
export const BackendHealthPanel: React.FC = () => {
  const { resources } = useDeviceDetection();
  const deviceInfo = resources;

  if (!deviceInfo) return null;

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">
        🏥 System Health
      </h3>

      <div className="space-y-4">
        {/* GPU Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">GPU Status</span>
            <span className="text-green-400 text-sm">
              {deviceInfo.devices.find((d: any) => d.type !== 'cpu')?.available ? 'Available' : 'Not Available'}
            </span>
          </div>
          {deviceInfo.devices.filter((d: any) => d.available).map((device: any) => (
            <div key={device.type} className="bg-gray-900/50 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">{device.name}</span>
                {device.vram && (
                  <span className="text-gray-400 text-xs">
                    {device.vram} MB VRAM
                  </span>
                )}
              </div>
              {device.utilization !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${device.utilization}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 mt-1">
                    {device.utilization}% utilized
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CPU Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">CPU</span>
            <span className="text-white text-sm">
              {deviceInfo.cpu.cores} cores
            </span>
          </div>
          {deviceInfo.cpu.usage !== undefined && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${deviceInfo.cpu.usage}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 mt-1">
                {deviceInfo.cpu.usage}% usage
              </span>
            </div>
          )}
        </div>

        {/* Memory Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Memory</span>
            <span className="text-white text-sm">
              {Math.round(deviceInfo.memory.used / 1024)} / {Math.round(deviceInfo.memory.total / 1024)} GB
            </span>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${(deviceInfo.memory.used / deviceInfo.memory.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
