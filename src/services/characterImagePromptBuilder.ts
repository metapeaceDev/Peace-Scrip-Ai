export type GenerationMode = 'fast' | 'balanced' | 'quality';

export interface CharacterImagePromptBuildInput {
  description: string;
  style: string;
  facialFeatures: string;
  referenceProvided: boolean;
  randomSeed: number;
  timestamp: number;
}

export interface CharacterImagePromptBuildOutput {
  prompt: string;
  negativePrompt: string;
  meta: {
    gender: string;
    age: string;
    ethnicity: string;
    hasShavedHead: boolean;
    isRealisticStyle: boolean;
  };
}

const hasShavedHeadCue = (text: string): boolean => {
  const t = text || '';
  // Note: include common Thai misspellings of "ศีรษะ" → "ศรีษะ".
  return /(โกน(?:ศีรษะ|ศรีษะ)|โกนหัว|หัวโล้น|(?:ศีรษะ|ศรีษะ)โล้น|bald|shaved\s*head|shaved\s*scalp|no\s*hair)/iu.test(
    t
  );
};

const shouldKeepHairLineWhenShaved = (line: string): boolean => {
  // Keep only the lines that explicitly describe shaved/bald hair state.
  return /(โกน(?:ศีรษะ|ศรีษะ)|หัวโล้น|(?:ศีรษะ|ศรีษะ)โล้น|bald|shaved\s*head|no\s*hair)/iu.test(
    line || ''
  );
};

const removeHairClaimsFromEthnicityKeywords = (s: string): string => {
  return (s || '')
    .replace(/,\s*black hair\s*,/gi, ', ')
    .replace(/,\s*black hair\b/gi, '')
    .replace(/\bblack hair\s*,\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
};

const truncateText = (s: string, maxChars: number): string => {
  const text = (s || '').trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
};

const extractHairSpecFromText = (
  text: string
): {
  raw: string;
  hintEn: string;
  isLong: boolean;
  isDarkBrown: boolean;
} => {
  const t = text || '';
  const lines = t
    .split(/\r?\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  const candidates = lines.filter(l => /(\bhair\b|hairstyle|\bfringe\b|\bbangs\b|ผม)/iu.test(l));
  const raw = truncateText(candidates.slice(0, 3).join(' | '), 220);

  const hasThai = /[\u0E00-\u0E7F]/.test(raw);
  const hints: string[] = [];

  const isLong = /ยาวประบ่า|ยาวถึงไหล่|ผมยาว/.test(raw) || /shoulder-?length|long hair/i.test(raw);
  const isDarkBrown = /น้ำตาลเข้ม|dark\s*brown/i.test(raw);
  const isWavy = /ดัดลอน|ลอนอ่อน|wavy|soft\s*waves/i.test(raw);

  if (hasThai) {
    if (/ยาวประบ่า|ยาวถึงไหล่/.test(raw)) hints.push('shoulder-length');
    else if (/ผมยาว/.test(raw)) hints.push('long hair');
    if (/ดัดลอน|ลอนอ่อน/.test(raw)) hints.push('soft wavy');
    if (/น้ำตาลเข้ม/.test(raw)) hints.push('dark brown');
  } else {
    if (isLong) hints.push('shoulder-length');
    if (isWavy) hints.push('soft wavy');
    if (isDarkBrown) hints.push('dark brown');
  }

  return {
    raw,
    hintEn: hints.length ? hints.join(', ') : '',
    isLong,
    isDarkBrown,
  };
};

const buildHairNegativePrompt = (hair: {
  raw: string;
  isLong: boolean;
  isDarkBrown: boolean;
}): string => {
  if (!hair.raw) return '';
  const negatives: string[] = [];
  if (hair.isLong) {
    negatives.push('short hair', 'bob cut', 'pixie cut');
  }
  if (hair.isDarkBrown) {
    negatives.push('blonde hair', 'light hair', 'unnatural hair color', 'vivid dyed hair');
  }
  return negatives.join(', ');
};

export function buildCharacterImagePrompt(
  input: CharacterImagePromptBuildInput
): CharacterImagePromptBuildOutput {
  const { description, style, facialFeatures, referenceProvided, randomSeed, timestamp } = input;

  // Extract gender from facial features (Thai words FIRST for better matching)
  const thaiGenderMatch = facialFeatures.match(/(ชาย|หญิง|ผู้ชาย|ผู้หญิง)/i);
  const engGenderMatch = facialFeatures.match(/\b(male|female|man|woman|boy|girl)\b/i);
  const genderMatch = thaiGenderMatch || engGenderMatch;
  let gender = genderMatch ? genderMatch[1].trim().toLowerCase() : '';

  // Normalize Thai gender to English
  if (gender === 'ชาย' || gender === 'ผู้ชาย') {
    gender = 'male';
  } else if (gender === 'หญิง' || gender === 'ผู้หญิง') {
    gender = 'female';
  }

  // Extract age from facial features
  const ageMatch =
    facialFeatures.match(/Date of Birth Age[:\s]+([^,]+)/i) ||
    facialFeatures.match(/age[:\s]+([\d]+)/i) ||
    facialFeatures.match(/([\d]+)\s*(?:years?\s+old|yr|y\.o\.|ปี|ขวบ)/i) ||
    facialFeatures.match(/อายุ[:\s]*([\d]+)/i);

  let age = '';
  if (ageMatch) {
    const ageStr = ageMatch[1].trim();
    const ageNumber = ageStr.match(/\d+/);
    age = ageNumber ? ageNumber[0] : ageStr;
  }

  // Extract ethnicity/nationality
  const ethnicityMatch =
    facialFeatures.match(/ethnicity[:\s]+([^,]+)/i) ||
    facialFeatures.match(/เชื้อชาติ[:\s]*([^,]+)/i) ||
    facialFeatures.match(/\b(Thai|ไทย|Southeast Asian|Asian)\b/i);
  const nationalityMatch =
    facialFeatures.match(/nationality[:\s]+([^,]+)/i) ||
    facialFeatures.match(/สัญชาติ[:\s]*([^,]+)/i);

  let ethnicity = '';
  if (ethnicityMatch) {
    ethnicity = ethnicityMatch[1].trim().toLowerCase();
    if (ethnicity === 'ไทย') ethnicity = 'thai';
  }
  if (nationalityMatch) {
    const nationality = nationalityMatch[1].trim().toLowerCase();
    if (nationality === 'ไทย' || nationality === 'thai') ethnicity = 'thai';
  }

  const isRealisticStyle =
    style.toLowerCase().includes('realistic') ||
    style.toLowerCase().includes('photorealistic') ||
    style.toLowerCase().includes('cinematic') ||
    style.toLowerCase().includes('photograph');

  const hasShavedHead = hasShavedHeadCue(facialFeatures) || hasShavedHeadCue(description);
  const hair = !hasShavedHead
    ? extractHairSpecFromText(`${facialFeatures}\n${description}`)
    : { raw: '', hintEn: '', isLong: false, isDarkBrown: false };

  // Build ethnicity keywords
  let ethnicityKeywords = '';
  if (ethnicity.includes('thai') || ethnicity.includes('ไทย')) {
    ethnicityKeywords =
      'Thai person, Southeast Asian features, Thai ethnicity, Asian facial features, tan skin tone, Thai face, warm skin tone, monolid eyes, black hair, Southeast Asian appearance';
  } else if (ethnicity.includes('asian') || ethnicity.includes('เอเชีย')) {
    ethnicityKeywords = 'Asian person, Asian facial features, monolid eyes, Asian ethnicity';
  }

  if ((hasShavedHead || hair.isDarkBrown) && ethnicityKeywords) {
    ethnicityKeywords = removeHairClaimsFromEthnicityKeywords(ethnicityKeywords);
  }

  // Gender keywords
  let genderKeywords = '';
  if (gender.includes('female') || gender.includes('woman') || gender.includes('girl')) {
    genderKeywords = 'FEMALE WOMAN, feminine features, lady, she, her, NEVER male features';
  } else if (gender.includes('male') || gender.includes('man') || gender.includes('boy')) {
    genderKeywords = 'MALE MAN, masculine features, gentleman, he, him, NEVER female features';
  }

  // Age keywords
  let ageKeywords = '';
  if (age) {
    const ageNum = parseInt(age);
    if (!isNaN(ageNum)) {
      if (ageNum < 18) ageKeywords = 'young, youthful, adolescent';
      else if (ageNum < 30) ageKeywords = 'young adult, fresh-faced';
      else if (ageNum < 50) ageKeywords = 'mature, adult';
      else if (ageNum < 65) ageKeywords = 'middle-aged, experienced';
      else ageKeywords = 'elderly, senior, aged, wise';
    }
  }

  const uniqueMarker = `[Character-${timestamp}-${randomSeed}]`;

  let prompt = `${uniqueMarker} `;

  // Ethnicity at start
  if (ethnicityKeywords) {
    prompt += `${ethnicityKeywords.split(',')[0].toUpperCase()} `;
  }

  // Gender and Age at start
  if (genderKeywords) {
    prompt += `${genderKeywords.split(',')[0].toUpperCase()} `;
  }

  // High-priority hair constraint (keep near the front so SDXL doesn't ignore it)
  if (hasShavedHead) {
    prompt += `SHAVED HEAD BALD SCALP NO HAIR `;
  } else if (hair.raw) {
    prompt += `HAIR AUTHORITATIVE ${hair.hintEn ? hair.hintEn.toUpperCase() : 'MUST MATCH'} `;
  }

  if (age) {
    prompt += `AGE ${age} ${ageKeywords} `;
  }

  prompt += `PORTRAIT - UNIQUE CHARACTER #${randomSeed}\n\n`;

  if (isRealisticStyle) {
    const hairDetailPhrase = hasShavedHead ? 'detailed scalp' : 'detailed hair';
    prompt += `Art Style: ${style}, PHOTOREALISTIC, REAL PHOTOGRAPH, professional photography, 8K resolution, highly detailed, realistic skin texture, natural lighting, lifelike, real person, canon camera, dslr photo, sharp focus, detailed eyes, ${hairDetailPhrase}, pores visible, skin imperfections, natural shadows\n\n`;
  } else {
    prompt += `Art Style: ${style}, highly detailed, vivid colors, professional illustration, clean lines, expressive features\n\n`;
  }

  if (ethnicityKeywords) {
    prompt += `ETHNICITY: ${ethnicityKeywords}\n\n`;
  }

  if (genderKeywords) {
    prompt += `GENDER: ${genderKeywords}\n\n`;
  }

  // Split physical/fashion
  const physicalParts: string[] = [];
  const fashionParts: string[] = [];
  const rawLines = (facialFeatures || '')
    .split(/\r?\n+/)
    .map(f => f.trim())
    .filter(Boolean);

  // Backward-compat: if older callers provide a single comma-separated line, split gently.
  // IMPORTANT: do NOT split lines that look like "Key: value" because values often contain commas.
  const features =
    rawLines.length <= 1
      ? (rawLines[0] || '')
          .split(/,(?![^\n]*:)/) // split on commas only when not followed by a key/value pattern on same line
          .map(f => f.trim())
          .filter(Boolean)
      : rawLines;

  for (const feature of features) {
    const lowerFeature = feature.toLowerCase();

    if (
      lowerFeature.includes('wearing:') ||
      lowerFeature.includes('outfit') ||
      lowerFeature.includes('accessories') ||
      lowerFeature.includes('style preference') ||
      lowerFeature.includes('style concept') ||
      lowerFeature.includes('color palette') ||
      lowerFeature.includes('palette') ||
      lowerFeature.includes('condition/texture') ||
      lowerFeature.includes('texture') ||
      lowerFeature.includes('costume') ||
      lowerFeature.includes('clothing')
    ) {
      fashionParts.push(feature);
    } else if (
      lowerFeature.includes('height') ||
      lowerFeature.includes('weight') ||
      lowerFeature.includes('gender') ||
      lowerFeature.includes('ethnicity') ||
      lowerFeature.includes('nationality') ||
      lowerFeature.includes('skin') ||
      lowerFeature.includes('hair') ||
      lowerFeature.includes('eye') ||
      lowerFeature.includes('facial') ||
      lowerFeature.includes('body') ||
      lowerFeature.includes('build') ||
      lowerFeature.includes('age') ||
      lowerFeature.includes('distinctive')
    ) {
      physicalParts.push(feature);
    } else {
      physicalParts.push(feature);
    }
  }

  if (!hasShavedHead && hair.raw) {
    physicalParts.unshift(
      `Hair (AUTHORITATIVE): ${hair.raw}${hair.hintEn ? ` (${hair.hintEn})` : ''}`
    );
  }

  // Force shaved-head clarity when present to override any model priors
  if (hasShavedHead) {
    // Remove conflicting hair lines (e.g., "black hair") while keeping explicit shaved/bald lines.
    for (let i = physicalParts.length - 1; i >= 0; i--) {
      const line = physicalParts[i];
      if (!line) continue;
      const mentionsHair = /(\bhair\b|ผม)/iu.test(line);
      if (mentionsHair && !shouldKeepHairLineWhenShaved(line)) {
        physicalParts.splice(i, 1);
      }
    }

    physicalParts.push(
      'HAIR: shaved head / bald scalp / no head hair visible (โกนศีรษะเกลี้ยงเกลา)'
    );
    physicalParts.push('Eyebrows/eyelashes remain natural (do NOT remove eyebrows).');
  }

  const fashionSignalText = `${facialFeatures}\n${description}`;
  const hasFashionCues =
    fashionParts.length > 0 ||
    /(\bwearing\b|\boutfit\b|\bcostume\b|\bclothing\b|\brobe\b|จีวร|พระ|monk)/iu.test(
      fashionSignalText
    );

  const hasMonkRobeCue = /(จีวร|monk\s*robe|buddhist\s*monk|\brobe\b|พระ)/iu.test(
    fashionSignalText
  );

  // Ensure clothing is actually visible in the portrait when requested.
  // Without this, "portrait" often becomes a tight headshot and robes won't show.
  if (hasFashionCues) {
    prompt +=
      `COMPOSITION (IMPORTANT): chest-up portrait (head + shoulders + upper torso visible). ` +
      `Outfit MUST be clearly visible on shoulders/collar/upper torso (e.g., monk robe/จีวร).\n\n`;
  }

  // If this character is a monk / robe is specified, push it to top priority with weighting.
  // This combats SDXL's tendency to ignore wardrobe and output generic shirts.
  if (hasMonkRobeCue) {
    prompt +=
      `CLOTHING (TOP PRIORITY): (traditional Thai Theravada Buddhist monk robe จีวร, saffron/orange robe draped over the shoulder:1.35), ` +
      `robe folds/cloth texture visible, robe covers chest and shoulders, no modern clothes.\n\n`;
  }

  prompt += `PHYSICAL FEATURES (MUST MATCH EXACTLY):\n${physicalParts.join('\n')}\n\n`;

  if (fashionParts.length > 0) {
    prompt += `COSTUME & FASHION (MUST WEAR EXACTLY AS DESCRIBED):\n${fashionParts.join('\n')}\n\n`;
  }

  prompt += `PERSONALITY:\n${description}`;

  if (referenceProvided) {
    prompt += `\n\nREFERENCE IMAGE PROVIDED: Copy exact facial features from reference image.`;
  } else {
    prompt += `\n\nNO REFERENCE: Create completely original, never-seen-before face.`;
  }

  prompt += `\n\nREQUIREMENTS:\n- UNIQUE individual #${randomSeed}\n- MAXIMUM difference from other characters\n- DISTINCTIVE facial structure and features`;

  // Negative prompt
  let negativePrompt = '';
  if (isRealisticStyle) {
    negativePrompt =
      'cartoon, anime, manga, illustration, drawing, painting, sketch, 2d, flat colors, cell shading, comic, graphic novel, stylized, artistic, non-photorealistic, painterly, rendered, cg, 3d render, unreal engine, digital art, fantasy art, concept art, deformed face, multiple heads, bad anatomy, low quality, blurry, duplicate face, same face as other character, identical twin, generic face, copy of previous character, similar appearance to other people, clone face, repeated facial features, non-unique appearance, reused face, recycled appearance, common features, standard face, typical appearance, average face, copied from memory, previously generated face';

    if (age) {
      const ageNum = parseInt(age);
      if (!isNaN(ageNum)) {
        if (ageNum < 18) {
          negativePrompt += ', old, elderly, wrinkles, mature, adult features, facial hair, beard';
        } else if (ageNum < 30) {
          negativePrompt += ', child face, baby face, elderly, wrinkles, old age';
        } else if (ageNum < 50) {
          negativePrompt += ', child face, teenage, elderly, very old, deeply wrinkled';
        } else if (ageNum < 65) {
          negativePrompt += ', young child, teenager, baby face, very elderly, ancient';
        } else {
          negativePrompt += ', young, youthful, child, teenager, baby face, smooth skin';
        }
      }
    }

    if (hasShavedHead) {
      negativePrompt +=
        ', visible head hair, hairstyle, bangs, long hair, short hair, buzzcut, hairline, ponytail, braid';
    }

    if (!hasShavedHead) {
      const hairNeg = buildHairNegativePrompt(hair);
      if (hairNeg) negativePrompt += `, ${hairNeg}`;
    }

    if (hasFashionCues) {
      negativePrompt += ', nude, naked, shirtless, bare chest, bare shoulders, topless';
    }

    if (hasMonkRobeCue) {
      negativePrompt +=
        ', t-shirt, tshirt, shirt, polo shirt, hoodie, jacket, suit, tie, collar, buttons, western clothes, casual clothes, denim, jeans, leather jacket';
    }
  } else {
    negativePrompt =
      'deformed face, multiple heads, bad anatomy, low quality, blurry, bad proportions, duplicate face, same face as other character, identical twin, generic face, copy of previous character, similar appearance to other people, clone face, repeated facial features, non-unique appearance, reused face, recycled appearance, common features, standard face, typical appearance, average face, copied from memory, previously generated face, ugly, distorted, malformed';

    if (hasShavedHead) {
      negativePrompt +=
        ', visible head hair, hairstyle, bangs, long hair, short hair, buzzcut, hairline';
    }

    if (!hasShavedHead) {
      const hairNeg = buildHairNegativePrompt(hair);
      if (hairNeg) negativePrompt += `, ${hairNeg}`;
    }

    if (hasFashionCues) {
      negativePrompt += ', nude, naked, shirtless, bare chest, bare shoulders, topless';
    }

    if (hasMonkRobeCue) {
      negativePrompt +=
        ', t-shirt, tshirt, shirt, polo shirt, hoodie, jacket, suit, tie, collar, buttons, western clothes, casual clothes, denim, jeans, leather jacket';
    }
  }

  return {
    prompt,
    negativePrompt,
    meta: {
      gender,
      age,
      ethnicity,
      hasShavedHead,
      isRealisticStyle,
    },
  };
}
