import { describe, it, expect } from 'vitest';

import { buildCharacterImagePrompt } from '../services/characterImagePromptBuilder';

describe('characterImagePromptBuilder', () => {
  it('removes default hair claims when facialFeatures indicate shaved head (Thai)', () => {
    const out = buildCharacterImagePrompt({
      description: 'พระหนุ่มผู้มีจิตใจดี',
      style: 'Cinematic Realistic (4K Movie Still)',
      facialFeatures: 'Ethnicity: ไทย, 25 ปี, ชาย, โกนศีรษะเกลี้ยงเกลา, ผิวสองสี',
      referenceProvided: false,
      randomSeed: 123,
      timestamp: 1700000000000,
    });

    expect(out.meta.hasShavedHead).toBe(true);

    // ETHNICITY should not force hair color
    expect(out.prompt).toContain('ETHNICITY:');
    expect(out.prompt).not.toMatch(/black hair/iu);

    // Realistic style line should not demand detailed hair
    expect(out.prompt).not.toMatch(/detailed\s+hair/iu);

    // Must explicitly reinforce bald/shaved head
    expect(out.prompt).toMatch(/shaved head|bald/iu);
    expect(out.negativePrompt).toMatch(/visible head hair|hairstyle/iu);
  });

  it('detects shaved-head even with Thai misspelling (โกนศรีษะ)', () => {
    const result = buildCharacterImagePrompt({
      description: 'ชายไทยในสตูดิโอ',
      style: 'realistic',
      facialFeatures: 'ชายไทย, โกนศรีษะ, หน้าคม, ผิวแทน',
      referenceProvided: false,
      randomSeed: 999,
      timestamp: 1710000000001,
    });

    expect(result.prompt).not.toMatch(/black hair/i);
    expect(result.prompt).not.toMatch(/detailed hair/i);
    expect(result.prompt).toMatch(/SHAVED HEAD BALD SCALP NO HAIR/i);
    expect(result.prompt).toMatch(
      /HAIR:\s*shaved head\s*\/\s*bald scalp\s*\/\s*no head hair visible/i
    );
    expect(result.negativePrompt).toMatch(/\bhair\b/i);
  });

  it('routes fashion fields (Style Concept / Color Palette / Texture) into COSTUME & FASHION section', () => {
    const out = buildCharacterImagePrompt({
      description: 'พระหนุ่มผู้สงบ',
      style: 'Cinematic Realistic (4K Movie Still)',
      facialFeatures: [
        'Ethnicity: ไทย',
        'ชาย',
        'โกนศีรษะ',
        'Style Concept: Buddhist monk, disciplined but gentle',
        'Wearing: saffron monk robe (จีวรพระ)',
        'Color Palette: saffron/orange, muted yellow',
        'Condition/Texture: lightweight cotton cloth, slightly wrinkled',
      ].join('\n'),
      referenceProvided: false,
      randomSeed: 42,
      timestamp: 1710000000100,
    });

    expect(out.prompt).toMatch(/COSTUME\s*&\s*FASHION \(MUST WEAR EXACTLY AS DESCRIBED\):/iu);
    expect(out.prompt).toMatch(/Style Concept:/iu);
    expect(out.prompt).toMatch(/Color Palette:/iu);
    expect(out.prompt).toMatch(/Condition\/Texture:/iu);
    expect(out.prompt).toMatch(/จีวรพระ/iu);

    // Clothing must be visible in-frame
    expect(out.prompt).toMatch(/COMPOSITION \(IMPORTANT\): chest-up portrait/iu);
    expect(out.prompt).toMatch(/CLOTHING \(TOP PRIORITY\):/iu);
    expect(out.prompt).toMatch(/monk robe|จีวร/iu);
    expect(out.negativePrompt).toMatch(/shirtless|bare shoulders|topless/iu);
  });

  it('injects authoritative hair and hair negatives when hair is specified (non-shaved head)', () => {
    const out = buildCharacterImagePrompt({
      description: 'หญิงไทยบุคลิกสงบ',
      style: 'Cinematic Realistic (4K Movie Still)',
      facialFeatures: [
        'Ethnicity: ไทย',
        'หญิง',
        'Physical Characteristics: ผมยาวประบ่า ดัดลอนอ่อนๆ สีน้ำตาลเข้ม',
      ].join('\n'),
      referenceProvided: false,
      randomSeed: 7,
      timestamp: 1710000000200,
    });

    expect(out.meta.hasShavedHead).toBe(false);

    // Hair must be explicitly reinforced
    expect(out.prompt).toMatch(/Hair \(AUTHORITATIVE\):/iu);
    expect(out.prompt).toMatch(/shoulder-length|ผมยาวประบ่า/iu);

    // Avoid conflicting default ethnicity hair claims
    expect(out.prompt).not.toMatch(/black hair/iu);

    // Add hair drift guard negatives
    expect(out.negativePrompt).toMatch(/short hair/iu);
    expect(out.negativePrompt).toMatch(/blonde hair/iu);
  });
});
