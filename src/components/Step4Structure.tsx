
import React from 'react';
import type { ScriptData } from '../../types';

interface Step4StructureProps {
  scriptData: ScriptData;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  nextStep: () => void;
  prevStep: () => void;
  onRegisterUndo?: () => void;
}

const Step4Structure: React.FC<Step4StructureProps> = ({ scriptData, setScriptData, nextStep, prevStep, onRegisterUndo }) => {

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
      }
    }));
  };

  const handleFocus = () => {
    if (onRegisterUndo) onRegisterUndo();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
         <h2 className="text-2xl font-bold text-cyan-400">STEP 4: Creating chapter structure</h2>
      </div>

      <div className="space-y-6">
        {scriptData.structure.map((point, index) => (
          <div key={point.title} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-200">{index + 1}. {point.title}</h3>
                <div className="flex items-center gap-2">
                    <label htmlFor={`scene-count-${index}`} className="text-sm text-gray-400">Scenes:</label>
                    <select
                        id={`scene-count-${index}`}
                        value={scriptData.scenesPerPoint[point.title] || 1}
                        onChange={(e) => handleSceneCountChange(point.title, parseInt(e.target.value))}
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
              onChange={(e) => handleDescriptionChange(index, e.target.value)}
              onFocus={handleFocus}
              rows={3}
              className="mt-2 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
              placeholder={`Describe the ${point.title} of your story...`}
            />
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300">
          Back
        </button>
        <button onClick={nextStep} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300">
          Next & Generate Output
        </button>
      </div>
    </div>
  );
};

export default Step4Structure;
