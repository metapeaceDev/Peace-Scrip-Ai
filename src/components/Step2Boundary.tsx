
import React, { useState } from 'react';
import type { ScriptData } from '../../types';
import { generateBoundary } from '../services/geminiService';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateScriptData({ [e.target.name]: e.target.value });
  };
  
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateScriptData({ timeline: { ...scriptData.timeline, [e.target.name]: e.target.value } });
  };

  const handleFocus = () => {
    if (onRegisterUndo) onRegisterUndo();
  };

  const handleGenerate = async () => {
    if (!scriptData.mainGenre) {
      setError('⚠️ กรุณาเลือก Genre ใน Step 1 ก่อน');
      return;
    }

    if (onRegisterUndo) onRegisterUndo();
    setIsGenerating(true);
    setError(null);

    try {      
      console.log(`🧠 Generating Boundary with language: ${scriptData.language}`);
      
      const result = await generateBoundary(scriptData);
      
      updateScriptData({
        // Keep user's original title - don't let AI change it
        // title: result.title || scriptData.title,
        bigIdea: result.bigIdea || scriptData.bigIdea,
        premise: result.premise || scriptData.premise,
        theme: result.theme || scriptData.theme,
        logLine: result.logLine || scriptData.logLine,
        timeline: {
          movieTiming: result.timeline?.movieTiming || scriptData.timeline.movieTiming,
          seasons: result.timeline?.seasons || scriptData.timeline.seasons,
          date: result.timeline?.date || scriptData.timeline.date,
          social: result.timeline?.social || scriptData.timeline.social,
          economist: result.timeline?.economist || scriptData.timeline.economist,
          environment: result.timeline?.environment || scriptData.timeline.environment,
        }
      });
      
      setError(null);
    } catch (err) {
      console.error('Failed to generate boundary:', err);
      setError('❌ การสร้างล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">STEP 2: Creating a boundary for the story</h2>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !scriptData.mainGenre}
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
            isGenerating 
              ? 'bg-gray-600 cursor-not-allowed' 
              : !scriptData.mainGenre
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
          }`}
          title={!scriptData.mainGenre ? 'กรุณาเลือก Genre ใน Step 1 ก่อน' : 'Generate boundary from Step 1 data'}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>กำลังสร้าง...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>✨ Generate</span>
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
        <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="animate-spin h-5 w-5 text-purple-400 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-sm text-purple-300">
              <p className="font-bold mb-1">🎬 AI กำลังวิเคราะห์และสร้างขอบเขตเรื่อง...</p>
              <p className="text-xs text-purple-400">
                • วิเคราะห์ Genre: {scriptData.mainGenre}<br/>
                • วิเคราะห์ Type: {scriptData.projectType}<br/>
                • สร้าง Title, Big Idea, Premise, Theme, Log Line และ Timeline
              </p>
            </div>
          </div>
        </div>
      )}

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
