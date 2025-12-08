import React, { useState, useEffect, useRef } from 'react';
import type { ScriptData } from '../../types';
import { GENRES } from '../../constants';
import { generateFullScriptOutline, generateMoviePoster } from '../services/geminiService';
import { getCurrentLanguage } from '../i18n';

interface Step1GenreProps {
  scriptData: ScriptData;
  updateScriptData: (data: Partial<ScriptData>) => void;
  nextStep: () => void;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  setCurrentStep: (step: number) => void;
  onRegisterUndo?: () => void;
}

const Step1Genre: React.FC<Step1GenreProps> = ({
  scriptData,
  updateScriptData,
  nextStep,
  setScriptData,
  setCurrentStep,
  onRegisterUndo,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Poster Editor State
  const [posterPrompt, setPosterPrompt] = useState('');
  const [showPosterSettings, setShowPosterSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-update prompt when title or genre changes
  useEffect(() => {
    if (scriptData.title) {
      const defaultPrompt = `Movie Poster for "${scriptData.title}". Genre: ${scriptData.mainGenre}. Style: Cinematic, High Contrast, 4K Resolution. A dramatic visual representing the theme of the story.`;
      setPosterPrompt(defaultPrompt);
    }
  }, [scriptData.title, scriptData.mainGenre]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onRegisterUndo) onRegisterUndo();
    updateScriptData({ [e.target.name]: e.target.value });
  };

  const handleSecondaryGenreChange = (index: number, value: string) => {
    if (onRegisterUndo) onRegisterUndo();
    const newSecondaryGenres = [...scriptData.secondaryGenres];
    newSecondaryGenres[index] = value;
    updateScriptData({ secondaryGenres: newSecondaryGenres });
  };

  const handleAutoGenerate = async () => {
    if (onRegisterUndo) onRegisterUndo();
    setIsGenerating(true);
    setError(null);
    try {
      // Force-sync UI language to scriptData before generation
      const currentLang = getCurrentLanguage();
      const mappedLang = currentLang === 'th' ? 'Thai' : 'English';
      
      if (scriptData.language !== mappedLang) {
        console.log(`🌐 [Step1] Syncing language: ${scriptData.language} -> ${mappedLang}`);
        updateScriptData({ language: mappedLang });
      }
      
      const generatedData = await generateFullScriptOutline(
        scriptData.title,
        scriptData.mainGenre,
        scriptData.secondaryGenres,
        scriptData.language
      );

      setScriptData(prev => {
        const newCharacters = [...prev.characters];
        if (newCharacters[0] && generatedData.characters?.[0]?.goals) {
          newCharacters[0] = { ...newCharacters[0], goals: generatedData.characters[0].goals };
        }

        return {
          ...prev,
          ...generatedData,
          characters: newCharacters,
        };
      });

      setCurrentStep(5);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred during auto-generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePoster = async () => {
    if (!scriptData.title) {
      alert('Please enter a title first.');
      return;
    }
    if (onRegisterUndo) onRegisterUndo();
    setIsGeneratingPoster(true);
    setProgress(0);
    try {
      // Pass the user's custom prompt (or the default one) to the service
      const posterBase64 = await generateMoviePoster(scriptData, posterPrompt, p => setProgress(p));
      updateScriptData({ posterImage: posterBase64 });
    } catch (error) {
      alert('Failed to generate poster.');
      console.error(error);
    } finally {
      setIsGeneratingPoster(false);
      setProgress(0);
    }
  };

  const handleUploadPoster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onRegisterUndo) onRegisterUndo();
      const reader = new FileReader();
      reader.onloadend = () => {
        updateScriptData({ posterImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPoster = () => {
    if (!scriptData.posterImage) return;

    const link = document.createElement('a');
    link.href = scriptData.posterImage;
    link.download = `${scriptData.title.replace(/\s+/g, '_')}_Poster.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetPrompt = () => {
    if (onRegisterUndo) onRegisterUndo(); // Not stricly script data, but UI state
    const newPrompt = `Movie Poster for "${scriptData.title}". Genre: ${scriptData.mainGenre}. Style: Cinematic, High Contrast, 4K Resolution. Visuals: Dramatic lighting, central character focus.`;
    setPosterPrompt(newPrompt);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">
        STEP 1: Genre, story line to be told
      </h2>

      {/* Project Poster Section - Redesigned */}
      <div className="mb-8 bg-gray-800/80 p-6 rounded-xl border border-gray-700 shadow-xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column: Image Area */}
          <div className="flex flex-col gap-4 items-center md:items-start shrink-0">
            <div className="w-56 h-[298px] bg-gray-900 rounded-lg shadow-2xl flex items-center justify-center border-2 border-gray-700 overflow-hidden relative group">
              {scriptData.posterImage ? (
                <img
                  src={scriptData.posterImage}
                  alt="Movie Poster"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                />
              ) : (
                <div className="text-center p-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-gray-700 mx-auto mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs text-gray-600 font-medium">No Poster</span>
                </div>
              )}

              {/* Loading Overlay */}
              {isGeneratingPoster && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                  <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-cyan-400 text-xs font-bold animate-pulse">
                    Generating...
                  </span>
                  {progress > 0 && (
                    <div className="w-3/4 h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  {progress > 0 && (
                    <span className="text-cyan-400 text-[10px] mt-1">{Math.round(progress)}%</span>
                  )}
                </div>
              )}

              {/* Image Actions Overlay (Hover) */}
              {scriptData.posterImage && !isGeneratingPoster && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={handleDownloadPoster}
                    className="p-2 bg-gray-800 hover:bg-cyan-600 text-white rounded-full transition-colors shadow-lg"
                    title="Download Poster"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Action Bar under image */}
            <div className="flex gap-2 w-full justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 rounded-lg text-xs font-bold flex-1 flex items-center justify-center gap-1 transition-colors"
                title="Upload Custom Poster"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Upload
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadPoster}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* Right Column: Controls & Prompt */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                Project Poster Art
                <span className="text-xs bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/50">
                  AI Powered
                </span>
              </h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Generate a cinematic poster for &quot;{scriptData.title || 'Your Project'}&quot;.
                The AI uses your genre and title to create a unique visual identity. You can
                customize the prompt below to refine the style, mood, or composition.
              </p>
            </div>

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-cyan-500 uppercase tracking-wider">
                  AI Generation Prompt
                </label>
                <button
                  onClick={resetPrompt}
                  className="text-[10px] text-gray-500 hover:text-white underline"
                  title="Reset to default based on current title/genre"
                >
                  Auto-Fill Prompt
                </button>
              </div>
              <textarea
                value={posterPrompt}
                onChange={e => setPosterPrompt(e.target.value)}
                onFocus={() => onRegisterUndo?.()} // Snapshot text state on focus
                className="w-full bg-gray-800 border border-gray-600 rounded-md p-3 text-sm text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none flex-1 min-h-[100px]"
                placeholder="Describe the visual style, characters, and mood of the poster..."
              />
              <button
                onClick={handleGeneratePoster}
                disabled={isGeneratingPoster || !scriptData.title}
                className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isGeneratingPoster ? (
                  'Designing...'
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 group-hover:scale-110 transition-transform"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {scriptData.posterImage ? 'Regenerate Poster' : 'Generate Poster'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={scriptData.title}
            onChange={e => updateScriptData({ title: e.target.value })}
            onFocus={() => onRegisterUndo?.()} // Snapshot text state
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="Enter your movie title"
          />
        </div>
        <div>
          <label htmlFor="mainGenre" className="block text-sm font-medium text-gray-300 mb-2">
            1.1 Main story line
          </label>
          <select
            id="mainGenre"
            name="mainGenre"
            value={scriptData.mainGenre}
            onChange={handleSelectChange}
            disabled={isGenerating}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
          >
            {GENRES.map(genre => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="secondaryGenre1"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              1.2 Secondary story line 1
            </label>
            <select
              id="secondaryGenre1"
              value={scriptData.secondaryGenres[0]}
              onChange={e => handleSecondaryGenreChange(0, e.target.value)}
              disabled={isGenerating}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
            >
              {GENRES.map(genre => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="secondaryGenre2"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              1.3 Secondary story line 2
            </label>
            <select
              id="secondaryGenre2"
              value={scriptData.secondaryGenres[1] || GENRES[2]}
              onChange={e => handleSecondaryGenreChange(1, e.target.value)}
              disabled={isGenerating}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
            >
              {GENRES.map(genre => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-gray-700 pt-6">
        <p className="text-center text-gray-400 mb-4">Choose your path:</p>
        {error && <p className="text-red-400 mt-2 mb-4 text-sm text-center">{error}</p>}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={nextStep}
            className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
          >
            Start Manually (Step-by-Step)
          </button>
          <span className="text-gray-500">OR</span>
          {isGenerating ? (
            <button
              onClick={() => setIsGenerating(false)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Stop / Reset
            </button>
          ) : (
            <button
              onClick={handleAutoGenerate}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center"
            >
              Auto-Generate Full Script
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step1Genre;
