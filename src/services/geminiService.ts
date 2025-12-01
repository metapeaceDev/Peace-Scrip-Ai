
import { GoogleGenAI } from "@google/genai";
import type { ScriptData, PlotPoint, Character, GeneratedScene, DialogueLine, ImageProvider, VideoProvider } from '../../types';
import { PLOT_POINTS, EMPTY_CHARACTER } from "../../constants";
import { selectProvider } from './providerSelector';
import { getAIProviderSettings } from '../components/ProviderSettings';
import { recordRequest, checkQuotaStatus, getTimeUntilReset } from './quotaMonitor';
import { generateWithComfyUI as generateWithBackendComfyUI, checkBackendStatus } from './comfyuiBackendClient';

// Initialize AI with environment variable (Vite)
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('API Key not found in environment. Using placeholder.');
  }
  return new GoogleGenAI({ apiKey: apiKey || 'PLACEHOLDER_KEY' });
};

const ai = getAI();

// --- IMAGE GENERATION PROVIDERS ---
// Tier 1: Gemini 2.5 Flash Image (best quality, limited quota)
const GEMINI_25_IMAGE_MODEL = "gemini-2.5-flash-image";
// Tier 2: Gemini 2.0 Flash Exp (experimental, better quota)
const GEMINI_20_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";
// Tier 3: Pollinations.ai (free, no CORS, fast)
// Tier 4: ComfyUI Backend Service (scalable, queue-based, LoRA support)
const USE_COMFYUI_BACKEND = import.meta.env.VITE_USE_COMFYUI_BACKEND === "true";
const COMFYUI_API_URL = import.meta.env.VITE_COMFYUI_API_URL || "http://localhost:8188"; // Legacy
const COMFYUI_ENABLED = import.meta.env.VITE_COMFYUI_ENABLED === "true";

// LoRA Configuration
const LORA_MODELS = {
  CHARACTER_CONSISTENCY: "character_consistency_v1.safetensors",
  CINEMATIC_STYLE: "cinematic_film_v2.safetensors",
  THAI_STYLE: "thai_movie_style.safetensors",
  FLUX_LORA: "241007_MICKMUMPITZ_FLUX+LORA.json" // From your ComfyUI folder
};

// Video Models Configuration
const VIDEO_MODELS = {
  ANIMATEDIFF: "mm_sd_v15_v2.ckpt",
  SVD: "svd_xt_1_1.safetensors", // Stable Video Diffusion
  SVD_IMG2VID: "svd_image_decoder.safetensors"
};

async function generateImageWithStableDiffusion(prompt: string): Promise<string> {
  try {
    console.log("🎨 Using Stable Diffusion XL (Alternative API)...");
    
    // ใช้ Pollinations.ai API แทน (ไม่มี CORS, ไม่ต้อง token)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
    
    // Fetch image
    const response = await fetch(pollinationsUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Convert to blob then base64
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error with Stable Diffusion fallback:", error);
    throw error;
  }
}

// --- TIER 1: COMFYUI + LORA (PRIMARY) ---
async function generateImageWithComfyUI(
  prompt: string, 
  options: { 
    lora?: string; 
    loraStrength?: number;
    negativePrompt?: string;
    steps?: number;
    cfg?: number;
    referenceImage?: string;
    outfitReference?: string;
  } = {}
): Promise<string> {
  // Use Backend Service if enabled
  if (USE_COMFYUI_BACKEND) {
    console.log('🌐 Using ComfyUI Backend Service...');
    try {
      return await generateWithBackendComfyUI(prompt, options, options.referenceImage);
    } catch (error) {
      console.error('❌ Backend ComfyUI failed:', error);
      throw error;
    }
  }
  
  // Legacy local ComfyUI support (deprecated)
  console.warn('⚠️ Local ComfyUI is deprecated. Please enable backend service.');
  throw new Error('Local ComfyUI not supported. Please enable VITE_USE_COMFYUI_BACKEND=true');
}

// --- TIER 4: COMFYUI VIDEO GENERATION + LORA ---
async function generateVideoWithComfyUI(
  prompt: string,
  options: {
    baseImage?: string; // Base64 image for img2vid
    lora?: string;
    loraStrength?: number;
    negativePrompt?: string;
    frameCount?: number;
    fps?: number;
    motionStrength?: number;
  } = {}
): Promise<string> {
  try {
    console.log("🎬 Using ComfyUI for video generation...");
    
    // SVD (Stable Video Diffusion) Workflow
    const workflow: any = {
      "1": {
        "inputs": {
          "ckpt_name": VIDEO_MODELS.SVD
        },
        "class_type": "ImageOnlyCheckpointLoader"
      },
      "2": {
        "inputs": {
          "width": 1024,
          "height": 576,
          "batch_size": options.frameCount || 25,
          "seed": Math.floor(Math.random() * 1000000000)
        },
        "class_type": "EmptyLatentVideo"
      },
      "3": {
        "inputs": {
          "text": prompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "text": options.negativePrompt || "low quality, blurry, distorted, watermark, static",
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "5": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000000),
          "steps": 20,
          "cfg": 7,
          "sampler_name": "euler",
          "scheduler": "karras",
          "denoise": 1,
          "model": ["1", 0],
          "positive": ["3", 0],
          "negative": ["4", 0],
          "latent_video": ["2", 0]
        },
        "class_type": "KSampler"
      },
      "6": {
        "inputs": {
          "samples": ["5", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode"
      },
      "7": {
        "inputs": {
          "filename_prefix": "peace-script-video",
          "fps": options.fps || 8,
          "compress_level": 4,
          "format": "video/h264-mp4",
          "images": ["6", 0]
        },
        "class_type": "VHS_VideoCombine"
      }
    };

    // If base image provided, use img2vid workflow
    if (options.baseImage) {
      workflow["0"] = {
        "inputs": {
          "image": options.baseImage,
          "upload": "image"
        },
        "class_type": "LoadImage"
      };
      workflow["2"]["inputs"]["image"] = ["0", 0];
    }

    // Add LoRA if specified
    if (options.lora) {
      workflow["8"] = {
        "inputs": {
          "lora_name": options.lora,
          "strength_model": options.loraStrength || 0.8,
          "strength_clip": options.loraStrength || 0.8,
          "model": ["1", 0],
          "clip": ["1", 1]
        },
        "class_type": "LoraLoader"
      };
      // Update model references to use LoRA
      workflow["5"]["inputs"]["model"] = ["8", 0];
      workflow["3"]["inputs"]["clip"] = ["8", 1];
      workflow["4"]["inputs"]["clip"] = ["8", 1];
    }

    // Queue prompt to ComfyUI
    const queueResponse = await fetch(`${COMFYUI_API_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!queueResponse.ok) {
      throw new Error(`ComfyUI queue error: ${queueResponse.status}`);
    }

    const { prompt_id } = await queueResponse.json();

    // Poll for completion (max 120 seconds for video)
    for (let i = 0; i < 120; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const historyResponse = await fetch(`${COMFYUI_API_URL}/history/${prompt_id}`);
      const history = await historyResponse.json();
      
      if (history[prompt_id]?.outputs) {
        const videos = history[prompt_id].outputs["7"]?.gifs;
        if (videos && videos.length > 0) {
          // Get video from ComfyUI
          const videoUrl = `${COMFYUI_API_URL}/view?filename=${videos[0].filename}&type=output`;
          const videoResponse = await fetch(videoUrl);
          const blob = await videoResponse.blob();
          
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
    }
    
    throw new Error("ComfyUI timeout: Video generation took too long");
  } catch (error) {
    console.error("Error with ComfyUI video generation:", error);
    throw error;
  }
}

// --- INTELLIGENT IMAGE GENERATION WITH PROVIDER SELECTION ---
async function generateImageWithProviderSelection(
  prompt: string,
  options: {
    useLora?: boolean;
    loraType?: keyof typeof LORA_MODELS;
    negativePrompt?: string;
  } = {}
): Promise<string> {
  // Get user's provider settings
  const settings = getAIProviderSettings();
  
  // Select provider based on user preference or auto-selection
  const { provider, displayName } = await selectProvider(
    settings.imageProvider,
    'image',
    settings.autoSelectionCriteria
  );

  console.log(`🎨 Using ${displayName} for image generation...`);

  try {
    // Route to the selected provider
    switch (provider) {
      case 'gemini-2.5':
        return await generateImageWithGemini25(prompt);
      
      case 'gemini-2.0':
        return await generateImageWithGemini20(prompt);
      
      case 'stable-diffusion':
        return await generateImageWithStableDiffusion(prompt);
      
      case 'comfyui':
        return await generateImageWithComfyUI(prompt, {
          lora: options.useLora && options.loraType ? LORA_MODELS[options.loraType] : undefined,
          loraStrength: 0.8,
          negativePrompt: options.negativePrompt,
          steps: 25,
          cfg: 7.5
        });
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error: any) {
    console.error(`❌ ${displayName} failed:`, error);
    
    // If user selected specific provider (not auto) and it failed, fall back to cascade
    if (settings.imageProvider !== 'auto') {
      console.log('⚠️ User-selected provider failed, falling back to cascade...');
      return await generateImageWithCascade(prompt, options);
    }
    
    throw error;
  }
}

// Individual provider functions for direct calls
async function generateImageWithGemini25(prompt: string, referenceImageBase64?: string): Promise<string> {
  // Record API usage for quota monitoring
  recordRequest('gemini-2.5');
  
  const parts: any[] = [];
  
  // IMPORTANT: Add reference image FIRST for better Face ID matching
  if (referenceImageBase64) {
    console.log("📸 Gemini 2.5: Adding reference image for Face ID matching");
    const imageSizeKB = Math.round((referenceImageBase64.length * 0.75) / 1024);
    console.log(`📏 Reference image size: ${imageSizeKB} KB`);
    
    const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = referenceImageBase64.match(/^data:(image\/\w+);base64,/);
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg'
      }
    });
    
    console.log("✅ Reference image added to Gemini 2.5 request");
  }
  
  // Add text prompt AFTER image
  parts.push({ text: prompt });
  
  const response = await ai.models.generateContent({
    model: GEMINI_25_IMAGE_MODEL,
    contents: { parts }
  });
  
  const imageData = response.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData?.mimeType?.startsWith('image/')
  );
  
  if (imageData?.inlineData?.data) {
    return `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`;
  }
  throw new Error("No image data found in Gemini 2.5 response");
}

async function generateImageWithGemini20(prompt: string, referenceImageBase64?: string): Promise<string> {
  // Record API usage for quota monitoring
  recordRequest('gemini-2.0');
  
  const parts: any[] = [];
  
  // IMPORTANT: Add reference image FIRST for better Face ID matching
  if (referenceImageBase64) {
    console.log("📸 Gemini 2.0: Adding reference image for Face ID matching");
    const imageSizeKB = Math.round((referenceImageBase64.length * 0.75) / 1024);
    console.log(`📏 Reference image size: ${imageSizeKB} KB`);
    
    const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = referenceImageBase64.match(/^data:(image\/\w+);base64,/);
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg'
      }
    });
    
    console.log("✅ Reference image added to Gemini 2.0 request");
  }
  
  // Add text prompt AFTER image
  parts.push({ text: prompt });
  
  const response = await ai.models.generateContent({
    model: GEMINI_20_IMAGE_MODEL,
    contents: { parts }
  });
  
  const imageData = response.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData?.mimeType?.startsWith('image/')
  );
  
  if (imageData?.inlineData?.data) {
    return `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`;
  }
  throw new Error("No image data found in Gemini 2.0 response");
}

// --- COMFYUI-FIRST CASCADE ---
// New Priority: ComfyUI MANDATORY for Face ID (best quality)
// Fallback: Gemini → Pollinations (only for non-Face ID)
async function generateImageWithCascade(
  prompt: string,
  options: {
    useLora?: boolean;
    loraType?: keyof typeof LORA_MODELS;
    negativePrompt?: string;
    referenceImage?: string;
    outfitReference?: string;
  } = {}
): Promise<string> {
  const errors: string[] = [];
  
  // MANDATORY: If Face ID is used, ONLY use ComfyUI
  if (options.referenceImage) {
    console.log("🎯 Face ID Mode: ComfyUI is MANDATORY for best quality");
    
    if (!COMFYUI_ENABLED) {
      throw new Error(
        "❌ ComfyUI Required for Face ID\n\n" +
        "Face ID generation requires ComfyUI with LoRA models for accurate face matching.\n\n" +
        "Please install and start ComfyUI, then refresh this page.\n\n" +
        "Setup: https://github.com/comfyanonymous/ComfyUI"
      );
    }
    
    try {
      console.log("🎨 Generating with ComfyUI + Character Consistency LoRA...");
      
      const selectedLora = options.loraType 
        ? LORA_MODELS[options.loraType] 
        : LORA_MODELS.CHARACTER_CONSISTENCY;
      
      console.log(`🎯 Using LoRA: ${selectedLora}`);
      
      const comfyImage = await generateImageWithComfyUI(prompt, {
        lora: selectedLora,
        loraStrength: 0.9, // Higher strength for better face matching
        negativePrompt: options.negativePrompt || 'deformed face, multiple heads, bad anatomy, low quality, blurry',
        steps: 30, // More steps for better quality
        cfg: 8.0, // Higher CFG for better prompt adherence
        referenceImage: options.referenceImage,
        outfitReference: options.outfitReference
      });
      
      console.log("✅ ComfyUI + LoRA Success!");
      return comfyImage;
    } catch (error: any) {
      console.error("❌ ComfyUI failed:", error);
      throw new Error(
        "❌ ComfyUI Generation Failed\n\n" +
        `Error: ${error.message}\n\n` +
        "Please check:\n" +
        "1. ComfyUI is running at http://localhost:8188\n" +
        "2. Required models are installed\n" +
        "3. No other errors in ComfyUI console"
      );
    }
  }
  
  // NON-FACE ID: Try ComfyUI first, then fallback to Gemini/Pollinations
  if (COMFYUI_ENABLED) {
    try {
      console.log("🎨 Tier 1: Trying ComfyUI + LoRA (Priority)...");
      
      const selectedLora = options.useLora && options.loraType 
        ? LORA_MODELS[options.loraType] 
        : LORA_MODELS.FLUX_LORA;
      
      console.log(`🎯 Using LoRA: ${selectedLora}`);
      
      const comfyImage = await generateImageWithComfyUI(prompt, {
        lora: selectedLora,
        loraStrength: 0.85,
        negativePrompt: options.negativePrompt || 'cartoon, anime, low quality, blurry',
        steps: 25,
        cfg: 7.5,
        referenceImage: options.referenceImage,
        outfitReference: options.outfitReference
      });
      
      console.log("✅ Tier 1 Success: ComfyUI + LoRA");
      return comfyImage;
    } catch (error: any) {
      console.error("❌ Tier 1 (ComfyUI) failed:", error);
      errors.push(`ComfyUI error: ${error.message}`);
      console.log("⚠️ Falling back to Gemini API...");
    }
  } else {
    console.log("⚠️ ComfyUI disabled, skipping Tier 1...");
    errors.push("ComfyUI not enabled");
  }
  
  // TIER 2: Try Gemini 2.5 Flash Image (fast, quota-limited)
  try {
    console.log("🎨 Tier 2: Trying Gemini 2.5 Flash Image...");
    
    // Show quota status before request
    const quotaStatus = checkQuotaStatus('gemini-2.5');
    if (quotaStatus.warning) {
      console.warn(quotaStatus.warning);
    }
    
    // Debug: Check if reference image is being passed
    if (options.referenceImage) {
      console.log("📸 Face ID Mode: Reference image will be sent to Gemini 2.5");
      console.log("📏 Reference image size:", Math.round(options.referenceImage.length / 1024), "KB");
    } else {
      console.log("⚠️ No reference image - generating without Face ID");
    }
    
    const result = await generateImageWithGemini25(prompt, options.referenceImage);
    console.log("✅ Tier 2 Success: Gemini 2.5 Flash Image");
    return result;
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('quota') || 
                        error?.message?.includes('429') || 
                        error?.status === 'RESOURCE_EXHAUSTED';
    if (isQuotaError) {
      const resetIn = getTimeUntilReset('gemini-2.5');
      console.log(`⚠️ Tier 2: Gemini 2.5 quota exceeded. Resets in ${resetIn}s.`);
      errors.push(`Gemini 2.5 quota exceeded (reset in ${resetIn}s)`);
    } else {
      console.error("❌ Tier 2 failed:", error);
      errors.push(`Gemini 2.5 error: ${error.message}`);
    }
  }
  
  // TIER 3: Try Gemini 2.0 Flash Exp
  try {
    console.log("🎨 Tier 3: Trying Gemini 2.0 Flash Exp...");
    
    // Show quota status before request
    const quotaStatus = checkQuotaStatus('gemini-2.0');
    if (quotaStatus.warning) {
      console.warn(quotaStatus.warning);
    }
    
    // Debug: Check if reference image is being passed
    if (options.referenceImage) {
      console.log("📸 Face ID Mode: Reference image will be sent to Gemini 2.0");
    }
    
    const result = await generateImageWithGemini20(prompt, options.referenceImage);
    console.log("✅ Tier 3 Success: Gemini 2.0 Flash Exp");
    return result;
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('quota') || 
                        error?.message?.includes('429') || 
                        error?.status === 'RESOURCE_EXHAUSTED';
    if (isQuotaError) {
      const resetIn = getTimeUntilReset('gemini-2.0');
      console.error(`❌ Tier 3 failed: Quota exceeded (reset in ${resetIn}s)`);
      errors.push(`Gemini 2.0 quota exceeded (reset in ${resetIn}s)`);
    } else {
      console.error("❌ Tier 3 failed:", error);
      errors.push(`Gemini 2.0 error: ${error.message}`);
    }
  }
  
  // TIER 4: Try Pollinations.ai (Last Resort - No Face ID support)
  try {
    console.log("🎨 Tier 4: Trying Pollinations.ai (Last Resort)...");
    
    // ⚠️ CRITICAL: If Face ID is required, throw error instead of using Pollinations
    // because Pollinations.ai doesn't support multi-image input
    if (options.referenceImage) {
      console.warn("⚠️ Face ID requested but Gemini APIs are unavailable.");
      console.warn("💡 Pollinations.ai doesn't support Face ID matching.");
      
      // Throw error to skip Pollinations and try ComfyUI instead
      throw new Error(
        "Face ID matching requires Gemini API or ComfyUI.\n\n" +
        "Current status:\n" +
        "• Gemini 2.5 & 2.0: Quota exceeded\n" +
        "• Pollinations.ai: Doesn't support Face ID\n\n" +
        "Solutions:\n" +
        "1. Wait 1 minute for Gemini quota to reset\n" +
        "2. Enable ComfyUI in AI Settings\n" +
        "3. Generate without Face ID (regular portrait)"
      );
    }
    
    const sdImage = await generateImageWithStableDiffusion(prompt);
    console.log("✅ Tier 4 Success: Pollinations.ai");
    return sdImage;
  } catch (error: any) {
    console.error("❌ Tier 4 failed:", error);
    errors.push(`Pollinations.ai error: ${error.message}`);
  }

  
  // All tiers failed
  throw new Error(
    `⚠️ All image generation tiers failed:\n${errors.join('\n')}\n\n` +
    `Please check:\n` +
    `1. ComfyUI status: ${COMFYUI_ENABLED ? '✓ Enabled (check if running at http://localhost:8188)' : '✗ Disabled - Enable in AI Settings for best quality'}\n` +
    `2. Gemini API quota: https://ai.google.dev/pricing\n` +
    `3. Pollinations.ai status: https://pollinations.ai/\n\n` +
    `💡 Recommended: Install and enable ComfyUI for unlimited Face ID generation`
  );
}

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
        return await generateImageWithCascade(prompt, {
            useLora: true,
            loraType: 'CINEMATIC_STYLE',
            negativePrompt: 'low quality, blurry, distorted, text, watermark'
        });
    } catch (error: any) {
        console.error("Error generating storyboard image:", error);
        throw new Error(error.message || "Failed to generate storyboard image.");
    }
}

export async function generateCharacterImage(description: string, style: string, facialFeatures: string, referenceImageBase64?: string): Promise<string> {
    try {
        // Build comprehensive prompt
        let prompt = `Create a character portrait. Style: ${style}. Description: ${description}.`;
        if (referenceImageBase64) {
            prompt += `\nCRITICAL: Use facial features from reference image.`;
        } else {
            prompt += `\nFacial Features: ${facialFeatures}.`;
        }
        
        // Use cascade with character consistency LoRA and reference image
        return await generateImageWithCascade(prompt, {
            useLora: true,
            loraType: 'CHARACTER_CONSISTENCY',
            negativePrompt: 'deformed face, multiple heads, bad anatomy, low quality',
            referenceImage: referenceImageBase64
        });
    } catch (error: any) {
        console.error("Error generating character image:", error);
        throw new Error(error.message || "Failed to generate character image.");
    }
}

export async function generateCostumeImage(
    characterName: string, 
    costumeDesc: string, 
    style: string,
    physicalInfo: Record<string, string>,
    referenceImageBase64?: string, 
    outfitReferenceImageBase64?: string
): Promise<string> {
    try {
        // Always use the selected style - Face ID only controls face matching, not art style
        const effectiveStyle = style;
        
        // Enhanced style description for better AI understanding
        let styleDescription = effectiveStyle;
        let styleKeywords = '';
        
        // Map common styles to detailed descriptions
        if (effectiveStyle.toLowerCase().includes('cinematic realistic')) {
            styleDescription = 'Cinematic Realistic Photography';
            styleKeywords = 'photorealistic, cinematic lighting, 4K resolution, movie still, professional photography, real human, live-action, realistic skin texture, natural lighting';
        } else if (effectiveStyle.toLowerCase().includes('film noir')) {
            styleDescription = 'Film Noir Photography';
            styleKeywords = 'black and white, high contrast, dramatic shadows, classic cinema, photorealistic';
        } else if (effectiveStyle.toLowerCase().includes('anime')) {
            styleDescription = effectiveStyle;
            styleKeywords = 'anime art style, cel shading, manga style, illustrated, 2D animation';
        } else if (effectiveStyle.toLowerCase().includes('pixar') || effectiveStyle.toLowerCase().includes('3d')) {
            styleDescription = effectiveStyle;
            styleKeywords = '3D rendered, CGI, computer graphics, animated';
        } else if (effectiveStyle.toLowerCase().includes('comic')) {
            styleDescription = effectiveStyle;
            styleKeywords = 'comic book art, illustrated, hand-drawn, ink and color';
        }
        
        console.log("🎨 generateCostumeImage called with:");
        console.log("  - Character:", characterName);
        console.log("  - Style:", effectiveStyle);
        console.log("  - Style Description:", styleDescription);
        console.log("  - Style Keywords:", styleKeywords);
        console.log("  - Has Face ID:", !!referenceImageBase64);
        console.log("  - Costume:", costumeDesc);
        
        // Extract physical information with fallbacks
        const ethnicity = physicalInfo["Ethnicity"] || physicalInfo["Nationality"] || "Global";
        const age = physicalInfo["Age"] || "";
        const height = physicalInfo["Height"] || "";
        const weight = physicalInfo["Weight"] || "";
        const bodyType = physicalInfo["Body Type"] || physicalInfo["Physical Characteristics"] || "";
        const skinTone = physicalInfo["Skin Tone"] || "";
        const eyeColor = physicalInfo["Eye Color"] || "";
        const hairStyle = physicalInfo["Hair style"] || "";
        const hairColor = physicalInfo["Hair Color"] || "";
        const facialFeatures = physicalInfo["Facial Features"] || "";
        const distinguishingMarks = physicalInfo["Distinguishing Marks"] || "";
        
        // Build comprehensive physical description
        let physicalDetails = [];
        if (age) physicalDetails.push(`Age: ${age}`);
        if (height) physicalDetails.push(`Height: ${height}`);
        if (weight) physicalDetails.push(`Weight: ${weight}`);
        if (bodyType) physicalDetails.push(`Body: ${bodyType}`);
        if (skinTone) physicalDetails.push(`Skin: ${skinTone}`);
        if (eyeColor) physicalDetails.push(`Eyes: ${eyeColor}`);
        if (hairStyle) physicalDetails.push(`Hair Style: ${hairStyle}`);
        if (hairColor) physicalDetails.push(`Hair Color: ${hairColor}`);
        if (facialFeatures) physicalDetails.push(`Face: ${facialFeatures}`);
        if (distinguishingMarks) physicalDetails.push(`Marks: ${distinguishingMarks}`);
        
        const physicalDesc = physicalDetails.join(", ");
        
        let prompt = '';
        let negativePrompt = 'deformed, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, cross-eyed, mutated hands, poorly drawn hands, poorly drawn face, mutation, ugly, blurry, low quality, watermark, text';
        
        if (referenceImageBase64) {
            // FACE ID MODE - Match face from reference but keep selected art style
            prompt = `IMPORTANT: I am providing you with a REFERENCE IMAGE of a real person. You MUST copy their exact facial features.

CREATE IMAGE IN ${styleDescription.toUpperCase()} STYLE

Style Keywords: ${styleKeywords}

Task: Create a full-body portrait of ${characterName} wearing the specified outfit.

CRITICAL FACE MATCHING INSTRUCTIONS:
The first image I provided is the REFERENCE FACE. You MUST:
1. Copy the EXACT face shape and structure from the reference image
2. Copy the EXACT eye shape, eye color, and eye spacing from the reference
3. Copy the EXACT nose shape and size from the reference
4. Copy the EXACT mouth shape and lip structure from the reference
5. Copy the EXACT skin tone and complexion from the reference
6. Copy the EXACT hairstyle, hair color, and hair texture from the reference
7. Copy the EXACT facial proportions (forehead, cheekbones, jawline, chin) from the reference
8. Keep all facial features IDENTICAL to the reference person
9. The final image must look like THE SAME PERSON as in the reference image

ART STYLE REQUIREMENTS:
- Render in ${styleDescription} style
- Apply these visual characteristics: ${styleKeywords}
- The art style affects the rendering technique, NOT the person's identity
- The person's face must remain identical to the reference

CHARACTER & OUTFIT DETAILS:
- Name: ${characterName}
- Ethnicity: ${ethnicity}
${physicalDesc ? `- Physical Attributes: ${physicalDesc}` : ''}
- Outfit Description: ${costumeDesc}

COMPOSITION:
- Full body shot from head to toe
- Clear view of the complete outfit
- Professional composition

FINAL REMINDER: 
The face MUST be an exact copy of the reference image person. 
Render it in ${styleDescription} style, but the facial identity must match the reference perfectly.`;
            
            console.log("📝 Face ID Prompt:", prompt.substring(0, 300) + "...");
            
            // Adjust negative prompt based on style
            // Don't block cartoon/anime if that's the selected style
            if (effectiveStyle.toLowerCase().includes('photorealistic') || 
                effectiveStyle.toLowerCase().includes('cinematic realistic') ||
                effectiveStyle.toLowerCase().includes('professional photography')) {
                negativePrompt = 'cartoon, anime, 3d render, illustration, painting, drawing, sketch, ' + negativePrompt;
            }
        } else {
            // REGULAR MODE - Use specified style without face reference
            prompt = `CREATE IMAGE IN ${styleDescription.toUpperCase()} STYLE

Style Keywords: ${styleKeywords}

Full body character design of ${characterName}.

Character Details:
- Ethnicity: ${ethnicity}
${physicalDesc ? `- Physical: ${physicalDesc}` : ''}
- Outfit: ${costumeDesc}

Art Style: ${styleDescription}
Style Requirements: ${styleKeywords}

Render this character in ${styleDescription} style.`;
            
            console.log("📝 Regular Prompt:", prompt.substring(0, 300) + "...");
        }
        
        if (outfitReferenceImageBase64) {
            prompt += `\n\nOUTFIT REFERENCE: Match the clothing style, design, patterns, and colors from the outfit reference image.`;
        }
        
        // Detect if Thai style, use appropriate LoRA
        const isThaiStyle = effectiveStyle.toLowerCase().includes('thai') || effectiveStyle.toLowerCase().includes('ไทย');
        
        return await generateImageWithCascade(prompt, {
            useLora: true,
            loraType: isThaiStyle ? 'THAI_STYLE' : 'CHARACTER_CONSISTENCY',
            negativePrompt: negativePrompt,
            referenceImage: referenceImageBase64,
            outfitReference: outfitReferenceImageBase64
        });
    } catch (error: any) {
        console.error("Error generating costume image:", error);
        throw new Error(error.message || "Failed to generate costume image.");
    }
}

export async function generateStoryboardVideo(prompt: string, base64Image?: string): Promise<string> {
    try {
        // Try Tier 1: Gemini Veo 3.1 (best quality, limited quota)
        console.log("🎬 Tier 1: Trying Gemini Veo 3.1...");
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
        console.log("✅ Tier 1 Success: Gemini Veo 3.1");
        return `${videoUri}&key=${apiKey}`;
    } catch (error: any) {
        console.error("❌ Tier 1 failed:", error);
        
        // Try Tier 2: ComfyUI + SVD (if enabled)
        if (COMFYUI_ENABLED) {
            try {
                console.log("🎬 Tier 2: Trying ComfyUI + Stable Video Diffusion...");
                return await generateVideoWithComfyUI(prompt, {
                    baseImage: base64Image,
                    lora: LORA_MODELS.CINEMATIC_STYLE,
                    loraStrength: 0.8,
                    negativePrompt: "low quality, blurry, static, watermark",
                    frameCount: 25,
                    fps: 8
                });
            } catch (comfyError) {
                console.error("❌ Tier 2 failed:", comfyError);
                throw new Error(`All video generation tiers failed. Gemini: ${error.message}, ComfyUI: ${comfyError}`);
            }
        }
        
        throw new Error(`Failed to generate video: ${error.message}\n\nTip: Enable ComfyUI for fallback support.`);
    }
}

export async function generateMoviePoster(scriptData: ScriptData, customPrompt?: string): Promise<string> {
    try {
        let prompt = "";
        if (customPrompt && customPrompt.trim().length > 0) {
            prompt = customPrompt;
        } else {
            prompt = `Movie Poster. Title: ${scriptData.title}. Genre: ${scriptData.mainGenre}. Style: Cinematic, Professional.`;
        }
        
        return await generateImageWithCascade(prompt, {
            useLora: true,
            loraType: 'CINEMATIC_STYLE',
            negativePrompt: 'low quality, amateur, blurry, text errors, ugly'
        });
    } catch (error: any) {
        console.error("Error generating movie poster:", error);
        throw new Error(error.message || "Failed to generate movie poster.");
    }
}
