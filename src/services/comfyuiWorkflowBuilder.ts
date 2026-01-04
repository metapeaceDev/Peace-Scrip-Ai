/**
 * ComfyUI Workflow Builder
 * สร้าง ComfyUI workflow JSON จาก options
 */

// Generation Modes
export type GenerationMode = 'quality' | 'balanced' | 'speed';

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
} as const;

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
  imageType?: 'portrait' | 'full-body'; // 🆕 NEW: Distinguish portrait vs full body for aspect ratio
  // Video-specific options
  numFrames?: number; // Number of frames to generate
  fps?: number; // Frames per second
  motionScale?: number; // AnimateDiff motion strength (0.0-1.0)
  motionModel?: string; // AnimateDiff motion module filename
  videoModel?: string; // SVD model filename
  width?: number; // Video width
  height?: number; // Video height
  // 🆕 Character Face ID support for video
  characterImages?: string[]; // Character reference images (base64) for Face ID
  // 🆕 Iteration 13.9.2: Gender from character profile
  gender?: 'male' | 'female' | string; // Character gender from profile data
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
    width = 832, // เพิ่ม width parameter
    height = 1216, // เพิ่ม height parameter
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
        width: width, // ใช้ค่าจาก parameter
        height: height, // ใช้ค่าจาก parameter
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
 * สร้าง FaceSwap workflow ด้วย ReActor (99%+ Face Similarity)
 * แม่นยำกว่า InstantID มาก - ไม่มีปัญหาเพศ/เชื้อชาติผิด
 */
export function buildFaceSwapWorkflow(
  prompt: string,
  referenceImage: string,
  options: WorkflowOptions = {}
): any {
  // Start with base SDXL workflow
  const baseWorkflow = buildSDXLWorkflow(prompt, options);

  // Node 11: Load reference face image
  baseWorkflow['11'] = {
    inputs: {
      image: referenceImage,
      upload: 'image',
    },
    class_type: 'LoadImage',
  };

  // Node 12: ReActor FaceSwap
  // Input: generated image + reference face
  // Output: generated image with swapped face (99%+ similarity)
  baseWorkflow['12'] = {
    inputs: {
      enabled: true,
      swap_model: 'inswapper_128.onnx',
      facedetection: 'retinaface_resnet50',
      face_restore_model: 'GFPGANv1.4.pth',
      face_restore_visibility: 1.0, // 100% face restoration
      codeformer_weight: 0.5,
      detect_gender_input: 'no', // ไม่จำกัดเพศ - ให้ swap ได้ทุกเพศ
      detect_gender_source: 'no',
      input_faces_index: '0', // ใช้หน้าแรกจาก reference
      source_faces_index: '0', // swap หน้าแรกใน generated image
      console_log_level: 1,
      image: ['8', 0], // decoded image from VAE
      face_model: ['11', 0], // reference face
    },
    class_type: 'ReActorFaceSwap',
  };

  // Node 13: Save swapped image
  baseWorkflow['13'] = {
    inputs: {
      filename_prefix: 'peace-script-faceswap',
      images: ['12', 0], // output from ReActor
    },
    class_type: 'SaveImage',
  };

  // Remove original SaveImage (Node 9)
  delete baseWorkflow['9'];

  return baseWorkflow;
}

/**
 * สร้าง SDXL workflow พร้อม InstantID Face Recognition
 */
/**
 * 🎭 COMFYUI WORKFLOW: SDXL + INSTANTID FACE PRESERVATION
 *
 * ใช้สำหรับทั้ง SYSTEM 1 (Generate Profile) และ SYSTEM 2 (Generate Outfit)
 * ทั้ง 2 ระบบใช้ Face Identity Master (faceReferenceImage) เพื่อ match ใบหน้า
 *
 * ความแตกต่าง:
 * - SYSTEM 1 (Portrait): ครึ่งตัว (head and shoulders)
 * - SYSTEM 2 (Outfit): ตัวเต็ม (head to feet)
 *
 * Technology Stack:
 * - Base Model: SDXL (sd_xl_base_1.0.safetensors)
 * - Face Control: InstantID (ip-adapter.bin + controlnet)
 * - Detail Enhancement: add-detail-xl.safetensors LoRA
 *
 * Current Optimized Settings (after 15+ iterations):
 * - Resolution: 768x1312 (ratio ~8:13) - ป้องกันหัวโดนตัด
 * - CFG: 5.1 - สมดุลระหว่างสีสว่างและ control
 * - Steps: 35 - detail มากขึ้นสำหรับมือและหน้า
 * - ip_weight: 0.55 - เพิ่มความเหมือนใบหน้า (Iteration 13.9.1)
 * - cn_strength: 0.50 - ควบคุม pose เบาๆ
 * - noise: 0.15 - เพิ่มรูขุมขนแต่ไม่ทำให้เบลอร์
 *
 * Key Features:
 * ✅ Photorealistic skin with visible pores (1.6)
 * ✅ Natural body proportions (long neck negative 2.0)
 * ✅ Sharp focus on face (blur negative 1.7)
 * ✅ Detailed hands (hand detail keywords + strong negatives)
 * ✅ No text/watermarks (text negative 1.9)
 * ✅ Bright natural colors (CFG 5.1, bright lighting)
 *
 * เรียกจาก: generateCharacterImage() หรือ generateCostumeImage() → ComfyUI service
 */
export function buildSDXLFaceIDWorkflow(
  prompt: string,
  referenceImage: string,
  options: WorkflowOptions = {}
): any {
  // � DETERMINE IMAGE TYPE FIRST (needed for prompts and resolution)
  const imageType = options.imageType || 'full-body'; // Default to full body for backward compatibility

  // 🎨 SMART PROMPTS: Different keywords for portrait vs full body
  let faceIdPrompt: string;
  let faceIdNegativePrompt: string;

  // 🔬 Iteration 13.9.2: GENDER DETECTION - ใช้ข้อมูลจาก profile ก่อน (options.gender) ถ้าไม่มีค่อยตรวจจาก prompt
  const promptLower = prompt.toLowerCase();
  
  // Check gender from options FIRST (from character profile), then fallback to prompt detection
  let isMale = false;
  let isFemale = false;
  
  if (options.gender) {
    // ใช้ข้อมูลจาก character profile (ความแม่นยำ 100%)
    const genderLower = options.gender.toLowerCase();
    isMale = genderLower.includes('male') || genderLower.includes('man') || genderLower.includes('ชาย') || genderLower.includes('ผู้ชาย');
    isFemale = genderLower.includes('female') || genderLower.includes('woman') || genderLower.includes('หญิง') || genderLower.includes('ผู้หญิง');
    console.log(`👤 Gender from profile: ${options.gender} → isMale=${isMale}, isFemale=${isFemale}`);
  } else {
    // Fallback: ตรวจจาก prompt (ความแม่นยำต่ำกว่า)
    isMale =
      promptLower.includes('male') ||
      promptLower.includes('man') ||
      promptLower.includes('men') ||
      promptLower.includes('boy') ||
      promptLower.includes('gentleman') ||
      promptLower.includes('guy') ||
      promptLower.includes('ผู้ชาย') ||
      promptLower.includes('ชาย') ||
      promptLower.includes('หนุ่ม') ||
      promptLower.includes('เด็กชาย');
    
    isFemale =
      promptLower.includes('female') ||
      promptLower.includes('woman') ||
      promptLower.includes('women') ||
      promptLower.includes('girl') ||
      promptLower.includes('lady') ||
      promptLower.includes('ผู้หญิง') ||
      promptLower.includes('หญิง') ||
      promptLower.includes('สาว') ||
      promptLower.includes('เด็กหญิง');
    console.log(`🔍 Gender from prompt: isMale=${isMale}, isFemale=${isFemale}`);
  }
  
  // Check facial hair
  const hasFacialHair =
    promptLower.includes('beard') ||
    promptLower.includes('mustache') ||
    promptLower.includes('moustache') ||
    promptLower.includes('facial hair') ||
    promptLower.includes('stubble') ||
    promptLower.includes('goatee') ||
    promptLower.includes('หนวด') ||
    promptLower.includes('เครา');

  // Build gender-specific negatives (weight 2.2 - ลดลงจาก 2.5 เพื่อไม่ให้บังคับเพศจนหน้าไม่เหมือน)
  let genderNegatives = '';
  if (isMale) {
    // ถ้าเป็นผู้ชาย ต้องต่อต้านผู้หญิง
    genderNegatives = '(female:2.2), (woman:2.2), (feminine:2.1), (girl:2.1), (lady:2.0), (feminine features:2.0), (feminine face:1.9), (soft feminine:1.8), ';
  } else if (isFemale) {
    // ถ้าเป็นผู้หญิง ต้องต่อต้านผู้ชาย
    genderNegatives = '(male:2.2), (man:2.2), (masculine:2.1), (boy:2.1), (gentleman:2.0), (masculine features:2.0), (masculine face:1.9), (strong masculine:1.8), ';
  }
  
  // Build facial hair negatives
  const facialHairNegatives = (isMale || hasFacialHair)
    ? '' // ถ้าเป็นผู้ชายหรือมีหนวด ไม่ต้องต่อต้านหนวด
    : '(mustache:1.9), (beard:1.8), (facial hair:1.7), (stubble:1.6), ';

  if (imageType === 'portrait') {
    // Portrait: Focus on head and shoulders, upper body composition
    // 🍌 BANANA QUALITY: Raw photo aesthetics with maximum realism
    // 🔬 Iteration 13.9: GENDER DETECTION
    faceIdPrompt = `(raw photo:1.4), (hyper-realistic skin texture:1.6), (professional studio portrait:1.7), (studio photography:1.6), ${prompt}, (solo:1.6), (single person:1.5), (one person:1.4), (facing camera directly:2.0), (looking directly at camera:1.9), (straight on view:1.8), (eye contact:1.7), (direct eye contact:1.6), (frontal face:1.7), (frontal view:1.6), (face to camera:1.6), (direct gaze:1.5), (front facing:1.6), (head and shoulders composition:1.6), (portrait composition:1.5), (upper body visible:1.2), (chest up:1.3), (shoulders visible:1.2), (proper hand anatomy:1.5), (realistic hands:1.5), (natural hands:1.4), (five fingers per hand:1.4), (correct finger count:1.4), (normal arms:1.4), (proper arm anatomy:1.3), (natural arm position:1.3), (studio backdrop:1.5), (studio lighting:1.5), (white background:1.3), shot on 35mm film, f/1.8, (depth of field:1.2), (film grain:1.3), Fujifilm XT3, (visible pores:1.7), (skin pores:1.6), (peach fuzz:1.5), (skin imperfections:1.5), (natural skin texture:1.6), (realistic skin pores:1.6), (skin texture detail:1.5), (facial skin detail:1.5), natural skin tones, (natural lip texture:1.3), photorealistic skin with (pore detail:1.4), (natural freckles:1.3), (subtle skin blemishes:1.2), (fine skin texture:1.4), (bare face:1.3), (no makeup:1.2), (fresh face:1.2), (natural face:1.3), (unadorned face:1.1), minimal to no makeup, (natural hair:1.5), (realistic hair:1.4), (individual hair strands:1.4), (hair strand detail:1.3), (flyaway hairs:1.3), (messy hair strands:1.2), (natural hair texture:1.3), hair texture detail, (cinematic lighting:1.3), (rim light:1.2), (window light:1.2), volumetric lighting, natural imperfect lighting, subtle shadows on face, soft natural lighting, chiaroscuro, professional photography, portrait photoshoot quality, realistic human skin, authentic photograph, Canon EOS 5D Mark IV, DSLR photography`;

    faceIdNegativePrompt = `(multiple people:2.4), (two people:2.3), (three people:2.2), (crowd:2.2), (group:2.1), (group photo:2.1), (many people:2.0), (text:2.3), (words:2.3), (letters:2.2), (caption:2.1), (watermark:2.0), (signature:1.9), (frame:2.5), (picture frame:2.5), (photo frame:2.4), (border:2.4), (framed:2.3), (frame border:2.3), (decorative frame:2.2), (vignette:2.2), (dark edges:2.1), (rounded corners:2.0), (corner vignette:2.0), (frame effect:1.9), (polaroid frame:1.9), (instagram frame:1.8), ${genderNegatives}(side view:2.7), (profile view:2.7), (profile:2.6), (profile shot:2.6), (side profile:2.6), (side angle:2.5), (turned head:2.5), (head turned:2.4), (back view:2.4), (rear view:2.3), (looking away:2.3), (averted gaze:2.2), (looking to the side:2.2), (turned away:2.1), (three quarter view:2.0), (3/4 view:2.0), (angled face:1.9), (tilted head:1.9), (head tilt:1.8), (angle shot:1.8), (black and white:2.0), (monochrome:2.0), (grayscale:2.0), (desaturated:1.8), sepia, no color, colorless, (dark skin:1.7), (dark lips:1.8), (muddy colors:1.6), (underexposed:1.6), (cropped head:1.9), (head cut off:1.9), (cut off head:1.8), (full body:2.5), (full body shot:2.4), (body shot:2.4), (full length:2.4), (legs visible:2.5), (feet visible:2.5), (shoes visible:2.4), (standing pose:2.3), (whole body:2.4), (entire body:2.3), (full figure:2.3), (waist down:2.2), (lower body:2.2), (thighs visible:2.1), (knees visible:2.1), (ankles visible:2.0), (cartoon:2.4), (anime:2.4), (illustration:2.3), (3D render:2.2), (CGI:2.1), (doll:2.0), (toy:1.9), (smooth skin:1.1), (plastic skin:1.5), (airbrushed:1.4), (perfect skin:1.3), (flawless skin:1.3), (poreless skin:1.2), (wax figure:1.8), (synthetic skin:1.6), (beauty filter:1.5), (heavy makeup:2.1), (thick makeup:2.0), (excessive makeup:2.0), (stage makeup:1.9), (theatrical makeup:1.9), (heavy foundation:1.8), (caked makeup:1.8), (obvious makeup:1.7), (dramatic eye makeup:1.7), (bold lipstick:1.6), (eyeliner:1.5), (mascara:1.4), (eye shadow:1.4), (rouge:1.3), (foundation:1.3), ${facialHairNegatives}(plastic hair:1.5), (shiny hair:1.4), (perfect hair:1.4), (glossy hair:1.3), (wig:1.4), over-processed, too polished, overly refined, perfect lighting, flat lighting, (deformed hands:2.7), (mutated hands:2.6), (extra fingers:2.7), (missing fingers:2.6), (fused fingers:2.6), (too many fingers:2.5), (fewer than five fingers:2.5), (six fingers:2.6), (four fingers:2.5), (malformed hands:2.5), (bad hands:2.5), (ugly hands:2.4), (weird hands:2.4), (incorrect hands:2.4), (hand deformity:2.5), (deformed arms:2.4), (mutated arms:2.3), (extra limbs:2.4), (extra arms:2.3), (missing limbs:2.3), (missing arms:2.2), (bad anatomy:2.5), (wrong anatomy:2.4), (anatomically incorrect:2.3), (incorrect anatomy:2.3), (impossible anatomy:2.4), deformed body parts, stretched limbs, wrong proportions, (long neck:2.0), (elongated neck:2.0), (stretched neck:2.0), (giraffe neck:1.9), abnormal neck length, (high contrast:1.7), (harsh contrast:1.6), (oversaturated:1.5), (blurry face:1.7), low quality, blurry`;
  } else {
    // Full Body: Focus on complete body from head to feet - STANDING STRAIGHT, FACING CAMERA
    // 🎯 MAXIMUM WEIGHT for full-body composition to prevent cropping
    // 🍌 BANANA QUALITY: Raw photo aesthetics with maximum realism
    // Full Body: Focus on complete body from head to feet - STANDING STRAIGHT, FACING CAMERA
    // 🎯 MAXIMUM WEIGHT for full-body composition to prevent cropping
    // 🍌 BANANA QUALITY: Raw photo aesthetics with maximum realism
    // 🔬 Iteration 13.9: GENDER DETECTION (ใช้ตัวแปร isMale, isFemale, genderNegatives, facialHairNegatives จากด้านบน)
    faceIdPrompt = `(raw photo:1.4), (FULL BODY SHOT:1.8), (complete person from head to toes:1.9), (entire body visible:1.8), (full figure photograph:1.7), (wide shot:1.6), (full body photograph:1.6), ${prompt}, (solo:1.7), (single person:1.6), (one person:1.5), (standing straight:1.5), (facing camera directly:1.7), (looking at camera:1.5), (eye contact:1.4), (direct gaze:1.3), (frontal view:1.4), (head to feet in frame:1.8), (feet and shoes visible:1.9), (both feet visible:1.8), (shoes in frame:1.7), (legs fully visible:1.7), (full legs:1.6), (ankles visible:1.6), (proper leg anatomy:1.5), (realistic legs:1.5), (normal legs:1.4), (correct leg proportions:1.4), (natural leg pose:1.4), (two feet:1.5), (proper foot anatomy:1.5), (realistic feet:1.5), (arms visible:1.5), (hands visible:1.4), (proper hand anatomy:1.6), (realistic hands:1.6), (natural hands:1.5), (five fingers per hand:1.5), (correct finger count:1.5), (ten fingers total:1.4), (normal arms:1.5), (proper arm anatomy:1.5), (natural arm position:1.4), (correct arm proportions:1.4), (centered in frame:1.3), (full length portrait:1.6), (body proportions accurate:1.5), (anatomically correct:1.5), (realistic human proportions:1.5), (natural body shape:1.4), shot on 35mm film, f/2.8, (depth of field:1.2), (film grain:1.3), Fujifilm XT3, (photorealistic:1.6), (hyperrealistic:1.5), (realistic photography:1.5), (real human photograph:1.4), (hyper-realistic skin texture:1.4), (visible pores:1.3), (skin imperfections:1.3), photorealistic human skin, (natural skin texture:1.3), natural skin tones, (bare face:1.3), (no makeup:1.2), (fresh face:1.2), (natural face:1.3), (unadorned face:1.1), minimal to no makeup, (natural hair:1.4), (realistic hair:1.3), (individual hair strands:1.2), hair texture detail, (cinematic lighting:1.3), (rim light:1.2), volumetric lighting, natural lighting, soft natural lighting, chiaroscuro, professional photography, upright standing pose, fashion photography composition, authentic photograph, Canon EOS 5D Mark IV, DSLR photography`;

    faceIdNegativePrompt = `(multiple people:2.5), (two people:2.4), (three people:2.3), (crowd:2.3), (group:2.2), (group photo:2.2), (many people:2.1), (other person:2.0), (text:2.4), (words:2.4), (letters:2.3), (caption:2.2), (watermark:2.1), (signature:2.0), (frame:2.6), (picture frame:2.6), (photo frame:2.5), (border:2.5), (framed:2.4), (frame border:2.4), (decorative frame:2.3), (vignette:2.3), (dark edges:2.2), (rounded corners:2.1), (corner vignette:2.1), (frame effect:2.0), (polaroid frame:2.0), (instagram frame:1.9), ${genderNegatives}(ZOOMED IN:2.4), (CLOSE-UP:2.4), (FACE CLOSE-UP:2.3), (tight crop:2.2), (cropped body:2.2), (cropped person:2.2), (body cut off:2.2), (cut off at waist:2.2), (cut off at thighs:2.1), (cut off at knees:2.1), (cut off at ankles:2.4), (cut off at feet:2.4), (feet cut off:2.5), (missing legs:2.6), (missing feet:2.6), (feet out of frame:2.5), (shoes out of frame:2.4), (legs out of frame:2.5), (ankles out of frame:2.3), (partial body:2.1), (upper body only:2.3), (half body:2.2), (portrait:2.3), (headshot:2.3), (bust shot:2.2), (head and shoulders:2.1), (torso only:2.1), (cropped at waist:2.0), (side view:2.3), (profile view:2.3), (profile:2.2), (back view:2.2), (rear view:2.1), (looking away:2.1), (averted gaze:2.0), (looking to the side:2.0), (turned away:1.9), (three quarter view:1.8), (angled body:1.7), (black and white:2.1), (monochrome:2.1), (grayscale:2.1), (desaturated:1.9), sepia, colorless, (dark skin:1.7), (dark lips:1.8), (muddy colors:1.6), (underexposed:1.6), (cropped head:1.9), (head cut off:1.9), tilted, leaning, sitting, crouching, kneeling, lying down, (cartoon:2.6), (anime:2.6), (cartoon style:2.5), (illustration:2.5), (drawing:2.4), (3D render:2.0), (CGI:1.9), (smooth skin:1.1), (plastic skin:1.5), (airbrushed:1.4), (wax figure:1.7), (heavy makeup:2.1), (thick makeup:2.0), (excessive makeup:2.0), (stage makeup:1.9), (theatrical makeup:1.9), (heavy foundation:1.8), (caked makeup:1.8), (obvious makeup:1.7), (dramatic eye makeup:1.7), (bold lipstick:1.6), (eyeliner:1.5), (mascara:1.4), (eye shadow:1.4), (rouge:1.3), (foundation:1.3), (plastic hair:1.4), (shiny hair:1.3), ${facialHairNegatives}(deformed hands:2.8), (mutated hands:2.7), (extra fingers:2.8), (missing fingers:2.7), (fused fingers:2.7), (too many fingers:2.6), (fewer than five fingers:2.6), (six fingers:2.7), (four fingers:2.6), (three fingers:2.5), (malformed hands:2.6), (bad hands:2.6), (ugly hands:2.5), (weird hands:2.5), (incorrect hands:2.5), (hand deformity:2.6), (broken fingers:2.5), (twisted fingers:2.5), (deformed arms:2.6), (mutated arms:2.5), (extra limbs:2.6), (extra arms:2.5), (missing limbs:2.5), (missing arms:2.4), (three arms:2.5), (one arm:2.4), (deformed legs:2.7), (mutated legs:2.6), (extra legs:2.6), (missing legs:2.6), (three legs:2.6), (one leg:2.5), (twisted legs:2.5), (broken legs:2.5), (deformed feet:2.7), (mutated feet:2.6), (missing toes:2.5), (extra toes:2.5), (fused toes:2.5), (bad anatomy:2.7), (wrong anatomy:2.6), (anatomically incorrect:2.5), (incorrect anatomy:2.5), (impossible anatomy:2.6), (body horror:2.5), deformed body parts, stretched limbs, wrong proportions, (disproportionate body:2.4), (elongated body:2.3), (stretched body:2.2), (long neck:2.0), (elongated neck:2.0), (long torso:2.2), (short legs:2.1), (uneven limbs:2.3), (asymmetric body:2.2), abnormal body proportions, (high contrast:1.4), (harsh contrast:1.3), (oversaturated:1.4), (blurry face:1.7), low quality, blurry`;
  }

  // 🆕 SMART RESOLUTION: Different aspect ratios for portrait vs full body
  let resolutionWidth: number;
  let resolutionHeight: number;

  if (imageType === 'portrait') {
    // Portrait: 3:4 aspect ratio (head and shoulders)
    resolutionWidth = 896;
    resolutionHeight = 1152;
    console.log('📸 Using PORTRAIT resolution: 896x1152 (3:4 ratio) - comfyuiWorkflowBuilder.ts:380');
  } else {
    // Full Body: 13:19 aspect ratio (wider frame to prevent face zoom)
    // 🔧 Iteration 11: Changed from 768x1408 to 832x1216 (wider, less tall)
    resolutionWidth = 832; // เพิ่มจาก 768 เพื่อไม่ให้ซูมหน้า
    resolutionHeight = 1216; // ลดจาก 1408 เพื่อ full body ไม่ซูมเข้ามา
    console.log('👔 Using FULL BODY resolution: 832x1216 (13:19 ratio  wider frame, antizoom) - comfyuiWorkflowBuilder.ts:386');
  }

  // 🔍 DEBUG: Verify resolution is being set
  console.log(`🔍 Resolution check: width=${resolutionWidth}, height=${resolutionHeight} - comfyuiWorkflowBuilder.ts:390`);

  // 🍌 BANANA QUALITY APPROACH: Low CFG for natural look, moderate LoRA for detail
  const baseWorkflow = buildSDXLWorkflow(prompt, {
    ...options,
    lora: 'add-detail-xl.safetensors', // ⭐ เปิดใช้ LoRA สำหรับ texture detail
    loraStrength: 0.35, // ลดจาก 0.38 → 0.35 เพื่อหลีกเลี่ยง over-stylization
    cfg: 5.2, // ลดจาก 7.8 → 5.2 ให้ความเป็นธรรมชาติสูงสุด (Banana Quality)
    steps: 35, // คงที่ 35 steps สำหรับ balance ระหว่างความเร็วและคุณภาพ
    width: resolutionWidth,
    height: resolutionHeight,
    negativePrompt: faceIdNegativePrompt,
  });

  // Update positive prompt text node (keep CLIP wiring unchanged)
  if (baseWorkflow?.['6']?.inputs) {
    baseWorkflow['6'].inputs.text = faceIdPrompt;
  }

  // InstantID (recommended SDXL path) nodes:
  // 11: LoadImage (reference face)
  // 12: InstantIDModelLoader
  // 13: InstantIDFaceAnalysis
  // 18: FaceKeypointsPreprocessor (outputs keypoints image)
  // 15: ControlNetLoader (InstantID ControlNet)
  // 14: ApplyInstantIDAdvanced (outputs MODEL + updated CONDITIONING)

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
      provider: 'CUDA', // ใช้ GPU แทน CPU สำหรับ RTX 5090
    },
    class_type: 'InstantIDFaceAnalysis',
  };

  // Node 18: Face keypoints preprocessor (ช่วยให้ InstantID เกาะใบหน้าได้แม่นขึ้น)
  baseWorkflow['18'] = {
    inputs: {
      faceanalysis: ['13', 0],
      image: ['11', 0],
    },
    class_type: 'FaceKeypointsPreprocessor',
  };

  // Node 15: Load ControlNet for InstantID
  baseWorkflow['15'] = {
    inputs: {
      control_net_name: 'instantid_controlnet.safetensors',
    },
    class_type: 'ControlNetLoader',
  };

  // Node 14: 🍌 BANANA QUALITY - Reduced InstantID strength for natural texture
  // 🔬 Iteration 13.6 - ANTI-COMPOSITION FOR BOTH: Reduce ControlNet for Portrait to prevent pose copying
  const isFullBody = imageType !== 'portrait';
  
  baseWorkflow['14'] = {
    inputs: {
      instantid: ['12', 0],
      insightface: ['13', 0],
      control_net: ['15', 0],
      image: ['11', 0],
      model: [baseWorkflow['3'].inputs.model[0], 0],
      positive: ['6', 0],
      negative: ['7', 0],
      ip_weight: 0.55, // 🔥 Iteration 13.9.1: 0.40→0.55 (เพิ่ม 37%) - เพิ่มความเหมือนใบหน้า!
      cn_strength: isFullBody ? 0.12 : 0.48, // 🔥 Portrait: 0.38→0.48 (เพิ่ม 26%) - เพิ่มความเหมือนโครงหน้าแต่ยังป้องกัน copy pose!
      start_at: 0.0,
      end_at: isFullBody ? 0.35 : 0.70, // Portrait: 0.70 คงที่ - ให้ AI control pose ใน 30% สุดท้าย
      noise: 0.12, // คงที่ รักษาความคมชัด
      combine_embeds: 'average',
      image_kps: ['18', 0],
    },
    class_type: 'ApplyInstantIDAdvanced',
  };
  
  console.log(`🎚️ InstantID Settings: ip_weight=0.55, cn_strength=${isFullBody ? 0.12 : 0.48}, end_at=${isFullBody ? 0.35 : 0.70} (${isFullBody ? 'FULL BODY' : 'PORTRAIT'}  HIGH FACIAL SIMILARITY) - comfyuiWorkflowBuilder.ts:483`);

  // Update KSampler to use InstantID-augmented model + conditioning
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
    ckpt_name = 'flux_dev.safetensors',
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
        ckpt_name: ckpt_name,
      },
      class_type: 'CheckpointLoaderSimple',
    },
    '5': {
      inputs: {
        width: 832,
        height: 1216,
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
    imageType = 'full-body', // 🆕 Default to full-body for backward compatibility
  } = options;

  const finalSeed = seed || Math.floor(Math.random() * 1000000000);

  // 🆕 SMART RESOLUTION: Different aspect ratios for portrait vs full body
  let width: number;
  let height: number;

  if (imageType === 'portrait') {
    // Portrait: 3:4 aspect ratio (head and shoulders)
    width = 896;
    height = 1152;
    console.log('📸 IPAdapter using PORTRAIT resolution: 896x1152 (3:4 ratio) - comfyuiWorkflowBuilder.ts:623');
  } else {
    // Full Body: ~8:13 aspect ratio (head to feet)
    width = 768;
    height = 1312;
    console.log('👔 IPAdapter using FULL BODY resolution: 768x1312 (~8:13 ratio) - comfyuiWorkflowBuilder.ts:628');
  }

  // Start with base SDXL workflow
  const baseWorkflow = buildSDXLWorkflow(prompt, {
    lora,
    loraStrength,
    negativePrompt,
    steps,
    cfg,
    seed: finalSeed,
    ckpt_name,
    width,
    height,
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
      clip_name: 'clip_vision_g.safetensors', // Explicitly specify CLIP Vision model
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
  // 🔍 DEBUG: Log imageType to verify it's being passed correctly
  console.log('🎭 buildWorkflow called with imageType: - comfyuiWorkflowBuilder.ts:693', options.imageType || 'undefined (will default to full-body)');
  
  // ถ้ามี reference image
  if (options.referenceImage) {
    // Mac/MPS: ใช้ IP-Adapter (เร็วกว่า InstantID มาก)
    if (options.useIPAdapter) {
      console.log('🍎 Using IPAdapter workflow (Mac Optimized) - comfyuiWorkflowBuilder.ts:699');
      return buildIPAdapterWorkflow(prompt, options.referenceImage, options);
    }

    // Windows/Linux + NVIDIA: ใช้ InstantID (ความเหมือนสูงสุด)
    console.log('🚀 Using InstantID workflow (Windows/Linux + NVIDIA) - comfyuiWorkflowBuilder.ts:704');
    console.log('🎭 Passing imageType to buildSDXLFaceIDWorkflow: - comfyuiWorkflowBuilder.ts:705', options.imageType || 'undefined');
    return buildSDXLFaceIDWorkflow(prompt, options.referenceImage, options);
  }

  // Default: SDXL workflow
  return buildSDXLWorkflow(prompt, options);
}

/**
 * สร้าง AnimateDiff workflow พร้อม Face ID สำหรับ character consistency
 * ใช้ IP-Adapter ร่วมกับ AnimateDiff เพื่อรักษาหน้าตัวละครให้คงที่
 */
function buildAnimateDiffWithFaceIDWorkflow(
  prompt: string,
  characterImage: string,
  options: WorkflowOptions = {}
): any {
  // Start with base AnimateDiff workflow (without Face ID)
  const baseWorkflow = buildAnimateDiffWorkflow(prompt, { ...options, characterImages: undefined });

  // Node 10: Load Character Reference Image
  baseWorkflow['10'] = {
    inputs: {
      image: characterImage,
      upload: 'image',
    },
    class_type: 'LoadImage',
  };

  // Node 11: IPAdapter Unified Loader (Face mode)
  // ใช้ preset "PLUS FACE (portraits)" สำหรับ Face ID
  baseWorkflow['11'] = {
    inputs: {
      model: ['1', 0], // SD 1.5 checkpoint
      preset: 'PLUS FACE (portraits)', // Face matching optimized
    },
    class_type: 'IPAdapterUnifiedLoader',
  };

  // Node 12: Apply IP-Adapter to Model
  const mode = options.generationMode || 'balanced';
  const modeSettings = MODE_PRESETS[mode];

  baseWorkflow['12'] = {
    inputs: {
      model: ['11', 0], // Model from Unified Loader
      ipadapter: ['11', 1], // IPAdapter from Unified Loader
      image: ['10', 0], // Character reference image
      weight: modeSettings.weight * 0.85, // Slightly reduced for video consistency
      weight_type: 'style transfer',
      start_at: 0.0,
      end_at: 1.0,
    },
    class_type: 'IPAdapter',
  };

  // Update AnimateDiff Loader to use IP-Adapter modified model
  baseWorkflow['5'].inputs.model = ['12', 0]; // Use Face ID model instead of base model

  console.log('🎭 Face ID enabled for AnimateDiff video generation - comfyuiWorkflowBuilder.ts:764');
  return baseWorkflow;
}

/**
 * สร้าง AnimateDiff workflow สำหรับ text-to-video
 * ใช้ AnimateDiff motion module + SD 1.5 checkpoint
 */
export function buildAnimateDiffWorkflow(prompt: string, options: WorkflowOptions = {}): any {
  const {
    lora,
    loraStrength = 0.8,
    negativePrompt = 'low quality, blurry, distorted, watermark, text, inconsistent, morphing, warping, shifting perspective',
    steps = 20,
    cfg = 8.0,
    seed,
    numFrames = VIDEO_MODELS.animateDiff.defaultFrames,
    fps = VIDEO_MODELS.animateDiff.fps,
    motionScale: _motionScale = 0.6, // 🔧 REDUCED: Default 0.6 for better stability (was 1.0)
    motionModel = VIDEO_MODELS.animateDiff.motionModels.v2,
    ckpt_name = VIDEO_MODELS.animateDiff.baseModels.sd15_realistic,
    width = 512,
    height = 512,
  } = options;

  const finalSeed = seed || Math.floor(Math.random() * 1000000000);

  // 🆕 CHARACTER FACE ID: ถ้ามีรูปตัวละคร ใช้ Face ID workflow
  if (options.characterImages && options.characterImages.length > 0) {
    console.log(`🎭 Using Face ID for ${options.characterImages.length} character(s) - comfyuiWorkflowBuilder.ts:793`);
    // สำหรับตอนนี้ใช้ตัวละครแรก (primary character)
    return buildAnimateDiffWithFaceIDWorkflow(prompt, options.characterImages[0], options);
  }

  const workflow: any = {
    // Node 1: Checkpoint Loader (SD 1.5)
    '1': {
      inputs: {
        ckpt_name: ckpt_name,
      },
      class_type: 'CheckpointLoaderSimple',
    },

    // Node 9 (optional): LoRA Loader (applies to model + clip)
    ...(lora
      ? {
          '9': {
            inputs: {
              model: ['1', 0],
              clip: ['1', 1],
              lora_name: lora,
              strength_model: loraStrength,
              strength_clip: loraStrength,
            },
            class_type: 'LoraLoader',
          },
        }
      : {}),

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
        clip: lora ? ['9', 1] : ['1', 1],
      },
      class_type: 'CLIPTextEncode',
    },

    // Node 4: CLIP Text Encode (Negative)
    '4': {
      inputs: {
        text: negativePrompt,
        clip: lora ? ['9', 1] : ['1', 1],
      },
      class_type: 'CLIPTextEncode',
    },

    // Node 5: AnimateDiff Loader V1 (loads motion module)
    '5': {
      inputs: {
        model_name: motionModel,
        beta_schedule: 'sqrt_linear', // AnimateDiff beta schedule
        model: lora ? ['9', 0] : ['1', 0],
      },
      class_type: 'AnimateDiffLoaderV1',
    },

    // Node 6: KSampler (with AnimateDiff model)
    '6': {
      inputs: {
        seed: finalSeed,
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

  return workflow;
}

/**
 * สร้าง Stable Video Diffusion (SVD) workflow สำหรับ image-to-video
 * ใช้ SVD model เพื่อแปลง static image เป็น video
 */
export function buildSVDWorkflow(referenceImage: string, options: WorkflowOptions = {}): any {
  const {
    seed,
    numFrames = VIDEO_MODELS.svd.defaultFrames,
    fps = 12, // 🔧 INCREASED: 6→12 FPS for smoother playback
    motionScale = 50, // 🔧 FURTHER REDUCED: 65→50 for very subtle, natural motion
    steps = 25, // 🔧 INCREASED: 20→25 for smoother motion generation
    cfg = 3.5, // 🔧 INCREASED: 2.5→3.5 for better detail/quality
    videoModel = VIDEO_MODELS.svd.checkpoints.xt,
    width = 1024,
    height = 576,
  } = options;

  const finalSeed = seed || Math.floor(Math.random() * 1000000000);

  const workflow: any = {
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
        augmentation_level: 0.05, // 🔧 INCREASED: 0.0→0.05 reduces contrast, adds subtle variation
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
        seed: finalSeed,
        steps: steps,
        cfg: cfg,
        sampler_name: 'euler',
        scheduler: 'karras',
        denoise: 0.95, // 🔧 REDUCED: 1.0→0.95 reduces over-contrast and noise
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

    // 🆕 Node 7: RIFE Frame Interpolation (12 FPS → 60 FPS)
    // Interpolate frames for smooth 60 FPS output
    '7': {
      inputs: {
        ckpt_name: 'rife47.pth', // RIFE 4.7 model
        clear_cache_after_n_frames: 10,
        multiplier: 5, // 12 FPS * 5 = 60 FPS
        fast_mode: true,
        ensemble: false,
        scale_factor: 1.0,
        frames: ['5', 0], // Decoded frames from VAE
      },
      class_type: 'RIFE VFI',
    },

    // Node 6: VHS Video Combine (with interpolated frames)
    '6': {
      inputs: {
        frame_rate: 60, // 🔧 INCREASED: Output at 60 FPS after interpolation
        loop_count: 0,
        filename_prefix: 'peace-script-svd',
        format: 'video/h264-mp4',
        pingpong: false,
        save_output: true,
        images: ['7', 0], // 🔧 CHANGED: Use interpolated frames instead of raw frames
      },
      class_type: 'VHS_VideoCombine',
    },
  };

  console.log(
    `🎬 SVD Workflow: ${numFrames} frames @ ${fps} FPS (base) → 60 FPS (interpolated), motion=${motionScale}, cfg=${cfg}`
  );
  return workflow;
}

/**
 * สร้าง AnimateDiff + ControlNet workflow สำหรับ video with pose control
 */
export function buildAnimateDiffControlNetWorkflow(
  prompt: string,
  _controlImages: string[],
  options: WorkflowOptions = {}
): any {
  // Start with base AnimateDiff workflow
  const baseWorkflow = buildAnimateDiffWorkflow(prompt, options);

  // TODO: Add ControlNet nodes for pose/depth control
  // This requires:
  // - LoadImage nodes for each control frame
  // - ControlNetLoader node
  // - ControlNetApply node
  // - Batch processing for multiple control frames

  console.warn('⚠️ AnimateDiff + ControlNet workflow not yet implemented - comfyuiWorkflowBuilder.ts:1036');
  return baseWorkflow;
}
