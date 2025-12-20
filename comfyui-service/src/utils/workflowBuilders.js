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
      v3: 'mm_sd_v15_v3.ckpt',
      xl: 'mm-Stabilized_high.pth',
    },
    baseModels: {
      sd15: 'v1-5-pruned-emaonly.safetensors',
      sd15_realistic: 'realisticVisionV51_v51VAE.safetensors',
      sdxl: 'sd_xl_base_1.0.safetensors',
    },
    defaultFrames: 16,
    maxFrames: 128,
    fps: 8,
  },
  svd: {
    checkpoints: {
      xt: 'svd_xt_1_1.safetensors',
      xt_1_1: 'svd_xt_1_1.safetensors',
    },
    defaultFrames: 25,
    maxFrames: 25,
    fps: 6,
  },
};

/**
 * Build AnimateDiff workflow for text-to-video generation
 * 
 * @param {string} prompt - Text prompt for video generation
 * @param {Object} options - Generation options
 * @returns {Object} ComfyUI workflow JSON
 */
export function buildAnimateDiffWorkflow(prompt, options = {}) {
  const {
    negativePrompt = 'low quality, blurry, distorted, watermark, text',
    steps = 20,
    cfg = 8.0,
    seed = Math.floor(Math.random() * 1000000000),
    numFrames = VIDEO_MODELS.animateDiff.defaultFrames,
    fps = VIDEO_MODELS.animateDiff.fps,
    motionScale = 1.0, // Reserved for future use with motion_scale parameter
    motionModel = VIDEO_MODELS.animateDiff.motionModels.v2,
    ckpt_name = VIDEO_MODELS.animateDiff.baseModels.sd15_realistic,
    width = 512,
    height = 512,
    lora,
    loraStrength = 0.8,
  } = options;

  // Note: motionScale can be used in future with KSampler advanced nodes
  // For now, motion is controlled by the motion module itself
  void motionScale; // Suppress unused warning

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
        text: negativePrompt,
        clip: ['1', 1],
      },
      class_type: 'CLIPTextEncode',
    },

    // Node 5: AnimateDiff Loader V1 (loads motion module)
    '5': {
      inputs: {
        model_name: motionModel,
        beta_schedule: 'sqrt_linear', // AnimateDiff beta schedule
        model: ['1', 0],
      },
      class_type: 'AnimateDiffLoaderV1',
    },

    // Node 6: KSampler (with AnimateDiff model)
    '6': {
      inputs: {
        seed: seed,
        steps: steps,
        cfg: cfg,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        model: ['5', 0], // AnimateDiff model
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
    workflow['5'].inputs.model = ['9', 0];
    workflow['3'].inputs.clip = ['9', 1];
    workflow['4'].inputs.clip = ['9', 1];
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
    motionScale = 127, // SVD motion bucket ID (default: 127)
    steps = 20,
    cfg = 2.5, // SVD typically uses lower CFG
    videoModel = VIDEO_MODELS.svd.checkpoints.xt,
    width = 1024,
    height = 576,
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
        width: width,
        height: height,
        video_frames: numFrames,
        motion_bucket_id: motionScale, // Motion strength (1-255)
        fps: fps,
        augmentation_level: 0.0, // No augmentation
        image: ['1', 0],
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
  };

  return workflow;
}
