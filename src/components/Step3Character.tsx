import React, { useState, useEffect, useRef } from 'react';
import type { ScriptData, Character, GeneratedScene, DialectType, AccentType, FormalityLevel, SpeechPersonality } from '../../types';
import {
  generateCharacterDetails,
  fillMissingCharacterDetails,
  generateCharacterImage,
  generateCostumeImage,
  generateAllCharactersFromStory,
} from '../services/geminiService';
import { EMPTY_CHARACTER, CHARACTER_IMAGE_STYLES, CHARACTER_ROLES, DIALECT_PRESETS, ACCENT_PATTERNS, FORMALITY_LABELS, PERSONALITY_LABELS } from '../../constants';
import { PsychologyTestPanel } from './PsychologyTestPanel';
import { PsychologyDisplay } from './PsychologyDisplay';
import { PsychologyDashboard } from './PsychologyDashboard';
import { CharacterComparison } from './CharacterComparison';
import { PsychologyTimeline } from './PsychologyTimeline';
import { HybridTTSService } from '../services/hybridTTSService';
import type { GenerationMode } from '../services/comfyuiWorkflowBuilder';

interface Step3CharacterProps {
  scriptData: ScriptData;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  nextStep: () => void;
  prevStep: () => void;
  onRegisterUndo?: () => void;
  targetCharId?: string | null;
  onResetTargetCharId?: () => void;
  returnToStep?: number | null;
  onReturnToOrigin?: () => void;
  autoOpenPsychology?: boolean;
  onResetAutoOpenPsychology?: () => void;
}

const InfoField: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'textarea' | 'number';
  onFocus?: () => void;
  compact?: boolean;
}> = ({ label, value, onChange, type = 'text', onFocus, compact = false }) => {
  // Ensure value is never null/undefined for controlled inputs
  const safeValue = value ?? (type === 'number' ? 0 : '');

  return (
    <div className={compact ? 'mb-1' : 'mb-3'}>
      <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase tracking-wide truncate">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={safeValue}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          rows={compact ? 1 : 2}
          className={`w-full bg-gray-900 border border-gray-600 rounded-md py-1.5 px-2 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 ${compact ? 'leading-tight' : ''}`}
        />
      ) : type === 'number' ? (
        <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded border border-gray-700">
          <input
            type="range"
            min="0"
            max="100"
            value={safeValue}
            onChange={e => onChange(e.target.value)}
            onFocus={onFocus}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="font-mono text-cyan-400 w-6 text-right font-bold text-xs">
            {safeValue}
          </span>
        </div>
      ) : (
        <input
          type="text"
          value={safeValue}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          className="w-full bg-gray-900 border border-gray-600 rounded-md py-1.5 px-2 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
        />
      )}
    </div>
  );
};

const Step3Character: React.FC<Step3CharacterProps> = ({
  scriptData,
  setScriptData,
  nextStep,
  prevStep,
  onRegisterUndo,
  targetCharId,
  onResetTargetCharId,
  returnToStep,
  onReturnToOrigin,
  autoOpenPsychology,
  onResetAutoOpenPsychology,
}) => {
  // i18n helper
  const t = (th: string, en: string) => (scriptData.language === 'Thai' ? th : en);

  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [showPsychologyTimeline, setShowPsychologyTimeline] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Main Tabs
  const [activeTab, setActiveTab] = useState<'external' | 'internal' | 'goals'>('external');

  // Sub Tabs
  const [externalSubTab, setExternalSubTab] = useState<'info' | 'physical' | 'speech' | 'costume'>('info');
  const [internalSubTab, setInternalSubTab] = useState<'consciousness' | 'subconscious'>(
    'consciousness'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(false);
  const [isCostumeLoading, setIsCostumeLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('balanced'); // BALANCED recommended for Mac stability

  const [error, setError] = useState<string | null>(null);
  const [fillEmptyOnly, setFillEmptyOnly] = useState(false);
  const [keepExistingCharacters, setKeepExistingCharacters] = useState(false);

  // Psychology Test Panel State
  const [showPsychologyTest, setShowPsychologyTest] = useState(false);
  const [showCharacterComparison, setShowCharacterComparison] = useState(false);
  const [showPsychologyDashboard, setShowPsychologyDashboard] = useState(false);

  // New state for robust delete confirmation
  const [confirmDeleteCharId, setConfirmDeleteCharId] = useState<string | null>(null);

  // Profile Image Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // Costume Reference Input
  const costumeRefInputRef = useRef<HTMLInputElement>(null);

  // Costume Preview State (Fitting Room)
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState<number | null>(null);

  // Ensure characters array is never empty for rendering
  const characters =
    scriptData.characters.length > 0
      ? scriptData.characters
      : [{ ...EMPTY_CHARACTER, id: 'init-char' }];

  // Safe access to active character with fallback
  const activeCharacter = characters[activeCharIndex] ||
    characters[0] || { ...EMPTY_CHARACTER, id: 'fallback-char' };

  // --- NAVIGATION HANDLER ---
  // If targetCharId is passed (from Step 5), switch to that character immediately
  useEffect(() => {
    if (targetCharId && characters.length > 0) {
      const index = characters.findIndex(c => c.id === targetCharId);
      if (index !== -1) {
        setActiveCharIndex(index);
        // Also ensure we are on a relevant tab to see details
        if (activeTab === 'external' && externalSubTab === 'costume') {
          // Keep costume tab if already there
        } else {
          // Default to external info
          setActiveTab('external');
          setExternalSubTab('info');
        }
        // Scroll to top of the page smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Reset the target so user can navigate freely afterwards
        if (onResetTargetCharId) onResetTargetCharId();
      }
    }
  }, [targetCharId, characters, onResetTargetCharId, activeTab, externalSubTab]);

  // Fallback effect: If data changes externally (e.g. import) and index is out of bounds, reset it.
  // Also AUTO-SELECT the first outfit (Latest) when switching characters.
  useEffect(() => {
    if (activeCharIndex >= characters.length) {
      setActiveCharIndex(Math.max(0, characters.length - 1));
    }

    // Auto-select the first (latest) outfit if the character has a collection
    const currentChar = characters[activeCharIndex < characters.length ? activeCharIndex : 0];
    if (currentChar && currentChar.outfitCollection && currentChar.outfitCollection.length > 0) {
      setSelectedOutfitIndex(0); // Default to the first picture (Latest)
    } else {
      setSelectedOutfitIndex(null);
    }
  }, [characters.length, activeCharIndex]);

  // Auto-open Psychology Timeline when navigated from Step 5 Modal
  useEffect(() => {
    if (autoOpenPsychology && activeCharacter && scriptData.psychologyTimelines?.[activeCharacter.id]) {
      setShowPsychologyTimeline(true);
      setActiveTab('internal');
      setInternalSubTab('consciousness');
      if (onResetAutoOpenPsychology) {
        onResetAutoOpenPsychology();
      }
    }
  }, [autoOpenPsychology, activeCharacter, scriptData.psychologyTimelines, onResetAutoOpenPsychology]);

  const updateCharacterAtIndex = (index: number, updatedFields: Partial<Character>) => {
    setScriptData(prev => {
      const newChars = [...prev.characters];
      if (!newChars[index]) return prev;
      newChars[index] = { ...newChars[index], ...updatedFields };
      return { ...prev, characters: newChars };
    });
  };

  // Helper to find where outfits are used in the script
  const getOutfitUsage = (outfitId: string): string[] => {
    if (!outfitId) return [];
    const usage: string[] = [];
    Object.values(scriptData.generatedScenes).forEach(scenes => {
      if (Array.isArray(scenes)) {
        (scenes as GeneratedScene[]).forEach(scene => {
          if (scene.characterOutfits) {
            const values = Object.values(scene.characterOutfits);
            if (values.includes(outfitId)) {
              usage.push(`Scene ${scene.sceneNumber}`);
            }
          }
          // Also check shot list overrides
          if (scene.shotList) {
            scene.shotList.forEach(shot => {
              if (shot.costume === outfitId) {
                if (!usage.includes(`Scene ${scene.sceneNumber}`)) {
                  usage.push(`Scene ${scene.sceneNumber}`);
                }
              }
            });
          }
        });
      }
    });
    return usage;
  };

  const handleAddCharacter = () => {
    if (onRegisterUndo) onRegisterUndo();
    const newChar: Character = {
      ...EMPTY_CHARACTER,
      name: `New Character ${characters.length + 1}`,
      id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Ensure ID on creation
    };
    setScriptData(prev => ({
      ...prev,
      characters: [...prev.characters, newChar],
    }));
    // Explicitly set index to the new last element
    setActiveCharIndex(characters.length);
  };

  const handleRemoveCharacter = (idToRemove: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();

    if (characters.length <= 1) {
      alert(
        scriptData.language === 'Thai'
          ? 'ต้องมีตัวละครอย่างน้อย 1 ตัว'
          : 'You must have at least one character.'
      );
      return;
    }

    // Fallback: If no ID provided (legacy data), try to remove by active index
    const targetId = idToRemove || characters[activeCharIndex]?.id;
    if (!targetId) return;

    if (confirmDeleteCharId === targetId) {
      // Confirmed Delete
      // Register UNDO point before deleting
      if (onRegisterUndo) onRegisterUndo();

      const indexToRemove = characters.findIndex(c => c.id === targetId);

      // Calculate new index before removal to avoid out of bounds
      let nextActiveIndex = activeCharIndex;
      if (indexToRemove === activeCharIndex) {
        nextActiveIndex = Math.max(0, indexToRemove - 1);
      } else if (indexToRemove < activeCharIndex) {
        nextActiveIndex = activeCharIndex - 1;
      }

      setScriptData(prev => {
        const newChars = prev.characters.filter(c => c.id !== targetId);
        return { ...prev, characters: newChars };
      });

      setActiveCharIndex(nextActiveIndex);
      setConfirmDeleteCharId(null);
    } else {
      // First click - Wait for confirmation
      setConfirmDeleteCharId(targetId);
      setTimeout(() => setConfirmDeleteCharId(null), 3000); // Reset after 3 seconds
    }
  };

  const handleFieldChange = <T extends 'external' | 'physical' | 'goals' | 'fashion'>(
    section: T,
    field: keyof Character[T],
    value: any
  ) => {
    const updatedSection = { ...activeCharacter[section], [field]: value };
    updateCharacterAtIndex(activeCharIndex, { [section]: updatedSection } as Partial<Character>);
  };

  const handleNestedFieldChange = (
    section: 'internal',
    subSection: 'consciousness' | 'subconscious' | 'defilement',
    field: string,
    value: any
  ) => {
    const updatedSubSection = { ...activeCharacter[section][subSection], [field]: value };
    const updatedSection = { ...activeCharacter[section], [subSection]: updatedSubSection };
    updateCharacterAtIndex(activeCharIndex, { [section]: updatedSection });
  };

  const handleGenerateClick = async () => {
    if (onRegisterUndo) onRegisterUndo();
    setIsLoading(true);
    setError(null);
    try {
      let updatedCharacter: Character;

      if (fillEmptyOnly) {
        updatedCharacter = await fillMissingCharacterDetails(activeCharacter, scriptData.language);
      } else {
        const aiCharacterData = await generateCharacterDetails(
          activeCharacter.name,
          activeCharacter.role,
          activeCharacter.description,
          scriptData.language
        );
        updatedCharacter = {
          ...activeCharacter,
          // Merge AI data with existing structure to preserve any fields not returned by AI (safety)
          external: { ...activeCharacter.external, ...(aiCharacterData.external || {}) },
          physical: { ...activeCharacter.physical, ...(aiCharacterData.physical || {}) },
          fashion: { ...activeCharacter.fashion, ...(aiCharacterData.fashion || {}) },
          internal: {
            ...activeCharacter.internal,
            consciousness: {
              ...activeCharacter.internal.consciousness,
              ...(aiCharacterData.internal?.consciousness || {}),
            },
            subconscious: {
              ...activeCharacter.internal.subconscious,
              ...(aiCharacterData.internal?.subconscious || {}),
            },
            defilement: {
              ...activeCharacter.internal.defilement,
              ...(aiCharacterData.internal?.defilement || {}),
            },
          },
          goals: { ...activeCharacter.goals, ...(aiCharacterData.goals || {}) },
        };
      }

      updateCharacterAtIndex(activeCharIndex, updatedCharacter);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate ALL characters from Story (Step 1-2)
  const handleGenerateAllCharacters = async () => {
    const hasExistingCharacters = characters.length > 0 && characters.some(
      char => char.name && char.name !== 'Character Name' && !char.name.startsWith('New Character')
    );

    // Determine mode based on checkbox
    const mode: 'replace' | 'add' = keepExistingCharacters ? 'add' : 'replace';

    // Confirmation dialogs
    if (keepExistingCharacters && hasExistingCharacters) {
      // ADD MODE: Keep existing + analyze to create compatible new characters
      const confirmAdd = confirm(
        `🎭 ${t('สร้างตัวละครเพิ่มเติม', 'Generate Additional Characters')}\n\n` +
          `${t('AI จะวิเคราะห์:', 'AI will analyze:')}\n` +
          `• ${t('ตัวละครเดิม', 'Existing characters')}: ${characters.length} ${t('ตัว', 'characters')}\n` +
          `• ${t('ข้อมูลจาก Step 1-3', 'Data from Step 1-3')}\n\n` +
          `${t('เพื่อสร้างตัวละครใหม่ที่สอดคล้องกับเรื่องและตัวเดิม', 'To create new characters that complement the story and existing cast')}\n\n` +
          `${t('ดำเนินการต่อ?', 'Continue?')}`
      );
      if (!confirmAdd) return;
    } else if (!keepExistingCharacters && hasExistingCharacters) {
      // REPLACE MODE: Delete all and create new
      const confirmReplace = confirm(
        `⚠️ ${t('สร้างใหม่ทั้งหมด', 'Replace All Characters')}\n\n` +
          `${t('ตัวละครเดิมทั้งหมด', 'All existing characters')} (${characters.length} ${t('ตัว', 'characters')}) ${t('จะถูกลบ', 'will be deleted')}\n` +
          `${t('และสร้างชุดใหม่ทั้งหมดจาก Step 1-2', 'and a new cast will be created from Step 1-2')}\n\n` +
          `${t('แน่ใจหรือไม่?', 'Are you sure?')}`
      );
      if (!confirmReplace) return;
    } else {
      // No existing characters, create new
      const confirmCreate = confirm(
        `🎭 ${t('สร้างตัวละครทั้งหมดจากเรื่องของคุณ?', 'Generate all characters from your story?')}\n\n` +
          `${t('AI จะวิเคราะห์เรื่องของคุณและสร้างตัวละครที่เหมาะสมอัตโนมัติ:', 'AI will analyze your story and automatically create appropriate characters:')}\n` +
          `• ${t('ชื่อเรื่อง', 'Title')}: ${scriptData.title || 'Untitled'}\n` +
          `• ${t('แนว', 'Genre')}: ${scriptData.mainGenre}\n` +
          `• ${t('เนื้อเรื่อง', 'Story')}: ${(scriptData.premise || scriptData.bigIdea || '').substring(0, 80)}...`
      );
      if (!confirmCreate) return;
    }

    if (onRegisterUndo) onRegisterUndo();
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(20);
      console.log(`🎭 Generating characters from story data (Mode: ${mode})...`);

      let newCharacters: Character[];

      if (mode === 'add' && hasExistingCharacters) {
        // Import the new function for intelligent character generation
        const { generateCompatibleCharacters } = await import('../services/geminiService');
        newCharacters = await generateCompatibleCharacters(scriptData, characters);
        console.log(`🧠 Generated ${newCharacters.length} compatible characters based on existing cast`);
      } else {
        newCharacters = await generateAllCharactersFromStory(scriptData);
        console.log(`✅ Generated ${newCharacters.length} new characters`);
      }

      setProgress(80);

      if (mode === 'add') {
        // ADD MODE: Keep existing + add new
        const combinedCharacters = [...characters, ...newCharacters];
        setScriptData(prev => ({ ...prev, characters: combinedCharacters }));
        setActiveCharIndex(characters.length); // Jump to first new character

        alert(
          `✅ ${t('เพิ่มตัวละครสำเร็จ', 'Successfully added characters')}!\n\n` +
            `${t('เดิม', 'Existing')}: ${characters.length} ${t('ตัว', 'characters')}\n` +
            `${t('ใหม่', 'New')}: ${newCharacters.length} ${t('ตัว', 'characters')}\n` +
            `${t('รวม', 'Total')}: ${combinedCharacters.length} ${t('ตัว', 'characters')}\n\n` +
            `${t('ตัวละครใหม่', 'New characters')}: ${newCharacters.map(c => c.name).join(', ')}`
        );
      } else {
        // REPLACE MODE: Replace all
        setScriptData(prev => ({ ...prev, characters: newCharacters }));
        setActiveCharIndex(0);

        alert(
          `✅ ${t('สร้างตัวละครสำเร็จ', 'Successfully created characters')} ${newCharacters.length} ${t('ตัว', 'characters')}!\n\n` +
            `${t('ตัวละคร', 'Characters')}: ${newCharacters.map(c => c.name).join(', ')}`
        );
      }

      setProgress(100);
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || t('ไม่สามารถสร้างตัวละครได้', 'Failed to generate characters'));
      console.error('Error generating characters:', e);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleGeneratePortrait = async () => {
    if (!activeCharacter.description && !activeCharacter.physical['Physical Characteristics']) {
      alert('Please enter a character description or physical details first.');
      return;
    }
    if (onRegisterUndo) onRegisterUndo();
    setIsImgLoading(true);
    setProgress(0);
    try {
      // Collect physical details for "Face Recognition" consistency (Fallback if no reference image)
      const facialFeatures = [
        activeCharacter.physical['Facial characteristics'],
        activeCharacter.physical['Eye characteristics'],
        activeCharacter.physical['Hair style'],
        activeCharacter.physical['Skin color'],
        activeCharacter.external['Date of Birth Age'],
        activeCharacter.physical['Gender'],
      ]
        .filter(Boolean)
        .join(', ');

      const fullDescription = `${activeCharacter.description}. ${activeCharacter.physical['Physical Characteristics'] || ''}`;

      const base64Image = await generateCharacterImage(
        fullDescription,
        activeCharacter.imageStyle || CHARACTER_IMAGE_STYLES[0],
        facialFeatures,
        activeCharacter.faceReferenceImage, // Pass master face reference
        p => setProgress(p), // Update progress state
        generationMode, // Pass selected mode
        activeCharacter.preferredModel // Pass preferred AI model
      );
      updateCharacterAtIndex(activeCharIndex, { image: base64Image });
    } catch (e) {
      alert('Failed to generate image.');
      console.error(e);
    } finally {
      setIsImgLoading(false);
      setProgress(0);
    }
  };

  const handleGenerateCostume = async () => {
    const mainOutfit = activeCharacter.fashion['Main Outfit'];
    if (!mainOutfit) {
      alert("Please describe the 'Main Outfit' in the Costume section first.");
      return;
    }
    if (onRegisterUndo) onRegisterUndo();

    setIsCostumeLoading(true);
    setProgress(0);
    try {
      const style = activeCharacter.imageStyle || CHARACTER_IMAGE_STYLES[0];

      // PRIORITY: Use Master Face Ref if available, otherwise use Profile Picture (image) if available
      // This ensures profile pics uploaded by users are used as the "Face ID"
      const referenceImage = activeCharacter.faceReferenceImage || activeCharacter.image;

      // Pass Costume Reference if available
      const costumeReference = activeCharacter.fashionReferenceImage;

      // ✅ COMPREHENSIVE DATA COLLECTION: Merge Information + Physical + Fashion
      const completeCharacterData = {
        // Information (external) - ข้อมูลพื้นฐาน
        ...activeCharacter.external,
        // Physical - ลักษณะทางกายภาพ
        ...activeCharacter.physical,
        // Fashion - ข้อมูลเสื้อผ้าและแฟชั่น
        ...activeCharacter.fashion,
      };

      // Show detailed debug info
      if (referenceImage) {
        console.log('🎯 Generating outfit with Face ID reference...');
        console.log(
          '📸 Reference image source:',
          activeCharacter.faceReferenceImage ? 'Face Reference' : 'Profile Picture'
        );
        console.log('🎨 Original style:', style);
        console.log('👤 Character:', activeCharacter.name);
        console.log('📋 Information:', activeCharacter.external);
        console.log('💪 Physical:', activeCharacter.physical);
        console.log('👔 Fashion Data:', activeCharacter.fashion);
        console.log('🎁 Complete Data:', completeCharacterData);
      } else {
        console.log('⚠️ No reference image available - generating without Face ID');
      }

      const base64Image = await generateCostumeImage(
        activeCharacter.name,
        mainOutfit,
        style,
        completeCharacterData, // ✅ ส่งข้อมูลครบทั้ง Information + Physical + Fashion
        referenceImage,
        costumeReference,
        p => setProgress(p), // Update progress state
        generationMode, // Pass selected generation mode
        activeCharacter.preferredModel // Pass preferred AI model
      );

      // Add to collection with ID
      const newOutfitId = `OTF-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const newOutfit = {
        id: newOutfitId,
        description: mainOutfit,
        image: base64Image,
      };
      const updatedCollection = [newOutfit, ...(activeCharacter.outfitCollection || [])];

      updateCharacterAtIndex(activeCharIndex, { outfitCollection: updatedCollection });
      // Auto-select the new image for preview
      setSelectedOutfitIndex(0);
    } catch (e: any) {
      // Parse error message
      const errorMsg = e?.message || 'Failed to generate costume image.';

      // Check if it's a timeout error
      if (errorMsg.includes('timeout') || errorMsg.includes('80 minutes')) {
        const trySpeedMode = window.confirm(
          '⏱️ Generation Timeout\n\n' +
            `Current mode: ${generationMode.toUpperCase()}\n\n` +
            '✅ Solutions:\n' +
            '1. Try SPEED MODE (15 steps, 3-5 min) - Faster, more stable\n' +
            '2. Try BALANCED MODE (20 steps, 4-6 min) - Recommended\n' +
            '3. Wait and try again later\n\n' +
            'Click OK to switch to SPEED MODE now, or Cancel to try later.'
        );

        if (trySpeedMode) {
          setGenerationMode('speed');
          alert("✅ Switched to SPEED MODE. Please click 'Generate Outfit' again.");
        }
      }
      // Check if it's Face ID limitation error
      else if (errorMsg.includes('Face ID matching requires')) {
        // Show user-friendly message with solutions
        const retryWithoutFaceID = window.confirm(
          '⚠️ Cannot generate outfit with Face ID\n\n' +
            "Gemini API quota exceeded. Pollinations.ai doesn't support Face ID matching.\n\n" +
            '✅ Solutions:\n' +
            '1. Wait 1 minute, then try again (Gemini quota resets)\n' +
            '2. Enable ComfyUI in AI Settings (top-right)\n' +
            '3. Try SPEED MODE for faster results\n' +
            "4. Generate without Face ID (won't match profile)\n\n" +
            'Click OK to generate without Face ID now, or Cancel to wait.'
        );

        if (retryWithoutFaceID) {
          // Retry generation without reference images
          try {
            const style = activeCharacter.imageStyle || CHARACTER_IMAGE_STYLES[0];
            const completePhysicalInfo = {
              ...activeCharacter.external,
              ...activeCharacter.physical,
            };

            console.log('🔄 Retrying without Face ID...');
            const completeCharacterData = {
              ...activeCharacter.external,
              ...activeCharacter.physical,
              ...activeCharacter.fashion,
            };
            const base64Image = await generateCostumeImage(
              activeCharacter.name,
              mainOutfit,
              style,
              completeCharacterData, // ✅ ส่งข้อมูลครบทั้ง Information + Physical + Fashion
              undefined, // No reference images passed
              undefined,
              p => setProgress(p),
              generationMode // Keep selected mode
            );

            const newOutfitId = `OTF-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const newOutfit = { id: newOutfitId, description: mainOutfit, image: base64Image };
            const updatedCollection = [newOutfit, ...(activeCharacter.outfitCollection || [])];
            updateCharacterAtIndex(activeCharIndex, { outfitCollection: updatedCollection });
            setSelectedOutfitIndex(0);
            console.log('✅ Generated without Face ID successfully');
            return; // Success - exit without showing error
          } catch (retryError: any) {
            const retryMsg = retryError?.message || 'Unknown error';
            // Only show alert if retry also failed
            if (!retryMsg.includes('Face ID matching requires')) {
              alert(`Retry failed: ${retryMsg}`);
            }
            console.error('Retry error:', retryError);
          } finally {
            setIsCostumeLoading(false);
            setProgress(0);
          }
        }
        // Don't show additional error message - user already saw the confirm dialog
      } else {
        // Generic error with mode suggestion
        const modeInfo =
          generationMode === 'quality'
            ? '\n\n💡 Tip: QUALITY MODE may crash on Mac. Try BALANCED or SPEED MODE.'
            : generationMode === 'balanced'
              ? '\n\n💡 Tip: If issues persist, try SPEED MODE for faster results.'
              : '';
        alert(`Failed to generate costume image.\n\n${errorMsg}${modeInfo}`);
        console.error('Costume generation error:', e);
      }
    } finally {
      setIsCostumeLoading(false);
      setProgress(0);
    }
  };

  const handleSetProfileFromOutfit = () => {
    if (
      selectedOutfitIndex !== null &&
      activeCharacter.outfitCollection &&
      activeCharacter.outfitCollection[selectedOutfitIndex]
    ) {
      if (onRegisterUndo) onRegisterUndo();
      const outfit = activeCharacter.outfitCollection[selectedOutfitIndex];
      updateCharacterAtIndex(activeCharIndex, { image: outfit.image });
      alert('Profile picture updated!');
    }
  };

  const handleDownloadOutfit = () => {
    if (
      selectedOutfitIndex !== null &&
      activeCharacter.outfitCollection &&
      activeCharacter.outfitCollection[selectedOutfitIndex]
    ) {
      const outfit = activeCharacter.outfitCollection[selectedOutfitIndex];
      const link = document.createElement('a');
      link.href = outfit.image;
      link.download = `${activeCharacter.name}_Outfit_${outfit.id || 'gen'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadProfileImage = () => {
    if (!activeCharacter.image) return;
    const link = document.createElement('a');
    link.href = activeCharacter.image;
    link.download = `${activeCharacter.name.replace(/\s+/g, '_')}_Profile.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteOutfit = () => {
    if (selectedOutfitIndex === null || !activeCharacter.outfitCollection) return;

    // Register Undo before deletion
    if (onRegisterUndo) onRegisterUndo();

    const newCollection = [...activeCharacter.outfitCollection];
    newCollection.splice(selectedOutfitIndex, 1);

    updateCharacterAtIndex(activeCharIndex, { outfitCollection: newCollection });

    // Adjust selection logic
    if (newCollection.length === 0) {
      setSelectedOutfitIndex(null);
    } else if (selectedOutfitIndex >= newCollection.length) {
      setSelectedOutfitIndex(newCollection.length - 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onRegisterUndo) onRegisterUndo();
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCharacterAtIndex(activeCharIndex, { image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Add a slight delay to ensure video element is ready
        setTimeout(() => {
          if (videoRef.current) videoRef.current.play();
        }, 100);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please allow camera permissions.');
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        if (onRegisterUndo) onRegisterUndo();
        // Draw video frame to canvas
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');

        // Stop stream
        stopCamera();

        // Save as Face Reference
        updateCharacterAtIndex(activeCharIndex, { faceReferenceImage: dataUrl });
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onRegisterUndo) onRegisterUndo();
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCharacterAtIndex(activeCharIndex, { faceReferenceImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCostumeRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onRegisterUndo) onRegisterUndo();
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCharacterAtIndex(activeCharIndex, { fashionReferenceImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFocus = () => {
    if (onRegisterUndo) onRegisterUndo();
  };

  const handlePlayVoice = async () => {
    if (isPlayingVoice) return;
    setIsPlayingVoice(true);
    try {
      const ttsService = new HybridTTSService();
      const text = activeCharacter.description || `Hello, I am ${activeCharacter.name}.`;
      // Simple mapping of role/traits to voice tone (Carita)
      // 'tanha' | 'dosa' | 'moha' | 'saddha' | 'buddhi' | 'vitakka'
      let carita: 'tanha' | 'dosa' | 'moha' | 'saddha' | 'buddhi' | 'vitakka' = 'vitakka';

      if (activeCharacter.role === 'Protagonist') carita = 'saddha';
      if (activeCharacter.role === 'Antagonist') carita = 'dosa';
      if (activeCharacter.role === 'Mentor') carita = 'buddhi';

      await ttsService.synthesizeAndPlay({
        text: text.substring(0, 100), // Limit length for sample
        carita: carita,
        fallbackEnabled: true,
      });
    } catch (error) {
      console.error('TTS Error:', error);
      // alert("Failed to generate voice."); // Optional: show error
    } finally {
      setIsPlayingVoice(false);
    }
  };

  return (
    <div className="relative">
      {/* --- RETURN NAVIGATION BAR (CONDITIONAL) --- */}
      {returnToStep && (
        <div className="bg-orange-900/40 border border-orange-500/50 rounded-lg p-3 mb-6 flex justify-between items-center animate-pulse">
          <span className="text-orange-300 font-bold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            Editing from Scene Design
          </span>
          <button
            onClick={onReturnToOrigin}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-1.5 px-4 rounded text-sm flex items-center gap-2 shadow-lg transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Scene Design
          </button>
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-cyan-400">
            {t('ขั้นที่ 3: สร้างตัวละคร', 'STEP 3: Character Creation')}
          </h2>
          <p className="text-gray-400 mb-6">
            {t(
              'กำหนดตัวละครในเรื่องของคุณ เพิ่มตัวเอก ตัวร้าย และตัวละครสมทบ',
              'Define the cast of your story. Add protagonists, antagonists, and supporting characters.'
            )}
          </p>
        </div>
        
        {/* Right Side: Gen All Characters + Compare Button */}
        <div className="flex items-start gap-3">
          {/* Gen All Characters Section with Checkbox */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleGenerateAllCharacters}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all disabled:opacity-50 border border-purple-500 shadow-lg shadow-purple-900/30"
              title={t(
                keepExistingCharacters
                  ? 'วิเคราะห์ตัวละครเดิม + Step 1-3 เพื่อสร้างตัวใหม่ที่สอดคล้อง'
                  : 'สร้างตัวละครใหม่ทั้งหมดจาก Step 1-2',
                keepExistingCharacters
                  ? 'Analyze existing cast + Step 1-3 to create compatible new characters'
                  : 'Create all new characters from Step 1-2'
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 005 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              {isLoading ? t('กำลังสร้าง...', 'Generating...') : t('🎭 สร้างทั้งหมด', '🎭 Gen All')}
            </button>
            
            <label className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 cursor-pointer pl-1">
              <input
                type="checkbox"
                checked={keepExistingCharacters}
                onChange={e => setKeepExistingCharacters(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900 cursor-pointer"
              />
              <span className="select-none">
                {t('เก็บตัวละครเดิมไว้', 'Keep existing')}
              </span>
            </label>
          </div>

          {/* Compare All Characters Button */}
          <button
            onClick={() => setShowCharacterComparison(true)}
            disabled={characters.length < 2}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-cyan-900/30 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-600 disabled:hover:to-blue-600"
            title={
              characters.length < 2
                ? t(
                    'ต้องมีอย่างน้อย 2 ตัวละครเพื่อเปรียบเทียบ',
                    'Need at least 2 characters to compare'
                  )
                : t(
                    `เปรียบเทียบจิตวิทยา ${characters.length} ตัวละคร`,
                    `Compare ${characters.length} characters psychology`
                  )
            }
          >
            <span className="text-lg">🔬</span>
            <span>
              {t('เปรียบเทียบ', 'Compare')} {characters.length >= 2 ? characters.length : '—'}
            </span>
          </button>
        </div>
      </div>

      {/* Character List Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-2 overflow-x-auto items-end">
        {characters.map((char, index) => {
          const isActive = activeCharIndex === index;
          const tabKey = char.id || `tab-${index}`;
          const isConfirmingDelete = confirmDeleteCharId === char.id;

          return (
            <div
              key={tabKey}
              className={`flex items-center rounded-t-lg transition-colors duration-200 border-b-2 overflow-hidden group ${
                isActive
                  ? 'bg-gray-800 border-cyan-400'
                  : 'bg-gray-900 border-transparent hover:bg-gray-800'
              } ${isConfirmingDelete ? '!bg-red-900/50 !border-red-500' : ''}`}
            >
              <button
                type="button"
                onClick={() => setActiveCharIndex(index)}
                className={`px-4 py-2 font-medium text-sm focus:outline-none transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                } ${isConfirmingDelete ? '!text-red-200' : ''}`}
              >
                <span className="max-w-[100px] truncate block">
                  {char.name || `Character ${index + 1}`}
                </span>
                {/* Tiny Role Label */}
                <span className="text-[9px] opacity-60 block -mt-0.5">
                  {char.role?.split(' ')[0] || 'Character'}
                </span>
              </button>

              {characters.length > 1 && (
                <button
                  type="button"
                  onClick={e => handleRemoveCharacter(char.id, e)}
                  className={`pr-2 py-2 pl-1 focus:outline-none transition-colors ${
                    isActive
                      ? isConfirmingDelete
                        ? 'text-red-300 hover:text-white'
                        : 'text-gray-500 hover:text-red-400'
                      : 'text-gray-600 hover:text-red-500 opacity-50 group-hover:opacity-100'
                  }`}
                  title={isConfirmingDelete ? 'Click again to confirm delete' : 'Delete Character'}
                >
                  {isConfirmingDelete ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 animate-pulse"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 pointer-events-none"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddCharacter}
          className="flex items-center gap-1 px-4 py-2 mb-0.5 rounded-md font-medium text-xs bg-gray-800 text-cyan-500 hover:bg-gray-700 hover:text-cyan-400 transition-colors border border-gray-700 shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          {t('เพิ่ม', 'Add')}
        </button>
      </div>

      {/* Main Profile Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 animate-fade-in-scene">
        {/* Left Column: Image & Basic Info & FACE IDENTITY */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Character Image */}
          <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700 flex flex-col items-center">
            <div
              onClick={() => activeCharacter.image && setIsProfileModalOpen(true)}
              className={`relative w-48 h-48 sm:w-56 sm:h-56 bg-gray-900 rounded-full border-4 border-gray-700 overflow-hidden shadow-lg mb-4 flex items-center justify-center group ${activeCharacter.image ? 'cursor-pointer hover:border-cyan-500 transition-colors' : ''}`}
              title="Click to view full size and download"
            >
              {activeCharacter.image ? (
                <img
                  src={activeCharacter.image}
                  alt={activeCharacter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-24 w-24 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
              {isImgLoading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 p-4">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-cyan-400 text-xs font-bold">{progress}%</span>
                </div>
              )}
              {/* Hover Hint */}
              {activeCharacter.image && !isImgLoading && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div className="w-full space-y-3">
              {/* Style Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">IMAGE STYLE</label>
                <select
                  value={activeCharacter.imageStyle || CHARACTER_IMAGE_STYLES[0]}
                  onChange={e => {
                    if (onRegisterUndo) onRegisterUndo();
                    updateCharacterAtIndex(activeCharIndex, { imageStyle: e.target.value });
                  }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md py-1.5 px-3 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                >
                  {CHARACTER_IMAGE_STYLES.map(style => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Model Selector */}
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">
                  AI Model
                  <span className="text-[9px] text-gray-500 ml-1">(Free & Paid)</span>
                </label>
                <select
                  value={activeCharacter.preferredModel || 'auto'}
                  onChange={e => {
                    if (onRegisterUndo) onRegisterUndo();
                    updateCharacterAtIndex(activeCharIndex, { preferredModel: e.target.value });
                  }}
                  className="w-full text-[11px] bg-gray-900 border border-gray-600 text-gray-300 py-1.5 px-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="auto">🤖 AUTO - Smart Selection</option>
                  <optgroup label="🎁 FREE MODELS">
                    <option value="pollinations">
                      ⚡⚡⚡ Pollinations (5-10s, Medium quality)
                    </option>
                    <option value="comfyui-sdxl">
                      ⚡⚡ ComfyUI SDXL (2-4min, High, Face ID 70%)
                    </option>
                    <option value="gemini-flash">
                      ⚡⚡⚡ Gemini Flash (10-30s, FREE quota 1.5k/day)
                    </option>
                  </optgroup>
                  <optgroup label="💵 PAID MODELS">
                    <option value="gemini-pro">🌟🌟🌟🌟 Gemini Pro ($0.0025, Face ID 80%)</option>
                    <option value="comfyui-flux">
                      🌟🌟🌟🌟🌟 FLUX (5-10min, Best, NVIDIA only)
                    </option>
                    <option value="openai-dalle">
                      🌟🌟🌟🌟🌟 DALL-E 3 ($0.04-0.12, No Face ID)
                    </option>
                  </optgroup>
                </select>
              </div>

              {/* Generation Mode Selector */}
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">
                  Generation Mode
                </label>
                <select
                  value={generationMode}
                  onChange={e => setGenerationMode(e.target.value as GenerationMode)}
                  className="w-full text-xs bg-gray-900 border border-gray-600 text-gray-300 py-1.5 px-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="quality">
                    🏆 QUALITY (25 steps, 5-7 min) ⚠️ May crash on Mac
                  </option>
                  <option value="balanced">⚖️ BALANCED (20 steps, 4-6 min) ✅ Recommended</option>
                  <option value="speed">⚡ SPEED (15 steps, 3-5 min)</option>
                </select>
              </div>

              {/* Primary Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePortrait}
                  disabled={isImgLoading}
                  className={`flex-1 text-white text-xs font-bold py-2 px-2 rounded transition-colors flex items-center justify-center gap-1 shadow-lg ${activeCharacter.faceReferenceImage ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {activeCharacter.faceReferenceImage ? 'Face ID Portrait' : 'AI Portrait'}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-2 px-2 rounded transition-colors flex items-center justify-center gap-1"
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
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>
          </div>

          {/* --- FACE IDENTITY SECTION --- */}
          <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-cyan-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                Face Identity (Master)
              </h4>
              {activeCharacter.faceReferenceImage && (
                <button
                  onClick={() => {
                    if (onRegisterUndo) onRegisterUndo();
                    updateCharacterAtIndex(activeCharIndex, { faceReferenceImage: undefined });
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 border border-red-900/50 px-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex gap-3 items-center">
              <div className="w-16 h-16 bg-gray-900 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden shrink-0 relative">
                {activeCharacter.faceReferenceImage ? (
                  <img
                    src={activeCharacter.faceReferenceImage}
                    alt="Ref"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] text-gray-500 text-center px-1">None</span>
                )}
                {activeCharacter.faceReferenceImage && (
                  <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none"></div>
                )}
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2">
                <button
                  onClick={isCameraOpen ? capturePhoto : startCamera}
                  className={`text-[10px] font-bold py-2 rounded flex flex-col items-center justify-center gap-1 transition-colors border ${isCameraOpen ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4z"
                      clipRule="evenodd"
                    />
                    <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
                  </svg>
                  {isCameraOpen ? 'SNAP' : 'Camera'}
                </button>

                <button
                  onClick={() => faceInputRef.current?.click()}
                  className="text-[10px] bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-300 font-bold py-2 rounded flex flex-col items-center justify-center gap-1 transition-colors"
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
                  ref={faceInputRef}
                  onChange={handleFaceUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
            {isCameraOpen && (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mt-2 border border-red-500 shadow-lg z-20">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                ></video>
                <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>
                <button
                  onClick={stopCamera}
                  className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold"
                >
                  X
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Descriptions & Details */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Name Input */}
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('ชื่อตัวละคร', 'Character Name')}
                </label>
                <input
                  type="text"
                  value={activeCharacter.name}
                  onChange={e => updateCharacterAtIndex(activeCharIndex, { name: e.target.value })}
                  onFocus={handleFocus}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500 font-bold text-lg"
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Role Selection */}
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('บทบาท / ประเภท', 'Role / Type')}
                </label>
                <select
                  value={activeCharacter.role || CHARACTER_ROLES[0]}
                  onChange={e => {
                    if (onRegisterUndo) onRegisterUndo();
                    updateCharacterAtIndex(activeCharIndex, { role: e.target.value });
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2.5 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
                >
                  {CHARACTER_ROLES.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gen Character Button with Checkbox */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-2 opacity-0">
                  Gen
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={isLoading}
                    className={`w-full text-white font-bold py-2.5 px-4 rounded-lg transition duration-300 disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-lg ${
                      fillEmptyOnly
                        ? 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-900/30'
                        : 'bg-teal-600 hover:bg-teal-700 shadow-teal-900/30'
                    }`}
                    title={
                      fillEmptyOnly
                        ? t('เติมเฉพาะข้อมูลที่ยังว่าง', 'Fill missing character details only')
                        : t(
                            'สร้างโปรไฟล์ตัวละครเต็มรูปแบบจาก AI',
                            'Generate full character profile from AI'
                          )
                    }
                  >
                    <span className="text-lg">✨</span>
                    <span>
                      {isLoading
                        ? t('กำลังสร้าง...', 'Generating...')
                        : fillEmptyOnly
                          ? t('เติมอัตโนมัติ', 'Auto-Fill')
                          : t('สร้าง', 'Gen')}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="fillEmptyOnly"
                      checked={fillEmptyOnly}
                      onChange={e => setFillEmptyOnly(e.target.checked)}
                      className="w-3 h-3 text-cyan-600 bg-gray-700 border-gray-600 rounded"
                    />
                    <label
                      htmlFor="fillEmptyOnly"
                      className="text-[10px] text-gray-400 cursor-pointer leading-tight"
                    >
                      {t('เติมเฉพาะที่ว่าง', 'Fill empty only')}
                    </label>
                  </div>
                </div>
              </div>
            </div>{' '}
            {/* Close grid */}
            {/* Character Description & Role */}
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-2">
              Character Description & Role
            </label>
            <textarea
              value={activeCharacter.description}
              onChange={e =>
                updateCharacterAtIndex(activeCharIndex, { description: e.target.value })
              }
              onFocus={handleFocus}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="e.g., A grizzled detective on the edge, haunted by his past..."
            />
            {error && <div className="mt-2 text-red-400 text-xs">{error}</div>}
          </div>
        </div>
      </div>

      {/* --- CATEGORY TABS (External / Internal / Goals) --- */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('external')}
          className={`flex-1 py-3 text-center font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'external' ? 'border-cyan-500 text-cyan-400 bg-gray-800/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          External
        </button>
        <button
          onClick={() => setActiveTab('internal')}
          className={`flex-1 py-3 text-center font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'internal' ? 'border-cyan-500 text-cyan-400 bg-gray-800/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Internal
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`flex-1 py-3 text-center font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'goals' ? 'border-cyan-500 text-cyan-400 bg-gray-800/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Goals
        </button>
      </div>

      {/* --- EXTERNAL TAB CONTENT --- */}
      {activeTab === 'external' && (
        <div className="animate-fade-in-scene min-h-[400px]">
          {/* Sub Tabs for External */}
          <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg inline-flex mb-6">
            <button
              onClick={() => setExternalSubTab('info')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${externalSubTab === 'info' ? 'bg-cyan-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Information
            </button>
            <button
              onClick={() => setExternalSubTab('physical')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${externalSubTab === 'physical' ? 'bg-cyan-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Physical
            </button>
            <button
              onClick={() => setExternalSubTab('speech')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${externalSubTab === 'speech' ? 'bg-cyan-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              🗣️ Speech Pattern
            </button>
            <button
              onClick={() => setExternalSubTab('costume')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${externalSubTab === 'costume' ? 'bg-cyan-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Costume & Fashion
            </button>
          </div>

          {/* Information Content */}
          {externalSubTab === 'info' && (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">
                Information (External)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(activeCharacter.external).map(([key, value]) => (
                  <InfoField
                    key={key}
                    label={key}
                    value={value}
                    onChange={val =>
                      handleFieldChange('external', key as keyof Character['external'], val)
                    }
                    onFocus={handleFocus}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Physical Content */}
          {externalSubTab === 'physical' && (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2 flex justify-between items-center">
                <span>Physical Characteristics</span>
                <button
                  onClick={handlePlayVoice}
                  disabled={isPlayingVoice}
                  className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-2 transition-all ${
                    isPlayingVoice
                      ? 'bg-green-500/20 text-green-400 animate-pulse'
                      : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  }`}
                >
                  {isPlayingVoice ? '🔊 Playing...' : '🔊 Voice Sample'}
                </button>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(activeCharacter.physical).map(([key, value]) => (
                  <InfoField
                    key={key}
                    label={key}
                    value={value}
                    onChange={val =>
                      handleFieldChange('physical', key as keyof Character['physical'], val)
                    }
                    onFocus={handleFocus}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Speech Pattern Content */}
          {externalSubTab === 'speech' && (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-200 border-l-4 border-cyan-500 pl-3">
                  🗣️ Speech Pattern & Dialect
                </h3>
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                  Character Voice Customization
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dialect Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ภาษาถิ่น (Dialect)
                  </label>
                  <select
                    value={activeCharacter.speechPattern?.dialect || 'standard'}
                    onChange={e => {
                      if (onRegisterUndo) onRegisterUndo();
                      updateCharacterAtIndex(activeCharIndex, {
                        speechPattern: {
                          ...activeCharacter.speechPattern,
                          dialect: e.target.value as DialectType,
                          accent: activeCharacter.speechPattern?.accent || 'none',
                          formalityLevel: activeCharacter.speechPattern?.formalityLevel || 'informal',
                          personality: activeCharacter.speechPattern?.personality || 'polite',
                        },
                      });
                    }}
                    className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="standard">ภาษากลาง (Standard Thai)</option>
                    <option value="isaan">ภาษาอีสาน (Isaan/Northeastern)</option>
                    <option value="northern">ภาษาเหนือ (Northern/Lanna)</option>
                    <option value="southern">ภาษาใต้ (Southern)</option>
                    <option value="central">ภาษากรุงเทพ (Bangkok/Central)</option>
                    <option value="custom">กำหนดเอง (Custom)</option>
                  </select>
                  {activeCharacter.speechPattern?.dialect && activeCharacter.speechPattern.dialect !== 'standard' && (
                    <div className="mt-2 p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
                      <div className="text-xs text-cyan-300 font-medium mb-1">
                        {DIALECT_PRESETS[activeCharacter.speechPattern.dialect as keyof typeof DIALECT_PRESETS]?.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {DIALECT_PRESETS[activeCharacter.speechPattern.dialect as keyof typeof DIALECT_PRESETS]?.description}
                      </div>
                      {DIALECT_PRESETS[activeCharacter.speechPattern.dialect as keyof typeof DIALECT_PRESETS]?.examples && (
                        <div className="mt-2 text-xs text-gray-500">
                          ตัวอย่าง: {DIALECT_PRESETS[activeCharacter.speechPattern.dialect as keyof typeof DIALECT_PRESETS].examples.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Accent Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    สำเนียง (Accent)
                  </label>
                  <select
                    value={activeCharacter.speechPattern?.accent || 'none'}
                    onChange={e => {
                      if (onRegisterUndo) onRegisterUndo();
                      updateCharacterAtIndex(activeCharIndex, {
                        speechPattern: {
                          ...activeCharacter.speechPattern,
                          dialect: activeCharacter.speechPattern?.dialect || 'standard',
                          accent: e.target.value as AccentType,
                          formalityLevel: activeCharacter.speechPattern?.formalityLevel || 'informal',
                          personality: activeCharacter.speechPattern?.personality || 'polite',
                        },
                      });
                    }}
                    className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="none">ไม่มีสำเนียง (No Accent)</option>
                    <option value="isaan">สำเนียงอีสาน (Isaan Accent)</option>
                    <option value="northern">สำเนียงเหนือ (Northern Accent)</option>
                    <option value="southern">สำเนียงใต้ (Southern Accent)</option>
                    <option value="chinese">สำเนียงจีน (Chinese Accent)</option>
                    <option value="western">สำเนียงฝรั่ง (Western Accent)</option>
                    <option value="custom">กำหนดเอง (Custom)</option>
                  </select>
                  {activeCharacter.speechPattern?.accent && activeCharacter.speechPattern.accent !== 'none' && ACCENT_PATTERNS[activeCharacter.speechPattern.accent as keyof typeof ACCENT_PATTERNS] && (
                    <div className="mt-2 p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                      <div className="text-xs text-purple-300 font-medium mb-1">
                        Accent Pattern Rules
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        {ACCENT_PATTERNS[activeCharacter.speechPattern.accent as keyof typeof ACCENT_PATTERNS]?.rules?.slice(0, 3).map((rule, idx) => (
                          <div key={idx}>• {rule.pattern} → {rule.replacement}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Formality Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ระดับความเป็นทางการ (Formality)
                  </label>
                  <select
                    value={activeCharacter.speechPattern?.formalityLevel || 'informal'}
                    onChange={e => {
                      if (onRegisterUndo) onRegisterUndo();
                      updateCharacterAtIndex(activeCharIndex, {
                        speechPattern: {
                          ...activeCharacter.speechPattern,
                          dialect: activeCharacter.speechPattern?.dialect || 'standard',
                          accent: activeCharacter.speechPattern?.accent || 'none',
                          formalityLevel: e.target.value as FormalityLevel,
                          personality: activeCharacter.speechPattern?.personality || 'polite',
                        },
                      });
                    }}
                    className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="formal">เป็นทางการ (Formal)</option>
                    <option value="informal">ไม่เป็นทางการ (Informal)</option>
                    <option value="casual">สบายๆ (Casual)</option>
                    <option value="slang">แสลง (Slang)</option>
                  </select>
                  {activeCharacter.speechPattern?.formalityLevel && (
                    <div className="mt-2 text-xs text-gray-400">
                      {FORMALITY_LABELS[activeCharacter.speechPattern.formalityLevel as keyof typeof FORMALITY_LABELS]}
                    </div>
                  )}
                </div>

                {/* Personality Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    บุคลิกการพูด (Speech Personality)
                  </label>
                  <select
                    value={activeCharacter.speechPattern?.personality || 'polite'}
                    onChange={e => {
                      if (onRegisterUndo) onRegisterUndo();
                      updateCharacterAtIndex(activeCharIndex, {
                        speechPattern: {
                          ...activeCharacter.speechPattern,
                          dialect: activeCharacter.speechPattern?.dialect || 'standard',
                          accent: activeCharacter.speechPattern?.accent || 'none',
                          formalityLevel: activeCharacter.speechPattern?.formalityLevel || 'informal',
                          personality: e.target.value as SpeechPersonality,
                        },
                      });
                    }}
                    className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="polite">สุภาพ (Polite)</option>
                    <option value="rude">หยาบคาย (Rude)</option>
                    <option value="humorous">ตลก (Humorous)</option>
                    <option value="serious">จริงจัง (Serious)</option>
                    <option value="childlike">เหมือนเด็ก (Childlike)</option>
                    <option value="elderly">แบบผู้สูงอายุ (Elderly)</option>
                    <option value="intellectual">ปราชญ์ (Intellectual)</option>
                  </select>
                  {activeCharacter.speechPattern?.personality && (
                    <div className="mt-2 text-xs text-gray-400">
                      {PERSONALITY_LABELS[activeCharacter.speechPattern.personality as keyof typeof PERSONALITY_LABELS]}
                    </div>
                  )}
                </div>

                {/* Speech Tics */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    คำพูดติดปาก / นิสัยการพูด (Speech Tics)
                  </label>
                  <textarea
                    value={activeCharacter.speechPattern?.speechTics?.join(', ') || ''}
                    onChange={e => {
                      if (onRegisterUndo) onRegisterUndo();
                      const tics = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                      updateCharacterAtIndex(activeCharIndex, {
                        speechPattern: {
                          ...activeCharacter.speechPattern,
                          dialect: activeCharacter.speechPattern?.dialect || 'standard',
                          accent: activeCharacter.speechPattern?.accent || 'none',
                          formalityLevel: activeCharacter.speechPattern?.formalityLevel || 'informal',
                          personality: activeCharacter.speechPattern?.personality || 'polite',
                          speechTics: tics.length > 0 ? tics : undefined,
                        },
                      });
                    }}
                    placeholder='เช่น "เหรอ", "นะจ๊ะ", "แหม" (คั่นด้วยเครื่องหมายจุลภาค)'
                    rows={3}
                    className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    คำพูดที่ตัวละครชอบใช้บ่อยๆ หรือพูดติดปาก เช่น "เหรอคะ" "อะไรนะ" "แหมเนี่ย"
                  </div>
                </div>

                {/* Custom Phrases */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    วลีพิเศษ (Custom Phrases)
                  </label>
                  <textarea
                    value={activeCharacter.speechPattern?.customPhrases?.join('\n') || ''}
                    onChange={e => {
                      if (onRegisterUndo) onRegisterUndo();
                      const phrases = e.target.value.split('\n').map(p => p.trim()).filter(p => p);
                      updateCharacterAtIndex(activeCharIndex, {
                        speechPattern: {
                          ...activeCharacter.speechPattern,
                          dialect: activeCharacter.speechPattern?.dialect || 'standard',
                          accent: activeCharacter.speechPattern?.accent || 'none',
                          formalityLevel: activeCharacter.speechPattern?.formalityLevel || 'informal',
                          personality: activeCharacter.speechPattern?.personality || 'polite',
                          customPhrases: phrases.length > 0 ? phrases : undefined,
                        },
                      });
                    }}
                    placeholder="วลีพิเศษหรือประโยคที่ตัวละครใช้บ่อย (แต่ละบรรทัด 1 วลี)"
                    rows={4}
                    className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    วลีหรือประโยคที่ตัวละครชอบพูด เช่น "ไปทางนั้นก็ได้นะจ๊ะ" "เอาล่ะๆ ไม่เป็นไรจ้า"
                  </div>
                </div>
              </div>

              {/* Preview Example */}
              {(activeCharacter.speechPattern?.dialect !== 'standard' || activeCharacter.speechPattern?.accent !== 'none') && (
                <div className="mt-6 p-4 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-700/50 rounded-lg">
                  <div className="text-sm font-medium text-cyan-300 mb-2">
                    💬 ตัวอย่างการแปลงภาษา
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Standard:</div>
                      <div className="text-gray-300">"สวัสดีครับ ไม่รู้ว่าคุณกินข้าวหรือยัง"</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 text-xs mb-1">With Dialect:</div>
                      <div className="text-white font-medium">
                        {activeCharacter.speechPattern?.dialect === 'isaan' && '"สวัสดีเด้อ บ่รู้ว่าคุณกินข้าวแล้วบ่"'}
                        {activeCharacter.speechPattern?.dialect === 'northern' && '"สวัสดีจ๊า บ่รู้เจ้ากินข้าวแล้วบ่"'}
                        {activeCharacter.speechPattern?.dialect === 'southern' && '"สวัสดีแหน่ หมู่บ่ลู้ว่าแกกินข้าวยัง"'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Costume & Fashion Content (2-COLUMN LAYOUT) */}
          {externalSubTab === 'costume' && (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-200 border-l-4 border-purple-500 pl-3">
                  Costume & Fashion Design
                </h3>
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                  AI Powered Wardrobe
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* LEFT: Data Entry */}
                <div className="md:col-span-6 lg:col-span-5 flex flex-col gap-6">
                  {/* Costume Reference Input */}
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">
                        Costume Reference
                      </label>
                      {activeCharacter.fashionReferenceImage && (
                        <button
                          onClick={() => {
                            if (onRegisterUndo) onRegisterUndo();
                            updateCharacterAtIndex(activeCharIndex, {
                              fashionReferenceImage: undefined,
                            });
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 bg-gray-800 rounded border border-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                        {activeCharacter.fashionReferenceImage ? (
                          <img
                            src={activeCharacter.fashionReferenceImage}
                            alt="Ref"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-gray-600"
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
                        )}
                      </div>
                      <div className="flex-1">
                        <button
                          onClick={() => costumeRefInputRef.current?.click()}
                          className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded transition-colors border border-gray-600"
                        >
                          Upload Outfit Style
                        </button>
                        <input
                          type="file"
                          ref={costumeRefInputRef}
                          onChange={handleCostumeRefUpload}
                          className="hidden"
                          accept="image/*"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(activeCharacter.fashion || {}).map(([key, value]) => (
                      <InfoField
                        key={key}
                        label={key}
                        value={value}
                        type="textarea"
                        onChange={val => handleFieldChange('fashion', key, val)}
                        onFocus={handleFocus}
                      />
                    ))}
                  </div>

                  {/* AI Model Selector for Outfit */}
                  <div className="mt-3">
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">
                      AI Model
                      <span className="text-[9px] text-gray-500 ml-1">(Free & Paid)</span>
                    </label>
                    <select
                      value={activeCharacter.preferredModel || 'auto'}
                      onChange={e => {
                        if (onRegisterUndo) onRegisterUndo();
                        updateCharacterAtIndex(activeCharIndex, { preferredModel: e.target.value });
                      }}
                      className="w-full text-[11px] bg-gray-900 border border-gray-600 text-gray-300 py-1.5 px-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="auto">🤖 AUTO - Smart Selection</option>
                      <optgroup label="🎁 FREE MODELS">
                        <option value="pollinations">
                          ⚡⚡⚡ Pollinations (5-10s, Medium quality)
                        </option>
                        <option value="comfyui-sdxl">
                          ⚡⚡ ComfyUI SDXL (2-4min, High, Face ID 70%)
                        </option>
                        <option value="gemini-flash">
                          ⚡⚡⚡ Gemini Flash (10-30s, FREE quota 1.5k/day)
                        </option>
                      </optgroup>
                      <optgroup label="💵 PAID MODELS">
                        <option value="gemini-pro">
                          🌟🌟🌟🌟 Gemini Pro ($0.0025, Face ID 80%)
                        </option>
                        <option value="comfyui-flux">
                          🌟🌟🌟🌟🌟 FLUX (5-10min, Best, NVIDIA only)
                        </option>
                        <option value="openai-dalle">
                          🌟🌟🌟🌟🌟 DALL-E 3 ($0.04-0.12, No Face ID)
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Generation Mode Selector for Outfit */}
                  <div className="mt-3">
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">
                      Generation Mode
                    </label>
                    <select
                      value={generationMode}
                      onChange={e => setGenerationMode(e.target.value as GenerationMode)}
                      className="w-full text-xs bg-gray-900 border border-gray-600 text-gray-300 py-1.5 px-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="quality">
                        🏆 QUALITY (25 steps, 5-7 min) ⚠️ May crash on Mac
                      </option>
                      <option value="balanced">
                        ⚖️ BALANCED (20 steps, 4-6 min) ✅ Recommended
                      </option>
                      <option value="speed">⚡ SPEED (15 steps, 3-5 min)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateCostume}
                    disabled={isCostumeLoading}
                    className={`w-full text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${activeCharacter.faceReferenceImage || activeCharacter.image ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20'}`}
                  >
                    {isCostumeLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {activeCharacter.faceReferenceImage || activeCharacter.image
                      ? 'Generate Outfit (Face ID)'
                      : 'Generate Outfit'}
                  </button>

                  {/* ComfyUI Skipped Warning */}
                  {typeof window !== 'undefined' &&
                    localStorage.getItem('peace_comfyui_skipped') === 'true' &&
                    (activeCharacter.faceReferenceImage || activeCharacter.image) && (
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="flex gap-2 items-start">
                          <svg
                            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
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
                          <div className="text-amber-300 text-xs">
                            <strong>Face ID Disabled:</strong> ComfyUI setup was skipped. Face
                            matching will not work.
                            <button
                              onClick={() => {
                                localStorage.removeItem('peace_comfyui_skipped');
                                window.location.reload();
                              }}
                              className="underline ml-1 hover:text-amber-200"
                            >
                              Enable Face ID
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* RIGHT: Fitting Room (Mirror) */}
                <div className="md:col-span-6 lg:col-span-7 flex flex-col">
                  <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">
                    Fitting Room (Newest First)
                  </h4>

                  <div className="bg-black/40 rounded-xl border border-gray-600 overflow-hidden relative group max-w-md mx-auto w-full shadow-2xl">
                    {selectedOutfitIndex !== null &&
                    activeCharacter.outfitCollection &&
                    activeCharacter.outfitCollection[selectedOutfitIndex] ? (
                      <>
                        {/* Image Area */}
                        <div className="relative aspect-[3/4] w-full bg-gray-900 flex items-center justify-center overflow-hidden">
                          <img
                            src={activeCharacter.outfitCollection[selectedOutfitIndex].image}
                            alt="Outfit"
                            className="w-full h-full object-cover"
                          />

                          {/* Top Overlay Info */}
                          <div className="absolute top-4 left-4 flex flex-col gap-1 z-10">
                            <span className="bg-black/60 backdrop-blur-sm text-cyan-400 text-xs font-mono px-2 py-1 rounded border border-cyan-500/30 shadow-lg">
                              Outfit #
                              {activeCharacter.outfitCollection.length - selectedOutfitIndex}
                            </span>
                            <span className="bg-black/60 backdrop-blur-sm text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-600/50">
                              ID:{' '}
                              {activeCharacter.outfitCollection[selectedOutfitIndex].id || 'GEN'}
                            </span>
                          </div>

                          {/* Tag Overlay if used in scene */}
                          {getOutfitUsage(
                            activeCharacter.outfitCollection[selectedOutfitIndex].id || ''
                          ).length > 0 && (
                            <div className="absolute top-4 right-4 bg-purple-900/80 backdrop-blur-sm text-purple-200 text-[10px] font-bold px-2 py-1 rounded border border-purple-500/50 shadow-lg max-w-[120px] text-right">
                              {
                                getOutfitUsage(
                                  activeCharacter.outfitCollection[selectedOutfitIndex].id || ''
                                )[0]
                              }
                              {getOutfitUsage(
                                activeCharacter.outfitCollection[selectedOutfitIndex].id || ''
                              ).length > 1 &&
                                ` +${getOutfitUsage(activeCharacter.outfitCollection[selectedOutfitIndex].id || '').length - 1}`}
                            </div>
                          )}
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="bg-gray-800 border-t border-gray-600 p-3 flex gap-2">
                          <button
                            onClick={handleDownloadOutfit}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
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
                            Download
                          </button>
                          <button
                            onClick={handleSetProfileFromOutfit}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Set as Profile
                          </button>
                          <button
                            onClick={handleDeleteOutfit}
                            className="px-3 bg-red-900/30 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded transition-colors"
                            title="Delete Outfit"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="aspect-[3/4] flex flex-col items-center justify-center text-center p-12 text-gray-500 bg-gray-900">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-16 w-16 mx-auto mb-4 opacity-30"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p>Wardrobe Empty</p>
                        <p className="text-xs mt-2">Generate an outfit to see preview</p>
                      </div>
                    )}

                    {isCostumeLoading && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm p-6">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <span className="text-cyan-400 font-bold animate-pulse mb-2">
                          Designing New Look...
                        </span>
                        <div className="w-full max-w-[200px] bg-gray-700 rounded-full h-2 mb-1">
                          <div
                            className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-cyan-400 text-xs font-bold">{progress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Gallery Strip */}
                  <div className="mt-4 flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-700">
                    {(activeCharacter.outfitCollection || []).map((outfit, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedOutfitIndex(i)}
                        className={`flex-shrink-0 w-16 h-24 cursor-pointer rounded-md overflow-hidden border-2 transition-all relative ${selectedOutfitIndex === i ? 'border-cyan-500 opacity-100 ring-2 ring-cyan-500/50' : 'border-gray-800 opacity-60 hover:opacity-100'}`}
                      >
                        <img
                          src={outfit.image}
                          alt="Thumb"
                          className="w-full h-full object-cover"
                        />
                        {/* Tiny Sequence Number */}
                        <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-1 font-mono">
                          #{activeCharacter.outfitCollection.length - i}
                        </div>
                        {getOutfitUsage(outfit.id || '').length > 0 && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-bl-sm"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- INTERNAL TAB CONTENT --- */}
      {activeTab === 'internal' && (
        <div className="animate-fade-in-scene min-h-[400px]">
          {/* Psychology Display at Top */}
          <div className="mb-6">
            <PsychologyDisplay character={activeCharacter} />
            
            {/* Phase 3: Advanced Psychology Dashboard */}
            <button
              onClick={() => setShowPsychologyDashboard(true)}
              className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">✧</span>
              <span className="uppercase tracking-wider">
                Buddhist Psychology Dashboard (Phase 3)
              </span>
            </button>

            <button
              onClick={() => setShowPsychologyTest(true)}
              className="mt-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🧪</span>
              <span className="uppercase tracking-wider">
                ทดสอบการตอบสนอง (Psychology Test Lab)
              </span>
            </button>

            <button
              onClick={() => setShowPsychologyTimeline(true)}
              className="mt-3 w-full bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-500/30 font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <span className="text-2xl">📈</span>
              <span className="uppercase tracking-wider">View Psychology Timeline</span>
            </button>
          </div>

          {/* Sub Tabs for Internal */}
          <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg inline-flex mb-6">
            <button
              onClick={() => setInternalSubTab('consciousness')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${internalSubTab === 'consciousness' ? 'bg-cyan-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Consciousness
            </button>
            <button
              onClick={() => setInternalSubTab('subconscious')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${internalSubTab === 'subconscious' ? 'bg-cyan-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Subconscious
            </button>
          </div>

          {/* Consciousness Content */}
          {internalSubTab === 'consciousness' && (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4 border-b border-gray-600 pb-2">
                Consciousness
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(activeCharacter.internal.consciousness).map(([key, value]) => (
                  <InfoField
                    key={key}
                    label={key}
                    value={value}
                    type="number"
                    onChange={val =>
                      handleNestedFieldChange('internal', 'consciousness', key, parseInt(val))
                    }
                    onFocus={handleFocus}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Subconscious Content (Includes Defilement) */}
          {internalSubTab === 'subconscious' && (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold text-purple-400 mb-4 border-b border-gray-600 pb-2">
                Subconscious
              </h3>

              {/* 1. Attachment & Taanha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8">
                {Object.entries(activeCharacter.internal.subconscious).map(([key, value]) => (
                  <InfoField
                    key={key}
                    label={key}
                    value={value}
                    type="textarea"
                    onChange={val => handleNestedFieldChange('internal', 'subconscious', key, val)}
                    onFocus={handleFocus}
                  />
                ))}
              </div>

              {/* 2. Defilements (Kilesa) - Explicitly placed here */}
              <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Defilement (Kilesa)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(activeCharacter.internal.defilement).map(([key, value]) => (
                    <InfoField
                      key={key}
                      label={key}
                      value={value}
                      type="number"
                      onChange={val =>
                        handleNestedFieldChange('internal', 'defilement', key, parseInt(val))
                      }
                      onFocus={handleFocus}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- GOALS TAB CONTENT --- */}
      {activeTab === 'goals' && (
        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 animate-fade-in-scene">
          <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">
            Character Goals
          </h3>
          <div className="space-y-4">
            {Object.entries(activeCharacter.goals).map(([key, value]) => (
              <InfoField
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={value}
                type="textarea"
                onChange={val => handleFieldChange('goals', key as keyof Character['goals'], val)}
                onFocus={handleFocus}
              />
            ))}
          </div>
        </div>
      )}

      {/* --- PROFILE IMAGE MODAL VIEWER --- */}
      {isProfileModalOpen && activeCharacter.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in-scene"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-screen flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={activeCharacter.image}
              alt="Profile Full"
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl border border-gray-700 mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleDownloadProfileImage();
                }}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg shadow-cyan-900/30"
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
                Download Image
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setIsProfileModalOpen(false);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PSYCHOLOGY TEST PANEL --- */}
      {showPsychologyTest && (
        <PsychologyTestPanel
          character={activeCharacter}
          onClose={() => setShowPsychologyTest(false)}
        />
      )}

      {/* --- PSYCHOLOGY DASHBOARD (Phase 3) --- */}
      {showPsychologyDashboard && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-7xl mx-auto">
              {/* Close Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowPsychologyDashboard(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-all shadow-lg"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              
              {/* Dashboard */}
              <PsychologyDashboard character={activeCharacter} compact={false} />
            </div>
          </div>
        </div>
      )}

      {/* --- CHARACTER COMPARISON --- */}
      {showCharacterComparison && (
        <CharacterComparison
          characters={characters}
          onClose={() => setShowCharacterComparison(false)}
        />
      )}

      {/* --- PSYCHOLOGY TIMELINE --- */}
      {showPsychologyTimeline && activeCharacter && (
        <PsychologyTimeline
          timeline={
            scriptData.psychologyTimelines?.[activeCharacter.id] ||
            scriptData.psychologyTimelines?.[activeCharacter.name] ||
            {
              characterId: activeCharacter.id || '',
              characterName: activeCharacter.name,
              snapshots: [],
              changes: [],
              summary: {
                total_kusala: 0,
                total_akusala: 0,
                net_progress: 0,
                dominant_pattern: '',
                carita_evolution: [],
                magga_progress: 0,
              },
              overallArc: {
                startingBalance: 0,
                endingBalance: 0,
                totalChange: 0,
                direction: 'คงที่',
                interpretation: '',
              },
            }
          }
          onClose={() => setShowPsychologyTimeline(false)}
        />
      )}

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
          Next Step
        </button>
      </div>
    </div>
  );
};

export default Step3Character;
