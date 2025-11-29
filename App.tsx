
import React, { useState, useEffect } from 'react';
import type { ScriptData, Character, GeneratedScene, ProjectMetadata, ProjectType, DialogueLine } from './types';
import { INITIAL_SCRIPT_DATA, PROJECT_TYPES, EMPTY_CHARACTER } from './constants';
import StepIndicator from './components/StepIndicator';
import Step1Genre from './components/Step1Genre';
import Step2Boundary from './components/Step2Boundary';
import Step3Character from './components/Step3Character';
import Step4Structure from './components/Step4Structure';
import Step5Output from './components/Step5Output';
import Studio from './components/Studio';
import TeamManager from './components/TeamManager';
import AuthPage from './components/AuthPage';
import { api } from './services/api';
import { parseDocumentToScript } from './services/geminiService';

// --- DATA SANITIZATION HELPERS ---
const sanitizeGeneratedScenes = (scenesMap: Record<string, GeneratedScene[]>): Record<string, GeneratedScene[]> => {
    const newMap: Record<string, GeneratedScene[]> = {};
    Object.entries(scenesMap).forEach(([key, scenes]) => {
        newMap[key] = scenes.map(scene => {
            const situations = scene.sceneDesign.situations.map(sit => {
                let newDialogue: DialogueLine[] = [];
                if (Array.isArray(sit.dialogue)) {
                    newDialogue = sit.dialogue.map(d => ({
                        character: d.character || '',
                        dialogue: d.dialogue || '',
                        id: d.id || `dlg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }));
                } else if (typeof sit.dialogue === 'object' && sit.dialogue !== null) {
                    newDialogue = Object.entries(sit.dialogue as Record<string, string>).map(([char, text], idx) => ({
                        id: `migrated-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
                        character: char,
                        dialogue: text
                    }));
                }
                return { ...sit, dialogue: newDialogue };
            });

            // Ensure shotList has new fields
            const shotList = (scene.shotList || []).map(shot => ({
                ...shot,
                cast: shot.cast || '',
                costume: shot.costume || '',
                set: shot.set || ''
            }));

            return {
                ...scene,
                sceneDesign: { ...scene.sceneDesign, situations },
                characterOutfits: scene.characterOutfits || {}, // Initialize if missing
                shotList,
                storyboard: scene.storyboard || [] 
            };
        });
    });
    return newMap;
};

const sanitizeScriptData = (raw: any): ScriptData => {
    // Safely merge characters
    const mergedCharacters = (raw.characters && Array.isArray(raw.characters) && raw.characters.length > 0)
    ? raw.characters.map((savedChar: Partial<Character>, index: number) => ({
        ...EMPTY_CHARACTER,
        ...savedChar,
        id: (savedChar.id && savedChar.id !== 'default-character') 
            ? savedChar.id 
            : `char-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        external: { ...EMPTY_CHARACTER.external, ...(savedChar.external || {}) },
        physical: { ...EMPTY_CHARACTER.physical, ...(savedChar.physical || {}) },
        fashion: { ...EMPTY_CHARACTER.fashion, ...(savedChar.fashion || {}) },
        internal: {
            ...EMPTY_CHARACTER.internal,
            ...(savedChar.internal || {}),
            consciousness: { ...EMPTY_CHARACTER.internal.consciousness, ...(savedChar.internal?.consciousness || {}) },
            subconscious: { ...EMPTY_CHARACTER.internal.subconscious, ...(savedChar.internal?.subconscious || {}) },
            defilement: { ...EMPTY_CHARACTER.internal.defilement, ...(savedChar.internal?.defilement || {}) },
        },
        goals: { ...EMPTY_CHARACTER.goals, ...(savedChar.goals || {}) },
    }))
    : [{ ...EMPTY_CHARACTER, id: `char-${Date.now()}-0-${Math.random().toString(36).substr(2, 5)}` }];

    // Safely merge structure (if partial)
    let mergedStructure = INITIAL_SCRIPT_DATA.structure;
    if (raw.structure && Array.isArray(raw.structure) && raw.structure.length > 0) {
        // Try to map extracted points to the 9-point structure
        mergedStructure = INITIAL_SCRIPT_DATA.structure.map(defaultPoint => {
            const found = raw.structure.find((p: any) => p.title === defaultPoint.title);
            return found ? { ...defaultPoint, description: found.description } : defaultPoint;
        });
    }

    return {
        ...INITIAL_SCRIPT_DATA,
        ...raw,
        characters: mergedCharacters,
        structure: mergedStructure,
        timeline: { ...INITIAL_SCRIPT_DATA.timeline, ...(raw.timeline || {}) },
        scenesPerPoint: { ...INITIAL_SCRIPT_DATA.scenesPerPoint, ...(raw.scenesPerPoint || {}) },
        generatedScenes: sanitizeGeneratedScenes({ ...INITIAL_SCRIPT_DATA.generatedScenes, ...(raw.generatedScenes || {}) }),
        team: raw.team || [],
        posterImage: raw.posterImage || undefined,
    };
};

// --- FILE PARSING HELPERS ---
const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

const readArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

const extractTextFromDocx = async (file: File): Promise<string> => {
    if (!window.mammoth) throw new Error("Mammoth library not loaded");
    try {
        const arrayBuffer = await readArrayBuffer(file);
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (e) {
        console.error("Docx Extraction Error:", e);
        throw new Error("Failed to read DOCX file. The file might be corrupted or complex.");
    }
};

const extractTextFromPdf = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) throw new Error("PDF.js library not loaded");
    try {
        const arrayBuffer = await readArrayBuffer(file);
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
        }
        return fullText;
    } catch (e) {
        console.error("PDF Extraction Error:", e);
        throw new Error("Failed to read PDF file.");
    }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [view, setView] = useState<'studio' | 'editor'>('studio');
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  const [scriptData, setScriptData] = useState<ScriptData>(INITIAL_SCRIPT_DATA);
  const [currentStep, setCurrentStep] = useState(1);
  const [saveFeedback, setSaveFeedback] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('Processing...');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isTeamManagerOpen, setIsTeamManagerOpen] = useState(false);

  const [history, setHistory] = useState<ScriptData[]>([]);
  const [redoStack, setRedoStack] = useState<ScriptData[]>([]);

  // Navigation state for targeting specific characters across steps
  const [targetCharId, setTargetCharId] = useState<string | null>(null);
  const [returnToStep, setReturnToStep] = useState<number | null>(null);
  const [returnToScene, setReturnToScene] = useState<{ pointTitle: string; sceneIndex: number } | null>(null);

  useEffect(() => {
      const initApp = async () => {
          let keySelected = false;
          if (window.aistudio && window.aistudio.hasSelectedApiKey) {
              keySelected = await window.aistudio.hasSelectedApiKey();
          } else {
              keySelected = true;
          }
          setHasApiKey(keySelected);

          const token = localStorage.getItem('peace_token');
          const username = localStorage.getItem('peace_username');
          const isOffline = api.isOffline();

          if (isOffline) {
              setIsAuthenticated(true);
              setCurrentUser('Guest (Offline)');
              await loadCloudProjects();
          } else if (token && username) {
              setIsAuthenticated(true);
              setCurrentUser(username);
              await loadCloudProjects();
          } else {
              setIsAuthenticated(false);
          }
          setIsLoadingAuth(false);
      };
      initApp();
  }, []);

  const handleSelectApiKey = async () => {
      if (window.aistudio && window.aistudio.openSelectKey) {
          try {
              await window.aistudio.openSelectKey();
              const hasKey = await window.aistudio.hasSelectedApiKey();
              if (hasKey) setHasApiKey(true);
              else alert("You must select a paid API key.");
          } catch (e: any) {
              if (e.message && e.message.includes("Requested entity was not found")) {
                  alert("Project not found. Please try selecting the key again.");
                  if (window.aistudio) await window.aistudio.openSelectKey();
              } else console.error(e);
          }
      }
  };

  const loadCloudProjects = async () => {
      try {
          const cloudProjects = await api.getProjects();
          setProjects(cloudProjects);
      } catch (e) {
          console.error("Failed to load projects", e);
          if (!api.isOffline()) setProjects([]);
      }
  };

  const handleLoginSuccess = (username: string) => {
      setIsAuthenticated(true);
      setCurrentUser(username);
      loadCloudProjects();
  };

  const handleLogout = () => {
      localStorage.removeItem('peace_token');
      localStorage.removeItem('peace_username');
      api.setOfflineMode(false);
      setIsAuthenticated(false);
      setCurrentUser('');
      setProjects([]);
  };

  const registerUndo = () => {
      setHistory(prev => {
          const newHist = [...prev, JSON.parse(JSON.stringify(scriptData))];
          if (newHist.length > 10) newHist.shift(); 
          return newHist;
      });
      setRedoStack([]);
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      const previousState = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(scriptData))]);
      setScriptData(previousState);
      setHistory(newHistory);
      setSaveFeedback('Undone!');
      setTimeout(() => setSaveFeedback(''), 1500);
  };

  const handleRedo = () => {
      if (redoStack.length === 0) return;
      const nextState = redoStack[redoStack.length - 1];
      const newRedoStack = redoStack.slice(0, -1);
      setHistory(prev => [...prev, JSON.parse(JSON.stringify(scriptData))]);
      setScriptData(nextState);
      setRedoStack(newRedoStack);
      setSaveFeedback('Redone!');
      setTimeout(() => setSaveFeedback(''), 1500);
  };

  const handleCreateProject = async (title: string, type: ProjectType) => {
    try {
        const newData: ScriptData = { ...INITIAL_SCRIPT_DATA, title, projectType: type };
        const newId = await api.createProject(title, type, newData);
        newData.id = newId;
        await loadCloudProjects();
        setScriptData(newData);
        setCurrentProjectId(newId);
        setHistory([]);
        setRedoStack([]);
        setCurrentStep(1);
        
        // Clear nav context on new project
        setTargetCharId(null);
        setReturnToStep(null);
        setReturnToScene(null);

        setView('editor');
        window.scrollTo(0, 0);
    } catch (e) {
        alert("Failed to create project.");
        console.error(e);
    }
  };

  const handleOpenProject = async (id: string) => {
      setIsUploading(true);
      setUploadStatusText("Loading Project...");
      try {
          const data = await api.getProjectById(id);
          const sanitized = sanitizeScriptData(data);
          setScriptData(sanitized);
          setCurrentProjectId(id);
          setHistory([]);
          setRedoStack([]);
          
          // Clear nav context when opening project
          setTargetCharId(null);
          setReturnToStep(null);
          setReturnToScene(null);

          if (Object.keys(sanitized.generatedScenes).some(k => sanitized.generatedScenes[k].length > 0)) setCurrentStep(5);
          else if (sanitized.structure.some(p => p.description)) setCurrentStep(4);
          else if (sanitized.characters.length > 1 || sanitized.characters[0].name !== 'Protagonist') setCurrentStep(3);
          else setCurrentStep(1);
          setView('editor');
          window.scrollTo(0, 0);
      } catch (e) {
          alert("Failed to load project.");
          console.error(e);
      } finally {
          setIsUploading(false);
      }
  };

  const handleDeleteProject = async (id: string) => {
      try {
          await api.deleteProject(id);
          await loadCloudProjects();
      } catch (e) {
          alert("Failed to delete project.");
      }
  };

  const handleImportProject = async (file: File) => {
      // Define limits
      const JSON_LIMIT = 200 * 1024 * 1024; // 200MB for Backups
      const DOC_LIMIT = 10 * 1024 * 1024;   // 10MB for Docs

      const isJson = file.name.toLowerCase().endsWith('.json');
      const limit = isJson ? JSON_LIMIT : DOC_LIMIT;

      if (file.size > limit) {
          const limitLabel = isJson ? '200MB' : '10MB';
          alert(`File is too large. ${isJson ? 'JSON Backup files' : 'Documents'} must be smaller than ${limitLabel}.`);
          return;
      }
      
      setIsUploading(true);
      setUploadStatusText("Analyzing File...");
      try {
          let projectData: Partial<ScriptData> = {};
          if (file.name.endsWith('.json')) {
              const text = await readTextFile(file);
              projectData = JSON.parse(text);
          } else {
              let rawText = "";
              if (file.name.endsWith('.docx')) rawText = await extractTextFromDocx(file);
              else if (file.name.endsWith('.pdf')) rawText = await extractTextFromPdf(file);
              else rawText = await readTextFile(file);
              
              if (rawText.length < 10) throw new Error("File appears empty or could not be read.");
              
              setUploadStatusText("AI is structuring your script (Step 1/3)...");
              projectData = await parseDocumentToScript(rawText);
          }
          const newData = sanitizeScriptData(projectData);
          const pType: ProjectType = newData.projectType || 'Movie';
          const title = newData.title || file.name.replace(/\.[^/.]+$/, "");
          await api.createProject(title, pType, newData);
          await loadCloudProjects();
          alert("Project imported successfully!");
      } catch (e: any) {
          console.error(e);
          alert(`Import failed: ${e.message}`);
      } finally {
          setIsUploading(false);
          setUploadStatusText("Processing...");
      }
  };

  const handleExportProjectFromStudio = async (id: string) => {
      try {
          const data = await api.getProjectById(id);
          const jsonString = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `PeaceScript_${data.title.replace(/\s+/g, '_')}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (e) {
          alert("Failed to export project.");
          console.error(e);
      }
  };

  const handleBackToStudio = async () => {
      if (currentProjectId) await api.updateProject(currentProjectId, scriptData);
      setView('studio');
      setCurrentProjectId(null);
      await loadCloudProjects();
  };

  const saveCurrentProject = async (data: ScriptData): Promise<boolean> => {
      if (!data.id) return false;
      try {
          await api.updateProject(data.id, data);
          return true;
      } catch (e: any) {
          console.error("Auto-save failed", e);
          setSaveFeedback(e.message || "Error saving!");
          return false;
      }
  };

  useEffect(() => {
    if (view !== 'editor' || !currentProjectId) return;
    const timeoutId = setTimeout(() => {
        saveCurrentProject(scriptData);
        setIsAutoSaving(true);
        setTimeout(() => setIsAutoSaving(false), 2000);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [scriptData, view, currentProjectId]);

  const totalSteps = 5;
  // Navigation: Always scroll to top when changing steps
  // UPDATED: Now clears special navigation context by default unless 'preserveContext' is true
  const goToStep = (step: number, options?: { preserveContext?: boolean }) => {
      if (!options?.preserveContext) {
          setReturnToStep(null);
          setTargetCharId(null);
          setReturnToScene(null);
      }
      setCurrentStep(step);
      window.scrollTo(0, 0);
  };
  const nextStep = () => goToStep(Math.min(currentStep + 1, totalSteps));
  const prevStep = () => goToStep(Math.max(currentStep - 1, 1));

  // New function to handle specific character navigation with Return Capability AND Scene Context
  const handleNavigateToCharacter = (charName: string, fromStep?: number, sceneContext?: { pointTitle: string; sceneIndex: number }) => {
      const foundChar = scriptData.characters.find(c => c.name === charName || c.name.includes(charName));
      if (foundChar) {
          setTargetCharId(foundChar.id);
          if (fromStep) {
              setReturnToStep(fromStep);
          }
          if (sceneContext) {
              setReturnToScene(sceneContext);
          }
          // Preserve context so we don't immediately clear what we just set
          goToStep(3, { preserveContext: true });
      } else {
          // Fallback if ID finding fails
          goToStep(3);
      }
  };

  const handleReturnToOrigin = () => {
      if (returnToStep) {
          // Keep returnToScene so Step 5 can scroll, but clear returnToStep/targetCharId to exit "Back" mode
          goToStep(returnToStep, { preserveContext: true });
          
          setReturnToStep(null);
          setTargetCharId(null);
          // returnToScene is consumed by Step 5 on mount/update
      }
  };

  const updateScriptData = (data: Partial<ScriptData>) => {
    setScriptData(prev => ({ ...prev, ...data }));
  };

  const handleManualSave = async () => {
      const success = await saveCurrentProject(scriptData);
      if (success) {
          setSaveFeedback(api.isOffline() ? 'Saved Locally!' : 'Saved to Cloud!');
          setTimeout(() => setSaveFeedback(''), 2000);
      }
  };

  const handleExportBackup = () => {
    const jsonString = JSON.stringify(scriptData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PeaceScript_${scriptData.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoadingAuth) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-400">Loading Peace Script...</div>;

  if (!hasApiKey) {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
              <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md text-center">
                  <h1 className="text-2xl font-bold text-white mb-3">API Key Required</h1>
                  <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                      Peace Script uses Google&apos;s advanced Veo model. Each user must select their own API key.
                  </p>
                  <button onClick={handleSelectApiKey} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg shadow-lg transition-all">
                      Select API Key to Continue
                  </button>
              </div>
          </div>
      );
  }

  if (!isAuthenticated) return <AuthPage onLoginSuccess={handleLoginSuccess} />;

  if (view === 'studio') {
      return (
          <>
            {isUploading && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <div className="text-white font-bold animate-pulse text-lg">{uploadStatusText}</div>
                        <p className="text-gray-400 text-sm mt-2">Do not close this window</p>
                    </div>
                </div>
            )}
            <div className="bg-gray-900 border-b border-gray-800 px-8 py-2 flex justify-end items-center text-xs text-gray-500 gap-4">
                <span className="flex items-center gap-2">
                    {api.isOffline() && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Offline Mode"></span>}
                    Logged in as <strong className="text-cyan-500">{currentUser}</strong>
                </span>
                <button onClick={handleLogout} className="hover:text-white transition-colors">Logout</button>
            </div>
            <Studio projects={projects} onCreateProject={handleCreateProject} onOpenProject={handleOpenProject} onDeleteProject={handleDeleteProject} onImportProject={handleImportProject} onExportProject={handleExportProjectFromStudio} />
          </>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-cyan-500 selection:text-white">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={handleBackToStudio} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold uppercase tracking-wide transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                 Studio
             </button>
             <div className="h-6 w-px bg-gray-600"></div>
             <h1 className="text-lg font-bold text-white tracking-wider truncate max-w-[200px] sm:max-w-md">
                 {scriptData.title}
                 <span className="ml-2 text-xs text-cyan-500 bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-900/50 hidden sm:inline-block">
                     {PROJECT_TYPES.find(t => t.value === scriptData.projectType)?.label.split('(')[0]}
                 </span>
             </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
             
             {/* GLOBAL ACTIONS (Moved from bottom) */}
             <button 
                onClick={handleManualSave}
                className="flex items-center gap-1 px-3 py-1.5 rounded transition-all bg-green-900/30 hover:bg-green-700 text-green-400 hover:text-white border border-green-800"
                title="Force Save (Cloud/Local)"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" /></svg>
                <span className="text-xs font-bold hidden sm:inline">Save</span>
             </button>
             <button 
                onClick={handleExportBackup}
                className="flex items-center gap-1 px-3 py-1.5 rounded transition-all bg-blue-900/30 hover:bg-blue-700 text-blue-400 hover:text-white border border-blue-800"
                title="Export Local JSON Backup"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                <span className="text-xs font-bold hidden sm:inline">Backup</span>
             </button>

             <div className="h-6 w-px bg-gray-600 mx-2"></div>

             <button onClick={handleUndo} disabled={history.length === 0} className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all ${history.length > 0 ? 'bg-gray-700 hover:bg-gray-600 text-cyan-400 hover:text-cyan-300 shadow-md' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`} title="Undo"><span className="text-xs font-bold hidden sm:inline">Undo</span></button>
             <button onClick={handleRedo} disabled={redoStack.length === 0} className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all ${redoStack.length > 0 ? 'bg-gray-700 hover:bg-gray-600 text-cyan-400 hover:text-cyan-300 shadow-md' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`} title="Redo"><span className="text-xs font-bold hidden sm:inline">Redo</span></button>
             <button onClick={() => setIsTeamManagerOpen(true)} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors">
                 <span className="hidden sm:inline">Crew</span>
             </button>
             <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 py-1 px-3 rounded-full border border-gray-700">
                <span className={`w-2 h-2 rounded-full ${isAutoSaving ? 'bg-yellow-400 animate-pulse' : (api.isOffline() ? 'bg-orange-500' : 'bg-green-500')}`}></span>
                <span className="hidden sm:inline">{isAutoSaving ? 'Saving...' : (api.isOffline() ? 'Local Save' : 'Cloud Save')}</span>
             </div>
             <select value={scriptData.language} onChange={(e) => updateScriptData({ language: e.target.value as 'Thai' | 'English' })} className="bg-gray-700 text-white text-sm rounded-md border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 py-1 pl-2 pr-6">
                <option value="Thai">🇹🇭 TH</option>
                <option value="English">🇺🇸 EN</option>
             </select>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8"><StepIndicator currentStep={currentStep} totalSteps={totalSteps} onStepClick={(step) => goToStep(step)} /></div>
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden relative min-h-[500px]">
           <div className="p-6 sm:p-8">
            {currentStep === 1 && <Step1Genre scriptData={scriptData} updateScriptData={updateScriptData} nextStep={nextStep} setScriptData={setScriptData} setCurrentStep={(step) => goToStep(step)} onRegisterUndo={registerUndo} />}
            {currentStep === 2 && <Step2Boundary scriptData={scriptData} updateScriptData={updateScriptData} nextStep={nextStep} prevStep={prevStep} onRegisterUndo={registerUndo} />}
            {currentStep === 3 && (
                <Step3Character 
                    scriptData={scriptData} 
                    setScriptData={setScriptData} 
                    nextStep={nextStep} 
                    prevStep={prevStep} 
                    onRegisterUndo={registerUndo} 
                    targetCharId={targetCharId} 
                    onResetTargetCharId={() => setTargetCharId(null)}
                    returnToStep={returnToStep}
                    onReturnToOrigin={handleReturnToOrigin}
                />
            )}
            {currentStep === 4 && <Step4Structure scriptData={scriptData} setScriptData={setScriptData} nextStep={nextStep} prevStep={prevStep} onRegisterUndo={registerUndo} />}
            {currentStep === 5 && (
                <Step5Output 
                    scriptData={scriptData} 
                    setScriptData={setScriptData} 
                    prevStep={prevStep} 
                    onRegisterUndo={registerUndo} 
                    goToStep={goToStep} 
                    onNavigateToCharacter={handleNavigateToCharacter}
                    returnToScene={returnToScene}
                    onResetReturnToScene={() => setReturnToScene(null)}
                />
            )}
           </div>
        </div>
        {saveFeedback && <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-fade-in-scene ${saveFeedback.includes('Error') ? 'bg-red-600' : 'bg-green-600'}`}>{saveFeedback}</div>}
        {isTeamManagerOpen && <TeamManager scriptData={scriptData} setScriptData={setScriptData} onClose={() => setIsTeamManagerOpen(false)} />}
      </main>
      <footer className="max-w-5xl mx-auto px-6 py-8 text-center text-gray-600 text-sm"><p>&copy; {new Date().getFullYear()} Peace Script AI. Empowering Storytellers.</p></footer>
    </div>
  );
}

export default App;
