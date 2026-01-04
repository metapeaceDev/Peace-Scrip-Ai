import React, { useState, useEffect } from 'react';
import {
  checkLoRAModels,
  checkAllRequiredModels,
  getManualInstallInstructions,
  REQUIRED_LORA_MODELS,
  type LoRAModel,
  type LoRAStatus,
} from '../services/loraInstaller';

interface LoRASetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const LoRASetup: React.FC<LoRASetupProps> = ({ onComplete, onSkip }) => {
  const [checking, setChecking] = useState(true);
  const [loraStatus, setLoraStatus] = useState<Record<string, LoRAStatus>>({});
  const [missingModels, setMissingModels] = useState<LoRAModel[]>([]);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  const checkModels = async () => {
    setChecking(true);
    const status = await checkLoRAModels();
    setLoraStatus(status);

    const { missing, allInstalled } = await checkAllRequiredModels();
    setMissingModels(missing);
    setChecking(false);

    if (allInstalled) {
      // Auto-complete after 2 seconds
      setTimeout(onComplete, 2000);
    }
  };

  useEffect(() => {
    checkModels();

    // Auto-check every 10 seconds if enabled
    const interval = autoCheckEnabled ? setInterval(checkModels, 10000) : undefined;

    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckEnabled]);

  const requiredModels = REQUIRED_LORA_MODELS.filter(m => m.required);
  const optionalModels = REQUIRED_LORA_MODELS.filter(m => !m.required);
  const allInstalled = missingModels.length === 0;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full p-8 border border-purple-500/30 my-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-purple-500/10 rounded-full mb-4">
            <svg
              className="w-16 h-16 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">LoRA Models Setup</h2>
          <p className="text-gray-400">
            Install required LoRA models for professional Face ID generation
          </p>
        </div>

        {/* Status Summary */}
        <div
          className={`mb-6 p-4 rounded-lg border ${
            allInstalled
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            {checking ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-transparent"></div>
                <span className="text-white">Checking installed LoRA models...</span>
              </>
            ) : allInstalled ? (
              <>
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div>
                  <div className="text-green-400 font-semibold">
                    ✅ All Required LoRA Models Installed!
                  </div>
                  <div className="text-green-300/70 text-sm">Face ID generation is ready</div>
                </div>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <div className="text-amber-400 font-semibold">
                    ⚠️ Missing {missingModels.length} Required Model
                    {missingModels.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-amber-300/70 text-sm">
                    Please install to enable Face ID generation
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {!allInstalled && (
          <>
            {/* Required Models */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                  REQUIRED
                </span>
                Essential LoRA Models
              </h3>
              <div className="space-y-3">
                {requiredModels.map(model => {
                  const installed = loraStatus[model.name]?.installed;
                  const isExpanded = expandedModel === model.name;
                  const instructions = getManualInstallInstructions(model);

                  return (
                    <div
                      key={model.name}
                      className={`border rounded-lg p-4 ${
                        installed
                          ? 'bg-green-500/5 border-green-500/30'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {installed ? (
                              <svg
                                className="w-5 h-5 text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-amber-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                            <h4 className="font-semibold text-white">{model.displayName}</h4>
                            <span className="text-xs text-gray-400">({model.size})</span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{model.description}</p>
                          <div className="text-xs text-gray-500">
                            File:{' '}
                            <code className="bg-gray-900 px-2 py-1 rounded">{model.filename}</code>
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedModel(isExpanded ? null : model.name)}
                          className="ml-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-semibold"
                        >
                          {installed ? 'Info' : 'Install'}
                        </button>
                      </div>

                      {/* Installation Instructions */}
                      {isExpanded && !installed && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <h5 className="font-semibold text-white mb-2">
                            📝 Installation Instructions:
                          </h5>
                          <pre className="bg-gray-900 p-3 rounded text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
                            {instructions.steps.join('\n')}
                          </pre>
                          <div className="mt-3 flex gap-2">
                            <a
                              href={model.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm font-semibold text-center"
                            >
                              📥 Download LoRA
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(instructions.loraFolder);
                                alert('LoRA folder path copied to clipboard!');
                              }}
                              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded text-sm font-semibold"
                            >
                              📋 Copy Path
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Models */}
            {optionalModels.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">
                    OPTIONAL
                  </span>
                  Style Enhancement LoRAs
                </h3>
                <div className="space-y-2">
                  {optionalModels.map(model => {
                    const installed = loraStatus[model.name]?.installed;
                    return (
                      <div
                        key={model.name}
                        className={`border rounded-lg p-3 ${
                          installed
                            ? 'bg-green-500/5 border-green-500/30'
                            : 'bg-gray-800/30 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {installed && (
                              <svg
                                className="w-4 h-4 text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                            <span className="text-sm text-white">{model.displayName}</span>
                            <span className="text-xs text-gray-500">({model.size})</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {installed ? 'Installed' : 'Not installed'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={checkModels}
            disabled={checking}
            className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Checking...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Check Again
              </>
            )}
          </button>

          {onSkip && !allInstalled && (
            <button
              onClick={onSkip}
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Skip for Now
            </button>
          )}
        </div>

        {/* Auto-check Toggle */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            id="autoCheck"
            checked={autoCheckEnabled}
            onChange={e => setAutoCheckEnabled(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoCheck">Auto-check every 10 seconds</label>
        </div>

        {/* Success Message */}
        {allInstalled && (
          <div className="mt-6 text-center">
            <p className="text-green-400 font-semibold mb-2">Starting Peace Script AI...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-400 border-t-transparent mx-auto"></div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Need Help?</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>
              • LoRA files must be placed in ComfyUI&apos;s{' '}
              <code className="bg-gray-900 px-1 rounded">models/loras/</code> folder
            </li>
            <li>• Restart ComfyUI after adding new LoRA models</li>
            <li>• Character Consistency LoRA is required for Face ID to work properly</li>
            <li>• Optional LoRAs enhance specific art styles but aren&apos;t mandatory</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoRASetup;
