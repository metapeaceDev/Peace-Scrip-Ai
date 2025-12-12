import React, { useState, useEffect } from 'react';

export type TTSEngine = 'browser' | 'google' | 'azure' | 'aws' | 'pythainlp';

export interface TTSSettings {
  engine: TTSEngine;
  rate: number;
  pitch: number;
  volume: number;
  // API Keys (stored in localStorage)
  googleApiKey?: string;
  azureApiKey?: string;
  azureRegion?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  pythainlpEndpoint?: string;
  // Voice selection
  selectedVoice?: string;
}

interface TTSSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: TTSSettings;
  onSave: (settings: TTSSettings) => void;
  onPreview: (text: string, settings: TTSSettings) => void;
}

export const TTSSettingsModal: React.FC<TTSSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  onPreview,
}) => {
  const [settings, setSettings] = useState<TTSSettings>(currentSettings);
  const [previewText, setPreviewText] = useState('สวัสดีครับ ผมเป็นระบบอ่านเรื่องอัตโนมัติ');

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handlePreview = () => {
    onPreview(previewText, settings);
  };

  const engineInfo = {
    browser: {
      name: 'Browser Web Speech API',
      description: 'ฟรี ใช้เสียงในตัว Browser (คุณภาพขึ้นกับระบบ)',
      cost: '💚 ฟรี',
      quality: '⭐⭐⭐ ปานกลาง',
      needsApi: false,
    },
    google: {
      name: 'Google Cloud Text-to-Speech',
      description: 'คุณภาพเสียงไทยสูงสุด หลายเสียงให้เลือก',
      cost: '💰 $4/1M chars (4M chars/month ฟรี)',
      quality: '⭐⭐⭐⭐⭐ ดีเยี่ยม',
      needsApi: true,
    },
    azure: {
      name: 'Azure Cognitive Services',
      description: 'Microsoft TTS เสียงไทยคุณภาพดี',
      cost: '💰 $1/1K requests (500K chars/month ฟรี)',
      quality: '⭐⭐⭐⭐ ดีมาก',
      needsApi: true,
    },
    aws: {
      name: 'Amazon Polly',
      description: 'AWS TTS เสียงไทยธรรมชาติ',
      cost: '💰 $4/1M chars (5M chars/month ฟรี)',
      quality: '⭐⭐⭐⭐ ดีมาก',
      needsApi: true,
    },
    pythainlp: {
      name: 'PyThaiNLP TTS',
      description: 'ฟรี Open Source แต่ต้องติดตั้ง Backend',
      cost: '💚 ฟรี',
      quality: '⭐⭐⭐ ดี',
      needsApi: true,
    },
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-cyan-500/30 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                Voice Reading Settings
              </h2>
              <p className="text-cyan-100 text-sm mt-1">เลือก TTS Engine และปรับแต่งเสียงอ่าน</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Engine Selection */}
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              เลือก TTS Engine
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(engineInfo) as TTSEngine[]).map((engine) => {
                const info = engineInfo[engine];
                const isSelected = settings.engine === engine;
                return (
                  <button
                    key={engine}
                    onClick={() => setSettings({ ...settings, engine })}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{info.name}</h4>
                      {isSelected && (
                        <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{info.description}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-300">{info.cost}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-300">{info.quality}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Configuration */}
          {engineInfo[settings.engine].needsApi && (
            <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
              <h3 className="text-md font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                API Configuration
              </h3>

              {settings.engine === 'google' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Google Cloud API Key</label>
                  <input
                    type="password"
                    value={settings.googleApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, googleApiKey: e.target.value })}
                    placeholder="AIza..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <a
                    href="https://cloud.google.com/text-to-speech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-block"
                  >
                    → Get API Key from Google Cloud Console
                  </a>
                </div>
              )}

              {settings.engine === 'azure' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Azure Speech Key</label>
                    <input
                      type="password"
                      value={settings.azureApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, azureApiKey: e.target.value })}
                      placeholder="Enter your Azure Speech key"
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Region</label>
                    <input
                      type="text"
                      value={settings.azureRegion || ''}
                      onChange={(e) => setSettings({ ...settings, azureRegion: e.target.value })}
                      placeholder="southeastasia"
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <a
                    href="https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 inline-block"
                  >
                    → Get API Key from Azure Portal
                  </a>
                </div>
              )}

              {settings.engine === 'aws' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">AWS Access Key ID</label>
                    <input
                      type="password"
                      value={settings.awsAccessKey || ''}
                      onChange={(e) => setSettings({ ...settings, awsAccessKey: e.target.value })}
                      placeholder="AKIA..."
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">AWS Secret Access Key</label>
                    <input
                      type="password"
                      value={settings.awsSecretKey || ''}
                      onChange={(e) => setSettings({ ...settings, awsSecretKey: e.target.value })}
                      placeholder="Enter secret key"
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">AWS Region</label>
                    <input
                      type="text"
                      value={settings.awsRegion || ''}
                      onChange={(e) => setSettings({ ...settings, awsRegion: e.target.value })}
                      placeholder="ap-southeast-1"
                      className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <a
                    href="https://aws.amazon.com/polly/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 inline-block"
                  >
                    → Get API Key from AWS Console
                  </a>
                </div>
              )}

              {settings.engine === 'pythainlp' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">PyThaiNLP Server Endpoint</label>
                  <input
                    type="text"
                    value={settings.pythainlpEndpoint || ''}
                    onChange={(e) => setSettings({ ...settings, pythainlpEndpoint: e.target.value })}
                    placeholder="http://localhost:8000/tts"
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    💡 ต้องรัน PyThaiNLP TTS server ก่อน
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Voice Controls */}
          <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
            <h3 className="text-md font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Voice Controls
            </h3>
            
            <div className="space-y-4">
              {/* Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300">Speed (ความเร็ว)</label>
                  <span className="text-sm text-cyan-400 font-mono">{settings.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={settings.rate}
                  onChange={(e) => setSettings({ ...settings, rate: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>ช้า</span>
                  <span>ปกติ</span>
                  <span>เร็ว</span>
                </div>
              </div>

              {/* Pitch */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300">Pitch (โทนเสียง)</label>
                  <span className="text-sm text-cyan-400 font-mono">{settings.pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={settings.pitch}
                  onChange={(e) => setSettings({ ...settings, pitch: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>ต่ำ</span>
                  <span>ปกติ</span>
                  <span>สูง</span>
                </div>
              </div>

              {/* Volume */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300">Volume (ระดับเสียง)</label>
                  <span className="text-sm text-cyan-400 font-mono">{Math.round(settings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => setSettings({ ...settings, volume: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>เงียบ</span>
                  <span>ปกติ</span>
                  <span>ดัง</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
            <h3 className="text-md font-semibold text-cyan-400 mb-3">ทดสอบเสียง</h3>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500 mb-3"
              placeholder="พิมพ์ข้อความเพื่อทดสอบเสียง..."
            />
            <button
              onClick={handlePreview}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Preview เสียง
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default TTSSettingsModal;
