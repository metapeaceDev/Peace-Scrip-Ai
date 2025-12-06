/**
 * Bhumi (ภพภูมิ) Database - 31 Planes of Existence
 * Based on Abhidhamma cosmology
 * 
 * Classification:
 * - อบายภูมิ (Apāya Bhūmi) - 4 woeful states
 * - กามสุคติภูมิ (Kāma Sugati Bhūmi) - 7 sensual happy states
 * - รูปภูมิ (Rūpa Bhūmi) - 16 fine-material states
 * - อรูปภูมิ (Arūpa Bhūmi) - 4 immaterial states
 */

export type BhumiType = 'อบายภูมิ' | 'กามสุคติภูมิ' | 'รูปภูมิ' | 'อรูปภูมิ';

export interface BhumiData {
  id: number;
  name: string;
  pali_name: string;
  type: BhumiType;
  category: string; // Subcategory within type
  lifespan: {
    unit: 'years' | 'divine_years' | 'kappa' | 'mahakappa' | 'asankheyya';
    value: number | string; // Can be "immeasurable" for arupa
    in_human_years?: string; // Approximate conversion
  };
  generating_kamma: string[]; // What kamma leads to birth here
  environmental_rules: {
    kamma_creation_multiplier: number; // How easily kamma is created (0-2)
    parami_development_possible: boolean;
    kusala_tendency: number; // -100 to 100 (-100 = only akusala, 100 = only kusala)
    sati_default_level: number; // 0-100
    dominant_feeling: 'sukha' | 'dukkha' | 'somanassa' | 'domanassa' | 'upekkha';
    escape_difficulty: number; // 0-100 (how hard to leave this bhumi)
  };
  notable_beings?: string[]; // Who lives here
  description: string;
}

// ========================================================================
// 1. APAYA BHUMI (อบายภูมิ) - 4 Woeful States
// ========================================================================

export const APAYA_BHUMI: BhumiData[] = [
  {
    id: 1,
    name: 'นิรยภูมิ (นรก)',
    pali_name: 'Niraya Bhūmi',
    type: 'อบายภูมิ',
    category: 'Hell Realm',
    lifespan: {
      unit: 'years',
      value: 'varies by hell level',
      in_human_years: '1,000,000+ years in lowest hell',
    },
    generating_kamma: [
      'ครุกรรมฝ่ายอกุศล (Weighty unwholesome kamma)',
      'ฆ่าพ่อแม่ (Matricide/Patricide)',
      'ฆ่าพระอรหันต์ (Killing an Arahant)',
      'ทำให้พระพุทธเจ้าห้อเลือด',
      'ทำลายสามัคคีสงฆ์',
    ],
    environmental_rules: {
      kamma_creation_multiplier: 0.1, // Almost impossible to create kusala
      parami_development_possible: false,
      kusala_tendency: -95, // Overwhelmingly akusala
      sati_default_level: 5,
      dominant_feeling: 'dukkha',
      escape_difficulty: 95,
    },
    notable_beings: ['เทวทัตร์ (Devadatta)', 'นรกบาล (Hell guardians)'],
    description:
      'แดนแห่งความทุกข์ทรมานอย่างแสนสาหัส ไฟนรกเผาไหม้ไม่หยุด ไม่มีที่พักพิง ต้องรับกรรมจนหมดจึงจะพ้น',
  },
  {
    id: 2,
    name: 'เปรตภูมิ (เปรต)',
    pali_name: 'Peta Bhūmi',
    type: 'อบายภูมิ',
    category: 'Hungry Ghost Realm',
    lifespan: {
      unit: 'years',
      value: 500,
      in_human_years: '500+ years',
    },
    generating_kamma: [
      'โลภะรุนแรง (Extreme greed)',
      'ความตระหนี่ (Stinginess)',
      'คดโกง ลักทรัพย์',
      'ไม่ให้ทาน ขัดขวางการให้ทาน',
    ],
    environmental_rules: {
      kamma_creation_multiplier: 0.3,
      parami_development_possible: false,
      kusala_tendency: -70,
      sati_default_level: 10,
      dominant_feeling: 'dukkha',
      escape_difficulty: 75,
    },
    notable_beings: ['เปรตหิวโหย', 'เปรตกาชาด'],
    description:
      'ภพของผู้หิวโหยตลอดเวลา ปากเล็กเหมือนรูเข็ม ท้องใหญ่เท่าภูเขา อาหารกลายเป็นไฟ มีความทุกข์จากความปรารถนาที่ไม่มีวันสมหวัง',
  },
  {
    id: 3,
    name: 'อสุรกายภูมิ (อสูร)',
    pali_name: 'Asura-kāya Bhūmi',
    type: 'อบายภูมิ',
    category: 'Demon/Titan Realm',
    lifespan: {
      unit: 'divine_years',
      value: 500,
      in_human_years: '9,000,000 human years',
    },
    generating_kamma: [
      'ความอิจฉาริษยา (Envy)',
      'ความหวงแหน',
      'ความหวาดระแวง',
      'ทำลายของเซ่นไหว้',
    ],
    environmental_rules: {
      kamma_creation_multiplier: 0.4,
      parami_development_possible: false,
      kusala_tendency: -50,
      sati_default_level: 15,
      dominant_feeling: 'domanassa',
      escape_difficulty: 60,
    },
    notable_beings: ['อสูรินทร์', 'ยักษ์'],
    description:
      'ภพของผู้หวาดระแวงและแข่งขันกันเสมอ มีความเดือดร้อนใจจากความอิจฉาริษยา ชอบรบพุ่งกับเทวดา แม้จะมีกำลังมากแต่ก็แพ้เสมอ',
  },
  {
    id: 4,
    name: 'ติรัจฉานภูมิ (สัตว์เดรัจฉาน)',
    pali_name: 'Tiracchāna Bhūmi',
    type: 'อบายภูมิ',
    category: 'Animal Realm',
    lifespan: {
      unit: 'years',
      value: 'varies by species',
      in_human_years: 'From hours to 100+ years',
    },
    generating_kamma: [
      'โมหะเป็นพื้นฐาน (Delusion-based actions)',
      'ผิดศีลข้อต่างๆ',
      'มัวเมา ประมาท',
      'ไร้สติปัญญา',
    ],
    environmental_rules: {
      kamma_creation_multiplier: 0.5,
      parami_development_possible: false,
      kusala_tendency: -30,
      sati_default_level: 20,
      dominant_feeling: 'dukkha',
      escape_difficulty: 50,
    },
    notable_beings: ['สัตว์ทุกชนิดที่เรารู้จัก', 'นาค', 'ครุฑ'],
    description:
      'ภพของสัตว์ต่างๆ มีความทุกข์จากการถูกล่า ถูกใช้งาน และความไม่รู้ มีโมหะเป็นพื้นฐาน ไม่สามารถสร้างบุญใหญ่ได้',
  },
];

// ========================================================================
// 2. KAMA SUGATI BHUMI (กามสุคติภูมิ) - 7 Sensual Happy States
// ========================================================================

export const KAMA_SUGATI_BHUMI: BhumiData[] = [
  {
    id: 5,
    name: 'มนุสสภูมิ (มนุษย์)',
    pali_name: 'Manussa Bhūmi',
    type: 'กามสุคติภูมิ',
    category: 'Human Realm',
    lifespan: {
      unit: 'years',
      value: 100,
      in_human_years: '100 years (current era)',
    },
    generating_kamma: ['ศีล 5 พื้นฐาน', 'กุศลกรรมปานกลาง', 'ทาน ศีล ภาวนา'],
    environmental_rules: {
      kamma_creation_multiplier: 1.0, // Perfect balance - can create any kamma
      parami_development_possible: true, // ONLY realm where Buddhahood is possible
      kusala_tendency: 0, // Perfectly neutral - true free will
      sati_default_level: 50,
      dominant_feeling: 'upekkha',
      escape_difficulty: 30, // Easiest to escape samsara from here
    },
    notable_beings: ['พระพุทธเจ้า', 'พระอรหันต์', 'พระโพธิสัตว์'],
    description:
      'ภพของมนุษย์ เป็น "ทางสามแพร่ง" ที่พิเศษที่สุด สามารถสร้างกรรมดีและชั่วได้เต็มที่ เป็นภพเดียวที่สามารถบำเพ็ญบารมีจนบรรลุเป็นพระพุทธเจ้าได้',
  },
  {
    id: 6,
    name: 'จาตุมหาราชิกา (สวรรค์ชั้นที่ 1)',
    pali_name: 'Cātummahārājika',
    type: 'กามสุคติภูมิ',
    category: 'First Heaven',
    lifespan: {
      unit: 'divine_years',
      value: 500,
      in_human_years: '9,000,000 human years',
    },
    generating_kamma: ['มหากุศล 8', 'ศีล 5 บริบูรณ์', 'ทานเป็นนิจ'],
    environmental_rules: {
      kamma_creation_multiplier: 0.7,
      parami_development_possible: true,
      kusala_tendency: 60,
      sati_default_level: 55,
      dominant_feeling: 'somanassa',
      escape_difficulty: 50,
    },
    notable_beings: ['ท้าวจตุโลกบาล', 'ยักษ์ทิพย์', 'คนธรรพ์'],
    description: 'สวรรค์ชั้นต่ำสุด เป็นที่อยู่ของผู้ปกครองทั้ง 4 ทิศ มีความสุขจากทิพยสมบัติ',
  },
  {
    id: 7,
    name: 'ดาวดึงส์ (สวรรค์ชั้นที่ 2)',
    pali_name: 'Tāvatiṃsa',
    type: 'กามสุคติภูมิ',
    category: 'Second Heaven - Indra\'s Realm',
    lifespan: {
      unit: 'divine_years',
      value: 1000,
      in_human_years: '36,000,000 human years',
    },
    generating_kamma: ['มหากุศล + อุปสัมบท', 'ทานใหญ่', 'รักษาศีลเคร่งครัด'],
    environmental_rules: {
      kamma_creation_multiplier: 0.6,
      parami_development_possible: true,
      kusala_tendency: 70,
      sati_default_level: 60,
      dominant_feeling: 'somanassa',
      escape_difficulty: 60,
    },
    notable_beings: ['พระอินทร์', 'พระพุทธมารดา (มายาเทวี)'],
    description:
      'สวรรค์ชั้นสอง เป็นที่ประทับของพระอินทร์ มีต้นปาริชาต มีความสุขและทิพยสมบัติประณีตขึ้น',
  },
  {
    id: 8,
    name: 'ยามา (สวรรค์ชั้นที่ 3)',
    pali_name: 'Yāma',
    type: 'กามสุคติภูมิ',
    category: 'Third Heaven',
    lifespan: {
      unit: 'divine_years',
      value: 2000,
      in_human_years: '144,000,000 human years',
    },
    generating_kamma: ['มหากุศล + สมาธิระดับต้น', 'ทานและศีลสม่ำเสมอ'],
    environmental_rules: {
      kamma_creation_multiplier: 0.5,
      parami_development_possible: true,
      kusala_tendency: 75,
      sati_default_level: 65,
      dominant_feeling: 'somanassa',
      escape_difficulty: 65,
    },
    description:
      'สวรรค์ชั้นสาม ผู้อยู่ที่นี่ไม่ต้องรับรู้ถึงการโคจรของพระอาทิตย์ มีแต่ความสว่างไสวของทิพยวิมาน',
  },
  {
    id: 9,
    name: 'ดุสิต (สวรรค์ชั้นที่ 4)',
    pali_name: 'Tusita',
    type: 'กามสุคติภูมิ',
    category: 'Fourth Heaven - Bodhisatta Realm',
    lifespan: {
      unit: 'divine_years',
      value: 4000,
      in_human_years: '576,000,000 human years',
    },
    generating_kamma: ['มหากุศล + บารมี', 'โพธิสัตว์ผู้รอบรรลุพุทธภาวะ'],
    environmental_rules: {
      kamma_creation_multiplier: 0.4,
      parami_development_possible: true,
      kusala_tendency: 80,
      sati_default_level: 70,
      dominant_feeling: 'somanassa',
      escape_difficulty: 70,
    },
    notable_beings: ['พระศรีอริยเมตไตรย์', 'พระโพธิสัตว์ทั้งหลาย'],
    description:
      'สวรรค์ชั้นสี่ เป็นที่สถิตของพระโพธิสัตว์ที่จะมาตรัสรู้ในอนาคต มีการฟังธรรมเป็นนิจ มีความสุขทางใจสูง',
  },
  {
    id: 10,
    name: 'นิมมานรดี (สวรรค์ชั้นที่ 5)',
    pali_name: 'Nimmānarati',
    type: 'กามสุคติภูมิ',
    category: 'Fifth Heaven - Creation Delight',
    lifespan: {
      unit: 'divine_years',
      value: 8000,
      in_human_years: '2,304,000,000 human years',
    },
    generating_kamma: ['มหากุศล + ฌานระดับเบื้องต้น', 'บำเพ็ญกุศลชั้นสูง'],
    environmental_rules: {
      kamma_creation_multiplier: 0.3,
      parami_development_possible: false, // Too much pleasure
      kusala_tendency: 85,
      sati_default_level: 70,
      dominant_feeling: 'somanassa',
      escape_difficulty: 80,
    },
    description:
      'สวรรค์ชั้นห้า เทวดาในชั้นนี้สามารถเนรมิตสิ่งที่ปรารถนาได้เอง มีความสุขจากการสร้างสรรค์ทิพย์',
  },
  {
    id: 11,
    name: 'ปรนิมมิตวสวัตตี (สวรรค์ชั้นที่ 6)',
    pali_name: 'Paranimmita-vasavatti',
    type: 'กามสุคติภูมิ',
    category: 'Sixth Heaven - Highest Sensual Realm',
    lifespan: {
      unit: 'divine_years',
      value: 16000,
      in_human_years: '9,216,000,000 human years',
    },
    generating_kamma: ['มหากุศล + ฌานเข้มข้น', 'บุญใหญ่ยิ่ง'],
    environmental_rules: {
      kamma_creation_multiplier: 0.2,
      parami_development_possible: false,
      kusala_tendency: 90,
      sati_default_level: 70,
      dominant_feeling: 'somanassa',
      escape_difficulty: 90,
    },
    notable_beings: ['มาร (Māra)', 'วสวัตตีเทวดา'],
    description:
      'สวรรค์ชั้นสูงสุดในกามภูมิ เทวดาเสวยสุขจากสิ่งที่เทวดาอื่นเนรมิตให้ เป็นที่อยู่ของ "มาร" ด้วย มีความสุขสูงสุดในกามภพ ยากต่อการพัฒนาธรรม',
  },
];

// ========================================================================
// 3. RUPA BHUMI (รูปภูมิ) - 16 Fine-Material States
// ========================================================================

export const RUPA_BHUMI: BhumiData[] = [
  // First Jhana (3 levels)
  {
    id: 12,
    name: 'ปริตตสุภะ (Parisajjā)',
    pali_name: 'Parisajjā Brahma',
    type: 'รูปภูมิ',
    category: 'First Jhana - Lower',
    lifespan: {
      unit: 'kappa',
      value: '1/3',
      in_human_years: 'Countless eons',
    },
    generating_kamma: ['ปฐมฌาน (First Jhana) - weak'],
    environmental_rules: {
      kamma_creation_multiplier: 0.1,
      parami_development_possible: false,
      kusala_tendency: 95,
      sati_default_level: 85,
      dominant_feeling: 'upekkha',
      escape_difficulty: 85,
    },
    description: 'พรหมโลกชั้นต่ำสุด ได้รับผลจากปฐมฌานที่อ่อน ยังมีวิตกวิจาร มีปีติและสุข',
  },
  {
    id: 13,
    name: 'อัปปมาณสุภะ (Purohita)',
    pali_name: 'Purohita Brahma',
    type: 'รูปภูมิ',
    category: 'First Jhana - Middle',
    lifespan: {
      unit: 'kappa',
      value: '1/2',
    },
    generating_kamma: ['ปฐมฌาน (First Jhana) - moderate'],
    environmental_rules: {
      kamma_creation_multiplier: 0.1,
      parami_development_possible: false,
      kusala_tendency: 95,
      sati_default_level: 87,
      dominant_feeling: 'upekkha',
      escape_difficulty: 87,
    },
    description: 'พรหมโลกปฐมฌานระดับกลาง เป็นบริวารของมหาพรหม',
  },
  {
    id: 14,
    name: 'สุภกิณหะ (Mahā Brahmā)',
    pali_name: 'Mahā Brahmā',
    type: 'รูปภูมิ',
    category: 'First Jhana - Highest',
    lifespan: {
      unit: 'kappa',
      value: 1,
    },
    generating_kamma: ['ปฐมฌาน (First Jhana) - strong'],
    environmental_rules: {
      kamma_creation_multiplier: 0.1,
      parami_development_possible: false,
      kusala_tendency: 95,
      sati_default_level: 90,
      dominant_feeling: 'upekkha',
      escape_difficulty: 90,
    },
    notable_beings: ['มหาพรหม (Great Brahma)'],
    description: 'พรหมโลกปฐมฌานสูงสุด เป็นที่อยู่ของมหาพรหม มีอายุ 1 กัป',
  },

  // Second Jhana (3 levels)
  {
    id: 15,
    name: 'ปริตตาภา',
    pali_name: 'Parittābhā',
    type: 'รูปภูมิ',
    category: 'Second Jhana - Lower',
    lifespan: {
      unit: 'kappa',
      value: 2,
    },
    generating_kamma: ['ทุติยฌาน (Second Jhana) - weak'],
    environmental_rules: {
      kamma_creation_multiplier: 0.05,
      parami_development_possible: false,
      kusala_tendency: 97,
      sati_default_level: 92,
      dominant_feeling: 'upekkha',
      escape_difficulty: 92,
    },
    description: 'พรหมโลกทุติยฌานต่ำสุด ไม่มีวิตกวิจาร มีแต่ปีติและสุข มีแสงสว่างเล็กน้อย',
  },
  {
    id: 16,
    name: 'อัปปมาณาภา',
    pali_name: 'Appamāṇābhā',
    type: 'รูปภูมิ',
    category: 'Second Jhana - Middle',
    lifespan: {
      unit: 'kappa',
      value: 4,
    },
    generating_kamma: ['ทุติยฌาน (Second Jhana) - moderate'],
    environmental_rules: {
      kamma_creation_multiplier: 0.05,
      parami_development_possible: false,
      kusala_tendency: 97,
      sati_default_level: 93,
      dominant_feeling: 'upekkha',
      escape_difficulty: 93,
    },
    description: 'พรหมโลกทุติยฌานกลาง มีแสงสว่างอันไพศาล',
  },
  {
    id: 17,
    name: 'อาภัสสรา',
    pali_name: 'Ābhassara',
    type: 'รูปภูมิ',
    category: 'Second Jhana - Highest',
    lifespan: {
      unit: 'kappa',
      value: 8,
    },
    generating_kamma: ['ทุติยฌาน (Second Jhana) - strong'],
    environmental_rules: {
      kamma_creation_multiplier: 0.05,
      parami_development_possible: false,
      kusala_tendency: 97,
      sati_default_level: 95,
      dominant_feeling: 'upekkha',
      escape_difficulty: 95,
    },
    description: 'พรหมโลกทุติยฌานสูงสุด มีแสงสว่างยิ่งใหญ่ ใช้แสงสื่อสารแทนเสียง',
  },

  // Third Jhana (3 levels)
  {
    id: 18,
    name: 'ปริตตสุภา',
    pali_name: 'Parittasubhā',
    type: 'รูปภูมิ',
    category: 'Third Jhana - Lower',
    lifespan: {
      unit: 'kappa',
      value: 16,
    },
    generating_kamma: ['ตติยฌาน (Third Jhana) - weak'],
    environmental_rules: {
      kamma_creation_multiplier: 0.02,
      parami_development_possible: false,
      kusala_tendency: 98,
      sati_default_level: 96,
      dominant_feeling: 'upekkha',
      escape_difficulty: 96,
    },
    description: 'พรหมโลกตติยฌานต่ำสุด ไม่มีปีติ มีแต่สุขอย่างประณีต',
  },
  {
    id: 19,
    name: 'อัปปมาณสุภา',
    pali_name: 'Appamāṇasubhā',
    type: 'รูปภูมิ',
    category: 'Third Jhana - Middle',
    lifespan: {
      unit: 'kappa',
      value: 32,
    },
    generating_kamma: ['ตติยฌาน (Third Jhana) - moderate'],
    environmental_rules: {
      kamma_creation_multiplier: 0.02,
      parami_development_possible: false,
      kusala_tendency: 98,
      sati_default_level: 97,
      dominant_feeling: 'upekkha',
      escape_difficulty: 97,
    },
    description: 'พรหมโลกตติยฌานกลาง มีสุขอันไพศาล',
  },
  {
    id: 20,
    name: 'สุภกิณหา',
    pali_name: 'Subhakiṇhā',
    type: 'รูปภูมิ',
    category: 'Third Jhana - Highest',
    lifespan: {
      unit: 'kappa',
      value: 64,
    },
    generating_kamma: ['ตติยฌาน (Third Jhana) - strong'],
    environmental_rules: {
      kamma_creation_multiplier: 0.02,
      parami_development_possible: false,
      kusala_tendency: 98,
      sati_default_level: 98,
      dominant_feeling: 'upekkha',
      escape_difficulty: 98,
    },
    description: 'พรหมโลกตติยฌานสูงสุด มีสุขอันสมบูรณ์',
  },

  // Fourth Jhana (7 levels - includes Suddhavasa)
  {
    id: 21,
    name: 'เวหัปผลา',
    pali_name: 'Vehapphala',
    type: 'รูปภูมิ',
    category: 'Fourth Jhana - Common',
    lifespan: {
      unit: 'kappa',
      value: 500,
    },
    generating_kamma: ['จตุตถฌาน (Fourth Jhana)'],
    environmental_rules: {
      kamma_creation_multiplier: 0.01,
      parami_development_possible: false,
      kusala_tendency: 99,
      sati_default_level: 99,
      dominant_feeling: 'upekkha',
      escape_difficulty: 99,
    },
    description: 'พรหมโลกจตุตถฌาน ไม่มีปีติและสุข มีแต่อุเบกขา สงบสุดยอด',
  },
  {
    id: 22,
    name: 'อสัญญสัตตา',
    pali_name: 'Asaññasattā',
    type: 'รูปภูมิ',
    category: 'Fourth Jhana - Mindless',
    lifespan: {
      unit: 'kappa',
      value: 500,
    },
    generating_kamma: ['จตุตถฌาน + desire for no perception'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: false,
      kusala_tendency: 100,
      sati_default_level: 0, // No mind!
      dominant_feeling: 'upekkha',
      escape_difficulty: 100,
    },
    description: 'พรหมโลกไร้สัญญา ไม่มีจิต ไม่มีความคิด มีแต่รูปขันธ์เพียงอย่างเดียว เป็นภพที่หลงผิดว่าเป็นนิพพาน',
  },

  // Suddhavasa (Pure Abodes - 5 levels) - Only Anagamis
  {
    id: 23,
    name: 'อวิหา',
    pali_name: 'Avihā',
    type: 'รูปภูมิ',
    category: 'Pure Abode 1',
    lifespan: {
      unit: 'kappa',
      value: 1000,
    },
    generating_kamma: ['จตุตถฌาน + Anagami magga'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: true,
      kusala_tendency: 100,
      sati_default_level: 100,
      dominant_feeling: 'upekkha',
      escape_difficulty: 0, // Will attain Nibbana from here
    },
    notable_beings: ['พระอนาคามี'],
    description: 'สุทธาวาสภูมิชั้นแรก เป็นที่อยู่ของพระอนาคามีเท่านั้น จะบรรลุนิพพานจากที่นี่',
  },
  {
    id: 24,
    name: 'อตัปปา',
    pali_name: 'Atappā',
    type: 'รูปภูมิ',
    category: 'Pure Abode 2',
    lifespan: {
      unit: 'kappa',
      value: 2000,
    },
    generating_kamma: ['จตุตถฌาน + Anagami magga (stronger)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: true,
      kusala_tendency: 100,
      sati_default_level: 100,
      dominant_feeling: 'upekkha',
      escape_difficulty: 0,
    },
    notable_beings: ['พระอนาคามี'],
    description: 'สุทธาวาสภูมิชั้นสอง ไม่มีความเร่าร้อน',
  },
  {
    id: 25,
    name: 'สุทัสสา',
    pali_name: 'Sudassā',
    type: 'รูปภูมิ',
    category: 'Pure Abode 3',
    lifespan: {
      unit: 'kappa',
      value: 4000,
    },
    generating_kamma: ['จตุตถฌาน + Anagami magga (very strong)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: true,
      kusala_tendency: 100,
      sati_default_level: 100,
      dominant_feeling: 'upekkha',
      escape_difficulty: 0,
    },
    notable_beings: ['พระอนาคามี'],
    description: 'สุทธาวาสภูมิชั้นสาม งดงาม',
  },
  {
    id: 26,
    name: 'สุทัสสี',
    pali_name: 'Sudassī',
    type: 'รูปภูมิ',
    category: 'Pure Abode 4',
    lifespan: {
      unit: 'kappa',
      value: 8000,
    },
    generating_kamma: ['จตุตถฌาน + Anagami magga (extremely strong)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: true,
      kusala_tendency: 100,
      sati_default_level: 100,
      dominant_feeling: 'upekkha',
      escape_difficulty: 0,
    },
    notable_beings: ['พระอนาคามี'],
    description: 'สุทธาวาสภูมิชั้นสี่ เห็นอย่างชัดเจน',
  },
  {
    id: 27,
    name: 'อกนิฏฐา',
    pali_name: 'Akaniṭṭhā',
    type: 'รูปภูมิ',
    category: 'Pure Abode 5 - Highest',
    lifespan: {
      unit: 'kappa',
      value: 16000,
    },
    generating_kamma: ['จตุตถฌาน + Anagami magga (supreme)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: true,
      kusala_tendency: 100,
      sati_default_level: 100,
      dominant_feeling: 'upekkha',
      escape_difficulty: 0,
    },
    notable_beings: ['พระอนาคามีผู้สูงสุด'],
    description: 'สุทธาวาสภูมิสูงสุด เป็นพรหมโลกชั้นสูงสุดในรูปภูมิ ไม่มีใครเหนือกว่า',
  },
];

// ========================================================================
// 4. ARUPA BHUMI (อรูปภูมิ) - 4 Immaterial States
// ========================================================================

export const ARUPA_BHUMI: BhumiData[] = [
  {
    id: 28,
    name: 'อากาสานัญจายตนภูมิ',
    pali_name: 'Ākāsānañcāyatana',
    type: 'อรูปภูมิ',
    category: 'Infinity of Space',
    lifespan: {
      unit: 'kappa',
      value: 20000,
    },
    generating_kamma: ['อากาสานัญจายตนฌาน (1st Arupa Jhana)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: false,
      kusala_tendency: 100,
      sati_default_level: 99,
      dominant_feeling: 'upekkha',
      escape_difficulty: 99,
    },
    description: 'อรูปภูมิชั้นแรก ไม่มีรูปขันธ์เลย มีแต่นามขันธ์ กำหนดอากาศเป็นอารมณ์',
  },
  {
    id: 29,
    name: 'วิญญาณัญจายตนภูมิ',
    pali_name: 'Viññāṇañcāyatana',
    type: 'อรูปภูมิ',
    category: 'Infinity of Consciousness',
    lifespan: {
      unit: 'kappa',
      value: 40000,
    },
    generating_kamma: ['วิญญาณัญจายตนฌาน (2nd Arupa Jhana)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: false,
      kusala_tendency: 100,
      sati_default_level: 99,
      dominant_feeling: 'upekkha',
      escape_difficulty: 99,
    },
    description: 'อรูปภูมิชั้นสอง กำหนดวิญญาณไม่มีที่สิ้นสุดเป็นอารมณ์',
  },
  {
    id: 30,
    name: 'อากิญจัญญายตนภูมิ',
    pali_name: 'Ākiñcaññāyatana',
    type: 'อรูปภูมิ',
    category: 'Nothingness',
    lifespan: {
      unit: 'kappa',
      value: 60000,
    },
    generating_kamma: ['อากิญจัญญายตนฌาน (3rd Arupa Jhana)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: false,
      kusala_tendency: 100,
      sati_default_level: 99,
      dominant_feeling: 'upekkha',
      escape_difficulty: 99,
    },
    description: 'อรูปภูมิชั้นสาม กำหนด "ความไม่มีอะไรเลย" เป็นอารมณ์',
  },
  {
    id: 31,
    name: 'เนวสัญญานาสัญญายตนภูมิ',
    pali_name: 'Nevasaññānāsaññāyatana',
    type: 'อรูปภูมิ',
    category: 'Neither Perception Nor Non-Perception',
    lifespan: {
      unit: 'kappa',
      value: 84000,
    },
    generating_kamma: ['เนวสัญญานาสัญญายตนฌาน (4th Arupa Jhana)'],
    environmental_rules: {
      kamma_creation_multiplier: 0,
      parami_development_possible: false,
      kusala_tendency: 100,
      sati_default_level: 99,
      dominant_feeling: 'upekkha',
      escape_difficulty: 100, // Extremely difficult - mistaken for Nibbana
    },
    description:
      'อรูปภูมิสูงสุด มีสัญญาก็ไม่ใช่ ไม่มีสัญญาก็ไม่ใช่ ละเอียดที่สุดในสังสารวัฏ มักถูกเข้าใจผิดว่าเป็นนิพพาน',
  },
];

// ========================================================================
// COMPLETE BHUMI DATABASE
// ========================================================================

export const ALL_BHUMI: BhumiData[] = [
  ...APAYA_BHUMI,
  ...KAMA_SUGATI_BHUMI,
  ...RUPA_BHUMI,
  ...ARUPA_BHUMI,
];

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Get Bhumi by ID
 */
export function getBhumiById(id: number): BhumiData | undefined {
  return ALL_BHUMI.find(b => b.id === id);
}

/**
 * Get Bhumi by name
 */
export function getBhumiByName(name: string): BhumiData | undefined {
  return ALL_BHUMI.find(b => b.name.includes(name) || b.pali_name.includes(name));
}

/**
 * Get all Bhumi of a specific type
 */
export function getBhumiByType(type: BhumiType): BhumiData[] {
  return ALL_BHUMI.filter(b => b.type === type);
}

/**
 * Determine which Bhumi a character will be reborn in based on their kamma
 */
export function determineNextBhumi(
  kusala_kamma_total: number,
  akusala_kamma_total: number,
  jhana_level?: number,
  ariya_stage?: 'sotapanna' | 'sakadagami' | 'anagami' | 'arahant'
): BhumiData {
  // Arahant doesn't get reborn
  if (ariya_stage === 'arahant') {
    throw new Error('Arahants do not get reborn - they attain Parinibbana');
  }

  // Anagami only goes to Suddhavasa
  if (ariya_stage === 'anagami') {
    return getBhumiById(23)!; // Aviha (lowest Pure Abode)
  }

  // Check for Jhana attainment
  if (jhana_level) {
    if (jhana_level >= 8) {
      // Arupa Jhana
      return ALL_BHUMI[27 + (jhana_level - 8)]; // Arupa realms
    } else if (jhana_level >= 4) {
      // Rupa Jhana
      const rupaOffset = Math.floor((jhana_level - 4) * 3);
      return RUPA_BHUMI[rupaOffset];
    }
  }

  const net_kamma = kusala_kamma_total - akusala_kamma_total;

  // Determine bhumi based on net kamma
  if (net_kamma < -5000) {
    return getBhumiById(1)!; // Hell
  } else if (net_kamma < -1000) {
    return getBhumiById(2)!; // Peta
  } else if (net_kamma < -500) {
    return getBhumiById(3)!; // Asura
  } else if (net_kamma < 0) {
    return getBhumiById(4)!; // Animal
  } else if (net_kamma < 5000) {
    return getBhumiById(5)!; // Human
  } else if (net_kamma < 10000) {
    return getBhumiById(6)!; // First heaven
  } else if (net_kamma < 20000) {
    return getBhumiById(7)!; // Tavatimsa
  } else if (net_kamma < 40000) {
    return getBhumiById(8)!; // Yama
  } else if (net_kamma < 80000) {
    return getBhumiById(9)!; // Tusita
  } else if (net_kamma < 160000) {
    return getBhumiById(10)!; // Nimmanarati
  } else {
    return getBhumiById(11)!; // Paranimmita-vasavatti
  }
}
