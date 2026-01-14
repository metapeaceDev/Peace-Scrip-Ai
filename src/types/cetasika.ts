/**
 * cetasika.ts
 *
 * Cetasika 52 Mental Factors - Buddhist Psychology System
 * Based on Abhidhamma Philosophy
 *
 * เจตสิก 52 - ปัจจัยทางจิตในพุทธจิตวิทยา
 */

// ============================================
// 1. TYPES & ENUMS
// ============================================

/**
 * 3 Main Categories of Cetasika
 */
export type CetasikaCategory = 'aññasamana' | 'sobhana' | 'akusala';

/**
 * Subcategories for Sobhana (Kusala) Cetasika
 */
export type SobhanaSubcategory =
  | 'sabbasadharana' // Common to all kusala
  | 'virati' // Abstinences
  | 'appamañña' // Immeasurables
  | 'paññindriya'; // Wisdom faculty

/**
 * Subcategories for Akusala (Unwholesome) Cetasika
 */
export type AkusalaSubcategory = 'raga' | 'dosa' | 'moha' | 'common';

// ============================================
// 2. INDIVIDUAL CETASIKA DEFINITIONS
// ============================================

/**
 * Aññasamana Cetasika (13) - Universal Mental Factors
 * เจตสิกที่เกิดร่วมกับจิตทุกดวง
 */
export interface AññasamanaCetasika {
  phassa: number; // ผัสสะ - Contact/Touch (0-100)
  vedana: number; // เวทนา - Feeling (sukha/dukkha/upekkha)
  sañña: number; // สัญญา - Perception/Memory
  cetana: number; // เจตนา - Volition/Intention
  ekaggata: number; // เอกัคคตา - One-pointedness
  jivitindriya: number; // ชีวิตินทรีย์ - Life Faculty
  manasikara: number; // มนสิการ - Attention
  vitakka: number; // วิตก - Initial Application
  vicara: number; // วิจาร - Sustained Application
  adhimokkha: number; // อธิโมกข์ - Decision/Determination
  viriya: number; // วิริยะ - Energy/Effort
  piti: number; // ปีติ - Joy/Rapture
  chanda: number; // ฉันทะ - Desire-to-do/Zeal
}

/**
 * Sobhana Cetasika (25) - Beautiful/Wholesome Mental Factors
 * กุสลเจตสิก/สวยงามเจตสิก
 */
export interface SobhanaCetasika {
  // Common Beautiful Factors (19)
  saddha: number; // สัทธา - Faith/Confidence
  sati: number; // สติ - Mindfulness
  hiri: number; // หิริ - Moral Shame
  ottappa: number; // โอตตัปปะ - Moral Dread
  alobha: number; // อโลภะ - Non-greed
  adosa: number; // อโทสะ - Non-hatred
  tatramajjhattata: number; // ตัตรมัชฌัตตตา - Equanimity

  // Tranquility Pair
  kayaPassaddhi: number; // กายปัสสัทธิ - Tranquility of Mental Body
  cittaPassaddhi: number; // จิตตปัสสัทธิ - Tranquility of Consciousness

  // Lightness Pair
  kayaLahuta: number; // กายลหุตา - Lightness of Mental Body
  cittaLahuta: number; // จิตตลหุตา - Lightness of Consciousness

  // Pliancy Pair
  kayaMuduta: number; // กายมุทุตา - Pliancy of Mental Body
  cittaMuduta: number; // จิตตมุทุตา - Pliancy of Consciousness

  // Wieldiness Pair
  kayaKammañata: number; // กายกัมมัญญตา - Wieldiness of Mental Body
  cittaKammañata: number; // จิตตกัมมัญญตา - Wieldiness of Consciousness

  // Proficiency Pair
  kayaPaguññata: number; // กายปาคุญญตา - Proficiency of Mental Body
  cittaPaguññata: number; // จิตตปาคุญญตา - Proficiency of Consciousness

  // Rectitude Pair
  kayaUjukata: number; // กายุชุกตา - Rectitude of Mental Body
  cittaUjukata: number; // จิตตุชุกตา - Rectitude of Consciousness

  // Abstinences (Virati) - 3
  sammaVaca: number; // สัมมาวาจา - Right Speech
  sammaKammanta: number; // สัมมากัมมันตะ - Right Action
  sammaAjiva: number; // สัมมาอาชีวะ - Right Livelihood

  // Immeasurables (Appamañña) - 2
  karuna: number; // กรุณา - Compassion
  mudita: number; // มุทิตา - Appreciative Joy

  // Wisdom Faculty - 1
  paññindriya: number; // ปัญญินทรีย์ - Wisdom
}

/**
 * Akusala Cetasika (14) - Unwholesome Mental Factors
 * อกุสลเจตสิก/กิเลสเจตสิก
 */
export interface AkusalaCetasika {
  // Greed Group (Raga)
  lobha: number; // โลภะ - Greed/Attachment
  ditthi: number; // ทิฏฐิ - Wrong View
  mana: number; // มานะ - Conceit
  moha: number; // โมหะ - Delusion (common to all akusala)

  // Hatred Group (Dosa)
  dosa: number; // โทสะ - Hatred/Aversion
  issa: number; // อิสสา - Envy
  macchariya: number; // มัจฉริยะ - Avarice/Stinginess
  kukkucca: number; // กุกกุจจะ - Worry/Restlessness

  // Delusion Group (Moha)
  thina: number; // ถีนะ - Sloth
  middha: number; // มิทธะ - Torpor
  vicikiccha: number; // วิจิกิจฉา - Doubt/Skepticism
  uddhacca: number; // อุทธัจจะ - Restlessness

  // Additional
  ahirika: number; // อหิริกะ - Shamelessness
  anottappa: number; // อโนตตัปปะ - Fearlessness of wrongdoing
}

// ============================================
// 3. COMPLETE CETASIKA PROFILE
// ============================================

/**
 * CetasikaProfile - Complete 52 Mental Factors Profile
 * เจตสิกโปรไฟล์ครบ 52 ตัว
 */
export interface CetasikaProfile {
  // Universal (13)
  aññasamana: AññasamanaCetasika;

  // Beautiful/Wholesome (25)
  sobhana: SobhanaCetasika;

  // Unwholesome (14)
  akusala: AkusalaCetasika;

  // Summary Metrics
  summary: {
    kusalaRatio: number; // Ratio of kusala to total (0-1)
    akusalaRatio: number; // Ratio of akusala to total (0-1)
    dominantCategory: CetasikaCategory;
    mentalBalance: number; // Overall balance (-100 to +100)
    consciousness: number; // Level of awareness (0-100)
  };

  // Historical Data
  history?: Array<{
    timestamp: number;
    snapshot: Partial<CetasikaProfile>;
    trigger?: string; // What caused the change
  }>;
}

// ============================================
// 4. CETASIKA-CHARACTER INTEGRATION
// ============================================

/**
 * Map existing Character fields to Cetasika system
 */
export interface CetasikaMapping {
  // From Character.internal.consciousness (คุณธรรม)
  fromConsciousness: {
    mindfulness: 'sati'; // สติ
    compassion: 'karuna'; // กรุณา
    wisdom: 'paññindriya'; // ปัญญา
    equanimity: 'tatramajjhattata'; // อุเบกขา
  };

  // From Character.internal.defilement (กิเลส)
  fromDefilement: {
    greed: 'lobha'; // โลภะ
    anger: 'dosa'; // โทสะ
    delusion: 'moha'; // โมหะ
    pride: 'mana'; // มานะ
    doubt: 'vicikiccha'; // วิจิกิจฉา
  };

  // From Character.parami_portfolio (บารมี)
  fromParami: {
    dana: ['alobha', 'karuna']; // ทาน → ไม่โลภ, กรุณา
    sila: ['hiri', 'ottappa', 'sammaVaca', 'sammaKammanta']; // ศีล → ละอาย, เกรงกลัว, วาจา, กรรมันตะ
    nekkhamma: ['alobha', 'adosa']; // เนกขัมมะ → ไม่โลภ, ไม่โกรธ
    panna: 'paññindriya'; // ปัญญา → ปัญญินทรีย์
    viriya: 'viriya'; // วิริยะ → วิริยะ
    khanti: ['adosa', 'tatramajjhattata']; // ขันติ → ไม่โกรธ, อุเบกขา
    sacca: ['saddha', 'sammaVaca']; // สัจจะ → ศรัทธา, สัมมาวาจา
    adhitthana: ['adhimokkha', 'viriya']; // อธิษฐาน → ความแน่วแน่, วิริยะ
    metta: ['adosa', 'karuna', 'mudita']; // เมตตา → ไม่โกรธ, กรุณา, มุทิตา
    upekkha: 'tatramajjhattata'; // อุเบกขา → ตัตรมัชฌัตตตา
  };
}

// ============================================
// 5. HELPER TYPES
// ============================================

/**
 * Cetasika activation level descriptors
 */
export type CetasikaLevel = 'dormant' | 'weak' | 'moderate' | 'strong' | 'dominant';

/**
 * Get activation level from numeric value (0-100)
 */
export function getCetasikaLevel(value: number): CetasikaLevel {
  if (value >= 80) return 'dominant';
  if (value >= 60) return 'strong';
  if (value >= 40) return 'moderate';
  if (value >= 20) return 'weak';
  return 'dormant';
}

/**
 * Cetasika group aggregation
 */
export interface CetasikaGroupScore {
  category: CetasikaCategory;
  subcategory?: SobhanaSubcategory | AkusalaSubcategory;
  averageScore: number;
  dominantFactors: Array<{
    name: keyof (AññasamanaCetasika & SobhanaCetasika & AkusalaCetasika);
    value: number;
  }>;
}

// ============================================
// 6. DEFAULT PROFILES
// ============================================

/**
 * Create default Cetasika profile (neutral state)
 */
export function createDefaultCetasikaProfile(): CetasikaProfile {
  return {
    aññasamana: {
      phassa: 50,
      vedana: 50,
      sañña: 50,
      cetana: 50,
      ekaggata: 50,
      jivitindriya: 100, // Always active (life faculty)
      manasikara: 50,
      vitakka: 50,
      vicara: 50,
      adhimokkha: 50,
      viriya: 50,
      piti: 50,
      chanda: 50,
    },
    sobhana: {
      saddha: 30,
      sati: 30,
      hiri: 30,
      ottappa: 30,
      alobha: 30,
      adosa: 30,
      tatramajjhattata: 50,
      kayaPassaddhi: 30,
      cittaPassaddhi: 30,
      kayaLahuta: 30,
      cittaLahuta: 30,
      kayaMuduta: 30,
      cittaMuduta: 30,
      kayaKammañata: 30,
      cittaKammañata: 30,
      kayaPaguññata: 30,
      cittaPaguññata: 30,
      kayaUjukata: 30,
      cittaUjukata: 30,
      sammaVaca: 30,
      sammaKammanta: 30,
      sammaAjiva: 30,
      karuna: 30,
      mudita: 30,
      paññindriya: 30,
    },
    akusala: {
      lobha: 20,
      ditthi: 20,
      mana: 20,
      moha: 20,
      dosa: 20,
      issa: 20,
      macchariya: 20,
      kukkucca: 20,
      thina: 20,
      middha: 20,
      vicikiccha: 20,
      uddhacca: 20,
      ahirika: 20,
      anottappa: 20,
    },
    summary: {
      kusalaRatio: 0.6,
      akusalaRatio: 0.4,
      dominantCategory: 'aññasamana',
      mentalBalance: 20,
      consciousness: 50,
    },
  };
}

/**
 * Cetasika name translations (Pali → English → Thai)
 */
export const CETASIKA_NAMES: Record<string, { en: string; th: string; pali: string }> = {
  // Universal
  phassa: { en: 'Contact', th: 'ผัสสะ - การกระทบ', pali: 'phassa' },
  vedana: { en: 'Feeling', th: 'เวทนา - ความรู้สึก', pali: 'vedanā' },
  sañña: { en: 'Perception', th: 'สัญญา - การจำได้', pali: 'saññā' },
  cetana: { en: 'Volition', th: 'เจตนา - ความตั้งใจ', pali: 'cetanā' },
  ekaggata: { en: 'One-pointedness', th: 'เอกัคคตา - ความตั้งมั่น', pali: 'ekaggatā' },
  jivitindriya: { en: 'Life Faculty', th: 'ชีวิตินทรีย์', pali: 'jīvitindriya' },
  manasikara: { en: 'Attention', th: 'มนสิการ - ความทำในใจ', pali: 'manasikāra' },
  vitakka: { en: 'Initial Application', th: 'วิตก - ความตรึกหยั่ง', pali: 'vitakka' },
  vicara: { en: 'Sustained Application', th: 'วิจาร - ความตรองพิจารณา', pali: 'vicāra' },
  adhimokkha: { en: 'Decision', th: 'อธิโมกข์ - ความแน่วแน่', pali: 'adhimokkha' },
  viriya: { en: 'Energy', th: 'วิริยะ - ความเพียร', pali: 'viriya' },
  piti: { en: 'Joy', th: 'ปีติ - ความอิ่มใจ', pali: 'pīti' },
  chanda: { en: 'Zeal', th: 'ฉันทะ - ความพอใจ', pali: 'chanda' },

  // Beautiful/Wholesome
  saddha: { en: 'Faith', th: 'สัทธา - ศรัทธา', pali: 'saddhā' },
  sati: { en: 'Mindfulness', th: 'สติ - ระลึกได้', pali: 'sati' },
  hiri: { en: 'Moral Shame', th: 'หิริ - ละอายต่อบาป', pali: 'hiri' },
  ottappa: { en: 'Moral Dread', th: 'โอตตัปปะ - เกรงกลัวบาป', pali: 'ottappa' },
  alobha: { en: 'Non-greed', th: 'อโลภะ - ไม่โลภ', pali: 'alobha' },
  adosa: { en: 'Non-hatred', th: 'อโทสะ - ไม่โกรธ', pali: 'adosa' },
  tatramajjhattata: { en: 'Equanimity', th: 'ตัตรมัชฌัตตตา - อุเบกขา', pali: 'tatramajjhattatā' },
  karuna: { en: 'Compassion', th: 'กรุณา - ความสงสาร', pali: 'karuṇā' },
  mudita: { en: 'Sympathetic Joy', th: 'มุทิตา - ยินดีในสุขผู้อื่น', pali: 'muditā' },
  paññindriya: { en: 'Wisdom', th: 'ปัญญินทรีย์ - ปัญญา', pali: 'paññindriya' },

  // Unwholesome
  lobha: { en: 'Greed', th: 'โลภะ - ความโลภ', pali: 'lobha' },
  dosa: { en: 'Hatred', th: 'โทสะ - ความโกรธ', pali: 'dosa' },
  moha: { en: 'Delusion', th: 'โมหะ - ความหลง', pali: 'moha' },
  mana: { en: 'Conceit', th: 'มานะ - ความถือตัว', pali: 'māna' },
  ditthi: { en: 'Wrong View', th: 'ทิฏฐิ - ความเห็นผิด', pali: 'diṭṭhi' },
  issa: { en: 'Envy', th: 'อิสสา - ความริษยา', pali: 'issā' },
  macchariya: { en: 'Avarice', th: 'มัจฉริยะ - ความตระหนี่', pali: 'macchariya' },
  vicikiccha: { en: 'Doubt', th: 'วิจิกิจฉา - ความสงสัย', pali: 'vicikicchā' },
  kukkucca: { en: 'Worry', th: 'กุกกุจจะ - ความร้อนใจ', pali: 'kukkucca' },
  thina: { en: 'Sloth', th: 'ถีนะ - ความหดหู่', pali: 'thīna' },
  middha: { en: 'Torpor', th: 'มิทธะ - ความง่วง', pali: 'middha' },
  uddhacca: { en: 'Restlessness', th: 'อุทธัจจะ - ความฟุ้งซ่าน', pali: 'uddhacca' },
  ahirika: { en: 'Shamelessness', th: 'อหิริกะ - ความไม่ละอาย', pali: 'ahirika' },
  anottappa: { en: 'Fearlessness', th: 'อโนตตัปปะ - ไม่กลัวบาป', pali: 'anottappa' },
};

export default CetasikaProfile;
