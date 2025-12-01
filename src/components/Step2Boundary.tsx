
import React from 'react';
import type { ScriptData } from '../../types';

interface Step2BoundaryProps {
  scriptData: ScriptData;
  updateScriptData: (data: Partial<ScriptData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  onRegisterUndo?: () => void;
}

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; isTextArea?: boolean; placeholder?: string; onFocus?: () => void }> = ({ label, name, value, onChange, isTextArea = false, placeholder, onFocus }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    {isTextArea ? (
      <textarea id={name} name={name} value={value} onChange={onChange} onFocus={onFocus} rows={2} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500" placeholder={placeholder}></textarea>
    ) : (
      <input type="text" id={name} name={name} value={value} onChange={onChange} onFocus={onFocus} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500" placeholder={placeholder} />
    )}
  </div>
);

const Step2Boundary: React.FC<Step2BoundaryProps> = ({ scriptData, updateScriptData, nextStep, prevStep, onRegisterUndo }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateScriptData({ [e.target.name]: e.target.value });
  };
  
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateScriptData({ timeline: { ...scriptData.timeline, [e.target.name]: e.target.value } });
  };

  const handleFocus = () => {
    if (onRegisterUndo) onRegisterUndo();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">STEP 2: Creating a boundary for the story</h2>
      <div className="space-y-6">
        <InputField label="Title" name="title" value={scriptData.title} onChange={handleChange} onFocus={handleFocus} />
        <InputField label="Big idea" name="bigIdea" value={scriptData.bigIdea} onChange={handleChange} isTextArea placeholder="What will happen if... or is the story of..." onFocus={handleFocus} />
        <InputField label="Premise" name="premise" value={scriptData.premise} onChange={handleChange} isTextArea placeholder="What is this movie going to tell?" onFocus={handleFocus} />
        <InputField label="Theme" name="theme" value={scriptData.theme} onChange={handleChange} isTextArea placeholder="This tale teaches that..." onFocus={handleFocus} />
        <InputField label="Log line" name="logLine" value={scriptData.logLine} onChange={handleChange} isTextArea placeholder="A logical way of thinking to support the Theme." onFocus={handleFocus} />
        
        <div className="pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Movie Timing" name="movieTiming" value={scriptData.timeline.movieTiming} onChange={handleTimelineChange} onFocus={handleFocus} />
                <InputField label="Timeline Seasons in Movies" name="seasons" value={scriptData.timeline.seasons} onChange={handleTimelineChange} onFocus={handleFocus} />
                <InputField label="Timeline Date, month, year" name="date" value={scriptData.timeline.date} onChange={handleTimelineChange} onFocus={handleFocus} />
                <InputField label="Social Timelines" name="social" value={scriptData.timeline.social} onChange={handleTimelineChange} onFocus={handleFocus} />
                <InputField label="Economist Timeline" name="economist" value={scriptData.timeline.economist} onChange={handleTimelineChange} onFocus={handleFocus} />
                <InputField label="Timeline Environment" name="environment" value={scriptData.timeline.environment} onChange={handleTimelineChange} onFocus={handleFocus} />
            </div>
        </div>

      </div>
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300">
          Back
        </button>
        <button onClick={nextStep} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300">
          Next Step
        </button>
      </div>
    </div>
  );
};

export default Step2Boundary;
