import React, { useState } from 'react';
import type { ScriptData } from '../types';
import { generateStructure, generateSinglePlotPoint } from '../services/geminiService';
import { useTranslation } from './LanguageSwitcher';
import { RegenerateOptionsModal, type RegenerationMode } from './RegenerateOptionsModal';

interface Step4StructureProps {
  scriptData: ScriptData;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  nextStep: () => void;
  prevStep: () => void;
  onRegisterUndo?: () => void;
}

const Step4Structure: React.FC<Step4StructureProps> = ({
  scriptData,
  setScriptData,
  nextStep,
  prevStep,
  onRegisterUndo,
}) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Story Structure Modal State
  const [structureModal, setStructureModal] = useState<{
    isOpen: boolean;
  }>({ isOpen: false });

  // Individual Plot Point Modal State
  const [plotPointModal, setPlotPointModal] = useState<{
    isOpen: boolean;
    plotPointIndex: number | null;
  }>({ isOpen: false, plotPointIndex: null });

  const handleDescriptionChange = (index: number, value: string) => {
    const newStructure = [...scriptData.structure];
    newStructure[index].description = value;
    setScriptData(prev => ({ ...prev, structure: newStructure }));
  };

  const handleSceneCountChange = (title: string, count: number) => {
    if (onRegisterUndo) onRegisterUndo();

    setScriptData(prev => ({
      ...prev,
      scenesPerPoint: {
        ...prev.scenesPerPoint,
        [title]: count,
      },
    }));
  };

  const handleFocus = () => {
    if (onRegisterUndo) onRegisterUndo();
  };

  const handleGenerateStructure = async () => {
    // Open modal to choose regeneration mode
    setStructureModal({ isOpen: true });
  };

  // Handle opening individual plot point modal
  const handleRegeneratePlotPoint = (globalIndex: number) => {
    setPlotPointModal({ isOpen: true, plotPointIndex: globalIndex });
  };

  // Handle individual plot point regeneration with mode
  const handleRegeneratePlotPointConfirm = async (mode: RegenerationMode) => {
    const index = plotPointModal.plotPointIndex;
    if (index === null) return;

    if (onRegisterUndo) onRegisterUndo();
    setIsGenerating(true);
    setError(null);

    try {
      console.log(`🌐 [Step4] Regenerating Plot Point ${index} with mode: ${mode}`);
      const result = await generateSinglePlotPoint(scriptData, index, mode);

      if (result.description) {
        const newStructure = [...scriptData.structure];
        newStructure[index] = {
          ...newStructure[index],
          description: result.description,
        };

        // Update scene count if provided
        const updates: any = { structure: newStructure };
        if (result.sceneCount) {
          const plotPointTitle = scriptData.structure[index].title;
          updates.scenesPerPoint = {
            ...scriptData.scenesPerPoint,
            [plotPointTitle]: result.sceneCount,
          };
        }

        setScriptData(prev => ({
          ...prev,
          ...updates,
        }));
      }

      setPlotPointModal({ isOpen: false, plotPointIndex: null });
      setError(null);
    } catch (err) {
      console.error('Failed to regenerate plot point:', err);
      setError(t('step4.errors.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle structure generation with mode
  const handleGenerateStructureConfirm = async (mode: RegenerationMode) => {
    if (!scriptData.mainGenre) {
      setError(t('step4.errors.selectGenre'));
      return;
    }

    if (onRegisterUndo) onRegisterUndo();
    setIsGenerating(true);
    setError(null);

    try {
      console.log(
        `🌐 [Step4] Generating Structure with mode: ${mode}, language: ${scriptData.language}`
      );
      const result = await generateStructure(scriptData, mode);

      if (result.structure) {
        setScriptData(prev => ({
          ...prev,
          structure: result.structure || prev.structure,
          scenesPerPoint: result.scenesPerPoint || prev.scenesPerPoint,
        }));
      }

      setError(null);
    } catch (err) {
      console.error('Failed to generate structure:', err);
      setError(t('step4.errors.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Group points by Act
  const actGroups = {
    1: scriptData.structure.filter(p => p.act === 1),
    2: scriptData.structure.filter(p => p.act === 2),
    3: scriptData.structure.filter(p => p.act === 3),
  };

  const actLabels = {
    1: { title: t('step4.acts.act1'), color: 'cyan' },
    2: { title: t('step4.acts.act2'), color: 'purple' },
    3: { title: t('step4.acts.act3'), color: 'pink' },
  };

  const getActColor = (actNum: number) => {
    const colors = {
      1: 'from-cyan-600 to-blue-600',
      2: 'from-purple-600 to-violet-600',
      3: 'from-pink-600 to-rose-600',
    };
    return colors[actNum as keyof typeof colors] || 'from-gray-600 to-gray-700';
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">{t('step4.title')}</h2>
        <button
          onClick={handleGenerateStructure}
          disabled={isGenerating || !scriptData.mainGenre}
          className={`mt-4 md:mt-0 px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
            isGenerating
              ? 'bg-gray-600 cursor-not-allowed'
              : !scriptData.mainGenre
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
          }`}
          title={!scriptData.mainGenre ? t('step4.selectGenreFirst') : t('step4.generateButton')}
        >
          {isGenerating ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{t('step4.generating')}</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{t('step4.generateButton')}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {isGenerating && (
        <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-500 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="animate-spin h-5 w-5 text-indigo-400 mt-0.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <div className="text-sm text-indigo-300">
              <p className="font-bold mb-1">{t('step4.aiAnalyzing')}</p>
              <p className="text-xs text-indigo-400">
                • {t('step4.aiDetails.analyzing')}
                <br />• {t('step4.aiDetails.creating')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Render each Act */}
        {([1, 2, 3] as const).map(actNum => {
          const points = actGroups[actNum];
          if (!points || points.length === 0) return null;

          const actInfo = actLabels[actNum];
          const startIndex = scriptData.structure.findIndex(p => p.act === actNum);

          return (
            <div key={actNum} className="space-y-4">
              {/* Act Header */}
              <div className={`bg-gradient-to-r ${getActColor(actNum)} p-4 rounded-lg shadow-lg`}>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">📖</span>
                  {actInfo.title}
                </h3>
              </div>

              {/* Plot Points in this Act */}
              <div className="space-y-4 pl-4 border-l-4 border-gray-700">
                {points.map((point, indexInAct) => {
                  const globalIndex = startIndex + indexInAct;
                  return (
                    <div
                      key={point.title}
                      className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                          <span className="text-cyan-400">{globalIndex + 1}.</span>
                          {point.title}
                        </h4>
                        <div className="flex items-center gap-3">
                          {/* Regenerate Plot Point Button */}
                          <button
                            onClick={() => handleRegeneratePlotPoint(globalIndex)}
                            disabled={isGenerating}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all duration-200 flex items-center gap-1.5 text-sm ${
                              isGenerating
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                            }`}
                            title={`Regenerate ${point.title}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>Regenerate</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`scene-count-${globalIndex}`}
                              className="text-sm text-gray-400"
                            >
                              {t('step4.scenes')}
                            </label>
                            <select
                              id={`scene-count-${globalIndex}`}
                              value={scriptData.scenesPerPoint[point.title] || 1}
                              onChange={e =>
                                handleSceneCountChange(point.title, parseInt(e.target.value))
                              }
                              className="bg-gray-700 border border-gray-600 rounded-md py-1 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <option key={num} value={num}>
                                  {num}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <textarea
                        value={point.description}
                        onChange={e => handleDescriptionChange(globalIndex, e.target.value)}
                        onFocus={handleFocus}
                        rows={3}
                        className="mt-2 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                        placeholder={`${t('step4.placeholderDescribe')} ${point.title}...`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex justify-between">
        <button
          onClick={prevStep}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
        >
          {t('step4.actions.back')}
        </button>
        <button
          onClick={nextStep}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
        >
          {t('step4.actions.next')}
        </button>
      </div>

      {/* Story Structure Modal */}
      <RegenerateOptionsModal
        isOpen={structureModal.isOpen}
        onClose={() => setStructureModal({ isOpen: false })}
        onConfirm={handleGenerateStructureConfirm}
        sceneName="Story Structure"
        hasEdits={scriptData.structure.some(
          point => point.description && point.description.trim() !== ''
        )}
      />

      {/* Individual Plot Point Modal */}
      {plotPointModal.plotPointIndex !== null && (
        <RegenerateOptionsModal
          isOpen={plotPointModal.isOpen}
          onClose={() => setPlotPointModal({ isOpen: false, plotPointIndex: null })}
          onConfirm={handleRegeneratePlotPointConfirm}
          sceneName={`Plot Point: ${scriptData.structure[plotPointModal.plotPointIndex]?.title || ''}`}
          hasEdits={scriptData.structure[plotPointModal.plotPointIndex]?.description?.trim() !== ''}
        />
      )}
    </div>
  );
};

export default Step4Structure;
