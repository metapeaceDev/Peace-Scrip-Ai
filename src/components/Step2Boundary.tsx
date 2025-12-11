
import React, { useState } from 'react';
import type { ScriptData } from '../../types';
import { generateBoundary } from '../services/geminiService';
import { useTranslation } from './LanguageSwitcher';
import { RegenerateOptionsModal, type RegenerationMode } from './RegenerateOptionsModal';

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

const InputFieldWithRegenerate: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isTextArea?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onRegenerate: () => void;
  isGenerating?: boolean;
  showRegenerate?: boolean;
}> = ({ label, name, value, onChange, isTextArea = false, placeholder, onFocus, onRegenerate, isGenerating = false, showRegenerate = true }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">{label}</label>
      {showRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded border border-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Regenerate this field"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Regenerate</span>
        </button>
      )}
    </div>
    {isTextArea ? (
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        rows={2}
        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
        placeholder={placeholder}
      ></textarea>
    ) : (
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
        placeholder={placeholder}
      />
    )}
  </div>
);

const Step2Boundary: React.FC<Step2BoundaryProps> = ({ scriptData, updateScriptData, nextStep, prevStep, onRegisterUndo }) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{
    isOpen: boolean;
    fieldName: string | null;
    fieldLabel: string;
  }>({ isOpen: false, fieldName: null, fieldLabel: '' });
  const [generatingFields, setGeneratingFields] = useState<Set<string>>(new Set());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateScriptData({ [e.target.name]: e.target.value });
  };
  
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateScriptData({ timeline: { ...scriptData.timeline, [e.target.name]: e.target.value } });
  };

  const handleFocus = () => {
    if (onRegisterUndo) onRegisterUndo();
  };

  // Open regenerate modal for specific field
  const handleRegenerateField = (fieldName: string, fieldLabel: string) => {
    setRegenerateModal({ isOpen: true, fieldName, fieldLabel });
  };

  // Open regenerate modal for all fields
  const handleRegenerateAll = () => {
    setRegenerateModal({ isOpen: true, fieldName: 'all', fieldLabel: 'All Boundary Fields' });
  };

  // Handle regenerate confirmation
  const handleRegenerateConfirm = async (mode: RegenerationMode) => {
    if (!scriptData.mainGenre) {
      setError(t('step2.errors.selectGenre'));
      return;
    }

    const fieldName = regenerateModal.fieldName;
    if (!fieldName) return;

    if (onRegisterUndo) onRegisterUndo();
    
    // Add field to generating set
    setGeneratingFields(prev => new Set(prev).add(fieldName));
    if (fieldName === 'all') setIsGenerating(true);
    setError(null);

    try {
      console.log(`🧠 Regenerating ${fieldName} with mode: ${mode}, language: ${scriptData.language}`);
      
      // Create context based on mode
      let contextData = { ...scriptData };
      
      if (mode === 'fresh') {
        // Fresh Start: Reset the field(s) being regenerated
        if (fieldName === 'all') {
          contextData = {
            ...scriptData,
            bigIdea: '',
            premise: '',
            theme: '',
            logLine: '',
            synopsis: '',
            timeline: {
              movieTiming: '',
              seasons: '',
              date: '',
              social: '',
              economist: '',
              environment: '',
            },
          };
        } else {
          // Reset specific field
          if (fieldName === 'timeline') {
            contextData = {
              ...scriptData,
              timeline: {
                movieTiming: '',
                seasons: '',
                date: '',
                social: '',
                economist: '',
                environment: '',
              },
            };
          } else {
            contextData = {
              ...scriptData,
              [fieldName]: '',
            };
          }
        }
      }
      // For 'refine' and 'use-edited', use current data as-is
      
      const result = await generateBoundary(
        contextData, 
        mode, 
        fieldName === 'all' ? undefined : (fieldName as 'bigIdea' | 'premise' | 'theme' | 'logLine' | 'synopsis' | 'timeline')
      );
      
      // Update only the requested field(s)
      if (fieldName === 'all') {
        updateScriptData({
          bigIdea: result.bigIdea || scriptData.bigIdea,
          premise: result.premise || scriptData.premise,
          theme: result.theme || scriptData.theme,
          logLine: result.logLine || scriptData.logLine,
          synopsis: result.synopsis || scriptData.synopsis,
          timeline: {
            movieTiming: result.timeline?.movieTiming || scriptData.timeline.movieTiming,
            seasons: result.timeline?.seasons || scriptData.timeline.seasons,
            date: result.timeline?.date || scriptData.timeline.date,
            social: result.timeline?.social || scriptData.timeline.social,
            economist: result.timeline?.economist || scriptData.timeline.economist,
            environment: result.timeline?.environment || scriptData.timeline.environment,
          }
        });
      } else if (fieldName === 'timeline') {
        updateScriptData({
          timeline: {
            movieTiming: result.timeline?.movieTiming || scriptData.timeline.movieTiming,
            seasons: result.timeline?.seasons || scriptData.timeline.seasons,
            date: result.timeline?.date || scriptData.timeline.date,
            social: result.timeline?.social || scriptData.timeline.social,
            economist: result.timeline?.economist || scriptData.timeline.economist,
            environment: result.timeline?.environment || scriptData.timeline.environment,
          }
        });
      } else {
        updateScriptData({
          [fieldName]: (result as any)[fieldName] || (scriptData as any)[fieldName],
        });
      }
      
      setError(null);
    } catch (err) {
      console.error(`Failed to regenerate ${fieldName}:`, err);
      setError(t('step2.errors.generateFailed'));
    } finally {
      setGeneratingFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
      if (fieldName === 'all') setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!scriptData.mainGenre) {
      setError(t('step2.errors.selectGenre'));
      return;
    }

    // Open regenerate modal for all fields
    handleRegenerateAll();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">{t('step2.title')}</h2>
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
          title={!scriptData.mainGenre ? t('step2.selectGenreFirst') : t('step2.generateButton')}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{t('step2.generating')}</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>{t('step2.generateButton')}</span>
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
              <p className="font-bold mb-1">{t('step2.aiAnalyzing')}</p>
              <p className="text-xs text-purple-400">
                • {t('step2.aiDetails.analyzingGenre')} {scriptData.mainGenre}<br/>
                • {t('step2.aiDetails.analyzingType')} {scriptData.projectType}<br/>
                • {t('step2.aiDetails.creating')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 NEW LAYOUT: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                <img 
                  src={scriptData.posterImage} 
                  alt="Movie Poster" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm text-center p-4">
                  <div>
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Generate poster in Step 1</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center">
              From Step 1: Genre, story line to be told
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Story Details */}
        <div className="lg:col-span-2 space-y-6">
          <InputField label={t('step2.fields.title')} name="title" value={scriptData.title} onChange={handleChange} onFocus={handleFocus} />
          
          <InputFieldWithRegenerate
            label={t('step2.fields.bigIdea')}
            name="bigIdea"
            value={scriptData.bigIdea}
            onChange={handleChange}
            isTextArea
            placeholder={t('step2.fields.bigIdeaPlaceholder')}
            onFocus={handleFocus}
            onRegenerate={() => handleRegenerateField('bigIdea', 'Big Idea')}
            isGenerating={generatingFields.has('bigIdea')}
          />
          
          <InputFieldWithRegenerate
            label={t('step2.fields.premise')}
            name="premise"
            value={scriptData.premise}
            onChange={handleChange}
            isTextArea
            placeholder={t('step2.fields.premisePlaceholder')}
            onFocus={handleFocus}
            onRegenerate={() => handleRegenerateField('premise', 'Premise')}
            isGenerating={generatingFields.has('premise')}
          />
          
          {/* ⭐ THEME - MOST IMPORTANT (Minimal Design) */}
          <div className="relative">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
            <div className="pl-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="theme" className="block text-sm font-bold text-amber-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {t('step2.fields.theme')}
                  <span className="text-xs font-normal text-amber-500/60">(หัวใจของเรื่อง)</span>
                </label>
                <button
                  onClick={() => handleRegenerateField('theme', 'Theme')}
                  disabled={generatingFields.has('theme')}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded border border-amber-500/30 hover:border-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate Theme"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate</span>
                </button>
              </div>
              <textarea 
                id="theme" 
                name="theme" 
                value={scriptData.theme} 
                onChange={handleChange} 
                onFocus={handleFocus} 
                rows={3} 
                className="w-full bg-gray-700 border-2 border-amber-500/40 focus:border-amber-500 rounded-md py-3 px-4 text-white focus:ring-2 focus:ring-amber-500/50 placeholder-gray-500"
                placeholder={t('step2.fields.themePlaceholder')}
              ></textarea>
              <p className="mt-1.5 text-xs text-amber-400/70">
                💡 ความจริงสากลที่ตัวละครและผู้ชมจะได้เรียนรู้ไปพร้อมกัน
              </p>
            </div>
          </div>
          
          <InputFieldWithRegenerate
            label={t('step2.fields.logLine')}
            name="logLine"
            value={scriptData.logLine}
            onChange={handleChange}
            isTextArea
            placeholder={t('step2.fields.logLinePlaceholder')}
            onFocus={handleFocus}
            onRegenerate={() => handleRegenerateField('logLine', 'Log Line')}
            isGenerating={generatingFields.has('logLine')}
            showRegenerate={true}
          />
        </div>
      </div>

      {/* 📅 Timeline Section */}
      <div className="mb-6 p-6 bg-gray-800/30 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('step2.fields.timeline')}
          </h3>
          <button
            onClick={() => handleRegenerateField('timeline', 'Timeline')}
            disabled={generatingFields.has('timeline')}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded border border-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Regenerate Timeline"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Regenerate</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label={t('step2.fields.movieTiming')} name="movieTiming" value={scriptData.timeline.movieTiming} onChange={handleTimelineChange} onFocus={handleFocus} />
          <InputField label={t('step2.fields.seasons')} name="seasons" value={scriptData.timeline.seasons} onChange={handleTimelineChange} onFocus={handleFocus} />
          <InputField label={t('step2.fields.date')} name="date" value={scriptData.timeline.date} onChange={handleTimelineChange} onFocus={handleFocus} />
          <InputField label={t('step2.fields.social')} name="social" value={scriptData.timeline.social} onChange={handleTimelineChange} onFocus={handleFocus} />
          <InputField label={t('step2.fields.economist')} name="economist" value={scriptData.timeline.economist} onChange={handleTimelineChange} onFocus={handleFocus} />
          <InputField label={t('step2.fields.environment')} name="environment" value={scriptData.timeline.environment} onChange={handleTimelineChange} onFocus={handleFocus} />
        </div>
      </div>

      {/* 📖 Synopsis Section - Beautiful Reading Format */}
      <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Synopsis
          </h3>
          <button
            onClick={() => handleRegenerateField('synopsis', 'Synopsis')}
            disabled={generatingFields.has('synopsis')}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded border border-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Regenerate Synopsis"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Regenerate</span>
          </button>
        </div>
        
        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-5">
          {scriptData.synopsis ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-justify">
                {scriptData.synopsis}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Click "Generate AI" button to create synopsis</p>
              <p className="text-xs mt-2 text-gray-600">Synopsis will be generated from Title, Big Idea, Premise, Theme, Log Line, and Timeline</p>
            </div>
          )}
        </div>
        
        {/* Edit Synopsis Button */}
        <div className="mt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-2">
              <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Edit Synopsis Manually
            </summary>
            <div className="mt-3">
              <textarea
                name="synopsis"
                value={scriptData.synopsis}
                onChange={handleChange}
                onFocus={handleFocus}
                rows={10}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-white focus:ring-cyan-500 focus:border-cyan-500 leading-relaxed"
                placeholder="Write or edit your synopsis here..."
              ></textarea>
              <p className="mt-2 text-xs text-gray-500">
                💡 Tip: A good synopsis should be 3-5 paragraphs, covering the beginning, middle, and end of your story.
              </p>
            </div>
          </details>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300">
          {t('step2.actions.back')}
        </button>
        <button onClick={nextStep} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300">
          {t('step2.actions.next')}
        </button>
      </div>

      {/* Regenerate Options Modal */}
      <RegenerateOptionsModal
        isOpen={regenerateModal.isOpen}
        onClose={() => setRegenerateModal({ isOpen: false, fieldName: null, fieldLabel: '' })}
        onConfirm={handleRegenerateConfirm}
        sceneName={regenerateModal.fieldLabel}
        hasEdits={
          regenerateModal.fieldName === 'all'
            ? !!(scriptData.bigIdea || scriptData.premise || scriptData.theme || scriptData.logLine || scriptData.synopsis)
            : regenerateModal.fieldName === 'timeline'
              ? !!(scriptData.timeline.movieTiming || scriptData.timeline.seasons || scriptData.timeline.date || scriptData.timeline.social || scriptData.timeline.economist || scriptData.timeline.environment)
              : !!(scriptData as any)[regenerateModal.fieldName || '']
        }
      />
    </div>
  );
};

export default Step2Boundary;
