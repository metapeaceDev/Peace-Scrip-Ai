import React, { useEffect, useState } from 'react';
import {
  detectSystemResources,
  checkComfyUIHealth,
  getRecommendedSettings,
  saveRenderSettings,
  loadRenderSettings,
  getDeviceDisplayName,
  estimateRenderTime,
  getCloudProviders,
  checkCloudProvider,
  type SystemResources,
  type RenderSettings,
  type DeviceType,
  type CloudProvider,
} from '../services/deviceManager';
import './DeviceSettings.css';

export const DeviceSettings: React.FC = () => {
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [settings, setSettings] = useState<RenderSettings | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    setLoading(true);
    try {
      // ตรวจสอบสุขภาพ ComfyUI
      const healthCheck = await checkComfyUIHealth();
      setHealth(healthCheck);

      // โหลดทรัพยากร
      const systemRes = healthCheck.resources || (await detectSystemResources());
      setResources(systemRes);

      // โหลดการตั้งค่าที่บันทึกไว้ หรือใช้ค่าแนะนำ
      const saved = loadRenderSettings();
      if (saved) {
        setSettings(saved);
      } else {
        const recommended = getRecommendedSettings(systemRes);
        setSettings(recommended);
        saveRenderSettings(recommended);
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceChange = (device: DeviceType) => {
    if (!settings || !resources) return;

    const newSettings = { ...settings, device };
    setSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  const handleModeChange = (mode: 'local' | 'cloud' | 'hybrid') => {
    if (!settings) return;

    const newSettings = { ...settings, executionMode: mode };
    setSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  const handleLowVRAMToggle = () => {
    if (!settings) return;

    const newSettings = { ...settings, useLowVRAM: !settings.useLowVRAM };
    setSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  const handleCloudProviderChange = (provider: CloudProvider) => {
    if (!settings) return;

    const newSettings = { ...settings, cloudProvider: provider };
    setSettings(newSettings);
    saveRenderSettings(newSettings);
  };

  if (loading) {
    return (
      <button className="device-settings-trigger" disabled>
        🖥️ กำลังตรวจสอบ...
      </button>
    );
  }

  return (
    <div className="device-settings-container">
      <button
        className="device-settings-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="การตั้งค่าอุปกรณ์ Render"
      >
        🖥️ {settings ? getDeviceDisplayName(settings.device) : 'Device'}
      </button>

      {isOpen && (
        <div className="device-settings-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="device-settings-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ การตั้งค่าอุปกรณ์ Render</h2>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                ✕
              </button>
            </div>

            {/* ComfyUI Health Status */}
            <div className={`health-status status-${health?.status || 'unknown'}`}>
              <div className="status-indicator">
                {health?.status === 'healthy' && '✅'}
                {health?.status === 'degraded' && '⚠️'}
                {health?.status === 'down' && '❌'}
              </div>
              <div className="status-text">
                <strong>{health?.message || 'ไม่ทราบสถานะ'}</strong>
                <div className="status-details">
                  Local: {health?.local ? '✓ พร้อมใช้งาน' : '✗ ไม่พร้อม'} | Cloud:{' '}
                  {health?.cloud ? '✓ พร้อมใช้งาน' : '✗ ไม่พร้อม'}
                </div>
              </div>
              <button onClick={loadSystemInfo} className="refresh-btn">
                🔄 รีเฟรช
              </button>
            </div>

            {/* System Resources */}
            {resources && (
              <div className="system-resources">
                <h3>💻 ทรัพยากรระบบ</h3>
                <div className="resources-grid">
                  <div className="resource-item">
                    <span className="label">แพลตฟอร์ม:</span>
                    <span className="value">{resources.platform}</span>
                  </div>
                  <div className="resource-item">
                    <span className="label">CPU Cores:</span>
                    <span className="value">{resources.cpu.cores} cores</span>
                  </div>
                  <div className="resource-item">
                    <span className="label">RAM:</span>
                    <span className="value">
                      {(resources.memory.available / 1024).toFixed(1)} GB /{' '}
                      {(resources.memory.total / 1024).toFixed(1)} GB
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Device Selection */}
            {resources && settings && (
              <div className="device-selection">
                <h3>🎮 เลือกอุปกรณ์ Render</h3>
                <div className="device-grid">
                  {resources.devices.map(device => (
                    <button
                      key={device.type}
                      className={`device-card ${settings.device === device.type ? 'selected' : ''} ${!device.available ? 'disabled' : ''}`}
                      onClick={() => device.available && handleDeviceChange(device.type)}
                      disabled={!device.available}
                    >
                      <div className="device-icon">
                        {device.type === 'cuda' && '🟢'}
                        {device.type === 'mps' && '🍎'}
                        {device.type === 'directml' && '🔷'}
                        {device.type === 'cpu' && '💻'}
                      </div>
                      <div className="device-name">{device.name}</div>
                      {device.isRecommended && <div className="recommended-badge">แนะนำ</div>}
                      {device.vram && (
                        <div className="device-vram">
                          VRAM: {(device.vram / 1024).toFixed(1)} GB
                        </div>
                      )}
                      {!device.available && <div className="unavailable-badge">ไม่พร้อมใช้งาน</div>}
                    </button>
                  ))}
                </div>

                <div className="estimated-time">
                  ⏱️ เวลาโดยประมาณ: {estimateRenderTime(settings.device, 1)}
                </div>
              </div>
            )}

            {/* Execution Mode */}
            {settings && (
              <div className="execution-mode">
                <h3>🌐 โหมดการทำงาน</h3>
                <div className="mode-options">
                  <label className={settings.executionMode === 'local' ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="mode"
                      checked={settings.executionMode === 'local'}
                      onChange={() => handleModeChange('local')}
                      disabled={!health?.local}
                    />
                    <span>🏠 Local (เครื่องของคุณ)</span>
                  </label>
                  <label className={settings.executionMode === 'cloud' ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="mode"
                      checked={settings.executionMode === 'cloud'}
                      onChange={() => handleModeChange('cloud')}
                      disabled={!health?.cloud}
                    />
                    <span>☁️ Cloud (เซิร์ฟเวอร์)</span>
                  </label>
                  <label className={settings.executionMode === 'hybrid' ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="mode"
                      checked={settings.executionMode === 'hybrid'}
                      onChange={() => handleModeChange('hybrid')}
                    />
                    <span>🔄 Hybrid (อัตโนมัติ)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Cloud Provider Selection */}
            {settings &&
              (settings.executionMode === 'cloud' || settings.executionMode === 'hybrid') && (
                <div className="cloud-provider-selection">
                  <h3>☁️ เลือก Cloud Provider</h3>
                  <p className="hint-text">💡 คุณจ่าย Colab Pro+ แล้ว ใช้ให้คุ้มค่า!</p>
                  <div className="provider-grid">
                    {getCloudProviders().map(provider => (
                      <button
                        key={provider.id}
                        className={`provider-card ${settings.cloudProvider === provider.id ? 'selected' : ''} ${!provider.available ? 'disabled' : ''}`}
                        onClick={() => provider.available && handleCloudProviderChange(provider.id)}
                        disabled={!provider.available}
                      >
                        <div className="provider-icon">
                          {provider.id === 'colab' && '🎓'}
                          {provider.id === 'firebase' && '🔥'}
                          {provider.id === 'runpod' && '🚀'}
                          {provider.id === 'replicate' && '🔄'}
                        </div>
                        <div className="provider-name">{provider.name}</div>
                        <div className="provider-desc">{provider.description}</div>
                        <div className="provider-specs">
                          <div>{provider.speed}</div>
                          <div>{provider.cost}</div>
                          <div>GPU: {provider.gpu}</div>
                        </div>
                        {provider.id === 'colab' && provider.available && (
                          <div className="recommended-badge">แนะนำ - คุ้มที่สุด!</div>
                        )}
                        {!provider.available && (
                          <div className="setup-required-badge">
                            ต้องตั้งค่า {provider.setupRequired ? '(ดูวิธี)' : ''}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {settings.cloudProvider === 'colab' && (
                    <div className="info-box colab-setup">
                      <strong>🎓 วิธีตั้งค่า Google Colab Pro+:</strong>
                      <ol>
                        <li>
                          เปิด{' '}
                          <a
                            href="https://colab.research.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Google Colab
                          </a>
                        </li>
                        <li>
                          อัพโหลด notebook: <code>comfyui_server.ipynb</code>
                        </li>
                        <li>เปิด GPU: Runtime → Change runtime type → A100 GPU</li>
                        <li>รัน cell ติดตั้ง ComfyUI</li>
                        <li>รัน ngrok/cloudflare tunnel</li>
                        <li>
                          คัดลอก URL มาใส่ใน settings → <code>VITE_COLAB_TUNNEL_URL</code>
                        </li>
                      </ol>
                      <button
                        className="btn-secondary"
                        onClick={() => window.open('/colab-setup-guide', '_blank')}
                      >
                        📖 ดูคู่มือเต็ม
                      </button>
                    </div>
                  )}
                </div>
              )}

            {/* Advanced Options */}
            {settings && (
              <div className="advanced-options">
                <h3>⚙️ ตัวเลือกขั้นสูง</h3>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.useLowVRAM}
                    onChange={handleLowVRAMToggle}
                  />
                  <span>
                    🔧 โหมด Low VRAM (สำหรับ GPU ที่มี VRAM น้อย)
                    {settings.useLowVRAM && <span className="hint"> - เปิดใช้งาน</span>}
                  </span>
                </label>

                <div className="info-box">
                  <strong>💡 คำแนะนำ:</strong>
                  <ul>
                    <li>
                      <strong>NVIDIA GPU (CUDA):</strong> เร็วที่สุด เหมาะสำหรับการ render คุณภาพสูง
                    </li>
                    <li>
                      <strong>Apple Silicon (MPS):</strong> เร็วและประหยัดไฟ เหมาะสำหรับ Mac
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

            <div className="modal-footer">
              <button onClick={() => setIsOpen(false)} className="btn-primary">
                ✓ บันทึกและปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceSettings;
