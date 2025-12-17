/**
 * Replicate API Service
 *
 * Quick-start video generation using Replicate's hosted models:
 * - Tier 2: AnimateDiff v3 (Text/Image → 3s video at 512x512)
 * - Tier 3: SVD 1.1 (Image → 3s video at 1024x576)
 *
 * Benefits:
 * - No deployment needed
 * - Pay-per-use (~$0.17/video)
 * - Production-ready API
 * - Fast generation (<60s)
 *
 * @author Peace Script AI Team
 * @version 1.0.0
 */

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// Popular AnimateDiff models on Replicate
const REPLICATE_MODELS = {
  ANIMATEDIFF: {
    id: 'lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f',
    name: 'AnimateDiff v3',
    description: 'Text/Image to 3s video (512x512 fixed)',
    avgTime: '30-45s',
    cost: '$0.17',
  },
  SVD: {
    id: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
    name: 'Stable Video Diffusion',
    description: 'Image to video (1024x576, 3s)',
    avgTime: '45-60s',
    cost: '$0.20',
  },
  HOTSHOT_XL: {
    id: 'lucataco/hotshot-xl:78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a',
    name: 'Hotshot-XL',
    description: 'Text/Image to video (Custom resolution: 16:9, 9:16, etc)',
    avgTime: '19s',
    cost: '$0.018',
    supportsCustomResolution: true,
  },
  LTX_VIDEO: {
    id: 'lightricks/ltx-video:6e1bc3916479e2c71558e82926eaee8e4e17d95b33035dbd00070bfeacbcc7c7',
    name: 'LTX Video',
    description: 'High-quality video generation (up to 720x1280)',
    avgTime: '47s',
    cost: '$0.045',
    supportsCustomResolution: true,
  },
  ANIMATEDIFF_LIGHTNING: {
    id: 'bytedance/animatediff-lightning:2685a19f13f8d0aee19d7465a5861ecbf6905c0c708e816c7915e7ffbdffa34b',
    name: 'AnimateDiff Lightning',
    description: 'Ultra-fast text to video (8 steps)',
    avgTime: '15-20s',
    cost: '$0.10',
  },
};

interface ReplicateVideoOptions {
  prompt?: string;
  image?: string; // Base64 or URL
  numFrames?: number;
  fps?: number;
  motionBucketId?: number; // For SVD: 1-255, controls motion intensity
  condAug?: number; // For SVD: 0-1, noise augmentation
  seed?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  // 🆕 Custom Resolution Support
  width?: number; // Custom width (for Hotshot-XL, LTX-Video)
  height?: number; // Custom height (for Hotshot-XL, LTX-Video)
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | 'custom'; // Preset aspect ratios
}

interface ReplicateResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[]; // Video URL(s)
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

/**
 * Get Replicate API key from environment
 */
function getReplicateApiKey(): string {
  const apiKey = import.meta.env.VITE_REPLICATE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Replicate API key not found! Please:\n' +
        '1. Get your API key from https://replicate.com/account/api-tokens\n' +
        '2. Add VITE_REPLICATE_API_KEY to your .env file\n' +
        '3. Restart the development server'
    );
  }
  return apiKey;
}

/**
 * Create a prediction on Replicate
 */
async function createPrediction(
  modelId: string,
  input: Record<string, unknown>
): Promise<ReplicateResponse> {
  const apiKey = getReplicateApiKey();

  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: modelId.split(':')[1], // Extract version from id
      input,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Replicate API error: ${response.status} - ${error.detail || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Poll prediction status until completed
 */
async function waitForPrediction(
  predictionId: string,
  onProgress?: (progress: number) => void,
  timeoutMs: number = 180000 // 3 minutes
): Promise<ReplicateResponse> {
  const apiKey = getReplicateApiKey();
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  let lastProgress = 0; // ✅ Track last progress to ensure monotonic updates

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Replicate prediction timed out after 3 minutes');
    }

    // Fetch prediction status
    const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prediction status: ${response.statusText}`);
    }

    const prediction: ReplicateResponse = await response.json();

    // Update progress (estimate based on elapsed time)
    if (onProgress) {
      const elapsed = Date.now() - startTime;
      const estimatedTotal = 45000; // 45s average
      const progress = Math.min((elapsed / estimatedTotal) * 100, 95);

      // ✅ MONOTONIC FIX: Only update if progress increased
      if (progress > lastProgress) {
        lastProgress = progress;
        onProgress(lastProgress);
      }
    }

    // Check if done
    if (prediction.status === 'succeeded') {
      if (onProgress) onProgress(100);
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${prediction.error || 'Unknown error'}`);
    }

    if (prediction.status === 'canceled') {
      throw new Error('Replicate prediction was canceled');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

/**
 * Generate video using AnimateDiff on Replicate
 *
 * @param prompt - Text description of the video
 * @param image - Optional base image (base64 or URL)
 * @param options - Generation options
 * @param onProgress - Progress callback (0-100)
 * @returns Video URL
 */
export async function generateAnimateDiffVideo(
  prompt: string,
  image?: string,
  options: ReplicateVideoOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('🎬 Replicate Tier 2: AnimateDiff v3');
    console.log('📝 Prompt:', prompt);

    // Prepare input
    const input: Record<string, unknown> = {
      prompt: prompt,
      num_frames: options.numFrames || 16, // 16 frames @ 8fps = 2s
      guidance_scale: options.guidanceScale || 7.5,
      num_inference_steps: options.numInferenceSteps || 25,
    };

    // Add image if provided
    if (image) {
      // Convert base64 to data URL if needed
      if (!image.startsWith('http') && !image.startsWith('data:')) {
        input.image = `data:image/png;base64,${image}`;
      } else {
        input.image = image;
      }
    }

    // Add seed if provided
    if (options.seed !== undefined) {
      input.seed = options.seed;
    }

    // Create prediction
    if (onProgress) onProgress(5);
    const prediction = await createPrediction(REPLICATE_MODELS.ANIMATEDIFF.id, input);

    console.log(`📊 Prediction created: ${prediction.id}`);
    console.log(`⏱️  Estimated time: ${REPLICATE_MODELS.ANIMATEDIFF.avgTime}`);

    // Wait for completion
    const result = await waitForPrediction(prediction.id, onProgress);

    // Extract video URL
    let videoUrl: string;
    if (Array.isArray(result.output)) {
      videoUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      videoUrl = result.output;
    } else {
      throw new Error('Invalid output format from Replicate');
    }

    console.log('✅ AnimateDiff video generated:', videoUrl);
    console.log(`⏱️  Total time: ${result.metrics?.predict_time?.toFixed(1) || 'N/A'}s`);

    return videoUrl;
  } catch (error) {
    console.error('❌ AnimateDiff generation failed:', error);
    throw error;
  }
}

/**
 * Generate video using Stable Video Diffusion on Replicate
 *
 * @param image - Base image (base64 or URL) - REQUIRED for SVD
 * @param options - Generation options
 * @param onProgress - Progress callback (0-100)
 * @returns Video URL
 */
export async function generateSVDVideo(
  image: string,
  options: ReplicateVideoOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('🎬 Replicate Tier 3: Stable Video Diffusion (SVD)');

    // Validate image
    if (!image) {
      throw new Error('SVD requires a base image');
    }

    // Prepare input
    const input: Record<string, unknown> = {
      image:
        image.startsWith('http') || image.startsWith('data:')
          ? image
          : `data:image/png;base64,${image}`,
      num_frames: options.numFrames || 14, // 14 frames @ 6fps = 2.3s
      fps: options.fps || 6,
      motion_bucket_id: options.motionBucketId || 127, // 1-255, higher = more motion
      cond_aug: options.condAug || 0.02, // 0-1, noise augmentation
    };

    // Add seed if provided
    if (options.seed !== undefined) {
      input.seed = options.seed;
    }

    // Create prediction
    if (onProgress) onProgress(5);
    const prediction = await createPrediction(REPLICATE_MODELS.SVD.id, input);

    console.log(`📊 Prediction created: ${prediction.id}`);
    console.log(`⏱️  Estimated time: ${REPLICATE_MODELS.SVD.avgTime}`);
    console.log(`🎚️  Motion strength: ${input.motion_bucket_id}/255`);

    // Wait for completion
    const result = await waitForPrediction(prediction.id, onProgress);

    // Extract video URL
    let videoUrl: string;
    if (Array.isArray(result.output)) {
      videoUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      videoUrl = result.output;
    } else {
      throw new Error('Invalid output format from Replicate');
    }

    console.log('✅ SVD video generated:', videoUrl);
    console.log(`⏱️  Total time: ${result.metrics?.predict_time?.toFixed(1) || 'N/A'}s`);

    return videoUrl;
  } catch (error) {
    console.error('❌ SVD generation failed:', error);
    throw error;
  }
}

/**
 * Generate video using AnimateDiff Lightning (ultra-fast)
 *
 * @param prompt - Text description
 * @param options - Generation options
 * @param onProgress - Progress callback (0-100)
 * @returns Video URL
 */
export async function generateAnimateDiffLightning(
  prompt: string,
  options: ReplicateVideoOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('⚡ Replicate: AnimateDiff Lightning (Ultra-Fast)');
    console.log('📝 Prompt:', prompt);

    const input: Record<string, unknown> = {
      prompt: prompt,
      num_frames: options.numFrames || 16,
      guidance_scale: options.guidanceScale || 1.0, // Lightning uses low guidance
      num_inference_steps: options.numInferenceSteps || 8, // Lightning = 8 steps
    };

    if (options.seed !== undefined) {
      input.seed = options.seed;
    }

    if (onProgress) onProgress(5);
    const prediction = await createPrediction(REPLICATE_MODELS.ANIMATEDIFF_LIGHTNING.id, input);

    console.log(`📊 Prediction created: ${prediction.id}`);
    console.log(`⏱️  Estimated time: ${REPLICATE_MODELS.ANIMATEDIFF_LIGHTNING.avgTime}`);

    const result = await waitForPrediction(prediction.id, onProgress, 120000); // 2 min timeout

    let videoUrl: string;
    if (Array.isArray(result.output)) {
      videoUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      videoUrl = result.output;
    } else {
      throw new Error('Invalid output format from Replicate');
    }

    console.log('✅ Lightning video generated:', videoUrl);
    console.log(`⏱️  Total time: ${result.metrics?.predict_time?.toFixed(1) || 'N/A'}s`);

    return videoUrl;
  } catch (error) {
    console.error('❌ Lightning generation failed:', error);
    throw error;
  }
}

/**
 * 🆕 Generate video using Hotshot-XL (Custom Resolution Support)
 *
 * @param prompt - Text description
 * @param image - Optional base image
 * @param options - Generation options with width/height
 * @param onProgress - Progress callback (0-100)
 * @returns Video URL
 */
export async function generateHotshotXL(
  prompt: string,
  image?: string,
  options: ReplicateVideoOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('🎬 Replicate Tier 2c: Hotshot-XL (Custom Resolution)');
    console.log('📝 Prompt:', prompt);

    // Calculate dimensions based on aspect ratio or use custom
    let width = options.width || 512;
    let height = options.height || 512;

    if (options.aspectRatio && !options.width && !options.height) {
      switch (options.aspectRatio) {
        case '16:9':
          width = 1024;
          height = 576;
          break;
        case '9:16':
          width = 576;
          height = 1024;
          break;
        case '4:3':
          width = 768;
          height = 576;
          break;
        case '3:4':
          width = 576;
          height = 768;
          break;
        case '1:1':
        default:
          width = 512;
          height = 512;
      }
    }

    console.log(`📐 Resolution: ${width}x${height} (${options.aspectRatio || 'custom'})`);

    const input: Record<string, unknown> = {
      prompt: prompt,
      width: width,
      height: height,
      num_frames: options.numFrames || 16,
      guidance_scale: options.guidanceScale || 7.5,
      num_inference_steps: options.numInferenceSteps || 30,
    };

    if (image) {
      input.image =
        image.startsWith('http') || image.startsWith('data:')
          ? image
          : `data:image/png;base64,${image}`;
    }

    if (options.seed !== undefined) {
      input.seed = options.seed;
    }

    if (onProgress) onProgress(5);
    const prediction = await createPrediction(REPLICATE_MODELS.HOTSHOT_XL.id, input);

    console.log(`📊 Prediction created: ${prediction.id}`);
    console.log(`⏱️  Estimated time: ${REPLICATE_MODELS.HOTSHOT_XL.avgTime}`);
    console.log(`💰 Cost: ${REPLICATE_MODELS.HOTSHOT_XL.cost}`);

    const result = await waitForPrediction(prediction.id, onProgress, 90000); // 1.5 min timeout

    let videoUrl: string;
    if (Array.isArray(result.output)) {
      videoUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      videoUrl = result.output;
    } else {
      throw new Error('Invalid output format from Replicate');
    }

    console.log('✅ Hotshot-XL video generated:', videoUrl);
    console.log(`⏱️  Total time: ${result.metrics?.predict_time?.toFixed(1) || 'N/A'}s`);

    return videoUrl;
  } catch (error) {
    console.error('❌ Hotshot-XL generation failed:', error);
    throw error;
  }
}

/**
 * 🆕 Generate video using LTX Video (High Quality Custom Resolution)
 *
 * @param prompt - Text description
 * @param image - Optional base image
 * @param options - Generation options with width/height
 * @param onProgress - Progress callback (0-100)
 * @returns Video URL
 */
export async function generateLTXVideo(
  prompt: string,
  image?: string,
  options: ReplicateVideoOptions = {},
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('🎬 Replicate Tier 2d: LTX Video (High Quality)');
    console.log('📝 Prompt:', prompt);

    // Calculate dimensions (must be divisible by 32)
    let width = options.width || 768;
    let height = options.height || 512;

    if (options.aspectRatio && !options.width && !options.height) {
      switch (options.aspectRatio) {
        case '16:9':
          width = 1280;
          height = 720;
          break;
        case '9:16':
          width = 720;
          height = 1280;
          break;
        case '4:3':
          width = 960;
          height = 720;
          break;
        case '3:4':
          width = 720;
          height = 960;
          break;
        case '1:1':
        default:
          width = 768;
          height = 768;
      }
    }

    // Ensure divisible by 32
    width = Math.round(width / 32) * 32;
    height = Math.round(height / 32) * 32;

    console.log(`📐 Resolution: ${width}x${height} (${options.aspectRatio || 'custom'})`);

    const input: Record<string, unknown> = {
      prompt: prompt,
      width: width,
      height: height,
      num_frames: options.numFrames || 25, // LTX supports more frames
      guidance_scale: options.guidanceScale || 3.0,
      num_inference_steps: options.numInferenceSteps || 30,
    };

    if (image) {
      input.image =
        image.startsWith('http') || image.startsWith('data:')
          ? image
          : `data:image/png;base64,${image}`;
    }

    if (options.seed !== undefined) {
      input.seed = options.seed;
    }

    if (onProgress) onProgress(5);
    const prediction = await createPrediction(REPLICATE_MODELS.LTX_VIDEO.id, input);

    console.log(`📊 Prediction created: ${prediction.id}`);
    console.log(`⏱️  Estimated time: ${REPLICATE_MODELS.LTX_VIDEO.avgTime}`);
    console.log(`💰 Cost: ${REPLICATE_MODELS.LTX_VIDEO.cost}`);

    const result = await waitForPrediction(prediction.id, onProgress, 120000); // 2 min timeout

    let videoUrl: string;
    if (Array.isArray(result.output)) {
      videoUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      videoUrl = result.output;
    } else {
      throw new Error('Invalid output format from Replicate');
    }

    console.log('✅ LTX Video generated:', videoUrl);
    console.log(`⏱️  Total time: ${result.metrics?.predict_time?.toFixed(1) || 'N/A'}s`);

    return videoUrl;
  } catch (error) {
    console.error('❌ LTX Video generation failed:', error);
    throw error;
  }
}

/**
 * Test Replicate API connectivity
 */
export async function testReplicateConnection(): Promise<boolean> {
  try {
    const apiKey = getReplicateApiKey();

    const response = await fetch(`${REPLICATE_API_URL}/models`, {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('✅ Replicate API connection successful');
      return true;
    } else {
      console.error('❌ Replicate API connection failed:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Replicate API test failed:', error);
    return false;
  }
}

/**
 * Get available Replicate models
 */
export function getReplicateModels() {
  return REPLICATE_MODELS;
}

/**
 * Estimate cost for video generation
 */
export function estimateReplicateCost(model: keyof typeof REPLICATE_MODELS): string {
  return REPLICATE_MODELS[model].cost;
}
