export interface Character {
  id: string; // Mandatory for robust deletion and list management
  name: string;
  role: string; // New: Protagonist, Supporting, Extra, etc.
  description: string;
  image?: string; // Base64 string for profile picture
  faceReferenceImage?: string; // New: Master face reference for identity consistency
  fashionReferenceImage?: string; // New: Reference image for costume/outfit style
  imageStyle?: string; // Selected art style
  preferredModel?: string; // New: Preferred AI model ID (e.g., 'pollinations', 'comfyui-sdxl', 'gemini-pro')
  outfitCollection?: { id?: string; description: string; image: string }[]; // New: Collection of generated outfits with IDs
  external: Record<string, string>;
  physical: Record<string, string>;
  fashion: Record<string, string>; // New field for Costume/Clothing details
  internal: {
    consciousness: Record<string, number>;
    subconscious: Record<string, string>;
    defilement: Record<string, number>;
  };
  // NEW: Emotional State Tracking (calculated per scene)
  emotionalState?: {
    currentMood: 'peaceful' | 'joyful' | 'angry' | 'confused' | 'fearful' | 'neutral';
    energyLevel: number; // 0-100
    mentalBalance: number; // -100 to +100
    lastUpdated?: string; // Scene number or timestamp
  };
  goals: {
    objective: string;
    need: string;
    action: string;
    conflict: string;
    backstory: string;
  };
  // NEW: Buddhist Psychology (Digital Mind Model v14)
  buddhist_psychology?: {
    anusaya: AnusayaProfile; // 7 latent tendencies
    carita: CaritaType; // Primary temperament
    carita_secondary?: CaritaType; // Secondary temperament
  };
  // NEW: Parami Portfolio (10 Perfections)
  parami_portfolio?: ParamiPortfolio;
  // NEW: Mind State (for Citta tracking)
  mind_state?: {
    current_bhumi: number; // 1-31 (Bhumi ID)
    active_upadanas: ActiveUpadana[]; // Active clinging instances
    recent_citta_history: CittaType[]; // Last 20 citta moments
    samyojana?: Samyojana; // 10 Fetters status
    magga_stage?: MaggaStage; // Current Ariya stage
  };
  // NEW: Psychology Timeline
  psychology_timeline?: CharacterPsychologyTimeline;
  // NEW: Speech Pattern & Dialect Configuration
  speechPattern?: {
    dialect: DialectType; // ภาษาท้องถิ่น
    accent: AccentType; // สำเนียง
    formalityLevel: FormalityLevel; // ระดับความเป็นทางการ
    personality: SpeechPersonality; // บุคลิกภาษา
    customPhrases?: string[]; // คำพูดเฉพาะตัว
    speechTics?: string[]; // ท่าทางการพูด (เช่น "เนอะ", "นะจ๊ะ")
  };
  // NEW: Voice Cloning ID (Legacy)
  voiceCloneId?: string; // ID ของเสียงที่โคลนสำหรับตัวละคร (Legacy field)
  // NEW: Voice Cloning Configuration (Plan C)
  voiceCloning?: {
    hasVoiceSample: boolean; // มี voice sample หรือไม่
    voiceSampleId?: string; // ID ของ voice sample ที่อัพโหลด
    language?: string; // ภาษาที่ใช้ในการสังเคราะห์เสียง (en, es, fr, de, etc.)
    temperature?: number; // ความสร้างสรรค์ของเสียง (0.0-1.0)
  };
}

// Speech Pattern Types
export type DialectType =
  | 'standard' // ภาษากลาง
  | 'isaan' // อีสาน
  | 'northern' // เหนือ
  | 'southern' // ใต้
  | 'central' // กลาง (ชัดเจน)
  | 'custom'; // กำหนดเอง

export type AccentType =
  | 'none' // ไม่มีสำเนียง
  | 'isaan' // สำเนียงอีสาน
  | 'northern' // สำเนียงเหนือ
  | 'southern' // สำเนียงใต้
  | 'chinese' // สำเนียงจีน
  | 'western' // สำเนียงฝรั่ง
  | 'custom'; // กำหนดเอง

export type FormalityLevel =
  | 'formal' // ทางการ (ครับ/ค่ะ)
  | 'informal' // ไม่เป็นทางการ (นะ/จ้ะ)
  | 'casual' // สบายๆ (เว้ย/เฮ้ย)
  | 'slang'; // สแลง

export type SpeechPersonality =
  | 'polite' // สุภาพ
  | 'rude' // หยาบคาย
  | 'humorous' // ตลก
  | 'serious' // จริงจัง
  | 'childlike' // เด็ก
  | 'elderly' // ผู้สูงอายุ
  | 'intellectual'; // ปัญญาชน

// Buddhist Psychology Types (re-exported from digitalMind.ts for convenience)
export type AnusayaProfile = {
  kama_raga: number; // 0-100
  patigha: number;
  mana: number;
  ditthi: number;
  vicikiccha: number;
  bhava_raga: number;
  avijja: number;
};

export type CaritaType = 'ราคจริต' | 'โทสจริต' | 'โมหจริต' | 'สัทธาจริต' | 'พุทธิจริต' | 'วิตกจริต';

export type ParamiPortfolio = {
  dana: { level: number; exp: number };
  sila: { level: number; exp: number };
  nekkhamma: { level: number; exp: number };
  viriya: { level: number; exp: number };
  khanti: { level: number; exp: number };
  sacca: { level: number; exp: number };
  adhitthana: { level: number; exp: number };
  metta: { level: number; exp: number };
  upekkha: { level: number; exp: number };
  panna: { level: number; exp: number };
};

export type ActiveUpadana = {
  type: 'kamupadana' | 'ditthupadana' | 'silabbatupadana' | 'attavadupadana';
  intensity: number;
  target: string;
  created_at: number;
  tanha_history: number[];
};

export type CittaType = string; // Full type definition in cittaTypes.ts

export type Samyojana = {
  sakkaya_ditthi: boolean;
  vicikiccha: boolean;
  silabbata_paramasa: boolean;
  kama_raga: boolean;
  patigha: boolean;
  rupa_raga: boolean;
  arupa_raga: boolean;
  mana: boolean;
  uddhacca: boolean;
  avijja: boolean;
};

export type MaggaStage = 'sotapatti' | 'sakadagami' | 'anagami' | 'arahatta';

export interface PlotPoint {
  title: string;
  description: string;
  act?: number; // Act number (1, 2, or 3) for 3-act structure grouping
}

export interface DialogueLine {
  id: string;
  character: string;
  dialogue: string;
}

export interface GeneratedScene {
  sceneNumber: number;
  sceneDesign: {
    sceneName: string;
    characters: string[];
    location: string;
    situations: {
      description: string;
      characterThoughts: string;
      dialogue: DialogueLine[]; // CHANGED: Array for order & duplicates
    }[];
    moodTone: string;
  };
  // New: Map of Character Name -> Outfit ID for this specific scene
  characterOutfits?: Record<string, string>;
  shotList: {
    scene: string;
    shot: number;
    description: string;
    durationSec: number;
    shotSize: string;
    perspective: string;
    movement: string;
    equipment: string;
    focalLength: string;
    aspectRatio: string;
    lightingDesign: string;
    colorTemperature: string;
    // New fields for production tracking
    cast?: string;
    costume?: string;
    // Per-shot Costume & Fashion override (schema matches Step 3 `character.fashion`)
    costumeFashion?: Record<string, string>;
    set?: string;
    visualEffects?: string;
  }[];
  // New field for Storyboard
  storyboard: {
    shot: number;
    image: string; // Base64 string
    video?: string; // URI for generated video
  }[];
  propList: {
    scene: string;
    propArt: string;
    sceneSetDetails: string;
  }[];
  breakdown: {
    part1: Record<string, string>[];
    part2: Record<string, string>[];
    part3: Record<string, string>[];
  };
}

export type ProjectType =
  | 'Movie'
  | 'Series'
  | 'Moral Drama'
  | 'Short Film'
  | 'Commercial'
  | 'MV'
  | 'Reels';

export interface ProjectMetadata {
  id: string;
  title: string;
  type: ProjectType;
  lastModified: number;
  posterImage?: string; // New field for project thumbnail/poster
  userId?: string; // Owner user ID for permission checking
  userRole?: 'owner' | 'admin' | 'editor' | 'viewer'; // Current user's role in this project
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  revenueShare?: number; // Revenue allocation in THB
  accessRole?: 'owner' | 'admin' | 'editor' | 'viewer'; // Role-based access control
  permissions?: TeamMemberPermissions; // Detailed permissions
  invitedBy?: string; // User ID who invited this member
  joinedAt?: Date; // When they joined the project
}

export interface TeamMemberPermissions {
  canEdit: boolean; // Can modify script content
  canDelete: boolean; // Can delete scenes/characters
  canInvite: boolean; // Can invite other members
  canManageTeam: boolean; // Can change member roles/remove members
  canExport: boolean; // Can export screenplay
  canManagePayments: boolean; // Can manage revenue/payments
  canViewAnalytics: boolean; // Can view project analytics
}

// Role permission presets
export const ROLE_PERMISSIONS: Record<'admin' | 'editor' | 'viewer', TeamMemberPermissions> = {
  admin: {
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canManageTeam: true,
    canExport: true,
    canManagePayments: true,
    canViewAnalytics: true,
  },
  editor: {
    canEdit: true,
    canDelete: false,
    canInvite: false,
    canManageTeam: false,
    canExport: true,
    canManagePayments: false,
    canViewAnalytics: true,
  },
  viewer: {
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canManageTeam: false,
    canExport: false,
    canManagePayments: false,
    canViewAnalytics: false,
  },
};

export interface Payment {
  id: string;
  projectId: string;
  memberId: string;
  amount: number;
  method: 'bank_transfer' | 'promptpay' | 'cash' | 'check' | 'other';
  reference?: string;
  notes?: string;
  status: 'completed' | 'pending' | 'failed';
  date: Date;
  createdAt?: Date;
}

export interface ScriptData {
  id?: string; // Unique Project ID
  projectType: ProjectType; // Type of the project
  title: string;
  mainGenre: string;
  secondaryGenres: string[];
  language: 'Thai' | 'English';
  posterImage?: string; // New field for storing the poster
  bigIdea: string;
  premise: string;
  theme: string;
  logLine: string;
  synopsis: string; // 📝 NEW: Detailed story synopsis (expanded from logLine)
  timeline: {
    movieTiming: string;
    seasons: string;
    date: string;
    social: string;
    economist: string;
    environment: string;
  };
  characters: Character[];
  structure: PlotPoint[];
  scenesPerPoint: Record<string, number>;
  generatedScenes: Record<string, GeneratedScene[]>;
  team: TeamMember[];
  // NEW: Psychology Timelines for all characters
  psychologyTimelines?: Record<string, CharacterPsychologyTimeline>; // Key: character ID
}

// AI Provider Types for Multi-Provider Selection
export type ImageProvider = 'auto' | 'gemini-2.5' | 'gemini-2.0' | 'stable-diffusion' | 'comfyui';
export type VideoProvider = 'auto' | 'gemini-veo' | 'comfyui-svd';
export type AutoSelectionCriteria = 'speed' | 'quality' | 'balanced';

export interface AIProviderSettings {
  imageProvider: ImageProvider;
  videoProvider: VideoProvider;
  autoSelectionCriteria: AutoSelectionCriteria;
  comfyuiUrl?: string;
  comfyuiEnabled: boolean;
}

export interface ProviderStatus {
  provider: string;
  displayName: string;
  available: boolean;
  quota?: 'available' | 'low' | 'exhausted';
  speed?: 'fast' | 'medium' | 'slow';
  quality?: 'excellent' | 'good' | 'fair';
  estimatedTime?: string;
  lastChecked?: Date;
}

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface UserSubscription {
  tier: SubscriptionTier;
  credits: number;
  maxCredits: number;
  features: {
    maxResolution: '1024x1024' | '2048x2048' | '4096x4096';
    allowedImageModels: string[];
    allowedVideoModels: string[];
    videoDurationLimit: number; // seconds
    storageLimit: number; // GB
    maxProjects: number; // -1 = unlimited
    maxCharacters: number; // -1 = unlimited
    maxScenes: number; // -1 = unlimited
    maxTeamMembers: number; // -1 = unlimited (จำนวนทีมที่เพิ่มได้)
    maxVeoVideosPerMonth: number; // จำกัดจำนวนวิดีโอ Veo ต่อเดือน (0 = ไม่มีสิทธิ์, -1 = unlimited)
    exportFormats: string[]; // ['pdf', 'fdx', 'fountain', 'production-package', 'white-label']
    allowLocalGPU: boolean; // อนุญาตใช้ Local GPU (ไม่ตัดเครดิต)
  };
}

// ========================================================================
// PSYCHOLOGY SYSTEM TYPES (Digital Mind Model v14)
// ========================================================================

export type KarmaIntensity = 'mild' | 'moderate' | 'severe' | 'extreme';

export interface ActionAnalysis {
  กาย: string[]; // Physical actions
  วาจา: string[]; // Speech patterns
  ใจ: string[]; // Mental states
}

export interface PsychologyChange {
  sceneNumber: number;
  timestamp: Date;
  action: ActionAnalysis;
  karma_type: 'กุศลกรรม' | 'อกุศลกรรม' | 'เฉยๆ';
  karma_intensity: KarmaIntensity;
  consciousness_delta: Record<string, number>; // Changes to consciousness scores
  defilement_delta: Record<string, number>; // Changes to defilement scores
  anusaya_delta?: Partial<AnusayaProfile>; // Changes to latent tendencies
  parami_delta?: Partial<Record<keyof ParamiPortfolio, number>>; // Changes to Parami EXP
  citta_generated?: CittaType; // What type of Citta arose
  kamma_created?: {
    type: 'kusala' | 'akusala';
    intensity: number;
    potential_vipaka: string;
  };
  reasoning: string; // Why these changes occurred
}

export interface PsychologySnapshot {
  sceneNumber: number;
  consciousness: Record<string, number>;
  defilement: Record<string, number>;
  mentalBalance: number; // -100 to +100 (consciousness avg - defilement avg)
  anusaya?: AnusayaProfile;
  parami?: ParamiPortfolio;
  current_bhumi?: number;
  magga_stage?: MaggaStage;
  total_kusala_kamma?: number;
  total_akusala_kamma?: number;
}

export interface CharacterPsychologyTimeline {
  characterId: string;
  characterName: string;
  changes: PsychologyChange[];
  snapshots: PsychologySnapshot[];
  summary: {
    total_kusala: number;
    total_akusala: number;
    net_progress: number;
    dominant_pattern: string;
    carita_evolution?: CaritaType[];
    magga_progress?: number; // 0-100% towards next stage
  };
  overallArc: {
    startingBalance: number;
    endingBalance: number;
    totalChange: number;
    direction: 'กุศลขึ้น' | 'กุศลลง' | 'คงที่';
    interpretation: string;
  };
}

// ========================================================================
// ADMIN ANALYTICS TYPES
// ========================================================================

/**
 * Admin User - Authorized administrator
 */
export interface AdminUser {
  userId: string;
  email: string;
  role: 'super-admin' | 'admin' | 'viewer';
  permissions: {
    canViewAnalytics: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
    canManageSubscriptions: boolean;
  };
  createdAt: Date;
  createdBy: string; // admin who granted access
  lastAccess?: Date;
}

/**
 * Analytics Aggregate - Pre-computed statistics
 */
export interface AnalyticsAggregate {
  period: string; // "YYYY-MM-DD" or "YYYY-MM"
  type: 'daily' | 'monthly';

  users: {
    total: number;
    byTier: {
      free: number;
      basic: number;
      pro: number;
      enterprise: number;
    };
    active: number; // used system in this period
    new: number; // registered in this period
    churned: number; // canceled in this period
  };

  revenue: {
    mrr: number; // Monthly Recurring Revenue
    arr: number; // Annual Recurring Revenue
    byTier: {
      basic: number;
      pro: number;
      enterprise: number;
    };
    new: number; // from new subscriptions
    expansion: number; // from upgrades
    contraction: number; // from downgrades
    churned: number; // from cancellations
  };

  usage: {
    totalCredits: number;
    veoVideos: number;
    apiCalls: {
      scripts: number;
      images: number;
      videos: number;
    };
    storageGB: number;
    activeProjects: number;
  };

  createdAt: Date;
}

/**
 * Admin Audit Log - Security tracking
 */
export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action:
    | 'view-analytics'
    | 'export-data'
    | 'view-user'
    | 'modify-subscription'
    | 'grant-admin'
    | 'revoke-admin';
  targetUserId?: string; // if action affects specific user
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: any; // additional context
}

/**
 * User Statistics (for admin dashboard)
 */
export interface UserStats {
  total: number;
  byTier: Record<SubscriptionTier, number>;
  // NEW: Tier Economics
  tierMetrics?: Record<
    SubscriptionTier,
    {
      count: number;
      revenue: number;
      cost: number;
    }
  >;
  byStatus: {
    active: number;
    canceled: number;
    past_due: number;
  };
  active: number; // active in current period
  online: number; // online users (last active within 5 minutes)
  new: number; // new registrations
  churned: number; // cancellations
}

/**
 * Revenue Metrics (for admin dashboard)
 */
export interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  byTier: Record<'basic' | 'pro' | 'enterprise', number>;
  growth: {
    new: number; // from new subscriptions
    expansion: number; // from upgrades
    contraction: number; // from downgrades
    churned: number; // from cancellations
  };
  arpu: number; // Average Revenue Per User
}

/**
 * Tier Usage Breakdown (for detailed analytics)
 */
export interface TierUsageBreakdown {
  text: {
    count: number; // จำนวนครั้งที่ใช้ทั้งหมด
    cost: number; // ค่าใช้จ่ายรวม (บาท)
    revenue: number; // รายได้จาก users ใน tier นี้
    profit: number; // กำไร/ขาดทุน (revenue - cost)
  };
  images: {
    count: number;
    cost: number;
    revenue: number;
    profit: number;
  };
  videos: {
    count: number;
    cost: number;
    revenue: number;
    profit: number;
  };
  audio: {
    count: number;
    cost: number;
    revenue: number;
    profit: number;
  };
}

/**
 * Queue Metrics (for real-time job tracking)
 */
export interface QueueMetrics {
  total: number; // คิวงานทั้งหมด
  completed: number; // เสร็จแล้ว (สีเขียว)
  processing: number; // กำลังทำ (สีแดง)
  queued: number; // รอคิว (สีเหลือง)
  completedPercentage: number; // % ที่เสร็จแล้ว
  processingPercentage: number; // % ที่กำลังทำ
  queuedPercentage: number; // % ที่รอคิว
}

/**
 * Usage Analytics (for admin dashboard)
 */
export interface UsageAnalytics {
  credits: {
    total: number;
    average: number;
    byTier: Record<SubscriptionTier, number>;
  };
  veoVideos: {
    total: number;
    byUser: Array<{ userId: string; email: string; count: number }>;
  };
  apiCalls: {
    scripts: number;
    images: number;
    videos: number;
    audio: number;
  };
  storage: {
    totalGB: number;
    average: number;
    limitGB: number; // Total storage limit across all users
    remainingGB: number; // Total remaining storage
  };
  // NEW: Detailed breakdown by tier and type
  tierBreakdown?: Record<SubscriptionTier, TierUsageBreakdown>;
}

/**
 * User List Item (for admin dashboard table)
 */
export interface UserListItem {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'canceling' | 'past_due';
  credits: {
    used: number;
    max: number;
    remaining: number;
  };
  veoVideos: {
    used: number;
    max: number;
  };
  lastActive?: Date;
  createdAt: Date;
}

/**
 * User Details (for admin user detail view)
 */
export interface UserDetails {
  profile: {
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Date;
    lastActive?: Date;
    loginCount?: number;
  };
  subscription: {
    tier: SubscriptionTier;
    status: 'active' | 'canceled' | 'canceling' | 'past_due';
    billingCycle?: 'monthly' | 'yearly';
    amount?: number;
    startDate?: Date;
    nextBillingDate?: Date;
    canceledAt?: Date;
  };
  usage: {
    credits: {
      used: number;
      max: number;
      remaining: number;
    };
    veoVideos: {
      used: number;
      max: number;
    };
    projects: number;
    characters: number;
    scenes: number;
    storageUsed: number;
  };
  projects: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  usageHistory: Array<{
    month: string; // "YYYY-MM"
    creditsUsed: number;
    veoVideos: number;
    apiCalls: {
      scripts: number;
      images: number;
      videos: number;
    };
  }>;
}
