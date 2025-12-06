import { GoogleGenAI } from "@google/genai";
import type { ScriptData, PlotPoint, Character, GeneratedScene, DialogueLine } from '../../types';
import { PLOT_POINTS, EMPTY_CHARACTER } from "../../constants";
import { generateWithComfyUI as generateWithBackendComfyUI, checkBackendStatus } from './comfyuiBackendClient';
import { formatPsychologyForPrompt, calculatePsychologyProfile } from './psychologyCalculator';
import type { GenerationMode } from './comfyuiWorkflowBuilder';
import { MODE_PRESETS } from './comfyuiWorkflowBuilder';
import { hasAccessToModel, deductCredits } from './userStore';
import { checkQuota, recordUsage } from './subscriptionManager';
import { auth } from '../config/firebase';

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
// AI Model Configuration with Pricing
export const AI_MODELS = {
  // FREE MODELS
  FREE: {
    POLLINATIONS: {
      id: 'pollinations',
      name: 'Pollinations.ai',
      provider: 'Pollinations',
      cost: 'FREE',
      speed: '⚡⚡⚡ Very Fast (5-10 sec)',
      quality: '🌟🌟🌟 Medium',
      faceID: '❌ No Face ID',
      limits: 'Unlimited',
      description: 'Fast, free, good for testing'
    },
    COMFYUI_SDXL: {
      id: 'comfyui-sdxl',
      name: 'ComfyUI + SDXL',
      provider: 'Local ComfyUI',
      cost: 'FREE',
      speed: '⚡⚡ Fast (2-4 min)',
      quality: '🌟🌟🌟🌟 High',
      faceID: '✅ IP-Adapter (70-80%)',
      limits: 'Unlimited (local)',
      description: 'Mac optimized, good quality'
    },
    GEMINI_FLASH: {
      id: 'gemini-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'Google',
      cost: 'FREE (with quota)',
      speed: '⚡⚡⚡ Very Fast (10-30 sec)',
      quality: '🌟🌟🌟 Medium-High',
      faceID: '✅ Face matching (60-70%)',
      limits: '1,500 requests/day',
      description: 'Free tier with daily quota'
    }
  },
  // PAID MODELS
  PAID: {
    GEMINI_PRO: {
      id: 'gemini-pro',
      name: 'Gemini 2.5 Flash Image',
      provider: 'Google',
      cost: '💵 Paid ($0.0025/image)',
      speed: '⚡⚡⚡ Very Fast (10-30 sec)',
      quality: '🌟🌟🌟🌟 Very High',
      faceID: '✅ Face matching (70-80%)',
      limits: 'Pay per use',
      description: 'Best quality from Gemini'
    },
    COMFYUI_FLUX: {
      id: 'comfyui-flux',
      name: 'ComfyUI + FLUX',
      provider: 'Local ComfyUI',
      cost: 'FREE (GPU required)',
      speed: '⚡ Slow (5-10 min)',
      quality: '🌟🌟🌟🌟🌟 Excellent',
      faceID: '✅ IP-Adapter (80-90%)',
      limits: 'Unlimited (needs NVIDIA GPU)',
      description: 'Highest quality, NVIDIA only'
    },
    OPENAI_DALLE: {
      id: 'openai-dalle',
      name: 'DALL-E 3',
      provider: 'OpenAI',
      cost: '💵 Paid ($0.04-0.12/image)',
      speed: '⚡⚡ Fast (10-20 sec)',
      quality: '🌟🌟🌟🌟🌟 Excellent',
      faceID: '❌ No Face ID',
      limits: 'Pay per use',
      description: 'OpenAI flagship model'
    }
  }
};

export const VIDEO_MODELS_CONFIG = {
  FREE: {
    COMFYUI_SVD: {
      id: 'comfyui-svd',
      name: 'ComfyUI SVD',
      provider: 'Local/Cloud',
      cost: 'FREE',
      speed: '⚡⚡ Fast (1-2 min)',
      quality: '⭐⭐ Medium (576p)',
      duration: '3-4 sec',
      limits: 'Unlimited (Local)',
      description: 'Stable Video Diffusion (Image-to-Video)',
      tier: 'free',
      costPerGen: 0
    },
    POLLINATIONS_VIDEO: {
      id: 'pollinations-video',
      name: 'Pollinations Video',
      provider: 'Pollinations.ai',
      cost: 'FREE',
      speed: '⚡⚡⚡ Very Fast (10-20s)',
      quality: '⭐ Low-Medium',
      duration: '2-3 sec',
      limits: 'Unlimited',
      description: 'Fast generation, lower consistency',
      tier: 'free',
      costPerGen: 0
    }
  },
  PAID: {
    GEMINI_VEO: {
      id: 'gemini-veo',
      name: 'Gemini Veo',
      provider: 'Google',
      cost: '💵 Paid (Quota)',
      speed: '⚡⚡ Fast (30-60s)',
      quality: '🌟🌟🌟🌟🌟 Excellent (1080p)',
      duration: '5-10 sec',
      limits: 'Limited Quota',
      description: 'Google\'s state-of-the-art video model',
      tier: 'basic',
      costPerGen: 5
    },
    LUMA_DREAM_MACHINE: {
      id: 'luma-dream-machine',
      name: 'Luma Dream Machine',
      provider: 'Luma AI',
      cost: '💵 Paid ($0.10/video)',
      speed: '⚡ Fast (1-2 min)',
      quality: '🌟🌟🌟🌟🌟 Excellent',
      duration: '5 sec',
      limits: 'Pay per use',
      description: 'High realism and motion quality',
      tier: 'pro',
      costPerGen: 10
    },
    RUNWAY_GEN3: {
      id: 'runway-gen3',
      name: 'Runway Gen-3',
      provider: 'RunwayML',
      cost: '💵 Paid ($0.50/video)',
      speed: '⚡ Fast (1-2 min)',
      quality: '🌟🌟🌟🌟🌟 Cinematic',
      duration: '5-10 sec',
      limits: 'Pay per use',
      description: 'Hollywood-grade video generation',
      tier: 'pro',
      costPerGen: 50
    }
  }
};

// Model aliases for backward compatibility
const GEMINI_25_IMAGE_MODEL = "gemini-2.5-flash-image";
const GEMINI_20_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";
const USE_COMFYUI_BACKEND = import.meta.env.VITE_USE_COMFYUI_BACKEND === "true";
const COMFYUI_API_URL = import.meta.env.VITE_COMFYUI_API_URL || "http://localhost:8188";
const COMFYUI_ENABLED = import.meta.env.VITE_COMFYUI_ENABLED === "true";

// Workflow Selection: 'flux' | 'sdxl' | 'auto'
// - flux: NVIDIA/CUDA only (Float8 precision)
// - sdxl: Mac/MPS compatible
// - auto: Detect device automatically (default)
const PREFERRED_WORKFLOW = import.meta.env.VITE_COMFYUI_WORKFLOW || 'auto';

// LoRA Configuration
// SDXL LoRA Models (compatible with SDXL only)
const SDXL_LORA_MODELS = {
  CHARACTER_CONSISTENCY: "add-detail-xl.safetensors", // ✅ SDXL LoRA (45MB)
  DETAIL_ENHANCER: "add-detail-xl.safetensors",
  // Note: Hunt3.safetensors is SD 1.5 LoRA (incompatible with SDXL/FLUX)
};

// Checkpoint Models
const CHECKPOINT_MODELS = {
  FLUX_DEV: "flux_dev.safetensors", // 16GB - FLUX.1-dev (recommended)
  SDXL_BASE: "sd_xl_base_1.0.safetensors", // 6.5GB - SDXL Base
  SDXL_TURBO: "sd_xl_turbo_1.0_fp16.safetensors", // 6.5GB - SDXL Turbo
};

// Legacy: Keep for backward compatibility
const LORA_MODELS = SDXL_LORA_MODELS;

/**
 * เลือก workflow ที่เหมาะสมกับ device
 * FLUX: รองรับ NVIDIA/CUDA เท่านั้น (Float8 precision)
 * FLUX-CPU: รองรับ Mac/CPU (ช้ามาก ~5-10 นาที)
 * SDXL: รองรับทั้ง Mac/MPS, NVIDIA, CPU
 */
function selectWorkflow(preferredWorkflow: string = PREFERRED_WORKFLOW): { useFlux: boolean; useTurbo: boolean; reason: string } {
  // Force FLUX (NVIDIA/CUDA only)
  if (preferredWorkflow === 'flux') {
    return { 
      useFlux: true, 
      useTurbo: false,
      reason: 'Manual: FLUX on GPU (NVIDIA/CUDA required)' 
    };
  }
  
  // Force FLUX on CPU (Mac compatible, slow)
  if (preferredWorkflow === 'flux-cpu') {
    console.warn('⚠️  FLUX-CPU mode: Very slow (~5-10 minutes per image)');
    return { 
      useFlux: true, 
      useTurbo: false,
      reason: 'Manual: FLUX on CPU (slow but works on Mac)' 
    };
  }
  
  // Force SDXL
  if (preferredWorkflow === 'sdxl') {
    return { 
      useFlux: false, 
      useTurbo: false,
      reason: 'Manual: SDXL Base (High Quality)' 
    };
  }
  
  // Auto-detect (default)
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (isMac) {
    // Use SDXL Base on Mac for quality (30 steps)
    // User confirmed: SDXL Turbo produces unrealistic images, must use Base
    return { 
      useFlux: false, 
      useTurbo: false, // Use SDXL Base for quality
      reason: 'Auto: Mac/MPS detected → SDXL Base (Quality, 30 steps)'
    };
  }
  
  // Default to FLUX for non-Mac (assume CUDA)
  return { 
    useFlux: true, 
    useTurbo: false,
    reason: 'Auto: Non-Mac detected → FLUX (assumes CUDA/NVIDIA)'
  };
}

// Video Models Configuration
const VIDEO_MODELS = {
  ANIMATEDIFF: "mm_sd_v15_v2.ckpt",
  SVD: "svd_xt_1_1.safetensors", // Stable Video Diffusion
  SVD_IMG2VID: "svd_image_decoder.safetensors"
};

async function generateImageWithStableDiffusion(prompt: string, seed?: number): Promise<string> {
  try {
    console.log("🎨 Using Stable Diffusion XL (Alternative API)...");
    console.log("🎲 Pollinations seed:", seed);
    
    // 🇹🇭 CRITICAL FIX: Translate Thai text to English for Pollinations.ai
    // SDXL doesn't understand Thai language → gets wrong ethnicity
    let translatedPrompt = prompt;
    
    // Detect if prompt contains Thai characters
    const hasThaiText = /[\u0E00-\u0E7F]/.test(prompt);
    if (hasThaiText) {
      console.log("🇹🇭 Detected Thai text - translating for SDXL...");
      
      // Common Thai → English translations for physical features
      const thaiToEnglish: Record<string, string> = {
        // Skin tones
        'ผิวสองสี': 'tan skin, warm medium skin tone',
        'ผิวขาว': 'fair skin, light skin tone',
        'ผิวคล้ำ': 'dark skin, deep skin tone',
        'ผิวสองแดง': 'reddish tan skin',
        
        // Face features
        'ใบหน้าเกลี้ยงเกลา': 'clean-shaven face',
        'สะอาดสะอ้าน': 'clean, neat appearance',
        'รอยยิ้มอบอุ่น': 'warm smile',
        'เป็นมิตร': 'friendly',
        'เข้าถึงง่าย': 'approachable',
        
        // Eyes
        'ดวงตาสีน้ำตาลเข้ม': 'dark brown eyes',
        'ดวงตาสีดำ': 'black eyes',
        'เป็นประกาย': 'bright, sparkling',
        'สายตาสงบ': 'calm gaze',
        
        // Hair
        'ผมสั้นรองทรง': 'short neat haircut',
        'ผมสั้น': 'short hair',
        'ผมยาว': 'long hair',
        'จัดแต่งเรียบร้อย': 'well-groomed',
        'ผมดำ': 'black hair',
        
        // Body
        'รูปร่างสมส่วน': 'proportionate body',
        'สง่างาม': 'elegant, graceful',
        'สุขภาพดี': 'healthy',
        'ผ่องใส': 'radiant',
        
        // Personality descriptors
        'อ่อนโยน': 'gentle',
        'ใจดี': 'kind-hearted',
        'สุขุม': 'calm, composed',
        'คุณธรรมสูง': 'virtuous, moral',
        
        // Gender
        'ชาย': 'male',
        'หญิง': 'female',
        'ผู้ชาย': 'man',
        'ผู้หญิง': 'woman',
        
        // Age
        'ปี': 'years old'
      };
      
      // Replace Thai words with English equivalents
      translatedPrompt = prompt;
      for (const [thai, english] of Object.entries(thaiToEnglish)) {
        translatedPrompt = translatedPrompt.replace(new RegExp(thai, 'g'), english);
      }
      
      // 🇹🇭 CRITICAL: Add Thai ethnicity markers if not present
      if (!translatedPrompt.toLowerCase().includes('thai') && 
          !translatedPrompt.toLowerCase().includes('asian') &&
          !translatedPrompt.toLowerCase().includes('southeast asian')) {
        // Inject Thai ethnicity into prompt
        translatedPrompt = `Thai person, Southeast Asian features, ${translatedPrompt}`;
      }
      
      // Remove remaining Thai characters (untranslated text)
      translatedPrompt = translatedPrompt.replace(/[\u0E00-\u0E7F]+/g, '');
      
      console.log("✅ Translated prompt:", translatedPrompt);
    }
    
    // Add seed to URL if provided for reproducibility and variation
    let pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(translatedPrompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
    
    if (seed) {
      pollinationsUrl += `&seed=${seed}`;
    }
    
    console.log("🌐 Pollinations URL:", pollinationsUrl);
    
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
    seed?: number;
    onProgress?: (progress: number) => void;
    useFlux?: boolean;
    ckpt_name?: string;
    useIPAdapter?: boolean; // Mac: IP-Adapter instead of InstantID
    generationMode?: GenerationMode; // QUALITY/BALANCED/SPEED
    preferredModel?: string; // User's preferred AI model (model ID)
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
    onProgress?: (progress: number) => void;
  } = {}
): Promise<string> {
  try {
    console.log("🎬 Using ComfyUI for video generation...");
    
    // ... (workflow setup) ...
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
      
      // Update progress (simulated for now, or could fetch from /queue)
      if (options.onProgress) {
          // SVD takes about 30-60s usually. 
          // We map i (seconds) to percentage roughly.
          const progress = Math.min((i / 60) * 100, 95);
          options.onProgress(progress);
      }

      const historyResponse = await fetch(`${COMFYUI_API_URL}/history/${prompt_id}`);
      const history = await historyResponse.json();
      
      if (history[prompt_id]?.outputs) {
        const videos = history[prompt_id].outputs["7"]?.gifs;
        if (videos && videos.length > 0) {
          // Get video from ComfyUI
          const videoUrl = `${COMFYUI_API_URL}/view?filename=${videos[0].filename}&type=output`;
          const videoResponse = await fetch(videoUrl);
          const blob = await videoResponse.blob();
          
          if (options.onProgress) options.onProgress(100);

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
// ฟังก์ชันนี้ไม่ได้ใช้งาน - ใช้ generateImageWithCascade โดยตรง
// async function generateImageWithProviderSelection(...) { ... }

// Individual provider functions for direct calls
async function generateImageWithGemini25(prompt: string, referenceImageBase64?: string): Promise<string> {
  // Skip quota monitoring for now
  // recordRequest('gemini-2.5');
  
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
  // Skip quota monitoring for now
  // recordRequest('gemini-2.0');
  
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
    seed?: number;
    onProgress?: (progress: number) => void;
    useIPAdapter?: boolean; // Mac: use IP-Adapter instead of InstantID
    generationMode?: GenerationMode; // QUALITY/BALANCED/SPEED
    preferredModel?: string; // Model ID from AI_MODELS
  } = {}
): Promise<string> {
  const errors: string[] = [];
  
  // Map model ID to provider logic
  const modelId = options.preferredModel || 'auto';
  console.log(`🎯 User selected model: ${modelId}`);
  
  // Force specific provider based on model selection
  let forceProvider: 'comfyui' | 'gemini-pro' | 'gemini-flash' | 'pollinations' | 'dalle' | null = null;
  
  if (modelId === 'comfyui-sdxl' || modelId === 'comfyui-flux') {
    forceProvider = 'comfyui';
    console.log('✅ Forcing ComfyUI backend');
  } else if (modelId === 'gemini-pro') {
    forceProvider = 'gemini-pro';
    console.log('✅ Forcing Gemini 2.5 Pro');
  } else if (modelId === 'gemini-flash') {
    forceProvider = 'gemini-flash';
    console.log('✅ Forcing Gemini 2.0 Flash');
  } else if (modelId === 'pollinations') {
    forceProvider = 'pollinations';
    console.log('✅ Forcing Pollinations.ai');
  } else if (modelId === 'openai-dalle') {
    forceProvider = 'dalle';
    console.log('✅ Forcing DALL-E 3');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FACE ID MODE: Platform-Specific Hybrid Fallback System
  // ═══════════════════════════════════════════════════════════════════════════
  // Mac Platform:
  //   1st: IP-Adapter (5-8 min, 65-75% similarity, FREE)
  //   2nd: Gemini 2.5 (30 sec, 60-70% similarity, HAS QUOTA)
  //   3rd: SDXL Base (2 min, no similarity, FREE)
  //
  // Windows/Linux + NVIDIA:
  //   1st: InstantID (5-10 min, 90-95% similarity, FREE)
  //   2nd: IP-Adapter (3-5 min, 65-75% similarity, FREE)
  //   3rd: Gemini 2.5 (30 sec, 60-70% similarity, HAS QUOTA)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (options.referenceImage) {
    console.log("\n🎯 ═══ FACE ID MODE ACTIVATED ═══");
    console.log("📸 Reference image detected - enabling hybrid fallback system");
    
    // ────────────────────────────────────────────────────────────────────────
    // USER MODEL SELECTION OVERRIDE
    // ────────────────────────────────────────────────────────────────────────
    if (modelId !== 'auto') {
      console.log('✅ Forcing user-selected model (bypassing automatic cascade)');
      
      // Map model ID to provider
      if (modelId === 'gemini-pro') {
        try {
          console.log('🚀 Forcing Gemini 2.5 Pro for Face ID generation');
          return await generateImageWithGemini25(prompt, options.referenceImage);
        } catch (error: any) {
          console.error('❌ Gemini Pro failed:', error.message);
          throw new Error(`Gemini Pro generation failed: ${error.message}`);
        }
      } else if (modelId === 'gemini-flash') {
        try {
          console.log('🚀 Forcing Gemini 2.0 Flash for Face ID generation');
          return await generateImageWithGemini20(prompt, options.referenceImage);
        } catch (error: any) {
          console.error('❌ Gemini Flash failed:', error.message);
          throw new Error(`Gemini Flash generation failed: ${error.message}`);
        }
      } else if (modelId === 'comfyui-sdxl' || modelId === 'comfyui-flux') {
        console.log(`🚀 Forcing ComfyUI ${modelId.toUpperCase()} for Face ID generation`);
        // Will be handled by ComfyUI cascade below with forced model
      } else if (modelId === 'pollinations') {
        console.warn('⚠️ Pollinations does NOT support Face ID - falling back to auto mode');
        console.log('💡 Tip: Choose Gemini Pro/Flash or ComfyUI models for Face ID generation');
      } else if (modelId === 'openai-dalle') {
        console.warn('⚠️ DALL-E 3 does NOT support Face ID - falling back to auto mode');
        console.log('💡 Tip: Choose Gemini Pro/Flash or ComfyUI models for Face ID generation');
      }
    }
    
    // Check backend health to detect platform
    let platformSupport = false;
    let isMacPlatform = false;
    
    try {
      const backendStatus = await Promise.race([
        checkBackendStatus(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Backend health check timeout')), 3000)
        )
      ]);
      
      platformSupport = backendStatus.platform?.supportsFaceID ?? false;
      isMacPlatform = !platformSupport;
      
      console.log(`\n🖥️  Platform Detection:`);
      console.log(`   OS: ${backendStatus.platform?.os || 'unknown'}`);
      console.log(`   GPU: ${backendStatus.platform?.hasNvidiaGPU ? 'NVIDIA' : 'Integrated/MPS'}`);
      console.log(`   InstantID Support: ${platformSupport ? '✅ Yes' : '❌ No (Mac/MPS)'}`);
    } catch (error) {
      console.log('⚠️  Backend offline - assuming Mac platform for safety');
      isMacPlatform = true;
      platformSupport = false;
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // MAC PLATFORM: IP-Adapter (v2 Unified) → Gemini 2.5 → SDXL Base
    // v2: ใช้ IPAdapterUnifiedLoader (ไม่ต้องใช้ InsightFace - ไม่มี CPU bottleneck)
    // ──────────────────────────────────────────────────────────────────────────
    if (isMacPlatform) {
      console.log(`\n🍎 ═══ MAC HYBRID FALLBACK CHAIN (v2) ═══`);
      console.log(`Priority 1: IP-Adapter Unified QUALITY (5-7 min, 85-90%, FREE)`);
      console.log(`Priority 2: Gemini 2.5 (30 sec, 60-70%, QUOTA)`);
      console.log(`Priority 3: SDXL Base (2 min, no similarity, FREE)`);
      console.log(`✨ v2: ไม่ใช้ InsightFace - ไม่มี CPU bottleneck แล้ว!`);
      
      // ─── PRIORITY 1: IP-Adapter Unified (NO INSIGHTFACE) ────────────────────
      if (USE_COMFYUI_BACKEND) {
        try {
          console.log(`\n🔄 [1/3] Trying IP-Adapter Unified (No InsightFace)...`);
          console.log(`   ⚡ Speed: 3-5 minutes (ไม่มี face detection บน CPU)`);
          console.log(`   🎯 Similarity: 70-80%`);
          console.log(`   💰 Cost: FREE (unlimited)`);
          
          const backendStatus = await Promise.race([
            checkBackendStatus(),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Backend timeout')), 3000)
            )
          ]);
          
          if (!backendStatus.running) {
            throw new Error('Backend not running');
          }
          
          // Get mode settings (default: balanced for stability)
          const mode: GenerationMode = (options as any).generationMode || 'balanced';
          const modeSettings = MODE_PRESETS[mode];
          const modeLabels = {
            quality: '🏆 QUALITY MODE',
            balanced: '⚖️ BALANCED MODE',
            speed: '⚡ SPEED MODE'
          };
          
          console.log(`   🎨 Settings: Steps=${modeSettings.steps}, CFG=${modeSettings.cfg}, LoRA=${modeSettings.loraStrength}, Weight=${modeSettings.weight} (${modeLabels[mode]})`);
          console.log(`   🤖 Model Preference: ${options.preferredModel || 'auto'}`);
          console.log(`   📦 Using: IPAdapterUnifiedLoader + PLUS FACE preset + style transfer`);
          
          const selectedLora = options.loraType 
            ? LORA_MODELS[options.loraType] 
            : LORA_MODELS.CHARACTER_CONSISTENCY;
          
          const comfyImage = await generateImageWithComfyUI(prompt, {
            lora: selectedLora,
            loraStrength: modeSettings.loraStrength,
            negativePrompt: options.negativePrompt || 'deformed face, multiple heads, bad anatomy, low quality, blurry',
            steps: modeSettings.steps,
            cfg: modeSettings.cfg,
            referenceImage: options.referenceImage,
            outfitReference: options.outfitReference,
            seed: options.seed,
            onProgress: options.onProgress,
            useIPAdapter: true,
            generationMode: mode,
            preferredModel: options.preferredModel // Pass model preference to ComfyUI
          });
          
          console.log(`✅ [1/3] SUCCESS: IP-Adapter Unified completed!`);
          return comfyImage;
          
        } catch (error: any) {
          console.error(`❌ [1/3] FAILED: IP-Adapter - ${error.message}`);
          console.log(`⏭️  Falling back to Priority 2: Gemini 2.5...`);
          errors.push(`IP-Adapter failed: ${error.message}`);
        }
      } else {
        console.log(`⏭️  [1/3] SKIPPED: ComfyUI Backend disabled`);
        errors.push('ComfyUI Backend not enabled');
      }
      
      // ─── PRIORITY 1: Gemini 2.5 ─────────────────────────────────────────────
      try {
        console.log(`\n🔄 [1/2] Trying Gemini 2.5 Flash Image...`);
        console.log(`   ⚡ Speed: ~30 seconds`);
        console.log(`   🎯 Similarity: 60-70%`);
        console.log(`   ⚠️  Cost: HAS QUOTA LIMITS`);
        
        const result = await generateImageWithGemini25(prompt, options.referenceImage);
        console.log(`✅ [1/2] SUCCESS: Gemini 2.5 completed!`);
        return result;
        
      } catch (error: any) {
        const isQuotaError = error?.message?.includes('quota') || 
                            error?.message?.includes('429') || 
                            error?.status === 'RESOURCE_EXHAUSTED';
        
        if (isQuotaError) {
          console.error(`❌ [1/2] FAILED: Gemini 2.5 - Quota exceeded`);
        } else {
          console.error(`❌ [1/2] FAILED: Gemini 2.5 - ${error.message}`);
        }
        console.log(`⏭️  Falling back to Priority 2: SDXL Base...`);
        errors.push(`Gemini 2.5 failed: ${error.message}`);
      }
      
      // ─── PRIORITY 2: SDXL Base (No Face ID) ─────────────────────────────────
      if (USE_COMFYUI_BACKEND) {
        try {
          console.log(`\n🔄 [2/2] Trying SDXL Base (Last Resort)...`);
          console.log(`   ⚡ Speed: ~2 minutes`);
          console.log(`   ⚠️  Similarity: NONE (no Face ID)`);
          console.log(`   💰 Cost: FREE`);
          console.log(`   📝 Note: Will generate based on prompt only`);
          
          const backendStatus = await checkBackendStatus();
          if (!backendStatus.running) {
            throw new Error('Backend not running');
          }
          
          // Generate without reference image (SDXL Base only)
          const comfyImage = await generateImageWithComfyUI(prompt, {
            lora: 'add-detail-xl.safetensors',
            loraStrength: 0.8,
            negativePrompt: options.negativePrompt || 'deformed face, multiple heads, bad anatomy, low quality, blurry',
            steps: 30,
            cfg: 8.0,
            seed: options.seed,
            onProgress: options.onProgress,
            // NO referenceImage - plain SDXL generation
          });
          
          console.log(`✅ [2/2] SUCCESS: SDXL Base completed (no Face ID)`);
          console.log(`⚠️  Note: Image generated from prompt only, no face matching`);
          return comfyImage;
          
        } catch (error: any) {
          console.error(`❌ [2/2] FAILED: SDXL Base - ${error.message}`);
          errors.push(`SDXL Base failed: ${error.message}`);
        }
      }
      
      // All Mac fallbacks failed
      throw new Error(
        `❌ All Face ID methods failed on Mac\n\n` +
        `Tried:\n` +
        `1. IP-Adapter (5-8 min, 65-75%) - ${errors[0] || 'failed'}\n` +
        `2. Gemini 2.5 (30 sec, 60-70%) - ${errors[1] || 'failed'}\n` +
        `3. SDXL Base (2 min, no similarity) - ${errors[2] || 'failed'}\n\n` +
        `Please check:\n` +
        `- ComfyUI Backend running (port 8000)\n` +
        `- ComfyUI running (port 8188)\n` +
        `- Gemini API quota`
      );
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // WINDOWS/LINUX + NVIDIA: InstantID → IP-Adapter → Gemini 2.5
    // ──────────────────────────────────────────────────────────────────────────
    else {
      console.log(`\n🚀 ═══ WINDOWS/LINUX HYBRID FALLBACK CHAIN ═══`);
      console.log(`Priority 1: InstantID (5-10 min, 90-95%, FREE)`);
      console.log(`Priority 2: IP-Adapter (3-5 min, 65-75%, FREE)`);
      console.log(`Priority 3: Gemini 2.5 (30 sec, 60-70%, QUOTA)`);
      
      // ─── PRIORITY 1: InstantID ──────────────────────────────────────────────
      if (USE_COMFYUI_BACKEND) {
        try {
          console.log(`\n🔄 [1/3] Trying InstantID (Best Quality)...`);
          console.log(`   ⚡ Speed: 5-10 minutes`);
          console.log(`   🎯 Similarity: 90-95% (BEST)`);
          console.log(`   💰 Cost: FREE (unlimited)`);
          
          const backendStatus = await Promise.race([
            checkBackendStatus(),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Backend timeout')), 3000)
            )
          ]);
          
          if (!backendStatus.running) {
            throw new Error('Backend not running');
          }
          
          console.log(`   🎨 Settings: Steps=20, CFG=7.0, LoRA=0.8 (InstantID)`);
          
          const selectedLora = options.loraType 
            ? LORA_MODELS[options.loraType] 
            : LORA_MODELS.CHARACTER_CONSISTENCY;
          
          const comfyImage = await generateImageWithComfyUI(prompt, {
            lora: selectedLora,
            loraStrength: 0.8,
            negativePrompt: options.negativePrompt || 'deformed face, multiple heads, bad anatomy, low quality, blurry',
            steps: 20,
            cfg: 7.0,
            referenceImage: options.referenceImage,
            outfitReference: options.outfitReference,
            seed: options.seed,
            onProgress: options.onProgress,
            useIPAdapter: false // Use InstantID
          });
          
          console.log(`✅ [1/3] SUCCESS: InstantID completed!`);
          return comfyImage;
          
        } catch (error: any) {
          console.error(`❌ [1/3] FAILED: InstantID - ${error.message}`);
          console.log(`⏭️  Falling back to Priority 2: IP-Adapter...`);
          errors.push(`InstantID failed: ${error.message}`);
        }
      } else {
        console.log(`⏭️  [1/3] SKIPPED: ComfyUI Backend disabled`);
        errors.push('ComfyUI Backend not enabled');
      }
      
      // ─── PRIORITY 2: IP-Adapter ─────────────────────────────────────────────
      if (USE_COMFYUI_BACKEND) {
        try {
          console.log(`\n🔄 [2/3] Trying IP-Adapter (Faster Alternative)...`);
          console.log(`   ⚡ Speed: 3-5 minutes (faster on NVIDIA)`);
          console.log(`   🎯 Similarity: 65-75%`);
          console.log(`   💰 Cost: FREE (unlimited)`);
          
          const backendStatus = await checkBackendStatus();
          if (!backendStatus.running) {
            throw new Error('Backend not running');
          }
          
          console.log(`   🎨 Settings: Steps=30, CFG=8.0, LoRA=0.8, Weight=0.75`);
          
          const selectedLora = options.loraType 
            ? LORA_MODELS[options.loraType] 
            : LORA_MODELS.CHARACTER_CONSISTENCY;
          
          const comfyImage = await generateImageWithComfyUI(prompt, {
            lora: selectedLora,
            loraStrength: 0.8,
            negativePrompt: options.negativePrompt || 'deformed face, multiple heads, bad anatomy, low quality, blurry',
            steps: 30,
            cfg: 8.0,
            referenceImage: options.referenceImage,
            outfitReference: options.outfitReference,
            seed: options.seed,
            onProgress: options.onProgress,
            useIPAdapter: true
          });
          
          console.log(`✅ [2/3] SUCCESS: IP-Adapter completed!`);
          return comfyImage;
          
        } catch (error: any) {
          console.error(`❌ [2/3] FAILED: IP-Adapter - ${error.message}`);
          console.log(`⏭️  Falling back to Priority 3: Gemini 2.5...`);
          errors.push(`IP-Adapter failed: ${error.message}`);
        }
      }
      
      // ─── PRIORITY 3: Gemini 2.5 ─────────────────────────────────────────────
      try {
        console.log(`\n🔄 [3/3] Trying Gemini 2.5 Flash Image (Last Resort)...`);
        console.log(`   ⚡ Speed: ~30 seconds`);
        console.log(`   🎯 Similarity: 60-70%`);
        console.log(`   ⚠️  Cost: HAS QUOTA LIMITS`);
        
        const result = await generateImageWithGemini25(prompt, options.referenceImage);
        console.log(`✅ [3/3] SUCCESS: Gemini 2.5 completed!`);
        return result;
        
      } catch (error: any) {
        const isQuotaError = error?.message?.includes('quota') || 
                            error?.message?.includes('429') || 
                            error?.status === 'RESOURCE_EXHAUSTED';
        
        if (isQuotaError) {
          console.error(`❌ [3/3] FAILED: Gemini 2.5 - Quota exceeded`);
          errors.push('Gemini 2.5 quota exceeded');
        } else {
          console.error(`❌ [3/3] FAILED: Gemini 2.5 - ${error.message}`);
          errors.push(`Gemini 2.5 failed: ${error.message}`);
        }
      }
      
      // All Windows/Linux fallbacks failed
      throw new Error(
        `❌ All Face ID methods failed on Windows/Linux\n\n` +
        `Tried:\n` +
        `1. InstantID (5-10 min, 90-95%) - ${errors[0] || 'failed'}\n` +
        `2. IP-Adapter (3-5 min, 65-75%) - ${errors[1] || 'failed'}\n` +
        `3. Gemini 2.5 (30 sec, 60-70%) - ${errors[2] || 'failed'}\n\n` +
        `Please check:\n` +
        `- ComfyUI Backend running (port 8000)\n` +
        `- ComfyUI running (port 8188)\n` +
        `- InstantID/IP-Adapter models installed\n` +
        `- Gemini API quota`
      );
    }
  }
  
  // NON-FACE ID: Try ComfyUI Backend first, then fallback to Gemini/Pollinations
  // CRITICAL FIX: Use USE_COMFYUI_BACKEND instead of COMFYUI_ENABLED
  
  // ────────────────────────────────────────────────────────────────────────
  // USER MODEL SELECTION OVERRIDE (Non-Face ID)
  // ────────────────────────────────────────────────────────────────────────
  if (modelId !== 'auto') {
    console.log('✅ Forcing user-selected model (bypassing automatic cascade)');
    
    // Handle Gemini models
    if (modelId === 'gemini-pro') {
      try {
        console.log('🚀 Forcing Gemini 2.5 Pro for image generation');
        return await generateImageWithGemini25(prompt);
      } catch (error: any) {
        console.error('❌ Gemini Pro failed:', error.message);
        throw new Error(`Gemini Pro generation failed: ${error.message}`);
      }
    } else if (modelId === 'gemini-flash') {
      try {
        console.log('🚀 Forcing Gemini 2.0 Flash for image generation');
        return await generateImageWithGemini20(prompt);
      } catch (error: any) {
        console.error('❌ Gemini Flash failed:', error.message);
        throw new Error(`Gemini Flash generation failed: ${error.message}`);
      }
    } else if (modelId === 'pollinations') {
      try {
        console.log('🚀 Forcing Pollinations for image generation');
        return await generateImageWithStableDiffusion(prompt);
      } catch (error: any) {
        console.error('❌ Pollinations failed:', error.message);
        throw new Error(`Pollinations generation failed: ${error.message}`);
      }
    } else if (modelId === 'openai-dalle') {
      console.error('❌ DALL-E 3 not yet implemented');
      throw new Error('DALL-E 3 integration coming soon. Please choose another model.');
    }
    // ComfyUI models will continue to workflow selection below
    else if (modelId === 'comfyui-sdxl' || modelId === 'comfyui-flux') {
      console.log(`🚀 Forcing ComfyUI ${modelId.toUpperCase()} for image generation`);
    }
  }
  
  if (USE_COMFYUI_BACKEND) {
    try {
      console.log("🎨 Tier 1: Trying ComfyUI Backend + LoRA (Priority)...");
      console.log("🌐 Backend URL:", import.meta.env.VITE_COMFYUI_SERVICE_URL);
      
      // Quick backend health check with timeout
      const backendStatus = await Promise.race([
        checkBackendStatus(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Backend health check timeout')), 3000)
        )
      ]);
      
      if (!backendStatus.running) {
        throw new Error(`Backend not running: ${backendStatus.error || 'Unknown error'}`);
      }
      
      console.log("✅ Backend is healthy, proceeding with generation...");
      
      // เลือก workflow ตาม device และ preference
      let workflowPreference = 'auto'; // default
      
      // Map user's model selection to workflow preference
      if (modelId === 'comfyui-flux') {
        workflowPreference = 'flux';
        console.log('🎯 User selected FLUX - forcing FLUX workflow');
      } else if (modelId === 'comfyui-sdxl') {
        workflowPreference = 'sdxl';
        console.log('🎯 User selected SDXL - forcing SDXL workflow');
      }
      
      const workflowSelection = selectWorkflow(workflowPreference);
      console.log(`🛠️  Workflow Selection: ${workflowSelection.reason}`);
      
      let selectedLora: string | undefined;
      let loraStrength: number | undefined;
      let steps: number;
      let cfg: number;
      let ckpt_name: string | undefined;
      
      if (workflowSelection.useFlux) {
        // FLUX Workflow (NVIDIA/CUDA only)
        selectedLora = undefined; // FLUX ไม่ต้องใช้ LoRA
        loraStrength = undefined;
        steps = 20;
        cfg = 3.5;
        ckpt_name = CHECKPOINT_MODELS.FLUX_DEV;
        console.log(`🚀 Using FLUX.1-dev (flux_dev.safetensors) - 16GB model`);
        console.log(`🎯 LoRA: Disabled (FLUX base model is high quality)`);
      } else if (workflowSelection.useTurbo) {
        // SDXL Turbo Workflow (Mac/MPS Optimized)
        selectedLora = undefined; // DISABLE LoRA - Turbo base model is good enough for realistic
        loraStrength = undefined;
        steps = 8; // Turbo needs few steps (4-8)
        cfg = 2.0; // Turbo needs low CFG (1.5-2.5)
        ckpt_name = CHECKPOINT_MODELS.SDXL_TURBO;
        console.log(`⚡ Using SDXL Turbo (sd_xl_turbo_1.0_fp16.safetensors) - Fast Generation`);
        console.log(`🎯 Settings: Steps=${steps}, CFG=${cfg}, LoRA=DISABLED (base model only)`);
      } else {
        // SDXL Base Workflow (High Quality for Cinema Realistic)
        selectedLora = 'add-detail-xl.safetensors';
        loraStrength = 0.8; // Slightly higher for more detail
        steps = 30; // Increased from 25 for sharper details
        cfg = 8.0; // Increased from 7.5 for better prompt adherence
        ckpt_name = CHECKPOINT_MODELS.SDXL_BASE;
        console.log(`🎨 Using SDXL Base (sd_xl_base_1.0.safetensors) - Cinema Quality`);
        console.log(`🎯 Settings: Steps=${steps}, CFG=${cfg}, LoRA=${selectedLora} (enhanced detail)`);
      }
      
      const comfyImage = await generateImageWithComfyUI(prompt, {
        useFlux: workflowSelection.useFlux,
        lora: selectedLora,
        loraStrength: loraStrength,
        negativePrompt: options.negativePrompt || 'low quality, amateur, blurry, text errors, ugly',
        steps: steps,
        cfg: cfg,
        ckpt_name: ckpt_name, // Pass checkpoint name
        referenceImage: options.referenceImage,
        outfitReference: options.outfitReference,
        seed: options.seed,
        onProgress: options.onProgress
      });
      
      console.log("✅ Tier 1 Success: ComfyUI Backend + LoRA");
      return comfyImage;
    } catch (error: any) {
      console.error("❌ Tier 1 (ComfyUI Backend) failed:", error);
      errors.push(`ComfyUI Backend error: ${error.message}`);
      console.log("⚠️ ComfyUI Backend unavailable, falling back to Gemini API...");
    }
  } else {
    console.log("⚠️ ComfyUI Backend disabled (USE_COMFYUI_BACKEND=false), skipping Tier 1...");
    errors.push("ComfyUI Backend not enabled");
  }
  
  // TIER 2: Try Gemini 2.5 Flash Image (fast, quota-limited)
  try {
    console.log("🎨 Tier 2: Trying Gemini 2.5 Flash Image...");
    
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
      const resetIn = 60; // getTimeUntilReset('gemini-2.5');
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
      const resetIn = 60; // getTimeUntilReset('gemini-2.0');
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
    
    const sdImage = await generateImageWithStableDiffusion(prompt, options.seed);
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
  // ✅ Quota validation
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'character',
      details: { scriptType: 'character' }
    });
    
    if (!quotaCheck.allowed) {
      throw new Error(`❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`);
    }
  }

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
    const result = JSON.parse(text);
    
    // ✅ Record usage after successful generation
    if (userId) {
      await recordUsage(userId, {
        type: 'character',
        credits: 2, // 2 credits per character
      });
    }
    
    return result;
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
  // ✅ Quota validation
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'scene',
      details: { scriptType: 'scene' }
    });
    
    if (!quotaCheck.allowed) {
      throw new Error(`❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`);
    }
  }

  const charactersString = scriptData.characters.map(c => `${c.name} (${c.role} - Goal: ${c.goals.objective || 'Unknown'})`).join(', ');
  const languageInstruction = scriptData.language === 'Thai' 
    ? "Ensure all dialogue and descriptions are in Thai language."
    : "Ensure all dialogue and descriptions are in English.";
  
  const previousScenesInfo = (scriptData.generatedScenes[plotPoint.title] || [])
        .map(s => `Scene ${s.sceneNumber}: ${s.sceneDesign.sceneName} - ${s.sceneDesign.situations[s.sceneDesign.situations.length-1].description}`)
        .join('\n');

  // Generate psychology profiles for all characters
  const psychologyProfiles = scriptData.characters
    .map(c => formatPsychologyForPrompt(c))
    .join('\n\n');

  const storyBible = `
    - Title: ${scriptData.title}
    - Genre: ${scriptData.mainGenre}
    - Log Line: ${scriptData.logLine}
    - Key Characters: ${charactersString}
  `;

  const characterPsychology = `
=== CHARACTER PSYCHOLOGY PROFILES ===
${psychologyProfiles}

IMPORTANT: Use these psychological profiles to:
1. Write dialogue that reflects each character's mental state and emotional tendencies
2. Describe character actions and reactions consistent with their virtues and defilements
3. Show how characters' consciousness/defilement scores influence their decisions
4. Portray realistic emotional responses based on their dominant emotions
  `;

  const prompt = `
    Generate Scene #${sceneNumber} (${sceneIndex + 1}/${totalScenesForPoint}) for plot point: "${plotPoint.title}".
    Context: ${plotPoint.description}
    ${languageInstruction}
    Story Bible: ${storyBible}
    Previous Scenes: ${previousScenesInfo}

    ${characterPsychology}

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
    
    // ✅ Record usage after successful generation
    if (userId) {
      await recordUsage(userId, {
        type: 'scene',
        credits: 1, // 1 credit per scene
      });
    }
    
    return processedScene;
  } catch (error) {
    console.error(`Error generating scene for ${plotPoint.title}:`, error);
    throw new Error(`Failed to generate scene for ${plotPoint.title}.`);
  }
}

export async function generateStoryboardImage(
    prompt: string, 
    characters?: Character[],
    onProgress?: (progress: number) => void
): Promise<string> {
    try {
        // If characters are provided, add psychology context to enhance the image
        let enhancedPrompt = prompt;
        if (characters && characters.length > 0) {
            const psychologyContext = characters
                .map(c => {
                    const profile = calculatePsychologyProfile(c);
                    return `${c.name}: ${profile.emotionalTendency}, facial expression showing ${profile.dominantEmotion}`;
                })
                .join('; ');
            enhancedPrompt = `${prompt}\n\nCharacter Emotions & Expressions: ${psychologyContext}`;
        }
        
        return await generateImageWithCascade(enhancedPrompt, {
            useLora: true,
            loraType: 'DETAIL_ENHANCER',
            negativePrompt: 'low quality, blurry, distorted, text, watermark',
            onProgress: onProgress
        });
    } catch (error: any) {
        console.error("Error generating storyboard image:", error);
        throw new Error(error.message || "Failed to generate storyboard image.");
    }
}

export async function generateCharacterImage(
    description: string, 
    style: string, 
    facialFeatures: string, 
    referenceImageBase64?: string,
    onProgress?: (progress: number) => void,
    generationMode: GenerationMode = 'balanced',
    preferredModel?: string // Model ID: 'pollinations', 'comfyui-sdxl', 'gemini-pro', etc.
): Promise<string> {
    // ✅ Quota validation
    const userId = auth.currentUser?.uid;
    if (userId) {
        const quotaCheck = await checkQuota(userId, {
            type: 'image',
            details: { resolution: '1024x1024' } // Default resolution
        });
        
        if (!quotaCheck.allowed) {
            throw new Error(`❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`);
        }
    }

    try {
        console.log("🎨 generateCharacterImage called:");
        console.log("  - Description:", description);
        console.log("  - Style:", style);
        console.log("  - Facial Features:", facialFeatures);
        console.log("  - Has Reference:", !!referenceImageBase64);
        
        // Extract gender from facial features (Thai words FIRST for better matching)
        // Use looser pattern for Thai words (no word boundary)
        const thaiGenderMatch = facialFeatures.match(/(ชาย|หญิง|ผู้ชาย|ผู้หญิง)/i);
        const engGenderMatch = facialFeatures.match(/\b(male|female|man|woman|boy|girl)\b/i);
        const genderMatch = thaiGenderMatch || engGenderMatch;
        let gender = genderMatch ? genderMatch[1].trim().toLowerCase() : '';
        
        // Normalize Thai gender to English IMMEDIATELY
        if (gender === 'ชาย' || gender === 'ผู้ชาย') {
            gender = 'male';
        } else if (gender === 'หญิง' || gender === 'ผู้หญิง') {
            gender = 'female';
        }
        
        // Extract age from facial features
        const ageMatch = facialFeatures.match(/age[:\s]+([^,]+)/i) || 
                        facialFeatures.match(/(\d+)\s*(?:years?\s+old|yr|y\.o\.|ปี)/i) ||
                        facialFeatures.match(/อายุ[:\s]*(\d+)/i);
        const age = ageMatch ? ageMatch[1].trim() : '';
        
        console.log("🔍 Extracted gender:", gender);
        console.log("🔍 Extracted age:", age);
        
        // Build gender-specific keywords for stronger differentiation
        let genderKeywords = '';
        if (gender.includes('female') || gender.includes('woman') || gender.includes('girl')) {
            genderKeywords = 'FEMALE WOMAN, feminine features, lady, she, her, NEVER male features';
        } else if (gender.includes('male') || gender.includes('man') || gender.includes('boy')) {
            genderKeywords = 'MALE MAN, masculine features, gentleman, he, him, NEVER female features';
        }
        
        // Build age-specific keywords
        let ageKeywords = '';
        if (age) {
            const ageNum = parseInt(age);
            if (!isNaN(ageNum)) {
                if (ageNum < 18) ageKeywords = 'young, youthful, adolescent';
                else if (ageNum < 30) ageKeywords = 'young adult, fresh-faced';
                else if (ageNum < 50) ageKeywords = 'mature, adult';
                else if (ageNum < 65) ageKeywords = 'middle-aged, experienced';
                else ageKeywords = 'elderly, senior, aged, wise';
            }
        }
        
        // Generate unique random seed for this character to ensure different results
        const randomSeed = Math.floor(Math.random() * 1000000);
        const timestamp = Date.now();
        
        // Add uniqueness markers to description
        const uniqueMarker = `[Character-${timestamp}-${randomSeed}]`;
        
        // Build comprehensive prompt with GENDER FIRST for Pollinations.ai
        let prompt = `${uniqueMarker} `;
        
        // CRITICAL: Gender and Age MUST be at the start for Pollinations.ai to understand
        if (genderKeywords) {
            prompt += `${genderKeywords.split(',')[0].toUpperCase()} `; // e.g., "FEMALE WOMAN" or "MALE MAN"
        }
        
        if (age) {
            prompt += `AGE ${age} ${ageKeywords} `;
        }
        
        prompt += `PORTRAIT - UNIQUE CHARACTER #${randomSeed}

`;
        
        // Style-specific keywords
        const isRealisticStyle = style.toLowerCase().includes('realistic') || 
                                style.toLowerCase().includes('photorealistic') || 
                                style.toLowerCase().includes('cinematic') ||
                                style.toLowerCase().includes('photograph');
        
        if (isRealisticStyle) {
            // Realistic styles - add photorealistic keywords
            prompt += `Art Style: ${style}, PHOTOREALISTIC, REAL PHOTOGRAPH, professional photography, 8K resolution, highly detailed, realistic skin texture, natural lighting, lifelike, real person, canon camera, dslr photo, sharp focus, detailed eyes, detailed hair, pores visible, skin imperfections, natural shadows

`;
        } else {
            // Cartoon/Anime/Artistic styles - use style as-is without photorealistic keywords
            prompt += `Art Style: ${style}, highly detailed, vivid colors, professional illustration, clean lines, expressive features

`;
        }
        
        // Physical features with gender emphasis
        if (genderKeywords) {
            prompt += `GENDER: ${genderKeywords}\n\n`;
        }
        
        prompt += `PHYSICAL FEATURES (MUST BE UNIQUE AND DIFFERENT):
${facialFeatures}

PERSONALITY:
${description}`;

        if (referenceImageBase64) {
            prompt += `\n\nREFERENCE IMAGE PROVIDED: Copy exact facial features from reference image.`;
        } else {
            prompt += `\n\nNO REFERENCE: Create completely original, never-seen-before face.`;
        }
        
        prompt += `\n\nREQUIREMENTS:
- UNIQUE individual #${randomSeed}
- MAXIMUM difference from other characters
- DISTINCTIVE facial structure and features`;
        
        // Style-specific negative prompts
        let negativePrompt;
        if (isRealisticStyle) {
            // Realistic styles - block cartoon/anime
            negativePrompt = `cartoon, anime, manga, illustration, drawing, painting, sketch, 2d, flat colors, cell shading, comic, graphic novel, stylized, artistic, non-photorealistic, painterly, rendered, cg, 3d render, unreal engine, digital art, fantasy art, concept art, deformed face, multiple heads, bad anatomy, low quality, blurry, duplicate face, same face as other character, identical twin, generic face, copy of previous character, similar appearance to other people, clone face, repeated facial features, non-unique appearance, reused face, recycled appearance, common features, standard face, typical appearance, average face, copied from memory, previously generated face`;
        } else {
            // Cartoon/Anime styles - only block quality issues and duplicates
            negativePrompt = `deformed face, multiple heads, bad anatomy, low quality, blurry, bad proportions, duplicate face, same face as other character, identical twin, generic face, copy of previous character, similar appearance to other people, clone face, repeated facial features, non-unique appearance, reused face, recycled appearance, common features, standard face, typical appearance, average face, copied from memory, previously generated face, ugly, distorted, malformed`;
        }
        
        console.log("📝 Generated prompt:", prompt);
        console.log("🚫 Negative prompt:", negativePrompt);
        console.log("🎲 Random seed:", randomSeed);
        console.log("🔄 Using LoRA:", !!referenceImageBase64);
        
        // CRITICAL FIX: Only use CHARACTER_CONSISTENCY LoRA when there's a reference image
        // Without reference, we want MAXIMUM variety and uniqueness
        return await generateImageWithCascade(prompt, {
            useLora: referenceImageBase64 ? true : false, // Only use LoRA with reference
            loraType: 'CHARACTER_CONSISTENCY',
            negativePrompt: negativePrompt,
            referenceImage: referenceImageBase64,
            seed: randomSeed, // Add random seed for variation
            onProgress: onProgress, // Pass progress callback
            generationMode: generationMode, // Pass selected mode
            preferredModel: preferredModel // Pass model preference
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
    outfitReferenceImageBase64?: string,
    onProgress?: (progress: number) => void,
    generationMode?: GenerationMode,
    preferredModel?: string // Model ID: 'pollinations', 'comfyui-sdxl', 'gemini-pro', etc.
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
        
        // ✅ Extract ALL character information: Information + Physical + Fashion
        
        // Information Section (external)
        const gender = physicalInfo["Gender"] || "";
        const ethnicity = physicalInfo["Ethnicity"] || physicalInfo["Nationality"] || "Global";
        const age = physicalInfo["Age"] || "";
        const occupation = physicalInfo["Occupation"] || "";
        const socialStatus = physicalInfo["Social Status"] || "";
        
        // Physical Section
        const height = physicalInfo["Height"] || "";
        const weight = physicalInfo["Weight"] || "";
        const bodyType = physicalInfo["Body Type"] || physicalInfo["Physical Characteristics"] || "";
        const skinTone = physicalInfo["Skin Tone"] || "";
        const eyeColor = physicalInfo["Eye Color"] || "";
        const hairStyle = physicalInfo["Hair style"] || "";
        const hairColor = physicalInfo["Hair Color"] || "";
        const facialFeatures = physicalInfo["Facial Features"] || "";
        const distinguishingMarks = physicalInfo["Distinguishing Marks"] || "";
        
        // Fashion Section (Costume & Fashion)
        const mainOutfit = physicalInfo["Main Outfit"] || "";
        const accessories = physicalInfo["Accessories"] || "";
        const footwear = physicalInfo["Footwear"] || "";
        const headwear = physicalInfo["Headwear"] || "";
        const specialItems = physicalInfo["Special Items"] || "";
        const fashionStyle = physicalInfo["Fashion Style"] || "";
        const colorPalette = physicalInfo["Color Palette"] || "";
        
        // Build comprehensive character description
        let characterDetails = [];
        
        // Information
        if (gender) characterDetails.push(`Gender: ${gender}`);
        if (age) characterDetails.push(`Age: ${age}`);
        if (ethnicity) characterDetails.push(`Ethnicity: ${ethnicity}`);
        if (occupation) characterDetails.push(`Occupation: ${occupation}`);
        if (socialStatus) characterDetails.push(`Status: ${socialStatus}`);
        
        // Physical
        if (height) characterDetails.push(`Height: ${height}`);
        if (weight) characterDetails.push(`Weight: ${weight}`);
        if (bodyType) characterDetails.push(`Body: ${bodyType}`);
        if (skinTone) characterDetails.push(`Skin: ${skinTone}`);
        if (eyeColor) characterDetails.push(`Eyes: ${eyeColor}`);
        if (hairStyle) characterDetails.push(`Hair Style: ${hairStyle}`);
        if (hairColor) characterDetails.push(`Hair Color: ${hairColor}`);
        if (facialFeatures) characterDetails.push(`Facial Features: ${facialFeatures}`);
        if (distinguishingMarks) characterDetails.push(`Marks: ${distinguishingMarks}`);
        
        // Fashion Details
        let fashionDetails = [];
        if (accessories) fashionDetails.push(`Accessories: ${accessories}`);
        if (footwear) fashionDetails.push(`Footwear: ${footwear}`);
        if (headwear) fashionDetails.push(`Headwear: ${headwear}`);
        if (specialItems) fashionDetails.push(`Special Items: ${specialItems}`);
        if (fashionStyle) fashionDetails.push(`Fashion Style: ${fashionStyle}`);
        if (colorPalette) fashionDetails.push(`Colors: ${colorPalette}`);
        
        const physicalDesc = characterDetails.join(", ");
        const fashionDesc = fashionDetails.join(", ");
        
        // Detect gender pronouns for better prompting
        const genderPronoun = gender.toLowerCase().includes('female') || gender.toLowerCase().includes('woman') || gender.toLowerCase().includes('girl') ? 'female' : gender.toLowerCase().includes('male') || gender.toLowerCase().includes('man') || gender.toLowerCase().includes('boy') ? 'male' : '';
        
        let prompt = '';
        let negativePrompt = 'multiple views, grid layout, collage, split image, reference sheet, character sheet, multiple angles, multiple poses, 2 people, 3 people, 4 people, group photo, deformed, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, cross-eyed, mutated hands, poorly drawn hands, poorly drawn face, mutation, ugly, blurry, low quality, watermark, text';
        
        if (referenceImageBase64) {
            // FACE ID MODE - Match face from reference but keep selected art style
            prompt = `CRITICAL INSTRUCTIONS:
1. Create ONE SINGLE IMAGE ONLY (not a grid, collage, or multiple views)
2. I am providing a REFERENCE IMAGE - copy their EXACT facial features
3. This is a ${genderPronoun ? genderPronoun.toUpperCase() : 'PERSON'} character${gender ? ` (Gender: ${gender})` : ''}

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

CHARACTER INFORMATION:
- Name: ${characterName}
${gender ? `- Gender: ${gender} (IMPORTANT: This is a ${genderPronoun} character)` : ''}
- Ethnicity: ${ethnicity}
${physicalDesc ? `- Physical Details: ${physicalDesc}` : ''}

OUTFIT & FASHION:
- Main Outfit: ${costumeDesc}
${fashionDesc ? `- Fashion Details: ${fashionDesc}` : ''}

COMPOSITION REQUIREMENTS:
- ONE SINGLE FULL-BODY IMAGE (NOT a grid, collage, or multiple views)
- Full body shot from head to toe
- Clear view of the complete outfit and all accessories
- Show footwear, headwear, and special items if specified
- Professional composition with attention to fashion details
- NO reference sheets, NO multiple angles, NO split images

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
            prompt = `CRITICAL: Create ONE SINGLE IMAGE ONLY (not a grid, collage, or multiple views)

CREATE IMAGE IN ${styleDescription.toUpperCase()} STYLE

Style Keywords: ${styleKeywords}

Full body character design of ${characterName}.

Character Information:
${gender ? `- Gender: ${gender} (This is a ${genderPronoun} character)` : ''}
- Ethnicity: ${ethnicity}
${physicalDesc ? `- Physical Details: ${physicalDesc}` : ''}

Outfit & Fashion:
- Main Outfit: ${costumeDesc}
${fashionDesc ? `- Fashion Details: ${fashionDesc}` : ''}

Art Style: ${styleDescription}
Style Requirements: ${styleKeywords}

COMPOSITION: ONE single full-body image, NO grid, NO collage, NO multiple views.

Render this ${genderPronoun} character in ${styleDescription} style with full outfit and all fashion details.`;
            
            console.log("📝 Regular Prompt:", prompt.substring(0, 300) + "...");
        }
        
        if (outfitReferenceImageBase64) {
            prompt += `\n\nOUTFIT REFERENCE: Match the clothing style, design, patterns, and colors from the outfit reference image.`;
        }
        
        // Use CHARACTER_CONSISTENCY LoRA for all styles
        
        const imageUrl = await generateImageWithCascade(prompt, {
            useLora: true,
            loraType: 'CHARACTER_CONSISTENCY',
            negativePrompt: negativePrompt,
            referenceImage: referenceImageBase64,
            outfitReference: outfitReferenceImageBase64,
            onProgress: onProgress, // Pass progress callback
            generationMode: generationMode, // Pass generation mode for quality/speed control
            preferredModel: preferredModel // Pass model preference
        });
        
        // ✅ Record usage after successful generation
        const currentUserId = auth.currentUser?.uid;
        if (currentUserId) {
            await recordUsage(currentUserId, {
                type: 'image',
                credits: 2, // 2 credits per image
            });
        }
        
        return imageUrl;
    } catch (error: any) {
        console.error("Error generating costume image:", error);
        throw new Error(error.message || "Failed to generate costume image.");
    }
}

export async function generateStoryboardVideo(
    prompt: string, 
    base64Image?: string,
    onProgress?: (progress: number) => void,
    preferredModel: string = 'auto'
): Promise<string> {
    try {
        console.log(`🎬 Generating video with model: ${preferredModel}`);
        
        // 0. Check Subscription Access
        if (preferredModel !== 'auto') {
            if (!hasAccessToModel(preferredModel, 'video')) {
                throw new Error(`Upgrade required: You do not have access to ${preferredModel}.`);
            }
        }

        // 1. Handle User Selection
        if (preferredModel === 'gemini-veo' || (preferredModel === 'auto' && !COMFYUI_ENABLED)) {
             // Try Tier 1: Gemini Veo 3.1 (best quality, limited quota)
            console.log("🎬 Tier 1: Trying Gemini Veo 3.1...");
            
            // Check credits for paid model
            const modelConfig = VIDEO_MODELS_CONFIG.PAID.GEMINI_VEO;
            
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
                
                // Fake progress for Gemini Veo since we don't get percentage
                if (onProgress) {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min((elapsed / 30000) * 100, 95); // Assume 30s avg
                    onProgress(progress);
                }

                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (onProgress) onProgress(100);

            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!videoUri) throw new Error("No video URI returned");
            
            // Deduct credits
            deductCredits(modelConfig.costPerGen || 0);
            
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'PLACEHOLDER_KEY';
            console.log("✅ Tier 1 Success: Gemini Veo 3.1");
            return `${videoUri}&key=${apiKey}`;
        }
        
        if (preferredModel === 'comfyui-svd' || (preferredModel === 'auto' && COMFYUI_ENABLED)) {
             // Try Tier 2: ComfyUI + SVD (if enabled)
            if (COMFYUI_ENABLED || USE_COMFYUI_BACKEND) {
                try {
                    console.log("🎬 Tier 2: Trying ComfyUI + Stable Video Diffusion...");
                    const result = await generateVideoWithComfyUI(prompt, {
                        baseImage: base64Image,
                        lora: LORA_MODELS.DETAIL_ENHANCER,
                        loraStrength: 0.8,
                        negativePrompt: "low quality, blurry, static, watermark",
                        frameCount: 25,
                        fps: 8,
                        onProgress: onProgress
                    });
                    // Free model, no credit deduction
                    return result;
                } catch (comfyError: any) {
                    console.error("❌ Tier 2 failed:", comfyError);
                    if (preferredModel !== 'auto') throw comfyError; // Don't fallback if manually selected
                }
            } else {
                if (preferredModel !== 'auto') throw new Error("ComfyUI is not enabled. Please check your settings.");
            }
        }

        if (preferredModel === 'pollinations-video') {
             // Placeholder for Pollinations Video (if API exists, otherwise fallback)
             console.warn("⚠️ Pollinations Video API not fully implemented, falling back to Gemini/ComfyUI logic or throwing error.");
             // For now, throw error or implement if URL known
             throw new Error("Pollinations Video generation not yet implemented.");
        }

        if (preferredModel === 'luma-dream-machine' || preferredModel === 'runway-gen3') {
            // These are paid models, check credits
            const modelConfig = Object.values(VIDEO_MODELS_CONFIG.PAID).find(m => m.id === preferredModel);
            if (modelConfig) {
                 // Simulate API call
                 await new Promise(resolve => setTimeout(resolve, 2000));
                 deductCredits(modelConfig.costPerGen || 0);
                 throw new Error(`${preferredModel} integration coming soon! Credits deducted for simulation.`);
            }
            throw new Error(`${preferredModel} integration coming soon! Please select another model.`);
        }
        
        // Fallback Logic (if auto or failed)
        throw new Error(`Failed to generate video with ${preferredModel}. Please try another model.`);

    } catch (error: any) {
        console.error("❌ Video generation failed:", error);
        throw new Error(`Failed to generate video: ${error.message}`);
    }
}

export async function generateMoviePoster(
    scriptData: ScriptData, 
    customPrompt?: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    try {
        let prompt = "";
        if (customPrompt && customPrompt.trim().length > 0) {
            prompt = customPrompt;
        } else {
            prompt = `Movie Poster. Title: ${scriptData.title}. Genre: ${scriptData.mainGenre}. Style: Cinematic, Professional.`;
        }
        
        return await generateImageWithCascade(prompt, {
            useLora: true,
            loraType: 'DETAIL_ENHANCER',
            negativePrompt: 'low quality, amateur, blurry, text errors, ugly',
            onProgress: onProgress
        });
    } catch (error: any) {
        console.error("Error generating movie poster:", error);
        throw new Error(error.message || "Failed to generate movie poster.");
    }
}
