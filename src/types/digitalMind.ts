/**
 * Digital Mind Model v14 - Complete Buddhist Psychology Framework
 * Based on comprehensive Abhidhamma principles
 *
 * This file contains the complete type definitions for modeling
 * a sentient being's psychology based on Buddhist teachings.
 */

// ========================================================================
// 1. ANUSAYA (อนุสัย): Latent Tendencies - The Seeds of Defilements
// ========================================================================

export interface AnusayaKilesa {
  kama_raga: {
    level: number; // 0-100
    status: 'Active' | 'Weakened' | 'Eradicated';
    description: 'ความกำหนัดในกามคุณ - Sensual desire';
  };
  patigha: {
    level: number;
    status: 'Active' | 'Weakened' | 'Eradicated';
    description: 'ความขัดเคืองใจ - Aversion/Ill-will';
  };
  mana: {
    level: number;
    status: 'Active' | 'Weakened' | 'Eradicated';
    description: 'ความถือตัว - Conceit/Pride';
  };
  ditthi: {
    level: number;
    status: 'Active' | 'Weakened' | 'Eradicated';
    description: 'ความเห็นผิด - Wrong view';
  };
  vicikiccha: {
    level: number;
    status: 'Active' | 'Weakened' | 'Eradicated';
    description: 'ความลังเลสงสัย - Doubt/Skepticism';
  };
  bhava_raga: {
    level: number;
    status: 'Active' | 'Weakened' | 'Eradicated';
    description: 'ความพอใจในภพ - Craving for existence';
  };
  avijja: {
    level: number;
    status: 'Active' | 'Weakened' | 'Eradicated';
    description: 'ความไม่รู้ - Ignorance';
  };
}

export interface Samyojana {
  '1_sakkaya_ditthi': 'Active' | 'Eradicated';
  '2_vicikiccha': 'Active' | 'Eradicated';
  '3_silabbata_paramasa': 'Active' | 'Eradicated';
  '4_kama_raga': 'Active' | 'Weakened' | 'Eradicated';
  '5_byapada': 'Active' | 'Weakened' | 'Eradicated';
  '6_rupa_raga': 'Active' | 'Eradicated';
  '7_arupa_raga': 'Active' | 'Eradicated';
  '8_mana': 'Active' | 'Eradicated';
  '9_uddhacca': 'Active' | 'Eradicated';
  '10_avijja': 'Active' | 'Eradicated';
}

// ========================================================================
// 2. CARITA (จริต): Temperament/Character Type
// ========================================================================

export type CaritaType =
  | 'ราคจริต' // Lustful temperament
  | 'โทสจริต' // Hateful temperament
  | 'โมหจริต' // Deluded temperament
  | 'สัทธาจริต' // Faithful temperament
  | 'พุทธิจริต' // Intelligent temperament
  | 'วิตกจริต'; // Speculative temperament

export interface DominantTemperament {
  primary_carita: CaritaType;
  secondary_carita?: CaritaType;
  description: string;
  behavioral_patterns: string[];
  recommended_meditation: string[];
}

// ========================================================================
// 3. KILESA (กิเลส): Defilements in 3 Levels
// ========================================================================

export interface KilesaLevels {
  // Level 1: Anusaya (อนุสัยกิเลส) - Latent defilements
  anusaya: AnusayaKilesa;

  // Level 2: Pariyutthana (ปริยุฏฐานกิเลส) - Obsessing defilements
  pariyutthana: {
    active: boolean;
    type?: 'กามฉันทะ' | 'พยาบาท' | 'ถีนมิทธะ' | 'อุทธัจจกุกกุจจะ' | 'วิจิกิจฉา';
    intensity: number; // 0-100
  };

  // Level 3: Vītikama (วีติกกมกิเลส) - Transgressing defilements
  vitikama: {
    has_transgressed: boolean;
    recent_violations: string[];
  };
}

// ========================================================================
// 4. PARAMI (บารมี): The 10 Perfections
// ========================================================================

export interface ParamiItem {
  level: number; // 0-10
  exp: number;
  target_kilesa: string;
  sub_types?: Record<string, number>;
}

export interface ParamiPortfolio {
  // Sīla Group (ศีล)
  dana: ParamiItem; // ทาน - Generosity
  sila: ParamiItem; // ศีล - Virtue
  nekkhamma: ParamiItem; // เนกขัมมะ - Renunciation

  // Samādhi Group (สมาธิ)
  viriya: ParamiItem; // วิริยะ - Energy
  khanti: ParamiItem; // ขันติ - Patience
  sacca: ParamiItem; // สัจจะ - Truthfulness

  // Paññā Group (ปัญญา)
  adhitthana: ParamiItem; // อธิษฐาน - Determination
  metta: ParamiItem; // เมตตา - Loving-kindness
  upekkha: ParamiItem; // อุเบกขา - Equanimity
  panna: ParamiItem; // ปัญญา - Wisdom
}

// ========================================================================
// 5. PANNA (ปัญญา): Wisdom Development
// ========================================================================

export type PannaType = 'โลกียะ' | 'โลกุตตระ';

export interface VipassanaNana {
  id: number;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Mastered';
  type?: PannaType;
}

export interface PannaPortfolio {
  overall_level: number; // 0-10
  primary_focus: 'Worldly Knowledge' | 'Samatha' | 'Vipassanā';

  // 3 Types of Wisdom
  suttamaya: {
    level: number;
    knowledge_base: Array<{
      doctrine: string;
      understanding: number; // 0-1
    }>;
  };

  cintamaya: {
    level: number;
    reasoning_skills: Array<{
      skill: string;
      proficiency: number; // 0-1
    }>;
  };

  bhavanamaya: {
    level: number;
    type: PannaType;
    vipassana_nana_path: VipassanaNana[];
  };
}

// ========================================================================
// 6. SAMADHI (สมาธิ): Concentration Levels
// ========================================================================

export type ConcentrationLevel =
  | 'ขณิกสมาธิ' // Momentary
  | 'อุปจารสมาธิ' // Access
  | 'อัปปนาสมาธิ'; // Absorption

export type JhanaLevel =
  | 'ปฐมฌาน'
  | 'ทุติยฌาน'
  | 'ตติยฌาน'
  | 'จตุตถฌาน'
  | 'อากาสานัญจายตนะ'
  | 'วิญญาณัญจายตนะ'
  | 'อากิญจัญญายตนะ'
  | 'เนวสัญญานาสัญญายตนะ';

export interface SamadhiPortfolio {
  concentration_level: ConcentrationLevel;
  mastered_jhanas: JhanaLevel[];
  jhana_factors_proficiency: {
    vitakka: number; // 0-1 (Applied thought)
    vicara: number; // 0-1 (Sustained thought)
    piti: number; // 0-1 (Rapture)
    sukha: number; // 0-1 (Bliss)
    ekaggata: number; // 0-1 (One-pointedness)
    upekkha: number; // 0-1 (Equanimity)
  };
}

// ========================================================================
// 7. KAMMA (กรรม): Actions and Their Storage
// ========================================================================

export type KammaQuality = 'กุศล' | 'อกุศล' | 'อัพยากตะ';
export type KammaChannel = 'กายกรรม' | 'วจีกรรม' | 'มโนกรรม';
export type KammaCategory =
  | 'ครุกรรม' // Weighty
  | 'อาสันนกรรม' // Death-proximate
  | 'อาจิณณกรรม' // Habitual
  | 'กตัตตากรรม'; // Reserve

export interface KammaItem {
  id: string;
  type: string; // e.g., 'ทาน', 'ศีล', 'ปาณาติบาต', etc.
  quality: KammaQuality;
  channel: KammaChannel;
  category: KammaCategory;
  intensity: number;
  timestamp: string;
  status: 'Pending' | 'Ripening' | 'Ripened' | 'Partially Ripened' | 'Exhausted';
  scene_reference?: number;
}

export interface KammaLedger {
  kusala_stock: KammaItem[];
  akusala_stock: KammaItem[];
  active_kamma_queue: KammaItem[]; // Recently created, waiting to ripen
}

// ========================================================================
// 8. VIPAKA (วิบาก): Karmic Results
// ========================================================================

export type VipakaType = 'อิฏฐารมณ์' | 'อนิฏฐารมณ์';

export interface VipakaEvent {
  timestamp: string;
  type: VipakaType;
  event_description: string;
  source_kamma_id: string;
  resultant_feeling: 'สุข' | 'ทุกข์' | 'อุเบกขา';
  kamma_interaction_type: 'อุปัตถัมภกกรรม' | 'อุปปีฬกกรรม' | 'อุปฆาตกกรรม';
}

export interface LifeBlueprint {
  birth_bhumi: string; // ภพภูมิที่เกิด
  initial_conditions: {
    physical_form: {
      quality: string;
      health_propensity: string;
      source_kamma_id: string;
    };
    social_status: {
      level: string;
      source_kamma_id: string;
    };
    wealth_potential: {
      level: string;
      source_kamma_id: string;
    };
    innate_intelligence: {
      level: string;
      source_kamma_id: string;
    };
  };
}

// ========================================================================
// 9. BHUMI (ภพภูมิ): Planes of Existence
// ========================================================================

export type BhumiType =
  | 'อบายภูมิ' // Woeful
  | 'กามสุคติภูมิ' // Sensual happy
  | 'รูปภูมิ' // Fine-material
  | 'อรูปภูมิ'; // Immaterial

export interface BhumiData {
  id: number;
  name: string;
  type: BhumiType;
  lifespan_unit: 'years' | 'human_years' | 'antarakappa' | 'mahākappa';
  lifespan_value: number | string;
  generating_kamma: string;
  environmental_rules: {
    kamma_creation_multiplier: number;
    parami_development_possible: boolean;
    dominant_feeling?: string;
    sati_default_level?: number;
  };
}

// ========================================================================
// 10. JIVITINDRIYA (ชีวิตินทรีย์): Life Faculty
// ========================================================================

export interface JivitindriyaState {
  // Rūpa-jīvitindriya (รูปชีวิตินทรีย์)
  status: 'Active' | 'Depleting' | 'Exhausted';
  total_lifespan_kamma_energy: number;
  current_energy_level: number;
  decay_rate: number; // per time unit
  depletion_trigger_event?: string;

  // Nāma-jīvitindriya (นามชีวิตินทรีย์) - always present with every citta
  citta_life_force_active: boolean;
}

// ========================================================================
// 11. ARIYA PUGGALA (อริยบุคคล): Noble Persons
// ========================================================================

export type CharacterStatus =
  | 'ปุถุชน' // Ordinary person
  | 'โสดาบัน' // Stream-enterer
  | 'สกทาคามี' // Once-returner
  | 'อนาคามี' // Non-returner
  | 'พระอรหันต์'; // Arahant

export interface CharacterStatusInfo {
  type: CharacterStatus;
  stage: string;
  liberation_progress: number; // 0-100%
  rebirths_remaining: string; // e.g., "<= 7", "1", "0 (will attain Parinibbāna)"
}

// ========================================================================
// 12. CORE PROFILE: The Complete Digital Mind
// ========================================================================

export interface CoreProfile {
  character_status: CharacterStatusInfo;

  life_essence: {
    life_blueprint: LifeBlueprint;
    jivitindriya: JivitindriyaState;
  };

  psychological_matrix: {
    dominant_temperament: DominantTemperament;
    latent_tendencies: {
      anusaya_kilesa: AnusayaKilesa;
      samyojana_fetters: Samyojana;
      kusala_vasana?: {
        saddha_potential: { level: number };
        panna_potential: { level: number; status?: string };
        metta_potential: { level: number };
      };
    };
  };

  spiritual_assets: {
    kamma_ledger: KammaLedger;
    virtue_engine: {
      parami_portfolio: ParamiPortfolio;
      panna_portfolio: PannaPortfolio;
      samadhi_portfolio: SamadhiPortfolio;
    };
  };
}

// ========================================================================
// 13. MIND STATE: Real-time Dynamic State
// ========================================================================

export interface ActiveEvent {
  type: 'SensoryInput' | 'VipakaManifestation' | 'VolitionalThought';
  source: string;
  object_details: string;
}

export interface CurrentCitta {
  type: string; // e.g., 'มหากุศลจิต ญาณสัมปยุตต์'
  accompanying_cetasikas: string[];
}

export interface MindState {
  timestamp: string;
  active_event?: ActiveEvent;
  processing_phase?: 'Phassa' | 'Vedanā' | 'Javana' | 'Tadārammaṇa';
  current_citta?: CurrentCitta;
  active_kilesa?: {
    type: 'ปริยุฏฐานกิเลส';
    name: string;
    intensity: number;
    is_suppressed_by_samadhi: boolean;
  };
  active_samadhi?: {
    is_active: boolean;
    type?: JhanaLevel;
  };
  current_vipaka_experience?: VipakaEvent;
}

// ========================================================================
// 14. CHARACTER PSYCHOLOGY INTEGRATION
// ========================================================================

/**
 * Extended Character interface that integrates Digital Mind Model
 * This replaces the simple consciousness/defilement system
 */
export interface DigitalMindCharacter {
  // Basic Character Info (unchanged)
  id: string;
  name: string;
  role: string;
  description: string;

  // COMPLETE DIGITAL MIND MODEL
  core_profile: CoreProfile;
  mind_state: MindState;

  // Timeline Tracking (for UI visualization)
  psychology_timeline?: {
    snapshots: Array<{
      sceneNumber: number;
      plotPoint: string;
      core_profile_snapshot: Partial<CoreProfile>;
      mind_state_snapshot: MindState;
      interpretation: string;
    }>;
    changes: Array<{
      sceneNumber: number;
      actions_analyzed: {
        กาย: string[];
        วาจา: string[];
        ใจ: string[];
      };
      kamma_created: KammaItem[];
      vipaka_received: VipakaEvent[];
      parami_changes: Partial<Record<keyof ParamiPortfolio, number>>;
      reasoning: string;
    }>;
    overall_arc: {
      starting_status: CharacterStatus;
      ending_status: CharacterStatus;
      total_kusala_kamma: number;
      total_akusala_kamma: number;
      parami_growth: Record<string, number>;
      interpretation: string;
    };
  };

  // Legacy support (optional - for backward compatibility)
  external?: Record<string, string>;
  physical?: Record<string, string>;
  fashion?: Record<string, string>;
  internal?: {
    consciousness: Record<string, number>;
    subconscious: Record<string, string>;
    defilement: Record<string, number>;
  };
  goals?: {
    objective: string;
    need: string;
    action: string;
    conflict: string;
    backstory: string;
  };
}

// ========================================================================
// 15. HELPER TYPES
// ========================================================================

export interface BuddhistValidation {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
  dhamma_analysis: {
    kamma_consistency: boolean;
    parami_development: boolean;
    realistic_transformation: boolean;
  };
}

