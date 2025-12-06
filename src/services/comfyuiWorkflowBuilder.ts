/**
 * ComfyUI Workflow Builder
 * สร้าง ComfyUI workflow JSON จาก options
 */

// Generation Modes
export type GenerationMode = 'quality' | 'balanced' | 'speed';

export interface ModeSettings {
  steps: number;
  weight: number;
  cfg: number;
  loraStrength: number;
}

// Mode presets
export const MODE_PRESETS: Record<GenerationMode, ModeSettings> = {
  quality: {
    steps: 25,
    weight: 0.95,
    cfg: 8.0,
    loraStrength: 0.8,
  },
  balanced: {
    steps: 20,
    weight: 0.9,
    cfg: 8.0,
    loraStrength: 0.8,
  },
  speed: {
    steps: 15,
    weight: 0.85,
    cfg: 7.5,
    loraStrength: 0.75,
  },
};

interface WorkflowOptions {
  lora?: string;
  loraStrength?: number;
  negativePrompt?: string;
  steps?: number;
  cfg?: number;
  seed?: number;
  referenceImage?: string;
  outfitReference?: string;
  ckpt_name?: string; // Added checkpoint name override
  useIPAdapter?: boolean; // Use IP-Adapter instead of InstantID (Mac optimized)
  generationMode?: GenerationMode; // QUALITY/BALANCED/SPEED
}

/**
 * สร้าง SDXL workflow สำหรับ text-to-image
 */
export function buildSDXLWorkflow(prompt: string, options: WorkflowOptions = {}): any {
  const {
    lora,
    loraStrength = 0.85,
    negativePrompt = 'low quality, blurry, deformed',
    steps = 25,
    cfg = 7.5,
    seed,
    ckpt_name = 'sd_xl_base_1.0.safetensors', // Default to Base
  } = options;

  // Random seed if not provided
  const finalSeed = seed || Math.floor(Math.random() * 1000000000);

  const workflow: any = {
    '3': {
      inputs: {
        seed: finalSeed,
        steps: steps,
        cfg: cfg,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
      class_type: 'KSampler',
    },
    '4': {
      inputs: {
        ckpt_name: ckpt_name,
      },
      class_type: 'CheckpointLoaderSimple',
    },
    '5': {
      inputs: {
        width: 1024,
        height: 1024,
        batch_size: 1,
      },
      class_type: 'EmptyLatentImage',
    },
    '6': {
      inputs: {
        text: prompt,
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
    },
    '7': {
      inputs: {
        text: negativePrompt,
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
    },
    '8': {
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2],
      },
      class_type: 'VAEDecode',
    },
    '9': {
      inputs: {
        filename_prefix: 'peace-script',
        images: ['8', 0],
      },
      class_type: 'SaveImage',
    },
  };

  // Add LoRA if specified
  if (lora) {
    workflow['10'] = {
      inputs: {
        lora_name: lora,
        strength_model: loraStrength,
        strength_clip: loraStrength,
        model: ['4', 0],
        clip: ['4', 1],
      },
      class_type: 'LoraLoader',
    };

    // Update KSampler to use LoRA model
    workflow['3'].inputs.model = ['10', 0];
    // Update CLIP encoders to use LoRA clip
    workflow['6'].inputs.clip = ['10', 1];
    workflow['7'].inputs.clip = ['10', 1];
  }

  return workflow;
}

/**
 * สร้าง SDXL workflow พร้อม InstantID Face Recognition
 */
export function buildSDXLFaceIDWorkflow(
  prompt: string,
  referenceImage: string,
  options: WorkflowOptions = {}
): any {
  const baseWorkflow = buildSDXLWorkflow(prompt, options);

  // InstantID requires these nodes:
  // 11: LoadImage (reference face)
  // 12: InstantIDModelLoader
  // 13: InstantIDFaceAnalysis
  // 14: ApplyInstantID
  // 15: ControlNetLoader
  // 16: ApplyControlNet

  // Node 11: Load reference image
  baseWorkflow['11'] = {
    inputs: {
      image: referenceImage,
      upload: 'image',
    },
    class_type: 'LoadImage',
  };

  // Node 12: Load InstantID model
  baseWorkflow['12'] = {
    inputs: {
      instantid_file: 'ip-adapter.bin',
    },
    class_type: 'InstantIDModelLoader',
  };

  // Node 13: Load Face Analysis model (no image input - just loads the model)
  baseWorkflow['13'] = {
    inputs: {
      provider: 'CPU',
    },
    class_type: 'InstantIDFaceAnalysis',
  };

  // Node 15: Load ControlNet for InstantID
  baseWorkflow['15'] = {
    inputs: {
      control_net_name: 'diffusion_pytorch_model.safetensors',
    },
    class_type: 'ControlNetLoader',
  };

  // Node 16: Apply ControlNet to positive conditioning
  baseWorkflow['16'] = {
    inputs: {
      strength: 0.6, // BALANCED: Increased for better face similarity (was 0.3)
      conditioning: ['6', 0], // positive conditioning from CLIPTextEncode
      control_net: ['15', 0],
      image: ['11', 0],
    },
    class_type: 'ControlNetApply',
  };

  // Node 17: Apply ControlNet to negative conditioning
  baseWorkflow['17'] = {
    inputs: {
      strength: 0.6, // BALANCED: Increased for better face similarity (was 0.3)
      conditioning: ['7', 0], // negative conditioning from CLIPTextEncode
      control_net: ['15', 0],
      image: ['11', 0],
    },
    class_type: 'ControlNetApply',
  };

  // Node 14: Apply InstantID to model
  baseWorkflow['14'] = {
    inputs: {
      weight: 0.7, // BALANCED: Increased for better face matching (was 0.4, Mac optimized)
      start_at: 0.0,
      end_at: 1.0,
      instantid: ['12', 0],
      insightface: ['13', 0],
      control_net: ['15', 0],
      image: ['11', 0],
      model: [baseWorkflow['3'].inputs.model[0], 0],
      positive: ['16', 0], // ControlNet-applied positive
      negative: ['17', 0], // ControlNet-applied negative
    },
    class_type: 'ApplyInstantID',
  };

  // Update KSampler to use InstantID model and conditioning
  baseWorkflow['3'].inputs.model = ['14', 0];
  baseWorkflow['3'].inputs.positive = ['14', 1];
  baseWorkflow['3'].inputs.negative = ['14', 2];

  return baseWorkflow;
}

/**
 * สร้าง Flux workflow (FLUX.1-dev model)
 */
export function buildFluxWorkflow(prompt: string, options: WorkflowOptions = {}): any {
  const {
    lora,
    loraStrength = 0.85,
    negativePrompt = 'low quality, blurry',
    steps = 20,
    cfg = 3.5, // Flux ใช้ CFG ต่ำกว่า SDXL
    seed,
  } = options;

  const finalSeed = seed || Math.floor(Math.random() * 1000000000);

  const workflow: any = {
    '3': {
      inputs: {
        seed: finalSeed,
        steps: steps,
        cfg: cfg,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
      class_type: 'KSampler',
    },
    '4': {
      inputs: {
        ckpt_name: 'flux_dev.safetensors',
      },
      class_type: 'CheckpointLoaderSimple',
    },
    '5': {
      inputs: {
        width: 1024,
        height: 1024,
        batch_size: 1,
      },
      class_type: 'EmptyLatentImage',
    },
    '6': {
      inputs: {
        text: prompt,
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
    },
    '7': {
      inputs: {
        text: negativePrompt,
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
    },
    '8': {
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2],
      },
      class_type: 'VAEDecode',
    },
    '9': {
      inputs: {
        filename_prefix: 'peace-script-flux',
        images: ['8', 0],
      },
      class_type: 'SaveImage',
    },
  };

  // Add LoRA if specified (FLUX supports LoRA)
  if (lora) {
    workflow['10'] = {
      inputs: {
        lora_name: lora,
        strength_model: loraStrength,
        strength_clip: loraStrength,
        model: ['4', 0],
        clip: ['4', 1],
      },
      class_type: 'LoraLoader',
    };

    // Update KSampler to use LoRA model
    workflow['3'].inputs.model = ['10', 0];
    // Update CLIP encoders to use LoRA clip
    workflow['6'].inputs.clip = ['10', 1];
    workflow['7'].inputs.clip = ['10', 1];
  }

  return workflow;
}

/**
 * สร้าง IP-Adapter workflow สำหรับ reference image (Mac Optimized v2)
 * ใช้ IPAdapterUnifiedLoader แทน - ไม่ต้องใช้ InsightFace (ไม่มี CPU bottleneck)
 * เร็วกว่า InstantID มาก เพราะไม่มี face detection บน CPU
 */
export function buildIPAdapterWorkflow(
  prompt: string,
  referenceImage: string,
  options: WorkflowOptions = {}
): any {
  const {
    lora,
    loraStrength = 0.8,
    negativePrompt = 'low quality, blurry, deformed',
    steps = 30,
    cfg = 8.0,
    seed,
    ckpt_name = 'sd_xl_base_1.0.safetensors',
  } = options;

  const finalSeed = seed || Math.floor(Math.random() * 1000000000);

  // Start with base SDXL workflow
  const baseWorkflow = buildSDXLWorkflow(prompt, {
    lora,
    loraStrength,
    negativePrompt,
    steps,
    cfg,
    seed: finalSeed,
    ckpt_name,
  });

  // Node 11: Load Reference Image
  baseWorkflow['11'] = {
    inputs: {
      image: referenceImage,
      upload: 'image',
    },
    class_type: 'LoadImage',
  };

  // Node 20: IPAdapter Unified Loader (loads model + CLIP Vision in one node)
  // Preset: "PLUS FACE (portraits)" - optimized for face similarity
  baseWorkflow['20'] = {
    inputs: {
      model: lora ? ['10', 0] : ['4', 0], // From LoRA or Checkpoint
      preset: 'PLUS FACE (portraits)', // Best for face matching
    },
    class_type: 'IPAdapterUnifiedLoader',
  };

  // Node 21: Apply IP-Adapter with Reference Image
  // Get mode settings (default: balanced)
  const mode = options.generationMode || 'balanced';
  const modeSettings = MODE_PRESETS[mode];

  baseWorkflow['21'] = {
    inputs: {
      model: ['20', 0], // Model from Unified Loader
      ipadapter: ['20', 1], // IPAdapter from Unified Loader
      image: ['11', 0], // Reference image
      weight: modeSettings.weight, // Mode-specific weight
      weight_type: 'style transfer', // Best for face matching
      start_at: 0.0,
      end_at: 1.0,
    },
    class_type: 'IPAdapter',
  };

  // Update KSampler to use IP-Adapter modified model
  baseWorkflow['3'].inputs.model = ['21', 0];

  return baseWorkflow;
}

/**
 * Main export: เลือก workflow builder ตามความเหมาะสม
 */
export function buildWorkflow(prompt: string, options: WorkflowOptions = {}): any {
  // ถ้ามี reference image
  if (options.referenceImage) {
    // Mac/MPS: ใช้ IP-Adapter (เร็วกว่า InstantID มาก)
    if (options.useIPAdapter) {
      console.log('🍎 Using IP-Adapter workflow (Mac Optimized)');
      return buildIPAdapterWorkflow(prompt, options.referenceImage, options);
    }

    // Windows/Linux + NVIDIA: ใช้ InstantID (ความเหมือนสูงสุด)
    console.log('🚀 Using InstantID workflow (Windows/Linux + NVIDIA)');
    return buildSDXLFaceIDWorkflow(prompt, options.referenceImage, options);
  }

  // Default: SDXL workflow
  return buildSDXLWorkflow(prompt, options);
}
