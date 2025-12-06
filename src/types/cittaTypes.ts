/**
 * Citta (จิต) Type System - Complete 89 Cittas
 * Based on Abhidhamma Classification
 * 
 * จิต 89 ประเภท แบ่งเป็น 4 กลุ่มหลัก:
 * 1. กุศลจิต (Kusala Citta) - 21 types
 * 2. อกุศลจิต (Akusala Citta) - 12 types  
 * 3. วิบากจิต (Vipāka Citta) - 36 types
 * 4. กิริยาจิต (Kiriyā Citta) - 20 types
 */

// ========================================================================
// 1. KUSALA CITTA (กุศลจิต): Wholesome Consciousness - 21 Types
// ========================================================================

/**
 * มหากุศลจิต (Mahā-kusala Citta) - 8 types
 * Great Wholesome Consciousness of the Sensual Sphere
 */
export type MahaKusalaCitta =
  | 'มหากุศลจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง อสังขาริกัง' // 1. With joy, with knowledge, unprompted
  | 'มหากุศลจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง ส สังขาริกัง' // 2. With joy, with knowledge, prompted
  | 'มหากุศลจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง อสังขาริกัง' // 3. With joy, without knowledge, unprompted
  | 'มหากุศลจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง ส สังขาริกัง' // 4. With joy, without knowledge, prompted
  | 'มหากุศลจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง อสังขาริกัง' // 5. With equanimity, with knowledge, unprompted
  | 'มหากุศลจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง ส สังขาริกัง' // 6. With equanimity, with knowledge, prompted
  | 'มหากุศลจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง อสังขาริกัง' // 7. With equanimity, without knowledge, unprompted
  | 'มหากุศลจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง ส สังขาริกัง'; // 8. With equanimity, without knowledge, prompted

/**
 * รูปาวจรกุศลจิต (Rūpāvacara-kusala Citta) - 5 types
 * Fine-Material Sphere Wholesome Consciousness (Jhāna)
 */
export type RupavacaraKusalaCitta =
  | 'ปฐมฌานกุศลจิต' // 1st Jhāna wholesome
  | 'ทุติยฌานกุศลจิต' // 2nd Jhāna wholesome
  | 'ตติยฌานกุศลจิต' // 3rd Jhāna wholesome
  | 'จตุตถฌานกุศลจิต' // 4th Jhāna wholesome
  | 'ปัญจมฌานกุศลจิต'; // 5th Jhāna wholesome

/**
 * อรูปาวจรกุศลจิต (Arūpāvacara-kusala Citta) - 4 types
 * Immaterial Sphere Wholesome Consciousness
 */
export type ArupavacaraKusalaCitta =
  | 'อากาสานัญจายตนกุศลจิต' // Infinity of space
  | 'วิญญาณัญจายตนกุศลจิต' // Infinity of consciousness
  | 'อากิญจัญญายตนกุศลจิต' // Nothingness
  | 'เนวสัญญานาสัญญายตนกุศลจิต'; // Neither perception nor non-perception

/**
 * โลกุตตรกุศลจิต (Lokuttara-kusala Citta) - 4 types (Magga)
 * Supramundane Wholesome Consciousness (Path)
 */
export type LokuttaraKusalaCitta =
  | 'โสดาปัตติมรรคจิต' // Stream-entry path
  | 'สกทาคามิมรรคจิต' // Once-return path
  | 'อนาคามิมรรคจิต' // Non-return path
  | 'อรหัตตมรรคจิต'; // Arahantship path

export type KusalaCitta =
  | MahaKusalaCitta
  | RupavacaraKusalaCitta
  | ArupavacaraKusalaCitta
  | LokuttaraKusalaCitta;

// ========================================================================
// 2. AKUSALA CITTA (อกุศลจิต): Unwholesome Consciousness - 12 Types
// ========================================================================

/**
 * โลภมูลจิต (Lobha-mūla Citta) - 8 types
 * Greed-rooted Consciousness
 */
export type LobhaMulaCitta =
  | 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตสัมปยุตตัง อสังขาริกัง' // 1. With joy, associated with wrong view, unprompted
  | 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตสัมปยุตตัง สสังขาริกัง' // 2. With joy, associated with wrong view, prompted
  | 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตวิปปยุตตัง อสังขาริกัง' // 3. With joy, dissociated from wrong view, unprompted
  | 'โลภมูลจิต โสมนัสสสหคตัง ทิฏฐิคตวิปปยุตตัง สสังขาริกัง' // 4. With joy, dissociated from wrong view, prompted
  | 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตสัมปยุตตัง อสังขาริกัง' // 5. With equanimity, associated with wrong view, unprompted
  | 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตสัมปยุตตัง สสังขาริกัง' // 6. With equanimity, associated with wrong view, prompted
  | 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตวิปปยุตตัง อสังขาริกัง' // 7. With equanimity, dissociated from wrong view, unprompted
  | 'โลภมูลจิต อุเบกขาสหคตัง ทิฏฐิคตวิปปยุตตัง สสังขาริกัง'; // 8. With equanimity, dissociated from wrong view, prompted

/**
 * โทสมูลจิต (Dosa-mūla Citta) - 2 types
 * Hatred-rooted Consciousness
 */
export type DosaMulaCitta =
  | 'โทสมูลจิต โทมนัสสสหคตัง ปฏิฆสัมปยุตตัง อสังขาริกัง' // 1. With displeasure, associated with aversion, unprompted
  | 'โทสมูลจิต โทมนัสสสหคตัง ปฏิฆสัมปยุตตัง สสังขาริกัง'; // 2. With displeasure, associated with aversion, prompted

/**
 * โมหมูลจิต (Moha-mūla Citta) - 2 types
 * Delusion-rooted Consciousness
 */
export type MohaMulaCitta =
  | 'โมหมูลจิต อุเบกขาสหคตัง วิจิกิจฉาสัมปยุตตัง' // 1. With equanimity, associated with doubt
  | 'โมหมูลจิต อุเบกขาสหคตัง อุทธัจจสัมปยุตตัง'; // 2. With equanimity, associated with restlessness

export type AkusalaCitta = LobhaMulaCitta | DosaMulaCitta | MohaMulaCitta;

// ========================================================================
// 3. VIPAKA CITTA (วิบากจิต): Resultant Consciousness - 36 Types
// ========================================================================

/**
 * มหาวิบากจิต (Mahā-vipāka Citta) - 8 types (Result of Mahā-kusala)
 */
export type MahaVipakaCitta =
  | 'มหาวิบากจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง อสังขาริกัง'
  | 'มหาวิบากจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง สสังขาริกัง'
  | 'มหาวิบากจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง อสังขาริกัง'
  | 'มหาวิบากจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง สสังขาริกัง'
  | 'มหาวิบากจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง อสังขาริกัง'
  | 'มหาวิบากจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง สสังขาริกัง'
  | 'มหาวิบากจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง อสังขาริกัง'
  | 'มหาวิบากจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง สสังขาริกัง';

/**
 * อกุศลวิบากจิต (Akusala-vipāka Citta) - 7 types
 */
export type AkusalaVipakaCitta =
  | 'จักขุวิญญาณ อกุศลวิบาก' // Eye-consciousness (unwholesome result)
  | 'โสตวิญญาณ อกุศลวิบาก' // Ear-consciousness
  | 'ฆานวิญญาณ อกุศลวิบาก' // Nose-consciousness
  | 'ชิวหาวิญญาณ อกุศลวิบาก' // Tongue-consciousness
  | 'กายวิญญาณ อกุศลวิบาก' // Body-consciousness
  | 'สัมปฏิจฉนจิต อกุศลวิบาก' // Receiving consciousness
  | 'สันตีรณจิต อกุศลวิบาก'; // Investigating consciousness

/**
 * กุศลวิบากจิต (Kusala-vipāka Citta) - 8 types
 */
export type KusalaVipakaCitta =
  | 'จักขุวิญญาณ กุศลวิบาก'
  | 'โสตวิญญาณ กุศลวิบาก'
  | 'ฆานวิญญาณ กุศลวิบาก'
  | 'ชิวหาวิญญาณ กุศลวิบาก'
  | 'กายวิญญาณ กุศลวิบาก'
  | 'สัมปฏิจฉนจิต กุศลวิบาก'
  | 'สันตีรณจิต กุศลวิบาก โสมนัสสสหคตัง'
  | 'สันตีรณจิต กุศลวิบาก อุเบกขาสหคตัง';

/**
 * รูปาวจรวิบากจิต (Rūpāvacara-vipāka Citta) - 5 types
 */
export type RupavacaraVipakaCitta =
  | 'ปฐมฌานวิบากจิต'
  | 'ทุติยฌานวิบากจิต'
  | 'ตติยฌานวิบากจิต'
  | 'จตุตถฌานวิบากจิต'
  | 'ปัญจมฌานวิบากจิต';

/**
 * อรูปาวจรวิบากจิต (Arūpāvacara-vipāka Citta) - 4 types
 */
export type ArupavacaraVipakaCitta =
  | 'อากาสานัญจายตนวิบากจิต'
  | 'วิญญาณัญจายตนวิบากจิต'
  | 'อากิญจัญญายตนวิบากจิต'
  | 'เนวสัญญานาสัญญายตนวิบากจิต';

/**
 * โลกุตตรวิบากจิต (Lokuttara-vipāka Citta) - 4 types (Phala)
 */
export type LokuttaraVipakaCitta =
  | 'โสดาปัตติผลจิต'
  | 'สกทาคามิผลจิต'
  | 'อนาคามิผลจิต'
  | 'อรหัตตผลจิต';

export type VipakaCitta =
  | MahaVipakaCitta
  | AkusalaVipakaCitta
  | KusalaVipakaCitta
  | RupavacaraVipakaCitta
  | ArupavacaraVipakaCitta
  | LokuttaraVipakaCitta;

// ========================================================================
// 4. KIRIYA CITTA (กิริยาจิต): Functional Consciousness - 20 Types
// ========================================================================

/**
 * มหากิริยาจิต (Mahā-kiriyā Citta) - 8 types (Arahant's functional)
 */
export type MahaKiriyaCitta =
  | 'มหากิริยาจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง อสังขาริกัง'
  | 'มหากิริยาจิต โสมนัสสสหคตัง ญาณสัมปยุตตัง สสังขาริกัง'
  | 'มหากิริยาจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง อสังขาริกัง'
  | 'มหากิริยาจิต โสมนัสสสหคตัง ญาณวิปปยุตตัง สสังขาริกัง'
  | 'มหากิริยาจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง อสังขาริกัง'
  | 'มหากิริยาจิต อุเบกขาสหคตัง ญาณสัมปยุตตัง สสังขาริกัง'
  | 'มหากิริยาจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง อสังขาริกัง'
  | 'มหากิริยาจิต อุเบกขาสหคตัง ญาณวิปปยุตตัง สสังขาริกัง';

/**
 * รูปาวจรกิริยาจิต (Rūpāvacara-kiriyā Citta) - 5 types
 */
export type RupavacaraKiriyaCitta =
  | 'ปฐมฌานกิริยาจิต'
  | 'ทุติยฌานกิริยาจิต'
  | 'ตติยฌานกิริยาจิต'
  | 'จตุตถฌานกิริยาจิต'
  | 'ปัญจมฌานกิริยาจิต';

/**
 * อรูปาวจรกิริยาจิต (Arūpāvacara-kiriyā Citta) - 4 types
 */
export type ArupavacaraKiriyaCitta =
  | 'อากาสานัญจายตนกิริยาจิต'
  | 'วิญญาณัญจายตนกิริยาจิต'
  | 'อากิญจัญญายตนกิริยาจิต'
  | 'เนวสัญญานาสัญญายตนกิริยาจิต';

/**
 * ทวิปัญจวิญญาณ (Dvipañca-viññāṇa) - 3 types (Common functional)
 */
export type DvipancaVinnana =
  | 'ปัญจทวาราวัชชนจิต' // Five-door adverting
  | 'มโนทวาราวัชชนจิต' // Mind-door adverting
  | 'หัสิตุปปาทจิต'; // Smile-producing (Arahants only)

export type KiriyaCitta =
  | MahaKiriyaCitta
  | RupavacaraKiriyaCitta
  | ArupavacaraKiriyaCitta
  | DvipancaVinnana;

// ========================================================================
// COMPLETE CITTA TYPE UNION (89 types total)
// ========================================================================

export type CittaType = KusalaCitta | AkusalaCitta | VipakaCitta | KiriyaCitta;

// ========================================================================
// VEDANA (เวทนา): Feeling Types
// ========================================================================

export type VedanaType =
  | 'สุข' // Pleasant (Sukha)
  | 'ทุกข์' // Painful (Dukkha)
  | 'โสมนัส' // Mental pleasure (Somanassa)
  | 'โทมนัส' // Mental displeasure (Domanassa)
  | 'อุเบกขา'; // Neutral (Upekkhā)

// ========================================================================
// HETU (เหตุ): Root Conditions
// ========================================================================

/**
 * กุศลเหตุ (Kusala Hetu) - Wholesome roots
 */
export type KusalaHetu = 'อโลภะ' | 'อโทสะ' | 'อโมหะ'; // Non-greed, Non-hatred, Non-delusion

/**
 * อกุศลเหตุ (Akusala Hetu) - Unwholesome roots
 */
export type AkusalaHetu = 'โลภะ' | 'โทสะ' | 'โมหะ'; // Greed, Hatred, Delusion

export type HetuType = KusalaHetu | AkusalaHetu;

// ========================================================================
// CETASIKA (เจตสิก): Mental Factors
// ========================================================================

/**
 * เจตสิก 52 - Mental factors that arise with consciousness
 */
export interface CetasikaSet {
  // อัญญสมานา (Universal - 13)
  phassa: boolean; // Contact
  vedana: boolean; // Feeling
  sanna: boolean; // Perception
  cetana: boolean; // Volition
  ekaggata: boolean; // One-pointedness
  jivitindriya: boolean; // Life faculty
  manasikara: boolean; // Attention

  // ปกิณกะ (Particular - 6)
  vitakka?: boolean; // Applied thought
  vicara?: boolean; // Sustained thought
  adhimokkha?: boolean; // Decision
  viriya?: boolean; // Energy
  piti?: boolean; // Rapture
  chanda?: boolean; // Desire to act

  // อกุศลสาธารณะ (Unwholesome universals - 4)
  moha?: boolean; // Delusion
  ahirika?: boolean; // Shamelessness
  anottappa?: boolean; // Fearlessness of wrongdoing
  uddhacca?: boolean; // Restlessness

  // โสภณสาธารณะ (Beautiful universals - 19)
  saddha?: boolean; // Faith
  sati?: boolean; // Mindfulness
  hiri?: boolean; // Moral shame
  ottappa?: boolean; // Moral dread
  alobha?: boolean; // Non-greed
  adosa?: boolean; // Non-hatred
  tatramajjhattata?: boolean; // Neutrality of mind
  kayapassaddhi?: boolean; // Tranquility of body
  cittapassaddhi?: boolean; // Tranquility of mind
  kayalahuta?: boolean; // Lightness of body
  cittalahuta?: boolean; // Lightness of mind
  kayamuduta?: boolean; // Malleability of body
  cittamuduta?: boolean; // Malleability of mind
  kayakammannata?: boolean; // Wieldiness of body
  cittakammannata?: boolean; // Wieldiness of mind
  kayapagunnata?: boolean; // Proficiency of body
  cittapagunnata?: boolean; // Proficiency of mind
  kayujjukata?: boolean; // Rectitude of body
  cittujjukata?: boolean; // Rectitude of mind

  // โลภะมูล (Greed group - 3)
  lobha?: boolean; // Greed
  ditthi?: boolean; // Wrong view
  mana?: boolean; // Conceit

  // โทสะมูล (Hatred group - 4)
  dosa?: boolean; // Hatred
  issa?: boolean; // Envy
  macchariya?: boolean; // Avarice
  kukkucca?: boolean; // Worry

  // โมหะมูล (Delusion group - 3)
  thina?: boolean; // Sloth
  middha?: boolean; // Torpor
  vicikiccha?: boolean; // Doubt

  // โสภณวิเสส (Beautiful particulars - 3)
  karuna?: boolean; // Compassion
  mudita?: boolean; // Appreciative joy
  pannaindriya?: boolean; // Wisdom faculty
}

// ========================================================================
// CITTA STRUCTURE
// ========================================================================

export interface CittaMoment {
  type: CittaType;
  vedana: VedanaType;
  hetu?: HetuType[];
  cetasika: Partial<CetasikaSet>;
  arammana?: string; // Object of consciousness
  intensity: number; // 0-100
  timestamp: string;
}

/**
 * Helper function to classify citta
 */
export function classifyCitta(citta: CittaType): {
  category: 'กุศล' | 'อกุศล' | 'วิบาก' | 'กิริยา';
  subcategory: string;
  quality: 'wholesome' | 'unwholesome' | 'resultant' | 'functional';
} {
  if (citta.includes('กุศลจิต') && !citta.includes('วิบาก') && !citta.includes('กิริยา')) {
    return { category: 'กุศล', subcategory: 'wholesome citta', quality: 'wholesome' };
  }
  if (citta.includes('อกุศล')) {
    return { category: 'อกุศล', subcategory: 'unwholesome citta', quality: 'unwholesome' };
  }
  if (citta.includes('วิบาก')) {
    return { category: 'วิบาก', subcategory: 'resultant citta', quality: 'resultant' };
  }
  return { category: 'กิริยา', subcategory: 'functional citta', quality: 'functional' };
}
