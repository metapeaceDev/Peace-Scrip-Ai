/**
 * Motion Editor Types
 * Based on Peace Script Model v1.4 motion_edit structure
 * Enhanced for integration with current AnimateDiff system
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type ShotType = 'Wide Shot' | 'Medium Shot' | 'Close-up' | 'Extreme Close-up' | 'Over-the-Shoulder' | 'Two Shot';

export type CameraMovement = 
  | 'Static'      // ไม่เคลื่อนไหว
  | 'Pan'         // แพน ซ้าย-ขวา
  | 'Tilt'        // เอียง ขึ้น-ลง
  | 'Dolly'       // เคลื่อนที่เข้า-ออก
  | 'Track'       // เคลื่อนที่ตาม
  | 'Zoom'        // ซูมเข้า-ออก
  | 'Handheld'    // ถือกล้องมือ
  | 'Crane'       // กล้องเครน
  | 'Steadicam';  // กล้องเสถียร

export type CameraPerspective = 
  | 'Neutral'     // มุมปกติ
  | 'High Angle'  // มุมสูง
  | 'Low Angle'   // มุมต่ำ
  | 'Bird Eye'    // มุมนกบิน
  | 'Worm Eye'    // มุมหนอน
  | 'Dutch Angle' // มุมเอียง
  | 'POV';        // มุมมองตัวละคร

export type Equipment = 
  | 'Tripod'      // ขาตั้ง
  | 'Handheld'    // ถือมือ
  | 'Dolly'       // รางเลื่อน
  | 'Gimbal'      // กิมบอล
  | 'Crane'       // เครน
  | 'Drone';      // โดรน

export type FocalLength = 
  | '14mm'   // Ultra Wide
  | '24mm'   // Wide
  | '35mm'   // Standard
  | '50mm'   // Normal
  | '85mm'   // Portrait
  | '135mm'  // Telephoto
  | '200mm'; // Super Telephoto

export type ColorTemperature = 
  | 'Warm'    // อบอุ่น (3000-4000K)
  | 'Neutral' // กลางวัน (5000-5500K)
  | 'Cool';   // เย็น (6000-7000K)

// ============================================
// MOTION EDIT INTERFACES
// ============================================

/**
 * Panel 1: Shot Preview Generator
 * Generate basic shot information and voiceover
 */
export interface ShotPreviewPanel {
  structure: string;        // ชื่อตัวละครหลักในฉาก
  prompt: string;           // คำอธิบายฉากโดยรวม
  extra?: string;           // ข้อมูลเพิ่มเติม
  shot_type: ShotType;      // ประเภทช็อต
  voiceover?: string;       // คำพากย์/บรรยายฉาก
}

/**
 * Panel 2: Camera Control
 * Control camera angles, movements, and equipment
 */
export interface CameraControl {
  shot_prompt: string;         // คำอธิบายการจับภาพ
  perspective: CameraPerspective; // มุมกล้อง
  movement: CameraMovement;    // การเคลื่อนไหวกล้อง
  equipment: Equipment;        // อุปกรณ์ถ่ายทำ
  focal_length: FocalLength;   // ความยาวโฟกัส
}

/**
 * Panel 3: Frame Control (3-Layer Composition)
 * Define foreground, main object, and background
 */
export interface FrameControl {
  foreground: string;   // วัตถุหน้าเฟรม (Depth)
  object: string;       // วัตถุหลัก (Focus)
  background: string;   // พื้นหลัง (Context)
}

/**
 * Panel 4: Lighting Design
 * Define lighting setup and color temperature
 */
export interface LightingDesign {
  description: string;           // คำอธิบายการจัดแสง
  color_temperature: ColorTemperature; // อุณหภูมิสี
  mood?: 'Bright' | 'Dim' | 'Dark' | 'Dramatic'; // บรรยากาศแสง
}

/**
 * Panel 5: Sound Design
 * Define sound effects and audio atmosphere
 */
export interface SoundDesign {
  auto_sfx: boolean;     // เปิด/ปิด SFX อัตโนมัติ
  description: string;   // คำอธิบายเสียง
  ambient?: string;      // เสียงบรรยากาศ
}

/**
 * Complete Motion Edit Configuration
 * Combines all 5 panels
 */
export interface MotionEdit {
  shot_preview_generator_panel: ShotPreviewPanel;
  camera_control: CameraControl;
  frame_control: FrameControl;
  lighting_design: LightingDesign;
  sounds: SoundDesign;
}

// ============================================
// AI DIRECTOR SYSTEM
// ============================================

/**
 * AI-Generated Cinematic Suggestions
 * Automatically suggested by videoMotionEngine based on character psychology
 */
export interface CinematicSuggestions {
  suggested_camera: string;     // AI camera recommendation
  suggested_lighting: string;   // AI lighting recommendation
  suggested_sound: string;      // AI sound recommendation
  suggested_movement: CameraMovement; // AI movement recommendation
  suggested_focal_length: FocalLength; // AI focal length recommendation
  confidence: number;           // 0-1 (AI confidence score)
}

/**
 * Manual Overrides
 * User can override AI suggestions
 */
export interface CinematicOverrides {
  camera_prompt?: string;    // Override camera setup
  lighting_prompt?: string;  // Override lighting setup
  sound_prompt?: string;     // Override sound setup
  override_all?: boolean;    // Disable all AI suggestions
}

/**
 * Director System (Hybrid AI + Manual)
 */
export interface DirectorSystem {
  ai_suggestions: CinematicSuggestions;
  user_overrides: CinematicOverrides;
  use_ai_mode: boolean; // true = AI suggestions, false = manual only
}

// ============================================
// INTEGRATION WITH CURRENT SYSTEM
// ============================================

/**
 * Extended Shot Data with Motion Edit
 * Combines existing ShotData with MotionEdit
 */
export interface ShotDataWithMotion {
  // Existing fields from current system
  id: string;
  character_in_shot: string;
  shot_prompt: string;
  extra?: string[];
  shot_type: ShotType;
  
  // New: Motion Edit configuration
  motion_edit: MotionEdit;
  
  // New: Director system
  director?: DirectorSystem;
  
  // Integration with AnimateDiff
  animatediff_params?: {
    motion_strength?: number;    // 0-1 (from videoMotionEngine)
    fps?: number;                // 8-24 (from videoMotionEngine)
    frame_count?: number;        // 8-120 (from videoMotionEngine)
  };
}

// ============================================
// PRESETS & DEFAULTS
// ============================================

/**
 * Default Motion Edit (Neutral Shot)
 */
export const DEFAULT_MOTION_EDIT: MotionEdit = {
  shot_preview_generator_panel: {
    structure: '',
    prompt: '',
    extra: '',
    shot_type: 'Medium Shot',
    voiceover: ''
  },
  camera_control: {
    shot_prompt: '',
    perspective: 'Neutral',
    movement: 'Static',
    equipment: 'Tripod',
    focal_length: '35mm'
  },
  frame_control: {
    foreground: '',
    object: '',
    background: ''
  },
  lighting_design: {
    description: 'Natural lighting',
    color_temperature: 'Neutral',
    mood: 'Bright'
  },
  sounds: {
    auto_sfx: true,
    description: '',
    ambient: ''
  }
};

/**
 * Shot Type Presets
 * Pre-configured settings for common shot types
 */
export const SHOT_PRESETS: Record<ShotType, Partial<MotionEdit>> = {
  'Wide Shot': {
    camera_control: {
      shot_prompt: 'Establish environment and character placement',
      perspective: 'Neutral',
      movement: 'Static',
      equipment: 'Tripod',
      focal_length: '24mm'
    }
  },
  'Medium Shot': {
    camera_control: {
      shot_prompt: 'Focus on character with environmental context',
      perspective: 'Neutral',
      movement: 'Static',
      equipment: 'Tripod',
      focal_length: '35mm'
    }
  },
  'Close-up': {
    camera_control: {
      shot_prompt: 'Emphasize facial expressions and emotions',
      perspective: 'Neutral',
      movement: 'Static',
      equipment: 'Handheld',
      focal_length: '85mm'
    }
  },
  'Extreme Close-up': {
    camera_control: {
      shot_prompt: 'Focus on specific detail (eyes, hands, objects)',
      perspective: 'Neutral',
      movement: 'Static',
      equipment: 'Tripod',
      focal_length: '135mm'
    }
  },
  'Over-the-Shoulder': {
    camera_control: {
      shot_prompt: 'Show interaction between characters',
      perspective: 'Neutral',
      movement: 'Static',
      equipment: 'Tripod',
      focal_length: '50mm'
    }
  },
  'Two Shot': {
    camera_control: {
      shot_prompt: 'Frame two characters in conversation',
      perspective: 'Neutral',
      movement: 'Static',
      equipment: 'Tripod',
      focal_length: '35mm'
    }
  }
};

/**
 * Camera Movement Descriptions (for UI tooltips)
 */
export const CAMERA_MOVEMENT_DESCRIPTIONS: Record<CameraMovement, string> = {
  'Static': 'กล้องอยู่นิ่ง ไม่เคลื่อนไหว - เน้นความสงบ มั่นคง',
  'Pan': 'แพนซ้าย-ขวา - ติดตามการเคลื่อนไหว แสดงสภาพแวดล้อม',
  'Tilt': 'เอียงขึ้น-ลง - เผยให้เห็นความสูง เน้นขนาด',
  'Dolly': 'เคลื่อนเข้า-ออก - สร้างความรู้สึกลึก ดึงดูดหรือถอย',
  'Track': 'เคลื่อนตามตัวละคร - สร้างพลวัต ติดตามการกระทำ',
  'Zoom': 'ซูมเข้า-ออก - เน้นรายละเอียด เปลี่ยนโฟกัส',
  'Handheld': 'ถือกล้องมือ - สร้างความสมจริง ดิบ ตื่นเต้น',
  'Crane': 'กล้องเครน - มุมสูง การเคลื่อนไหวที่หลากหลาย',
  'Steadicam': 'กล้องเสถียร - เคลื่อนไหวลื่นไหล ตามตัวละคร'
};

/**
 * Mood-to-Lighting Mapping (for AI suggestions)
 */
export const MOOD_LIGHTING_MAP: Record<string, Partial<LightingDesign>> = {
  'joyful': {
    description: 'Bright, even lighting with soft shadows',
    color_temperature: 'Warm',
    mood: 'Bright'
  },
  'sad': {
    description: 'Soft, low-key lighting with deep shadows',
    color_temperature: 'Cool',
    mood: 'Dim'
  },
  'angry': {
    description: 'Hard, dramatic lighting with strong contrast',
    color_temperature: 'Warm',
    mood: 'Dramatic'
  },
  'fearful': {
    description: 'Low-key, shadowy lighting with dramatic angles',
    color_temperature: 'Cool',
    mood: 'Dark'
  },
  'neutral': {
    description: 'Natural, balanced lighting',
    color_temperature: 'Neutral',
    mood: 'Bright'
  }
};
