import type { PlotPoint, Character, ScriptData, ProjectType } from './types';

export const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Crime',
  'Drama',
  'Fantasy',
  'Horror',
  'Romantic',
  'Feel Good',
  'Reality',
  'Sci-Fi',
  'Mystery',
  'Thriller',
  'War',
  'Western',
  'Historical',
  'Musical',
  'Documentary',
  'Biographical',
  'Sport',
  'Family',
  'Noir',
];

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'Movie', label: 'ภาพยนตร์ (Movie)' },
  { value: 'Series', label: 'ซีรีส์ (Series)' },
  { value: 'Moral Drama', label: 'ละครคุณธรรม (Moral Drama)' },
  { value: 'Short Film', label: 'หนังสั้น (Short Film)' },
  { value: 'Commercial', label: 'โฆษณา (Commercial)' },
  { value: 'MV', label: 'มิวสิควิดีโอ (Music Video)' },
  { value: 'Reels', label: 'คลิปสั้น/เรียล (Reels/Shorts)' },
];

export const CHARACTER_ROLES = [
  'Protagonist (Main)',
  'Antagonist (Main)',
  'Main Character',
  'Supporting Character',
  'Minor Character / Extra',
  'Guest Appearance',
];

export const CHARACTER_IMAGE_STYLES = [
  // Cinematic / Realistic
  'Cinematic Realistic (4K Movie Still)',
  'Film Noir (Black & White, High Contrast)',
  'Documentary Photography (Raw, Natural)',
  'Vintage Polaroid (Faded, Retro)',
  'Cyberpunk (Neon, High Tech)',

  // Animation / 3D
  'Pixar Style 3D (Cute, Soft Lighting)',
  'Disney Animation (Expressive, Vibrant)',
  'Japanese Anime (Studio Ghibli Style)',
  'Japanese Anime (Shonen Action Style)',
  'Stop Motion / Claymation',
  'Low Poly 3D (Retro Game)',

  // Art / Illustration
  'American Comic Book (Marvel/DC Style)',
  'Graphic Novel (Noir/Sin City Style)',
  'Oil Painting (Classic, Textured)',
  'Watercolor (Soft, Artistic)',
  'Pencil Sketch (Rough, Storyboard)',
  'Charcoal Drawing (Dramatic, Smudged)',
  'Concept Art (Digital Painting, Detailed)',
  'Pixel Art (8-bit / 16-bit)',
  'Ukiyo-e (Japanese Woodblock Print)',
];

export const TEAM_ROLES = [
  // Core Management
  'Director (ผู้กำกับ)',
  '1st Assistant Director (ผู้ช่วยผู้กำกับคนที่ 1)',
  '2nd Assistant Director (ผู้ช่วยผู้กำกับคนที่ 2)',
  '3rd Assistant Director (ผู้ช่วยผู้กำกับคนที่ 3)',
  'Producer (โปรดิวเซอร์)',
  'Executive Producer (โปรดิวเซอร์บริหาร)',
  'Line Producer (โปรดิวเซอร์สายงาน)',
  'Production Manager (ผู้จัดการสร้าง)',
  
  // Creative Team
  'Screenwriter (นักเขียนบท)',
  'Script Supervisor (ผู้ควบคุมบท)',
  'Story Editor (บรรณาธิการเนื้อเรื่อง)',
  
  // Cast
  'Lead Actor/Actress (นักแสดงนำ)',
  'Supporting Actor/Actress (นักแสดงสมทบ)',
  'Cast (นักแสดง)',
  'Extras (นักแสดงประกอบ)',
  
  // Camera Department
  'Cinematographer / DOP (ผู้กำกับภาพ)',
  'Camera Operator (ช่างกล้อง)',
  'Focus Puller / 1st AC (ผู้ช่วยกล้องคนที่ 1)',
  'Clapper Loader / 2nd AC (ผู้ช่วยกล้องคนที่ 2)',
  'Steadicam Operator (ช่างกล้องสเตดิแคม)',
  'Drone Operator (ช่างกล้องโดรน)',
  
  // Lighting & Grip
  'Gaffer (หัวหน้าไฟ)',
  'Best Boy Electric (ผู้ช่วยหัวหน้าไฟ)',
  'Electrician (ช่างไฟ)',
  'Key Grip (หัวหน้ากริป)',
  'Best Boy Grip (ผู้ช่วยหัวหน้กริป)',
  'Grip (ช่างกริป)',
  
  // Sound Department
  'Sound Designer (นักออกแบบเสียง)',
  'Sound Mixer (ช่างผสมเสียง)',
  'Boom Operator (ช่างบูม)',
  'Sound Assistant (ผู้ช่วยงานเสียง)',
  'Foley Artist (ช่างเสียงประกอบ)',
  
  // Art Department
  'Production Designer (นักออกแบบฉาก)',
  'Art Director (ผู้กำกับศิลป์)',
  'Set Designer (นักออกแบบเซ็ต)',
  'Set Decorator (ช่างตกแต่งฉาก)',
  'Props Master (หัวหน้าอุปกรณ์ประกอบฉาก)',
  'Construction Coordinator (ผู้ประสานงานก่อสร้าง)',
  
  // Costume & Makeup
  'Costume Designer (นักออกแบบเครื่องแต่งกาย)',
  'Wardrobe Supervisor (หัวหน้าเครื่องแต่งกาย)',
  'Makeup Artist (ช่างแต่งหน้า)',
  'Hair Stylist (ช่างทำผม)',
  'SFX Makeup Artist (ช่างแต่งหน้าพิเศษ)',
  
  // Post-Production
  'Editor (ตัดต่อ)',
  'Assistant Editor (ผู้ช่วยตัดต่อ)',
  'Colorist (ช่างสี)',
  'VFX Supervisor (หัวหน้าเอฟเฟกต์)',
  'VFX Artist (ช่างเอฟเฟกต์)',
  'Motion Graphics Designer (นักออกแบบกราฟิกเคลื่อนไหว)',
  
  // Music
  'Composer (นักแต่งเพลง)',
  'Music Supervisor (หัวหน้าดนตรี)',
  'Music Editor (ตัดต่อดนตรี)',
  
  // Special Units
  'Stunt Coordinator (ผู้ประสานงานสตั๊นท์)',
  'Stunt Performer (นักแสดงสตั๊นท์)',
  'Choreographer (นักออกแบบท่าเต้น)',
  'Fight Choreographer (ออกแบบฉากต่อสู้)',
  
  // Location & Logistics
  'Location Manager (ผู้จัดการสถานที่)',
  'Location Scout (ผู้สำรวจสถานที่)',
  'Transportation Coordinator (ผู้ประสานงานขนส่ง)',
  
  // Additional Crew
  'Still Photographer (ช่างภาพนิ่ง)',
  'BTS Videographer (ช่างภาพเบื้องหลัง)',
  'Casting Director (ผู้กำกับการคัดเลือกนักแสดง)',
  'Dialect Coach (ครูฝึกสำเนียง)',
  'Intimacy Coordinator (ผู้ประสานงานฉากสนิท)',
  'Unit Publicist (ประชาสัมพันธ์)',
  'Production Assistant (ผู้ช่วยงานสร้าง)',
];

// 3-Act Structure with 9 Plot Points
// องก์ 1 (Act 1): Points 1-3 | องก์ 2 (Act 2): Points 4-7 | องก์ 3 (Act 3): Points 8-9
export const PLOT_POINTS: PlotPoint[] = [
  // === องก์ 1 (Act 1) - การเริ่มต้นและการเปลี่ยนแปลง ===
  {
    title: 'Equilibrium',
    act: 1,
    description:
      "Peace. At the beginning of the story, the main character may not have a good life, but he doesn't feel like he has any problems.",
  },
  {
    title: 'Inciting Incident',
    act: 1,
    description: 'There have been events that have shaken the peace, both physically and mentally.',
  },
  {
    title: 'Turning Point',
    act: 1,
    description:
      'A crucial moment that reveals the theme of the story, but the protagonist does not understand it. The character decides to fight, causing life to change and is difficult to predict.',
  },
  
  // === องก์ 2 (Act 2) - ความขัดแย้งและวิกฤต ===
  {
    title: 'Act Break',
    act: 2,
    description:
      'As a result of the turning point, the characters have to face high conflicts. The characters have to solve many problems in order to move forward to reach their goals.',
  },
  {
    title: 'Rising Action',
    act: 2,
    description:
      "Solving problems in various ways often makes things even more complicated. The characters' lives may be closer to their goals or further away from them.",
  },
  {
    title: 'Crisis',
    act: 2,
    description:
      'The biggest crisis in a story is often the one that comes out the hardest, preventing the character from reaching his or her goal.',
  },
  {
    title: 'Falling Action',
    act: 2,
    description:
      'The lowest point of a character. After reflecting on themselves, the protagonist may find the ultimate solution at this point.',
  },
  
  // === องก์ 3 (Act 3) - การเผชิญหน้าและบทสรุป ===
  {
    title: 'Climax',
    act: 3,
    description: 'The most intense point of the story where the main conflict is confronted.',
  },
  {
    title: 'Ending',
    act: 3,
    description: 'The conclusion of the story, answering the important question, Premise.',
  },
];

export const EMPTY_CHARACTER: Character = {
  id: 'default-character',
  name: 'Protagonist',
  role: 'Protagonist (Main)',
  description: 'A former boxer, wise but carries the weight of his past.',
  image: '',
  faceReferenceImage: '',
  fashionReferenceImage: '',
  imageStyle: 'Cinematic Realistic (4K Movie Still)',
  outfitCollection: [],
  external: {
    'First Name': '',
    'Last Name': '',
    Nickname: '',
    Alias: '',
    'Date of Birth Age': '',
    Address: '',
    Relationship: '',
    Ethnicity: 'Thai',
    Nationality: 'Thai',
    Religion: 'Buddhist',
    'Blood Type': '',
    Health: '',
    Education: '',
    'Financial Status': '',
    Occupation: '',
  },
  physical: {
    'Physical Characteristics': '',
    'Voice characteristics': '',
    'Eye characteristics': '',
    'Facial characteristics': '',
    Gender: 'Male',
    'Height, Weight': '',
    'Skin color': '',
    'Hair style': '',
  },
  fashion: {
    'Style Concept': '',
    'Main Outfit': '',
    Accessories: '',
    'Color Palette': '',
    'Condition/Texture': '',
  },
  internal: {
    consciousness: {
      'Mindfulness (remembrance)': 80,
      'Wisdom (right view)': 75,
      'Faith (Belief in the right)': 85,
      'Hiri (Shame of sin)': 80,
      'Karuna (Compassion, knowing suffering)': 90,
      'Mudita (Joy in happiness)': 70,
    },
    subconscious: {
      Attachment: '',
      Taanha: '',
    },
    defilement: {
      'Lobha (Greed)': 30,
      'Anger (Anger)': 40,
      'Moha (delusion)': 45,
      'Mana (arrogance)': 50,
      'Titthi (obsession)': 55,
      'Vicikiccha (doubt)': 30,
      'Thina (depression)': 25,
      'Uthachcha (distraction)': 30,
      'Ahirika (shamelessness)': 15,
      'Amodtappa (fearlessness of sin)': 15,
    },
  },
  goals: {
    objective: '',
    need: '',
    action: '',
    conflict: '',
    backstory: '',
  },
};

export const INITIAL_SCRIPT_DATA: ScriptData = {
  title: 'Untitled Project',
  projectType: 'Movie',
  mainGenre: GENRES[0],
  secondaryGenres: [GENRES[1], GENRES[2]],
  language: 'Thai',
  bigIdea: '',
  premise: '',
  theme: '',
  logLine: '',
  timeline: {
    movieTiming: '',
    seasons: '',
    date: '',
    social: '',
    economist: '',
    environment: '',
  },
  characters: [EMPTY_CHARACTER],
  structure: PLOT_POINTS.map(p => ({ ...p })),
  scenesPerPoint: Object.fromEntries(PLOT_POINTS.map((p): [string, number] => [p.title, 1])),
  generatedScenes: Object.fromEntries(PLOT_POINTS.map((p): [string, any[]] => [p.title, []])),
  team: [],
};

// ===== SPEECH PATTERN & DIALECT PRESETS =====
export const DIALECT_PRESETS = {
  standard: {
    name: 'ภาษากลาง (Standard Thai)',
    description: 'ภาษาไทยมาตรฐาน',
    commonWords: {},
    suffixes: ['ครับ', 'ค่ะ', 'นะ', 'จ้า'],
    examples: [
      'สวัสดีครับ',
      'ขอบคุณค่ะ',
      'ไปไหนมา',
    ],
  },
  isaan: {
    name: 'ภาษาอีสาน (Isaan)',
    description: 'ภาษาถิ่นภาคตะวันออกเฉียงเหนือ',
    commonWords: {
      'อะไร': 'หยัง',
      'ทำไม': 'ทำหยัง',
      'มาก': 'หลาย',
      'ไป': 'ไป๋',
      'ไม่': 'บ่',
      'ใช่': 'แม่น',
      'อร่อย': 'แซบ',
      'ที่ไหน': 'ใส',
    },
    suffixes: ['บ่', 'เด้อ', 'เนาะ', 'ฮือ', 'แม่น'],
    examples: [
      'บ่รู้เด้อ',
      'กินข้าวแล้วบ่',
      'ไปใส',
      'เป็นหยังของ',
      'แซบหลายเด้อ',
    ],
  },
  northern: {
    name: 'ภาษาเหนือ (Northern/Lanna)',
    description: 'ภาษาถิ่นภาคเหนือ (คำเมือง)',
    commonWords: {
      'อะไร': 'อี่หยัง',
      'ทำไม': 'ทำหยัง',
      'มาก': 'หลาย',
      'ไม่': 'บ่',
      'ที่ไหน': 'ใส',
      'อร่อย': 'แซบ',
    },
    suffixes: ['จ๊า', 'เจ้า', 'เนอ', 'เด้อ', 'นา'],
    examples: [
      'ไปใสจ๊า',
      'กินข้าวแล้วบ่',
      'ดีหลายเจ้า',
      'เป็นหยังเนอ',
    ],
  },
  southern: {
    name: 'ภาษาใต้ (Southern)',
    description: 'ภาษาถิ่นภาคใต้',
    commonWords: {
      'ทำไม': 'ปะไร',
      'มาก': 'จ๋า',
      'อร่อย': 'อร่อยจัง',
    },
    suffixes: ['จ๋า', 'โว้ย', 'เหา', 'เว้ย'],
    examples: [
      'กินข้าวกันจ๋า',
      'ปะไรวะ',
      'ดีจ๋าเหา',
      'ไปไหนโว้ย',
    ],
  },
  central: {
    name: 'ภาษากลาง (ชัดเจน)',
    description: 'ภาษาไทยกลาง พูดชัดเจน',
    commonWords: {},
    suffixes: ['ครับ', 'ค่ะ'],
    examples: [
      'สวัสดีครับ',
      'ขอบคุณมากค่ะ',
    ],
  },
};

export const ACCENT_PATTERNS = {
  none: {
    name: 'ไม่มีสำเนียง',
    rules: [] as { pattern: string; replacement: string }[],
  },
  isaan: {
    name: 'สำเนียงอีสาน',
    description: 'ออกเสียง ร เป็น ล บางคำ',
    rules: [
      { pattern: 'ครับ', replacement: 'บ่' },
      { pattern: 'ค่ะ', replacement: 'เด้อ' },
      { pattern: 'มาก', replacement: 'หลาย' },
      { pattern: 'ไม่', replacement: 'บ่' },
    ],
  },
  northern: {
    name: 'สำเนียงเหนือ',
    description: 'น้ำเสียงนุ่มนวล',
    rules: [
      { pattern: 'ครับ', replacement: 'จ๊า' },
      { pattern: 'ค่ะ', replacement: 'จ๊า' },
    ],
  },
  southern: {
    name: 'สำเนียงใต้',
    description: 'พูดเร็ว เสียงดัง',
    rules: [
      { pattern: 'ครับ', replacement: 'จ๋า' },
      { pattern: 'ค่ะ', replacement: 'จ๋า' },
    ],
  },
  chinese: {
    name: 'สำเนียงจีน',
    description: 'ออกเสียง ร เป็น ล, จ เป็น ซ',
    rules: [
      { pattern: 'ร', replacement: 'ล' },
      { pattern: 'จ', replacement: 'ซ' },
      { pattern: 'ช', replacement: 'ซ' },
    ],
  },
  western: {
    name: 'สำเนียงฝรั่ง',
    description: 'เน้นเสียง ร ชัดเจน พูดช้า',
    rules: [] as { pattern: string; replacement: string }[],
  },
};

export const FORMALITY_LABELS = {
  formal: 'ทางการ (ครับ/ค่ะ)',
  informal: 'ไม่เป็นทางการ (นะ/จ้า)',
  casual: 'สบายๆ (เว้ย)',
  slang: 'สแลง',
};

export const PERSONALITY_LABELS = {
  polite: 'สุภาพ (Polite)',
  rude: 'หยาบคาย (Rude)',
  humorous: 'ตลก (Humorous)',
  serious: 'จริงจัง (Serious)',
  childlike: 'เด็ก (Childlike)',
  elderly: 'ผู้สูงอายุ (Elderly)',
  intellectual: 'ปัญญาชน (Intellectual)',
};

