import { GoogleGenAI } from '@google/genai';
import type { ScriptData, PlotPoint, Character, GeneratedScene, LocationDetails } from '../types';
import { EMPTY_CHARACTER, DIALECT_PRESETS, ACCENT_PATTERNS } from '../constants';
import { logger } from '../utils/logger';
import {
  generateWithComfyUI as generateWithBackendComfyUI,
  checkBackendStatus,
  generateImageWithBackend,
} from './comfyuiBackendClient';
import { formatPsychologyForPrompt, calculatePsychologyProfile } from './psychologyCalculator';
import type { GenerationMode } from './comfyuiWorkflowBuilder';
import { MODE_PRESETS, buildAnimateDiffWorkflow, buildSVDWorkflow } from './comfyuiWorkflowBuilder';
import { hasAccessToModel, deductCredits } from './userStore';
import { checkQuota, recordUsage, checkVeoQuota, recordVeoUsage } from './subscriptionManager';
import { auth } from '../config/firebase';
import { recordGeneration } from './modelUsageTracker';
import { API_PRICING } from '../types/analytics';
import type { MotionEdit } from '../types/motionEdit';
import { buildVideoPromptWithMotion, motionEditToAnimateDiffParams } from './motionEditorService';
import { loadRenderSettings } from './deviceManager';
import { generateAnimateDiffVideo, generateSVDVideo, generateHotshotXL } from './replicateService';
import { persistVideoUrl } from './videoPersistenceService';
import { getSavedComfyUIUrl } from './comfyuiInstaller';
import { buildCastPromptBlock, normalizeCastNames } from './castPrompt';

// ═══════════════════════════════════════════════════════════════════════════
// NEGATIVE PROMPTS - COMPREHENSIVE ANATOMY & QUALITY CONTROL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🎨 COMPREHENSIVE NEGATIVE PROMPT
 * Prevents common AI image generation issues:
 * - Anatomical errors (extra/missing limbs, deformed body parts)
 * - Quality issues (blur, noise, artifacts)
 * - Style issues (bad composition, wrong proportions)
 */
const NEGATIVE_PROMPT_COMPREHENSIVE = [
  // === ANATOMY ISSUES ===
  'bad anatomy',
  'deformed body',
  'malformed limbs',
  'extra limbs',
  'extra arms',
  'extra legs',
  'extra hands',
  'extra fingers',
  'missing limbs',
  'missing arms',
  'missing legs',
  'fused fingers',
  'too many fingers',
  'mutated hands',
  'poorly drawn hands',
  'poorly drawn face',
  'deformed face',
  'ugly face',
  'disfigured',
  'mutation',
  'mutilated',
  
  // === HEAD & FACE ===
  'multiple heads',
  'two heads',
  'duplicate heads',
  'elongated neck',
  'twisted neck',
  'deformed eyes',
  'cross-eyed',
  'asymmetric eyes',
  'missing eyes',
  
  // === BODY PROPORTIONS ===
  'bad proportions',
  'wrong proportions',
  'distorted body',
  'unrealistic proportions',
  'asymmetric body',
  'body out of frame',
  'cropped body',
  'cut off',
  
  // === QUALITY ISSUES ===
  'low quality',
  'worst quality',
  'blurry',
  'out of focus',
  'grainy',
  'noisy',
  'pixelated',
  'jpeg artifacts',
  'compression artifacts',
  'watermark',
  'signature',
  'username',
  'text',
  
  // === STYLE & COMPOSITION ===
  'ugly',
  'amateur',
  'poorly drawn',
  'bad composition',
  'bad lighting',
  'oversaturated',
  'undersaturated',
  'overexposed',
  'underexposed',
].join(', ');

/**
 * 🎨 FACE-FOCUSED NEGATIVE PROMPT
 * For portrait/face generation - lighter, focused on face quality
 */
const NEGATIVE_PROMPT_FACE = [
  'deformed face',
  'ugly face',
  'multiple heads',
  'bad anatomy',
  'poorly drawn face',
  'extra fingers',
  'mutated hands',
  'low quality',
  'blurry',
  'watermark',
].join(', ');

/**
 * 🎨 BODY-FOCUSED NEGATIVE PROMPT  
 * For full-body generation - comprehensive anatomy control
 */
const NEGATIVE_PROMPT_BODY = [
  'bad anatomy',
  'deformed body',
  'extra limbs',
  'extra arms',
  'extra legs',
  'missing limbs',
  'malformed limbs',
  'fused fingers',
  'too many fingers',
  'poorly drawn hands',
  'poorly drawn face',
  'bad proportions',
  'disfigured',
  'mutation',
  'mutilated',
  'multiple heads',
  'low quality',
  'blurry',
].join(', ');

// Initialize AI with environment variable (Vite)
const requireGeminiApiKey = (featureName: string) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || String(apiKey).trim().length === 0 || apiKey === 'PLACEHOLDER_KEY') {
    throw new Error(
      `❌ ไม่พบ Gemini API Key (VITE_GEMINI_API_KEY) สำหรับ ${featureName}\n\n` +
        `วิธีแก้:\n` +
        `1) สร้าง API key ที่ https://aistudio.google.com/app/apikey\n` +
        `2) ใส่ในไฟล์ .env.local (ที่โฟลเดอร์โปรเจกต์):\n` +
        `   VITE_GEMINI_API_KEY=AIza...\n` +
        `3) ปิด/เปิด dev server ใหม่ (restart npm run dev)\n`
    );
  }
};

export const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn(
      'API Key not found in environment. Gemini features will be unavailable until VITE_GEMINI_API_KEY is set.'
    );
  }
  // Use empty string to avoid accidentally "working" with a fake key.
  // All Gemini calls must pass through requireGeminiApiKey() first.
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

const ai = getAI();

/**
 * Count tokens for a given text using Gemini model
 */
async function countTokens(text: string, modelId: string = 'gemini-1.5-flash'): Promise<number> {
  // NOTE: Some environments / API versions return 404 for :countTokens (as seen in browser logs).
  // Token counting is not critical for functionality, so we use a local estimate to avoid noisy network errors.
  void modelId; // keep signature stable
  return Math.ceil(text.length / 4); // Estimate: ~4 chars per token
}

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
      description: 'Fast, free, good for testing',
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
      description: 'Mac optimized, good quality',
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
      description: 'Free tier with daily quota',
    },
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
      description: 'Best quality from Gemini',
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
      description: 'Highest quality, NVIDIA only',
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
      description: 'OpenAI flagship model',
    },
  },
};

export const VIDEO_MODELS_CONFIG = {
  FREE: {
    POLLINATIONS_VIDEO: {
      id: 'pollinations-video',
      name: 'Pollinations Video (FREE)',
      provider: 'Pollinations.ai',
      cost: 'FREE',
      speed: '⚡⚡⚡ Very Fast (10-20s)',
      quality: '⭐⭐ Low-Medium',
      duration: '2-5 sec',
      limits: 'Unlimited',
      description: 'FREE tier - Fast generation, basic quality',
      tier: 'free',
      costPerGen: 0,
    },
    LOCAL_GPU: {
      id: 'local-gpu',
      name: 'Local GPU (ComfyUI)',
      provider: 'Your Computer',
      cost: 'FREE - No Credits Used',
      speed: '⚡⚡ Fast (depends on GPU)',
      quality: '⭐⭐⭐⭐ High',
      duration: 'Unlimited',
      limits: 'Project/Character limits apply per tier',
      description: 'Use your own GPU - No credit cost! (Install ComfyUI required)',
      tier: 'free',
      costPerGen: 0,
      isLocalGPU: true,
    },
    CLOUD_GPU: {
      id: 'cloud-gpu',
      name: 'Cloud GPU (RunPod)',
      provider: 'RunPod RTX 4090',
      cost: 'Pay Per Use ($0.60/hr)',
      speed: '⚡⚡⚡ Very Fast',
      quality: '⭐⭐⭐⭐ High',
      duration: 'Unlimited',
      limits: 'RunPod must be running',
      description: 'Use Cloud GPU when available - Faster than local',
      tier: 'free',
      costPerGen: 0,
      isCloudGPU: true,
    },
    // 🆕 WAN Models - FREE for all tiers (Kijai converted models)
    COMFYUI_WAN_I2V: {
      id: 'comfyui-wan-i2v',
      name: '⭐ WAN 2.1 I2V 14B FP8 (Image-to-Video)',
      provider: 'Local ComfyUI',
      cost: 'FREE - No Credits',
      speed: '⚡ Medium (2-4 min)',
      quality: '🌟🌟🌟🌟🌟 Ultimate',
      duration: '5 sec (81 frames)',
      limits: 'GPU required (16GB+ VRAM)',
      description: 'FREE - Best for character animation with face ID (DEFAULT)',
      tier: 'free',
      costPerGen: 0,
    },
    COMFYUI_WAN_T2V: {
      id: 'comfyui-wan-t2v',
      name: '🎬 WAN 2.1 T2V 14B FP8 (Text-to-Video)',
      provider: 'Local ComfyUI',
      cost: 'FREE - No Credits',
      speed: '⚡ Medium (2-4 min)',
      quality: '🌟🌟🌟🌟🌟 Ultimate',
      duration: '5 sec (81 frames)',
      limits: 'GPU required (16GB+ VRAM)',
      description: 'FREE - General purpose text-to-video generation',
      tier: 'free',
      costPerGen: 0,
    },
    // COMFYUI_WAN_S2V: {
    //   id: 'comfyui-wan-s2v',
    //   name: 'WAN 2.2 S2V 14B (Sound-to-Video)',
    //   provider: 'Local ComfyUI',
    //   cost: 'FREE - No Credits',
    //   speed: '⚡ Slow (3-6 min)',
    //   quality: '🌟🌟🌟🌟🌟 Ultimate',
    //   duration: '5 sec (81 frames)',
    //   limits: 'GPU required (24GB+ VRAM), Audio input',
    //   description: 'FREE - Audio-driven animation',
    //   tier: 'free',
    //   costPerGen: 0,
    // },
    // 🆕 AnimateDiff & SVD - FREE for all tiers
    COMFYUI_ANIMATEDIFF_V3: {
      id: 'comfyui-animatediff-v3',
      name: '⭐ AnimateDiff v3 (Fast Motion)',
      provider: 'Local ComfyUI',
      cost: 'FREE - No Credits',
      speed: '⚡⚡ Fast (30-60s)',
      quality: '⭐⭐⭐⭐ High',
      duration: '2-4 sec (16-32 frames)',
      limits: 'GPU required (8GB+ VRAM)',
      description: 'FREE - Fast character animation (DEFAULT)',
      tier: 'free',
      costPerGen: 0,
    },
    COMFYUI_SVD: {
      id: 'comfyui-svd',
      name: 'Stable Video Diffusion (Image-to-Video)',
      provider: 'Local ComfyUI',
      cost: 'FREE - No Credits',
      speed: '⚡⚡ Fast (30-90s)',
      quality: '⭐⭐⭐⭐ High',
      duration: '2-4 sec (25 frames)',
      limits: 'GPU required (12GB+ VRAM)',
      description: 'FREE - Convert images to motion video',
      tier: 'free',
      costPerGen: 0,
    },
  },
  BASIC: {
    REPLICATE_SVD: {
      id: 'replicate-svd',
      name: 'Replicate SVD',
      provider: 'Replicate',
      cost: '💵 Credits ($0.018/video)',
      speed: '⚡⚡ Fast (30-60s)',
      quality: '⭐⭐⭐ Good (576p)',
      duration: '3-10 sec',
      limits: 'Credit-based',
      description: 'BASIC tier - Stable Video Diffusion',
      tier: 'basic',
      costPerGen: 2,
    },
    REPLICATE_ANIMATEDIFF: {
      id: 'replicate-animatediff',
      name: 'Replicate AnimateDiff',
      provider: 'Replicate',
      cost: '💵 Credits ($0.025/video)',
      speed: '⚡⚡ Fast (60-90s)',
      quality: '⭐⭐⭐ Good (512p)',
      duration: '2-8 sec',
      limits: 'Credit-based',
      description: 'BASIC tier - AnimateDiff (Text/Image-to-Video)',
      tier: 'basic',
      costPerGen: 3,
    },
  },
  PRO: {
    REPLICATE_LTX: {
      id: 'replicate-ltx',
      name: 'Replicate LTX Video',
      provider: 'Replicate',
      cost: '💵 Credits ($0.15/video)',
      speed: '⚡ Medium (2-3 min)',
      quality: '⭐⭐⭐⭐ Very Good (768p)',
      duration: '5-10 sec',
      limits: 'Credit-based',
      description: 'PRO tier - High quality text/image-to-video',
      tier: 'pro',
      costPerGen: 8,
    },
    GEMINI_VEO: {
      id: 'gemini-veo',
      name: 'Gemini Veo 3',
      provider: 'Google',
      cost: '💵 Credits (Premium)',
      speed: '⚡⚡ Fast (30-60s)',
      quality: '⭐⭐⭐⭐⭐ Excellent (1080p)',
      duration: '5-120 sec',
      limits: 'Credit-based',
      description: 'PRO tier - Google state-of-the-art video model',
      tier: 'pro',
      costPerGen: 15,
    },
  },
  ENTERPRISE: {
    ALL_MODELS: {
      id: 'enterprise-all',
      name: 'All Models Unlimited',
      provider: 'All Providers',
      cost: 'Unlimited',
      speed: 'Varies',
      quality: '⭐⭐⭐⭐⭐ Best Available',
      duration: 'Unlimited',
      limits: 'No Limits',
      description: 'ENTERPRISE - Access to all models without restrictions',
      tier: 'enterprise',
      costPerGen: 0,
    },
  },
};

// Model aliases for backward compatibility
const GEMINI_25_IMAGE_MODEL = 'gemini-2.5-flash-image';
const GEMINI_20_IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation';

// --- DEBUG: CACHE BUSTER & ENV CHECK ---
logger.info('🚀 GEMINI SERVICE LOADED v2.2', {
  time: new Date().toLocaleTimeString(),
  config: {
    VITE_USE_COMFYUI_BACKEND: import.meta.env.VITE_USE_COMFYUI_BACKEND,
    TYPE: typeof import.meta.env.VITE_USE_COMFYUI_BACKEND,
    IS_TRUE: import.meta.env.VITE_USE_COMFYUI_BACKEND === 'true',
  },
});
// ---------------------------------------

const USE_COMFYUI_BACKEND = true; // FORCE ENABLED for Local GPU Fix
const COMFYUI_ENABLED = true; // FORCE ENABLED
const COMFYUI_DEFAULT_URL =
  import.meta.env.VITE_COMFYUI_URL ||
  import.meta.env.VITE_COMFYUI_API_URL ||
  'http://localhost:8188';

/**
 * Get ComfyUI API URL (uses getSavedComfyUIUrl for auto-cleanup of old URLs)
 */
function getComfyUIApiUrl(): string {
  return getSavedComfyUIUrl();
}

// Workflow Selection: 'flux' | 'sdxl' | 'auto'
// - flux: NVIDIA/CUDA only (Float8 precision)
// - sdxl: Mac/MPS compatible
// - auto: Detect device automatically (default)
const PREFERRED_WORKFLOW = import.meta.env.VITE_COMFYUI_WORKFLOW || 'auto';

// LoRA Configuration
// SDXL LoRA Models (compatible with SDXL only)
const SDXL_LORA_MODELS = {
  CHARACTER_CONSISTENCY: 'add-detail-xl.safetensors', // ✅ SDXL LoRA (45MB)
  DETAIL_ENHANCER: 'add-detail-xl.safetensors',
  // Note: Hunt3.safetensors is SD 1.5 LoRA (incompatible with SDXL/FLUX)
};

// Checkpoint Models
const CHECKPOINT_MODELS = {
  FLUX_DEV: 'flux_dev.safetensors', // 16GB - FLUX.1-dev (recommended)
  SDXL_BASE: 'sd_xl_base_1.0.safetensors', // 6.5GB - SDXL Base
  SDXL_TURBO: 'sd_xl_turbo_1.0_fp16.safetensors', // 6.5GB - SDXL Turbo
};

// Legacy: Keep for backward compatibility
const LORA_MODELS = SDXL_LORA_MODELS;

/**
 * เลือก workflow ที่เหมาะสมกับ device
 * FLUX: รองรับ NVIDIA/CUDA เท่านั้น (Float8 precision)
 * FLUX-CPU: รองรับ Mac/CPU (ช้ามาก ~5-10 นาที)
 * SDXL: รองรับทั้ง Mac/MPS, NVIDIA, CPU
 */
function selectWorkflow(preferredWorkflow: string = PREFERRED_WORKFLOW): {
  useFlux: boolean;
  useTurbo: boolean;
  reason: string;
} {
  // Force FLUX (NVIDIA/CUDA only)
  if (preferredWorkflow === 'flux') {
    return {
      useFlux: true,
      useTurbo: false,
      reason: 'Manual: FLUX on GPU (NVIDIA/CUDA required)',
    };
  }

  // Force FLUX on CPU (Mac compatible, slow)
  if (preferredWorkflow === 'flux-cpu') {
    console.warn('⚠️  FLUX-CPU mode: Very slow (~5-10 minutes per image)');
    return {
      useFlux: true,
      useTurbo: false,
      reason: 'Manual: FLUX on CPU (slow but works on Mac)',
    };
  }

  // Force SDXL
  if (preferredWorkflow === 'sdxl') {
    return {
      useFlux: false,
      useTurbo: false,
      reason: 'Manual: SDXL Base (High Quality)',
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
      reason: 'Auto: Mac/MPS detected → SDXL Base (Quality, 30 steps)',
    };
  }

  // 🔧 DEFAULT: Use SDXL for compatibility (FLUX requires 16GB+ model download)
  // User can manually select FLUX via model dropdown if they have it installed
  return {
    useFlux: false,
    useTurbo: false,
    reason: 'Auto: Using SDXL Base (compatible, high quality)',
  };
}

// Video Models Configuration
// Import video motion engine
import {
  buildVideoPrompt,
  getMotionModuleStrength,
  getRecommendedFPS,
  getRecommendedFrameCount,
  type ShotData,
} from './videoMotionEngine';

async function generateImageWithStableDiffusion(prompt: string, seed?: number): Promise<string> {
  const startTime = Date.now();
  try {
    logger.info('🎨 Using Stable Diffusion XL (Alternative API)', { seed });

    // 🇹🇭 CRITICAL FIX: Translate Thai text to English for Pollinations.ai
    // SDXL doesn't understand Thai language → gets wrong ethnicity
    let translatedPrompt = prompt;

    // Detect if prompt contains Thai characters
    const hasThaiText = /[\u0E00-\u0E7F]/.test(prompt);
    if (hasThaiText) {
      logger.info('🇹🇭 Detected Thai text - translating for SDXL');

      // Common Thai → English translations for physical features
      const thaiToEnglish: Record<string, string> = {
        // Skin tones
        ผิวสองสี: 'tan skin, warm medium skin tone',
        ผิวขาว: 'fair skin, light skin tone',
        ผิวคล้ำ: 'dark skin, deep skin tone',
        ผิวสองแดง: 'reddish tan skin',

        // Face features
        ใบหน้าเกลี้ยงเกลา: 'clean-shaven face',
        สะอาดสะอ้าน: 'clean, neat appearance',
        รอยยิ้มอบอุ่น: 'warm smile',
        เป็นมิตร: 'friendly',
        เข้าถึงง่าย: 'approachable',

        // Eyes
        ดวงตาสีน้ำตาลเข้ม: 'dark brown eyes',
        ดวงตาสีดำ: 'black eyes',
        เป็นประกาย: 'bright, sparkling',
        สายตาสงบ: 'calm gaze',

        // Hair
        ผมสั้นรองทรง: 'short neat haircut',
        ผมสั้น: 'short hair',
        ผมยาว: 'long hair',
        จัดแต่งเรียบร้อย: 'well-groomed',
        ผมดำ: 'black hair',

        // Body
        รูปร่างสมส่วน: 'proportionate body',
        สง่างาม: 'elegant, graceful',
        สุขภาพดี: 'healthy',
        ผ่องใส: 'radiant',

        // Personality descriptors
        อ่อนโยน: 'gentle',
        ใจดี: 'kind-hearted',
        สุขุม: 'calm, composed',
        คุณธรรมสูง: 'virtuous, moral',

        // Gender
        ชาย: 'male',
        หญิง: 'female',
        ผู้ชาย: 'man',
        ผู้หญิง: 'woman',

        // Age
        ปี: 'years old',
      };

      // Replace Thai words with English equivalents
      translatedPrompt = prompt;
      for (const [thai, english] of Object.entries(thaiToEnglish)) {
        translatedPrompt = translatedPrompt.replace(new RegExp(thai, 'g'), english);
      }

      // 🇹🇭 CRITICAL: Add Thai ethnicity markers if not present
      if (
        !translatedPrompt.toLowerCase().includes('thai') &&
        !translatedPrompt.toLowerCase().includes('asian') &&
        !translatedPrompt.toLowerCase().includes('southeast asian')
      ) {
        // Inject Thai ethnicity into prompt
        translatedPrompt = `Thai person, Southeast Asian features, ${translatedPrompt}`;
      }

      // Remove remaining Thai characters (untranslated text)
      translatedPrompt = translatedPrompt.replace(/[\u0E00-\u0E7F]+/g, '');

      console.log('✅ Translated prompt:', translatedPrompt);
    }

    // Add seed to URL if provided for reproducibility and variation
    let pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(translatedPrompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;

    if (seed) {
      pollinationsUrl += `&seed=${seed}`;
    }

    console.log('🌐 Pollinations URL:', pollinationsUrl);

    // Fetch image
    const response = await fetch(pollinationsUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Convert to blob then base64
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Track usage
        const userId = auth.currentUser?.uid;
        if (userId) {
          const duration = (Date.now() - startTime) / 1000;
          recordGeneration({
            userId,
            type: 'image',
            modelId: 'pollinations-flux',
            modelName: 'Pollinations.ai (Flux)',
            provider: 'pollinations',
            costInCredits: 0,
            costInTHB: 0,
            success: true,
            duration,
            metadata: { prompt },
          }).catch(err => console.error('Failed to track generation:', err));
        }
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error with Stable Diffusion fallback:', error);
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
    imageType?: 'portrait' | 'full-body'; // 🆕 NEW: Distinguish portrait vs full body
    gender?: string; // 🔥 Iteration 13.9.2: Character gender from profile
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

// --- TIER 4: COMFYUI VIDEO GENERATION + ANIMATEDIFF + LORA ---
async function generateVideoWithComfyUI(
  prompt: string,
  options: {
    baseImage?: string; // Base64 image for img2vid
    lora?: string;
    loraStrength?: number;
    negativePrompt?: string;
    seed?: number;
    frameCount?: number;
    fps?: number;
    motionStrength?: number;
    useAnimateDiff?: boolean; // NEW: Enable AnimateDiff
    useSVD?: boolean; // NEW: Route as SVD when base image is available
    motionModule?: string; // NEW: AnimateDiff module
    // 🆕 WAN: Route via backend service video API
    useWan?: boolean;
    videoType?: 'wan';
    modelPath?: string;
    // 🆕 Resolution control
    width?: number;
    height?: number;
    cfg?: number;
    steps?: number;
    character?: Character; // NEW: For psychology-driven motion
    shotData?: ShotData; // NEW: For camera/timing intelligence
    currentScene?: GeneratedScene; // NEW: For environmental context
    characterImages?: string[]; // 🆕 Character reference images for Face ID
    onProgress?: (progress: number) => void;
  } = {}
): Promise<string> {
  // 🔌 ROUTING FIX: Use Backend Service if enabled
  if (USE_COMFYUI_BACKEND) {
    console.log('🔌 Routing video generation through ComfyUI Backend Service (Port 8000)');
    return await generateWithBackendComfyUI(prompt, options, options.baseImage || null);
  }

  const startTime = Date.now();
  try {
    // 🔥 LAYER 7: FORCE CLEANUP before video generation
    const cachedUrl = localStorage.getItem('comfyui_url');
    if (cachedUrl && cachedUrl.includes('trycloudflare.com')) {
      console.warn(
        '🗑️ LAYER 7 CLEANUP: Removing Cloudflare URL before video generation:',
        cachedUrl
      );
      localStorage.removeItem('comfyui_url');
    }

    // Determine if using AnimateDiff or SVD
    const useAnimateDiff = options.useAnimateDiff !== false; // Default to true

    // Calculate optimal parameters from psychology if available
    let finalFrameCount = options.frameCount;
    let finalFPS = options.fps;
    let finalMotionStrength = options.motionStrength;

    if (options.shotData && options.character) {
      // Use video motion engine for intelligent parameter calculation
      const recommendedFPS = getRecommendedFPS(options.shotData);
      const recommendedFrames = getRecommendedFrameCount(options.shotData, recommendedFPS);
      const recommendedStrength = getMotionModuleStrength(options.shotData, options.character);

      finalFPS = finalFPS || recommendedFPS;
      finalFrameCount = finalFrameCount || recommendedFrames;
      finalMotionStrength = finalMotionStrength || recommendedStrength;

      console.log(`📊 Motion Intelligence:
  - FPS: ${finalFPS} (${options.fps ? 'manual' : 'auto-calculated'})
  - Frames: ${finalFrameCount} (${options.frameCount ? 'manual' : 'auto-calculated'})
  - Strength: ${finalMotionStrength.toFixed(2)} (${options.motionStrength ? 'manual' : 'psychology-driven'})`);
    } else {
      finalFPS = finalFPS || 8;
      finalFrameCount = finalFrameCount || 16;
      finalMotionStrength = finalMotionStrength || 0.8;
    }

    // Build workflow using new workflow builders
    let workflow: Record<string, unknown>;

    if (useAnimateDiff) {
      // eslint-disable-next-line no-console
      console.log('🎬 Building AnimateDiff workflow');
      workflow = buildAnimateDiffWorkflow(prompt, {
        negativePrompt: options.negativePrompt,
        seed: options.seed,
        numFrames: finalFrameCount,
        fps: finalFPS,
        motionScale: finalMotionStrength,
        motionModel: options.motionModule,
        lora: options.lora,
        loraStrength: options.loraStrength,
        characterImages: options.characterImages, // 🆕 Pass character images for Face ID
      });
    } else if (options.baseImage) {
      // eslint-disable-next-line no-console
      console.log('🎬 Building SVD workflow (image-to-video)');

      // 🎨 PREPROCESSING: Optimize image for SVD
      // Import preprocessing function
      const { preprocessImageForSVDFast } = await import('./imagePreprocessing');
      console.log('🎨 Preprocessing image for SVD (reduce contrast, normalize colors)...');
      const preprocessedImage = await preprocessImageForSVDFast(options.baseImage);

      // 🎯 PHYSICS-AWARE PROMPTS: Add motion constraints
      const physicsPrompts = [
        'realistic motion physics',
        'natural weight and momentum',
        'smooth cinematic camera movement',
        'proper motion blur',
        'consistent perspective',
        'NO warping',
        'NO morphing',
        'NO sudden jumps',
      ];
      const enhancedPrompt = `${prompt}. ${physicsPrompts.join(', ')}`;

      workflow = buildSVDWorkflow(preprocessedImage, {
        seed: options.seed,
        numFrames: finalFrameCount,
        fps: finalFPS,
        // 🔧 MOTION TUNING: Reduce motion for smoother, more natural results
        // SVD motion_bucket_id: 1-255 (lower = subtle, higher = dramatic)
        // Psychology-driven: 0.3 energy → ~76, 0.8 energy → ~204
        motionScale: Math.round(Math.min(finalMotionStrength * 255, 150)), // Cap at 150 for realism
      });

      console.log(
        `🎬 SVD: Preprocessed image, enhanced prompt: "${enhancedPrompt.substring(0, 100)}..."`
      );
    } else {
      throw new Error('SVD requires a base image. Use AnimateDiff for text-to-video.');
    }

    // 🔌 BACKEND SERVICE INTEGRATION (Fix for CORS)
    if (USE_COMFYUI_BACKEND) {
      console.log('🔌 Routing video generation through ComfyUI Backend Service (Port 8000)');
      return await generateImageWithBackend(
        prompt,
        workflow as Record<string, unknown>,
        options.baseImage || null,
        10,
        options.onProgress
      );
    }

    // Queue prompt to ComfyUI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for queue

    try {
      const comfyuiUrl = getComfyUIApiUrl();
      const queueResponse = await fetch(`${comfyuiUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!queueResponse.ok) {
        throw new Error(`ComfyUI queue error: ${queueResponse.status}`);
      }

      const { prompt_id } = await queueResponse.json();

      // Poll for completion (max 120 seconds for video)
      const comfyuiUrlForHistory = getComfyUIApiUrl();
      for (let i = 0; i < 120; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update progress (simulated for now, or could fetch from /queue)
        if (options.onProgress) {
          // Video generation takes about 30-60s usually.
          const progress = Math.min((i / 60) * 100, 95);
          options.onProgress(progress);
        }

        const historyResponse = await fetch(`${comfyuiUrlForHistory}/history/${prompt_id}`);
        const history = await historyResponse.json();

        if (history[prompt_id]?.outputs) {
          // Check for video output from VHS_VideoCombine node
          const outputs = history[prompt_id].outputs;
          const videoNode = useAnimateDiff ? outputs['8'] : outputs['6'];

          if (videoNode?.gifs && videoNode.gifs.length > 0) {
            // Get video from ComfyUI
            const videoUrl = `${comfyuiUrlForHistory}/view?filename=${videoNode.gifs[0].filename}&type=output`;
            const videoResponse = await fetch(videoUrl);
            const blob = await videoResponse.blob();

            if (options.onProgress) options.onProgress(100);

            // Track usage
            const userId = auth.currentUser?.uid;
            if (userId) {
              const duration = (Date.now() - startTime) / 1000;
              recordGeneration({
                userId,
                type: 'video',
                modelId: useAnimateDiff ? 'comfyui-animatediff' : 'comfyui-svd',
                modelName: useAnimateDiff ? 'ComfyUI AnimateDiff' : 'ComfyUI SVD',
                provider: 'comfyui',
                costInCredits: 2,
                costInTHB: API_PRICING.COMFYUI?.video || 2.0,
                success: true,
                duration,
                metadata: { prompt },
              }).catch(err => console.error('Failed to track generation:', err));
            }

            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        }
      }

      throw new Error('ComfyUI timeout: Video generation took too long');
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const err = error as { name?: string };
      if (err.name === 'AbortError') {
        throw new Error(
          'ComfyUI connection timeout. Please check if ComfyUI server is running and accessible.'
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error with ComfyUI video generation:', error);
    throw error;
  }
}

// --- INTELLIGENT IMAGE GENERATION WITH PROVIDER SELECTION ---
// ฟังก์ชันนี้ไม่ได้ใช้งาน - ใช้ generateImageWithCascade โดยตรง
// async function generateImageWithProviderSelection(...) { ... }

// Individual provider functions for direct calls

/**
 * Generate image using FaceSwap (Impact Pack)
 * 99%+ face similarity using inswapper_128.onnx
 * ใช้สำหรับ "Generate Outfit (Face ID)" - ให้ full body ได้ดีกว่า InstantID
 */
async function generateImageWithFaceSwap(
  prompt: string,
  referenceImageBase64?: string
): Promise<string> {
  console.log('🎭 generateImageWithFaceSwap called');

  if (!referenceImageBase64) {
    throw new Error('❌ FaceSwap requires a reference image');
  }

  console.log('✅ Using FaceSwap workflow (best for full body + costume)');
  console.log('🔄 Building FaceSwap workflow with ReActor...');

  // Build FaceSwap workflow (supports full body better than InstantID)
  const { buildFaceSwapWorkflow } = await import('./comfyuiWorkflowBuilder');
  const workflow = buildFaceSwapWorkflow(prompt, 'reference.png', {
    negativePrompt:
      'ugly, deformed, noisy, blurry, low quality, bad anatomy, wrong proportions, portrait, headshot, close-up, upper body only',
    steps: 25,
    cfg: 7.0,
  });

  console.log('📦 FaceSwap workflow built:', Object.keys(workflow).length, 'nodes');

  // Use comfyuiBackendClient to submit workflow
  const { generateImageWithBackend } = await import('./comfyuiBackendClient');

  const imageUrl = await generateImageWithBackend(prompt, workflow, referenceImageBase64);

  console.log('✅ FaceSwap generation complete (full body):', imageUrl);
  return imageUrl;
}

async function generateImageWithGemini25(
  prompt: string,
  referenceImageBase64?: string
): Promise<string> {
  const startTime = Date.now();
  // Skip quota monitoring for now
  // recordRequest('gemini-2.5');

  type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: GeminiPart[] = [];

  // IMPORTANT: Add reference image FIRST for better Face ID matching
  if (referenceImageBase64) {
    // ✅ VALIDATION: Ensure this is actually a base64 image, not text
    const isValidBase64 = referenceImageBase64.startsWith('data:image/');
    
    if (!isValidBase64) {
      console.error('❌ Invalid reference image format - not a base64 image');
      console.error(`   Received: ${referenceImageBase64.substring(0, 100)}...`);
      throw new Error('Invalid character reference image: Expected base64 image but received text description. Please re-upload character image.');
    }
    
    console.log('📸 Gemini 2.5: Adding reference image for Face ID matching');
    const imageSizeKB = Math.round((referenceImageBase64.length * 0.75) / 1024);
    console.log(`📏 Reference image size: ${imageSizeKB} KB`);

    const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = referenceImageBase64.match(/^data:(image\/\w+);base64,/);
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
      },
    });

    console.log('✅ Reference image added to Gemini 2.5 request');
  }

  // Add text prompt AFTER image
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_25_IMAGE_MODEL,
      contents: { parts },
    });

    type ResponsePart = { inlineData?: { mimeType?: string; data?: string } };
    const imageData = response.candidates?.[0]?.content?.parts?.find((part: ResponsePart) =>
      part.inlineData?.mimeType?.startsWith('image/')
    );

    if (imageData?.inlineData?.data) {
      // Track successful generation
      const userId = auth.currentUser?.uid;
      if (userId) {
        const duration = (Date.now() - startTime) / 1000;
        recordGeneration({
          userId,
          type: 'image',
          modelId: 'gemini-2.5-flash',
          modelName: 'Gemini 2.5 Flash Image',
          provider: 'gemini',
          costInCredits: 0,
          costInTHB: API_PRICING.GEMINI['2.5-flash'].image,
          success: true,
          duration,
          metadata: { prompt },
        }).catch(err => console.error('Failed to track generation:', err));
      }

      return `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`;
    }
    throw new Error('No image data found in Gemini 2.5 response');
  } catch (error) {
    // Track failed generation
    const userId = auth.currentUser?.uid;
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;
      recordGeneration({
        userId,
        type: 'image',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash Image',
        provider: 'gemini',
        costInCredits: 0,
        costInTHB: 0,
        success: false,
        duration,
        metadata: { prompt },
      }).catch(err => console.error('Failed to track generation:', err));
    }
    throw error;
  }
}

async function generateImageWithGemini20(
  prompt: string,
  referenceImageBase64?: string
): Promise<string> {
  const startTime = Date.now();
  // Skip quota monitoring for now
  // recordRequest('gemini-2.0');

  type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: GeminiPart[] = [];

  // IMPORTANT: Add reference image FIRST for better Face ID matching
  if (referenceImageBase64) {
    console.log('📸 Gemini 2.0: Adding reference image for Face ID matching');
    const imageSizeKB = Math.round((referenceImageBase64.length * 0.75) / 1024);
    console.log(`📏 Reference image size: ${imageSizeKB} KB`);

    const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = referenceImageBase64.match(/^data:(image\/\w+);base64,/);
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
      },
    });

    console.log('✅ Reference image added to Gemini 2.0 request');
  }

  // Add text prompt AFTER image
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_20_IMAGE_MODEL,
      contents: { parts },
    });

    type ResponsePart = { inlineData?: { mimeType?: string; data?: string } };
    const imageData = response.candidates?.[0]?.content?.parts?.find((part: ResponsePart) =>
      part.inlineData?.mimeType?.startsWith('image/')
    );

    if (imageData?.inlineData?.data) {
      // Track successful generation
      const userId = auth.currentUser?.uid;
      if (userId) {
        const duration = (Date.now() - startTime) / 1000;
        recordGeneration({
          userId,
          type: 'image',
          modelId: 'gemini-2.0-flash',
          modelName: 'Gemini 2.0 Flash Image',
          provider: 'gemini',
          costInCredits: 0,
          costInTHB: 0, // Free
          success: true,
          duration,
          metadata: { prompt },
        }).catch(err => console.error('Failed to track generation:', err));
      }

      return `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`;
    }
    throw new Error('No image data found in Gemini 2.0 response');
  } catch (error) {
    // Track failed generation
    const userId = auth.currentUser?.uid;
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;
      recordGeneration({
        userId,
        type: 'image',
        modelId: 'gemini-2.0-flash',
        modelName: 'Gemini 2.0 Flash Image',
        provider: 'gemini',
        costInCredits: 0,
        costInTHB: 0,
        success: false,
        duration,
        metadata: { prompt },
      }).catch(err => console.error('Failed to track generation:', err));
    }
    throw error;
  }
}

// --- COMFYUI-FIRST CASCADE ---
// New Priority: ComfyUI MANDATORY for Face ID (best quality)
// Fallback: Gemini → Pollinations (only for non-Face ID)
export async function generateImageWithCascade(
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
    faceIdMode?: 'auto' | 'manual'; // 🆕 Face ID mode: auto (fallback) vs manual (single method)
    selectedFaceIdMethod?: 'instantid' | 'ipadapter' | 'gemini' | 'lora' | 'faceswap'; // 🆕 Manual method
    imageType?: 'portrait' | 'full-body'; // 🆕 NEW: Distinguish portrait vs full body
    gender?: string; // 🔥 Iteration 13.9.2: Character gender from profile
  } = {}
): Promise<string> {
  const errors: string[] = [];

  // 🖥️ Load user's device settings
  const renderSettings = loadRenderSettings();
  console.log('🖥️ Device Settings:', {
    device: renderSettings?.device || 'auto',
    mode: renderSettings?.executionMode || 'hybrid',
    lowVRAM: renderSettings?.useLowVRAM || false,
  });

  // Map model ID to provider logic
  const modelId = options.preferredModel || 'auto';
  console.log(`🎯 User selected model: ${modelId}`);

  // Force specific provider based on model selection
  // let forceProvider: 'comfyui' | 'gemini-pro' | 'gemini-flash' | 'pollinations' | 'dalle' | null =
  //   null;

  if (modelId === 'comfyui-sdxl' || modelId === 'comfyui-flux') {
    console.log('✅ Forcing ComfyUI backend');
  } else if (modelId === 'gemini-pro') {
    console.log('✅ Forcing Gemini 2.5 Pro');
  } else if (modelId === 'gemini-flash') {
    console.log('✅ Forcing Gemini 2.0 Flash');
  } else if (modelId === 'pollinations') {
    console.log('✅ Forcing Pollinations.ai');
    console.log('✅ Forcing Pollinations.ai');
  } else if (modelId === 'openai-dalle') {
    // Skip DALL-E for now (not implemented)
    // forceProvider = 'dalle';
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
    console.log('\n🎯 ═══ FACE ID MODE ACTIVATED ═══');
    console.log('📸 Reference image detected - enabling hybrid fallback system');

    // ────────────────────────────────────────────────────────────────────────
    // 🆕 MANUAL MODE: Force specific Face ID method (no fallback)
    // ────────────────────────────────────────────────────────────────────────
    if (options.faceIdMode === 'manual' && options.selectedFaceIdMethod) {
      console.log('\n🎯 ═══ MANUAL MODE ACTIVATED ═══');
      console.log(`📌 User selected method: ${options.selectedFaceIdMethod.toUpperCase()}`);
      console.log('⚠️  Fallback disabled - will fail if selected method fails');

      const method = options.selectedFaceIdMethod;

      // Execute ONLY the selected method
      if (method === 'instantid') {
        console.log('\n🚀 Executing: ✨ Best Quality (InstantID)');
        console.log('   ⚡ Speed: 5-10 minutes');
        console.log('   🎯 Face Similarity: 90-95%');

        const selectedLora = options.loraType
          ? LORA_MODELS[options.loraType]
          : LORA_MODELS.CHARACTER_CONSISTENCY;

        return await generateImageWithComfyUI(prompt, {
          lora: selectedLora,
          loraStrength: 0.8,
          negativePrompt: options.negativePrompt || (options.imageType === 'portrait' ? NEGATIVE_PROMPT_FACE : NEGATIVE_PROMPT_BODY),
          steps: 20,
          cfg: 7.0,
          referenceImage: options.referenceImage,
          outfitReference: options.outfitReference,
          seed: options.seed,
          onProgress: options.onProgress,
          useIPAdapter: false, // Force InstantID
          imageType: options.imageType, // Pass through imageType
          gender: options.gender, // 🔥 Pass gender from profile
        });
      }

      if (method === 'ipadapter') {
        console.log('\n🚀 Executing: ⚡ Fast Mode (IP-Adapter)');
        console.log('   ⚡ Speed: 3-5 minutes');
        console.log('   🎯 Face Similarity: 65-75%');

        const selectedLora = options.loraType
          ? LORA_MODELS[options.loraType]
          : LORA_MODELS.CHARACTER_CONSISTENCY;

        return await generateImageWithComfyUI(prompt, {
          lora: selectedLora,
          loraStrength: 0.8,
          negativePrompt: options.negativePrompt || (options.imageType === 'portrait' ? NEGATIVE_PROMPT_FACE : NEGATIVE_PROMPT_BODY),
          steps: 30,
          cfg: 8.0,
          referenceImage: options.referenceImage,
          outfitReference: options.outfitReference,
          seed: options.seed,
          onProgress: options.onProgress,
          useIPAdapter: true, // Force IP-Adapter
          imageType: options.imageType, // Pass through imageType
          gender: options.gender, // 🔥 Pass gender from profile
        });
      }

      if (method === 'gemini') {
        console.log('\n🚀 Executing: 🚀 Ultra Fast (Gemini 2.5)');
        console.log('   ⚡ Speed: ~30 seconds');
        console.log('   🎯 Face Similarity: 60-70%');

        return await generateImageWithGemini25(prompt, options.referenceImage);
      }

      if (method === 'lora') {
        throw new Error(
          '❌ LoRA Face ID not yet implemented\n\n' +
            'This feature requires:\n' +
            '1. Training a custom LoRA model with your face\n' +
            '2. Installing the trained model in ComfyUI\n\n' +
            'Please select another method or use Auto mode.'
        );
      }

      if (method === 'faceswap') {
        console.log('🔄 Using FaceSwap (Impact Pack)...');
        return await generateImageWithFaceSwap(prompt, options.referenceImage);
      }
    }

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
        } catch (error: unknown) {
          const err = error as { message?: string };
          console.error('❌ Gemini Pro failed:', err.message);
          throw new Error(`Gemini Pro generation failed: ${err.message}`);
        }
      } else if (modelId === 'gemini-flash') {
        try {
          console.log('🚀 Forcing Gemini 2.0 Flash for Face ID generation');
          return await generateImageWithGemini20(prompt, options.referenceImage);
        } catch (error: unknown) {
          const err = error as { message?: string };
          console.error('❌ Gemini Flash failed:', err.message);
          throw new Error(`Gemini Flash generation failed: ${err.message}`);
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

    // Check backend health to detect platform + capability
    let platformSupport = false;
    let isMacPlatform = false;
    let platformOs: string | undefined;
    let platformHasNvidiaGPU: boolean | undefined;
    let platformReason: string | undefined;
    let platformRecommendedFaceIdMethod: string | undefined;

    try {
      const backendStatus = await Promise.race([
        checkBackendStatus(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Backend health check timeout')), 3000)
        ),
      ]);

      const status = backendStatus as {
        platform?: {
          supportsFaceID?: boolean;
          os?: string;
          hasNvidiaGPU?: boolean;
          recommendedFaceIdMethod?: string;
          reason?: string;
          nodes?: {
            hasIPAdapterUnifiedLoader?: boolean;
            hasIPAdapter?: boolean;
            hasInstantID?: boolean;
            checked?: boolean;
            error?: string | null;
          };
        };
      };
      platformSupport = status.platform?.supportsFaceID ?? false;
      platformOs = status.platform?.os;
      platformHasNvidiaGPU = status.platform?.hasNvidiaGPU;
      platformRecommendedFaceIdMethod = status.platform?.recommendedFaceIdMethod;
      platformReason = status.platform?.reason;

      // IMPORTANT: OS determines "Mac chain" vs "Windows/Linux chain".
      // Do NOT infer Mac just because FaceID is unsupported (often means missing nodes).
      const osLower = String(platformOs || '').toLowerCase();
      isMacPlatform = osLower === 'darwin' || osLower.includes('mac');

      console.log(`\n🖥️  Platform Detection:`);
      console.log(`   OS: ${platformOs || 'unknown'}`);
      console.log(`   GPU: ${platformHasNvidiaGPU ? 'NVIDIA' : 'Integrated/MPS'}`);
      console.log(
        `   FaceID Support: ${platformSupport ? '✅ Yes' : '❌ No (missing nodes / unsupported)'}${platformReason ? ` - ${platformReason}` : ''}`
      );
    } catch (error) {
      // If backend status can't be fetched, keep previous behavior (safe fallback)
      console.log('⚠️  Backend offline - assuming Mac platform for safety');
      isMacPlatform = true;
      platformSupport = false;
    }

    // If FaceID is not supported by local ComfyUI (typically missing custom nodes),
    // skip ComfyUI FaceID attempts to avoid hard failures and wasted time.
    if (!platformSupport) {
      console.log(`\n⚠️  Local ComfyUI does not support Face ID right now.`);
      console.log(`   → Skipping ComfyUI FaceID workflows (InstantID/IP-Adapter).`);
      console.log(`   → Using Gemini 2.5 Face ID as fallback.`);

      try {
        const result = await generateImageWithGemini25(prompt, options.referenceImage);
        return result;
      } catch (error: unknown) {
        const err = error as { message?: string; status?: string };
        errors.push(`Gemini 2.5 failed: ${err.message}`);

        // Last resort: generate without Face ID
        if (USE_COMFYUI_BACKEND) {
          const backendStatus = await checkBackendStatus(true);
          if (backendStatus.running) {
            const comfyImage = await generateImageWithComfyUI(prompt, {
              lora: 'add-detail-xl.safetensors',
              loraStrength: 0.8,
              negativePrompt:
                options.negativePrompt ||
                'deformed face, multiple heads, bad anatomy, low quality, blurry',
              steps: 30,
              cfg: 8.0,
              seed: options.seed,
              onProgress: options.onProgress,
              imageType: options.imageType, // Pass through imageType
            });
            return comfyImage;
          }
        }

        throw new Error(
          `Face ID unavailable (ComfyUI missing nodes) and Gemini failed: ${err.message}`
        );
      }
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
      // Respect user's execution mode preference
      const shouldTryLocal =
        !renderSettings ||
        renderSettings.executionMode === 'local' ||
        renderSettings.executionMode === 'hybrid';
      // const shouldTryCloud =
      //   !renderSettings ||
      //   renderSettings.executionMode === 'cloud' ||
      //   renderSettings.executionMode === 'hybrid';

      if (USE_COMFYUI_BACKEND && shouldTryLocal) {
        try {
          console.log(`\n🔄 [1/3] Trying IP-Adapter Unified (No InsightFace)...`);
          console.log(`   ⚡ Speed: 3-5 minutes (ไม่มี face detection บน CPU)`);
          console.log(`   🎯 Similarity: 70-80%`);
          console.log(`   💰 Cost: FREE (unlimited)`);

          const backendStatus = await Promise.race([
            checkBackendStatus(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Backend timeout')), 3000)
            ),
          ]);

          if (!backendStatus.running) {
            throw new Error('Backend not running');
          }

          // Get mode settings (default: balanced for stability)
          const optionsWithMode = options as { generationMode?: GenerationMode };
          const mode: GenerationMode = optionsWithMode.generationMode || 'balanced';
          const modeSettings = MODE_PRESETS[mode];
          const modeLabels = {
            quality: '🏆 QUALITY MODE',
            balanced: '⚖️ BALANCED MODE',
            speed: '⚡ SPEED MODE',
          };

          console.log(
            `   🎨 Settings: Steps=${modeSettings.steps}, CFG=${modeSettings.cfg}, LoRA=${modeSettings.loraStrength}, Weight=${modeSettings.weight} (${modeLabels[mode]})`
          );
          console.log(`   🤖 Model Preference: ${options.preferredModel || 'auto'}`);
          console.log(`   📦 Using: IPAdapterUnifiedLoader + PLUS FACE preset + style transfer`);

          const selectedLora = options.loraType
            ? LORA_MODELS[options.loraType]
            : LORA_MODELS.CHARACTER_CONSISTENCY;

          const comfyImage = await generateImageWithComfyUI(prompt, {
            lora: selectedLora,
            loraStrength: modeSettings.loraStrength,
            negativePrompt:
              options.negativePrompt ||
              'deformed face, multiple heads, bad anatomy, low quality, blurry',
            steps: modeSettings.steps,
            cfg: modeSettings.cfg,
            referenceImage: options.referenceImage,
            outfitReference: options.outfitReference,
            seed: options.seed,
            onProgress: options.onProgress,
            useIPAdapter: true,
            generationMode: mode,
            preferredModel: options.preferredModel, // Pass model preference to ComfyUI
            imageType: options.imageType, // Pass through imageType
          });

          console.log(`✅ [1/3] SUCCESS: IP-Adapter Unified completed!`);
          return comfyImage;
        } catch (error: unknown) {
          const err = error as { message?: string };
          console.error(`❌ [1/3] FAILED: IP-Adapter - ${err.message}`);
          console.log(`⏭️  Falling back to Priority 2: Gemini 2.5...`);
          errors.push(`IP-Adapter failed: ${err.message}`);
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
      } catch (error: unknown) {
        const err = error as { message?: string; status?: string };
        const isQuotaError =
          err?.message?.includes('quota') ||
          err?.message?.includes('429') ||
          err?.status === 'RESOURCE_EXHAUSTED';

        if (isQuotaError) {
          console.error(`❌ [1/2] FAILED: Gemini 2.5 - Quota exceeded`);
        } else {
          console.error(`❌ [1/2] FAILED: Gemini 2.5 - ${err.message}`);
        }
        console.log(`⏭️  Falling back to Priority 2: SDXL Base...`);
        errors.push(`Gemini 2.5 failed: ${err.message}`);
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
            negativePrompt:
              options.negativePrompt ||
              'deformed face, multiple heads, bad anatomy, low quality, blurry',
            steps: 30,
            cfg: 8.0,
            seed: options.seed,
            onProgress: options.onProgress,
            imageType: options.imageType, // Pass through imageType
            // NO referenceImage - plain SDXL generation
          });

          console.log(`✅ [2/2] SUCCESS: SDXL Base completed (no Face ID)`);
          console.log(`⚠️  Note: Image generated from prompt only, no face matching`);
          return comfyImage;
        } catch (error: unknown) {
          const err = error as { message?: string };
          console.error(`❌ [2/2] FAILED: SDXL Base - ${err.message}`);
          errors.push(`SDXL Base failed: ${err.message}`);
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
      const recommended = String(platformRecommendedFaceIdMethod || '').toLowerCase();
      const canTryInstantId = recommended === 'instantid' || !recommended;

      if (recommended && recommended !== 'none') {
        console.log(`Recommended: ${platformRecommendedFaceIdMethod}`);
      }

      if (canTryInstantId) {
        console.log(`Priority 1: ✨ Best Quality (InstantID) - 5-10 min, 90-95%, FREE`);
        console.log(`Priority 2: ⚡ Fast Mode (IP-Adapter) - 3-5 min, 65-75%, FREE`);
        console.log(`Priority 3: 🚀 Ultra Fast (Gemini 2.5) - 30 sec, 60-70%, QUOTA`);
      } else {
        console.log(`Priority 1: ⚡ Fast Mode (IP-Adapter) - 3-5 min, 65-75%, FREE`);
        console.log(`Priority 2: 🚀 Ultra Fast (Gemini 2.5) - 30 sec, 60-70%, QUOTA`);
      }

      // ⚠️ FaceSwap (ReActor) skipped - extension not available
      // Using InstantID with full body optimization instead
      console.log(`\n⏭️  FaceSwap skipped - ReActor not installed`);
      console.log(`💡 Using InstantID with full body optimization instead`);

      // ─── PRIORITY 1: InstantID (Full Body Optimized) ──────────────────────────
      if (USE_COMFYUI_BACKEND && canTryInstantId) {
        try {
          console.log(`\n🔄 [1/3] 🎨 Full Body Mode (InstantID Optimized)...`);
          console.log(`   ⚡ Speed: 5-8 minutes`);
          console.log(`   🎯 Face Similarity: 90-95%`);
          console.log(`   💰 Cost: FREE (unlimited)`);
          console.log(`   🔧 Technology: InstantID + Full Body Optimization`);
          console.log(`   👕 Use Case: Generate Outfit (Face ID) - Full body with costume`);

          const backendStatus = await Promise.race([
            checkBackendStatus(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Backend timeout')), 3000)
            ),
          ]);

          if (!backendStatus.running) {
            throw new Error('Backend not running');
          }

          console.log(
            `   🎨 Settings: Steps=25, CFG=5.5, ip_weight=0.8, cn_strength=0.65, full body optimized`
          );

          const selectedLora = options.loraType
            ? LORA_MODELS[options.loraType]
            : LORA_MODELS.CHARACTER_CONSISTENCY;

          const comfyImage = await generateImageWithComfyUI(prompt, {
            lora: selectedLora,
            loraStrength: 0.8,
            negativePrompt:
              options.negativePrompt ||
              'deformed face, multiple heads, bad anatomy, low quality, blurry, portrait, headshot, close-up, upper body only',
            steps: 25,
            cfg: 5.5,
            referenceImage: options.referenceImage,
            outfitReference: options.outfitReference,
            seed: options.seed,
            onProgress: options.onProgress,
            useIPAdapter: false, // Use InstantID
            imageType: options.imageType, // Pass through imageType
          });

          console.log(`✅ [1/3] SUCCESS: 🎨 Full Body Mode completed!`);
          return comfyImage;
        } catch (error: unknown) {
          const err = error as { message?: string };
          console.error(`❌ [1/3] FAILED: 🎨 Full Body Mode - ${err.message}`);
          console.log(`⏭️  Falling back to Priority 2: ⚡ Fast Mode (IP-Adapter)...`);
          errors.push(`Full Body (InstantID) failed: ${err.message}`);
        }
      } else {
        if (!USE_COMFYUI_BACKEND) {
          console.log(`⏭️  [1/3] SKIPPED: ComfyUI Backend disabled`);
          errors.push('ComfyUI Backend not enabled');
        } else {
          console.log(`⏭️  [1/3] SKIPPED: InstantID not recommended/available on this worker`);
        }
      }

      // ─── PRIORITY 2: IP-Adapter ─────────────────────────────────────────────
      if (USE_COMFYUI_BACKEND) {
        try {
          console.log(`\n🔄 [2/3] ⚡ Fast Mode (IP-Adapter)...`);
          console.log(`   ⚡ Speed: 3-5 minutes`);
          console.log(`   🎯 Face Similarity: 65-75%`);
          console.log(`   💰 Cost: FREE (unlimited)`);
          console.log(`   🔧 Technology: IP-Adapter Unified + CLIP Vision`);

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
            negativePrompt:
              options.negativePrompt ||
              'deformed face, multiple heads, bad anatomy, low quality, blurry',
            steps: 30,
            cfg: 8.0,
            referenceImage: options.referenceImage,
            outfitReference: options.outfitReference,
            seed: options.seed,
            onProgress: options.onProgress,
            useIPAdapter: true,
            imageType: options.imageType, // Pass through imageType
          });

          console.log(`✅ [2/3] SUCCESS: ⚡ Fast Mode completed!`);
          return comfyImage;
        } catch (error: unknown) {
          const err = error as { message?: string };
          console.error(`❌ [2/3] FAILED: ⚡ Fast Mode - ${err.message}`);
          console.log(`⏭️  Falling back to Priority 3: 🚀 Ultra Fast...`);
          errors.push(`Fast Mode (IP-Adapter) failed: ${err.message}`);
        }
      }

      // ─── PRIORITY 3: Gemini 2.5 ─────────────────────────────────────────────
      try {
        console.log(`\n🔄 [3/3] 🚀 Ultra Fast Mode (Gemini 2.5)...`);
        console.log(`   ⚡ Speed: ~30 seconds`);
        console.log(`   🎯 Face Similarity: 60-70%`);
        console.log(`   ⚠️  Cost: HAS QUOTA LIMITS`);
        console.log(`   🔧 Technology: Gemini 2.5 Flash Imagen`);

        const result = await generateImageWithGemini25(prompt, options.referenceImage);
        console.log(`✅ [3/3] SUCCESS: 🚀 Ultra Fast Mode completed!`);
        return result;
      } catch (error: unknown) {
        const err = error as { message?: string; status?: string };
        const isQuotaError =
          err?.message?.includes('quota') ||
          err?.message?.includes('429') ||
          err?.status === 'RESOURCE_EXHAUSTED';

        if (isQuotaError) {
          console.error(`❌ [3/3] FAILED: 🚀 Ultra Fast Mode - Quota exceeded`);
          errors.push('Ultra Fast (Gemini 2.5) quota exceeded');
        } else {
          console.error(`❌ [3/3] FAILED: 🚀 Ultra Fast Mode - ${err.message}`);
          errors.push(`Ultra Fast (Gemini 2.5) failed: ${err.message}`);
        }
      }

      // All Windows/Linux fallbacks failed
      throw new Error(
        `❌ All Face ID methods failed on Windows/Linux\n\n` +
          `Tried:\n` +
          `1. InstantID Full Body (5-8 min, 90-95%) - ${errors[0] || 'failed'}\n` +
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
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('❌ Gemini Pro failed:', err.message);
        throw new Error(`Gemini Pro generation failed: ${err.message}`);
      }
    } else if (modelId === 'gemini-flash') {
      try {
        console.log('🚀 Forcing Gemini 2.0 Flash for image generation');
        return await generateImageWithGemini20(prompt);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('❌ Gemini Flash failed:', err.message);
        throw new Error(`Gemini Flash generation failed: ${err.message}`);
      }
    } else if (modelId === 'pollinations') {
      try {
        console.log('🚀 Forcing Pollinations for image generation');
        return await generateImageWithStableDiffusion(prompt);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('❌ Pollinations failed:', err.message);
        throw new Error(`Pollinations generation failed: ${err.message}`);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 GEMINI-FIRST CASCADE (Cost-Optimized)
  // ═══════════════════════════════════════════════════════════════════════════
  // Priority Order (NEW):
  // 1️⃣ Gemini Pro (Fast, High Quality, Free tier: 50/day)
  // 2️⃣ Gemini Flash (Very Fast, Good Quality, Free tier: 1500/day)
  // 3️⃣ ComfyUI (Custom LoRA, Face ID, Unlimited but costs GPU time)
  // 4️⃣ Pollinations (Free backup, Basic quality)
  
  // TIER 1: Try Gemini 2.5 Pro (High Quality, Fast)
  try {
    console.log('🎨 Tier 1: Trying Gemini 2.5 Pro (Imagen 3)...');
    console.log('   ⚡ Speed: 3-5 seconds');
    console.log('   🎯 Quality: Excellent (Imagen 3)');
    console.log('   💰 Cost: Free (50/day) or ฿0.05/image');

    // Debug: Check if reference image is being passed
    if (options.referenceImage) {
      console.log('📸 Face ID Mode: Reference image will be sent to Gemini Pro');
      console.log(
        '📏 Reference image size:',
        Math.round(options.referenceImage.length / 1024),
        'KB'
      );
    } else {
      console.log('⚠️ No reference image - generating without Face ID');
    }

    const result = await generateImageWithGemini25(prompt, options.referenceImage);
    console.log('✅ Tier 1 Success: Gemini 2.5 Pro');
    return result;
  } catch (error: unknown) {
    const err = error as { message?: string; status?: string };
    const isQuotaError =
      err?.message?.includes('quota') ||
      err?.message?.includes('429') ||
      err?.status === 'RESOURCE_EXHAUSTED';
    if (isQuotaError) {
      const resetIn = 60;
      console.log(`⚠️ Tier 1: Gemini Pro quota exceeded. Resets in ${resetIn}s.`);
      errors.push(`Gemini Pro quota exceeded (reset in ${resetIn}s)`);
    } else {
      console.error('❌ Tier 1 failed:', error);
      errors.push(`Gemini Pro error: ${err.message}`);
    }
    console.log('⏭️  Falling back to Tier 2: Gemini Flash...');
  }

  // TIER 2: Try Gemini 2.0 Flash (Very Fast, Free tier)
  try {
    console.log('🎨 Tier 2: Trying Gemini 2.5 Flash Image...');

    // Debug: Check if reference image is being passed
    if (options.referenceImage) {
      console.log('📸 Face ID Mode: Reference image will be sent to Gemini 2.5');
      console.log(
        '📏 Reference image size:',
        Math.round(options.referenceImage.length / 1024),
        'KB'
      );
    } else {
      console.log('⚠️ No reference image - generating without Face ID');
    }

    const result = await generateImageWithGemini25(prompt, options.referenceImage);
    console.log('✅ Tier 2 Success: Gemini 2.5 Flash Image');
    return result;
  } catch (error: unknown) {
    const err = error as { message?: string; status?: string };
    const isQuotaError =
      err?.message?.includes('quota') ||
      err?.message?.includes('429') ||
      err?.status === 'RESOURCE_EXHAUSTED';
    if (isQuotaError) {
      const resetIn = 60; // getTimeUntilReset('gemini-2.5');
      console.log(`⚠️ Tier 2: Gemini 2.5 quota exceeded. Resets in ${resetIn}s.`);
      errors.push(`Gemini 2.5 quota exceeded (reset in ${resetIn}s)`);
    } else {
      console.error('❌ Tier 2 failed:', error);
      errors.push(`Gemini 2.5 error: ${err.message}`);
    }
  }

  // TIER 2: Try Gemini 2.0 Flash (Very Fast, Free tier)
  try {
    console.log('🎨 Tier 2: Trying Gemini 2.0 Flash...');
    console.log('   ⚡ Speed: 2-3 seconds');
    console.log('   🎯 Quality: Good');
    console.log('   💰 Cost: Free (1500/day) or ฿0.02/image');

    // Debug: Check if reference image is being passed
    if (options.referenceImage) {
      console.log('📸 Face ID Mode: Reference image will be sent to Gemini Flash');
    }

    const result = await generateImageWithGemini20(prompt, options.referenceImage);
    console.log('✅ Tier 2 Success: Gemini 2.0 Flash');
    return result;
  } catch (error: unknown) {
    const err = error as { message?: string; status?: string };
    const isQuotaError =
      err?.message?.includes('quota') ||
      err?.message?.includes('429') ||
      err?.status === 'RESOURCE_EXHAUSTED';
    if (isQuotaError) {
      const resetIn = 60;
      console.error(`❌ Tier 2 failed: Quota exceeded (reset in ${resetIn}s)`);
      errors.push(`Gemini Flash quota exceeded (reset in ${resetIn}s)`);
    } else {
      console.error('❌ Tier 2 failed:', error);
      errors.push(`Gemini Flash error: ${err.message}`);
    }
    console.log('⏭️  Falling back to Tier 3: ComfyUI...');
  }

  // TIER 3: Try ComfyUI Backend (Custom LoRA, Face ID)
  if (USE_COMFYUI_BACKEND) {
    try {
      console.log('🎨 Tier 3: Trying ComfyUI Backend + LoRA...');
      console.log('   ⚡ Speed: 30-120 seconds (depends on GPU)');
      console.log('   🎯 Quality: Excellent (SDXL/FLUX)');
      console.log('   💰 Cost: GPU time (unlimited generations)');
      console.log('🌐 Backend URL:', import.meta.env.VITE_COMFYUI_SERVICE_URL);

      // Quick backend health check with timeout
      const backendStatus = await Promise.race([
        checkBackendStatus(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Backend health check timeout')), 3000)
        ),
      ]);

      if (!backendStatus.running) {
        throw new Error(`Backend not running: ${backendStatus.error || 'Unknown error'}`);
      }

      console.log('✅ Backend is healthy, proceeding with generation...');

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
        console.log(
          `🎯 Settings: Steps=${steps}, CFG=${cfg}, LoRA=${selectedLora} (enhanced detail)`
        );
      }

      const comfyImage = await generateImageWithComfyUI(prompt, {
        useFlux: workflowSelection.useFlux,
        lora: selectedLora,
        loraStrength: loraStrength,
        negativePrompt: options.negativePrompt || (options.imageType === 'portrait' ? NEGATIVE_PROMPT_FACE : NEGATIVE_PROMPT_BODY),
        steps: steps,
        cfg: cfg,
        ckpt_name: ckpt_name, // Pass checkpoint name
        referenceImage: options.referenceImage,
        outfitReference: options.outfitReference,
        seed: options.seed,
        onProgress: options.onProgress,
      });

      console.log('✅ Tier 3 Success: ComfyUI Backend + LoRA');
      return comfyImage;
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('❌ Tier 3 (ComfyUI Backend) failed:', error);
      errors.push(`ComfyUI Backend error: ${err.message}`);
      console.log('⚠️ ComfyUI Backend unavailable, falling back to Pollinations...');
    }
  } else {
    console.log('⚠️ ComfyUI Backend disabled (USE_COMFYUI_BACKEND=false), skipping Tier 3...');
    errors.push('ComfyUI Backend not enabled');
  }

  // TIER 4: Try Pollinations.ai (Last Resort - No Face ID support)
  try {
    console.log('🎨 Tier 4: Trying Pollinations.ai (Last Resort)...');

    // ⚠️ CRITICAL: If Face ID is required, throw error instead of using Pollinations
    // because Pollinations.ai doesn't support multi-image input
    if (options.referenceImage) {
      console.warn('⚠️ Face ID requested but Gemini APIs are unavailable.');
      console.warn("💡 Pollinations.ai doesn't support Face ID matching.");

      // Throw error to skip Pollinations and try ComfyUI instead
      throw new Error(
        'Face ID matching requires Gemini API or ComfyUI.\n\n' +
          'Current status:\n' +
          '• Gemini 2.5 & 2.0: Quota exceeded\n' +
          "• Pollinations.ai: Doesn't support Face ID\n\n" +
          'Solutions:\n' +
          '1. Wait 1 minute for Gemini quota to reset\n' +
          '2. Enable ComfyUI in AI Settings\n' +
          '3. Generate without Face ID (regular portrait)'
      );
    }

    const sdImage = await generateImageWithStableDiffusion(prompt, options.seed);
    console.log('✅ Tier 4 Success: Pollinations.ai');
    return sdImage;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('❌ Tier 4 failed:', error);
    errors.push(`Pollinations.ai error: ${err.message}`);
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
export function extractJsonFromResponse(text: string): string {
  let clean = text.trim();

  // Remove Markdown code blocks first
  clean = clean
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```$/, '')
    .replace(/```\s*$/, '');

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
      model: 'gemini-2.5-flash',
      contents: `Analyze this text sample. Return JSON: { "language": "Thai" } or { "language": "English" }. Text: "${sample}"`,
      config: { responseMimeType: 'application/json' },
    });
    const json = JSON.parse(extractJsonFromResponse(response.text || '{}'));
    return json.language === 'Thai' ? 'Thai' : 'English';
  } catch (e) {
    return 'English'; // Default
  }
}

// --- UNIFIED IMPORT FUNCTION (High Context) ---
export async function parseDocumentToScript(rawText: string): Promise<Partial<ScriptData>> {
  const startTime = Date.now();
  // Gemini 2.5 Flash has a massive context window. We can process huge scripts in one pass.
  // Truncate to a safe limit (approx 800k chars is plenty safe for 1M tokens)
  const contextText = rawText.slice(0, 800000);

  try {
    console.log('Analyzing document language...');
    const detectedLang = await detectDocumentLanguage(contextText);

    const langInstruction =
      detectedLang === 'Thai'
        ? 'Output MUST be in Thai language (matching the document). Keep keys in English, but values in Thai.'
        : 'Output MUST be in English.';

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
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    // Track Usage
    const userId = auth.currentUser?.uid;
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Granular Tracking: Use Token Counting
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(response.text || '', 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Script Analysis)',
        provider: 'gemini',
        costInCredits: 0, // Free feature for now? Or maybe charge credits?
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Script Analysis',
          tokens: { input: inputTokens, output: outputTokens },
        },
      }).catch(err => console.error('Failed to track generation:', err));
    }

    const jsonStr = extractJsonFromResponse(response.text || '{}');
    const parsedData = JSON.parse(jsonStr);

    return {
      ...parsedData,
      language: detectedLang,
    };
  } catch (error) {
    console.error('Unified Parse Error:', error);
    // Fallback: If AI fails to produce valid JSON, return the raw text in Big Idea so user doesn't lose data.
    return {
      title: 'Imported Project (Raw)',
      bigIdea: rawText.slice(0, 5000), // Show first 5000 chars
      logLine:
        'Import failed to structure the data automatically. Please fill in details manually based on your document.',
    };
  }
}

export async function generateCharacterDetails(
  name: string,
  role: string,
  description: string,
  language: string
): Promise<Partial<Character>> {
  const startTime = Date.now();
  // ✅ Quota validation
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'character',
      details: { scriptType: 'character' },
    });

    if (!quotaCheck.allowed) {
      throw new Error(
        `❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`
      );
    }
  }

  try {
    const langInstruction =
      language === 'Thai'
        ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY. All character details (External, Physical, Fashion, Internal, Goals) MUST be in Thai. Do not use English for content values, only for JSON keys.'
        : 'Ensure all value fields are written in English.';

    const prompt = `You are a scriptwriter's assistant. Create a detailed character profile for a character named "${name}" who is a "${role}". The character is described as: "${description}".
      
      ${langInstruction}
      IMPORTANT INSTRUCTIONS:
      1. ${langInstruction}
      2. Keep the JSON keys exactly as shown in the example (in English).
      3. MUST Include the "goals" object.
      4. MUST Include the "fashion" object.
      5. Return the response as a single JSON object.

      Example:
      {
        "external": {
          "First Name": "...", "Last Name": "...", "Nickname": "...", "Alias": "...", "Date of Birth Age": "...", "Address": "...", "Relationship": "...", "Ethnicity": "...", "Nationality": "...", "Religion": "...", "Blood Type": "...", "Health": "...", "Education": "...", "Financial Status": "...", "Occupation": "..."
        },
        "physical": {
          "Physical Characteristics": "...", "Voice characteristics": "...", "Eye characteristics": "...", "Facial characteristics": "...", "Gender": "...", "Height, Weight": "...", "Skin color": "...", "Hair style": "..."
        },
        "fashion": {
          "Style Concept": "...", "Main Outfit": "...", "Shoe": "...", "Accessories": "...", "Color Palette": "...", "Condition/Texture": "..."
        },
        "internal": {
          "consciousness": { "Mindfulness (remembrance)": 80, "Wisdom (right view)": 75, "Faith (Belief in the right)": 85, "Hiri (Shame of sin)": 80, "Karuna (Compassion, knowing suffering)": 90, "Mudita (Joy in happiness)": 70 },
          "subconscious": { "Attachment": "...", "Taanha": "..." },
          "defilement": { "Lobha (Greed)": 30, "Anger (Anger)": 40, "Moha (delusion)": 50, "Mana (arrogance)": 50, "Titthi (obsession)": 55, "Vicikiccha (doubt)": 30, "Thina (depression)": 25, "Uthachcha (distraction)": 30, "Ahirika (shamelessness)": 15, "Amodtappa (fearlessness of sin)": 15 }
        },
        "goals": {
          "objective": "...", "need": "...", "action": "...", "conflict": "...", "backstory": "..."
        }
      }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const result = JSON.parse(text);

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Character Details)',
        provider: 'gemini',
        costInCredits: 2,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Character Details Generation',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });

      await recordUsage(userId, {
        type: 'character',
        credits: 2, // 2 credits per character
      });
    }

    return result;
  } catch (error) {
    console.error('Error generating character details:', error);
    throw new Error('Failed to generate character details from AI.');
  }
}

/**
 * Generate all characters from story data (Step 1-2)
 * Analyzes the story and creates appropriate characters with full profiles
 */
export async function generateAllCharactersFromStory(scriptData: ScriptData): Promise<Character[]> {
  const startTime = Date.now();
  // ✅ Quota validation
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'character',
      details: { scriptType: 'character' },
    });

    if (!quotaCheck.allowed) {
      throw new Error(
        `❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `Upgrade to ${quotaCheck.upgradeRequired} plan to continue` : 'Please check your plan'}`
      );
    }
  }

  try {
    const langInstruction =
      scriptData.language === 'Thai'
        ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY. All character names (unless foreign), descriptions, roles, and details MUST be in Thai. Do not use English for content values, only for JSON keys.'
        : 'Ensure all value fields are written in English.';

    const prompt = `You are an expert Hollywood scriptwriter and casting director. Based on the following story elements, create a complete cast of characters that are essential for this story.

**Story Elements:**
- Genre: ${scriptData.mainGenre}
- Type: ${scriptData.projectType}
- Title: ${scriptData.title || 'Untitled'}
- Big Idea: ${scriptData.bigIdea || 'Not provided'}
- Premise: ${scriptData.premise || 'Not provided'}
- Theme: ${scriptData.theme || 'Not provided'}
- Log Line: ${scriptData.logLine || 'Not provided'}

**Your Task:**
Analyze this story and create ALL necessary characters with these guidelines:

1. **Character Count**: 
   - Feature Film: 3-8 main characters (protagonist, antagonist, supporting characters)
   - Short Film: 2-4 characters
   - Series: 4-10 recurring characters per season

2. **Character Roles**: Include appropriate mix of:
   - Protagonist (hero/main character)
   - Antagonist (villain/opposing force) 
   - Love Interest (if relevant to genre)
   - Mentor/Guide
   - Supporting Characters (friends, family, allies)
   - Minor Characters (if needed for plot)

3. **Genre-Appropriate Characters**:
   - Action: Include hero, villain, team members
   - Romance: Include romantic leads, rivals, friends
   - Horror: Include victims, survivors, threat
   - Comedy: Include comic relief, straight man
   - Drama: Include complex emotional characters

**IMPORTANT INSTRUCTIONS:**
1. ${langInstruction}
2. Keep JSON keys in English (as shown in example)
3. Create realistic, diverse, well-developed characters
4. Each character should have clear goals and conflicts
5. Characters should complement each other and the story
6. Include full profiles with external, physical, fashion, internal (psychology), and goals

**Response Format:**
Return ONLY a valid JSON array of characters:

[
  {
    "name": "Character Full Name",
    "role": "Protagonist|Antagonist|Supporting|etc",
    "description": "Brief character description",
    "external": {
      "First Name": "...", "Last Name": "...", "Nickname": "...", "Alias": "...", 
      "Date of Birth Age": "...", "Address": "...", 
      "Relationship": "...", "Ethnicity": "...", 
      "Nationality": "...", "Religion": "...", 
      "Blood Type": "...", "Health": "...", 
      "Education": "...", "Financial Status": "...", 
      "Occupation": "..."
    },
    "physical": {
      "Physical Characteristics": "...", 
      "Voice characteristics": "...", 
      "Eye characteristics": "...", 
      "Facial characteristics": "...", 
      "Gender": "...", 
      "Height, Weight": "...", 
      "Skin color": "...", 
      "Hair style": "..."
    },
    "fashion": {
      "Style Concept": "...", 
      "Main Outfit": "...", 
      "Shoe": "...",
      "Accessories": "...", 
      "Color Palette": "...", 
      "Condition/Texture": "..."
    },
    "internal": {
      "consciousness": {
        "Mindfulness (remembrance)": 80, 
        "Wisdom (right view)": 75, 
        "Faith (Belief in the right)": 85, 
        "Hiri (Shame of sin)": 80, 
        "Karuna (Compassion, knowing suffering)": 90, 
        "Mudita (Joy in happiness)": 70
      },
      "subconscious": {
        "Attachment": "...", 
        "Taanha": "..."
      },
      "defilement": {
        "Lobha (Greed)": 30, 
        "Anger (Anger)": 40, 
        "Moha (delusion)": 50, 
        "Mana (arrogance)": 50, 
        "Titthi (obsession)": 55, 
        "Vicikiccha (doubt)": 30, 
        "Thina (depression)": 25, 
        "Uthachcha (distraction)": 30, 
        "Ahirika (shamelessness)": 15, 
        "Amodtappa (fearlessness of sin)": 15
      }
    },
    "goals": {
      "objective": "What they want to achieve",
      "need": "What they actually need (internal)",
      "action": "What they're actively doing",
      "conflict": "What stands in their way",
      "backstory": "Their relevant history"
    }
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const charactersArray = JSON.parse(text) as Array<Partial<Character>>;

    // Transform to full Character objects with IDs
    const characters: Character[] = charactersArray.map((char, index: number) => ({
      ...EMPTY_CHARACTER,
      id: `char-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      name: char.name || `Character ${index + 1}`,
      role: char.role || 'Supporting',
      description: char.description || '',
      external: { ...EMPTY_CHARACTER.external, ...(char.external || {}) },
      physical: { ...EMPTY_CHARACTER.physical, ...(char.physical || {}) },
      fashion: { ...EMPTY_CHARACTER.fashion, ...(char.fashion || {}) },
      internal: {
        consciousness: {
          ...EMPTY_CHARACTER.internal.consciousness,
          ...(char.internal?.consciousness || {}),
        },
        subconscious: {
          ...EMPTY_CHARACTER.internal.subconscious,
          ...(char.internal?.subconscious || {}),
        },
        defilement: {
          ...EMPTY_CHARACTER.internal.defilement,
          ...(char.internal?.defilement || {}),
        },
      },
      goals: { ...EMPTY_CHARACTER.goals, ...(char.goals || {}) },
    }));

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Generate All Characters)',
        provider: 'gemini',
        costInCredits: characters.length * 2,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Generate All Characters',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });

      await recordUsage(userId, {
        type: 'character',
        credits: characters.length * 2, // 2 credits per character
      });
    }

    console.log(`✅ Generated ${characters.length} characters from story`);
    return characters;
  } catch (error) {
    console.error('Error generating characters from story:', error);
    throw new Error('Failed to generate characters from story: ' + (error as Error).message);
  }
}

/**
 * Generate compatible characters that complement existing cast
 * Analyzes existing characters + Step 1-3 data to create new characters that fit the story
 */
export async function generateCompatibleCharacters(
  scriptData: ScriptData,
  existingCharacters: Character[]
): Promise<Character[]> {
  const startTime = Date.now();
  // ✅ Quota validation
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'character',
      details: { scriptType: 'character' },
    });

    if (!quotaCheck.allowed) {
      throw new Error(
        `❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `Upgrade to ${quotaCheck.upgradeRequired} plan to continue` : 'Please check your plan'}`
      );
    }
  }

  try {
    const langInstruction =
      scriptData.language === 'Thai'
        ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY. All character names (unless foreign), descriptions, roles, and details MUST be in Thai. Do not use English for content values, only for JSON keys.'
        : 'Ensure all value fields are written in English.';

    // Build existing characters summary
    const existingCharsSummary = existingCharacters
      .map(
        (char, idx) =>
          `${idx + 1}. ${char.name} (${char.role}): ${char.description || 'No description'}`
      )
      .join('\n');

    const prompt = `You are an expert Hollywood scriptwriter and casting director. You are working on a story that already has an existing cast of characters. Your task is to analyze the story, the existing characters, and create NEW compatible characters that will enhance the narrative.

**Story Elements:**
- Genre: ${scriptData.mainGenre}
- Secondary Genres: ${scriptData.secondaryGenres?.join(', ') || 'None'}
- Type: ${scriptData.projectType}
- Title: ${scriptData.title || 'Untitled'}
- Big Idea: ${scriptData.bigIdea || 'Not provided'}
- Premise: ${scriptData.premise || 'Not provided'}
- Theme: ${scriptData.theme || 'Not provided'}
- Log Line: ${scriptData.logLine || 'Not provided'}

**Existing Characters (${existingCharacters.length} total):**
${existingCharsSummary}

**Your Task:**
Analyze the existing cast and story, then create 2-4 NEW characters that:

1. **Complement the existing cast**: Fill gaps in roles (e.g., if no antagonist exists, create one; if no mentor, add one)
2. **Support the story**: Create characters that enhance the narrative conflicts, themes, and plot
3. **Add diversity**: Introduce different perspectives, backgrounds, or motivations
4. **Maintain balance**: Don't duplicate existing roles; create unique, valuable additions

**Character Types to Consider:**
- Missing protagonist/antagonist counterparts
- Supporting characters that create conflict or alliance
- Characters that represent thematic elements
- Romantic interests, mentors, rivals, or foils
- Characters needed for specific plot developments

**IMPORTANT INSTRUCTIONS:**
1. ${langInstruction}
2. Keep JSON keys in English (as shown in example)
3. Create realistic, well-developed characters that FIT WITH the existing cast
4. Each new character should have clear purpose and relationship potential with existing characters
5. Consider how new characters interact with or challenge existing ones
6. Include full profiles with external, physical, fashion, internal (psychology), and goals

**Response Format:**
Return ONLY a valid JSON array of 2-4 new characters:

[
  {
    "name": "Character Full Name",
    "role": "Antagonist|Supporting|Love Interest|Mentor|etc",
    "description": "Brief description including how they relate to the existing story/characters",
    "external": {
      "First Name": "...", "Last Name": "...", "Nickname": "...", "Alias": "...", 
      "Date of Birth Age": "...", "Address": "...", 
      "Relationship": "...", "Ethnicity": "...", 
      "Nationality": "...", "Religion": "...", 
      "Blood Type": "...", "Health": "...", 
      "Education": "...", "Financial Status": "...", 
      "Occupation": "..."
    },
    "physical": {
      "Physical Characteristics": "...", 
      "Voice characteristics": "...", 
      "Eye characteristics": "...", 
      "Facial characteristics": "...", 
      "Gender": "...", 
      "Height, Weight": "...", 
      "Skin color": "...", 
      "Hair style": "..."
    },
    "fashion": {
      "Style Concept": "...", 
      "Main Outfit": "...", 
      "Shoe": "...",
      "Accessories": "...", 
      "Color Palette": "...", 
      "Condition/Texture": "..."
    },
    "internal": {
      "consciousness": {
        "Mindfulness (remembrance)": 80, 
        "Wisdom (right view)": 75, 
        "Faith (Belief in the right)": 85, 
        "Hiri (Shame of sin)": 80, 
        "Karuna (Compassion, knowing suffering)": 90, 
        "Mudita (Joy in happiness)": 70
      },
      "subconscious": {
        "Attachment": "...", 
        "Taanha": "..."
      },
      "defilement": {
        "Lobha (Greed)": 30, 
        "Anger (Anger)": 40, 
        "Moha (delusion)": 50, 
        "Mana (arrogance)": 50, 
        "Titthi (obsession)": 55, 
        "Vicikiccha (doubt)": 30, 
        "Thina (depression)": 25, 
        "Uthachcha (distraction)": 30, 
        "Ahirika (shamelessness)": 15, 
        "Amodtappa (fearlessness of sin)": 15
      }
    },
    "goals": {
      "objective": "What they want to achieve",
      "need": "What they actually need (internal)",
      "action": "What they're actively doing",
      "conflict": "What stands in their way / how they conflict with existing characters",
      "backstory": "Their relevant history and connection to the story/existing characters"
    }
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const charactersArray = JSON.parse(text) as Array<Partial<Character>>;

    // Transform to full Character objects with IDs
    const characters: Character[] = charactersArray.map((char, index: number) => ({
      ...EMPTY_CHARACTER,
      id: `char-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      name: char.name || `New Character ${index + 1}`,
      role: char.role || 'Supporting',
      description: char.description || '',
      external: { ...EMPTY_CHARACTER.external, ...(char.external || {}) },
      physical: { ...EMPTY_CHARACTER.physical, ...(char.physical || {}) },
      fashion: { ...EMPTY_CHARACTER.fashion, ...(char.fashion || {}) },
      internal: {
        consciousness: {
          ...EMPTY_CHARACTER.internal.consciousness,
          ...(char.internal?.consciousness || {}),
        },
        subconscious: {
          ...EMPTY_CHARACTER.internal.subconscious,
          ...(char.internal?.subconscious || {}),
        },
        defilement: {
          ...EMPTY_CHARACTER.internal.defilement,
          ...(char.internal?.defilement || {}),
        },
      },
      goals: { ...EMPTY_CHARACTER.goals, ...(char.goals || {}) },
    }));

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Compatible Characters)',
        provider: 'gemini',
        costInCredits: characters.length * 2,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Compatible Characters Generation',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });

      await recordUsage(userId, {
        type: 'character',
        credits: characters.length * 2, // 2 credits per character
      });
    }

    console.log(
      `✅ Generated ${characters.length} compatible characters based on ${existingCharacters.length} existing characters`
    );
    return characters;
  } catch (error) {
    console.error('Error generating compatible characters:', error);
    throw new Error('Failed to generate compatible characters: ' + (error as Error).message);
  }
}

export async function fillMissingCharacterDetails(
  character: Character,
  language: string
): Promise<Character> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;

  try {
    const langInstruction =
      language === 'Thai'
        ? 'Ensure all filled values are written in Thai language (Natural, creative Thai writing).'
        : 'Ensure all filled values are written in English.';

    const prompt = `
      You are a scriptwriter's assistant. FILL IN THE BLANKS for character "${character.name}" (${character.role}).
      ${langInstruction}
      Return the full JSON.
      
      Current JSON Data:
      ${JSON.stringify(character, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const result = JSON.parse(text);

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Fill Character Details)',
        provider: 'gemini',
        costInCredits: 1,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Fill Character Details',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    return result;
  } catch (error) {
    console.error('Error filling missing character details:', error);
    throw new Error('Failed to fill missing details.');
  }
}

export type FashionRegenerationMode = 'fresh' | 'refine' | 'use-edited';

export async function generateCostumeFashionDesign(
  character: Character,
  scriptData: ScriptData,
  mode: FashionRegenerationMode,
  userHint?: string
): Promise<Record<string, string>> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;

  try {
    const langInstruction =
      scriptData.language === 'Thai'
        ? 'STRICTLY OUTPUT VALUES IN THAI ONLY. Do not use English in values. Keep JSON keys in English.'
        : 'Ensure all value fields are written in English.';

    const safeHint = (userHint || '').trim();

    const baseContext = {
      name: character.name,
      role: character.role,
      description: character.description,
      external: character.external || {},
      physical: character.physical || {},
    };

    const currentFashion = character.fashion || {};

    const modeInstruction =
      mode === 'fresh'
        ? `REGENERATION MODE: Fresh Start\n- Generate completely new Costume & Fashion from scratch.\n- Do NOT reference Current Fashion values.\n- Still ensure the design fits the character context (role/description/physical/external) and story genre.`
        : mode === 'refine'
          ? `REGENERATION MODE: Refine Existing\n- Improve and enhance the existing Costume & Fashion while keeping its core identity.\n- Keep any non-empty fields consistent; fill missing fields; improve specificity and coherence.\n- Avoid drastic outfit changes unless required by the hint.`
          : `REGENERATION MODE: Use Edited Data\n- Treat Current Fashion as the user's edited source of truth.\n- Do NOT overwrite user's non-empty fields; expand around them and fill any missing fields.\n- Ensure the final set feels coherent and production-ready.`;

    const prompt = `You are a professional costume designer for film/series. Create a Costume & Fashion Design for ONE character.

Story context:
- Project Type: ${scriptData.projectType}
- Genre: ${scriptData.mainGenre || 'Not specified'}
- Theme: ${scriptData.theme || 'Not specified'}

Character context (JSON):
${JSON.stringify(baseContext, null, 2)}

${modeInstruction}

${safeHint ? `USER HINT (optional): ${safeHint}\n` : ''}

Current Fashion (JSON):
${mode === 'fresh' ? '{ }' : JSON.stringify(currentFashion, null, 2)}

${langInstruction}

OUTPUT REQUIREMENTS:
1. Return ONLY valid JSON.
2. Return an object with a single key "fashion".
3. "fashion" MUST be a JSON object (Record<string,string>) using EXACTLY these keys:
   - "Style Concept"
   - "Main Outfit"
   - "Shoe"
   - "Accessories"
   - "Color Palette"
   - "Condition/Texture"
4. Every value must be a non-empty string (fill all fields).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: mode === 'fresh' ? 0.9 : 0.6,
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const parsed = JSON.parse(text) as
      | { fashion?: Record<string, string> }
      | Record<string, string>;

    const fashionObject =
      typeof (parsed as any)?.fashion === 'object' && (parsed as any)?.fashion
        ? ((parsed as any).fashion as Record<string, string>)
        : (parsed as Record<string, string>);

    const normalizedFashion: Record<string, string> = {
      ...EMPTY_CHARACTER.fashion,
      ...(mode === 'fresh' ? {} : currentFashion),
      ...Object.fromEntries(
        Object.entries(fashionObject || {}).filter(
          ([k, v]) => typeof k === 'string' && typeof v === 'string'
        )
      ),
    };

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Costume & Fashion)',
        provider: 'gemini',
        costInCredits: 1,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Costume & Fashion Design',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    return normalizedFashion;
  } catch (error) {
    console.error('Error generating Costume & Fashion design:', error);
    throw new Error('Failed to generate Costume & Fashion design.');
  }
}

export async function generateFullScriptOutline(
  title: string,
  mainGenre: string,
  secondaryGenres: string[],
  language: 'Thai' | 'English'
): Promise<Partial<ScriptData>> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;

  const langInstruction =
    language === 'Thai'
      ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY. All content (Big Idea, Premise, Theme, Logline, Timeline, Structure descriptions) MUST be in Thai. Do not use English for content.'
      : 'Output in English.';

  const prompt = `
    Generate a complete story outline.
    ${langInstruction}
    Title: "${title}"
    Genre: ${mainGenre}, ${secondaryGenres.join(', ')}

    Return JSON matching the ScriptData structure (bigIdea, premise, theme, logLine, timeline, characterGoals, structure).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const parsed = JSON.parse(text);

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-1.5-pro'); // Use 1.5 pro tokenizer as proxy
      const outputTokens = await countTokens(text, 'gemini-1.5-pro');

      // Use 1.5 Pro pricing as proxy for 2.5 Pro if not defined, or assume similar
      // Assuming API_PRICING has GEMINI['1.5-pro'] or similar.
      // If 2.5-pro is not in pricing, fallback to 1.5-pro pricing
      const pricing = API_PRICING.GEMINI['1.5-pro'] || { input: 0.000125, output: 0.000375 }; // Fallback values

      const inputCost = inputTokens * pricing.input;
      const outputCost = outputTokens * pricing.output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-pro',
        modelName: 'Gemini 2.5 Pro (Full Script Outline)',
        provider: 'gemini',
        costInCredits: 5,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Full Script Outline',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    const result: Partial<ScriptData> = {
      ...parsed,
      characters: [{ goals: parsed.characterGoals }],
    };
    const resultWithGoals = result as Record<string, unknown>;
    delete resultWithGoals.characterGoals;

    return result;
  } catch (error) {
    console.error('Error generating full script outline:', error);
    throw new Error('Failed to generate the full script outline from AI.');
  }
}

/**
 * 📍 Generate comprehensive Location Details for environment generation
 * Creates rich atmospheric and environmental data for better AI image/video generation
 */
export async function generateLocationDetails(
  location: string, // e.g., "INT. OFFICE - DAY"
  sceneContext: {
    sceneName: string;
    moodTone: string;
    situations: string;
  },
  language: string = 'Thai'
): Promise<LocationDetails> {
  try {
    const languageInstruction = language === 'Thai'
      ? 'Output all descriptions in THAI language (ภาษาไทยเท่านั้น)'
      : 'Output all descriptions in English';

    // Parse location string
    const locMatch = location.match(/^(INT\.|EXT\.)\s*(.+?)\s*-\s*(DAY|NIGHT|DAWN|DUSK|GOLDEN HOUR|กลางวัน|กลางคืน|เช้า|เย็น)/i);
    const locType = locMatch ? locMatch[1] : 'INT.';
    const locName = locMatch ? locMatch[2].trim() : location;
    const timeOfDay = locMatch ? locMatch[3] : 'DAY';

    const prompt = `
You are a professional location scout and production designer. Generate comprehensive location details for:

LOCATION: ${location}
SCENE: ${sceneContext.sceneName}
MOOD: ${sceneContext.moodTone}
SITUATION: ${sceneContext.situations}

${languageInstruction}

Create a detailed JSON with this EXACT structure (no additional fields):
{
  "locationType": "${locType}",
  "locationName": "${locName}",
  "timeOfDay": "${timeOfDay}",
  "environment": {
    "description": "Comprehensive 3-4 sentence description of the location's physical appearance, layout, and overall feel",
    "architecture": "Architectural style, building materials, design elements (if applicable)",
    "landscaping": "Natural or artificial environmental elements, plants, terrain features",
    "dimensions": "Approximate size and scale (e.g., '20x30 meters, 4 meter ceiling height')",
    "capacity": "How many people the space can accommodate"
  },
  "atmosphere": {
    "weather": "Current weather condition (sunny, cloudy, rainy, etc.)",
    "temperature": "Temperature with unit (e.g., '28°C warm and humid', 'Cold 15°C')",
    "humidity": "Humidity level description (dry/moderate/humid/very humid with details)",
    "windSpeed": "Wind condition (calm/breezy/windy/stormy)",
    "visibility": "Visibility condition (clear/hazy/foggy)"
  },
  "sensory": {
    "smell": "Dominant scents and aromas in the location (2-3 specific smells)",
    "sounds": "Ambient sounds and noises (3-4 specific sounds)",
    "lighting": "Quality and character of light (natural/artificial, intensity, color temperature)",
    "colors": "Dominant color palette and visual tones (4-5 main colors)"
  },
  "production": {
    "setDressing": "Key furniture, decorations, and set elements (5-7 specific items)",
    "props": "Important props that should be present (4-6 items)",
    "practicalLights": "Light sources visible in scene (lamps, windows, fixtures)",
    "specialRequirements": "Any special production needs or considerations"
  },
  "references": {
    "realWorldLocation": "Real-world location or place that this resembles",
    "culturalContext": "Cultural or historical context relevant to this location"
  }
}

IMPORTANT:
- Be specific and detailed, avoid generic descriptions
- Consider the scene's mood when describing atmosphere
- Think about what would make this location feel authentic and lived-in
- Include sensory details that would help visualize the space
- ${language === 'Thai' ? 'ใช้ภาษาไทยในทุก description' : 'Use English for all descriptions'}
`;

    requireGeminiApiKey('generateLocationDetails');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const locationDetails = JSON.parse(text);
    console.log('📍 Generated Location Details:', locationDetails);
    
    return locationDetails;
  } catch (error) {
    console.error('Error generating location details:', error);
    // Return minimal fallback data
    return {
      locationType: location.startsWith('INT') ? 'INT.' : 'EXT.',
      locationName: location,
      timeOfDay: 'DAY',
      environment: {
        description: language === 'Thai' ? 'สถานที่ทั่วไป' : 'General location',
      },
      atmosphere: {
        weather: language === 'Thai' ? 'ปกติ' : 'Normal',
        temperature: language === 'Thai' ? '25°C สบาย' : '25°C Comfortable',
        humidity: language === 'Thai' ? 'ปานกลาง' : 'Moderate',
      },
      sensory: {},
      production: {},
      references: {},
    };
  }
}

/**
 * Format Location Details into a prompt-friendly string
 */
function formatLocationDetailsForPrompt(locationDetails: LocationDetails | null | undefined): string {
  if (!locationDetails) return '';

  const sections: string[] = [];

  // Environment
  if (locationDetails.environment?.description) {
    sections.push(`📍 ENVIRONMENT: ${locationDetails.environment.description}`);
    if (locationDetails.environment.architecture) {
      sections.push(`   Architecture: ${locationDetails.environment.architecture}`);
    }
    if (locationDetails.environment.dimensions) {
      sections.push(`   Dimensions: ${locationDetails.environment.dimensions}`);
    }
  }

  // Atmosphere
  if (locationDetails.atmosphere) {
    const atmo: string[] = [];
    if (locationDetails.atmosphere.weather) atmo.push(`Weather: ${locationDetails.atmosphere.weather}`);
    if (locationDetails.atmosphere.temperature) atmo.push(`Temp: ${locationDetails.atmosphere.temperature}`);
    // Note: lighting is in sensory, not atmosphere
    if (atmo.length > 0) {
      sections.push(`🌤️ ATMOSPHERE: ${atmo.join(', ')}`);
    }
  }

  // Sensory Details
  if (locationDetails.sensory) {
    const sensory: string[] = [];
    if (locationDetails.sensory.smell) sensory.push(`Smell: ${locationDetails.sensory.smell}`);
    if (locationDetails.sensory.sounds) sensory.push(`Sounds: ${locationDetails.sensory.sounds}`);
    if (locationDetails.sensory.lighting) sensory.push(`Light: ${locationDetails.sensory.lighting}`);
    if (locationDetails.sensory.colors) sensory.push(`Colors: ${locationDetails.sensory.colors}`);
    if (sensory.length > 0) {
      sections.push(`👃 SENSORY: ${sensory.join(' | ')}`);
    }
  }

  // Production Details
  if (locationDetails.production) {
    const prod: string[] = [];
    if (locationDetails.production.setDressing) prod.push(`Set: ${locationDetails.production.setDressing}`);
    if (locationDetails.production.props) prod.push(`Props: ${locationDetails.production.props}`);
    if (locationDetails.production.practicalLights) prod.push(`Lights: ${locationDetails.production.practicalLights}`);
    if (prod.length > 0) {
      sections.push(`🎬 PRODUCTION: ${prod.join(' | ')}`);
    }
  }

  return sections.length > 0 ? `\n\n=== LOCATION DETAILS (for environment authenticity) ===\n${sections.join('\n')}\n` : '';
}

export async function generateScene(
  scriptData: ScriptData,
  plotPoint: PlotPoint,
  _sceneIndex: number,
  _totalScenesForPoint: number,
  sceneNumber: number
): Promise<GeneratedScene> {
  const startTime = Date.now();
  // ✅ Quota validation
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'scene',
      details: { scriptType: 'scene' },
    });

    if (!quotaCheck.allowed) {
      throw new Error(
        `❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`
      );
    }
  }

  const charactersString = scriptData.characters
    .map(c => `${c.name} (${c.role} - Goal: ${c.goals.objective || 'Unknown'})`)
    .join(', ');
  const languageInstruction =
    scriptData.language === 'Thai'
      ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY (ภาษาไทยเท่านั้น). Even if the input context is in English, you MUST translate and expand the concepts into Thai. Do not output English text for values. Only JSON keys should be English.'
      : 'Ensure all dialogue and descriptions are in English.';

  const previousScenesInfo = (scriptData.generatedScenes[plotPoint.title] || [])
    .map(
      s =>
        `Scene ${s.sceneNumber}: ${s.sceneDesign.sceneName} - ${s.sceneDesign.situations[s.sceneDesign.situations.length - 1].description}`
    )
    .join('\n');

  const buildWardrobeCanonForScene = (scene: any): string => {
    if (!scene || typeof scene !== 'object') return '';

    const sceneNo = typeof scene.sceneNumber === 'number' ? scene.sceneNumber : undefined;
    const sceneName =
      typeof scene?.sceneDesign?.sceneName === 'string' ? scene.sceneDesign.sceneName : '';
    const location =
      typeof scene?.sceneDesign?.location === 'string' ? scene.sceneDesign.location : '';

    const outfits =
      scene?.characterOutfits && typeof scene.characterOutfits === 'object'
        ? scene.characterOutfits
        : null;
    const outfitLine = outfits
      ? Object.entries(outfits)
          .filter(
            ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
          )
          .slice(0, 10)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : '';

    const shotList: any[] = Array.isArray(scene?.shotList) ? scene.shotList : [];
    const costumeValues = shotList
      .map(s => (typeof s?.costume === 'string' ? s.costume.trim() : ''))
      .filter(Boolean);

    const mostCommon = (items: string[]): string => {
      const counts = new Map<string, number>();
      for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
      let best = '';
      let bestCount = 0;
      for (const [k, c] of counts.entries()) {
        if (c > bestCount) {
          best = k;
          bestCount = c;
        }
      }
      return best;
    };

    const costumeCanon = mostCommon(costumeValues);
    const cf = shotList.find(
      s => s?.costumeFashion && typeof s.costumeFashion === 'object'
    )?.costumeFashion;
    const cfSummary =
      cf && typeof cf === 'object'
        ? Object.entries(cf)
            .filter(
              ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
            )
            .slice(0, 6)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
        : '';

    return (
      `Scene ${sceneNo ?? '?'}${sceneName ? ` — ${sceneName}` : ''}${location ? ` @ ${location}` : ''}\n` +
      (outfitLine ? `- characterOutfits: ${outfitLine}\n` : '') +
      (costumeCanon ? `- costume CANON (copy exact if continuous): ${costumeCanon}\n` : '') +
      (cfSummary ? `- costumeFashion CANON (copy exact if continuous): ${cfSummary}\n` : '')
    ).trim();
  };

  const previousWardrobeInfo = (() => {
    const buckets =
      scriptData?.generatedScenes && typeof scriptData.generatedScenes === 'object'
        ? Object.values(scriptData.generatedScenes)
        : [];
    const allScenes = buckets.flatMap(v => (Array.isArray(v) ? v : []));

    const prev = allScenes
      .filter(
        s => typeof (s as any)?.sceneNumber === 'number' && (s as any).sceneNumber < sceneNumber
      )
      .sort((a: any, b: any) => Number(b.sceneNumber) - Number(a.sceneNumber))
      .slice(0, 2);

    const lines = prev.map(s => buildWardrobeCanonForScene(s)).filter(Boolean);
    return lines.join('\n\n');
  })();

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

  // 📍 NOTE: Location Details will be generated AFTER scene creation,
  // so we include a placeholder here for Prop List and Breakdown guidance
  const locationGuidance = `
=== LOCATION PRODUCTION GUIDELINES ===
When generating Prop List and Breakdown:
- Consider the physical environment and what props would naturally exist there
- Think about set dressing appropriate for the location type
- Include atmosphere elements (weather, lighting) in production notes
- Account for practical lights and environmental fixtures
- List props that support the sensory and visual atmosphere
  `;

  const prompt = `
    Generate Scene #${sceneNumber} (${_sceneIndex + 1}/${_totalScenesForPoint}) for plot point: "${plotPoint.title}".
    Context: ${plotPoint.description}
    ${languageInstruction}
    Story Bible: ${storyBible}
    Previous Scenes: ${previousScenesInfo}

    Previous Wardrobe Canon (for continuity across scenes if the story is continuous):
    ${previousWardrobeInfo || 'N/A'}

    ${characterPsychology}

    ${locationGuidance}

    Return JSON with the following structure:
    {
      "sceneDesign": {
        "sceneName": "Scene name in ${scriptData.language}",
        "characters": ["character names"],
        "location": "INT./EXT. LOCATION - TIME",
        "situations": [
          {
            "description": "What happens in ${scriptData.language}",
            "characterThoughts": "Internal thoughts in ${scriptData.language}",
            "dialogue": [{"character": "Name", "dialogue": "Line in ${scriptData.language}"}]
          }
        ],
        "moodTone": "Mood description in ${scriptData.language}"
      },
      "characterOutfits": {
        "Character Name": "stable-outfit-id",
        "Another Character": "stable-outfit-id"
      },
      "shotList": [
        {
          "scene": "${sceneNumber}",
          "shot": 1,
          "description": "Visual description in ${scriptData.language}",
          "durationSec": 3,
          "shotSize": "Choose from: ECU, CU, MCU, MS, MLS, LS, VLS, EST",
          "perspective": "Choose from: Eye-Level, High Angle, Low Angle, Bird's Eye, Worm's Eye, POV, OTS, Canted",
          "movement": "Choose from: Static, Pan, Tilt, Dolly In, Dolly Out, Zoom In, Zoom Out, Tracking, Handheld, Steadicam, Crane",
          "visualEffects": "Choose from: None, Slow Motion, Fast Motion / Time-lapse, Black & White, Sepia Tone, Film Grain, Smoke / Fog, Rain / Snow, Lens Flare, or other appropriate VFX",
          "equipment": "Choose from: Tripod, Dolly, Slider, Crane, Steadicam, Gimbal, Handheld Rig, Drone",
          "focalLength": "Choose from: 14mm, 24mm, 35mm, 50mm, 85mm, 100mm, 135mm, 200mm+",
          "aspectRatio": "Choose from: 16:9, 2.39:1, 4:3, 1:1",
          "lightingDesign": "Lighting description in ${scriptData.language}",
          "colorTemperature": "Choose from: Warm (3200K), Neutral (5600K), Cool (6500K+)",
          "cast": "Character names in shot",
          "costume": "Costume description in ${scriptData.language} (KEEP CONSISTENT across shots unless an explicit change is required)",
          "costumeFashion": {
            "Style Concept": "...",
            "Main Outfit": "...",
            "Color Palette": "...",
            "Accessories": "...",
            "Condition/Texture": "..."
          },
          "set": "Set/Location description in ${scriptData.language}"
        }
      ],
      "propList": [
        {
          "scene": "${sceneNumber}",
          "propArt": "Prop item name in ${scriptData.language}",
          "sceneSetDetails": "Detailed set description in ${scriptData.language}"
        }
      ],
      "breakdown": {
        "part1": [
          {
            "Break Down Q": "1",
            "Company Name": "Production company in ${scriptData.language}",
            "Theme": "Scene theme/category in ${scriptData.language}",
            "Filming Date": "DD/MM/YYYY",
            "Time Departure": "HH:MM",
            "Location": "Filming location in ${scriptData.language}",
            "Name Break Down": "Breakdown creator name",
            "Director": "Director name",
            "First AD Phone": "+66-XXX-XXXX",
            "PM Phone": "+66-XXX-XXXX"
          }
        ],
        "part2": [
          {
            "No": "1",
            "Time": "HH:MM",
            "Scene": "${sceneNumber}",
            "Locations": "Location name in ${scriptData.language}",
            "Int.-Ext.": "INT or EXT",
            "D or N": "D (Day) or N (Night)",
            "Set": "Set description in ${scriptData.language}",
            "Scene Name": "Scene name in ${scriptData.language}",
            "Description": "Shot description in ${scriptData.language}",
            "Cast": "Character names in ${scriptData.language}",
            "Extra": "Number of extras",
            "Prop": "Props needed in ${scriptData.language}",
            "Costume": "Costume description in ${scriptData.language}",
            "Remark": "Special notes in ${scriptData.language}"
          }
        ],
        "part3": [
          {
            "Crew/Actors": "Role/Name in ${scriptData.language}",
            "Extra": "Number needed",
            "On Location Time": "HH:MM",
            "Ready to Shoot Time": "HH:MM",
            "Extra Included": "Yes/No",
            "Costume Total": "Number of costumes",
            "Prop Total": "Number of props",
            "Support": "Support requirements in ${scriptData.language}",
            "Special Equipment": "Equipment needed in ${scriptData.language}"
          }
        ]
      }
    }

    IMPORTANT REQUIREMENTS:
    1. Generate at least 5-8 shots per scene with COMPLETE details for ALL fields
    2. Each shot MUST have ALL fields filled (no empty strings)
    3. Use actual values from the dropdown options provided
     4. WARDROBE / COSTUME CONTINUITY (CRITICAL):
       - Within the SAME scene: costumes MUST be continuous. Do NOT randomly change clothing, age, hairstyle, accessories, or makeup across shots.
       - If this scene is a direct continuation of the previous scene(s) (same moment/time/location), COPY the wardrobe canon EXACTLY (same costume text + same costumeFashion object) unless the story explicitly requires a change.
       - If a costume change is required by the story, make it explicit in the costume text (e.g., "เปลี่ยนชุดแล้ว: ...") and keep it consistent for the rest of the scene.
    4. PropList should list ALL props mentioned in the scene (at least 3-5 items)
    5. Breakdown MUST follow professional Film Production Breakdown format:
       
       Part 1 - Production Information (1 row per scene):
       - Break Down Q: Queue number
       - Company Name: Production company
       - Theme: Scene category/theme
       - Filming Date: Scheduled date
       - Time Departure: Call time
       - Location: Where to film
       - Name Break Down: Who created breakdown
       - Director: Director name
       - First AD Phone: First AD contact
       - PM Phone: Production Manager contact
       
       Part 2 - Scene Details (multiple rows, one per shot):
       - No: Shot number
       - Time: Estimated time
       - Scene: Scene number
       - Locations: Location name
       - Int.-Ext.: Interior or Exterior
       - D or N: Day or Night
       - Set: Set description
       - Scene Name: Scene title
       - Description: What happens
       - Cast: Characters present
       - Extra: Number of background actors
       - Prop: Props needed
       - Costume: Wardrobe details
       - Remark: Special notes
       
       Part 3 - Production Resources (multiple rows for different resources):
       - Crew/Actors: Personnel needed
       - Extra: Extra count
       - On Location Time: Arrival time
       - Ready to Shoot Time: Ready time
       - Extra Included: Yes/No
       - Costume Total: Total costume pieces
       - Prop Total: Total props
       - Support: Additional support needed
       - Special Equipment: Special gear required
       
       Generate realistic, production-ready data for each part (3-5 rows minimum for parts 2 and 3)
  `;

  try {
    requireGeminiApiKey('generateScene');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const parsedScene = JSON.parse(text);

    const processedScene = {
      ...parsedScene,
      sceneNumber,
      storyboard: [],
      sceneDesign: {
        ...parsedScene.sceneDesign,
        situations: parsedScene.sceneDesign.situations.map((sit: Record<string, unknown>) => ({
          ...sit,
          dialogue: Array.isArray(sit.dialogue)
            ? (sit.dialogue as Array<Record<string, unknown>>).map(d => ({
                ...d,
                id: d.id || `gen-${Math.random().toString(36).substr(2, 9)}`,
              }))
            : [],
        })),
      },
    };

    // 📍 AUTO-GENERATE Location Details for environment generation
    try {
      console.log('📍 Generating Location Details...');
      const situationsText = processedScene.sceneDesign.situations
        .map((s: any) => s.description)
        .join(' ');
      
      const locationDetails = await generateLocationDetails(
        processedScene.sceneDesign.location,
        {
          sceneName: processedScene.sceneDesign.sceneName,
          moodTone: processedScene.sceneDesign.moodTone,
          situations: situationsText,
        },
        scriptData.language
      );

      processedScene.sceneDesign.locationDetails = locationDetails;
      console.log('✅ Location Details added to scene');
    } catch (locError) {
      console.error('⚠️ Failed to generate location details:', locError);
      // Continue without location details if generation fails
    }

    // ✅ Record usage after successful generation
    if (userId) {
      await recordUsage(userId, {
        type: 'scene',
        credits: 1, // 1 credit per scene
      });

      // Track cost
      const duration = (Date.now() - startTime) / 1000;

      // Granular Tracking: Use Token Counting
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(response.text || '', 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Scene Generation)',
        provider: 'gemini',
        costInCredits: 1,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Scene Generation',
          tokens: { input: inputTokens, output: outputTokens },
        },
      }).catch(err => console.error('Failed to track generation:', err));
    }

    return processedScene;
  } catch (error) {
    console.error(`Error generating scene for ${plotPoint.title}:`, error);
    throw new Error(`Failed to generate scene for ${plotPoint.title}.`);
  }
}

/**
 * Refine existing scene - improve quality while keeping core structure
 */
export async function refineScene(
  scriptData: ScriptData,
  plotPoint: PlotPoint,
  existingScene: GeneratedScene,
  _sceneIndex: number,
  _totalScenesForPoint: number,
  sceneNumber: number
): Promise<GeneratedScene> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'scene',
      details: { scriptType: 'scene' },
    });
    if (!quotaCheck.allowed) {
      throw new Error(
        `❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`
      );
    }
  }

  const languageInstruction =
    scriptData.language === 'Thai'
      ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY (ภาษาไทยเท่านั้น).'
      : 'Ensure all dialogue and descriptions are in English.';

  const psychologyProfiles = scriptData.characters
    .map(c => formatPsychologyForPrompt(c))
    .join('\n\n');

  // Serialize existing scene for reference
  const existingSceneJson = JSON.stringify(existingScene.sceneDesign, null, 2);

  const prompt = `
You are refining Scene #${sceneNumber} for plot point: "${plotPoint.title}".
${languageInstruction}

EXISTING SCENE (use as foundation):
${existingSceneJson}

CHARACTER PSYCHOLOGY:
${psychologyProfiles}

YOUR TASK: REFINE AND IMPROVE this scene while KEEPING THE SAME CORE STRUCTURE.

Improvements to make:
1. **Dialogue**: Make more natural, character-appropriate, emotionally resonant
2. **Descriptions**: Add sensory details, visual richness, atmosphere
3. **Character Thoughts**: Deepen internal conflicts and motivations
4. **Pacing**: Improve rhythm and tension build-up
5. **Psychology**: Ensure character actions align with their mental states
6. **Consistency**: Check continuity with previous scenes

KEEP THE SAME:
- Scene name and location concept
- List of characters
- Number of situations
- Overall plot progression

Return the SAME JSON structure as the existing scene, but with refined content.
DO NOT change the structure, just improve the quality of content within it.
`;

  try {
    requireGeminiApiKey('refineScene');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    if (!response || !response.text) {
      throw new Error('No response from AI model');
    }

    const text = extractJsonFromResponse(response.text || '{}');
    const parsedScene = JSON.parse(text);

    // Validate response structure
    if (!parsedScene.sceneDesign) {
      throw new Error('AI response missing sceneDesign structure');
    }
    if (!Array.isArray(parsedScene.sceneDesign.situations)) {
      throw new Error('AI response missing situations array');
    }

    const processedScene = {
      ...parsedScene,
      sceneNumber,
      storyboard: existingScene.storyboard || [],
      sceneDesign: {
        ...parsedScene.sceneDesign,
        situations: parsedScene.sceneDesign.situations.map((sit: Record<string, unknown>) => ({
          ...sit,
          dialogue: Array.isArray(sit.dialogue)
            ? (sit.dialogue as Array<Record<string, unknown>>).map(d => ({
                ...d,
                id: d.id || `gen-${Math.random().toString(36).substr(2, 9)}`,
              }))
            : [],
        })),
      },
    };

    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Refine Scene)',
        provider: 'gemini',
        costInCredits: 1,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Refine Scene',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });

      await recordUsage(userId, {
        type: 'scene',
        credits: 1,
      });
    }

    return processedScene;
  } catch (error) {
    console.error('Error refining scene:', error);
    throw new Error(
      `Failed to refine scene: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Regenerate scene using user's edited data
 */
export async function regenerateWithEdits(
  scriptData: ScriptData,
  plotPoint: PlotPoint,
  editedScene: GeneratedScene,
  _sceneIndex: number,
  _totalScenesForPoint: number,
  sceneNumber: number
): Promise<GeneratedScene> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'scene',
      details: { scriptType: 'scene' },
    });
    if (!quotaCheck.allowed) {
      throw new Error(
        `❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`
      );
    }
  }

  const languageInstruction =
    scriptData.language === 'Thai'
      ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY (ภาษาไทยเท่านั้น).'
      : 'Ensure all dialogue and descriptions are in English.';

  const psychologyProfiles = scriptData.characters
    .map(c => formatPsychologyForPrompt(c))
    .join('\n\n');

  const editedSceneJson = JSON.stringify(editedScene.sceneDesign, null, 2);

  const buildWardrobeCanonForScene = (scene: any): string => {
    if (!scene || typeof scene !== 'object') return '';

    const outfits =
      scene?.characterOutfits && typeof scene.characterOutfits === 'object'
        ? scene.characterOutfits
        : null;
    const outfitLine = outfits
      ? Object.entries(outfits)
          .filter(
            ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
          )
          .slice(0, 10)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : '';

    const shotList: any[] = Array.isArray(scene?.shotList) ? scene.shotList : [];
    const costumeValues = shotList
      .map(s => (typeof s?.costume === 'string' ? s.costume.trim() : ''))
      .filter(Boolean);

    const mostCommon = (items: string[]): string => {
      const counts = new Map<string, number>();
      for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
      let best = '';
      let bestCount = 0;
      for (const [k, c] of counts.entries()) {
        if (c > bestCount) {
          best = k;
          bestCount = c;
        }
      }
      return best;
    };

    const costumeCanon = mostCommon(costumeValues);
    const cf = shotList.find(
      s => s?.costumeFashion && typeof s.costumeFashion === 'object'
    )?.costumeFashion;
    const cfSummary =
      cf && typeof cf === 'object'
        ? Object.entries(cf)
            .filter(
              ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
            )
            .slice(0, 6)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
        : '';

    return (
      (outfitLine ? `- characterOutfits: ${outfitLine}\n` : '') +
      (costumeCanon ? `- costume CANON: ${costumeCanon}\n` : '') +
      (cfSummary ? `- costumeFashion CANON: ${cfSummary}\n` : '')
    ).trim();
  };

  const editedWardrobeCanon = buildWardrobeCanonForScene(editedScene);

  const previousWardrobeInfo = (() => {
    const buckets =
      scriptData?.generatedScenes && typeof scriptData.generatedScenes === 'object'
        ? Object.values(scriptData.generatedScenes)
        : [];
    const allScenes = buckets.flatMap(v => (Array.isArray(v) ? v : []));

    const prev = allScenes
      .filter(
        s => typeof (s as any)?.sceneNumber === 'number' && (s as any).sceneNumber < sceneNumber
      )
      .sort((a: any, b: any) => Number(b.sceneNumber) - Number(a.sceneNumber))
      .slice(0, 2);

    const lines = prev.map(s => buildWardrobeCanonForScene(s)).filter(Boolean);
    return lines.join('\n\n');
  })();

  // Extract character list from edited scene for emphasis
  const editedCharacterList = editedScene.sceneDesign.characters || [];
  const characterListStr =
    editedCharacterList.length > 0
      ? editedCharacterList.map(c => `"${c}"`).join(', ')
      : 'No characters';

  const prompt = `
You are regenerating Scene #${sceneNumber} for plot point: "${plotPoint.title}".
${languageInstruction}

EDITED SCENE DATA (user has modified this):
${editedSceneJson}

⚠️ CRITICAL - CHARACTERS IN THIS SCENE (MUST PRESERVE EXACTLY):
The user has explicitly set these characters for this scene: [${characterListStr}]
YOU MUST include ALL these characters in your generated scene.
DO NOT remove any character from this list.
DO NOT add characters that are not in this list.
The "characters" array in your response MUST be exactly: ${JSON.stringify(editedCharacterList)}

CHARACTER PSYCHOLOGY:
${psychologyProfiles}

YOUR TASK: CREATE A NEW SCENE that INCORPORATES the user's edits.

The user has manually edited:
- Character dialogues (use them as-is or as inspiration)
- Scene descriptions (respect their creative direction)
- **Character list (MUST PRESERVE EXACTLY - do not add or remove any character)**
- Situation structure (they may have reorganized)

Your role:
1. **PRESERVE the exact character list** - this is non-negotiable
2. **KEEP all user edits** that are explicitly written
3. **CREATE DIALOGUE FOR ALL CHARACTERS** - Every character in the list MUST have dialogue
4. **EXPAND** on their ideas with more detail
5. **FILL IN gaps** where data is missing or incomplete
6. **ENSURE CONSISTENCY** with their creative vision
7. **IMPROVE** technical aspects (shot list, props, breakdown) to match edited content
8. **ALIGN** with character psychology profiles

⚠️ CRITICAL REQUIREMENTS:

**DIALOGUE:**
- EVERY character in the characters list MUST appear in at least one situation's dialogue array
- If a character is in the scene, they MUST speak (create natural dialogue for them)
- Each situation can have multiple dialogue entries
- Format: {"id": "unique-id", "character": "Name", "dialogue": "Dialogue in ${scriptData.language}"}

**SHOT LIST:**
- Generate at least 5-8 complete shots
- EVERY shot MUST have ALL fields filled (scene, shot, description, durationSec, shotSize, perspective, movement, equipment, focalLength, aspectRatio, lightingDesign, colorTemperature, cast, costume, costumeFashion, set, visualEffects)
- Use proper technical values (ECU, CU, MS, LS, etc. for shotSize)
- Include all characters who appear in each shot in the "cast" field
- WARDROBE / COSTUME CONTINUITY (CRITICAL):
  - Within the SAME scene: costumes MUST be continuous. Do NOT randomly change clothing/age/hairstyle/accessories across shots.
  - If this regenerated scene is continuous with the previous scene(s), COPY the wardrobe canon EXACTLY unless user edits explicitly require a change.
  - "costumeFashion" MUST be a JSON object (schema matches Step 3 Costume & Fashion) and should remain consistent across shots unless a change is explicitly required.

WARDROBE CANON FROM USER-EDITED SCENE (highest priority if present):
${editedWardrobeCanon || 'N/A'}

WARDROBE CANON FROM PREVIOUS GENERATED SCENES (use for continuity across scenes if applicable):
${previousWardrobeInfo || 'N/A'}

**BREAKDOWN:**
- Part 1: Production Information (1 complete row with ALL fields)
- Part 2: Scene Details (at least 1 row per major shot/setup with ALL fields)
- Part 3: Crew/Resource Requirements (at least 3-5 rows with ALL fields)
- DO NOT leave any field empty - use appropriate values for each field

CRITICAL: You MUST return a COMPLETE JSON structure with ALL required fields.
The response MUST include:
- sceneDesign (with name, location, timeOfDay, sceneDescription, characters, situations)
  - Each situation MUST have dialogue array with entries for characters
- shotList (array of at least 5-8 complete shots with ALL fields)
- propList (array of props)
- breakdown (part1, part2, part3 arrays with complete rows)

Example structure showing COMPLETE data:
{
  "sceneDesign": {
    "sceneName": "Scene name in ${scriptData.language}",
    "location": "Location",
    "timeOfDay": "Day/Night",
    "sceneDescription": "Description in ${scriptData.language}",
    "characters": ${JSON.stringify(editedCharacterList)},
    "situations": [
      {
        "name": "Situation name",
        "description": "What happens",
        "dialogue": [
          {"id": "dlg-1", "character": "${editedCharacterList[0] || 'Character1'}", "dialogue": "Dialogue in ${scriptData.language}"},
          {"id": "dlg-2", "character": "${editedCharacterList[1] || 'Character2'}", "dialogue": "Response in ${scriptData.language}"}
        ]
      }
    ]
  },
  "shotList": [
    {
      "scene": "${sceneNumber}",
      "shot": 1,
      "description": "Visual description",
      "durationSec": 3,
      "shotSize": "MS",
      "perspective": "Eye-Level",
      "movement": "Static",
      "equipment": "Tripod",
      "focalLength": "50mm",
      "aspectRatio": "16:9",
      "lightingDesign": "Lighting description",
      "colorTemperature": "Neutral (5600K)",
      "cast": "${editedCharacterList.join(', ')}",
      "costume": "Costume description",
      "costumeFashion": {
        "Style Concept": "...",
        "Main Outfit": "...",
        "Color Palette": "...",
        "Accessories": "...",
        "Condition/Texture": "..."
      },
      "set": "Set description"
    }
  ],
  "propList": [{"scene": "${sceneNumber}", "propArt": "Prop name", "sceneSetDetails": "Details"}],
  "breakdown": {
    "part1": [{"Break Down Q": "1", "Company Name": "Company", "Theme": "Theme", "Filming Date": "01/01/2025", "Time Departure": "08:00", "Location": "Location", "Name Break Down": "Name", "Director": "Director", "First AD Phone": "+66-XXX-XXXX", "PM Phone": "+66-XXX-XXXX"}],
    "part2": [{"No": "1", "Time": "08:00", "Scene": "${sceneNumber}", "Locations": "Location", "Int.-Ext.": "INT", "D or N": "D", "Set": "Set", "Scene Name": "Name", "Description": "Description", "Cast": "${editedCharacterList.join(', ')}", "Extra": "0", "Prop": "Props", "Costume": "Costume", "Remark": "Notes"}],
    "part3": [{"Crew/Actors": "Role", "Extra": "0", "On Location Time": "08:00", "Ready to Shoot Time": "09:00", "Extra Included": "No", "Costume Total": "1", "Prop Total": "1", "Support": "Support", "Special Equipment": "Equipment"}]
  }
}

Generate a complete scene with ALL fields properly filled. DO NOT use empty strings or skip any required fields.
`;

  try {
    requireGeminiApiKey('regenerateWithEdits');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    if (!response || !response.text) {
      throw new Error('No response from AI model');
    }

    const text = extractJsonFromResponse(response.text || '{}');
    const parsedScene = JSON.parse(text);

    // Validate response structure
    if (!parsedScene.sceneDesign) {
      throw new Error('AI response missing sceneDesign structure');
    }
    if (!Array.isArray(parsedScene.sceneDesign.situations)) {
      throw new Error('AI response missing situations array');
    }

    // ⚠️ CRITICAL VALIDATION - Restore user's character list if AI removed any
    const aiCharacters = parsedScene.sceneDesign.characters || [];
    const missingCharacters = editedCharacterList.filter(char => !aiCharacters.includes(char));

    if (missingCharacters.length > 0) {
      console.warn(
        `⚠️ AI removed characters that user added: ${missingCharacters.join(', ')}. Restoring them.`
      );
      // Force restore the exact character list from edited scene
      parsedScene.sceneDesign.characters = [...editedCharacterList];
    }

    // Also check if AI added unwanted characters
    const extraCharacters = aiCharacters.filter(
      (char: string) => !editedCharacterList.includes(char)
    );
    if (extraCharacters.length > 0) {
      console.warn(
        `⚠️ AI added characters that user didn't want: ${extraCharacters.join(', ')}. Removing them.`
      );
      parsedScene.sceneDesign.characters = [...editedCharacterList];
    }

    // ⚠️ VALIDATE DIALOGUE - Ensure all characters have dialogue
    const charactersWithDialogue = new Set<string>();
    parsedScene.sceneDesign.situations.forEach((sit: Record<string, unknown>) => {
      if (Array.isArray(sit.dialogue)) {
        (sit.dialogue as Array<Record<string, unknown>>).forEach(d => {
          if (d.character && typeof d.character === 'string')
            charactersWithDialogue.add(d.character);
        });
      }
    });

    const charactersWithoutDialogue = editedCharacterList.filter(
      char => !charactersWithDialogue.has(char)
    );

    if (charactersWithoutDialogue.length > 0) {
      console.warn(
        `⚠️ Characters without dialogue: ${charactersWithoutDialogue.join(', ')}. This may affect scene completeness.`
      );
    }

    // ⚠️ VALIDATE SHOT LIST
    if (!Array.isArray(parsedScene.shotList) || parsedScene.shotList.length < 3) {
      console.warn(
        `⚠️ Shot list has only ${parsedScene.shotList?.length || 0} shots. Recommended: at least 5-8 shots.`
      );
    }

    // ⚠️ VALIDATE BREAKDOWN
    if (!parsedScene.breakdown) {
      console.warn('⚠️ Missing breakdown structure');
    } else {
      if (!Array.isArray(parsedScene.breakdown.part1) || parsedScene.breakdown.part1.length === 0) {
        console.warn('⚠️ Breakdown Part 1 is missing or empty');
      }
      if (!Array.isArray(parsedScene.breakdown.part2) || parsedScene.breakdown.part2.length === 0) {
        console.warn('⚠️ Breakdown Part 2 is missing or empty');
      }
      if (!Array.isArray(parsedScene.breakdown.part3) || parsedScene.breakdown.part3.length === 0) {
        console.warn('⚠️ Breakdown Part 3 is missing or empty');
      }
    }

    const processedScene = {
      ...parsedScene,
      sceneNumber,
      storyboard: editedScene.storyboard || [],
      sceneDesign: {
        ...parsedScene.sceneDesign,
        characters: editedCharacterList, // Force use edited character list
        situations: parsedScene.sceneDesign.situations.map((sit: Record<string, unknown>) => ({
          ...sit,
          dialogue: Array.isArray(sit.dialogue)
            ? (sit.dialogue as Array<Record<string, unknown>>).map(d => ({
                ...d,
                id: d.id || `gen-${Math.random().toString(36).substr(2, 9)}`,
              }))
            : [],
        })),
      },
    };

    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Regenerate Scene)',
        provider: 'gemini',
        costInCredits: 1,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Regenerate Scene',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });

      await recordUsage(userId, {
        type: 'scene',
        credits: 1,
      });
    }

    return processedScene;
  } catch (error) {
    console.error('Error regenerating with edits:', error);
    throw new Error(
      `Failed to regenerate with edits: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert dialogue to character's specific dialect and speech pattern
 * @param dialogue - Original dialogue text
 * @param character - Character with speech pattern settings
 * @param scriptData - Script context for better conversion
 * @returns Converted dialogue with dialect/accent applied
 */
export async function convertDialogueToDialect(
  dialogue: string,
  character: Character,
  scriptData: ScriptData
): Promise<string> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;
  try {
    const speechPattern = character.speechPattern;

    // If no speech pattern or standard settings, return original
    if (
      !speechPattern ||
      (speechPattern.dialect === 'standard' &&
        speechPattern.accent === 'none' &&
        speechPattern.formalityLevel === 'informal' &&
        speechPattern.personality === 'polite')
    ) {
      return dialogue;
    }

    // Import dialect presets
    // const { DIALECT_PRESETS, ACCENT_PATTERNS } = await import('../constants');

    // Build conversion prompt
    // ... (omitted for brevity, assuming it's constructed above)
    // Since I can't see the prompt construction in the previous read_file, I'll assume it's there.
    // Wait, I need to be careful not to delete the prompt construction.
    // I will read the function from the beginning to make sure I capture the prompt construction.

    // Actually, I can just wrap the generateContent call and add tracking.
    // But I need the prompt variable.

    // Let's read the whole function first.

    const dialectInfo =
      speechPattern.dialect !== 'standard'
        ? DIALECT_PRESETS[speechPattern.dialect as keyof typeof DIALECT_PRESETS]
        : null;

    const accentInfo =
      speechPattern.accent !== 'none'
        ? ACCENT_PATTERNS[speechPattern.accent as keyof typeof ACCENT_PATTERNS]
        : null;

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการแปลงภาษาพูดและสำเนียงในภาษาไทย

# บริบทตัวละคร
ชื่อ: ${character.name}
อายุ: ${character.physical?.age || 'ไม่ระบุ'}
บทบาท: ${character.role || 'ไม่ระบุ'}

# การตั้งค่าการพูด
${
  dialectInfo
    ? `
ภาษาถิ่น: ${dialectInfo.name}
คำศัพท์ทั่วไป: ${Object.entries(dialectInfo.commonWords || {})
        .map(([k, v]) => `"${k}" → "${v}"`)
        .join(', ')}
ท้ายประโยค: ${dialectInfo.suffixes?.join(', ') || 'ไม่มี'}
ตัวอย่าง: ${dialectInfo.examples?.slice(0, 3).join(' | ') || 'ไม่มี'}
`
    : ''
}
${
  accentInfo
    ? `
สำเนียง: ${accentInfo.name}
กฎการแปลง: ${accentInfo.rules?.map((r: { pattern: string; replacement: string }) => `"${r.pattern}" → "${r.replacement}"`).join(', ') || 'ไม่มี'}
`
    : ''
}
ระดับความเป็นทางการ: ${speechPattern.formalityLevel}
บุคลิกการพูด: ${speechPattern.personality}
${speechPattern.speechTics && speechPattern.speechTics.length > 0 ? `คำพูดติดปาก: ${speechPattern.speechTics.join(', ')}` : ''}
${speechPattern.customPhrases && speechPattern.customPhrases.length > 0 ? `วลีพิเศษ: ${speechPattern.customPhrases.join(' | ')}` : ''}

# บทภาพยนตร์
เรื่อง: ${scriptData.title || 'ไม่มีชื่อ'}
ประเภท: ${scriptData.projectType || 'ไม่ระบุ'}

# ภารกิจของคุณ
แปลงบทสนทนาต่อไปนี้ให้เข้ากับภาษาถิ่น สำเนียง และบุคลิกการพูดของตัวละคร
โดยคงความหมายและอารมณ์เดิมไว้ให้มากที่สุด

บทสนทนาเดิม:
"${dialogue}"

คำแนะนำ:
1. แทนที่คำศัพท์มาตรฐานด้วยคำถิ่น (ตามรายการ commonWords)
2. เพิ่มคำท้ายประโยคตามภาษาถิ่น (เช่น "เด้อ" "บ่" "จ๊า")
3. ปรับสำเนียงตามกฎการแปลง (ถ้ามี)
4. สอดแทรกคำพูดติดปากอย่างเป็นธรรมชาติ (ถ้ามี)
5. ใช้วลีพิเศษที่เหมาะสมกับสถานการณ์ (ถ้ามี)
6. ปรับระดับความสุภาพตามการตั้งค่า
7. แสดงบุคลิกการพูดให้เห็นชัดเจน

# ผลลัพธ์
ตอบกลับด้วยบทสนทนาที่แปลงแล้วเท่านั้น ไม่ต้องอธิบาย ไม่ต้องใส่เครื่องหมายคำพูด แค่ข้อความที่แปลงแล้ว`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });

    const convertedDialogue = (response.text || '').trim();

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.0-flash-exp');
      const outputTokens = await countTokens(convertedDialogue, 'gemini-2.0-flash-exp');

      // Use 1.5 Flash pricing as proxy for 2.0 Flash Exp if not defined
      const pricing = API_PRICING.GEMINI['1.5-flash'] || { input: 0.00001875, output: 0.000075 };

      const inputCost = inputTokens * pricing.input;
      const outputCost = outputTokens * pricing.output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.0-flash-exp',
        modelName: 'Gemini 2.0 Flash Exp (Dialect Conversion)',
        provider: 'gemini',
        costInCredits: 0, // Maybe free or low cost?
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Dialect Conversion',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    // Remove surrounding quotes if present
    const cleaned = convertedDialogue.replace(/^["']|["']$/g, '');

    return cleaned || dialogue; // Fallback to original if conversion fails
  } catch (error) {
    console.error('Error converting dialogue to dialect:', error);
    return dialogue; // Return original on error
  }
}

export async function generateStoryboardImage(
  prompt: string,
  characters?: Character[],
  onProgress?: (progress: number) => void,
  options?: {
    seed?: number; // 🆕 Stable seed for scene consistency
    previousShotImage?: string; // 🆕 Previous shot for continuity
    preferredModel?: string; // 🆕 User-selected model
    locationDetails?: LocationDetails; // 📍 Location Details for environment context
  }
): Promise<string> {
  try {
    // 🆕 CONSISTENCY: Extract character reference images for Face ID
    let primaryCharacterRef: string | undefined;
    if (characters && characters.length > 0) {
      // Use first character with image as primary reference
      const charWithImage = characters.find(c => c.image);
      if (charWithImage?.image) {
        // ✅ VALIDATION: Check if this is a valid base64 image or URL
        const img = charWithImage.image;
        const isBase64 = img.startsWith('data:image/');
        const isURL = img.startsWith('http://') || img.startsWith('https://');
        const isValidImage = isBase64 || isURL;
        
        if (!isValidImage) {
          console.warn(`⚠️ Invalid character image for ${charWithImage.name}: Not a base64 or URL (${img.substring(0, 50)}...)`);
          console.warn('⏭️ Skipping Face ID - will generate without reference image');
        } else {
          primaryCharacterRef = charWithImage.image;
          console.log(`🎭 Using Face ID for character: ${charWithImage.name}`);
        }
      }
    }

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

    // 📍 ADD LOCATION DETAILS: Enhance with environment context
    if (options?.locationDetails) {
      const loc = options.locationDetails;
      const envContext: string[] = [];
      
      if (loc.environment?.description) {
        envContext.push(`Environment: ${loc.environment.description}`);
      }
      if (loc.environment?.architecture) {
        envContext.push(`Architecture: ${loc.environment.architecture}`);
      }
      if (loc.atmosphere?.weather) {
        envContext.push(`Weather: ${loc.atmosphere.weather}`);
      }
      if (loc.atmosphere?.temperature) {
        envContext.push(`Temperature: ${loc.atmosphere.temperature}`);
      }
      if (loc.sensory?.lighting) {
        envContext.push(`Lighting: ${loc.sensory.lighting}`);
      }
      if (loc.sensory?.colors) {
        envContext.push(`Color Palette: ${loc.sensory.colors}`);
      }
      if (loc.sensory?.sounds) {
        envContext.push(`Ambient Sounds: ${loc.sensory.sounds}`);
      }
      
      if (envContext.length > 0) {
        enhancedPrompt += `\n\nLOCATION DETAILS:\n${envContext.join('\n')}`;
        console.log('📍 Location Details added to image prompt');
      }
    }

    // 🆕 CONTINUITY: Add previous shot context if available
    if (options?.previousShotImage) {
      enhancedPrompt += `\n\nIMPORTANT: Maintain visual continuity with previous shot. Keep consistent lighting, color palette, and character appearances.`;
    }

    // 🎬 CINEMATIC STYLE: Add photorealistic keywords
    const cinematicPrompt = `professional cinematic photography, photorealistic, film grain, depth of field, dramatic lighting, movie scene, high quality cinematography, realistic textures\n\n${enhancedPrompt}`;

    return await generateImageWithCascade(cinematicPrompt, {
      referenceImage: primaryCharacterRef, // 🆕 FACE ID: Use character reference
      useLora: characters && characters.length > 0, // Use LoRA only when characters exist
      loraType: characters && characters.length > 0 ? 'CHARACTER_CONSISTENCY' : 'DETAIL_ENHANCER',
      negativePrompt:
        'anime, cartoon, manga, illustration, drawing, painting, sketch, 2d art, cell shading, comic book, animated, stylized, non-photorealistic, low quality, blurry, distorted, text, watermark, inconsistent style, changing faces, morphing',
      seed: options?.seed, // 🆕 SEED CONSISTENCY
      preferredModel: options?.preferredModel,
      onProgress: onProgress,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error generating storyboard image:', error);
    throw new Error(err.message || 'Failed to generate storyboard image.');
  }
}

/**
 * 📸 SYSTEM 1: GENERATE PROFILE (เจนโปรไฟล์)
 *
 * สร้างภาพ PORTRAIT (ครึ่งตัว/ใบหน้า) สำหรับตัวละคร
 * - ✅ ใช้ Face ID: Match กับ faceReferenceImage (Face Identity Master)
 * - Focus: Portrait style (head and shoulders) + Face matching
 * - Output: ภาพครึ่งตัวที่รักษาใบหน้าจาก Face Identity Master
 * - Use Case: Character profile picture, avatar with consistent face
 *
 * เรียกใช้จาก: Step 3 Character → "Generate Portrait" button
 * ใช้ faceReferenceImage: activeCharacter.faceReferenceImage
 *
 * Face ID Methods:
 * - InstantID: Best quality, photorealistic (ใช้ buildSDXLFaceIDWorkflow)
 * - IP-Adapter: Mac optimized alternative
 * - Gemini: AI-based face matching
 * - LoRA: Fine-tuned model (not yet implemented)
 * - FaceSwap: Direct face replacement (ReActor)
 */
export async function generateCharacterImage(
  description: string,
  style: string,
  facialFeatures: string,
  referenceImageBase64?: string,
  onProgress?: (progress: number) => void,
  generationMode: GenerationMode = 'balanced',
  preferredModel?: string, // Model ID: 'pollinations', 'comfyui-sdxl', 'gemini-pro', etc.
  faceIdMode?: 'auto' | 'manual', // 🆕 Face ID mode: auto (fallback chain) vs manual (single method)
  selectedFaceIdMethod?: 'instantid' | 'ipadapter' | 'gemini' | 'lora' | 'faceswap' // 🆕 Manual mode method selection
): Promise<string> {
  // ✅ Quota validation
  const userId = auth.currentUser?.uid;
  if (userId) {
    const quotaCheck = await checkQuota(userId, {
      type: 'image',
      details: { resolution: '1024x1024' }, // Default resolution
    });

    if (!quotaCheck.allowed) {
      throw new Error(
        `❌ ${quotaCheck.reason}\n\n💡 ${quotaCheck.upgradeRequired ? `อัพเกรดเป็นแผน ${quotaCheck.upgradeRequired} เพื่อใช้งานต่อ` : 'กรุณาตรวจสอบแผนของคุณ'}`
      );
    }
  }

  try {
    console.log('🎨 generateCharacterImage called:');
    console.log('  - Description:', description);
    console.log('  - Style:', style);
    console.log('  - Facial Features:', facialFeatures);
    console.log('  - Has Reference:', !!referenceImageBase64);

    const { buildCharacterImagePrompt } = await import('./characterImagePromptBuilder');

    const randomSeed = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();

    const built = buildCharacterImagePrompt({
      description,
      style,
      facialFeatures,
      referenceProvided: !!referenceImageBase64,
      randomSeed,
      timestamp,
    });

    const prompt = built.prompt;
    const negativePrompt = built.negativePrompt;

    console.log('🔍 Extracted gender:', built.meta.gender);
    console.log('🔍 Extracted age:', built.meta.age);
    console.log('🇹🇭 Extracted ethnicity:', built.meta.ethnicity);
    if (built.meta.hasShavedHead) {
      console.log('🪒 Detected shaved head/bald cue: enforcing no-hair portrait');
    }

    console.log('📝 Generated prompt:', prompt);
    console.log('🚫 Negative prompt:', negativePrompt);
    console.log('🎲 Random seed:', randomSeed);
    console.log('🔄 Using LoRA:', !!referenceImageBase64);

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
      preferredModel: preferredModel, // Pass model preference
      faceIdMode: faceIdMode, // 🆕 Pass Face ID mode
      selectedFaceIdMethod: selectedFaceIdMethod, // 🆕 Pass selected Face ID method
      imageType: 'portrait', // 🆕 PORTRAIT mode for head and shoulders
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error generating character image:', error);
    throw new Error(err.message || 'Failed to generate character image.');
  }
}

/**
 * 👔 SYSTEM 2: GENERATE OUTFIT WITH FACE ID (เจนเสื้อผ้า)
 *
 * สร้างภาพ FULL BODY (ตัวเต็ม) พร้อมชุดเสื้อผ้า
 * - ✅ ใช้ Face ID: Match กับ faceReferenceImage (Face Identity Master)
 * - Focus: Full body photo + outfit + photorealistic skin texture
 * - Output: Full body standing pose (head to feet) ที่รักษาใบหน้า
 * - Use Case: Character outfit design, costume variations
 *
 * เรียกใช้จาก: Step 3 Character → "Generate Outfit (Face ID)" button
 * ใช้ faceReferenceImage: activeCharacter.faceReferenceImage || activeCharacter.image
 *
 * Face ID Methods:
 * - InstantID: Best quality, photorealistic (ใช้ buildSDXLFaceIDWorkflow)
 * - IP-Adapter: Mac optimized alternative
 * - Gemini: AI-based face matching
 * - LoRA: Fine-tuned model (not yet implemented)
 * - FaceSwap: Direct face replacement (ReActor)
 */
export async function generateCostumeImage(
  characterName: string,
  costumeDesc: string,
  style: string,
  physicalInfo: Record<string, string>,
  referenceImageBase64?: string,
  outfitReferenceImageBase64?: string,
  onProgress?: (progress: number) => void,
  generationMode?: GenerationMode,
  preferredModel?: string, // Model ID: 'pollinations', 'comfyui-sdxl', 'gemini-pro', etc.
  faceIdMode?: 'auto' | 'manual', // 🆕 Face ID mode: auto (fallback chain) vs manual (single method)
  selectedFaceIdMethod?: 'instantid' | 'ipadapter' | 'gemini' | 'lora' | 'faceswap' // 🆕 Manual mode method selection
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
      styleKeywords =
        'photorealistic, cinematic lighting, 4K resolution, movie still, professional photography, real human, live-action, realistic skin texture, natural lighting';
    } else if (effectiveStyle.toLowerCase().includes('film noir')) {
      styleDescription = 'Film Noir Photography';
      styleKeywords =
        'black and white, high contrast, dramatic shadows, classic cinema, photorealistic';
    } else if (effectiveStyle.toLowerCase().includes('anime')) {
      styleDescription = effectiveStyle;
      styleKeywords = 'anime art style, cel shading, manga style, illustrated, 2D animation';
    } else if (
      effectiveStyle.toLowerCase().includes('pixar') ||
      effectiveStyle.toLowerCase().includes('3d')
    ) {
      styleDescription = effectiveStyle;
      styleKeywords = '3D rendered, CGI, computer graphics, animated';
    } else if (effectiveStyle.toLowerCase().includes('comic')) {
      styleDescription = effectiveStyle;
      styleKeywords = 'comic book art, illustrated, hand-drawn, ink and color';
    }

    console.log('🎨 generateCostumeImage called with:');
    console.log('  - Character:', characterName);
    console.log('  - Style:', effectiveStyle);
    console.log('  - Style Description:', styleDescription);
    console.log('  - Style Keywords:', styleKeywords);
    console.log('  - Has Face ID:', !!referenceImageBase64);
    console.log('  - Costume:', costumeDesc);
    console.log('  - physicalInfo keys:', Object.keys(physicalInfo));
    console.log('  - physicalInfo.Gender:', physicalInfo['Gender']);

    // ✅ Extract ALL character information: Information + Physical + Fashion

    // Information Section (external)
    const gender = physicalInfo['Gender'] || '';
    console.log('🔍 Extracted gender for workflow:', gender);
    const ethnicity = physicalInfo['Ethnicity'] || physicalInfo['Nationality'] || 'Global';
    const age = physicalInfo['Age'] || '';
    const occupation = physicalInfo['Occupation'] || '';
    const socialStatus = physicalInfo['Social Status'] || '';

    // Physical Section
    const height = physicalInfo['Height'] || '';
    const weight = physicalInfo['Weight'] || '';
    const bodyType = physicalInfo['Body Type'] || physicalInfo['Physical Characteristics'] || '';
    const skinTone = physicalInfo['Skin Tone'] || '';
    const eyeColor = physicalInfo['Eye Color'] || '';
    const hairStyle = physicalInfo['Hair style'] || '';
    const hairColor = physicalInfo['Hair Color'] || '';
    const facialFeatures = physicalInfo['Facial Features'] || '';
    const distinguishingMarks = physicalInfo['Distinguishing Marks'] || '';

    // Fashion Section (Costume & Fashion)
    // const mainOutfit = physicalInfo['Main Outfit'] || '';
    const accessories = physicalInfo['Accessories'] || '';
    const footwear = physicalInfo['Footwear'] || '';
    const headwear = physicalInfo['Headwear'] || '';
    const specialItems = physicalInfo['Special Items'] || '';
    const fashionStyle = physicalInfo['Fashion Style'] || '';
    const colorPalette = physicalInfo['Color Palette'] || '';

    // Build comprehensive character description
    const characterDetails = [];

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
    const fashionDetails = [];
    if (accessories) fashionDetails.push(`Accessories: ${accessories}`);
    if (footwear) fashionDetails.push(`Footwear: ${footwear}`);
    if (headwear) fashionDetails.push(`Headwear: ${headwear}`);
    if (specialItems) fashionDetails.push(`Special Items: ${specialItems}`);
    if (fashionStyle) fashionDetails.push(`Fashion Style: ${fashionStyle}`);
    if (colorPalette) fashionDetails.push(`Colors: ${colorPalette}`);

    const physicalDesc = characterDetails.join(', ');
    const fashionDesc = fashionDetails.join(', ');

    // Detect gender pronouns for better prompting
    const genderPronoun =
      gender.toLowerCase().includes('female') ||
      gender.toLowerCase().includes('woman') ||
      gender.toLowerCase().includes('girl')
        ? 'female'
        : gender.toLowerCase().includes('male') ||
            gender.toLowerCase().includes('man') ||
            gender.toLowerCase().includes('boy')
          ? 'male'
          : '';

    let prompt = '';
    let negativePrompt =
      'multiple views, grid layout, collage, split image, reference sheet, character sheet, multiple angles, multiple poses, 2 people, 3 people, 4 people, group photo, deformed, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, cross-eyed, mutated hands, poorly drawn hands, poorly drawn face, mutation, ugly, blurry, low quality, watermark, text';

    if (referenceImageBase64) {
      // FACE ID MODE - Match face from reference but keep selected art style
      prompt = `CRITICAL INSTRUCTIONS:
1. Create ONE SINGLE IMAGE ONLY (not a grid, collage, or multiple views)
2. I am providing a REFERENCE IMAGE - copy their EXACT facial features
3. This is a ${genderPronoun ? genderPronoun.toUpperCase() : 'PERSON'} character${gender ? ` (Gender: ${gender})` : ''}

CREATE PHOTOREALISTIC IMAGE IN ${styleDescription.toUpperCase()} STYLE

PHOTOREALISM REQUIREMENTS:
- REAL PERSON PHOTOGRAPH (not illustration, not digital art, not painting)
- PROFESSIONAL PHOTOGRAPHY (studio quality, high-end camera)
- NATURAL SKIN TEXTURE with visible pores and natural imperfections
- REALISTIC LIGHTING (soft professional lighting, no harsh shadows)
- FILM GRAIN and natural photography artifacts
- HIGH DETAIL 8K PHOTOGRAPH
- REAL HUMAN BEING (not CGI, not 3D render, not artificial)

Style Keywords: ${styleKeywords}, photorealistic, hyperrealistic, professional photography, real human photograph, natural skin texture, realistic lighting, film grain, high detail

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

PHOTOREALISTIC RENDERING:
- Render as REAL PHOTOGRAPH (not illustration, not digital art)
- NATURAL SKIN TEXTURE with visible pores, fine lines, natural imperfections
- REALISTIC LIGHTING with soft professional photography lighting
- The person must look like a REAL HUMAN BEING photographed by a professional camera
- Add FILM GRAIN for photorealistic quality
- HIGH DETAIL 8K resolution photograph

CHARACTER INFORMATION:
- Name: ${characterName}
${gender ? `- Gender: ${gender} (IMPORTANT: This is a ${genderPronoun} character)` : ''}
- Ethnicity: ${ethnicity}
${physicalDesc ? `- Physical Details: ${physicalDesc}` : ''}

OUTFIT & FASHION:
- Main Outfit: ${costumeDesc}
${fashionDesc ? `- Fashion Details: ${fashionDesc}` : ''}

COMPOSITION REQUIREMENTS (CRITICAL - READ CAREFULLY):
- 🎬 LONG SHOT (LS) CINEMATOGRAPHY - ENTIRE CHARACTER FROM HEAD TO FEET MUST BE VISIBLE
- 📸 FULL BODY PHOTOGRAPH showing complete person from head to toe (including feet and shoes)
- ✅ Character MUST occupy 70-85% of frame height
- ✅ Clear view of complete outfit from top to bottom with all accessories
- ✅ Footwear MUST be fully visible (shoes, boots, or bare feet)
- ✅ Headwear and top accessories MUST be fully visible
- ✅ Professional fashion photography with subject centered in frame
- ❌ NO portrait crops, NO close-ups, NO upper body only
- ❌ NO reference sheets, NO multiple angles, NO split images, NO grids or collages
- ❌ NEVER cut off feet, legs, or top of head

FINAL REMINDER: 
This must be a REAL PHOTOGRAPH of a REAL PERSON, not an illustration or digital art.
The face MUST be an exact copy of the reference image person. 
Render as PHOTOREALISTIC PROFESSIONAL PHOTOGRAPHY with natural skin texture and realistic lighting.`;

      console.log('📝 Face ID Prompt:', prompt.substring(0, 300) + '...');

      // Adjust negative prompt based on style
      // Strongly block cartoon/anime/illustration for photorealistic styles
      if (
        effectiveStyle.toLowerCase().includes('photorealistic') ||
        effectiveStyle.toLowerCase().includes('cinematic realistic') ||
        effectiveStyle.toLowerCase().includes('professional photography')
      ) {
        negativePrompt =
          '(cartoon:2.0), (anime:2.0), (illustration:2.0), (digital art:1.8), (3d render:1.8), (CGI:1.8), painting, drawing, sketch, stylized, artistic, ' +
          negativePrompt;
      }

      // 🎯 BLOCK PORTRAIT CROPS - Force full body composition
      negativePrompt +=
        ', (close-up:1.8), (portrait crop:1.8), (headshot:1.8), (upper body only:1.8), (cropped legs:1.8), (cut off feet:1.8), (missing feet:1.8), (head and shoulders:1.5)';
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

      console.log('📝 Regular Prompt:', prompt.substring(0, 300) + '...');
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
      preferredModel: preferredModel, // Pass model preference
      faceIdMode: faceIdMode, // 🆕 Pass Face ID mode selection
      selectedFaceIdMethod: selectedFaceIdMethod, // 🆕 Pass manual method selection
      imageType: 'full-body', // 🆕 FULL BODY mode for head to feet
      gender: gender, // 🔥 Iteration 13.9.2: Pass gender from character profile to workflow builder
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
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error generating costume image:', error);
    throw new Error(err.message || 'Failed to generate costume image.');
  }
}

export async function generateStoryboardVideo(
  prompt: string,
  base64Image?: string,
  onProgress?: (progress: number, details?: any, jobId?: string) => void,
  preferredModel: string = 'auto',
  options?: {
    character?: Character;
    currentScene?: GeneratedScene;
    shotData?: ShotData;
    useAnimateDiff?: boolean;
    motionStrength?: number;
    fps?: number;
    steps?: number;
    cfg?: number;
    duration?: number;
    seed?: number;
    motionEdit?: MotionEdit; // 🆕 NEW: Motion Editor support
    // 🆕 Resolution & Aspect Ratio Control
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'custom';
    width?: number;
    height?: number;
    // 🆕 CHARACTER FACE ID: Character reference images for consistency
    characterImages?: string[]; // Array of character reference images (base64)
  }
): Promise<string> {
  try {
    console.log(`🎬 Generating video with model: ${preferredModel}`);

    // 🆕 Get current user ID for quota tracking
    const currentUserId = auth.currentUser?.uid;

    // 🎯 NEW: Build Motion-Aware Prompt if psychology data available
    let enhancedPrompt = prompt;
    let finalMotionStrength = options?.motionStrength;
    let finalFPS = options?.fps;
    let finalFrameCount: number | undefined;

    // 🆕 PRIORITY: Use Motion Editor data if provided
    if (options?.motionEdit && options?.character) {
      console.log('🎬 MOTION EDITOR MODE ACTIVE');

      // Build comprehensive prompt from Motion Editor
      enhancedPrompt = buildVideoPromptWithMotion(
        options.motionEdit,
        options.character,
        options.currentScene
      );

      // Get AnimateDiff parameters from Motion Editor
      const motionParams = motionEditToAnimateDiffParams(
        options.motionEdit,
        options.character,
        options.currentScene
      );

      finalMotionStrength = motionParams.motion_strength;
      finalFPS = motionParams.fps;
      finalFrameCount = motionParams.frame_count;

      console.log(`📊 Motion Editor Parameters:
  - Camera: ${motionParams.camera_movement}
  - Lighting: ${motionParams.lighting_context}
  - Sound: ${motionParams.sound_context}
  - FPS: ${finalFPS}
  - Frames: ${finalFrameCount}
  - Motion Strength: ${finalMotionStrength.toFixed(2)}`);
    } else if (options?.character && options?.currentScene && options?.shotData) {
      console.log('🧠 Psychology-Driven Motion Enhancement ACTIVE');

      // Build comprehensive video prompt with motion intelligence
      enhancedPrompt = buildVideoPrompt(
        options.shotData,
        options.currentScene,
        options.character,
        prompt
      );

      // WAN default behavior request: avoid injecting extra environmental elements that can
      // override the user's scene intent (e.g., cars/pedestrians in a temple courtyard).
      // Keep framing/identity rules but strip the ENVIRONMENTAL MOTION block.
      if (preferredModel.startsWith('comfyui-wan')) {
        enhancedPrompt = enhancedPrompt.replace(
          /(?:\r?\n){1,3}ENVIRONMENTAL MOTION:\s*(?:\r?\n)- Background:[^\r\n]*(?:\r?\n)- Atmosphere:[^\r\n]*(?:\r?\n)*/i,
          '\n'
        );
      }

      console.log('📝 ENHANCED PROMPT FROM buildVideoPrompt:');
      console.log('━'.repeat(80));
      console.log(enhancedPrompt);
      console.log('━'.repeat(80));

      // Auto-calculate optimal parameters
      const recommendedFPS = getRecommendedFPS(options.shotData);
      const recommendedFrames = getRecommendedFrameCount(
        options.shotData,
        finalFPS || recommendedFPS
      );
      const recommendedStrength = getMotionModuleStrength(options.shotData, options.character);

      finalFPS = finalFPS || recommendedFPS;
      finalFrameCount = recommendedFrames;
      finalMotionStrength = finalMotionStrength || recommendedStrength;

      console.log(`📊 Motion Intelligence Calculated:
  - Duration: ${options.shotData.durationSec || 5}s
  - FPS: ${finalFPS}
  - Frames: ${finalFrameCount}
  - Motion Strength: ${finalMotionStrength.toFixed(2)}
  - Camera: ${options.shotData.movement || 'Static'}
  - Character Energy: ${options.character.emotionalState?.energyLevel || 50}`);

      console.log('📋 Shot Data Details:', {
        shotSize: options.shotData.shotSize,
        perspective: options.shotData.perspective,
        movement: options.shotData.movement,
        visualEffects: options.shotData.visualEffects,
        cast: options.shotData.cast,
        description: options.shotData.description?.substring(0, 100) + '...',
      });
    }

    // 1. Handle User Selection - Prioritize user's explicit choice
    // 🔧 FIX: Map 'local-gpu' to ComfyUI
    let mappedModel = preferredModel;
    if (preferredModel === 'local-gpu') {
      // If we have a base image (e.g., extracted last frame for sequential continuity),
      // prefer SVD for more stable/non-noisy outputs.
      mappedModel = base64Image ? 'comfyui-svd' : 'comfyui-animatediff';
      console.log(`🔄 Mapping local-gpu → ${mappedModel}`);
    }

    // WAN is handled via backend service and can receive identity/reference inputs.
    // Do NOT force-route WAN -> SVD just because a base image exists.

    // 🔧 FIX: Check ComfyUI FIRST if user explicitly selected it
    const isComfyUIModel =
      mappedModel === 'comfyui-svd' ||
      mappedModel === 'comfyui-animatediff' ||
      mappedModel === 'comfyui-animatediff-v3' ||
      mappedModel.startsWith('comfyui-wan');
    if (isComfyUIModel) {
      console.warn('🎬 USER SELECTED COMFYUI:', mappedModel);

      // Skip direct ComfyUI check if using backend service (has its own health checks)
      /* 
      // ❌ DISABLED: Direct check causes CORS issues. Always assume backend is handling it.
      if (!USE_COMFYUI_BACKEND) {
        // Only check ComfyUI directly if NOT using backend service
        const status = await checkComfyUIStatus();
        console.warn('🔍 ComfyUI Status:', status);

        if (!status.running) {
          const errorMsg = `ComfyUI is not running. Please start ComfyUI server first.\n\nLocal: ${COMFYUI_DEFAULT_URL}\nStatus: ${status.error || 'Not responding'}`;
          console.error('❌', errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        console.warn('🔧 Using ComfyUI Backend Service - skipping direct ComfyUI check');
      }
      */
      console.warn('🔧 Using ComfyUI Backend Service - skipping direct ComfyUI check (FORCED)');

      if (COMFYUI_ENABLED || USE_COMFYUI_BACKEND) {
        try {
          const isWan = mappedModel.startsWith('comfyui-wan');
          const useAnimateDiff =
            mappedModel === 'comfyui-animatediff' ||
            mappedModel === 'comfyui-animatediff-v3' ||
            (options?.useAnimateDiff !== false && mappedModel !== 'comfyui-svd');
          const useSVD = mappedModel === 'comfyui-svd';
          console.warn(
            `🎬 ComfyUI Mode: ${isWan ? 'WAN' : useAnimateDiff ? 'AnimateDiff' : 'SVD'}`
          );

          // IMPORTANT: Do not force SDXL LoRA for video workflows.
          // AnimateDiff video in this project uses an SD1.5 base checkpoint; applying an SDXL LoRA (e.g. add-detail-xl)
          // will often produce noisy/garbled frames.
          const selectedVideoLora =
            typeof (options as any)?.lora === 'string'
              ? ((options as any).lora as string)
              : undefined;
          const selectedVideoLoraStrength =
            typeof (options as any)?.loraStrength === 'number'
              ? ((options as any).loraStrength as number)
              : undefined;

          // 🆕 FIX: Use enhanced prompt directly (already has "Cinematic shot." from buildVideoPrompt)
          // Don't add prefix again to avoid diluting ABSOLUTE MANDATORY RULES
          let finalPrompt = enhancedPrompt;

          // Cast parsing must handle both string and array forms. A false negative here can
          // accidentally add "no people" negatives and cause characters to disappear.
          const castNames = normalizeCastNames(options?.shotData?.cast);
          const castCount = castNames.length;
          const hasCharacters = castCount > 0;
          const hasThaiCast = castNames.some(n => /[\u0E00-\u0E7F]/.test(n));

          // For shots with no cast, ban people only (NOT buildings) so environments like temples remain allowed.
          const characterNegatives = hasCharacters
            ? ', extra people, crowd, background people'
            : ', people in frame, humans visible, person walking, crowd';

          const userNegativePrompt =
            typeof (options as any)?.negativePrompt === 'string'
              ? String((options as any).negativePrompt)
              : '';

          const continuityNegatives = hasCharacters
            ? ', outfit change, costume change, different clothes, missing accessories, jewelry change, face blur, soft focus, out of focus face, blurred background, soft background, noisy, grainy, pixelated, distorted face, deformed eyes, missing character, missing person, absent character, character disappears, missing limbs, missing arms, missing legs, amputated, dismembered, extra limbs, bad anatomy, broken anatomy, malformed hands, fused fingers' +
              (castCount > 1 ? ', only one person, single person, one person only' : '')
            : '';

          // Add authoritative cast constraints to the positive prompt.
          // WAN is prompt-only, so this is a key lever for "ตัวละครครบ".
          const castBlock = buildCastPromptBlock(castNames);
          if (castBlock && !finalPrompt.includes('CAST RULES (AUTHORITATIVE):')) {
            finalPrompt = `${finalPrompt}\n\n${castBlock}`;
          }

          // If cast names are Thai, strongly bias away from Western/Caucasian defaults.
          // (Common failure mode: model defaults to Western-looking faces when prompt is underspecified.)
          if (isWan && hasThaiCast && !finalPrompt.includes('ETHNICITY (AUTHORITATIVE):')) {
            finalPrompt = `${finalPrompt}\n\nETHNICITY (AUTHORITATIVE):\n- Thai / Southeast Asian facial features.\n- Do NOT generate Western/Caucasian-looking faces unless explicitly required by the script.`;
          }

          // 🎬 WAN 2.1 NATURAL QUALITY: Add photorealistic keywords for character shots
          if (isWan && hasCharacters) {
            const naturalBlock = [
              'NATURAL QUALITY:',
              '- Natural skin texture, photorealistic, depth of field',
              '- Gentle breathing movement, subtle expressions',
              '- Soft natural lighting, cinematic look',
            ].join('\n');
            if (!finalPrompt.includes('NATURAL QUALITY:')) {
              finalPrompt = `${finalPrompt}\n\n${naturalBlock}`;
            }
          }

          const ethnicityNegatives = hasThaiCast
            ? ', caucasian, western, european facial features'
            : '';

          const finalNegativePrompt = `morphing, distorted face, bad anatomy, cartoon, anime, illustration, glitch, jerky motion, static, frozen, blurry, low resolution, watermark, scene changes, jump cuts, multiple shots, multiple angles, camera switches, angle changes, noisy, grainy, pixelated, poor quality${characterNegatives}${continuityNegatives}${ethnicityNegatives}${userNegativePrompt ? `, ${userNegativePrompt}` : ''}`;

          console.log('🎬 FINAL PROMPT TO COMFYUI:');
          console.log('━'.repeat(80));
          console.log(finalPrompt);
          console.log('━'.repeat(80));
          console.log('❌ NEGATIVE PROMPT:');
          console.log(finalNegativePrompt);
          console.log('━'.repeat(80));
          if (!isWan) {
            console.log('⚙️ ANIMATEDIFF QUALITY PARAMETERS:');
            console.log('  CFG Scale: 12 (↑ from 6.5 - forces strict prompt following)');
            console.log('  Steps: 40 (↑ from 25 - more refinement, less noise)');
          }

          // 🆕 ASPECT RATIO TO RESOLUTION: Convert user selection to dimensions
          const getResolutionFromAspectRatio = (aspectRatio?: string) => {
            switch (aspectRatio) {
              case '16:9':
                return { width: 896, height: 512 }; // Cinematic landscape (multiple of 16 for Wan 2.1)
              case '9:16':
                return { width: 512, height: 896 }; // Portrait/TikTok (multiple of 16)
              case '1:1':
                return { width: 512, height: 512 }; // Square/Instagram
              case '4:3':
                return { width: 768, height: 576 }; // Standard
              default:
                return { width: 768, height: 512 }; // AnimateDiff default
            }
          };

          const aspectRatio = options?.aspectRatio || '16:9';
          const resolution = getResolutionFromAspectRatio(aspectRatio);
          const finalWidth = options?.width || resolution.width;
          const finalHeight = options?.height || resolution.height;

          console.log(`  Resolution: ${finalWidth}x${finalHeight} (Aspect Ratio: ${aspectRatio})`);
          console.log('  Expected: Single take, no cuts, HD quality, clear details');
          console.log('━'.repeat(80));

          // 🆕 WAN MODEL SELECTION: Map UI model ID to backend modelPath (Kijai format)
          let wanModelPath: string | undefined = undefined;
          if (isWan) {
            switch (preferredModel) {
              case 'comfyui-wan-i2v':
                wanModelPath = 'Wan2_1-I2V-14B-480P_fp8_e4m3fn';
                console.log('📦 WAN Model: Wan2_1-I2V-14B-480P_fp8_e4m3fn (Image-to-Video FP8) ⭐');
                break;
              case 'comfyui-wan-t2v':
                wanModelPath = 'Wan2_1-T2V-14B_fp8_e4m3fn';
                console.log('📦 WAN Model: Wan2_1-T2V-14B_fp8_e4m3fn (Text-to-Video FP8) 🎬');
                break;
              // S2V model not downloaded - fallback to I2V
              case 'comfyui-wan-s2v':
                wanModelPath = 'Wan2_1-I2V-14B-480P_fp8_e4m3fn';
                console.log('⚠️ S2V model not available - Using I2V FP8 instead');
                console.log('📦 WAN Model: Wan2_1-I2V-14B-480P_fp8_e4m3fn (Fallback) ⭐');
                break;
              default:
                // Default to T2V FP8 for prompt-driven consistency and to avoid conditioning/mode mismatches.
                // Users can still explicitly select I2V if they want image-driven identity.
                wanModelPath = 'Wan2_1-T2V-14B_fp8_e4m3fn';
                console.log('📦 WAN Model: Wan2_1-T2V-14B_fp8_e4m3fn (Default) 🎬');
            }
          }

          // 🆕 ANIMATEDIFF MODEL SELECTION: v3 for better quality
          let animatediffMotionModel: string | undefined = undefined;
          // For WAN jobs, do not select/log/pass AnimateDiff motion modules.
          if (useAnimateDiff && !isWan) {
            switch (preferredModel) {
              case 'comfyui-animatediff-v3':
                animatediffMotionModel = 'v3_sd15_mm.ckpt';
                console.log('📦 AnimateDiff Model: v3_sd15_mm.ckpt (v3 Motion) ⭐');
                break;
              default:
                animatediffMotionModel = 'v3_sd15_mm.ckpt';
                console.log('📦 AnimateDiff Model: v3_sd15_mm.ckpt (Default v3) ⭐');
            }
          }

          const result = await generateVideoWithComfyUI(finalPrompt, {
            baseImage: base64Image,
            lora: selectedVideoLora,
            loraStrength: selectedVideoLoraStrength,
            negativePrompt: finalNegativePrompt,
            seed: options?.seed,
            frameCount: finalFrameCount || 25,
            fps: finalFPS || 8,
            motionStrength: finalMotionStrength || 0.8,
            useAnimateDiff: isWan ? false : useAnimateDiff,
            useSVD: useSVD,
            // 🆕 WAN routing: handled by backend service client
            ...(isWan ? { useWan: true, videoType: 'wan' } : {}),
            // 🆕 MODEL SELECTION: Pass specific model paths
            ...(wanModelPath ? { modelPath: wanModelPath } : {}),
            ...(!isWan && animatediffMotionModel ? { motionModel: animatediffMotionModel } : {}),
            // 🆕 RESOLUTION: Use user-selected aspect ratio (from Shot List UI)
            width: finalWidth,
            height: finalHeight,
            // 🆕 QUALITY BOOST: Use user settings or safe Wan defaults
            cfg: options?.cfg || 6, // Wan 2.1 optimal: 5-8
            steps: options?.steps || 25, // Wan 2.1 safe max: 30
            character: options?.character,
            shotData: options?.shotData,
            currentScene: options?.currentScene,
            // 🆕 Face ID / identity references (used by client-side WAN tuning + other flows)
            characterImages: options?.characterImages,
            onProgress: onProgress,
          });
          // Free model, no credit deduction
          console.warn(
            `✅ ComfyUI Success: ${isWan ? 'WAN' : useAnimateDiff ? 'AnimateDiff' : 'SVD'}`
          );
          console.warn('🎬 Video Result:', result);

          // 🆕 CRITICAL FIX: Ensure we return valid video URL
          if (!result || typeof result !== 'string' || result.trim() === '') {
            throw new Error('Video generation returned empty URL');
          }

          return result;
        } catch (comfyError: unknown) {
          const err = comfyError as { message?: string };
          console.error('❌ ComfyUI Generation Failed:', err);

          // Enhanced error message with alternatives
          const errorMessage = err.message || 'Unknown error';
          throw new Error(
            `ComfyUI Error: ${errorMessage}\n\n` +
              `💡 Try these alternatives:\n` +
              `• Gemini Veo 2 (Best quality, PRO tier)\n` +
              `• Replicate AnimateDiff (Good quality, BASIC tier)\n` +
              `• Replicate SVD (Fast, BASIC tier)\n\n` +
              `Or start ComfyUI server at: ${COMFYUI_DEFAULT_URL}`
          );
        }
      } else {
        const errorMsg =
          `ComfyUI is not enabled in environment settings.\n\n` +
          `💡 Try these alternatives instead:\n` +
          `• Gemini Veo 2 (Best quality, PRO tier)\n` +
          `• Replicate AnimateDiff (Good quality, BASIC tier)\n` +
          `• Replicate SVD (Fast, BASIC tier)`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
    }

    // 2. Try Veo for 'auto' mode or explicit selection
    if (preferredModel === 'gemini-veo' || preferredModel === 'auto') {
      try {
        // 0. Check Subscription Access for Veo (moved inside try-catch for fallback)
        if (preferredModel === 'gemini-veo') {
          if (!hasAccessToModel(preferredModel, 'video')) {
            throw new Error(`Upgrade required: You do not have access to ${preferredModel}.`);
          }
        }

        // 🆕 1. Check Veo Quota (จำกัดจำนวนคลิปต่อเดือน)
        // const { checkVeoQuota } = await import('./subscriptionManager');
        const veoQuotaCheck = await checkVeoQuota(currentUserId || 'anonymous');

        if (!veoQuotaCheck.allowed) {
          console.warn('⚠️ Veo quota exceeded:', veoQuotaCheck.reason);
          throw new Error(veoQuotaCheck.reason || 'Veo quota exceeded');
        }

        console.log(`✅ Veo quota OK: ${veoQuotaCheck.remaining}/${veoQuotaCheck.limit} remaining`);

        // Try Tier 1: Gemini Veo 3.1 (best quality, limited quota)
        console.log('🎬 Tier 1: Trying Gemini Veo 3.1...');

        // Check credits for paid model
        const modelConfig = VIDEO_MODELS_CONFIG.PRO.GEMINI_VEO;

        const model = 'veo-3.1-fast-generate-preview';
        type VeoParams = {
          model: string;
          prompt: string;
          config: { numberOfVideos: number; resolution: string; aspectRatio: string };
          image?: { imageBytes: string; mimeType: string };
        };
        const params: VeoParams = {
          model,
          prompt: `Cinematic shot. ${enhancedPrompt}`, // Use enhanced prompt!
          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' },
        };
        if (base64Image) {
          const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
          const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
          params.image = {
            imageBytes: cleanBase64,
            mimeType: mimeMatch ? mimeMatch[1] : 'image/png',
          };
        }

        let operation = await ai.models.generateVideos(params);
        const timeout = 120000;
        const startTime = Date.now();

        while (!operation.done) {
          if (Date.now() - startTime > timeout) throw new Error('Video generation timed out.');

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
        if (!videoUri) throw new Error('No video URI returned');

        // 🆕 Record Veo usage (บันทึกการใช้งาน Veo)
        // const { recordVeoUsage } = await import('./subscriptionManager');
        await recordVeoUsage(currentUserId || 'anonymous', modelConfig.costPerGen || 0);

        // Track cost
        if (currentUserId) {
          const duration = (Date.now() - startTime) / 1000;
          recordGeneration({
            userId: currentUserId,
            type: 'video',
            modelId: 'gemini-veo-3',
            modelName: 'Gemini Veo 3.1',
            provider: 'gemini',
            costInCredits: modelConfig.costPerGen || 0,
            costInTHB: API_PRICING.GEMINI['veo-3'].video5s, // Assuming 5s
            success: true,
            duration,
            metadata: { prompt: enhancedPrompt },
          }).catch(err => console.error('Failed to track generation:', err));
        }

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'PLACEHOLDER_KEY';
        console.log('✅ Tier 1 Success: Gemini Veo 3.1');
        const veoUrl = `${videoUri}&key=${apiKey}`;

        // 🆕 Persist video URL to permanent storage
        const permanentUrl = await persistVideoUrl(veoUrl, {
          projectId: options?.currentScene?.sceneDesign?.sceneName,
          sceneId: options?.currentScene?.sceneNumber?.toString(),
        });
        return permanentUrl;
      } catch (veoError: unknown) {
        const err = veoError as { message?: string };
        console.error('❌ Tier 1 (Veo) failed:', err);
        if (preferredModel === 'gemini-veo') throw veoError; // Don't fallback if manually selected
        // Continue to Tier 2 fallback for 'auto' mode
      }
    }

    // 🆕 NEW TIER 2: Replicate (Quick Start - No Deployment)
    if (
      preferredModel === 'replicate-animatediff' ||
      preferredModel === 'replicate-svd' ||
      preferredModel === 'auto'
    ) {
      try {
        const useReplicateApiKey = import.meta.env.VITE_REPLICATE_API_KEY;

        if (useReplicateApiKey) {
          console.log('🎬 Tier 2 (Replicate): Attempting cloud generation...');

          // ⚠️ DISABLED: LTX-Video temporarily disabled due to model version error (422)
          // TODO: Update to latest model version when available
          // try {
          //   console.log('🎬 Tier 2a: Trying Replicate LTX-Video (High Quality Priority)...');
          //
          //   const videoUrl = await generateLTXVideo(
          //     enhancedPrompt,
          //     base64Image,
          //     {
          //       numFrames: finalFrameCount || 25,
          //       fps: finalFPS || 8,
          //       guidanceScale: 3.0,
          //       numInferenceSteps: 30,
          //       aspectRatio: options?.aspectRatio || '16:9',
          //       width: options?.width,
          //       height: options?.height,
          //     },
          //     onProgress
          //   );
          //
          //   console.log('✅ Tier 2a Success: Replicate LTX-Video (High Quality)');
          //
          //   // 🆕 Persist video URL to permanent storage
          //   const permanentUrl = await persistVideoUrl(videoUrl, {
          //     projectId: options?.currentScene?.sceneDesign?.sceneName,
          //     sceneId: options?.currentScene?.sceneNumber?.toString(),
          //   });
          //   return permanentUrl;
          // } catch (ltxError: unknown) {
          //   const err = ltxError as { message?: string };
          //   console.error('❌ Tier 2a (Replicate LTX-Video) failed:', err);
          //   console.log('⏭️ Falling back to Tier 2b: Hotshot-XL...');
          // }

          // Try Hotshot-XL as second fallback (cheaper, still good quality)
          try {
            console.log('🎬 Tier 2b: Trying Replicate Hotshot-XL (Fast & Cheap Fallback)...');

            const videoUrl = await generateHotshotXL(
              enhancedPrompt,
              base64Image,
              {
                numFrames: finalFrameCount || 16,
                fps: finalFPS || 8,
                guidanceScale: 7.5,
                numInferenceSteps: 30,
                aspectRatio: options?.aspectRatio || '16:9',
                width: options?.width,
                height: options?.height,
              },
              onProgress
            );

            console.log('✅ Tier 2b Success: Replicate Hotshot-XL');

            // 🆕 Persist video URL to permanent storage
            const permanentUrl = await persistVideoUrl(videoUrl, {
              projectId: options?.currentScene?.sceneDesign?.sceneName,
              sceneId: options?.currentScene?.sceneNumber?.toString(),
            });
            return permanentUrl;
          } catch (hotshotError: unknown) {
            const err = hotshotError as { message?: string };
            console.error('❌ Tier 2b (Replicate Hotshot-XL) failed:', err);
            console.log('⏭️ Falling back to Tier 2c: AnimateDiff...');
          }

          // Try AnimateDiff third (works with or without image)
          if (preferredModel !== 'replicate-svd') {
            try {
              // Check subscription access for AnimateDiff
              if (preferredModel === 'replicate-animatediff') {
                if (!hasAccessToModel(preferredModel, 'video')) {
                  throw new Error(`Upgrade required: You do not have access to ${preferredModel}.`);
                }
              }

              console.log('🎬 Tier 2c: Trying Replicate AnimateDiff v3...');
              const videoUrl = await generateAnimateDiffVideo(
                enhancedPrompt,
                base64Image,
                {
                  numFrames: finalFrameCount || 16,
                  fps: finalFPS || 8,
                  guidanceScale: 7.5,
                  numInferenceSteps: 25,
                },
                onProgress
              );

              console.log('✅ Tier 2c Success: Replicate AnimateDiff');

              // 🆕 Persist video URL to permanent storage
              const permanentUrl = await persistVideoUrl(videoUrl, {
                projectId: options?.currentScene?.sceneDesign?.sceneName,
                sceneId: options?.currentScene?.sceneNumber?.toString(),
              });
              return permanentUrl;
            } catch (animateError: unknown) {
              const err = animateError as { message?: string };
              console.error('❌ Tier 2c (Replicate AnimateDiff) failed:', err);
              if (preferredModel === 'replicate-animatediff') throw animateError;
            }
          }

          // Try SVD if image is available (last Replicate fallback)
          if (base64Image) {
            try {
              // Check subscription access for SVD
              if (preferredModel === 'replicate-svd') {
                if (!hasAccessToModel(preferredModel, 'video')) {
                  throw new Error(`Upgrade required: You do not have access to ${preferredModel}.`);
                }
              }

              console.log('🎬 Tier 2d: Trying Replicate SVD (Image-to-Video)...');

              // Convert motion strength to SVD motion_bucket_id (1-255)
              const motionBucketId = Math.round((finalMotionStrength || 0.7) * 180) + 50;

              const videoUrl = await generateSVDVideo(
                base64Image,
                {
                  numFrames: finalFrameCount || 14,
                  fps: finalFPS || 6,
                  motionBucketId: motionBucketId,
                  condAug: 0.02,
                },
                onProgress
              );

              console.log('✅ Tier 2d Success: Replicate SVD');

              // 🆕 Persist video URL to permanent storage
              const permanentUrl = await persistVideoUrl(videoUrl, {
                projectId: options?.currentScene?.sceneDesign?.sceneName,
                sceneId: options?.currentScene?.sceneNumber?.toString(),
              });
              return permanentUrl;
            } catch (svdError: unknown) {
              const err = svdError as { message?: string };
              console.error('❌ Tier 2d (Replicate SVD) failed:', err);
              if (preferredModel === 'replicate-svd') throw svdError;
            }
          }
        } else {
          console.log('⏭️ Skipping Replicate (no API key) - falling back to ComfyUI...');
        }
      } catch (replicateError: unknown) {
        const err = replicateError as { message?: string };
        console.error('❌ Tier 2 (Replicate) failed:', err);
        if (preferredModel.startsWith('replicate-')) throw replicateError;
      }
    }

    // Tier 3: ComfyUI Fallback for 'auto' mode
    if (preferredModel === 'auto') {
      // Try ComfyUI as fallback for 'auto' mode
      if (COMFYUI_ENABLED || USE_COMFYUI_BACKEND) {
        try {
          const useAnimateDiff = options?.useAnimateDiff !== false;
          const useSVD = !useAnimateDiff;
          console.log(
            `🎬 Tier 3 (Auto Fallback): Trying ComfyUI + ${useAnimateDiff ? 'AnimateDiff' : 'SVD'}...`
          );

          const result = await generateVideoWithComfyUI(enhancedPrompt, {
            baseImage: base64Image,
            lora:
              typeof (options as any)?.lora === 'string'
                ? ((options as any).lora as string)
                : undefined,
            loraStrength:
              typeof (options as any)?.loraStrength === 'number'
                ? ((options as any).loraStrength as number)
                : undefined,
            negativePrompt:
              'low quality, blurry, static, watermark, frozen frames, duplicate frames',
            frameCount: finalFrameCount || 25,
            fps: finalFPS || 8,
            motionStrength: finalMotionStrength || 0.8,
            useAnimateDiff: useAnimateDiff,
            useSVD: useSVD,
            cfg: options?.cfg || 6, // Wan 2.1 optimal: 5-8
            steps: options?.steps || 25, // Wan 2.1 safe max: 30
            character: options?.character,
            shotData: options?.shotData,
            currentScene: options?.currentScene,
            onProgress: onProgress,
          });
          // Free model, no credit deduction
          console.log(`✅ Tier 3 Success: ComfyUI + ${useAnimateDiff ? 'AnimateDiff' : 'SVD'}`);
          return result;
        } catch (comfyError: unknown) {
          const err = comfyError as { message?: string };
          console.error('❌ Tier 3 (ComfyUI Fallback) failed:', err);
          // Continue to other fallbacks
        }
      }
    }

    if (preferredModel === 'pollinations-video') {
      // Pollinations Video not available - fallback to Replicate AnimateDiff
      console.warn('⚠️ Pollinations Video not available, falling back to Replicate AnimateDiff...');

      // Try Replicate AnimateDiff as fallback
      const replicateKey = import.meta.env.VITE_REPLICATE_API_KEY;
      if (replicateKey) {
        try {
          console.log('🎬 Fallback: Trying Replicate AnimateDiff (from Pollinations)...');
          const videoUrl = await generateAnimateDiffVideo(
            enhancedPrompt,
            base64Image,
            {
              numFrames: finalFrameCount || 16,
              fps: finalFPS || 8,
              guidanceScale: 7.5,
              numInferenceSteps: 25,
            },
            onProgress
          );

          console.log('✅ Pollinations Fallback Success: Replicate AnimateDiff');

          // Persist video URL to permanent storage
          const permanentUrl = await persistVideoUrl(videoUrl, {
            projectId: options?.currentScene?.sceneDesign?.sceneName,
            sceneId: options?.currentScene?.sceneNumber?.toString(),
          });
          return permanentUrl;
        } catch (replicateError) {
          console.error('❌ Replicate fallback failed:', replicateError);
          throw new Error(
            'Pollinations Video not available. Replicate fallback also failed. Please try ComfyUI or Gemini Veo instead.'
          );
        }
      }

      throw new Error(
        'Pollinations Video not available and no Replicate API key configured. Please use ComfyUI or Gemini Veo instead.'
      );
    }

    if (preferredModel === 'luma-dream-machine' || preferredModel === 'runway-gen3') {
      // These are paid models, check credits
      const allModels = [
        ...Object.values(VIDEO_MODELS_CONFIG.BASIC || {}),
        ...Object.values(VIDEO_MODELS_CONFIG.PRO || {}),
        ...Object.values(VIDEO_MODELS_CONFIG.ENTERPRISE || {}),
      ];
      const modelConfig = allModels.find(m => m.id === preferredModel);
      if (modelConfig && modelConfig.costPerGen) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        deductCredits(modelConfig.costPerGen);
        throw new Error(
          `${preferredModel} integration coming soon! Credits deducted for simulation.`
        );
      }
      throw new Error(`${preferredModel} integration coming soon! Please select another model.`);
    }

    // Fallback Logic (if auto or failed)
    throw new Error(`Failed to generate video with ${preferredModel}. Please try another model.`);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('❌ Video generation failed:', error);
    throw new Error(`Failed to generate video: ${err.message}`);
  }
}

// =========================================================
// Shot List Generation (per-shot Costume & Fashion overrides)
// =========================================================

export async function generateShotListForScene(
  scene: {
    sceneNumber: number;
    sceneDesign: GeneratedScene['sceneDesign'];
  },
  scriptData: { language?: string; title?: string; logline?: string },
  existingShotList?: GeneratedScene['shotList'],
  continuity?: {
    previousScenes?: Array<
      Pick<GeneratedScene, 'sceneNumber' | 'sceneDesign' | 'shotList' | 'characterOutfits'>
    >;
  }
): Promise<GeneratedScene['shotList']> {
  try {
    requireGeminiApiKey('generateShotListForScene');

    const lang = typeof scriptData?.language === 'string' ? scriptData.language : 'Thai';
    const sceneName =
      typeof scene.sceneDesign?.sceneName === 'string' ? scene.sceneDesign.sceneName : '';
    const location =
      typeof scene.sceneDesign?.location === 'string' ? scene.sceneDesign.location : '';
    const moodTone =
      typeof scene.sceneDesign?.moodTone === 'string' ? scene.sceneDesign.moodTone : '';
    const characters = Array.isArray(scene.sceneDesign?.characters)
      ? scene.sceneDesign.characters
      : [];
    const situations = Array.isArray((scene.sceneDesign as any)?.situations)
      ? (scene.sceneDesign as any).situations
      : [];

    const situationSummary = situations
      .slice(0, 3)
      .map((s: any, idx: number) => {
        const desc = typeof s?.description === 'string' ? s.description : '';
        return desc ? `(${idx + 1}) ${desc}` : '';
      })
      .filter(Boolean)
      .join('\n');

    const continuityAnchors = Array.isArray(existingShotList)
      ? existingShotList
          .slice(0, 3)
          .map(s => {
            const shotNo = typeof (s as any)?.shot === 'number' ? (s as any).shot : undefined;
            const desc = typeof (s as any)?.description === 'string' ? (s as any).description : '';
            const cast = typeof (s as any)?.cast === 'string' ? (s as any).cast : '';
            return `${shotNo ?? '?'}: ${cast ? `cast=${cast}; ` : ''}${desc}`.trim();
          })
          .filter(Boolean)
          .join('\n')
      : '';

    const buildWardrobeCanonForScene = (s: any): string => {
      if (!s || typeof s !== 'object') return '';
      const location2 = typeof s?.sceneDesign?.location === 'string' ? s.sceneDesign.location : '';
      const outfits =
        s?.characterOutfits && typeof s.characterOutfits === 'object' ? s.characterOutfits : null;
      const outfitLine = outfits
        ? Object.entries(outfits)
            .filter(
              ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
            )
            .slice(0, 10)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')
        : '';
      const shotList2: any[] = Array.isArray(s?.shotList) ? s.shotList : [];
      const costumeCanon = shotList2
        .map(x => (typeof x?.costume === 'string' ? x.costume.trim() : ''))
        .filter(Boolean)
        .slice(0, 1)
        .join('');
      const cf = shotList2.find(
        x => x?.costumeFashion && typeof x.costumeFashion === 'object'
      )?.costumeFashion;
      const cfSummary =
        cf && typeof cf === 'object'
          ? Object.entries(cf)
              .filter(
                ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
              )
              .slice(0, 6)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')
          : '';
      return (
        `Scene ${typeof s?.sceneNumber === 'number' ? s.sceneNumber : '?'}${location2 ? ` @ ${location2}` : ''}\n` +
        (outfitLine ? `- characterOutfits: ${outfitLine}\n` : '') +
        (costumeCanon ? `- costume CANON: ${costumeCanon}\n` : '') +
        (cfSummary ? `- costumeFashion CANON: ${cfSummary}\n` : '')
      ).trim();
    };

    const previousWardrobeCanon = Array.isArray(continuity?.previousScenes)
      ? continuity!
          .previousScenes!.filter(Boolean)
          .sort((a, b) => Number(b.sceneNumber) - Number(a.sceneNumber))
          .slice(0, 2)
          .map(s => buildWardrobeCanonForScene(s))
          .filter(Boolean)
          .join('\n\n')
      : '';

    // 📍 Extract Location Details if available
    const locationDetails = (scene.sceneDesign as any)?.locationDetails;
    const locationContext = formatLocationDetailsForPrompt(locationDetails);

    const prompt = `You are a professional cinematographer and script supervisor.

Task: Generate a COMPLETE Shot List (5-8 shots) for the scene below.

Language: ${lang}
Scene: ${scene.sceneNumber}${sceneName ? ` — ${sceneName}` : ''}
Location: ${location || 'N/A'}
Tone/Mood: ${moodTone || 'N/A'}
Characters (MUST NOT add/remove): ${JSON.stringify(characters)}

Situations (context):
${situationSummary || 'N/A'}

Continuity anchors (keep wardrobe/age/identity consistent across shots):
${continuityAnchors || 'N/A'}

Previous scene wardrobe canon (use if this scene is continuous with prior scene(s)):
${previousWardrobeCanon || 'N/A'}
${locationContext}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON (no markdown).
- Output must be a JSON array of shot objects.
- Each shot MUST include ALL fields:
  scene, shot, description, durationSec, shotSize, perspective, movement, equipment, focalLength, aspectRatio, lightingDesign, colorTemperature, cast, costume, costumeFashion, set, visualEffects
- "cast" must list only characters from the provided character list (comma-separated string).
- "costume" is a short human-readable summary.
- "costumeFashion" MUST be a JSON object with the SAME schema as Step 3 Costume & Fashion (Record<string,string>), with at least these keys filled:
  "Style Concept", "Main Outfit", "Shoe", "Color Palette", "Accessories", "Condition/Texture"
- Keep costumes consistent across the scene unless a change is explicitly required by the action.
- If the scene is continuous with previous scene(s), COPY the wardrobe canon EXACTLY (especially costumeFashion keys/values) unless the story explicitly requires a change.
- USE Location Details to enhance shot descriptions with accurate environmental context (atmosphere, lighting, colors, sensory details).
- Consider the physical space dimensions when planning camera movements and shot sizes.

Example shot object:
{
  "scene": "${scene.sceneNumber}",
  "shot": 1,
  "description": "...",
  "durationSec": 3,
  "shotSize": "MS",
  "perspective": "Eye-Level",
  "movement": "Static",
  "equipment": "Tripod",
  "focalLength": "50mm",
  "aspectRatio": "16:9",
  "lightingDesign": "...",
  "colorTemperature": "Neutral (5600K)",
  "cast": "${characters.join(', ')}",
  "costume": "...",
  "costumeFashion": {
    "Style Concept": "...",
    "Main Outfit": "...",
        "Shoe": "...",
    "Color Palette": "...",
    "Accessories": "...",
    "Condition/Texture": "..."
  },
  "set": "...",
  "visualEffects": "None"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    if (!response || !response.text) {
      throw new Error('No response from AI model');
    }

    const text = extractJsonFromResponse(response.text || '[]');
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      throw new Error('Shot list response is not an array');
    }

    // Best-effort normalize + keep required fields present
    return parsed.map((s: any, idx: number) => {
      const shotNo = typeof s?.shot === 'number' ? s.shot : idx + 1;
      const costumeFashion =
        s?.costumeFashion && typeof s.costumeFashion === 'object' ? s.costumeFashion : undefined;
      return {
        scene: String(s?.scene ?? scene.sceneNumber),
        shot: shotNo,
        description: String(s?.description ?? ''),
        durationSec: Number(s?.durationSec ?? 3),
        shotSize: String(s?.shotSize ?? 'MS'),
        perspective: String(s?.perspective ?? 'Eye-Level'),
        movement: String(s?.movement ?? 'Static'),
        equipment: String(s?.equipment ?? 'Tripod'),
        focalLength: String(s?.focalLength ?? '50mm'),
        aspectRatio: String(s?.aspectRatio ?? '16:9'),
        lightingDesign: String(s?.lightingDesign ?? 'Neutral'),
        colorTemperature: String(s?.colorTemperature ?? 'Neutral (5600K)'),
        cast: String(s?.cast ?? characters.join(', ')),
        costume: String(s?.costume ?? ''),
        costumeFashion: costumeFashion as Record<string, string> | undefined,
        set: String(s?.set ?? (location || '')),
        visualEffects: String(s?.visualEffects ?? 'None'),
      };
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error generating shot list:', error);
    throw new Error(err.message || 'Failed to generate shot list');
  }
}

export async function regenerateShotListItem(
  scene: {
    sceneNumber: number;
    sceneDesign: GeneratedScene['sceneDesign'];
  },
  shotNumber: number,
  scriptData: { language?: string },
  context: {
    previousShot?: Partial<GeneratedScene['shotList'][number]>;
    currentShot?: Partial<GeneratedScene['shotList'][number]>;
    nextShot?: Partial<GeneratedScene['shotList'][number]>;
  },
  continuity?: {
    previousScenes?: Array<
      Pick<GeneratedScene, 'sceneNumber' | 'sceneDesign' | 'shotList' | 'characterOutfits'>
    >;
  },
  mode?: 'fresh' | 'refine' | 'edited'
): Promise<GeneratedScene['shotList'][number]> {
  try {
    requireGeminiApiKey('regenerateShotListItem');

    const lang = typeof scriptData?.language === 'string' ? scriptData.language : 'Thai';
    const sceneName =
      typeof scene.sceneDesign?.sceneName === 'string' ? scene.sceneDesign.sceneName : '';
    const location =
      typeof scene.sceneDesign?.location === 'string' ? scene.sceneDesign.location : '';
    const moodTone =
      typeof scene.sceneDesign?.moodTone === 'string' ? scene.sceneDesign.moodTone : '';
    const characters = Array.isArray(scene.sceneDesign?.characters)
      ? scene.sceneDesign.characters
      : [];

    const buildWardrobeCanonForScene = (s: any): string => {
      if (!s || typeof s !== 'object') return '';
      const location2 = typeof s?.sceneDesign?.location === 'string' ? s.sceneDesign.location : '';
      const outfits =
        s?.characterOutfits && typeof s.characterOutfits === 'object' ? s.characterOutfits : null;
      const outfitLine = outfits
        ? Object.entries(outfits)
            .filter(
              ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
            )
            .slice(0, 10)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')
        : '';
      const shotList2: any[] = Array.isArray(s?.shotList) ? s.shotList : [];
      const costumeCanon = shotList2
        .map(x => (typeof x?.costume === 'string' ? x.costume.trim() : ''))
        .filter(Boolean)
        .slice(0, 1)
        .join('');
      const cf = shotList2.find(
        x => x?.costumeFashion && typeof x.costumeFashion === 'object'
      )?.costumeFashion;
      const cfSummary =
        cf && typeof cf === 'object'
          ? Object.entries(cf)
              .filter(
                ([k, v]) => typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()
              )
              .slice(0, 6)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')
          : '';
      return (
        `Scene ${typeof s?.sceneNumber === 'number' ? s.sceneNumber : '?'}${location2 ? ` @ ${location2}` : ''}\n` +
        (outfitLine ? `- characterOutfits: ${outfitLine}\n` : '') +
        (costumeCanon ? `- costume CANON: ${costumeCanon}\n` : '') +
        (cfSummary ? `- costumeFashion CANON: ${cfSummary}\n` : '')
      ).trim();
    };

    const previousWardrobeCanon = Array.isArray(continuity?.previousScenes)
      ? continuity!
          .previousScenes!.filter(Boolean)
          .sort((a, b) => Number(b.sceneNumber) - Number(a.sceneNumber))
          .slice(0, 2)
          .map(s => buildWardrobeCanonForScene(s))
          .filter(Boolean)
          .join('\n\n')
      : '';

    // Determine instructions based on mode
    const regenerationMode = mode || 'refine';
    let modeInstructions = '';
    
    if (regenerationMode === 'fresh') {
      modeInstructions = `
🔄 FRESH START MODE:
- Create a completely NEW shot from scratch
- Use ONLY basic scene information (Scene Details, characters, location)
- DO NOT reference or consider the existing shot data
- Focus on creating a fresh, innovative approach
`;
    } else if (regenerationMode === 'refine') {
      modeInstructions = `
✨ REFINE EXISTING MODE:
- Improve the CURRENT shot while keeping its core structure
- Analyze and enhance the existing shot details
- Add missing details, improve descriptions, ensure continuity
- Keep the same general approach but make it better
`;
    } else if (regenerationMode === 'edited') {
      modeInstructions = `
📝 USE EDITED DATA MODE:
- Take into account ANY manual edits made to the shot
- Build upon the edited data provided in "Current shot"
- Create new content that aligns with and complements the edits
- Ensure consistency between edited fields and newly generated ones
`;
    }

    const prompt = `You are a professional cinematographer and script supervisor.

Task: Regenerate ONLY one shot list row for the scene below.

${modeInstructions}

Language: ${lang}
Scene: ${scene.sceneNumber}${sceneName ? ` — ${sceneName}` : ''}
Location: ${location || 'N/A'}
Tone/Mood: ${moodTone || 'N/A'}
Characters (MUST NOT add/remove): ${JSON.stringify(characters)}

Target shot number: ${shotNumber}

Continuity context (keep wardrobe/age/identity consistent):
- Previous shot: ${JSON.stringify(context.previousShot || null)}
- Current shot (to improve): ${JSON.stringify(context.currentShot || null)}
- Next shot: ${JSON.stringify(context.nextShot || null)}

Previous scene wardrobe canon (use if this scene is continuous with prior scene(s)):
${previousWardrobeCanon || 'N/A'}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON (no markdown).
- Output must be a single shot object (NOT an array).
- The shot number MUST remain ${shotNumber}.
- The object MUST include ALL fields:
  scene, shot, description, durationSec, shotSize, perspective, movement, equipment, focalLength, aspectRatio, lightingDesign, colorTemperature, cast, costume, costumeFashion, set, visualEffects
- "cast" must list only characters from the provided character list (comma-separated string).
- "costumeFashion" MUST be a JSON object with keys:
  "Style Concept", "Main Outfit", "Shoe", "Color Palette", "Accessories", "Condition/Texture".
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    if (!response || !response.text) {
      throw new Error('No response from AI model');
    }

    const text = extractJsonFromResponse(response.text || '{}');
    const s = JSON.parse(text);

    const costumeFashion =
      s?.costumeFashion && typeof s.costumeFashion === 'object' ? s.costumeFashion : undefined;

    return {
      scene: String(s?.scene ?? scene.sceneNumber),
      shot: shotNumber,
      description: String(s?.description ?? ''),
      durationSec: Number(s?.durationSec ?? 3),
      shotSize: String(s?.shotSize ?? 'MS'),
      perspective: String(s?.perspective ?? 'Eye-Level'),
      movement: String(s?.movement ?? 'Static'),
      equipment: String(s?.equipment ?? 'Tripod'),
      focalLength: String(s?.focalLength ?? '50mm'),
      aspectRatio: String(s?.aspectRatio ?? '16:9'),
      lightingDesign: String(s?.lightingDesign ?? 'Neutral'),
      colorTemperature: String(s?.colorTemperature ?? 'Neutral (5600K)'),
      cast: String(s?.cast ?? characters.join(', ')),
      costume: String(s?.costume ?? ''),
      costumeFashion: costumeFashion as Record<string, string> | undefined,
      set: String(s?.set ?? (location || '')),
      visualEffects: String(s?.visualEffects ?? 'None'),
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error regenerating shot list item:', error);
    throw new Error(err.message || 'Failed to regenerate shot list item');
  }
}

export async function generateMoviePoster(
  scriptData: ScriptData,
  customPrompt?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('\n🎬 ═══════════════════════════════════════════════════════');
    console.log('🎬 POSTER GENERATION STARTED');
    console.log('🎬 ═══════════════════════════════════════════════════════');
    
    let prompt = '';
    
    // 🎯 Find protagonist's face image for Face ID
    let protagonistFaceImage: string | undefined = undefined;
    let protagonistGender: string | undefined = undefined;
    
    console.log('📊 Total characters:', scriptData.characters?.length || 0);
    if (scriptData.characters && scriptData.characters.length > 0) {
      console.log('📝 Character list:');
      scriptData.characters.forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.name} (${c.role || 'no role'})`);
        console.log(`     - faceReferenceImage: ${c.faceReferenceImage ? '✅ YES' : '❌ NO'}`);
        console.log(`     - image: ${c.image ? '✅ YES' : '❌ NO'}`);
        console.log(`     - physical.Gender: ${c.physical?.Gender || 'N/A'}`);
      });
    }
    
    const protagonist = scriptData.characters?.find(c => 
      c.role?.toLowerCase().includes('protagonist') || 
      c.name === scriptData.characters?.[0]?.name
    );
    
    if (protagonist) {
      console.log('\n🎭 ✅ Protagonist found:', protagonist.name);
      console.log('   Role:', protagonist.role);
      
      // Get face image - validate Base64 format
      if (protagonist.faceReferenceImage) {
        const imageData = protagonist.faceReferenceImage;
        // Validate that it's actually a Base64 image, not text
        if (imageData.startsWith('data:image/') || imageData.match(/^[A-Za-z0-9+/=]+$/)) {
          protagonistFaceImage = imageData;
          console.log('   📸 ✅ Using faceReferenceImage:', imageData.substring(0, 80) + '...');
        } else {
          console.warn('   ⚠️ faceReferenceImage is not Base64 data (found text):', imageData.substring(0, 100));
          console.log('   📸 ❌ Skipping invalid image data');
        }
      } else if (protagonist.image) {
        const imageData = protagonist.image;
        // Validate that it's actually a Base64 image, not text
        if (imageData.startsWith('data:image/') || imageData.match(/^[A-Za-z0-9+/=]+$/)) {
          protagonistFaceImage = imageData;
          console.log('   📸 ✅ Using image:', imageData.substring(0, 80) + '...');
        } else {
          console.warn('   ⚠️ image is not Base64 data (found text):', imageData.substring(0, 100));
          console.log('   📸 ❌ Skipping invalid image data');
        }
      } else {
        console.log('   📸 ❌ NO FACE IMAGE - will use text-only prompt');
      }
      
      // Get gender (Iteration 13.9.2)
      if (protagonist.physical?.Gender) {
        protagonistGender = protagonist.physical.Gender;
        console.log('   ⚧️ ✅ Gender from profile:', protagonistGender);
      } else {
        console.log('   ⚧️ ❌ NO GENDER INFO');
      }
      
      // Show all physical data
      if (protagonist.physical) {
        console.log('   📋 Physical data:', JSON.stringify(protagonist.physical, null, 2));
      }
    } else {
      console.log('\n🎭 ❌ NO PROTAGONIST FOUND');
      console.log('   Will generate poster without Face ID');
    }
    
    if (customPrompt && customPrompt.trim().length > 0) {
      // User provided custom prompt - enhance it with language directive
      prompt = customPrompt;

      // 🇹🇭 CRITICAL: Add language directive based on project language
      if (scriptData.language === 'Thai') {
        prompt +=
          ' TEXT IN THAI LANGUAGE ONLY. ตัวหนังสือต้องเป็นภาษาไทยเท่านั้น. NO CHINESE, NO ENGLISH TEXT.';
      } else if (scriptData.language === 'English') {
        prompt += ' TEXT IN ENGLISH ONLY. No Chinese, No Thai text.';
      }
    } else {
      // Build comprehensive prompt from Step 1-3 data
      const parts = [
        `Movie Poster for "${scriptData.title}".`,
        `Main Genre: ${scriptData.mainGenre}.`,
      ];

      // Add secondary genres if available
      const secondaryGenres = scriptData.secondaryGenres?.filter(
        g => g && g !== scriptData.mainGenre
      );
      if (secondaryGenres && secondaryGenres.length > 0) {
        parts.push(`Secondary Genres: ${secondaryGenres.join(', ')}.`);
      }

      // Add story boundary elements if available (Step 2)
      if (scriptData.premise) {
        parts.push(`Story: ${scriptData.premise.substring(0, 150)}.`);
      } else if (scriptData.logLine) {
        parts.push(`Story: ${scriptData.logLine}.`);
      } else if (scriptData.bigIdea) {
        parts.push(`Concept: ${scriptData.bigIdea.substring(0, 150)}.`);
      }

      // 🎭 ENHANCED: Add ALL characters from Step 3 with physical details
      if (scriptData.characters && scriptData.characters.length > 0) {
        const characterDescriptions = scriptData.characters
          .filter(c => c.name && c.name.trim() !== '')
          .slice(0, 5) // Limit to top 5 characters to avoid prompt overflow
          .map(c => {
            const desc = c.description?.substring(0, 80) || c.role || 'character';
            
            // 🔥 Add physical features (Iteration 13.9.2)
            const physical = c.physical || {};
            const physicalParts: string[] = [];
            
            if (physical.Gender) physicalParts.push(physical.Gender);
            if (physical.Age) physicalParts.push(`${physical.Age} years old`);
            if (physical.Ethnicity) physicalParts.push(physical.Ethnicity);
            if (physical.Hair) physicalParts.push(`${physical.Hair} hair`);
            
            const physicalDesc = physicalParts.length > 0 
              ? ` [${physicalParts.join(', ')}]` 
              : '';
            
            return `${c.name}${physicalDesc} - ${desc}`;
          });

        if (characterDescriptions.length > 0) {
          parts.push(`Characters: ${characterDescriptions.join(', ')}.`);
        }
      }

      // 🇹🇭 CRITICAL: Add language directive based on project language
      if (scriptData.language === 'Thai') {
        parts.push(
          'TEXT IN THAI LANGUAGE ONLY. ตัวหนังสือในโปสเตอร์ต้องเป็นภาษาไทยเท่านั้น. NO CHINESE, NO ENGLISH TEXT.'
        );
      } else if (scriptData.language === 'English') {
        parts.push('TEXT IN ENGLISH ONLY. No Chinese, No Thai text.');
      }

      // Add visual style
      parts.push('Style: Cinematic, High Contrast, Professional Movie Poster, 4K Resolution.');

      prompt = parts.join(' ');
    }

    console.log('\n📝 Final prompt:', prompt.substring(0, 200) + '...');
    console.log('\n🎯 Face ID Configuration:');
    console.log('   referenceImage:', protagonistFaceImage ? '✅ YES (' + protagonistFaceImage.substring(0, 50) + '...)' : '❌ NO');
    console.log('   gender:', protagonistGender || '❌ NO');
    
    // 🇹🇭 CRITICAL: Force Gemini for Thai language (SDXL doesn't support Thai text)
    const isThai = scriptData.language === 'Thai';
    if (isThai) {
      console.log('\n⚠️ THAI LANGUAGE DETECTED - Using Gemini 2.5 Pro (SDXL does not support Thai)');
      console.log('🎬 ═══════════════════════════════════════════════════════\n');
      
      return await generateImageWithCascade(prompt, {
        preferredModel: 'gemini-pro', // 🇹🇭 Force Gemini for Thai
        negativePrompt: NEGATIVE_PROMPT_COMPREHENSIVE + ', chinese characters, wrong language text',
        onProgress: onProgress,
        referenceImage: protagonistFaceImage,
        gender: protagonistGender,
      });
    }
    
    console.log('\n🎬 Calling generateImageWithCascade (SDXL)...');
    console.log('🎬 ═══════════════════════════════════════════════════════\n');

    // 🎯 Pass protagonist face to InstantID (Iteration 13.9.2)
    return await generateImageWithCascade(prompt, {
      useLora: true,
      loraType: 'DETAIL_ENHANCER',
      negativePrompt: NEGATIVE_PROMPT_COMPREHENSIVE + ', chinese characters, wrong language text',
      onProgress: onProgress,
      referenceImage: protagonistFaceImage, // 🔥 Enable Face ID if face available
      gender: protagonistGender, // 🔥 Pass gender from profile
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error generating movie poster:', error);
    throw new Error(err.message || 'Failed to generate movie poster.');
  }
}

// ============================================================================
// STEP 2: BOUNDARY GENERATION
// ============================================================================

/**
 * Generate story boundary from Step 1 data (genre, type)
 * Creates: title, bigIdea, premise, theme, logLine, timeline
 */
export async function generateBoundary(
  scriptData: ScriptData,
  mode: 'fresh' | 'refine' | 'use-edited' = 'fresh',
  fieldName?: 'bigIdea' | 'premise' | 'theme' | 'logLine' | 'synopsis' | 'timeline'
): Promise<Partial<ScriptData>> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;
  console.log(
    `🧠 Generating Boundary. Language: ${scriptData.language}, Mode: ${mode}, Field: ${fieldName || 'all'}`
  );
  try {
    const isThai = scriptData.language === 'Thai';
    const langInstruction = isThai
      ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY (ภาษาไทยเท่านั้น). Even if the input context is in English, you MUST translate and expand the concepts into Thai. Do not output English text for values. Only JSON keys should be English.'
      : 'Output in English.';

    // Mode-specific context
    let modeInstruction = '';
    if (mode === 'fresh') {
      modeInstruction =
        '\n**REGENERATION MODE: Fresh Start**\nGenerate completely new content without referencing existing data. Create original ideas.';
    } else if (mode === 'refine') {
      const currentValue = fieldName
        ? fieldName === 'timeline'
          ? JSON.stringify(scriptData.timeline)
          : scriptData[fieldName as keyof ScriptData]
        : JSON.stringify({
            bigIdea: scriptData.bigIdea,
            premise: scriptData.premise,
            theme: scriptData.theme,
            logLine: scriptData.logLine,
            synopsis: scriptData.synopsis,
            timeline: scriptData.timeline,
          });
      modeInstruction = `\n**REGENERATION MODE: Refine Existing**\nImprove and enhance the existing content while keeping its core structure and ideas:\n${fieldName ? `- Current ${fieldName}: ${currentValue || 'Not set'}` : `- Current Data: ${currentValue}`}`;
    } else if (mode === 'use-edited') {
      const currentValue = fieldName
        ? fieldName === 'timeline'
          ? JSON.stringify(scriptData.timeline)
          : scriptData[fieldName as keyof ScriptData]
        : JSON.stringify({
            bigIdea: scriptData.bigIdea,
            premise: scriptData.premise,
            theme: scriptData.theme,
            logLine: scriptData.logLine,
            synopsis: scriptData.synopsis,
            timeline: scriptData.timeline,
          });
      modeInstruction = `\n**REGENERATION MODE: Use Edited Data**\nBuild upon user's edits and expand naturally:\n${fieldName ? `- User's Edit for ${fieldName}: ${currentValue || 'Not set'}` : `- User's Edits: ${currentValue}`}`;
    }

    // Field-specific prompt or full prompt
    let fieldSpecificPrompt = '';
    if (fieldName) {
      fieldSpecificPrompt = `\n**FIELD-SPECIFIC GENERATION**\nOnly generate the "${fieldName}" field. Use existing data as context but focus on creating excellent content for this specific field.`;
    }

    const prompt = `You are an expert Hollywood scriptwriter and story consultant. Based on the following story foundation, create a comprehensive boundary (framework) for the story.

**Language Requirement:**
${langInstruction}
${isThai ? '⚠️ IMPORTANT: The user wants the result in THAI. Ignore the language of the input context and generate the output in THAI.' : ''}
${modeInstruction}
${fieldSpecificPrompt}

**Story Foundation from Step 1:**
- **Title (USER PROVIDED - DO NOT CHANGE)**: ${scriptData.title || 'Untitled'}
- **Main Genre**: ${scriptData.mainGenre}
- **Secondary Genres**: ${scriptData.secondaryGenres?.filter(g => g).join(', ') || 'None'}
- **Project Type**: ${scriptData.projectType}
- **Additional Context**: ${scriptData.logLine || scriptData.premise || scriptData.bigIdea || 'Not provided'}

**Your Task:**
Generate a complete story boundary with the following elements, BASED ON THE USER'S TITLE "${scriptData.title || 'Untitled'}":

1. **Title**: MUST return exactly "${scriptData.title || 'Untitled'}" - DO NOT create a new title

2. **Big Idea**: The core "What if..." concept or central premise that drives the entire narrative (2-3 sentences)
   - This is the hook, the unique angle that makes this story worth telling
   - Must connect directly to the Theme

3. **Premise**: What the story is fundamentally about - the external journey and internal transformation (3-4 sentences)
   - Focus on the protagonist's journey from point A to point B
   - Include both external plot and internal character arc

4. **Theme** (⭐⭐⭐ MOST CRITICAL - THE MORAL COMPASS & CONTROLLING BOUNDARY):
   
   **Theme คือหัวใจและหลักการสำคัญที่สุดของเรื่อง - เป็นความจริงสากลที่ตัวละครและผู้ชมจะได้เรียนรู้ไปพร้อมกัน**
   
   📖 **What is Theme:**
   Theme is the universal truth, moral lesson, or principle that governs the entire story. It is the BOUNDARY that:
   - Controls the story's direction and keeps it morally grounded
   - Ensures the narrative doesn't contradict natural laws or moral principles (ไม่ขัดแย้งกับหลักธรรมชาติและหลักธรรม)
   - Serves as the moral compass for all character decisions and plot events
   - Teaches both protagonist and audience the same profound lesson through lived experience
   
   🎯 **Core Requirements:**
   1. **Universal Truth** - Must be based on timeless, natural laws that apply across cultures and eras:
      - Laws of cause and effect (กรรม-ผล / karma)
      - Natural consequences (actions lead to results)
      - Moral principles (honesty, compassion, justice, courage, sacrifice)
      - Human nature truths (fear, love, greed, redemption)
   
   2. **Non-Contradictory to Natural/Moral Laws** - Theme MUST align with:
      - ✅ Truth always emerges (not "lies succeed permanently")
      - ✅ Love requires sacrifice (not "selfishness brings happiness")
      - ✅ Violence begets violence (not "revenge brings peace")
      - ✅ Greed leads to downfall (not "corruption has no consequences")
      - ✅ Courage overcomes fear (not "avoidance solves problems")
      - ✅ Compassion heals (not "cruelty is rewarded")
   
   3. **Story Control Function** - Theme acts as the BOUNDARY that:
      - Determines what events CAN and CANNOT happen
      - Guides protagonist's arc from false belief to truth
      - Creates consistent cause-and-effect chain
      - Ensures satisfying, morally coherent resolution
   
   4. **Dual Learning Path** - Both character AND audience must:
      - Start from the same false belief or ignorance
      - Experience the same challenges and revelations
      - Arrive at the same universal truth together
      - Take away the same profound lesson
   
   📝 **Format Instructions:**
   Write 3-4 sentences that clearly articulate:
   
   a) **State the Universal Truth** (ความจริงสากล):
      Example: "This story teaches that true courage is not the absence of fear, but the willingness to act righteously despite it"
   
   b) **Connect to Big Idea** (เชื่อมโยงกับ Big Idea):
      Explain how this theme naturally emerges from the story's premise
   
   c) **Demonstrate Through Journey** (แสดงผ่านการเดินทางของตัวละคร):
      Describe how the protagonist will learn this truth through trials and consequences
   
   d) **Audience Lesson** (บทเรียนสำหรับผู้ชม):
      State what wisdom the audience will gain by witnessing this journey
   
   ✨ **Examples of Profound, Dharma-Aligned Themes:**
   
   - **Karma/Consequence**: "Every action creates ripples - good deeds plant seeds of joy, while harmful acts inevitably return as suffering. Through [protagonist]'s journey from selfishness to compassion, both character and audience learn that we cannot escape the consequences of our choices."
   
   - **Truth vs. Deception**: "Lies may offer temporary shelter, but truth is the only foundation for lasting peace. As [protagonist] discovers that each deception creates a heavier burden, the audience witnesses how honesty, though painful, liberates the soul."
   
   - **Love & Sacrifice**: "True love is proven not in words but in sacrifice - the willingness to put another's wellbeing above our own desires. Both [protagonist] and viewers learn that love without sacrifice is merely attachment, while genuine sacrifice transforms both giver and receiver."
   
   - **Greed's Downfall**: "Greed, like fire, consumes everything - including the greedy. Through [protagonist]'s loss of all they hoarded, the story demonstrates that contentment brings more peace than endless accumulation ever could."
   
   - **Redemption**: "No person is beyond redemption, but redemption requires facing the full weight of our wrongdoings. As [protagonist] confronts their past harm and makes genuine amends, we learn that transformation comes through accountability, not avoidance."
   
   - **Courage & Fear**: "Fear is a teacher, not a master - it shows us what matters most. Through [protagonist]'s journey from paralysis to action, both character and audience discover that courage means acting for what is right despite trembling hands."
   
   ⚠️ **CRITICAL RULES:**
   - Theme MUST be consistent with Big Idea (they must support each other)
   - Theme MUST NOT contradict natural laws or moral principles
   - Theme MUST guide all plot decisions (if an event contradicts the theme, it doesn't belong)
   - Theme MUST offer genuine wisdom, not cynicism or nihilism
   - Theme IS the moral compass - without it, the story loses direction and meaning
   
   **Remember**: Theme is not just a message - it is the CONTROLLING PRINCIPLE that ensures your story has moral integrity, emotional truth, and lasting impact.

5. **Log Line**: A one-sentence pitch that encapsulates the premise and hints at the theme, hooking the audience with the central conflict

6. **Synopsis**: A comprehensive 3-Act structure summary of the complete story arc
   
   **CRITICAL FORMAT REQUIREMENT:**
   You MUST structure the synopsis in 3 clearly separated acts using this EXACT format:
   
   ACT 1 (Setup):
   [2-3 sentences describing the ordinary world, inciting incident, and protagonist's initial state]
   
   ACT 2 (Confrontation):
   [3-4 sentences covering the rising action, major obstacles, midpoint twist, and protagonist's struggles]
   
   ACT 3 (Resolution):
   [2-3 sentences showing the climax, resolution, and how the theme is proven through the protagonist's transformation]
   
   **Content Guidelines:**
   - ACT 1: Introduce protagonist, their world, the inciting incident, and their initial belief/flaw
   - ACT 2: Show escalating challenges, internal/external conflicts, major setbacks, and the point of no return
   - ACT 3: Climax where theme is tested, resolution of conflict, and protagonist's transformation complete
   - Each act should flow naturally into the next
   - End with emotional/thematic resonance aligned with the Theme
   - Total length: 150-250 words
   
   **Example Structure (Thai):**
   ACT 1 (Setup):
   [ตัวละครหลักในโลกปกติของพวกเขา] [เหตุการณ์กระตุ้นเกิดขึ้น] [พวกเขาตัดสินใจก้าวเข้าสู่การผจญภัย]
   
   ACT 2 (Confrontation):
   [พวกเขาเผชิญกับอุปสรรคแรก] [ความขัดแย้งทวีความรุนแรง] [จุดกึ่งกลาง - การเปิดเผยที่สำคัญ] [ความมืดมิดที่สุด/วิกฤตครั้งใหญ่]
   
   ACT 3 (Resolution):
   [การเผชิญหน้าครั้งสุดท้าย] [ธีมถูกพิสูจน์ผ่านการเลือกของตัวละคร] [การเปลี่ยนแปลงและความสมหวัง]

7. **Timeline**: Complete timeline context including:
   - movieTiming: MUST be a NUMBER in minutes ONLY (e.g., "120 นาที" for Thai or "120 minutes" for English). For series, estimate total runtime.
   - seasons: What season(s) the story spans
   - date: MUST be CALENDAR DATES with START and END dates (e.g., "1 มกราคม 2567 - 15 มกราคม 2567" for Thai or "January 1, 2024 - January 15, 2024" for English). NOT descriptive text. Use actual day/month/year format.
   - social: Social/cultural context of the time period
   - economist: Economic conditions affecting the story
   - environment: Environmental/geographical setting details

**Genre-Specific Guidelines:**
${getGenreGuidelines(scriptData.mainGenre)}

**Story Type Considerations:**
${getTypeGuidelines(scriptData.projectType)}

**Language Instruction (REPEAT):**
${langInstruction}

Return ONLY a valid JSON object with this exact structure:
{
  "title": "...",
  "bigIdea": "...",
  "premise": "...",
  "theme": "...",
  "logLine": "...",
  "synopsis": "...",
  "timeline": {
    "movieTiming": "120 นาที",
    "seasons": "...",
    "date": "1 มกราคม 2567 - 15 มกราคม 2567",
    "social": "...",
    "economist": "...",
    "environment": "..."
  }
}

IMPORTANT:
- Make it compelling and professional
- Ensure all elements are cohesive and support each other
- Be specific and creative
- Consider the genre and type throughout
- movieTiming MUST be numeric minutes (e.g., "90 นาที", "120 นาที", "150 นาที")
- date MUST be calendar dates with start and end (e.g., "1 ม.ค. 2567 - 15 ม.ค. 2567" or "Jan 1, 2024 - Jan 15, 2024")`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const result = JSON.parse(text);

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Story Boundary)',
        provider: 'gemini',
        costInCredits: 2,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Story Boundary Generation',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    console.log('✅ Generated boundary:', result);
    return result;
  } catch (error) {
    console.error('Error generating boundary:', error);
    throw new Error('Failed to generate boundary from AI.');
  }
}

/**
 * Generate a creative title based on Step 1 data (excluding current title)
 */
export async function generateTitle(scriptData: ScriptData): Promise<string> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;
  console.log(`🧠 Generating Title. Language: ${scriptData.language}`);
  try {
    const isThai = scriptData.language === 'Thai';
    const langInstruction = isThai
      ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY (ภาษาไทยเท่านั้น). Generate a creative Thai title.'
      : 'Output in English.';

    const prompt = `You are an expert Hollywood title creator. Based on the following story foundation, create ONE creative and compelling title.

**Language Requirement:**
${langInstruction}

**Story Foundation:**
- Main Genre: ${scriptData.mainGenre}
- Secondary Genres: ${scriptData.secondaryGenres?.filter(g => g).join(', ') || 'None'}
- Project Type: ${scriptData.projectType}

**Your Task:**
Create a single, powerful title that captures the essence of this ${scriptData.mainGenre} story. The title should be:
- Memorable and unique
- Appropriate for the genre(s)
- Concise (1-5 words)
- Evocative and intriguing

Return ONLY a JSON object:
{
  "title": "Your Generated Title Here"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 1.2, // High creativity for title generation
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const result = JSON.parse(text);

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Title Generation)',
        provider: 'gemini',
        costInCredits: 1,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Title Generation',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    console.log('✅ Generated title:', result.title);
    return result.title;
  } catch (error) {
    console.error('Error generating title:', error);
    throw new Error('Failed to generate title from AI.');
  }
}

/**
 * Get genre-specific writing guidelines
 */
function getGenreGuidelines(genre: string): string {
  const guidelines: Record<string, string> = {
    Drama:
      'Focus on character development, emotional depth, and realistic conflicts. Explore internal struggles and relationships.',
    Comedy:
      'Emphasize humor, wit, and entertaining situations. Balance laughs with heart and relatable characters.',
    Horror:
      'Build tension and fear. Consider what terrifies the audience. Include atmospheric elements and psychological depth.',
    Action:
      'High stakes, physical conflict, and exciting set pieces. Hero must overcome increasingly difficult challenges.',
    Romance:
      'Emotional connection between characters. Obstacles that test their love. Satisfying emotional payoff.',
    'Sci-Fi':
      'Explore "what if" scenarios with technology or future. Ground fantastical elements with human emotion.',
    Thriller:
      'Suspense and tension building. Plot twists. Protagonist in danger, racing against time.',
    Fantasy:
      "World-building is key. Magic/fantastical elements must have rules. Hero's journey in extraordinary world.",
    Mystery:
      'Clues, red herrings, and a satisfying reveal. Detective/investigator protagonist uncovering truth.',
    Adventure:
      'Journey and discovery. Exotic locations. Character growth through challenges and exploration.',
    Western:
      'Frontier justice, moral codes, and rugged individuals. Themes of civilization vs. wilderness.',
    Musical:
      'Songs advance plot and character. Emotional expression through music. Spectacle and performance.',
    Documentary:
      'Real events and people. Factual accuracy with compelling narrative. Educational with emotional impact.',
    Animation:
      'Visual creativity. Can be any genre but with unique visual storytelling opportunities.',
    War: 'Human cost of conflict. Brotherhood, sacrifice, and moral complexity of war.',
    Crime: 'Criminal underworld, law enforcement, or heist. Moral ambiguity and tension.',
    Biopic:
      "Real person's life journey. Key moments that define them. Historical accuracy with dramatic license.",
    Sports: 'Underdog story, training montage, big game. Themes of teamwork and perseverance.',
  };

  return (
    guidelines[genre] ||
    'Create a compelling story that engages the audience and follows the conventions of your chosen genre.'
  );
}

/**
 * Get type-specific formatting guidelines
 */
function getTypeGuidelines(type: string): string {
  const guidelines: Record<string, string> = {
    feature:
      'Feature film (90-120 minutes): Three-act structure with deep character arcs. Build to satisfying climax.',
    short:
      'Short film (5-30 minutes): Single compelling idea. Quick character introduction. Efficient storytelling. Strong ending.',
    series:
      'TV Series: Season-long arcs with episode hooks. Character development across multiple episodes. Cliffhangers.',
    commercial:
      'Commercial (30-60 seconds): Clear message. Emotional hook in seconds. Strong brand connection. Call to action.',
  };

  return guidelines[type] || 'Follow standard storytelling conventions for your chosen format.';
}

// ============================================================================
// STEP 4: STRUCTURE GENERATION
// ============================================================================

/**
 * Generate story structure from Step 1-3 data
 * Creates: 9 Plot Points with descriptions based on genre, characters, and boundary
 * Also suggests optimal scene count per point (1-10 scenes)
 */
export async function generateStructure(
  scriptData: ScriptData,
  mode: 'fresh' | 'refine' | 'use-edited' = 'fresh'
): Promise<Partial<ScriptData>> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;
  try {
    const langInstruction =
      scriptData.language === 'Thai'
        ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY. All descriptions MUST be in Thai. Do not use English for content, only for JSON keys.'
        : 'Output in English.';

    // Mode-specific instructions
    let modeInstruction = '';
    if (mode === 'fresh') {
      modeInstruction =
        '\n**REGENERATION MODE: Fresh Start**\nCreate completely new plot point descriptions without referencing existing ones. Be original and creative.';
    } else if (mode === 'refine') {
      const existingDescriptions = scriptData.structure
        .map(p => `${p.title}: ${p.description || 'Not set'}`)
        .join('\n');
      modeInstruction = `\n**REGENERATION MODE: Refine Existing**\nImprove the quality while keeping core structure:\n${existingDescriptions}`;
    } else if (mode === 'use-edited') {
      const existingDescriptions = scriptData.structure
        .map(p => `${p.title}: ${p.description || 'Not set'}`)
        .join('\n');
      modeInstruction = `\n**REGENERATION MODE: Use Edited Data**\nBuild upon user's edits:\n${existingDescriptions}`;
    }

    const charactersInfo = scriptData.characters
      .map(
        c =>
          `- ${c.name} (${c.role}): ${c.description || c.goals?.objective || 'Character in the story'}`
      )
      .join('\n');

    const prompt = `You are an expert Hollywood story structure consultant. Based on the following story elements, create detailed Plot Point descriptions following the 9-Point Three-Act Structure.

${modeInstruction}

**Story Elements:**
- Genre: ${scriptData.mainGenre}
- Type: ${scriptData.projectType}
- Title: ${scriptData.title || 'Untitled'}
- Log Line: ${scriptData.logLine || 'Not provided'}
- Big Idea: ${scriptData.bigIdea || 'Not provided'}
- Premise: ${scriptData.premise || 'Not provided'}
- Theme: ${scriptData.theme || 'Not provided'}

**Characters:**
${charactersInfo || 'No characters defined yet'}

**Timeline Context:**
- Timing: ${scriptData.timeline?.movieTiming || 'Not specified'}
- Season: ${scriptData.timeline?.seasons || 'Not specified'}
- Era: ${scriptData.timeline?.date || 'Not specified'}

**Your Task:**
Create compelling descriptions for each of the 9 Plot Points in the Three-Act Structure:

**องก์ที่ 1 (Act 1) - การเริ่มต้นและการเปลี่ยนแปลง:**
1. **Equilibrium**: The ordinary world, protagonist's life before the adventure
2. **Inciting Incident**: The event that disrupts the ordinary world and starts the story
3. **Turning Point**: The protagonist commits to the journey/goal, life changes irreversibly

**องก์ที่ 2 (Act 2) - ความขัดแย้งและวิกฤต:**
4. **Act Break**: Entering the new world, facing initial conflicts
5. **Rising Action**: Complications mount, problems get worse despite efforts
6. **Crisis**: The biggest obstacle, preventing the character from reaching the goal
7. **Falling Action**: The lowest point, protagonist reflects and finds the ultimate solution

**องก์ที่ 3 (Act 3) - การเผชิญหน้าและบทสรุป:**
8. **Climax**: The final confrontation, the protagonist's biggest challenge
9. **Ending**: The resolution, how the protagonist and world have changed

**Genre-Specific Guidelines:**
${getGenreGuidelines(scriptData.mainGenre)}

**Format Guidelines:**
${getTypeGuidelines(scriptData.projectType)}

**Scene Count Recommendations:**
For each plot point, suggest the optimal number of scenes (1-10) based on:
- Story pacing and genre conventions
- Plot point importance (Climax typically needs more scenes than Equilibrium)
- Project type (Feature films vs Short films have different needs)
- Emotional impact requirements

**Language Instruction:**
${langInstruction}

Return ONLY a valid JSON object with this exact structure:
{
  "structure": [
    {"title": "Equilibrium", "description": "...", "act": 1},
    {"title": "Inciting Incident", "description": "...", "act": 1},
    {"title": "Turning Point", "description": "...", "act": 1},
    {"title": "Act Break", "description": "...", "act": 2},
    {"title": "Rising Action", "description": "...", "act": 2},
    {"title": "Crisis", "description": "...", "act": 2},
    {"title": "Falling Action", "description": "...", "act": 2},
    {"title": "Climax", "description": "...", "act": 3},
    {"title": "Ending", "description": "...", "act": 3}
  ],
  "scenesPerPoint": {
    "Equilibrium": 2,
    "Inciting Incident": 1,
    "Turning Point": 2,
    "Act Break": 3,
    "Rising Action": 4,
    "Crisis": 3,
    "Falling Action": 2,
    "Climax": 5,
    "Ending": 2
  }
}

IMPORTANT:
- Each description should be 2-4 sentences
- Be specific to THIS story's genre, characters, and theme
- Show clear cause-and-effect progression
- Build tension and stakes appropriately
- Scene counts should reflect story pacing (typically: Act 1 = 20-25%, Act 2 = 50-55%, Act 3 = 20-25%)
- Climax usually needs the most scenes (3-5), Inciting Incident can be brief (1-2)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const result = JSON.parse(text);

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Structure Generation)',
        provider: 'gemini',
        costInCredits: 3,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Structure Generation',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    console.log('✅ Generated structure:', result);
    return result;
  } catch (error) {
    console.error('Error generating structure:', error);
    throw new Error('Failed to generate structure from AI.');
  }
}

/**
 * Generate or regenerate a single Plot Point
 * @param scriptData - The current script data
 * @param plotPointIndex - Index of the plot point to regenerate (0-11)
 * @param mode - Regeneration mode (fresh, refine, use-edited)
 * @returns Updated plot point description
 */
export async function generateSinglePlotPoint(
  scriptData: ScriptData,
  plotPointIndex: number,
  mode: 'fresh' | 'refine' | 'use-edited' = 'fresh'
): Promise<{ description: string; sceneCount?: number }> {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid;
  try {
    const plotPoint = scriptData.structure[plotPointIndex];
    if (!plotPoint) {
      throw new Error(`Invalid plot point index: ${plotPointIndex}`);
    }

    const langInstruction =
      scriptData.language === 'Thai'
        ? 'STRICTLY OUTPUT IN THAI LANGUAGE ONLY. All descriptions MUST be in Thai. Do not use English for content, only for JSON keys.'
        : 'Output in English.';

    // Mode-specific instructions
    let modeInstruction = '';
    if (mode === 'fresh') {
      modeInstruction = `\n**REGENERATION MODE: Fresh Start**\nCreate a completely new description for "${plotPoint.title}" without referencing existing content. Be original and creative.`;
    } else if (mode === 'refine') {
      modeInstruction = `\n**REGENERATION MODE: Refine Existing**\nImprove the quality of this plot point while keeping the core idea:\nCurrent: ${plotPoint.description || 'Not set'}`;
    } else if (mode === 'use-edited') {
      modeInstruction = `\n**REGENERATION MODE: Use Edited Data**\nBuild upon user's edits for this plot point:\nCurrent: ${plotPoint.description || 'Not set'}`;
    }

    // Context from other plot points (for continuity)
    const previousPoint = plotPointIndex > 0 ? scriptData.structure[plotPointIndex - 1] : null;
    const nextPoint =
      plotPointIndex < scriptData.structure.length - 1
        ? scriptData.structure[plotPointIndex + 1]
        : null;

    const contextInfo = [];
    if (previousPoint) {
      contextInfo.push(
        `Previous (${previousPoint.title}): ${previousPoint.description || 'Not set'}`
      );
    }
    if (nextPoint) {
      contextInfo.push(`Next (${nextPoint.title}): ${nextPoint.description || 'Not set'}`);
    }

    const charactersInfo = scriptData.characters
      .map(
        c =>
          `- ${c.name} (${c.role}): ${c.description || c.goals?.objective || 'Character in the story'}`
      )
      .join('\n');

    const prompt = `You are an expert Hollywood story structure consultant. Regenerate the description for this specific Plot Point.

${modeInstruction}

**Story Context:**
- Genre: ${scriptData.mainGenre}
- Type: ${scriptData.projectType}
- Title: ${scriptData.title || 'Untitled'}
- Log Line: ${scriptData.logLine || 'Not provided'}
- Big Idea: ${scriptData.bigIdea || 'Not provided'}
- Premise: ${scriptData.premise || 'Not provided'}
- Theme: ${scriptData.theme || 'Not provided'}

**Characters:**
${charactersInfo || 'No characters defined yet'}

**Plot Point to Regenerate:**
**${plotPoint.title}** (Act ${plotPoint.act})

**Plot Point Context:**
${contextInfo.length > 0 ? contextInfo.join('\n') : 'This is the first or last plot point'}

**Plot Point Definition:**
${getPlotPointDefinition(plotPoint.title)}

**Genre-Specific Guidelines:**
${getGenreGuidelines(scriptData.mainGenre)}

**Your Task:**
Create a compelling, specific description for "${plotPoint.title}" that:
- Fits within the overall story arc
- Connects smoothly with previous and next plot points
- Matches the genre conventions
- Is 2-4 sentences long
- Shows clear cause-and-effect
- ${mode === 'refine' ? 'Improves quality while maintaining core concept' : mode === 'use-edited' ? 'Builds upon user edits' : 'Offers fresh creative direction'}

Also suggest the optimal number of scenes (1-10) for this plot point based on:
- Story pacing and importance
- Genre conventions
- Emotional impact requirements

**Language Instruction:**
${langInstruction}

Return ONLY a valid JSON object:
{
  "description": "Your detailed plot point description here...",
  "sceneCount": 3
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    });

    const text = extractJsonFromResponse(response.text || '{}');
    const result = JSON.parse(text);

    // ✅ Record usage after successful generation
    if (userId) {
      const duration = (Date.now() - startTime) / 1000;

      // Calculate tokens for accurate pricing
      const inputTokens = await countTokens(prompt, 'gemini-2.5-flash');
      const outputTokens = await countTokens(text, 'gemini-2.5-flash');

      const inputCost = inputTokens * API_PRICING.GEMINI['2.5-flash'].input;
      const outputCost = outputTokens * API_PRICING.GEMINI['2.5-flash'].output;
      const totalCost = inputCost + outputCost;

      await recordGeneration({
        userId,
        type: 'text',
        modelId: 'gemini-2.5-flash',
        modelName: 'Gemini 2.5 Flash (Single Plot Point)',
        provider: 'gemini',
        costInCredits: 1,
        costInTHB: totalCost,
        success: true,
        duration,
        metadata: {
          prompt: 'Single Plot Point Generation',
          tokens: { input: inputTokens, output: outputTokens },
        },
      });
    }

    console.log(`✅ Generated single plot point (${plotPoint.title}):`, result);
    return result;
  } catch (error) {
    console.error('Error generating single plot point:', error);
    throw new Error('Failed to generate plot point from AI.');
  }
}

/**
 * Get definition for specific plot point
 */
function getPlotPointDefinition(title: string): string {
  const definitions: Record<string, string> = {
    Equilibrium: "The ordinary world, protagonist's life before the adventure begins",
    'Inciting Incident': 'The event that disrupts the ordinary world and starts the story',
    'Turning Point': 'The protagonist commits to the journey/goal, life changes irreversibly',
    'Act Break': 'Entering the new world, facing initial conflicts',
    'Rising Action': 'Complications mount, problems get worse despite efforts',
    Crisis: 'The biggest obstacle, preventing the character from reaching the goal',
    'Falling Action': 'The lowest point, protagonist reflects and finds the ultimate solution',
    Climax: "The final confrontation, the protagonist's biggest challenge",
    Ending: 'The resolution, how the protagonist and world have changed',
  };
  return definitions[title] || 'A critical point in the story structure';
}

/**
 * Export wrapper for video generation with Gemini Veo
 * Used by videoGenerationFallback.ts
 */
export async function generateVideoWithGemini(params: {
  prompt: string;
  referenceImage?: string;
  numFrames?: number;
  fps?: number;
}): Promise<{
  videoUrl: string;
  videoData?: string;
  processingTime: number;
}> {
  const startTime = Date.now();

  console.log('🎬 Generating video with Gemini Veo 2...');

  try {
    // Use Gemini Veo 2 for video generation (via Vertex AI)
    // Note: This requires Vertex AI setup and Veo 2 access
    // For now, fallback to ComfyUI AnimateDiff

    const videoUrl = await generateVideoWithComfyUI(params.prompt, {
      frameCount: params.numFrames || 25,
      fps: params.fps || 24,
      baseImage: params.referenceImage,
      useAnimateDiff: !params.referenceImage, // Use AnimateDiff for text-to-video, SVD for image-to-video
    });

    return {
      videoUrl,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('❌ Gemini video generation failed:', error);
    throw error;
  }
}

// Force refresh
