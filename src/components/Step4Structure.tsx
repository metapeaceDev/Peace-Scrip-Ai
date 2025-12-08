import React, { useState } from 'react';
import type { ScriptData } from '../../types';
import { generateStructure } from '../services/geminiService';
import { getCurrentLanguage } from '../i18n';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!scriptData.mainGenre) {
      setError('⚠️ กรุณาเลือก Genre ใน Step 1 ก่อน');
      return;
    }

    if (onRegisterUndo) onRegisterUndo();
    setIsGenerating(true);
    setError(null);

    try {
      // Force-sync UI language to scriptData before generation
      const currentLang = getCurrentLanguage();
      const mappedLang = currentLang === 'th' ? 'Thai' : 'English';
      
      if (scriptData.language !== mappedLang) {
        console.log(`🌐 [Step4] Syncing language: ${scriptData.language} -> ${mappedLang}`);
        updateScriptData({ language: mappedLang });
      }
      
      const result = await generateStructure(scriptData);

      if (result.structure) {
        setScriptData(prev => ({
          ...prev,
          structure: result.structure || prev.structure,
        }));
      }

      setError(null);
    } catch (err) {
      console.error('Failed to generate structure:', err);
      setError('❌ การสร้างล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">STEP 4: Creating chapter structure</h2>
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
          title={
            !scriptData.mainGenre
              ? 'กรุณาเลือก Genre ใน Step 1 ก่อน'
              : 'Generate structure from Step 1-3 data'
          }
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
              <span>กำลังสร้าง...</span>
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
              <span>✨ Auto-Generate</span>
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
              <p className="font-bold mb-1">🎬 AI กำลังสร้างโครงสร้างเรื่อง...</p>
              <p className="text-xs text-indigo-400">
                • วิเคราะห์ Genre และ Characters จาก Step 1-3
                <br />• สร้าง Plot Points แบบ Hollywood Structure
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {scriptData.structure.map((point, index) => (
          <div key={point.title} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-200">
                {index + 1}. {point.title}
              </h3>
              <div className="flex items-center gap-2">
                <label htmlFor={`scene-count-${index}`} className="text-sm text-gray-400">
                  Scenes:
                </label>
                <select
                  id={`scene-count-${index}`}
                  value={scriptData.scenesPerPoint[point.title] || 1}
                  onChange={e => handleSceneCountChange(point.title, parseInt(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>
            <textarea
              value={point.description}
              onChange={e => handleDescriptionChange(index, e.target.value)}
              onFocus={handleFocus}
              rows={3}
              className="mt-2 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
              placeholder={`Describe the ${point.title} of your story...`}
            />
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <button
          onClick={prevStep}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
        >
          Next & Generate Output
        </button>
      </div>
    </div>
  );
};

export default Step4Structure;
