import React, { useState, useEffect } from 'react';
import { 
  MODEL_PROFILES, 
  ModelProfile, 
  ModelPreference,
  selectOptimalModel,
  detectAvailableVRAM,
  calculateCostSavings 
} from '../services/comfyuiModelSelector';
import type { ProviderMode } from '../services/providerConfigStore';

interface ProviderSelectorProps {
  onModeChange?: (mode: ProviderMode) => void;
  onModelChange?: (preference: ModelPreference) => void;
  className?: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  onModeChange,
  onModelChange,
  className = '',
}) => {
  const [mode, setMode] = useState<ProviderMode>('hybrid');
  const [modelPreference, setModelPreference] = useState<ModelPreference>('balanced');
  const [availableVRAM, setAvailableVRAM] = useState<number>(8);
  const [selectedModel, setSelectedModel] = useState<ModelProfile>(MODEL_PROFILES.BALANCED);
  const [estimatedGenerations, setEstimatedGenerations] = useState<number>(12); // 1 project = 12 images

  useEffect(() => {
    // Detect available VRAM
    detectAvailableVRAM().then(setAvailableVRAM);
  }, []);

  useEffect(() => {
    // Update selected model when preference or VRAM changes
    const model = selectOptimalModel(modelPreference, availableVRAM);
    setSelectedModel(model);
    onModelChange?.(modelPreference);
  }, [modelPreference, availableVRAM, onModelChange]);

  const handleModeChange = (newMode: ProviderMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  const costSavings = calculateCostSavings(estimatedGenerations, selectedModel);

  return (
    <div className={`provider-selector ${className}`}>
      <div className="provider-header">
        <h3>🤖 AI Provider Mode</h3>
        <p className="description">เลือกวิธีการสร้าง AI ที่เหมาะกับคุณ</p>
      </div>

      {/* Mode Selection Cards */}
      <div className="mode-cards">
        {/* Cloud Mode */}
        <div
          className={`mode-card ${mode === 'cloud' ? 'active' : ''}`}
          onClick={() => handleModeChange('cloud')}
          role="button"
          tabIndex={0}
        >
          <div className="mode-icon">☁️</div>
          <h4>Cloud APIs</h4>
          <div className="mode-stats">
            <span className="speed">⚡⚡⚡⚡ Fastest</span>
            <span className="time">3-10s</span>
          </div>
          <div className="mode-quality">⭐⭐⭐⭐⭐ Best Quality</div>
          <div className="mode-cost">💰 Uses credits</div>
          
          <ul className="mode-features">
            <li>✅ Gemini 2.0 Flash (text)</li>
            <li>✅ Gemini Imagen 3 (image)</li>
            <li>✅ Veo 3.1 (video)</li>
            <li>✅ No setup needed</li>
            <li>⚠️ Costs ฿34/project</li>
          </ul>
        </div>

        {/* Open Source Mode */}
        <div
          className={`mode-card ${mode === 'open-source' ? 'active' : ''}`}
          onClick={() => handleModeChange('open-source')}
          role="button"
          tabIndex={0}
        >
          <div className="mode-icon">🔓</div>
          <h4>Open Source</h4>
          <div className="mode-stats">
            <span className="speed">⚡⚡ Medium</span>
            <span className="time">20-60s</span>
          </div>
          <div className="mode-quality">⭐⭐⭐⭐ Good Quality</div>
          <div className="mode-cost">💚 100% FREE</div>
          
          <ul className="mode-features">
            <li>✅ Ollama + Llama 3.2 (text)</li>
            <li>✅ ComfyUI + FLUX (image)</li>
            <li>✅ AnimateDiff (video)</li>
            <li>✅ Unlimited usage</li>
            <li>⚠️ Requires GPU (8GB+)</li>
          </ul>
        </div>

        {/* Hybrid Mode (Recommended) */}
        <div
          className={`mode-card recommended ${mode === 'hybrid' ? 'active' : ''}`}
          onClick={() => handleModeChange('hybrid')}
          role="button"
          tabIndex={0}
        >
          <div className="mode-badge">⭐ แนะนำ</div>
          <div className="mode-icon">🔀</div>
          <h4>Hybrid</h4>
          <div className="mode-stats">
            <span className="speed">⚡⚡⚡ Fast</span>
            <span className="time">10-30s</span>
          </div>
          <div className="mode-quality">⭐⭐⭐⭐⭐ Excellent</div>
          <div className="mode-cost">💎 Best Value</div>
          
          <ul className="mode-features">
            <li>✅ Try Open Source first</li>
            <li>✅ Fallback to Cloud if needed</li>
            <li>✅ Smart cost optimization</li>
            <li>✅ Best of both worlds</li>
            <li>💰 Costs ฿5-15/project</li>
          </ul>
        </div>
      </div>

      {/* Model Selection (for Open Source/Hybrid modes) */}
      {(mode === 'open-source' || mode === 'hybrid') && (
        <div className="model-selection">
          <h4>🎨 Model Quality Preference</h4>
          <p className="model-description">เลือกคุณภาพที่ต้องการ (ระบบจะเลือก model อัตโนมัติ)</p>
          
          <div className="model-slider">
            <input
              type="range"
              min="0"
              max="3"
              value={['speed', 'balanced', 'quality', 'best'].indexOf(modelPreference)}
              onChange={(e) => {
                const preferences: ModelPreference[] = ['speed', 'balanced', 'quality', 'best'];
                setModelPreference(preferences[parseInt(e.target.value)]);
              }}
              className="slider"
            />
            <div className="slider-labels">
              <span className={modelPreference === 'speed' ? 'active' : ''}>⚡ Speed</span>
              <span className={modelPreference === 'balanced' ? 'active' : ''}>⚖️ Balanced</span>
              <span className={modelPreference === 'quality' ? 'active' : ''}>⭐ Quality</span>
              <span className={modelPreference === 'best' ? 'active' : ''}>💎 Best</span>
            </div>
          </div>

          {/* Selected Model Info */}
          <div className="selected-model-info">
            <div className="model-card">
              <h5>📦 Selected Model</h5>
              <div className="model-details">
                <div className="detail-row">
                  <span className="label">Model:</span>
                  <span className="value">{selectedModel.checkpoint}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Speed:</span>
                  <span className="value">{selectedModel.estimatedTime}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Quality:</span>
                  <span className="value">{selectedModel.quality}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Steps:</span>
                  <span className="value">{selectedModel.steps}</span>
                </div>
                <div className="detail-row">
                  <span className="label">VRAM:</span>
                  <span className="value">{selectedModel.vramRequired}GB</span>
                </div>
              </div>
              <p className="model-desc">{selectedModel.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cost Estimator */}
      <div className="cost-estimator">
        <h4>💰 ประมาณการค่าใช้จ่าย</h4>
        
        <div className="generations-input">
          <label>จำนวนรูปที่จะสร้าง:</label>
          <input
            type="number"
            min="1"
            max="100"
            value={estimatedGenerations}
            onChange={(e) => setEstimatedGenerations(parseInt(e.target.value) || 1)}
          />
          <span>รูป (1 โปรเจกต์ ≈ 12 รูป)</span>
        </div>

        <table className="cost-table">
          <thead>
            <tr>
              <th>รายการ</th>
              <th className="text-center">
                {mode === 'cloud' ? 'Cloud' : mode === 'open-source' ? 'Open Source' : 'Hybrid'}
              </th>
              <th className="text-center">Cloud (เปรียบเทียบ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Text (1 script)</td>
              <td className="text-center">
                {mode === 'cloud' ? '฿0.35' : '฿0'}
              </td>
              <td className="text-center">฿0.35</td>
            </tr>
            <tr>
              <td>Images ({estimatedGenerations} รูป)</td>
              <td className="text-center">
                {mode === 'cloud' 
                  ? `฿${(estimatedGenerations * 1.40).toFixed(2)}`
                  : mode === 'open-source'
                  ? '฿0'
                  : `฿${(estimatedGenerations * 0.50).toFixed(2)}`}
              </td>
              <td className="text-center">฿{(estimatedGenerations * 1.40).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Video (1 preview)</td>
              <td className="text-center">
                {mode === 'cloud' ? '฿17.50' : '฿0'}
              </td>
              <td className="text-center">฿17.50</td>
            </tr>
            <tr className="total-row">
              <td><strong>Total:</strong></td>
              <td className="text-center">
                <strong className="current-cost">
                  {mode === 'cloud' 
                    ? `฿${(0.35 + estimatedGenerations * 1.40 + 17.50).toFixed(2)}`
                    : mode === 'open-source'
                    ? '฿0'
                    : `฿${(estimatedGenerations * 0.50 + 5).toFixed(2)}`}
                </strong>
              </td>
              <td className="text-center">
                <strong>฿{(0.35 + estimatedGenerations * 1.40 + 17.50).toFixed(2)}</strong>
              </td>
            </tr>
            {mode !== 'cloud' && (
              <tr className="savings-row">
                <td colSpan={3}>
                  <div className="savings-badge">
                    💚 ประหยัดได้ ฿{costSavings.savings.toFixed(2)} ({costSavings.savingsPercent.toFixed(0)}%)
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hardware Requirements */}
      {(mode === 'open-source' || mode === 'hybrid') && (
        <div className="hardware-requirements">
          <h4>⚙️ ความต้องการของระบบ</h4>
          <ul>
            <li>
              <strong>GPU:</strong> {selectedModel.vramRequired}GB VRAM ขึ้นไป
              {availableVRAM < selectedModel.vramRequired && (
                <span className="warning"> ⚠️ VRAM ของคุณอาจไม่พอ</span>
              )}
            </li>
            <li><strong>Storage:</strong> ~20GB สำหรับ models</li>
            <li><strong>RAM:</strong> 16GB แนะนำ</li>
            <li><strong>OS:</strong> Windows, macOS, Linux</li>
          </ul>
          
          <div className="setup-links">
            <a href="#" className="setup-link">📖 คู่มือติดตั้ง ComfyUI</a>
            <a href="#" className="setup-link">📖 คู่มือติดตั้ง Ollama</a>
            <a href="#" className="setup-link">📥 ดาวน์โหลด Models</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSelector;
