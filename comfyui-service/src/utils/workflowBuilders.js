/**
 * ComfyUI Workflow Builders
 * 
 * Purpose: Generate ComfyUI workflow JSON for video generation
 * Supports: AnimateDiff (text-to-video), SVD (image-to-video)
 */

// Video Model Constants
export const VIDEO_MODELS = {
  animateDiff: {
    motionModels: {
      v2: 'mm_sd_v15_v2.ckpt',
      v3: 'v3_sd15_mm.ckpt', // AnimateDiff v3 - Better motion quality
      xl: 'mm-Stabilized_high.pth',
    },
    adapters: {
      v3: 'v3_sd15_adapter.ckpt', // v3 camera control adapter
    },
    // Default to v3 for better animation quality
    defaultMotionModel: 'v3_sd15_mm.ckpt',
    baseModels: {
      sd15: 'v1-5-pruned-emaonly.safetensors',
      sd15_realistic: 'v1-5-pruned-emaonly.safetensors',
      sdxl: 'sd_xl_base_1.0.safetensors',
    },
    defaultFrames: 16,
    maxFrames: 128,
    fps: 8,
  },
  svd: {
    checkpoints: {
      xt: 'svd_xt.safetensors',
      xt_1_1: 'svd_xt.safetensors',
    },
    defaultFrames: 25,
    maxFrames: 25,
    fps: 6,
  },
  // WAN (WanVideoWrapper) - text-to-video
  wan: {
    // Available WAN models (Kijai's converted models - downloaded and ready to use)
    models: {
      // Wan 2.1 I2V 14B FP8 - Image-to-Video (best for character animation with face ID)
      i2v14B_fp8: 'Wan2_1-I2V-14B-480P_fp8_e4m3fn.safetensors',
      // Wan 2.1 T2V 14B FP8 - Text-to-Video (general purpose)
      t2v14B_fp8: 'Wan2_1-T2V-14B_fp8_e4m3fn.safetensors',
      // Alternative models (not downloaded yet):
      // phantom14B: 'Phantom-Wan-14B_fp16',  // 29GB
    },
    // Default model for this builder: T2V.
    // buildWanWorkflow() creates a text-to-video graph (WanVideoEmptyEmbeds -> WanVideoSampler).
    // I2V models require an image-embed conditioning node; those are injected later in prepareWorkflow
    // when a reference image is provided and the worker supports it.
    defaultModelPath: 'Wan2_1-T2V-14B_fp8_e4m3fn.safetensors',
    defaultT5Encoder: 'umt5-xxl-enc-bf16.safetensors',
    defaultVae: 'Wan2_1_VAE_bf16.safetensors',
    // Stability-first default: 61 requested frames (snaps to 65 by 16k+1 safety)
    // This matches the previously stable configuration in this project.
    defaultFrames: 61,
    maxFrames: 201,
    fps: 8,
    width: 832,
    height: 480,
  },
};

/**
 * Build WAN workflow for text-to-video generation using ComfyUI-WanVideoWrapper.
 *
 * Minimal (working) graph for WanVideoWrapper:
 * - WanVideoModelLoader
 * - LoadWanVideoT5TextEncoder
 * - WanVideoTextEncode
 * - WanVideoEmptyEmbeds
 * - WanVideoSampler
 * - WanVideoVAELoader
 * - WanVideoDecode
 * - VHS_VideoCombine
 *
 * @param {string} prompt - Text prompt for video generation
 * @param {Object} options - Generation options
 * @returns {Object} ComfyUI workflow JSON
 */
export function buildWanWorkflow(prompt, options = {}) {
  const {
    negativePrompt = 'morphing, distorted face, bad anatomy, cartoon, anime, illustration, glitch, jerky motion, static, frozen, blurry, low resolution, watermark',
    modelPath = VIDEO_MODELS.wan.defaultModelPath,
    t5Encoder = VIDEO_MODELS.wan.defaultT5Encoder,
    vae = VIDEO_MODELS.wan.defaultVae,
    seed = Math.floor(Math.random() * 1000000000),
    numFrames = VIDEO_MODELS.wan.defaultFrames,
    fps = VIDEO_MODELS.wan.fps,
    width = VIDEO_MODELS.wan.width,
    height = VIDEO_MODELS.wan.height,
    steps = 30,
    cfg = 6.0,
    shift = 5.0,
    // NOTE: WanVideoWrapper's default 'unipc' has been observed to throw an IndexError
    // (step index out of bounds) in some environments. Use a safer default.
    scheduler = 'euler',
  } = options;

  return {
    // Node 1: WanVideoWrapper model loader
    '1': {
      inputs: {
        model: modelPath,
        base_precision: 'bf16',
        quantization: 'disabled',
        load_device: 'offload_device',
      },
      class_type: 'WanVideoModelLoader',
    },

    // Node 2: WanVideoWrapper T5 text encoder
    '2': {
      inputs: {
        model_name: t5Encoder,
        precision: 'bf16',
        load_device: 'offload_device',
        quantization: 'disabled',
      },
      class_type: 'LoadWanVideoT5TextEncoder',
    },

    // Node 3: Text → embeddings
    '3': {
      inputs: {
        positive_prompt: prompt,
        negative_prompt: negativePrompt,
        t5: ['2', 0],
        model_to_offload: ['1', 0],
        force_offload: true,
        device: 'gpu',
      },
      class_type: 'WanVideoTextEncode',
    },

    // Node 4: Empty embeds (T2V requires this)
    '4': {
      inputs: {
        width,
        height,
        num_frames: numFrames,
      },
      class_type: 'WanVideoEmptyEmbeds',
    },

    // Node 5: Sampling
    '5': {
      inputs: {
        model: ['1', 0],
        image_embeds: ['4', 0],
        steps,
        cfg,
        shift,
        seed,
        force_offload: true,
        scheduler,
        riflex_freq_index: 0,
        text_embeds: ['3', 0],
      },
      class_type: 'WanVideoSampler',
    },

    // Node 6: VAE loader (WanVideoWrapper expects this in models/vae)
    '6': {
      inputs: {
        model_name: vae,
        precision: 'bf16',
        use_cpu_cache: false,
      },
      class_type: 'WanVideoVAELoader',
    },

    // Node 7: Decode latent video → frames
    '7': {
      inputs: {
        vae: ['6', 0],
        samples: ['5', 0],
        enable_vae_tiling: false,
        tile_x: 272,
        tile_y: 272,
        tile_stride_x: 144,
        tile_stride_y: 128,
      },
      class_type: 'WanVideoDecode',
    },

    // Node 8: MP4 export
    '8': {
      inputs: {
        frame_rate: fps,
        loop_count: 0,
        filename_prefix: 'peace-script-wan',
        format: 'video/h264-mp4',
        pingpong: false,
        save_output: true,
        images: ['7', 0],
      },
      class_type: 'VHS_VideoCombine',
    },
  };
}

/**
 * Build AnimateDiff workflow for text-to-video generation
 * 
 * @param {string} prompt - Text prompt for video generation
 * @param {Object} options - Generation options
 * @returns {Object} ComfyUI workflow JSON
 */
export function buildAnimateDiffWorkflow(prompt, options = {}) {
  const {
    negativePrompt = 'morphing, distorted face, bad anatomy, cartoon, anime, illustration, glitch, jerky motion, static, frozen, blurry, low resolution, watermark, scene changes, jump cuts, multiple shots, multiple angles, camera switches, angle changes, noisy, grainy, pixelated, poor quality',
    steps = 25,
    cfg = 6.5,
    seed = Math.floor(Math.random() * 1000000000),
    numFrames = VIDEO_MODELS.animateDiff.defaultFrames,
    fps = VIDEO_MODELS.animateDiff.fps,
    motionScale = 1.0, // Reserved for future use with motion_scale parameter
    motionModel = VIDEO_MODELS.animateDiff.motionModels.v2,
    ckpt_name = VIDEO_MODELS.animateDiff.baseModels.sd15_realistic,
    width = 768,  // Increased from 512 for HD quality
    height = 512,
    lora,
    loraStrength = 0.8,
    // 🆕 Character detection for negative prompt adjustment
    hasCharacters = true, // Default: assume characters present
  } = options;

  // 🆕 Add "no people" to negative prompt if scene has no characters
  const finalNegativePrompt = hasCharacters 
    ? negativePrompt 
    : `${negativePrompt}, people, humans, man, woman, person, character, face, body, human figure, crowd`;

  // Note: motionScale can be used in future with KSampler advanced nodes
  // For now, motion is controlled by the motion module itself
  void motionScale; // Suppress unused warning

  // AnimateDiff v2/v3 motion modules commonly error >32 frames without context windows.
  // When requesting longer clips, enable ADE Context Options to allow sliding windows.
  const needsContextWindows = Number.isFinite(numFrames) && numFrames > 32;

  const workflow = {
    // Node 1: Checkpoint Loader (SD 1.5)
    '1': {
      inputs: {
        ckpt_name: ckpt_name,
      },
      class_type: 'CheckpointLoaderSimple',
    },

    // Node 2: Empty Latent Image (for video batch)
    '2': {
      inputs: {
        width: width,
        height: height,
        batch_size: numFrames, // Generate multiple frames
      },
      class_type: 'EmptyLatentImage',
    },

    // Node 3: CLIP Text Encode (Positive)
    '3': {
      inputs: {
        text: prompt,
        clip: ['1', 1],
      },
      class_type: 'CLIPTextEncode',
    },

    // Node 4: CLIP Text Encode (Negative)
    '4': {
      inputs: {
        text: finalNegativePrompt, // 🆕 Use adjusted negative prompt
        clip: ['1', 1],
      },
      class_type: 'CLIPTextEncode',
    },

    // Node 5: Load AnimateDiff Motion Model (ADE version)
    '5': {
      inputs: {
        model_name: motionModel,
      },
      class_type: 'ADE_LoadAnimateDiffModel',
    },

    // Node 5b: Apply AnimateDiff to Model
    '5b': {
      inputs: {
        motion_model: ['5', 0],
      },
      class_type: 'ADE_ApplyAnimateDiffModelSimple',
    },

    // Node 5c: Use Evolved Sampling (converts M_MODELS to MODEL)
    '5c': {
      inputs: {
        model: ['1', 0], // Base model
        beta_schedule: 'sqrt_linear (AnimateDiff)',
        m_models: ['5b', 0], // AnimateDiff M_MODELS
      },
      class_type: 'ADE_UseEvolvedSampling',
    },

    // Node 5d: Context Options (only used for long clips)
    ...(needsContextWindows
      ? {
          '5d': {
            inputs: {
              context_length: 16,
              context_overlap: 4,
            },
            class_type: 'ADE_StandardStaticContextOptions',
          },
        }
      : {}),

    // Node 6: KSampler (with AnimateDiff model)
    '6': {
      inputs: {
        seed: seed,
        steps: steps,
        cfg: cfg,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        model: ['5c', 0], // Use evolved sampling model
        positive: ['3', 0],
        negative: ['4', 0],
        latent_image: ['2', 0],
      },
      class_type: 'KSampler',
    },

    // Node 7: VAE Decode (batch decode all frames)
    '7': {
      inputs: {
        samples: ['6', 0],
        vae: ['1', 2],
      },
      class_type: 'VAEDecode',
    },

    // Node 8: VHS Video Combine (combine frames into video)
    '8': {
      inputs: {
        frame_rate: fps,
        loop_count: 0, // 0 = no loop
        filename_prefix: 'peace-script-animatediff',
        format: 'video/h264-mp4', // MP4 format
        pingpong: false,
        save_output: true,
        images: ['7', 0],
      },
      class_type: 'VHS_VideoCombine',
    },
  };

  // AnimateDiff v2/v3 motion models commonly have a hard limit (~32 frames) unless Context Options are used.
  // When requesting longer videos, attach a default Context Options node to enable sliding context windows.
  if (numFrames > 32) {
    workflow['5d'] = {
      inputs: {
        context_length: 16,
        context_overlap: 4,
      },
      class_type: 'ADE_StandardStaticContextOptions',
    };

    workflow['5c'].inputs.context_options = ['5d', 0];
  }

  // Add LoRA if specified
  if (lora) {
    workflow['9'] = {
      inputs: {
        lora_name: lora,
        strength_model: loraStrength,
        strength_clip: loraStrength,
        model: ['1', 0],
        clip: ['1', 1],
      },
      class_type: 'LoraLoader',
    };

    // Update references to use LoRA
    workflow['5c'].inputs.model = ['9', 0]; // Use LoRA for evolved sampling
    workflow['3'].inputs.clip = ['9', 1];
    workflow['4'].inputs.clip = ['9', 1];
  }

  // Wire context options only when enabled.
  if (needsContextWindows) {
    workflow['5c'].inputs.context_options = ['5d', 0];
  }

  return workflow;
}

/**
 * Build SVD workflow for image-to-video generation
 * 
 * @param {string} referenceImage - Base64 image or filename
 * @param {Object} options - Generation options
 * @returns {Object} ComfyUI workflow JSON
 */
export function buildSVDWorkflow(referenceImage, options = {}) {
  const {
    seed = Math.floor(Math.random() * 1000000000),
    numFrames = VIDEO_MODELS.svd.defaultFrames,
    fps = VIDEO_MODELS.svd.fps,
    motionScale = 127, // Default motion bucket (will be overridden by frontend calculation)
    steps = 25,
    cfg = 2.0,
    videoModel = VIDEO_MODELS.svd.checkpoints.xt,
    clipVisionModel = 'clip_vision_g.safetensors',
    width = 1024,
    height = 576,
    augmentationLevel = 0.05, // REDUCED: More conservative for stability (was 0.15)
  } = options;

  const workflow = {
    // Node 1: Load Reference Image
    '1': {
      inputs: {
        image: referenceImage,
        upload: 'image',
      },
      class_type: 'LoadImage',
    },

    // Node 2: SVD Image Encoder (encode image to latent)
    '2': {
      inputs: {
        clip_vision: ['7', 0],
        init_image: ['1', 0],
        vae: ['3', 2],
        width: width,
        height: height,
        video_frames: numFrames,
        motion_bucket_id: motionScale,
        fps: fps,
        augmentation_level: augmentationLevel, // Allow deviation for character movement (not just camera motion)
      },
      class_type: 'SVD_img2vid_Conditioning',
    },

    // Node 3: Checkpoint Loader (SVD)
    '3': {
      inputs: {
        ckpt_name: videoModel,
      },
      class_type: 'CheckpointLoaderSimple',
    },

    // Node 4: KSampler (SVD)
    '4': {
      inputs: {
        seed: seed,
        steps: steps,
        cfg: cfg,
        sampler_name: 'euler',
        scheduler: 'karras',
        denoise: 1.0,
        model: ['3', 0],
        positive: ['2', 0], // SVD conditioning
        negative: ['2', 1], // SVD negative conditioning
        latent_image: ['2', 2], // Latent from SVD conditioning
      },
      class_type: 'KSampler',
    },

    // Node 5: VAE Decode
    '5': {
      inputs: {
        samples: ['4', 0],
        vae: ['3', 2],
      },
      class_type: 'VAEDecode',
    },

    // Node 6: VHS Video Combine
    '6': {
      inputs: {
        frame_rate: fps,
        loop_count: 0,
        filename_prefix: 'peace-script-svd',
        format: 'video/h264-mp4',
        pingpong: false,
        save_output: true,
        images: ['5', 0],
      },
      class_type: 'VHS_VideoCombine',
    },

    // Node 7: CLIP Vision Loader (required by SVD_img2vid_Conditioning)
    '7': {
      inputs: {
        clip_name: clipVisionModel,
      },
      class_type: 'CLIPVisionLoader',
    },
  };

  return workflow;
}
