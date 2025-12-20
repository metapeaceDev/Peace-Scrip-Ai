import { useState, useEffect } from 'react';
import type { ImageProvider, VideoProvider, AIProviderSettings, ProviderStatus } from '../types';
import { getProviderStatus, getRecommendedProvider } from '../services/providerSelector';
import {
  detectSystemResources,
  checkComfyUIHealth,
  getRecommendedSettings,
  saveRenderSettings,
  loadRenderSettings,
  estimateRenderTime,
  getCloudProviders,
  type SystemResources,
  type RenderSettings,
  type DeviceType,
  type CloudProvider,
} from '../services/deviceManager';

const STORAGE_KEY = 'peace-script-ai-provider-settings';

const DEFAULT_SETTINGS: AIProviderSettings = {
  imageProvider: 'auto',
  videoProvider: 'auto',
  autoSelectionCriteria: 'balanced',
  comfyuiUrl: 'http://localhost:8188',
  comfyuiEnabled: false,
};

export function ProviderSettings() {
  const [settings, setSettings] = useState<AIProviderSettings>(DEFAULT_SETTINGS);
  const [imageStatuses, setImageStatuses] = useState<ProviderStatus[]>([]);
  const [videoStatuses, setVideoStatuses] = useState<ProviderStatus[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'device' | 'settings'>('image');

  // Device Settings States
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [deviceSettings, setDeviceSettings] = useState<RenderSettings | null>(null);
  const [deviceHealth, setDeviceHealth] = useState<{
    status?: string;
    message?: string;
    local?: boolean;
    cloud?: boolean;
  } | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to load provider settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Refresh provider statuses
  const refreshStatuses = async () => {
    setRefreshing(true);
    try {
      const imageProviders: ImageProvider[] = [
        'gemini-2.5',
        'gemini-2.0',
        'stable-diffusion',
        'comfyui',
      ];
      const videoProviders: VideoProvider[] = ['gemini-veo', 'comfyui-svd'];

      const imageResults = await Promise.all(
        imageProviders.map(p => getProviderStatus(p, 'image'))
      );
      const videoResults = await Promise.all(
        videoProviders.map(p => getProviderStatus(p, 'video'))
      );

      setImageStatuses(imageResults);
      setVideoStatuses(videoResults);
    } catch (error) {
      console.error('Failed to refresh provider statuses:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatuses();
      loadDeviceInfo();
    }
  }, [isOpen]);

  const loadDeviceInfo = async () => {
    setDeviceLoading(true);
    try {
      const healthCheck = await checkComfyUIHealth();
      setDeviceHealth(healthCheck);

      const systemRes = healthCheck.resources || (await detectSystemResources());
      setResources(systemRes);

      const saved = loadRenderSettings();
      if (saved) {
        setDeviceSettings(saved);
      } else {
        const recommended = getRecommendedSettings(systemRes);
        setDeviceSettings(recommended);
        saveRenderSettings(recommended);
      }
    } catch (error) {
      console.error('Error loading device info:', error);
    } finally {
      setDeviceLoading(false);
    }
  };

  const handleDeviceChange = (device: DeviceType) => {
    if (!deviceSettings || !resources) return;
    const newSettings = { ...deviceSettings, device };
    setDeviceSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  const handleModeChange = (mode: 'local' | 'cloud' | 'hybrid') => {
    if (!deviceSettings) return;
    const newSettings = { ...deviceSettings, executionMode: mode };
    setDeviceSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  const handleLowVRAMToggle = () => {
    if (!deviceSettings) return;
    const newSettings = { ...deviceSettings, useLowVRAM: !deviceSettings.useLowVRAM };
    setDeviceSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  const handleCloudProviderChange = (provider: CloudProvider) => {
    if (!deviceSettings) return;
    const newSettings = { ...deviceSettings, cloudProvider: provider };
    setDeviceSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  const handleSettingChange = (
    key: keyof AIProviderSettings,
    value: string | number | boolean | ImageProvider | VideoProvider
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getRecommendation = (type: 'image' | 'video') => {
    const statuses = type === 'image' ? imageStatuses : videoStatuses;
    return getRecommendedProvider(statuses, settings.autoSelectionCriteria);
  };

  const renderProviderStatus = (status: ProviderStatus) => {
    const quotaColor =
      status.quota === 'available'
        ? 'text-green-400'
        : status.quota === 'low'
          ? 'text-yellow-400'
          : 'text-red-400';
    const availableIcon = status.available ? '✅' : '❌';

    return (
      <div
        key={status.provider}
        className="flex items-center justify-between py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-sm hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{availableIcon}</span>
          <span className="font-medium text-gray-200">{status.displayName}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {status.quota && (
            <span className={quotaColor}>
              {status.quota === 'available'
                ? '🟢 Full'
                : status.quota === 'low'
                  ? '🟡 Low'
                  : '🔴 Empty'}
            </span>
          )}
          <span className="text-gray-400">
            {status.speed === 'fast' ? '⚡ Fast' : status.speed === 'medium' ? '🚀 Med' : '🐢 Slow'}
          </span>
          <span className="text-gray-400">
            {status.quality === 'excellent' ? '⭐⭐⭐' : status.quality === 'good' ? '⭐⭐' : '⭐'}
          </span>
          {status.estimatedTime && <span className="text-gray-500">~{status.estimatedTime}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded transition-all bg-purple-900/30 hover:bg-purple-700 text-purple-400 hover:text-white border border-purple-800"
        title="AI Provider Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-bold hidden sm:inline">AI Settings</span>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-3xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Header with Title and Close Button */}
            <div className="flex justify-between items-center px-6 pt-6 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-purple-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13 7H7v6h6V7z" />
                  <path
                    fillRule="evenodd"
                    d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Provider Configuration
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors leading-none"
              >
                ×
              </button>
            </div>

            {/* Tab Navigation - Under Title */}
            <div className="flex border-b border-gray-700 bg-gray-800/50 px-6">
              <button
                onClick={() => setActiveTab('image')}
                className={`px-4 py-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'image' ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🖼️</span>
                  <span>Image Generation</span>
                </span>
                {activeTab === 'image' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`px-4 py-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'video' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🎬</span>
                  <span>Video Generation</span>
                </span>
                {activeTab === 'video' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('device')}
                className={`px-4 py-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'device' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🖥️</span>
                  <span>Device Settings</span>
                </span>
                {activeTab === 'device' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'settings' ? 'text-green-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>⚙️</span>
                  <span>Advanced Settings</span>
                </span>
                {activeTab === 'settings' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
                )}
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[60vh] p-6">
              {/* IMAGE TAB */}
              {activeTab === 'image' && (
                <div className="space-y-6">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Select Provider
                    </label>
                    <select
                      value={settings.imageProvider}
                      onChange={e =>
                        handleSettingChange('imageProvider', e.target.value as ImageProvider)
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="auto">🤖 Auto (Smart Selection)</option>
                      <option value="comfyui">
                        ⭐ ComfyUI IP-Adapter (Recommended for Face ID - 3 Modes Available)
                      </option>
                      <option value="gemini-2.5">Gemini 2.5 Flash Image</option>
                      <option value="gemini-2.0">Gemini 2.0 Flash Exp</option>
                      <option value="stable-diffusion">Pollinations.ai (Fast, No Face ID)</option>
                    </select>

                    {settings.imageProvider === 'auto' && (
                      <div className="mt-2 p-3 bg-cyan-900/20 border border-cyan-800/30 rounded-lg text-sm text-cyan-300">
                        💡 <strong>Recommended:</strong>{' '}
                        {getRecommendation('image')?.displayName || 'Calculating...'}
                        <div className="mt-1 text-xs text-cyan-400">
                          ✨ Auto mode prioritizes ComfyUI if enabled for best Face ID matching
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Provider Statuses */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-300">Provider Status</span>
                      <button
                        onClick={refreshStatuses}
                        disabled={refreshing}
                        className="text-xs text-cyan-400 hover:text-cyan-300 disabled:text-gray-600 flex items-center gap-1"
                      >
                        {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                      </button>
                    </div>
                    <div className="space-y-2">{imageStatuses.map(renderProviderStatus)}</div>
                  </div>
                </div>
              )}

              {/* VIDEO TAB */}
              {activeTab === 'video' && (
                <div className="space-y-6">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Select Provider
                    </label>
                    <select
                      value={settings.videoProvider}
                      onChange={e =>
                        handleSettingChange('videoProvider', e.target.value as VideoProvider)
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="auto">🤖 Auto (Smart Selection)</option>
                      <option value="comfyui-svd">⭐ ComfyUI + SVD + LoRA (Best Quality)</option>
                      <option value="gemini-veo">Gemini Veo 3.1 (Fast)</option>
                    </select>

                    {settings.videoProvider === 'auto' && (
                      <div className="mt-2 p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg text-sm text-purple-300">
                        💡 <strong>Recommended:</strong>{' '}
                        {getRecommendation('video')?.displayName || 'Calculating...'}
                        <div className="mt-1 text-xs text-purple-400">
                          ✨ Auto mode prioritizes ComfyUI if enabled for maximum control
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Provider Statuses */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-300">Provider Status</span>
                      <button
                        onClick={refreshStatuses}
                        disabled={refreshing}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:text-gray-600"
                      >
                        {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                      </button>
                    </div>
                    <div className="space-y-2">{videoStatuses.map(renderProviderStatus)}</div>
                  </div>
                </div>
              )}

              {/* DEVICE TAB */}
              {activeTab === 'device' && (
                <div className="space-y-6">
                  {deviceLoading ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="animate-spin text-4xl mb-2">⚙️</div>
                      <div>กำลังตรวจสอบอุปกรณ์...</div>
                    </div>
                  ) : (
                    <>
                      {/* ComfyUI Health Status */}
                      {deviceHealth && (
                        <div
                          className={`p-4 rounded-lg border ${
                            deviceHealth.status === 'healthy'
                              ? 'bg-green-900/20 border-green-700'
                              : deviceHealth.status === 'degraded'
                                ? 'bg-yellow-900/20 border-yellow-700'
                                : 'bg-red-900/20 border-red-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">
                                {deviceHealth.status === 'healthy' && '✅'}
                                {deviceHealth.status === 'degraded' && '⚠️'}
                                {deviceHealth.status === 'down' && '❌'}
                              </div>
                              <div>
                                <div className="font-bold text-white mb-1">
                                  {deviceHealth.message || 'ไม่ทราบสถานะ'}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Local: {deviceHealth.local ? '✓ พร้อมใช้งาน' : '✗ ไม่พร้อม'} |
                                  Cloud: {deviceHealth.cloud ? '✓ พร้อมใช้งาน' : '✗ ไม่พร้อม'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={loadDeviceInfo}
                              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                            >
                              🔄 Refresh
                            </button>
                          </div>
                        </div>
                      )}

                      {/* System Resources */}
                      {resources && (
                        <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                          <h4 className="text-sm font-bold text-gray-300 mb-3">💻 ทรัพยากรระบบ</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Platform:</span>
                              <span className="text-white font-medium">{resources.platform}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">CPU Cores:</span>
                              <span className="text-white font-medium">
                                {resources.cpu.cores} cores
                              </span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="text-gray-400">RAM:</span>
                              <span className="text-white font-medium">
                                {(resources.memory.available / 1024).toFixed(1)} GB /{' '}
                                {(resources.memory.total / 1024).toFixed(1)} GB
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Device Selection */}
                      {resources && deviceSettings && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-3">
                            🎮 เลือกอุปกรณ์ Render
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {resources.devices.map(device => (
                              <button
                                key={device.type}
                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                  deviceSettings.device === device.type
                                    ? 'border-orange-500 bg-orange-900/30'
                                    : device.available
                                      ? 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                                      : 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                                }`}
                                onClick={() => device.available && handleDeviceChange(device.type)}
                                disabled={!device.available}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="text-2xl">
                                    {device.type === 'cuda' && '🟢'}
                                    {device.type === 'mps' && '🍎'}
                                    {device.type === 'directml' && '🔷'}
                                    {device.type === 'cpu' && '💻'}
                                  </div>
                                  {device.isRecommended && (
                                    <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded">
                                      แนะนำ
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-white mb-1">{device.name}</div>
                                {device.vram && (
                                  <div className="text-xs text-gray-400">
                                    VRAM: {(device.vram / 1024).toFixed(1)} GB
                                  </div>
                                )}
                                {!device.available && (
                                  <div className="text-xs text-red-400 mt-1">ไม่พร้อมใช้งาน</div>
                                )}
                              </button>
                            ))}
                          </div>
                          {deviceSettings && (
                            <div className="mt-3 text-sm text-gray-400 text-center">
                              ⏱️ เวลาโดยประมาณ: {estimateRenderTime(deviceSettings.device, 1)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Execution Mode */}
                      {deviceSettings && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-3">🌐 โหมดการทำงาน</h4>
                          <div className="space-y-2">
                            <label
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                deviceSettings.executionMode === 'local'
                                  ? 'border-orange-500 bg-orange-900/20'
                                  : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                              }`}
                            >
                              <input
                                type="radio"
                                name="mode"
                                checked={deviceSettings.executionMode === 'local'}
                                onChange={() => handleModeChange('local')}
                                disabled={!deviceHealth?.local}
                                className="w-4 h-4"
                              />
                              <span className="text-white">🏠 Local (เครื่องของคุณ)</span>
                            </label>
                            <label
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                deviceSettings.executionMode === 'cloud'
                                  ? 'border-orange-500 bg-orange-900/20'
                                  : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                              }`}
                            >
                              <input
                                type="radio"
                                name="mode"
                                checked={deviceSettings.executionMode === 'cloud'}
                                onChange={() => handleModeChange('cloud')}
                                disabled={!deviceHealth?.cloud}
                                className="w-4 h-4"
                              />
                              <span className="text-white">☁️ Cloud (เซิร์ฟเวอร์)</span>
                            </label>
                            <label
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                deviceSettings.executionMode === 'hybrid'
                                  ? 'border-orange-500 bg-orange-900/20'
                                  : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                              }`}
                            >
                              <input
                                type="radio"
                                name="mode"
                                checked={deviceSettings.executionMode === 'hybrid'}
                                onChange={() => handleModeChange('hybrid')}
                                className="w-4 h-4"
                              />
                              <span className="text-white">🔄 Hybrid (อัตโนมัติ)</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Cloud Provider Selection */}
                      {deviceSettings &&
                        (deviceSettings.executionMode === 'cloud' ||
                          deviceSettings.executionMode === 'hybrid') && (
                          <div>
                            <h4 className="text-sm font-bold text-gray-300 mb-2">
                              ☁️ เลือก Cloud Provider
                            </h4>
                            <p className="text-xs text-yellow-400 mb-3">
                              💡 คุณจ่าย Colab Pro+ แล้ว ใช้ให้คุ้มค่า!
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              {getCloudProviders().map(provider => (
                                <button
                                  key={provider.id}
                                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                                    deviceSettings.cloudProvider === provider.id
                                      ? 'border-orange-500 bg-orange-900/30'
                                      : provider.available
                                        ? 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                                        : 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                                  }`}
                                  onClick={() =>
                                    provider.available && handleCloudProviderChange(provider.id)
                                  }
                                  disabled={!provider.available}
                                >
                                  <div className="text-xl mb-2">
                                    {provider.id === 'colab' && '🎓'}
                                    {provider.id === 'firebase' && '🔥'}
                                    {provider.id === 'runpod' && '🚀'}
                                    {provider.id === 'replicate' && '🔄'}
                                  </div>
                                  <div className="font-bold text-white text-sm mb-1">
                                    {provider.name}
                                  </div>
                                  <div className="text-xs text-gray-400 mb-2">
                                    {provider.description}
                                  </div>
                                  <div className="text-xs space-y-1">
                                    <div className="text-gray-400">{provider.speed}</div>
                                    <div className="text-green-400">{provider.cost}</div>
                                    <div className="text-purple-400">GPU: {provider.gpu}</div>
                                  </div>
                                  {provider.id === 'colab' && provider.available && (
                                    <div className="mt-2 text-xs px-2 py-1 bg-green-600 text-white rounded inline-block">
                                      แนะนำ - คุ้มที่สุด!
                                    </div>
                                  )}
                                  {!provider.available && (
                                    <div className="mt-2 text-xs text-yellow-400">
                                      ต้องตั้งค่า {provider.setupRequired ? '(ดูวิธี)' : ''}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Advanced Options */}
                      {deviceSettings && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-3">
                            ⚙️ ตัวเลือกขั้นสูง
                          </h4>
                          <label className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600 cursor-pointer hover:bg-gray-700/50 transition-all">
                            <input
                              type="checkbox"
                              checked={deviceSettings.useLowVRAM}
                              onChange={handleLowVRAMToggle}
                              className="w-4 h-4"
                            />
                            <span className="text-white text-sm">
                              🔧 โหมด Low VRAM (สำหรับ GPU ที่มี VRAM น้อย)
                            </span>
                          </label>

                          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-sm">
                            <div className="font-bold text-blue-300 mb-2">💡 คำแนะนำ:</div>
                            <ul className="space-y-1 text-gray-300 text-xs">
                              <li>
                                <strong>NVIDIA GPU (CUDA):</strong> เร็วที่สุด เหมาะสำหรับการ render
                                คุณภาพสูง
                              </li>
                              <li>
                                <strong>Apple Silicon (MPS):</strong> เร็วและประหยัดไฟ เหมาะสำหรับ
                                Mac
                              </li>
                              <li>
                                <strong>CPU:</strong> ช้าที่สุด แต่ใช้ได้กับทุกเครื่อง
                              </li>
                              <li>
                                <strong>Cloud:</strong> ไม่กินทรัพยากรเครื่อง แต่ต้องมีอินเทอร์เน็ต
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {/* Auto-Selection Criteria */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                      🎯 Auto-Selection Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleSettingChange('autoSelectionCriteria', 'speed')}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          settings.autoSelectionCriteria === 'speed'
                            ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                            : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-2xl mb-1">⚡</div>
                        <div className="text-xs font-semibold">Speed</div>
                      </button>
                      <button
                        onClick={() => handleSettingChange('autoSelectionCriteria', 'balanced')}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          settings.autoSelectionCriteria === 'balanced'
                            ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                            : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-2xl mb-1">⚖️</div>
                        <div className="text-xs font-semibold">Balanced</div>
                      </button>
                      <button
                        onClick={() => handleSettingChange('autoSelectionCriteria', 'quality')}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          settings.autoSelectionCriteria === 'quality'
                            ? 'border-green-500 bg-green-900/30 text-green-300'
                            : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-2xl mb-1">⭐</div>
                        <div className="text-xs font-semibold">Quality</div>
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                      When &quot;Auto&quot; is selected, the system will choose the best provider
                      based on this priority.
                    </p>
                  </div>

                  {/* ComfyUI Settings */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-300">
                        🎨 ComfyUI & Face ID Generation
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.comfyuiEnabled}
                          onChange={e => {
                            handleSettingChange('comfyuiEnabled', e.target.checked);
                            // Clear disabled flag when user enables
                            if (e.target.checked) {
                              localStorage.removeItem('peace_comfyui_disabled');
                              localStorage.removeItem('peace_comfyui_skipped');
                            }
                          }}
                          className="mr-2 w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-400">Enable</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={settings.comfyuiUrl}
                      onChange={e => handleSettingChange('comfyuiUrl', e.target.value)}
                      disabled={!settings.comfyuiEnabled}
                      placeholder="http://localhost:8188"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-800 disabled:text-gray-600"
                    />
                    {settings.comfyuiEnabled ? (
                      <p className="mt-2 text-xs text-gray-400">
                        ℹ️ Make sure ComfyUI is running locally. See{' '}
                        <code className="text-purple-400">COMFYUI_QUICKSTART.md</code> for setup.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-amber-400">
                        ⚠️ Face ID generation disabled. Enable to use advanced Face ID features with
                        LoRA models.
                      </p>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-300 mb-1">
                          How Auto-Selection Works
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li>
                            • <strong>Speed:</strong> Chooses fastest available provider
                          </li>
                          <li>
                            • <strong>Balanced:</strong> Best mix of speed, quality & quota
                            (40%/30%/30%)
                          </li>
                          <li>
                            • <strong>Quality:</strong> Prioritizes best output quality
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* ComfyUI Setup Guide */}
                  <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-800/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🎨</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-purple-300 mb-2">
                          ComfyUI + IP-Adapter - 3 Generation Modes
                        </h4>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="p-2 bg-yellow-900/20 border border-yellow-800/30 rounded text-xs">
                            <div className="font-bold text-yellow-300 mb-1">🏆 QUALITY</div>
                            <div className="text-gray-400">25 steps, 5-7 min</div>
                            <div className="text-gray-500 text-[10px] mt-1">85-90% similarity</div>
                            <div className="text-red-400 text-[10px] mt-1">⚠️ May crash on Mac</div>
                          </div>
                          <div className="p-2 bg-blue-900/20 border border-blue-800/30 rounded text-xs">
                            <div className="font-bold text-blue-300 mb-1">⚖️ BALANCED</div>
                            <div className="text-gray-400">20 steps, 4-6 min</div>
                            <div className="text-gray-500 text-[10px] mt-1">75-85% similarity</div>
                            <div className="text-green-400 text-[10px] mt-1">✅ Recommended</div>
                          </div>
                          <div className="p-2 bg-cyan-900/20 border border-cyan-800/30 rounded text-xs">
                            <div className="font-bold text-cyan-300 mb-1">⚡ SPEED</div>
                            <div className="text-gray-400">15 steps, 3-5 min</div>
                            <div className="text-gray-500 text-[10px] mt-1">70-80% similarity</div>
                            <div className="text-green-400 text-[10px] mt-1">✅ Stable</div>
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold text-purple-300 mb-2">Why ComfyUI?</h4>
                        <ul className="text-xs text-gray-400 space-y-1 mb-3">
                          <li>
                            ✅ <strong>Unlimited Generation</strong> - No quota limits
                          </li>
                          <li>
                            ✅ <strong>Face ID Matching</strong> - Best consistency with reference
                            images (70-90%)
                          </li>
                          <li>
                            ✅ <strong>3 Speed/Quality Modes</strong> - Choose your balance
                          </li>
                          <li>
                            ✅ <strong>LoRA Control</strong> - Fine-tuned models for better detail
                          </li>
                          <li>
                            ✅ <strong>Privacy</strong> - Runs 100% locally on your machine
                          </li>
                          <li>
                            ✅ <strong>80min Timeout</strong> - Enough time for complex generations
                          </li>
                        </ul>
                        <a
                          href="https://github.com/comfyanonymous/ComfyUI"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 underline"
                        >
                          📖 Setup Guide: Install ComfyUI →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <div className="text-xs text-gray-500 text-center">
                💾 Settings are automatically saved to browser localStorage
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export function to get current settings
export function getAIProviderSettings(): AIProviderSettings {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

