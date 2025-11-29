
import { GoogleGenAI } from "@google/genai";
import type { ScriptData, PlotPoint, Character, GeneratedScene, DialogueLine } from '../types';
import { PLOT_POINTS, EMPTY_CHARACTER } from "../constants";

// Initialize AI with environment variable (Vite)
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('API Key not found in environment. Using placeholder.');
  }
  return new GoogleGenAI({ apiKey: apiKey || 'PLACEHOLDER_KEY' });
};

const ai = getAI();

// --- HELPER: ROBUST JSON EXTRACTION ---
// Finds the first valid JSON object or array in text, ignoring conversational filler.
function extractJsonFromResponse(text: string): string {
    let clean = text.trim();
    
    // Remove Markdown code blocks first
    clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').replace(/```\s*$/, '');
    
    // Attempt to find the outermost JSON object or array
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    
    if (firstBrace === -1 && firstBracket === -1) {
        // Fallback: Return as is, it might be raw JSON without markdown
        return clean; 
    }

    let startIndex = 0;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
    } else {
        startIndex = firstBracket;
    }

    // Find the matching closing character from the end
    const lastBrace = clean.lastIndexOf('}');
    const lastBracket = clean.lastIndexOf(']');
    
    let endIndex = clean.length - 1;
    if (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) {
        endIndex = lastBrace;
    } else if (lastBracket !== -1) {
        endIndex = lastBracket;
    }

    return clean.substring(startIndex, endIndex + 1);
}

// --- HELPER: DETECT LANGUAGE ---
async function detectDocumentLanguage(text: string): Promise<'Thai' | 'English'> {
    try {
        const sample = text.slice(0, 2000);
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze this text sample. Return JSON: { "language": "Thai" } or { "language": "English" }. Text: "${sample}"`,
            config: { responseMimeType: "application/json" }
        });
        const json = JSON.parse(extractJsonFromResponse(response.text));
        return json.language === 'Thai' ? 'Thai' : 'English';
    } catch (e) {
        return 'English'; // Default
    }
}

// --- UNIFIED IMPORT FUNCTION (High Context) ---
export async function parseDocumentToScript(rawText: string): Promise<Partial<ScriptData>> {
    // Gemini 2.5 Flash has a massive context window. We can process huge scripts in one pass.
    // Truncate to a safe limit (approx 800k chars is plenty safe for 1M tokens)
    const contextText = rawText.slice(0, 800000); 

    try {
        console.log("Analyzing document language...");
        const detectedLang = await detectDocumentLanguage(contextText);
        
        const langInstruction = detectedLang === 'Thai' 
            ? "Output MUST be in Thai language (matching the document). Keep keys in English, but values in Thai." 
            : "Output MUST be in English.";

        console.log(`Analyzing document (${detectedLang}) with Unified Context...`);
        
        const prompt = `
        You are an expert professional script consultant. Analyze the provided screenplay/document and extract a structured project outline.
        
        DOCUMENT TEXT:
        "${contextText}"

        INSTRUCTIONS:
        1. ${langInstruction}
        2. Extract Core Metadata: Title, Genre (Best Guess), Logline, Theme, Premise.
        3. Extract Characters: Identify Main Characters. For each, provide Name, Role (Protagonist/Supporting/Extra), Description (Physical/Personality), and Goal.
        4. Extract Structure: Map the story to the 9-Point Plot Structure (Equilibrium, Inciting Incident, Turning Point, Act Break, Rising Action, Crisis, Falling Action, Climax, Ending).
           - If a specific point isn't explicit in the text, summarize what happens around that time or leave it empty string.
           - DO NOT HALLUCINATE. Use only information present in the text.
        5. Return strictly valid JSON.

        JSON SCHEMA:
        {
            "title": "string",
            "mainGenre": "string",
            "secondaryGenres": ["string"],
            "bigIdea": "string",
            "premise": "string",
            "theme": "string",
            "logLine": "string",
            "characters": [
                {
                    "name": "string",
                    "role": "string",
                    "description": "string",
                    "goals": { "objective": "string" }
                }
            ],
            "structure": [
                { "title": "Equilibrium", "description": "string" },
                { "title": "Inciting Incident", "description": "string" },
                { "title": "Turning Point", "description": "string" },
                { "title": "Act Break", "description": "string" },
                { "title": "Rising Action", "description": "string" },
                { "title": "Crisis", "description": "string" },
                { "title": "Falling Action", "description": "string" },
                { "title": "Climax", "description": "string" },
                { "title": "Ending", "description": "string" }
            ]
        }
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                temperature: 0.1 // Low temperature for factual extraction
            },
        });
        
        const jsonStr = extractJsonFromResponse(response.text);
        const parsedData = JSON.parse(jsonStr);

        return {
            ...parsedData,
            language: detectedLang
        };

    } catch (error) {
        console.error("Unified Parse Error:", error);
        // Fallback: If AI fails to produce valid JSON, return the raw text in Big Idea so user doesn't lose data.
        return {
            title: "Imported Project (Raw)",
            bigIdea: rawText.slice(0, 5000), // Show first 5000 chars
            logLine: "Import failed to structure the data automatically. Please fill in details manually based on your document."
        };
    }
}

export async function generateCharacterDetails(name: string, role: string, description: string, language: string): Promise<Partial<Character>> {
  try {
    const langInstruction = language === 'Thai' 
      ? "Ensure all value fields are written in Thai language (Natural, creative Thai writing)." 
      : "Ensure all value fields are written in English.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a scriptwriter's assistant. Create a detailed character profile for a character named "${name}" who is a "${role}". The character is described as: "${description}".
      
      IMPORTANT INSTRUCTIONS:
      1. ${langInstruction}
      2. Keep the JSON keys exactly as shown in the example (in English).
      3. MUST Include the "goals" object.
      4. MUST Include the "fashion" object.
      5. Return the response as a single JSON object.

      Example:
      {
        "external": {
          "Last Name": "...", "Nickname": "...", "Alias": "...", "Date of Birth Age": "...", "Address": "...", "Relationship": "...", "Ethnicity": "...", "Nationality": "...", "Religion": "...", "Blood Type": "...", "Health": "...", "Education": "...", "Financial Status": "...", "Occupation": "..."
        },
        "physical": {
          "Physical Characteristics": "...", "Voice characteristics": "...", "Eye characteristics": "...", "Facial characteristics": "...", "Gender": "...", "Height, Weight": "...", "Skin color": "...", "Hair style": "..."
        },
        "fashion": {
          "Style Concept": "...", "Main Outfit": "...", "Accessories": "...", "Color Palette": "...", "Condition/Texture": "..."
        },
        "internal": {
          "consciousness": { "Mindfulness (remembrance)": 80, "Wisdom (right view)": 75, "Faith (Belief in the right)": 85, "Hiri (Shame of sin)": 80, "Karuna (Compassion, knowing suffering)": 90, "Mudita (Joy in happiness)": 70 },
          "subconscious": { "Attachment": "...", "Taanha": "..." },
          "defilement": { "Lobha (Greed)": 30, "Anger (Anger)": 40, "Moha (delusion)": 50, "Mana (arrogance)": 50, "Titthi (obsession)": 55, "Vicikiccha (doubt)": 30, "Thina (depression)": 25, "Uthachcha (distraction)": 30, "Ahirika (shamelessness)": 15, "Amodtappa (fearlessness of sin)": 15 }
        },
        "goals": {
          "objective": "...", "need": "...", "action": "...", "conflict": "...", "backstory": "..."
        }
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = extractJsonFromResponse(response.text);
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating character details:", error);
    throw new Error("Failed to generate character details from AI.");
  }
}

export async function fillMissingCharacterDetails(character: Character, language: string): Promise<Character> {
  try {
    const langInstruction = language === 'Thai' 
      ? "Ensure all filled values are written in Thai language (Natural, creative Thai writing)." 
      : "Ensure all filled values are written in English.";

    const prompt = `
      You are a scriptwriter's assistant. FILL IN THE BLANKS for character "${character.name}" (${character.role}).
      ${langInstruction}
      Return the full JSON.
      
      Current JSON Data:
      ${JSON.stringify(character, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = extractJsonFromResponse(response.text);
    return JSON.parse(text);
  } catch (error) {
    console.error("Error filling missing character details:", error);
    throw new Error("Failed to fill missing details.");
  }
}

export async function generateFullScriptOutline(title: string, mainGenre: string, secondaryGenres: string[], language: 'Thai' | 'English'): Promise<Partial<ScriptData>> {
  const prompt = `
    Generate a complete story outline. Language: ${language}.
    Title: "${title}"
    Genre: ${mainGenre}, ${secondaryGenres.join(', ')}

    Return JSON matching the ScriptData structure (bigIdea, premise, theme, logLine, timeline, characterGoals, structure).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", 
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    
    const text = extractJsonFromResponse(response.text);
    const parsed = JSON.parse(text);

    const result: Partial<ScriptData> = {
      ...parsed,
      characters: [{ goals: parsed.characterGoals }],
    };
    delete (result as any).characterGoals;

    return result;

  } catch (error) {
    console.error("Error generating full script outline:", error);
    throw new Error("Failed to generate the full script outline from AI.");
  }
}


export async function generateScene(scriptData: ScriptData, plotPoint: PlotPoint, sceneIndex: number, totalScenesForPoint: number, sceneNumber: number): Promise<GeneratedScene> {
  const charactersString = scriptData.characters.map(c => `${c.name} (${c.role} - Goal: ${c.goals.objective || 'Unknown'})`).join(', ');
  const languageInstruction = scriptData.language === 'Thai' 
    ? "Ensure all dialogue and descriptions are in Thai language."
    : "Ensure all dialogue and descriptions are in English.";
  
  const previousScenesInfo = (scriptData.generatedScenes[plotPoint.title] || [])
        .map(s => `Scene ${s.sceneNumber}: ${s.sceneDesign.sceneName} - ${s.sceneDesign.situations[s.sceneDesign.situations.length-1].description}`)
        .join('\n');

  const storyBible = `
    - Title: ${scriptData.title}
    - Genre: ${scriptData.mainGenre}
    - Log Line: ${scriptData.logLine}
    - Key Characters: ${charactersString}
  `;

  const prompt = `
    Generate Scene #${sceneNumber} (${sceneIndex + 1}/${totalScenesForPoint}) for plot point: "${plotPoint.title}".
    Context: ${plotPoint.description}
    ${languageInstruction}
    Story Bible: ${storyBible}
    Previous Scenes: ${previousScenesInfo}

    Return JSON with keys: sceneDesign (sceneName, characters, location, situations: [{description, characterThoughts, dialogue: [{character, dialogue}]}], moodTone), shotList, propList, breakdown.
  `;

  try {
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
    });

    const text = extractJsonFromResponse(response.text);
    const parsedScene = JSON.parse(text);
    
    const processedScene = {
        ...parsedScene,
        sceneNumber,
        storyboard: [],
        sceneDesign: {
            ...parsedScene.sceneDesign,
            situations: parsedScene.sceneDesign.situations.map((sit: any) => ({
                ...sit,
                dialogue: Array.isArray(sit.dialogue) 
                    ? sit.dialogue.map((d: any) => ({ ...d, id: d.id || `gen-${Math.random().toString(36).substr(2,9)}` }))
                    : [] 
            }))
        }
    };
    
    return processedScene;
  } catch (error) {
    console.error(`Error generating scene for ${plotPoint.title}:`, error);
    throw new Error(`Failed to generate scene for ${plotPoint.title}.`);
  }
}

export async function generateStoryboardImage(prompt: string): Promise<string> {
    try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }] },
    });        for (const candidate of response.candidates || []) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image data found in response");
    } catch (error) {
        console.error("Error generating storyboard image:", error);
        throw new Error("Failed to generate image.");
    }
}

export async function generateCharacterImage(description: string, style: string, facialFeatures: string, referenceImageBase64?: string): Promise<string> {
  try {
      const parts: any[] = [];
      if (referenceImageBase64) {
          const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
          const mimeMatch = referenceImageBase64.match(/^data:(image\/\w+);base64,/);
          parts.push({ inlineData: { data: cleanBase64, mimeType: mimeMatch ? mimeMatch[1] : 'image/png' } });
      }

      let prompt = `Create a character portrait. Style: ${style}. Description: ${description}.`;
      if (referenceImageBase64) prompt += `\nCRITICAL: Use facial features from reference image.`;
      else prompt += `\nFacial Features: ${facialFeatures}.`;

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: parts },
      });

    for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
              if (part.inlineData && part.inlineData.data) {
                  return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              }
          }
      }
      throw new Error("No image data found in response");
  } catch (error) {
      console.error("Error generating character image:", error);
      throw new Error("Failed to generate character image.");
  }
}

export async function generateCostumeImage(
    characterName: string, physicalDesc: string, costumeDesc: string, style: string, ethnicity: string, hairStyle: string,
    referenceImageBase64?: string, outfitReferenceImageBase64?: string
): Promise<string> {
  try {
      const parts: any[] = [];
      if (referenceImageBase64) {
          const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
          const mimeMatch = referenceImageBase64.match(/^data:(image\/\w+);base64,/);
          parts.push({ inlineData: { data: cleanBase64, mimeType: mimeMatch ? mimeMatch[1] : 'image/png' } });
      }
      if (outfitReferenceImageBase64) {
          const cleanBase64 = outfitReferenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
          const mimeMatch = outfitReferenceImageBase64.match(/^data:(image\/\w+);base64,/);
          parts.push({ inlineData: { data: cleanBase64, mimeType: mimeMatch ? mimeMatch[1] : 'image/png' } });
      }

      let prompt = `Full body character design. Char: ${characterName}. Ethnicity: ${ethnicity}. Physique: ${physicalDesc}. Hair: ${hairStyle}. Outfit: ${costumeDesc}. Style: ${style}.`;
      if (referenceImageBase64) prompt += `\nUse FACE/HAIR from first image.`;
      if (outfitReferenceImageBase64) prompt += `\nUse OUTFIT STYLE from second image.`;

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: parts },
      });

      for (const candidate of response.candidates || []) {
          for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                  return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              }
          }
      }
      throw new Error("No image data found in response");
  } catch (error) {
      console.error("Error generating costume image:", error);
      throw new Error("Failed to generate costume image.");
  }
}

export async function generateStoryboardVideo(prompt: string, base64Image?: string): Promise<string> {
    try {
        const model = 'veo-3.1-fast-generate-preview';
        const params: any = {
            model,
            prompt: `Cinematic shot. ${prompt}`,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        };
        if (base64Image) {
            const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
            params.image = { imageBytes: cleanBase64, mimeType: mimeMatch ? mimeMatch[1] : 'image/png' };
        }

        let operation = await ai.models.generateVideos(params);
        const timeout = 120000;
        const startTime = Date.now();

        while (!operation.done) {
            if (Date.now() - startTime > timeout) throw new Error("Video generation timed out.");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI returned");
        
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'PLACEHOLDER_KEY';
        return `${videoUri}&key=${apiKey}`;
    } catch (error) {
        console.error("Error generating storyboard video:", error);
        throw new Error("Failed to generate video.");
    }
}

export async function generateMoviePoster(scriptData: ScriptData, customPrompt?: string): Promise<string> {
  try {
      let prompt = "";
      if (customPrompt && customPrompt.trim().length > 0) {
          prompt = customPrompt;
      } else {
          prompt = `Movie Poster. Title: ${scriptData.title}. Genre: ${scriptData.mainGenre}. Style: Cinematic.`;
      }

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: "3:4" } }
      });

      for (const candidate of response.candidates || []) {
          for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                  return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              }
          }
      }
      throw new Error("No image data found in response");
  } catch (error) {
      console.error("Error generating movie poster:", error);
      throw new Error("Failed to generate movie poster.");
  }
}
