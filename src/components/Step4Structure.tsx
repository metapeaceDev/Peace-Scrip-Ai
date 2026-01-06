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
  const [generateProgress, setGenerateProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Act collapse state
  const [collapsedActs, setCollapsedActs] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
  });

  // Track which plot point is being regenerated and its progress
  const [regeneratingPlotIndex, setRegeneratingPlotIndex] = useState<number | null>(null);
  const [plotPointProgress, setPlotPointProgress] = useState(0);

  const toggleAct = (actNum: number) => {
    setCollapsedActs(prev => ({ ...prev, [actNum]: !prev[actNum] }));
  };

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
    setRegeneratingPlotIndex(index);
    setPlotPointProgress(0);
    setError(null);

    // Start progress simulation
    const progressInterval = setInterval(() => {
      setPlotPointProgress(prev => {
        if (prev >= 85) return 85;
        return prev + Math.random() * 8;
      });
    }, 400);

    try {
      console.log(`🌐 [Step4] Regenerating Plot Point ${index} with mode: ${mode}`);
      const result = await generateSinglePlotPoint(scriptData, index, mode);

      clearInterval(progressInterval);
      setPlotPointProgress(95);

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

      setPlotPointProgress(100);
      setPlotPointModal({ isOpen: false, plotPointIndex: null });
      setError(null);
    } catch (err) {
      console.error('Failed to regenerate plot point:', err);
      setError(t('step4.errors.generateFailed'));
      clearInterval(progressInterval);
    } finally {
      setIsGenerating(false);
      setRegeneratingPlotIndex(null);
      setPlotPointProgress(0);
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
    setGenerateProgress(0);
    setError(null);

    // Start progress simulation
    const progressInterval = setInterval(() => {
      setGenerateProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      console.log(
        `🌐 [Step4] Generating Structure with mode: ${mode}, language: ${scriptData.language}`
      );
      const result = await generateStructure(scriptData, mode);

      clearInterval(progressInterval);
      setGenerateProgress(95);

      if (result.structure) {
        setScriptData(prev => ({
          ...prev,
          structure: result.structure || prev.structure,
          scenesPerPoint: result.scenesPerPoint || prev.scenesPerPoint,
        }));
      }

      setGenerateProgress(100);
      setError(null);
    } catch (err) {
      console.error('Failed to generate structure:', err);
      setError(t('step4.errors.generateFailed'));
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerateProgress(0);
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
      1: 'bg-blue-500/90',
      2: 'bg-blue-600/90',
      3: 'bg-blue-700/90',
    };
    return colors[actNum as keyof typeof colors] || 'bg-gray-600';
  };

  const getActIcon = (actNum: number) => {
    const icons = {
      1: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      2: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      3: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
    return icons[actNum as keyof typeof icons] || null;
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
        <div className="mb-8 bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-cyan-400 flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
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
              🎬 กำลังสร้างโครงสร้างเรื่อง...
            </span>
            <span className="text-sm font-bold text-cyan-400">
              {Math.round(generateProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${generateProgress}%` }}
            >
              {generateProgress > 10 && (
                <span className="text-[10px] font-bold text-white drop-shadow-lg">
                  {Math.round(generateProgress)}%
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            กำลังสร้างโครงเรื่อง 3 องก์ พร้อม Plot Points และจุดเชื่อมต่อ
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Movie Poster */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Movie Poster
            </h3>
            <div className="aspect-[2/3] bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-lg overflow-hidden">
              {scriptData.posterImage ? (
                <img src={scriptData.posterImage} alt="Movie Poster" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm text-center p-4">
                  <p>Generate poster in Step 1</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Act Structure */}
        <div className="lg:col-span-2">
          <div className="space-y-8">
            {/* Render each Act */}
            {([1, 2, 3] as const).map(actNum => {
              const points = actGroups[actNum];
              if (!points || points.length === 0) return null;

              const actInfo = actLabels[actNum];
              const startIndex = scriptData.structure.findIndex(p => p.act === actNum);

              return (
                <div key={actNum} className="space-y-4">
                  {/* Act Header - Minimal Design */}
                  <div 
                    className={`
                      ${getActColor(actNum)} 
                      px-4 py-3 rounded-lg
                      cursor-pointer 
                      hover:opacity-90
                      transition-opacity duration-200
                    `}
                    onClick={() => toggleAct(actNum)}
                  >
                    <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center gap-2.5">
                        {getActIcon(actNum)}
                        <span>{actInfo.title}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-normal text-white/70">
                          {points.length}
                        </span>
                        <svg 
                          className={`w-5 h-5 transition-transform duration-200 ${collapsedActs[actNum] ? '' : 'rotate-180'}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </h3>
                  </div>

                  {/* Plot Points in this Act - Collapsible */}
                  {!collapsedActs[actNum] && (
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
                          {/* Regenerate Plot Point Button or Progress Bar */}
                          {regeneratingPlotIndex === globalIndex ? (
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-violet-400 font-semibold">Regenerating...</span>
                                <span className="text-xs font-bold text-violet-400">
                                  {Math.round(plotPointProgress)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${plotPointProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
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
                          )}
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
