
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ScriptData, GeneratedScene, PlotPoint, Character, DialogueLine } from '../types';
import { generateScene, generateStoryboardImage, generateStoryboardVideo } from '../services/geminiService';
import { CHARACTER_IMAGE_STYLES } from '../constants';

interface Step5OutputProps {
  scriptData: ScriptData;
  setScriptData: React.Dispatch<React.SetStateAction<ScriptData>>;
  prevStep: () => void;
  onRegisterUndo?: () => void;
  goToStep: (step: number) => void;
  onNavigateToCharacter?: (charName: string, fromStep?: number, sceneContext?: { pointTitle: string; sceneIndex: number }) => void;
  returnToScene?: { pointTitle: string; sceneIndex: number } | null;
  onResetReturnToScene?: () => void;
}

// --- Constants for Shot List Dropdowns ---
const SHOT_OPTIONS: Record<string, string[]> = {
    shotSize: [
        "Select...", "ECU (Extreme Close Up)", "CU (Close Up)", "MCU (Medium Close Up)", 
        "MS (Medium Shot)", "MLS (Medium Long Shot)", "LS (Long Shot)", 
        "VLS (Very Long Shot)", "EST (Establishing Shot)"
    ],
    perspective: [
        "Select...", "Eye-Level", "High Angle", "Low Angle", "Bird's Eye / Overhead", 
        "Worm's Eye", "POV (Point of View)", "OTS (Over the Shoulder)", 
        "Canted / Dutch Angle", "Ground Level"
    ],
    movement: [
        "Select...", "Static", "Pan", "Tilt", "Dolly In", "Dolly Out", 
        "Zoom In", "Zoom Out", "Tracking / Truck", "Crab", "Pedestal", 
        "Crane / Jib", "Handheld", "Steadicam", "Gimbal / Stabilizer", "Arc", "Whip Pan"
    ],
    equipment: [
        "Select...", "Tripod", "Dolly", "Slider", "Jib / Crane", 
        "Steadicam", "Gimbal (Ronin/Movi)", "Handheld Rig", "EasyRig", 
        "Drone", "Snorricam", "Vehicle Mount"
    ],
    focalLength: [
        "Select...", "14mm (Ultra Wide)", "24mm (Wide)", "35mm (Standard Wide)", 
        "50mm (Standard)", "85mm (Portrait)", "100mm (Macro/Tele)", 
        "135mm (Telephoto)", "200mm+ (Super Tele)", "Zoom Lens"
    ],
    aspectRatio: [
        "Select...", "16:9 (1.78:1)", "2.39:1 (Anamorphic)", "1.85:1 (Academy Flat)", 
        "4:3 (1.33:1)", "1:1 (Square)", "9:16 (Vertical)", "2:1 (Univisium)"
    ],
    colorTemperature: [
        "Select...", "3200K (Tungsten/Warm)", "4300K (Fluorescent/Mixed)", 
        "5600K (Daylight)", "6500K (Overcast/Cool)", "2000K (Candlelight)", 
        "10000K (Blue Sky)"
    ]
};

// Fixed headers to ensure all columns are shown even if data is missing
const SHOT_LIST_HEADERS = [
    "shot", "cast", "costume", "description", "durationSec", "shotSize", "perspective", 
    "movement", "equipment", "focalLength", "aspectRatio", 
    "lightingDesign", "colorTemperature"
];

// Helper to safely render content that might be an object/array
const safeRender = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        // Flatten object to string to prevent React crash
        return JSON.stringify(value);
    }
    return String(value);
};

// --- EXPORT GENERATORS ---

// Helper to center text for screenplay output
const centerText = (text: string, width: number): string => {
    if (text.length >= width) return text;
    const leftPad = Math.floor((width - text.length) / 2);
    return " ".repeat(leftPad) + text;
};

const generateScreenplayText = (data: ScriptData): string => {
    let output = "";
    
    // Title Page
    output += `\n\n\n\n\n\n`;
    output += `${centerText(data.title.toUpperCase(), 50)}\n`;
    output += `by\n`;
    output += `Peace Script AI\n\n\n\n`;
    output += `Genre: ${data.mainGenre}\n`;
    output += `Logline: ${data.logLine}\n`;
    output += `\n\n\n\n\n\n\n\n`; // Page break simulation

    data.structure.forEach(point => {
        const scenes = data.generatedScenes[point.title] || [];
        scenes.forEach(scene => {
            const loc = (scene.sceneDesign.location || "INT. UNKNOWN - DAY").toUpperCase();
            
            // Scene Heading
            output += `\n${loc}\n\n`;
            
            // Action / Description
            scene.sceneDesign.situations.forEach(sit => {
                output += `${sit.description}\n\n`;
                
                // Dialogue
                sit.dialogue.forEach(d => {
                    const charName = d.character.toUpperCase();
                    // Indentation logic for text file (approximate)
                    output += `\t\t\t\t${charName}\n`; 
                    if (sit.characterThoughts && sit.characterThoughts.length > 0) {
                        output += `\t\t\t(thinking: ${sit.characterThoughts.substring(0, 20)}...)\n`;
                    }
                    output += `\t\t${d.dialogue}\n\n`;
                });
            });
        });
    });
    return output;
};

const generateShotListCSV = (data: ScriptData): string => {
    const headers = ["Scene #", "Shot #", "Cast", "Costume", "Description", "Size", "Angle", "Movement", "Equipment", "Lens", "Duration"];
    let csvContent = headers.join(",") + "\n";

    data.structure.forEach(point => {
        const scenes = data.generatedScenes[point.title] || [];
        scenes.forEach(scene => {
            scene.shotList.forEach(shot => {
                const row = [
                    scene.sceneNumber,
                    shot.shot,
                    `"${(shot.cast || '').replace(/"/g, '""')}"`,
                    `"${(shot.costume || '').replace(/"/g, '""')}"`,
                    `"${shot.description.replace(/"/g, '""')}"`, // Escape quotes
                    shot.shotSize,
                    shot.perspective,
                    shot.movement,
                    shot.equipment,
                    shot.focalLength,
                    shot.durationSec
                ];
                csvContent += row.join(",") + "\n";
            });
        });
    });
    return csvContent;
};

const generateStoryboardHTML = (data: ScriptData): string => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Storyboard - ${data.title}</title>
        <style>
            body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
            h1 { text-align: center; color: #333; }
            .scene-header { background: #333; color: white; padding: 10px; margin-top: 20px; border-radius: 5px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 15px; }
            .card { background: white; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
            .image-container { width: 100%; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .image-container img { width: 100%; height: 100%; object-fit: cover; }
            .info { padding: 15px; }
            .shot-num { font-weight: bold; color: #0088cc; font-size: 1.1em; }
            .desc { font-size: 0.9em; color: #555; margin-top: 5px; }
            .tech { font-size: 0.8em; color: #888; margin-top: 10px; font-style: italic; }
            @media print {
                body { background: white; }
                .card { border: 1px solid #ddd; }
            }
        </style>
    </head>
    <body>
        <h1>Storyboard: ${data.title}</h1>
    `;

    data.structure.forEach(point => {
        const scenes = data.generatedScenes[point.title] || [];
        scenes.forEach(scene => {
            if (!scene.storyboard || scene.storyboard.length === 0) return;

            html += `<div class="scene-header">Scene ${scene.sceneNumber}: ${scene.sceneDesign.sceneName}</div>`;
            html += `<div class="grid">`;
            
            scene.storyboard.forEach(sb => {
                const shotInfo = scene.shotList.find(s => s.shot === sb.shot);
                html += `
                    <div class="card">
                        <div class="image-container">
                            ${sb.image ? `<img src="${sb.image}" />` : '<span style="color:white">No Image</span>'}
                        </div>
                        <div class="info">
                            <div class="shot-num">Shot ${sb.shot}</div>
                            <div class="desc">${shotInfo?.description || ''}</div>
                            <div class="tech">
                                ${shotInfo?.shotSize || ''} | ${shotInfo?.perspective || ''} | ${shotInfo?.movement || ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
    });

    html += `</body></html>`;
    return html;
};


const LoadingSpinner: React.FC = () => (
    <div role="status" className="flex items-center justify-center space-x-2 h-full">
        <span className="sr-only">Loading...</span>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
    </div>
);

const SceneDisplay: React.FC<{ 
    sceneData: GeneratedScene; 
    onSave: (updatedScene: GeneratedScene) => void;
    allCharacters: Character[]; 
    onRegisterUndo?: () => void;
    goToStep: (step: number) => void;
    onNavigateToCharacter?: (charName: string, fromStep?: number, sceneContext?: { pointTitle: string; sceneIndex: number }) => void;
    pointTitle: string;
    sceneIndex: number;
}> = ({ sceneData, onSave, allCharacters, onRegisterUndo, goToStep, onNavigateToCharacter, pointTitle, sceneIndex }) => {
    const [activeTab, setActiveTab] = useState('design');
    const [isEditing, setIsEditing] = useState(false);
    const [editedScene, setEditedScene] = useState<GeneratedScene>(sceneData);
    
    // State for granular location editing
    const [locPrefix, setLocPrefix] = useState('INT.');
    const [locName, setLocName] = useState('');
    const [locTime, setLocTime] = useState('DAY');

    // State for storyboard generation
    const [generatingShotId, setGeneratingShotId] = useState<number | null>(null);
    const [generatingVideoShotId, setGeneratingVideoShotId] = useState<number | null>(null);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [storyboardStyle, setStoryboardStyle] = useState<string>(CHARACTER_IMAGE_STYLES[0]);

    // Deletion confirmation states (UI based to avoid window.confirm issues)
    const [confirmDeleteSituationId, setConfirmDeleteSituationId] = useState<number | null>(null);
    const [confirmDeleteShotId, setConfirmDeleteShotId] = useState<number | null>(null);

    // Ref for stopping auto-generation
    const abortGenerationRef = useRef(false);

    // Drag and Drop State for Dialogue
    const [draggedDialogueIndex, setDraggedDialogueIndex] = useState<number | null>(null);
    const [activeSituationForDrag, setActiveSituationForDrag] = useState<number | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ sitIndex: number; dlgIndex: number; position: 'top' | 'bottom' } | null>(null);

    // Helper to extract location parts
    const parseLocationParts = (loc: string) => {
        const prefixMatch = loc.match(/^(INT\.\/EXT\.|INT\.|EXT\.|I\/E\.)/);
        const timeMatch = loc.match(/-\s*(DAY|NIGHT|DAWN|DUSK|CONTINUOUS|LATER|MORNING|EVENING)$/);
        
        let prefix = prefixMatch ? prefixMatch[0] : 'INT.';
        let time = timeMatch ? timeMatch[1] : 'DAY';
        
        let name = loc;
        if (prefixMatch) name = name.replace(prefixMatch[0], '').trim();
        if (timeMatch) name = name.replace(timeMatch[0], '').trim();
        // Clean up leading hyphen if exists
        name = name.replace(/^-+\s*/, '').trim();

        if (!name && !prefixMatch && !timeMatch) name = loc; // Fallback if regex misses

        return { prefix, name, time };
    };

    useEffect(() => {
        if (!isEditing) {
            setEditedScene(sceneData);
        } else {
            const loc = sceneData.sceneDesign.location || '';
            const { prefix, name, time } = parseLocationParts(loc);
            
            setLocPrefix(prefix);
            setLocName(name);
            setLocTime(time);
        }
    }, [sceneData, isEditing]);

    const handleSave = () => {
        // Reconstruct location string
        const finalLocation = `${locPrefix} ${locName} - ${locTime}`;
        const finalScene = {
            ...editedScene,
            sceneDesign: {
                ...editedScene.sceneDesign,
                location: finalLocation
            }
        };
        onSave(finalScene);
        setIsEditing(false);
        setConfirmDeleteSituationId(null); // Reset states
    };

    const handleCancel = () => {
        setEditedScene(sceneData);
        setIsEditing(false);
        setConfirmDeleteSituationId(null);
    };

    // --- Edit Handlers ---
    const updateDesignField = (field: keyof typeof editedScene.sceneDesign, value: any) => {
        setEditedScene(prev => ({
            ...prev,
            sceneDesign: { ...prev.sceneDesign, [field]: value }
        }));
    };

    // --- Character List Management Handlers ---
    const handleAddCharacterToScene = (charName: string) => {
        if (!charName) return;
        setEditedScene(prev => ({
            ...prev,
            sceneDesign: {
                ...prev.sceneDesign,
                characters: [...prev.sceneDesign.characters, charName]
            }
        }));
    };

    const handleRemoveCharacterFromScene = (charName: string) => {
        setEditedScene(prev => ({
            ...prev,
            sceneDesign: {
                ...prev.sceneDesign,
                characters: prev.sceneDesign.characters.filter(c => c !== charName)
            }
        }));
    };

    // --- Wardrobe Manager Handlers ---
    const handleWardrobeChange = (charName: string, outfitId: string) => {
        setEditedScene(prev => ({
            ...prev,
            characterOutfits: {
                ...prev.characterOutfits,
                [charName]: outfitId
            }
        }));
    };

    // --- Situation Management ---
    const updateSituation = (index: number, field: string, value: any) => {
        setEditedScene(prev => {
            const newSituations = [...prev.sceneDesign.situations];
            newSituations[index] = { ...newSituations[index], [field]: value };
            return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
        });
    };

    const handleAddSituation = () => {
        setEditedScene(prev => ({
            ...prev,
            sceneDesign: {
                ...prev.sceneDesign,
                situations: [
                    ...prev.sceneDesign.situations,
                    { description: '', characterThoughts: '', dialogue: [] }
                ]
            }
        }));
    };

    const handleRemoveSituation = (index: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        
        // 2-Step Confirmation logic
        if (confirmDeleteSituationId === index) {
            // Confirmed
            if (onRegisterUndo) onRegisterUndo();

            setEditedScene(prev => {
                const newSituations = prev.sceneDesign.situations.filter((_, i) => i !== index);
                return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
            });
            setConfirmDeleteSituationId(null);
        } else {
            // First click
            setConfirmDeleteSituationId(index);
            setTimeout(() => setConfirmDeleteSituationId(prev => (prev === index ? null : prev)), 3000);
        }
    };

    // --- Dialogue Management (UPDATED FOR ARRAY) ---
    const updateDialogue = (sitIndex: number, lineId: string, field: 'character' | 'dialogue', value: string) => {
        setEditedScene(prev => {
             const newSituations = [...prev.sceneDesign.situations];
             const newDialogue = newSituations[sitIndex].dialogue.map(d => {
                 if (d.id === lineId) {
                     return { ...d, [field]: value };
                 }
                 return d;
             });
             
             newSituations[sitIndex] = { ...newSituations[sitIndex], dialogue: newDialogue };
             return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
        });
    };

    const handleAddDialogue = (sitIndex: number) => {
        setEditedScene(prev => {
            const newSituations = [...prev.sceneDesign.situations];
            const currentDialogue = [...newSituations[sitIndex].dialogue];
            
            // Generate unique ID for new line
            const newLine: DialogueLine = {
                id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                character: "",
                dialogue: ""
            };

            newSituations[sitIndex] = {
                ...newSituations[sitIndex],
                dialogue: [...currentDialogue, newLine]
            };
            return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
        });
    };

    const handleRemoveDialogue = (sitIndex: number, lineId: string) => {
        if (onRegisterUndo) onRegisterUndo();

        setEditedScene(prev => {
            const newSituations = [...prev.sceneDesign.situations];
            const newDialogue = newSituations[sitIndex].dialogue.filter(d => d.id !== lineId);

            newSituations[sitIndex] = { ...newSituations[sitIndex], dialogue: newDialogue };
            return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
        });
    };

    // --- Drag and Drop Logic for Dialogue ---
    const handleDragStart = (e: React.DragEvent, sitIndex: number, dlgIndex: number) => {
        setDraggedDialogueIndex(dlgIndex);
        setActiveSituationForDrag(sitIndex);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('opacity-50');
        setDraggedDialogueIndex(null);
        setActiveSituationForDrag(null);
        setDropIndicator(null);
    };

    const handleDragOver = (e: React.DragEvent, sitIndex: number, dlgIndex: number) => {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to prevent parent interference
        
        if (activeSituationForDrag !== sitIndex) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';
        
        setDropIndicator(prev => {
            // Optimization: Don't update state if it hasn't changed
            if (prev && prev.sitIndex === sitIndex && prev.dlgIndex === dlgIndex && prev.position === position) return prev;
            return { sitIndex, dlgIndex, position };
        });
    };

    const handleDrop = (e: React.DragEvent, sitIndex: number) => {
        e.preventDefault();
        if (draggedDialogueIndex === null || !dropIndicator || dropIndicator.sitIndex !== sitIndex) {
            handleDragEnd(e);
            return;
        }

        const { dlgIndex: targetIndex, position } = dropIndicator;
        
        // Prevent dropping on self
        if (draggedDialogueIndex === targetIndex && ((position === 'top') || (position === 'bottom'))) {
             handleDragEnd(e);
             return;
        }

        setEditedScene(prev => {
            const newSituations = [...prev.sceneDesign.situations];
            const dialogueList = [...newSituations[sitIndex].dialogue];
            
            // Remove source item
            const [movedItem] = dialogueList.splice(draggedDialogueIndex, 1);
            
            // Calculate destination index
            let insertIndex = targetIndex;
            
            // If dragging from above to below, the index shifts because we removed 1 item above
            if (draggedDialogueIndex < insertIndex) {
                insertIndex--; // Shift target up because an item above was removed
            }

            if (position === 'bottom') {
                insertIndex++;
            }
            
            // Safety clamp
            if (insertIndex < 0) insertIndex = 0;
            if (insertIndex > dialogueList.length) insertIndex = dialogueList.length;

            dialogueList.splice(insertIndex, 0, movedItem);

            newSituations[sitIndex] = { ...newSituations[sitIndex], dialogue: dialogueList };
            return { ...prev, sceneDesign: { ...prev.sceneDesign, situations: newSituations } };
        });

        handleDragEnd(e);
    };


    const updateTableItem = (section: 'shotList' | 'propList' | 'breakdown', index: number, field: string, value: string, subSection?: 'part1' | 'part2' | 'part3') => {
        setEditedScene(prev => {
            if (section === 'breakdown' && subSection) {
                 const newPart = [...prev.breakdown[subSection]];
                 const item = (newPart[index] || {}) as Record<string, string>;
                 const updatedItem: Record<string, string> = { ...item, [field]: value };
                 newPart[index] = updatedItem;
                 return { ...prev, breakdown: { ...prev.breakdown, [subSection]: newPart } };
            } else if (section === 'shotList') {
                 const list = [...prev.shotList];
                 const item = list[index] || {};
                 
                 // Smart Auto-Fill Logic for Shot List
                 let extraUpdates = {};
                 if (field === 'cast') {
                     // If cast changes, try to auto-set costume from Wardrobe Manager
                     const assignedOutfitId = prev.characterOutfits?.[value];
                     if (assignedOutfitId) {
                         extraUpdates = { costume: assignedOutfitId };
                     }
                 }

                 const updatedItem = { ...item, [field]: value, ...extraUpdates };
                 (list as any[])[index] = updatedItem;
                 return { ...prev, shotList: list };
            } else if (section === 'propList') {
                 const list = [...prev.propList];
                 const item = list[index] || {};
                 const updatedItem = { ...item, [field]: value };
                 (list as any[])[index] = updatedItem;
                 return { ...prev, propList: list };
            }
            return prev;
        });
    };

    // --- Storyboard Handlers ---
    const buildPrompt = (shotData: any, currentScene: GeneratedScene, isVideo: boolean = false) => {
        // 1. Context: Location
        const locationContext = currentScene.sceneDesign.location || "Unknown location";
        
        // 2. Context: Set Details (from Shot List override or default)
        const setDetails = shotData.set || locationContext;

        // 3. Context: Characters & Costumes
        // If 'Cast' is defined in Shot List, prioritize that specific character.
        // Otherwise, list all characters in the scene.
        let characterContext = "";
        
        if (shotData.cast) {
            // Specific Cast Member
            const profile = allCharacters.find(c => 
                c.name === shotData.cast || c.name.includes(shotData.cast)
            );
            
            if (profile) {
                const physical = profile.physical?.["Physical Characteristics"] || "";
                const hair = profile.physical?.["Hair style"] || "";
                
                // Costume Lookup
                let outfitDesc = profile.fashion?.["Main Outfit"] || "";
                if (shotData.costume) {
                    // Look up specific outfit ID in collection
                    const specificOutfit = profile.outfitCollection?.find(o => o.id === shotData.costume);
                    if (specificOutfit) {
                        outfitDesc = specificOutfit.description;
                    }
                }
                
                characterContext = `${shotData.cast}: ${physical}, ${hair}, wearing ${outfitDesc}`;
            } else {
                characterContext = shotData.cast; // Fallback to just name
            }
        } else {
            // Fallback: List all characters in scene with assigned wardrobes
            const sceneCharacterNames = currentScene.sceneDesign.characters || [];
            characterContext = sceneCharacterNames.map(name => {
                const profile = allCharacters.find(c => 
                    c.name.includes(name) || name.includes(c.name)
                );
                
                if (profile) {
                    const physical = profile.physical?.["Physical Characteristics"] || "";
                    // Check Wardrobe Assignment
                    const assignedOutfitId = currentScene.characterOutfits?.[name];
                    let outfitDesc = profile.fashion?.["Main Outfit"] || "";
                    
                    if (assignedOutfitId) {
                         const specificOutfit = profile.outfitCollection?.find(o => o.id === assignedOutfitId);
                         if (specificOutfit) outfitDesc = specificOutfit.description;
                    }
                    
                    return `${name}: ${physical}, wearing ${outfitDesc}`;
                }
                return "";
            }).filter(Boolean).join(". ");
        }

        // 4. Override style for Video Generation (Realism) vs Image Generation (Selected Style)
        const styleInstruction = isVideo 
            ? "Cinematic, Photorealistic, 4K, High Quality, Motion" 
            : storyboardStyle;

        // 5. Construct Rich Prompt with Style Continuity
        return `
            STYLE: ${styleInstruction}.
            SCENE SETTING: ${setDetails}.
            CHARACTERS: ${characterContext || "Generic characters"}.
            SHOT Action: ${shotData.description}.
            CAMERA SPECS: ${shotData.shotSize} Shot, ${shotData.perspective} Angle.
            LIGHTING/MOOD: ${shotData.lightingDesign || 'Neutral'}, ${currentScene.sceneDesign.moodTone}.
            Ensure character consistency with descriptions.
        `.trim();
    };

    const handleGenerateShotImage = async (shotIndex: number, shotData: any) => {
        if (onRegisterUndo) onRegisterUndo();
        const shotNumber = shotData.shot;
        if (!shotNumber) return;

        setGeneratingShotId(shotIndex);
        try {
            const prompt = buildPrompt(shotData, editedScene, false);
            const base64Image = await generateStoryboardImage(prompt);

            const oldStoryboardItem = editedScene.storyboard?.find(s => s.shot === shotNumber) || {};
            const newItem = { ...oldStoryboardItem, shot: shotNumber, image: base64Image };

            const updatedStoryboard = [
                ...(editedScene.storyboard?.filter(s => s.shot !== shotNumber) || []),
                newItem
            ];

            const updatedScene = { ...editedScene, storyboard: updatedStoryboard };
            setEditedScene(updatedScene);

            // Immediate Save
            if (!isEditing) onSave(updatedScene);

        } catch (error) {
            alert("Failed to generate image. Please try again.");
            console.error(error);
        } finally {
            setGeneratingShotId(null);
        }
    };

    const handleGenerateShotVideo = async (shotIndex: number, shotData: any, useImage: boolean = false) => {
        if (onRegisterUndo) onRegisterUndo();
        const shotNumber = shotData.shot;
        if (!shotNumber) return;

        setGeneratingVideoShotId(shotIndex);
        try {
            // Pass true for isVideo to force realistic style for text-to-video prompt
            const prompt = buildPrompt(shotData, editedScene, true);
            
            // Use existing image as base ONLY if useImage is true and image exists
            const existingImage = useImage 
                ? editedScene.storyboard?.find(s => s.shot === shotNumber)?.image 
                : undefined;
            
            const videoUri = await generateStoryboardVideo(prompt, existingImage);

            const oldStoryboardItem = editedScene.storyboard?.find(s => s.shot === shotNumber) || { shot: shotNumber, image: '' };
            const newItem = { ...oldStoryboardItem, video: videoUri };

            const updatedStoryboard = [
                ...(editedScene.storyboard?.filter(s => s.shot !== shotNumber) || []),
                newItem
            ];
            
            const updatedScene = { ...editedScene, storyboard: updatedStoryboard };
            setEditedScene(updatedScene);

            if (!isEditing) onSave(updatedScene);

        } catch (error) {
            alert("Failed to generate video. Note: Video generation requires a paid Google Cloud Project.");
            console.error(error);
        } finally {
            setGeneratingVideoShotId(null);
        }
    };

    const handleStopGeneration = () => {
        abortGenerationRef.current = true;
    };

    const handleGenerateAllShots = async () => {
        if (!window.confirm("This will auto-generate images for all shots without images. It may take some time. Continue?")) return;
        if (onRegisterUndo) onRegisterUndo();
        
        setIsGeneratingAll(true);
        abortGenerationRef.current = false; // Reset abort flag
        
        let currentSceneState = { ...editedScene };

        // Process sequentially to maintain state integrity and avoid overwhelming API
        for (let i = 0; i < currentSceneState.shotList.length; i++) {
            if (abortGenerationRef.current) {
                break; // Stop loop if aborted
            }

            const shot = currentSceneState.shotList[i];
            const shotNumber = shot.shot;
            
            // Skip if image exists
            if (currentSceneState.storyboard?.some(s => s.shot === shotNumber)) continue;

            setGeneratingShotId(i); // Update UI to show which shot is generating
            try {
                const prompt = buildPrompt(shot, currentSceneState, false);
                const base64Image = await generateStoryboardImage(prompt);
                
                // Update local accumulation object
                const oldItem = currentSceneState.storyboard?.find(s => s.shot === shotNumber) || {};
                const newItem = { ...oldItem, shot: shotNumber, image: base64Image };

                const newStoryboard = [
                    ...(currentSceneState.storyboard || []),
                    newItem
                ];
                currentSceneState = { ...currentSceneState, storyboard: newStoryboard };
                
                // Update React state visually
                setEditedScene(currentSceneState);

                // Immediate Save per shot (safety)
                if (!isEditing) onSave(currentSceneState);

            } catch (e) {
                console.error(`Failed to generate shot ${shotNumber}`, e);
                // Continue to next shot even if one fails
            }
        }

        setIsGeneratingAll(false);
        setGeneratingShotId(null);
        if (abortGenerationRef.current) {
            alert("Auto-generation stopped by user.");
        } else {
            alert("Batch generation complete!");
        }
    };

    const handleDeleteShotImage = (shotNumber: number) => {
        if (confirmDeleteShotId === shotNumber) {
             if (onRegisterUndo) onRegisterUndo();
             setEditedScene(prev => {
                 const newStoryboard = (prev.storyboard || []).filter(s => s.shot !== shotNumber);
                 if (!isEditing) onSave({ ...prev, storyboard: newStoryboard });
                 return { ...prev, storyboard: newStoryboard };
             });
             setConfirmDeleteShotId(null);
        } else {
             setConfirmDeleteShotId(shotNumber);
             setTimeout(() => setConfirmDeleteShotId(null), 3000);
        }
    };


    // Get parsed location for display view
    const displayLocation = parseLocationParts(editedScene.sceneDesign.location || "INT. UNKNOWN - DAY");


    // --- Renderers ---

    const renderEditableTable = (headers: string[], data: any[], section: 'shotList' | 'propList' | 'breakdown', subSection?: 'part1' | 'part2' | 'part3') => (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                    <tr>{headers.map(h => <th key={h} scope="col" className="px-4 py-3 min-w-[150px] whitespace-nowrap">{h.replace(/([A-Z])/g, ' $1').trim()}</th>)}</tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="border-t border-gray-700 hover:bg-gray-800/50 even:bg-gray-800/30">
                            {headers.map((h) => {
                                // Specific Logic for Shot List Columns
                                if (section === 'shotList' && h === 'cast') {
                                    // CAST DROPDOWN
                                    const availableCast = editedScene.sceneDesign.characters || [];
                                    return (
                                        <td key={`${i}-${h}`} className="px-2 py-2 min-w-[120px]">
                                            {isEditing ? (
                                                <select
                                                    value={safeRender((row as any)[h])}
                                                    onChange={(e) => updateTableItem(section, i, h, e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
                                                >
                                                    <option value="">Select Cast...</option>
                                                    {availableCast.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            ) : (
                                                // Link to Profile Logic
                                                <div className="flex items-center gap-1">
                                                    <span>{safeRender((row as any)[h]) || '-'}</span>
                                                    {(row as any)[h] && (
                                                        <button 
                                                            onClick={() => onNavigateToCharacter && onNavigateToCharacter((row as any)[h], 5, { pointTitle, sceneIndex })} // Jump to Character Step from Step 5 with context
                                                            className="text-cyan-500 hover:text-cyan-300"
                                                            title="Go to Profile"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                }

                                const isDropdown = section === 'shotList' && SHOT_OPTIONS[h];
                                return (
                                    <td key={`${i}-${h}`} className="px-2 py-2 min-w-[120px]">
                                        {isEditing ? (
                                            isDropdown ? (
                                                <select
                                                    value={safeRender((row as any)[h])}
                                                    onChange={(e) => updateTableItem(section, i, h as string, e.target.value, subSection)}
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
                                                >
                                                    {(isDropdown as string[]).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            ) : (
                                                <textarea
                                                    value={safeRender((row as any)[h])}
                                                    onChange={(e) => updateTableItem(section, i, h as string, e.target.value, subSection)}
                                                    rows={2}
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none resize-y"
                                                />
                                            )
                                        ) : (
                                            <span className="px-2 block">{safeRender((row as any)[h]) || '-'}</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // List of characters available in the project but NOT yet in the scene
    const availableCharactersToAdd = allCharacters.filter(
        c => !editedScene.sceneDesign.characters.includes(c.name)
    );

    return (
        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600 fade-in-scene relative">
             <div className="flex justify-between items-center border-b border-gray-600 mb-4 pb-2">
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveTab('design')} className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'design' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}>Scene Design</button>
                    <button type="button" onClick={() => setActiveTab('shotlist')} className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'shotlist' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}>Shot List</button>
                    <button type="button" onClick={() => setActiveTab('storyboard')} className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'storyboard' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}>Storyboard</button>
                    <button type="button" onClick={() => setActiveTab('proplist')} className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'proplist' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}>Prop List</button>
                    <button type="button" onClick={() => setActiveTab('breakdown')} className={`py-2 px-3 sm:px-4 font-medium transition-colors text-sm ${activeTab === 'breakdown' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}>Breakdown</button>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    {isEditing ? (
                        <>
                            <button type="button" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors shadow-lg">Save</button>
                            <button type="button" onClick={handleCancel} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors">Cancel</button>
                        </>
                    ) : (
                         <button type="button" onClick={() => setIsEditing(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors flex items-center gap-1 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                            Edit
                         </button>
                    )}
                </div>
            </div>

            <div className="prose prose-invert prose-sm max-w-none">
                {activeTab === 'design' && (
                     <div className="space-y-4">
                        {/* Modified Layout: Flex container for Header section */}
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                            
                            {/* Left Side: Scene Details */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs text-cyan-400 mb-1 uppercase tracking-wider font-bold">Scene Name</label>
                                    {isEditing ? <input type="text" value={editedScene.sceneDesign.sceneName} onChange={e => updateDesignField('sceneName', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-cyan-500" /> : <p className="font-bold text-white text-xl tracking-wide">{editedScene.sceneDesign.sceneName}</p>}
                                </div>
                                
                                {/* REFACTORED CHARACTER SECTION - COMPACT LIST VIEW */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs text-gray-400 font-bold uppercase tracking-wide">Characters</label>
                                        {isEditing && (
                                            <div className="relative">
                                                <select
                                                    value=""
                                                    onChange={(e) => handleAddCharacterToScene(e.target.value)}
                                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                    disabled={availableCharactersToAdd.length === 0}
                                                >
                                                    <option value="">Add...</option>
                                                    {availableCharactersToAdd.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </select>
                                                <button 
                                                    type="button" 
                                                    disabled={availableCharactersToAdd.length === 0}
                                                    className="text-[10px] bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 border border-cyan-800 rounded px-2 py-1 font-bold flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    + Add Character
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="bg-gray-900/40 rounded border border-gray-700 divide-y divide-gray-800">
                                        {editedScene.sceneDesign.characters.length === 0 && (
                                            <div className="p-3 text-center text-gray-500 text-xs italic">No characters in scene.</div>
                                        )}
                                        {editedScene.sceneDesign.characters.map((charName) => {
                                            const profile = allCharacters.find(c => c.name === charName);
                                            const outfits = profile?.outfitCollection || [];
                                            const currentOutfitId = editedScene.characterOutfits?.[charName] || '';
                                            const currentOutfitDesc = outfits.find(o => o.id === currentOutfitId)?.description || 'Default Look';
                                            
                                            return (
                                                <div key={charName} className="flex items-center justify-between p-2 hover:bg-gray-800/50 transition-colors group">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        {/* Avatar */}
                                                        <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                                                            {profile?.image ? (
                                                                <img src={profile.image} alt={charName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-500">{charName.substring(0,2).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Name & Wardrobe */}
                                                        <div className="flex-1">
                                                             <div className="flex items-center gap-2">
                                                                <span 
                                                                    className="text-sm font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                                                                    onClick={() => onNavigateToCharacter && onNavigateToCharacter(charName, 5, { pointTitle, sceneIndex })}
                                                                    title="Go to Profile"
                                                                >
                                                                    {charName}
                                                                </span>
                                                             </div>
                                                             {isEditing ? (
                                                                 <select 
                                                                    value={currentOutfitId} 
                                                                    onClick={(e) => e.stopPropagation()} 
                                                                    onChange={e => handleWardrobeChange(charName, e.target.value)}
                                                                    className="mt-0.5 w-full max-w-[200px] bg-gray-900 border border-gray-600 rounded px-1.5 py-0.5 text-[10px] text-gray-300 outline-none"
                                                                >
                                                                    <option value="">Default Look</option>
                                                                    {outfits.map((o, idx) => (
                                                                        <option key={o.id || idx} value={o.id}>
                                                                            {o.id ? `Outfit ${o.id}` : `Outfit ${idx+1}`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                             ) : (
                                                                <span className="text-[10px] text-gray-500 block truncate" title={currentOutfitDesc}>
                                                                    {currentOutfitId ? `Wearing: ${currentOutfitId}` : 'Default Wardrobe'}
                                                                </span>
                                                             )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Remove Button */}
                                                    {isEditing && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveCharacterFromScene(charName); }}
                                                            className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20"
                                                            title="Remove from Scene"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Context Column (Location + Mood) */}
                            <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 animate-fade-in-scene">
                                
                                {/* 1. Scene Header (Location Box) */}
                                <div className="bg-black/40 border border-cyan-900/50 rounded-lg overflow-hidden flex flex-col">
                                    <div className="bg-gray-800/80 px-4 py-2 border-b border-gray-700">
                                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest text-center">Scene Header</h4>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-center">
                                        {isEditing ? (
                                            <div className="flex flex-col gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Int / Ext</label>
                                                    <select value={locPrefix} onChange={e => setLocPrefix(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm">
                                                        <option value="INT.">INT. (Indoor)</option>
                                                        <option value="EXT.">EXT. (Outdoor)</option>
                                                        <option value="INT./EXT.">INT./EXT.</option>
                                                        <option value="I/E.">I/E.</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Location</label>
                                                    <input 
                                                        type="text" 
                                                        value={locName} 
                                                        onChange={e => setLocName(e.target.value)} 
                                                        placeholder="Location Name"
                                                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Time</label>
                                                    <select value={locTime} onChange={e => setLocTime(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm">
                                                        <option value="DAY">DAY</option>
                                                        <option value="NIGHT">NIGHT</option>
                                                        <option value="DAWN">DAWN</option>
                                                        <option value="DUSK">DUSK</option>
                                                        <option value="CONTINUOUS">CONTINUOUS</option>
                                                        <option value="LATER">LATER</option>
                                                        <option value="MORNING">MORNING</option>
                                                        <option value="EVENING">EVENING</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View Mode: Single Row, 3 Columns */
                                            <div className="flex items-center gap-1 text-center h-full">
                                                <div className="flex-1 bg-gray-900/50 rounded p-1.5 border border-gray-700 h-full flex flex-col justify-center">
                                                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">INT/EXT</span>
                                                    <span className="font-mono text-xs font-bold text-white leading-tight">{displayLocation.prefix}</span>
                                                </div>
                                                <div className="flex-[2] bg-gray-900/50 rounded p-1.5 border border-gray-700 h-full flex flex-col justify-center">
                                                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">LOCATION</span>
                                                    <span className="font-mono text-xs font-bold text-white break-words leading-tight">{displayLocation.name}</span>
                                                </div>
                                                <div className="flex-1 bg-gray-900/50 rounded p-1.5 border border-gray-700 h-full flex flex-col justify-center">
                                                    <span className="block text-[9px] text-gray-500 uppercase font-bold mb-0.5">TIME</span>
                                                    <span className="font-mono text-xs font-bold text-white leading-tight">{displayLocation.time}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Mood & Tone Box (Moved Here) */}
                                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex flex-col justify-center min-h-[80px]">
                                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">Mood & Tone</label>
                                     {isEditing ? (
                                        <textarea 
                                            value={editedScene.sceneDesign.moodTone} 
                                            onChange={e => updateDesignField('moodTone', e.target.value)} 
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:ring-1 focus:ring-cyan-500 resize-none text-center"
                                            rows={2}
                                            placeholder="e.g. Tense, Dark, Humorous"
                                        />
                                     ) : (
                                        <p className="text-gray-300 text-sm text-center italic">{editedScene.sceneDesign.moodTone || "Not specified"}</p>
                                     )}
                                </div>

                            </div>
                        </div>
                        
                        <div className="my-6 border-b border-gray-700"></div>
                        
                        {editedScene.sceneDesign.situations.map((sit, i) => (
                            <div key={i} className="p-4 bg-gray-800 rounded-lg border border-gray-700 mb-4 shadow-sm hover:border-gray-500 transition-colors">
                                {/* Situation Header with Delete Button (Dedicated Row) */}
                                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 bg-gray-900/30 -mx-4 -mt-4 p-4 rounded-t-lg">
                                     <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-cyan-900/50 flex items-center justify-center text-xs font-bold text-cyan-400 border border-cyan-800">
                                            {i+1}
                                        </div>
                                        <label className="text-sm text-cyan-400 font-bold uppercase tracking-wider">Situation</label>
                                     </div>
                                     {isEditing && (
                                         <button 
                                             type="button"
                                             onClick={(e) => handleRemoveSituation(i, e)}
                                             className={`flex items-center gap-1 px-3 py-1.5 border rounded text-xs transition-all font-bold group ${
                                                 confirmDeleteSituationId === i 
                                                 ? 'bg-red-600 text-white border-red-500 hover:bg-red-700' 
                                                 : 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/60 hover:text-red-200'
                                             }`}
                                             title="Delete this situation"
                                         >
                                            {confirmDeleteSituationId === i ? (
                                                <span>Click to Confirm Delete</span>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    Delete Situation
                                                </>
                                            )}
                                         </button>
                                     )}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">Description</label>
                                    {isEditing ? (
                                        <textarea value={sit.description} onChange={e => updateSituation(i, 'description', e.target.value)} rows={3} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-cyan-500" placeholder="Describe what happens..." />
                                    ) : <p className="text-gray-200">{sit.description}</p>}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">Character Thoughts</label>
                                    {isEditing ? (
                                        <textarea value={sit.characterThoughts} onChange={e => updateSituation(i, 'characterThoughts', e.target.value)} rows={2} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-cyan-500" placeholder="Internal monologue..." />
                                    ) : <p className="italic text-gray-400 pl-2 border-l-2 border-gray-600">{sit.characterThoughts}</p>}
                                </div>
                                
                                <div className="bg-gray-900/50 p-3 rounded-md">
                                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold text-center">Dialogue</label>
                                    <div className="space-y-3">
                                        {/* Updated Dialogue Loop using Array for Stable Keys and Reordering */}
                                        {sit.dialogue.map((line, dIndex) => {
                                            const isDropTarget = dropIndicator?.sitIndex === i && dropIndicator?.dlgIndex === dIndex;
                                            const isTop = isDropTarget && dropIndicator?.position === 'top';
                                            const isBottom = isDropTarget && dropIndicator?.position === 'bottom';
                                            
                                            return (
                                            <div 
                                                key={line.id} 
                                                draggable={isEditing}
                                                onDragStart={(e) => handleDragStart(e, i, dIndex)}
                                                onDragOver={(e) => handleDragOver(e, i, dIndex)}
                                                onDrop={(e) => handleDrop(e, i)}
                                                className={`transition-all ${isEditing ? 'flex flex-col sm:flex-row gap-2 items-start p-2 rounded border border-transparent hover:bg-gray-800/50 cursor-move' : 'mb-2'} 
                                                    ${isTop ? 'border-t-2 border-t-cyan-500' : ''} 
                                                    ${isBottom ? 'border-b-2 border-b-cyan-500' : ''}
                                                `}
                                            >
                                                {isEditing ? (
                                                    <>
                                                        {/* Drag Handle */}
                                                        <div className="hidden sm:flex self-center text-gray-600 cursor-move hover:text-gray-400 px-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                                                            </svg>
                                                        </div>

                                                        <div className="sm:w-1/4 w-full">
                                                            <input 
                                                                type="text" 
                                                                value={line.character} 
                                                                onChange={e => updateDialogue(i, line.id, 'character', e.target.value)} 
                                                                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-cyan-400 font-bold text-sm text-center" 
                                                                placeholder="Speaker"
                                                            />
                                                        </div>
                                                        <div className="flex-1 w-full flex gap-2">
                                                            <textarea 
                                                                value={line.dialogue} 
                                                                onChange={e => updateDialogue(i, line.id, 'dialogue', e.target.value)} 
                                                                rows={1}
                                                                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm resize-none" 
                                                                placeholder="Dialogue line"
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleRemoveDialogue(i, line.id)}
                                                                className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-red-900/30 border border-gray-600 hover:border-red-500 rounded text-gray-400 hover:text-red-400 transition-all shrink-0"
                                                                title="Remove line"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex gap-4">
                                                        <span className="text-cyan-400 font-bold min-w-[80px] text-right text-sm">{line.character}</span>
                                                        <span className="text-gray-300 text-sm">{line.dialogue}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )})}
                                        {isEditing && (
                                            <button 
                                                type="button"
                                                onClick={() => handleAddDialogue(i)}
                                                className="w-full py-2 border-2 border-dashed border-gray-700 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 rounded text-xs font-bold transition-all mt-2"
                                            >
                                                + Add Dialogue Line
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isEditing && (
                            <button 
                                type="button"
                                onClick={handleAddSituation}
                                className="w-full py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-cyan-400 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                Add New Situation
                            </button>
                        )}
                    </div>
                )}
                {/* Fixed: Use standardized headers for Shot List to ensure all columns appear */}
                {activeTab === 'shotlist' && (editedScene.shotList.length > 0 || isEditing ? renderEditableTable(SHOT_LIST_HEADERS, editedScene.shotList, 'shotList') : <p className="text-gray-500 italic">No shot list available. Click Edit to start adding shots.</p>)}
                
                {/* New Storyboard Tab */}
                {activeTab === 'storyboard' && (
                     <div className="flex flex-col gap-6">
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex-1 w-full sm:w-auto">
                                <label className="block text-xs font-bold text-gray-400 mb-1">SCENE VISUAL STYLE (CONTINUITY)</label>
                                <select 
                                    value={storyboardStyle} 
                                    onChange={(e) => setStoryboardStyle(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                                >
                                    {CHARACTER_IMAGE_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                {isGeneratingAll ? (
                                    <button
                                        type="button"
                                        onClick={handleStopGeneration}
                                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                                        STOP GENERATION
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleGenerateAllShots}
                                        disabled={isGeneratingAll}
                                        className="w-full sm:w-auto bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                        Auto-Generate All Missing Shots
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {editedScene.shotList.length > 0 ? (
                                editedScene.shotList.map((shot, idx) => {
                                    const shotImg = editedScene.storyboard?.find(s => s.shot === shot.shot)?.image;
                                    const shotVideo = editedScene.storyboard?.find(s => s.shot === shot.shot)?.video;
                                    const isGenerating = generatingShotId === idx;
                                    const isGeneratingVideo = generatingVideoShotId === idx;
                                    
                                    return (
                                        <div key={idx} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col shadow-lg">
                                            {/* Media Area */}
                                            <div className="aspect-video bg-black/50 relative flex items-center justify-center overflow-hidden border-b border-gray-700 group">
                                                {shotVideo ? (
                                                    <video 
                                                        src={shotVideo} 
                                                        controls 
                                                        className="w-full h-full object-cover" 
                                                        playsInline
                                                    />
                                                ) : shotImg ? (
                                                    <img src={shotImg} alt={`Shot ${shot.shot}`} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
                                                ) : (
                                                    <div className="text-gray-600 flex flex-col items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-xs">No media</span>
                                                    </div>
                                                )}
                                                
                                                {/* Overlay Controls */}
                                                {(shotImg || shotVideo) && (
                                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDeleteShotImage(shot.shot)}
                                                            className={`p-1.5 rounded-full text-white transition-colors ${confirmDeleteShotId === shot.shot ? 'bg-red-600' : 'bg-black/60 hover:bg-red-900/80'}`}
                                                            title="Delete Media"
                                                        >
                                                            {confirmDeleteShotId === shot.shot ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                {(isGenerating || isGeneratingVideo) && (
                                                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                                                        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                        <span className="text-cyan-400 text-xs font-bold animate-pulse">
                                                            {isGeneratingVideo ? 'Rendering Video...' : 'Painting...'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info & Action Area */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-bold text-lg text-cyan-400">Shot {shot.shot}</h5>
                                                    <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300 border border-gray-600">{shot.shotSize}</span>
                                                </div>
                                                <p className="text-sm text-gray-300 mb-4 line-clamp-3 flex-grow">{shot.description}</p>
                                                
                                                <div className="mt-auto pt-3 border-t border-gray-700 grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGenerateShotImage(idx, shot)}
                                                        disabled={isGeneratingAll || isGenerating || isGeneratingVideo}
                                                        className={`col-span-2 py-2 px-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                                            shotImg 
                                                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20'
                                                        }`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                                                        {shotImg ? 'Regenerate Image' : 'Gen Image'}
                                                    </button>
                                                    
                                                    {/* Text-to-Video Button (Always Available) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGenerateShotVideo(idx, shot, false)}
                                                        disabled={isGeneratingAll || isGenerating || isGeneratingVideo}
                                                        className={`py-2 px-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                                                        Vid (Txt)
                                                    </button>

                                                    {/* Image-to-Video Button (Only if image exists) */}
                                                    {shotImg ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGenerateShotVideo(idx, shot, true)}
                                                            disabled={isGeneratingAll || isGenerating || isGeneratingVideo}
                                                            className={`py-2 px-2 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20`}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4z" /><path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" /></svg>
                                                            Vid (Img)
                                                        </button>
                                                    ) : (
                                                        // Placeholder to keep grid structure if no image
                                                        <div className="hidden"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-700 rounded-lg bg-gray-900/30">
                                    <p className="text-gray-500 mb-2">No shots found in Shot List.</p>
                                    <button type="button" onClick={() => setActiveTab('shotlist')} className="text-cyan-400 hover:underline text-sm">Go to Shot List to add shots first</button>
                                </div>
                            )}
                        </div>
                     </div>
                )}
                
                {activeTab === 'proplist' && (editedScene.propList.length > 0 ? renderEditableTable(Object.keys(editedScene.propList[0] || {}), editedScene.propList, 'propList') : <p className="text-gray-500 italic">No prop list available.</p>)}
                {activeTab === 'breakdown' && (
                     <div className="space-y-4">
                        <h4 className="font-bold text-cyan-400">Part 1: General Info</h4>
                        {editedScene.breakdown.part1.length > 0 ? renderEditableTable(Object.keys(editedScene.breakdown.part1?.[0] || {}), editedScene.breakdown.part1, 'breakdown', 'part1') : <p>No data</p>}
                        
                        <h4 className="font-bold text-cyan-400 pt-4">Part 2: Scene Details</h4>
                        {editedScene.breakdown.part2.length > 0 ? renderEditableTable(Object.keys(editedScene.breakdown.part2?.[0] || {}), editedScene.breakdown.part2, 'breakdown', 'part2') : <p>No data</p>}
                        
                        <h4 className="font-bold text-cyan-400 pt-4">Part 3: Requirements</h4>
                        {editedScene.breakdown.part3.length > 0 ? renderEditableTable(Object.keys(editedScene.breakdown.part3?.[0] || {}), editedScene.breakdown.part3, 'breakdown', 'part3') : <p>No data</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

// Collapsible Scene Wrapper
const SceneItem: React.FC<{
  sceneIndex: number;
  sceneNumber: number;
  isPart: boolean;
  status: 'pending' | 'loading' | 'done' | 'error' | undefined;
  sceneData: GeneratedScene | undefined;
  button: React.ReactNode;
  onUpdate: (scene: GeneratedScene) => void;
  allCharacters: Character[];
  onRegisterUndo?: () => void;
  goToStep: (step: number) => void;
  onNavigateToCharacter?: (charName: string, fromStep?: number, sceneContext?: { pointTitle: string; sceneIndex: number }) => void;
  pointTitle: string; // Needed for anchor ID
}> = ({ sceneIndex, sceneNumber, isPart, status, sceneData, button, onUpdate, allCharacters, onRegisterUndo, goToStep, onNavigateToCharacter, pointTitle }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="p-3 bg-gray-900/40 rounded-md border border-gray-700 transition-all duration-300">
            <div 
                className="flex justify-between items-center cursor-pointer select-none group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-full transition-all duration-300 ${isExpanded ? 'bg-cyan-900 text-cyan-400 rotate-180' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    <h4 className={`font-semibold transition-colors ${isExpanded ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-300'}`}>
                        Scene {sceneNumber} {isPart ? `(Part ${sceneIndex + 1})` : ''}
                        {sceneData?.sceneDesign.sceneName && !isExpanded && (
                            <span className="text-sm font-normal text-gray-500 ml-2 border-l border-gray-700 pl-2">
                                {sceneData.sceneDesign.sceneName}
                            </span>
                        )}
                    </h4>
                </div>
                <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
                    <div className="text-sm font-mono w-20 text-right">
                        {status === 'pending' && <span className="text-gray-500">Pending</span>}
                        {status === 'done' && <span className="text-green-400">✓ Done</span>}
                        {status === 'error' && <span className="text-red-400">✗ Error</span>}
                    </div>
                    <div className="w-24 h-6 text-center">{button}</div>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-2 animate-fade-in-scene border-t border-gray-700/50 pt-2">
                    {sceneData ? (
                        <SceneDisplay 
                            sceneData={sceneData} 
                            onSave={onUpdate}
                            allCharacters={allCharacters}
                            onRegisterUndo={onRegisterUndo}
                            goToStep={goToStep}
                            onNavigateToCharacter={onNavigateToCharacter}
                            pointTitle={pointTitle}
                            sceneIndex={sceneIndex}
                        />
                    ) : (
                         <div className="mt-4 p-10 flex items-center justify-center bg-gray-900/20 rounded-lg border-2 border-dashed border-gray-700">
                            <p className="text-gray-500 text-sm">
                                {status === 'error'
                                    ? 'Generation failed. Please try again.'
                                    : 'Scene not generated yet.'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const Step5Output: React.FC<Step5OutputProps> = ({ scriptData, setScriptData, prevStep, onRegisterUndo, goToStep, onNavigateToCharacter, returnToScene, onResetReturnToScene }) => {
  type Status = 'pending' | 'loading' | 'done' | 'error';
  type GenerationStatus = Record<string, Record<number, Status>>;

  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(() => 
    Object.fromEntries(scriptData.structure.map(p => [
      p.title, 
      Object.fromEntries(Array.from({ length: scriptData.scenesPerPoint[p.title] || 1 }, (_, i) => [i, scriptData.generatedScenes[p.title]?.[i] ? 'done' : 'pending']))
    ]))
  );
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // --- AUTO SCROLL EFFECT ---
  useEffect(() => {
    if (returnToScene && onResetReturnToScene) {
        // Slight delay to ensure DOM is fully rendered
        const timer = setTimeout(() => {
            const elementId = `scene-${returnToScene.pointTitle.replace(/\s+/g, '-')}-${returnToScene.sceneIndex}`;
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a highlight effect
                element.classList.add('ring-2', 'ring-cyan-500', 'ring-offset-2', 'ring-offset-gray-900');
                setTimeout(() => element.classList.remove('ring-2', 'ring-cyan-500', 'ring-offset-2', 'ring-offset-gray-900'), 2000);
                
                onResetReturnToScene();
            }
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [returnToScene, onResetReturnToScene]);

  const sceneNumberMap = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    let currentSceneNumber = 1;
    scriptData.structure.forEach(point => {
      map[point.title] = {};
      const sceneCount = scriptData.scenesPerPoint[point.title] ?? 1; // Default to 1 if undefined
      for (let i = 0; i < sceneCount; i++) {
        map[point.title][i] = currentSceneNumber++;
      }
    });
    return map;
  }, [scriptData.structure, scriptData.scenesPerPoint]);

  const handleGenerateSingle = useCallback(async (plotPoint: PlotPoint, sceneIndex: number) => {
    if (onRegisterUndo) onRegisterUndo();
    setGlobalError(null);
    setGenerationStatus(prev => ({ ...prev, [plotPoint.title]: { ...prev[plotPoint.title], [sceneIndex]: 'loading' } }));
    try {
      const sceneNumber = sceneNumberMap[plotPoint.title][sceneIndex];
      const scene = await generateScene(scriptData, plotPoint, sceneIndex, scriptData.scenesPerPoint[plotPoint.title], sceneNumber);
      
      setScriptData(prev => {
        const newScenesForPoint = [...(prev.generatedScenes[plotPoint.title] || [])];
        newScenesForPoint[sceneIndex] = scene;
        return {
          ...prev,
          generatedScenes: { ...prev.generatedScenes, [plotPoint.title]: newScenesForPoint },
        };
      });
      setGenerationStatus(prev => ({ ...prev, [plotPoint.title]: { ...prev[plotPoint.title], [sceneIndex]: 'done' } }));
    } catch (e: any) {
      setGenerationStatus(prev => ({ ...prev, [plotPoint.title]: { ...prev[plotPoint.title], [sceneIndex]: 'error' } }));
    }
  }, [scriptData, setScriptData, sceneNumberMap, onRegisterUndo]);

  const allTasks = useMemo(() => {
      const tasks: { point: PlotPoint, sceneIndex: number }[] = [];
      scriptData.structure.forEach(point => {
          for(let i = 0; i < (scriptData.scenesPerPoint[point.title] ?? 1); i++) {
              if (generationStatus[point.title]?.[i] === 'pending' || generationStatus[point.title]?.[i] === 'error' || generationStatus[point.title]?.[i] === undefined) {
                  tasks.push({ point, sceneIndex: i });
              }
          }
      });
      return tasks;
  }, [scriptData.structure, scriptData.scenesPerPoint, generationStatus]);

  const handleGenerateAll = useCallback(async () => {
    if (onRegisterUndo) onRegisterUndo();
    setGlobalError(null);
    for (const task of allTasks) {
      try {
        await handleGenerateSingle(task.point, task.sceneIndex);
      } catch (e) {
        setGlobalError(`Failed to generate scene for "${task.point, task.point.title}". Generation paused.`);
        break; 
      }
    }
  }, [allTasks, handleGenerateSingle, onRegisterUndo]);
  
  const downloadShotList = () => {
      const csv = generateShotListCSV(scriptData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${scriptData.title.replace(/\s+/g, '_')}_ShotList.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const downloadStoryboard = () => {
      const html = generateStoryboardHTML(scriptData);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${scriptData.title.replace(/\s+/g, '_')}_Storyboard.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const downloadScreenplay = () => {
      const text = generateScreenplayText(scriptData);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${scriptData.title.replace(/\s+/g, '_')}_Screenplay.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSceneUpdate = (pointTitle: string, sceneIndex: number, updatedScene: GeneratedScene) => {
    setScriptData(prev => {
        const newScenes = [...(prev.generatedScenes[pointTitle] || [])];
        newScenes[sceneIndex] = updatedScene;
        return {
            ...prev,
            generatedScenes: {
                ...prev.generatedScenes,
                [pointTitle]: newScenes
            }
        };
    });
  };

  const handleAddScene = (pointTitle: string) => {
    if (onRegisterUndo) onRegisterUndo();
    const currentCount = scriptData.scenesPerPoint[pointTitle] || 0;
    const newIndex = currentCount;

    setScriptData(prev => ({
        ...prev,
        scenesPerPoint: {
            ...prev.scenesPerPoint,
            [pointTitle]: currentCount + 1
        }
    }));
    
    setGenerationStatus(prev => ({
        ...prev,
        [pointTitle]: {
            ...prev[pointTitle],
            [newIndex]: 'pending'
        }
    }));
  };

  const handleRemoveScene = (pointTitle: string) => {
      const currentCount = scriptData.scenesPerPoint[pointTitle] || 0;
      if (currentCount <= 0) return;

      const lastIndex = currentCount - 1;
      const hasData = scriptData.generatedScenes[pointTitle]?.[lastIndex];
      
      // Register Undo
      if (onRegisterUndo) onRegisterUndo();
      
      if (hasData) {
          if (!window.confirm(`Are you sure you want to delete the last scene (Scene ${lastIndex + 1}) in "${pointTitle}"? This cannot be undone.`)) {
              return;
          }
      }

      setScriptData(prev => {
          const newScenes = prev.generatedScenes[pointTitle] ? [...prev.generatedScenes[pointTitle]] : [];
          if (newScenes.length > lastIndex) {
            newScenes.splice(lastIndex, 1);
          }
          
          return {
              ...prev,
              scenesPerPoint: {
                  ...prev.scenesPerPoint,
                  [pointTitle]: currentCount - 1
              },
              generatedScenes: {
                  ...prev.generatedScenes,
                  [pointTitle]: newScenes
              }
          };
      });

      setGenerationStatus(prev => {
          const newStatusGroup = { ...(prev[pointTitle] || {}) };
          delete newStatusGroup[lastIndex];
          return {
              ...prev,
              [pointTitle]: newStatusGroup
          };
      });
  };

  const allDone = allTasks.length === 0;
  const isLoading = Object.values(generationStatus).some(pointStatus => Object.values(pointStatus).includes('loading'));

  const getButtonForScene = (point: PlotPoint, sceneIndex: number) => {
    const status = generationStatus[point.title]?.[sceneIndex];
    switch (status) {
        case 'loading': return <LoadingSpinner />;
        case 'done': return <button type="button" onClick={() => handleGenerateSingle(point, sceneIndex)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">Regenerate</button>;
        case 'error': return <button type="button" onClick={() => handleGenerateSingle(point, sceneIndex)} className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md">Retry</button>;
        default: return <button type="button" onClick={() => handleGenerateSingle(point, sceneIndex)} className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded-md">Generate</button>;
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-cyan-400">STEP 5: Scene Design & Final Output</h2>
          
          {/* TOP ACTION BUTTONS (Moved from bottom) */}
          <div className="flex flex-wrap gap-2">
             <button type="button" onClick={() => setShowPreview(true)} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm shadow-lg">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                 Preview
             </button>

             {/* Export Dropdown */}
             <div className="relative">
                 <button 
                    type="button" 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm border border-gray-600 shadow-lg"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export Options
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                 </button>
                 
                 {isExportMenuOpen && (
                     <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-md shadow-xl border border-gray-700 z-50 overflow-hidden animate-fade-in-scene">
                         <div className="py-1">
                             <button onClick={() => { downloadScreenplay(); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-cyan-400 hover:bg-gray-700 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Screenplay (.txt)
                             </button>
                             <button onClick={() => { downloadShotList(); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-green-400 hover:bg-gray-700 flex items-center gap-2 border-t border-gray-700/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                Shot List (.csv)
                             </button>
                             <button onClick={() => { downloadStoryboard(); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-purple-400 hover:bg-gray-700 flex items-center gap-2 border-t border-gray-700/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Storyboard (.html)
                             </button>
                         </div>
                     </div>
                 )}
             </div>
          </div>
      </div>
      
      {!allDone && (
        <div className="text-center mb-8 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
            <p className="text-gray-400 mb-4">Generate scenes one-by-one or all at once.</p>
            <button
            type="button"
            onClick={handleGenerateAll}
            disabled={isLoading || allDone}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 text-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
            {isLoading ? 'Generating...' : `Generate All Pending (${allTasks.length})`}
            </button>
            {globalError && <p className="text-red-400 mt-2 text-sm">{globalError}</p>}
        </div>
      )}

      <div className="space-y-6">
        {scriptData.structure.map(point => (
          <div key={point.title} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold text-gray-200">{point.title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleAddScene(point.title)}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-xs text-cyan-400 font-bold transition-colors"
                        title="Add Scene"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Add Scene
                    </button>
                    <button
                        type="button"
                        onClick={() => handleRemoveScene(point.title)}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-red-900/50 rounded-md text-xs text-red-400 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove Scene"
                        disabled={(scriptData.scenesPerPoint[point.title] || 0) <= 0}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                        Remove
                    </button>
                </div>
            </div>
            {/* Added Description/Context Display */}
            {point.description && <p className="text-gray-400 text-sm mb-4 italic">{point.description}</p>}
            
            <div className="space-y-4">
              {Array.from({ length: scriptData.scenesPerPoint[point.title] ?? 1 }).map((_, sceneIndex) => {
                  const sceneDataForPoint = scriptData.generatedScenes[point.title]?.[sceneIndex];
                  const sceneNumber = sceneNumberMap[point.title][sceneIndex];
                  const status = generationStatus[point.title]?.[sceneIndex];
                  const button = getButtonForScene(point, sceneIndex);

                  return (
                    <div id={`scene-${point.title.replace(/\s+/g, '-')}-${sceneIndex}`} key={sceneIndex} className="scroll-mt-32">
                        <SceneItem 
                            sceneIndex={sceneIndex}
                            sceneNumber={sceneNumber}
                            isPart={scriptData.scenesPerPoint[point.title] > 1}
                            status={status}
                            sceneData={sceneDataForPoint}
                            button={button}
                            onUpdate={(updatedScene) => handleSceneUpdate(point.title, sceneIndex, updatedScene)}
                            allCharacters={scriptData.characters}
                            onRegisterUndo={onRegisterUndo}
                            goToStep={goToStep}
                            onNavigateToCharacter={onNavigateToCharacter}
                            pointTitle={point.title}
                        />
                    </div>
                  );
              })}
              {(scriptData.scenesPerPoint[point.title] || 0) === 0 && (
                   <div className="p-8 text-center bg-gray-900/20 rounded-lg border border-gray-800 text-gray-500 italic">
                       No scenes added for this plot point.
                   </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-between items-center">
        <button type="button" onClick={prevStep} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300">Back</button>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-300 bg-gray-200 flex justify-between items-center flex-shrink-0 text-gray-800">
              <h3 className="text-lg font-bold font-mono">SCRIPT PREVIEW MODE</h3>
              <div className="flex gap-4">
                  <button onClick={downloadScreenplay} className="text-xs bg-white border border-gray-400 hover:bg-gray-50 px-3 py-1 rounded font-bold shadow-sm">Download .txt</button>
                  <button 
                    type="button"
                    onClick={() => setShowPreview(false)} 
                    className="text-gray-500 hover:text-red-600 text-2xl font-bold leading-none"
                  >
                    &times;
                  </button>
              </div>
            </div>
            {/* Screenplay Viewer */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 font-mono text-black bg-white shadow-inner">
                <div className="max-w-[800px] mx-auto text-[14px] sm:text-[16px] leading-relaxed">
                    <div className="text-center mb-24 mt-12">
                        <h1 className="underline font-bold text-xl uppercase mb-4">{scriptData.title}</h1>
                        <p className="text-sm">by</p>
                        <p className="font-bold mb-8">Peace Script AI</p>
                        <p className="text-xs text-gray-500">Logline: {scriptData.logLine}</p>
                    </div>

                    {scriptData.structure.map((point, pIdx) => (
                        <div key={pIdx}>
                            {scriptData.generatedScenes[point.title]?.map((scene, sIdx) => (
                                <div key={sIdx} className="mb-6">
                                    <h3 className="font-bold uppercase mb-4 mt-8">
                                        {(scene.sceneDesign.location || "INT. UNKNOWN - DAY").toUpperCase()}
                                    </h3>
                                    
                                    {scene.sceneDesign.situations.map((sit, sitIdx) => (
                                        <div key={sitIdx} className="mb-4">
                                            <p className="mb-4">{sit.description}</p>
                                            
                                            {sit.dialogue.map((d, dIdx) => (
                                                <div key={dIdx} className="mb-3">
                                                    <div className="text-center font-bold uppercase w-1/2 mx-auto">{d.character}</div>
                                                    {sit.characterThoughts && dIdx === 0 && (
                                                        <div className="text-center text-xs w-1/3 mx-auto italic mb-1">({sit.characterThoughts})</div>
                                                    )}
                                                    <div className="w-2/3 mx-auto">{d.dialogue}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step5Output;
