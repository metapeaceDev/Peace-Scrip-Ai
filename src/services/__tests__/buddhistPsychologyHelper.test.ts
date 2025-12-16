/**
 * Tests for Buddhist Psychology Helper Functions
 * Core utilities for Anusaya, Carita, and Buddhist analysis
 */

import { describe, it, expect } from 'vitest';
import {
  initializeAnusayaFromDefilement,
  determineCaritaFromProfile,
  ensureBuddhistPsychology,
  getRecommendedMeditation,
  getAnusayaStrength,
  formatAnusayaForDisplay,
  getCaritaDisplayInfo,
  getIntensityDisplay,
} from '../buddhistPsychologyHelper';
import type { Character, AnusayaProfile, CaritaType } from '../../../types';

describe('buddhistPsychologyHelper', () => {
  const mockCharacterWithDefilement: Character = {
    id: 'char-1',
    name: 'Test Character',
    internal: {
      consciousness: {
        'ศรัทธา (Faith)': 60,
        'เมตตา (Compassion)': 50,
        'ปัญญา (Wisdom)': 70,
        'สติ (Mindfulness)': 65,
      },
      defilement: {
        'โลภะ (Greed)': 40,
        'โทสะ (Anger)': 30,
        'มานะ (Pride)': 25,
        'ทิฏฐิ (Wrong view)': 20,
        'วิจิกิจฉา (Doubt)': 15,
        'อุทธัจจะ (Restlessness)': 35,
        'โมหะ (Delusion)': 45,
        'กิเลส (Lust)': 30,
        'อิสสา (Jealousy)': 20,
        'ถีนมิทธะ (Sloth)': 25,
      },
    },
  } as Character;

  const mockCharacterNoBuddhist: Character = {
    id: 'char-2',
    name: 'No Buddhist',
    internal: {
      consciousness: {},
      defilement: {
        'โลภะ (Greed)': 50,
        'โทสะ (Anger)': 60,
      },
    },
  } as Character;

  const mockAnusayaProfile: AnusayaProfile = {
    kama_raga: 40,
    patigha: 30,
    mana: 25,
    ditthi: 20,
    vicikiccha: 15,
    bhava_raga: 35,
    avijja: 45,
  };

  describe('initializeAnusayaFromDefilement', () => {
    it('should initialize anusaya from defilement values', () => {
      const result = initializeAnusayaFromDefilement(mockCharacterWithDefilement);

      expect(result.kama_raga).toBe(40 * 0.8); // โลภะ * 0.8 = 32
      expect(result.patigha).toBe(30 * 0.8); // โทสะ * 0.8 = 24
      expect(result.mana).toBe(25 * 0.9); // มานะ * 0.9 = 22.5
      expect(result.ditthi).toBe(20 * 0.9); // ทิฏฐิ * 0.9 = 18
      expect(result.vicikiccha).toBe(15 * 0.9); // วิจิกิจฉา * 0.9 = 13.5
      expect(result.bhava_raga).toBe(35 * 0.7); // อุทธัจจะ * 0.7 = 24.5
      expect(result.avijja).toBe(45 * 0.9); // โมหะ * 0.9 = 40.5
    });

    it('should handle missing defilement values', () => {
      const charNoDefilement: Character = {
        id: 'char-3',
        name: 'No Defilement',
        internal: {},
      } as Character;

      const result = initializeAnusayaFromDefilement(charNoDefilement);

      expect(result.kama_raga).toBe(0);
      expect(result.patigha).toBe(0);
      expect(result.mana).toBe(0);
      expect(result.ditthi).toBe(0);
      expect(result.vicikiccha).toBe(0);
      expect(result.bhava_raga).toBe(0);
      expect(result.avijja).toBe(0);
    });

    it('should handle partial defilement values', () => {
      const charPartial: Character = {
        id: 'char-4',
        name: 'Partial',
        internal: {
          defilement: {
            'โลภะ (Greed)': 50,
            'โทสะ (Anger)': 30,
          },
        },
      } as Character;

      const result = initializeAnusayaFromDefilement(charPartial);

      expect(result.kama_raga).toBe(50 * 0.8);
      expect(result.patigha).toBe(30 * 0.8);
      expect(result.mana).toBe(0);
      expect(result.ditthi).toBe(0);
    });
  });

  describe('determineCaritaFromProfile', () => {
    it('should determine primary Carita from profile', () => {
      const result = determineCaritaFromProfile(mockCharacterWithDefilement);

      expect(result.primary).toBeDefined();
      expect(['ราคจริต', 'โทสจริต', 'โมหจริต', 'สัทธาจริต', 'พุทธิจริต', 'วิตกจริต']).toContain(
        result.primary
      );
    });

    it('should calculate พุทธิจริต when wisdom is dominant', () => {
      const wisdomChar: Character = {
        id: 'wise',
        name: 'Wise',
        internal: {
          consciousness: {
            'ปัญญา (Wisdom)': 90,
            'สติ (Mindfulness)': 85,
          },
          defilement: {
            'โลภะ (Greed)': 10,
            'โทสะ (Anger)': 10,
            'โมหะ (Delusion)': 10,
          },
        },
      } as Character;

      const result = determineCaritaFromProfile(wisdomChar);

      expect(result.primary).toBe('พุทธิจริต');
    });

    it('should calculate ราคจริต when greed is dominant', () => {
      const greedChar: Character = {
        id: 'greedy',
        name: 'Greedy',
        internal: {
          consciousness: {},
          defilement: {
            'โลภะ (Greed)': 80,
            'กิเลส (Lust)': 70,
            'โทสะ (Anger)': 20,
          },
        },
      } as Character;

      const result = determineCaritaFromProfile(greedChar);

      expect(result.primary).toBe('ราคจริต');
    });

    it('should calculate โทสจริต when anger is dominant', () => {
      const angerChar: Character = {
        id: 'angry',
        name: 'Angry',
        internal: {
          consciousness: {},
          defilement: {
            'โทสะ (Anger)': 85,
            'อิสสา (Jealousy)': 75,
            'โลภะ (Greed)': 20,
          },
        },
      } as Character;

      const result = determineCaritaFromProfile(angerChar);

      expect(result.primary).toBe('โทสจริต');
    });

    it('should determine secondary Carita when close to primary', () => {
      const result = determineCaritaFromProfile(mockCharacterWithDefilement);

      // Secondary should exist if score > 60% of primary
      if (result.secondary) {
        expect(['ราคจริต', 'โทสจริต', 'โมหจริต', 'สัทธาจริต', 'พุทธิจริต', 'วิตกจริต']).toContain(
          result.secondary
        );
        expect(result.secondary).not.toBe(result.primary);
      }
    });

    it('should handle empty profile', () => {
      const emptyChar: Character = {
        id: 'empty',
        name: 'Empty',
        internal: {},
      } as Character;

      const result = determineCaritaFromProfile(emptyChar);

      expect(result.primary).toBeDefined();
    });
  });

  describe('ensureBuddhistPsychology', () => {
    it('should return character unchanged if buddhist_psychology exists', () => {
      const existingChar: Character = {
        ...mockCharacterWithDefilement,
        buddhist_psychology: {
          anusaya: mockAnusayaProfile,
          carita: 'พุทธิจริต',
        },
      };

      const result = ensureBuddhistPsychology(existingChar);

      expect(result).toEqual(existingChar);
      expect(result.buddhist_psychology?.carita).toBe('พุทธิจริต');
    });

    it('should add buddhist_psychology if missing', () => {
      const result = ensureBuddhistPsychology(mockCharacterNoBuddhist);

      expect(result.buddhist_psychology).toBeDefined();
      expect(result.buddhist_psychology?.anusaya).toBeDefined();
      expect(result.buddhist_psychology?.carita).toBeDefined();
    });

    it('should initialize anusaya from defilement', () => {
      const result = ensureBuddhistPsychology(mockCharacterNoBuddhist);

      expect(result.buddhist_psychology?.anusaya.kama_raga).toBe(50 * 0.8);
      expect(result.buddhist_psychology?.anusaya.patigha).toBe(60 * 0.8);
    });

    it('should set primary and secondary carita', () => {
      const result = ensureBuddhistPsychology(mockCharacterWithDefilement);

      expect(result.buddhist_psychology?.carita).toBeDefined();
      // Secondary may or may not exist depending on scores
      if (result.buddhist_psychology?.carita_secondary) {
        expect(result.buddhist_psychology.carita_secondary).not.toBe(
          result.buddhist_psychology.carita
        );
      }
    });
  });

  describe('getRecommendedMeditation', () => {
    it('should recommend อสุภกรรมฐาน for ราคจริต', () => {
      const result = getRecommendedMeditation('ราคจริต');

      expect(result.practice).toBe('อสุภกรรมฐาน');
      expect(result.pali).toBe('Asubha Kammatthana');
      expect(result.description).toContain('ความไม่งาม');
    });

    it('should recommend เมตตากรรมฐาน for โทสจริต', () => {
      const result = getRecommendedMeditation('โทสจริต');

      expect(result.practice).toBe('เมตตากรรมฐาน');
      expect(result.pali).toBe('Metta Kammatthana');
      expect(result.description).toContain('เมตตา');
    });

    it('should recommend ปฏิจจสมุปบาทกรรมฐาน for โมหจริต', () => {
      const result = getRecommendedMeditation('โมหจริต');

      expect(result.practice).toBe('ปฏิจจสมุปบาทกรรมฐาน');
      expect(result.pali).toBe('Paticcasamuppada Kammatthana');
      expect(result.description).toContain('เหตุปัจจัย');
    });

    it('should recommend พุทธานุสติกรรมฐาน for สัทธาจริต', () => {
      const result = getRecommendedMeditation('สัทธาจริต');

      expect(result.practice).toBe('พุทธานุสติกรรมฐาน');
      expect(result.pali).toBe('Buddhanussati Kammatthana');
      expect(result.description).toContain('พระคุณ');
    });

    it('should recommend มรณานุสติกรรมฐาน for พุทธิจริต', () => {
      const result = getRecommendedMeditation('พุทธิจริต');

      expect(result.practice).toBe('มรณานุสติกรรมฐาน');
      expect(result.pali).toBe('Maranassati Kammatthana');
      expect(result.description).toContain('ความตาย');
    });

    it('should recommend อานาปานสติกรรมฐาน for วิตกจริต', () => {
      const result = getRecommendedMeditation('วิตกจริต');

      expect(result.practice).toBe('อานาปานสติกรรมฐาน');
      expect(result.pali).toBe('Anapanasati Kammatthana');
      expect(result.description).toContain('ลมหายใจ');
    });
  });

  describe('getAnusayaStrength', () => {
    it('should calculate average strength', () => {
      const result = getAnusayaStrength(mockAnusayaProfile);

      const values = Object.values(mockAnusayaProfile);
      const expectedAvg = values.reduce((sum, val) => sum + val, 0) / values.length;

      expect(result.average).toBeCloseTo(expectedAvg, 2);
    });

    it('should identify strongest anusaya', () => {
      const result = getAnusayaStrength(mockAnusayaProfile);

      expect(result.strongest).toBe('avijja'); // 45 is highest
    });

    it('should classify as low when average < 25', () => {
      const lowAnusaya: AnusayaProfile = {
        kama_raga: 10,
        patigha: 15,
        mana: 20,
        ditthi: 10,
        vicikiccha: 5,
        bhava_raga: 15,
        avijja: 20,
      };

      const result = getAnusayaStrength(lowAnusaya);

      expect(result.level).toBe('low');
      expect(result.average).toBeLessThan(25);
    });

    it('should classify as moderate when 25 <= average < 50', () => {
      const moderateAnusaya: AnusayaProfile = {
        kama_raga: 30,
        patigha: 35,
        mana: 40,
        ditthi: 30,
        vicikiccha: 25,
        bhava_raga: 35,
        avijja: 40,
      };

      const result = getAnusayaStrength(moderateAnusaya);

      expect(result.level).toBe('moderate');
      expect(result.average).toBeGreaterThanOrEqual(25);
      expect(result.average).toBeLessThan(50);
    });

    it('should classify as high when 50 <= average < 75', () => {
      const highAnusaya: AnusayaProfile = {
        kama_raga: 55,
        patigha: 60,
        mana: 65,
        ditthi: 55,
        vicikiccha: 50,
        bhava_raga: 60,
        avijja: 65,
      };

      const result = getAnusayaStrength(highAnusaya);

      expect(result.level).toBe('high');
      expect(result.average).toBeGreaterThanOrEqual(50);
      expect(result.average).toBeLessThan(75);
    });

    it('should classify as extreme when average >= 75', () => {
      const extremeAnusaya: AnusayaProfile = {
        kama_raga: 80,
        patigha: 85,
        mana: 90,
        ditthi: 80,
        vicikiccha: 75,
        bhava_raga: 85,
        avijja: 90,
      };

      const result = getAnusayaStrength(extremeAnusaya);

      expect(result.level).toBe('extreme');
      expect(result.average).toBeGreaterThanOrEqual(75);
    });
  });

  describe('formatAnusayaForDisplay', () => {
    it('should format all 7 anusaya types', () => {
      const result = formatAnusayaForDisplay(mockAnusayaProfile);

      expect(result).toHaveLength(7);
    });

    it('should include kama_raga with correct data', () => {
      const result = formatAnusayaForDisplay(mockAnusayaProfile);
      const kamaRaga = result.find((a) => a.name === 'kama_raga');

      expect(kamaRaga).toBeDefined();
      expect(kamaRaga?.value).toBe(40);
      expect(kamaRaga?.thai).toBe('กามราคานุสัย');
      expect(kamaRaga?.pali).toBe('Kama-raga');
    });

    it('should include patigha with correct data', () => {
      const result = formatAnusayaForDisplay(mockAnusayaProfile);
      const patigha = result.find((a) => a.name === 'patigha');

      expect(patigha).toBeDefined();
      expect(patigha?.value).toBe(30);
      expect(patigha?.thai).toBe('ปฏิฆานุสัย');
      expect(patigha?.pali).toBe('Patigha');
    });

    it('should include all anusaya names', () => {
      const result = formatAnusayaForDisplay(mockAnusayaProfile);
      const names = result.map((a) => a.name);

      expect(names).toContain('kama_raga');
      expect(names).toContain('patigha');
      expect(names).toContain('mana');
      expect(names).toContain('ditthi');
      expect(names).toContain('vicikiccha');
      expect(names).toContain('bhava_raga');
      expect(names).toContain('avijja');
    });

    it('should preserve values correctly', () => {
      const result = formatAnusayaForDisplay(mockAnusayaProfile);

      result.forEach((item) => {
        expect(item.value).toBe(mockAnusayaProfile[item.name as keyof AnusayaProfile]);
      });
    });
  });

  describe('getCaritaDisplayInfo', () => {
    it('should return info for ราคจริต', () => {
      const result = getCaritaDisplayInfo('ราคจริต');

      expect(result.emoji).toBe('💰');
      expect(result.color).toBe('text-yellow-400');
      expect(result.pali).toBe('Raga-carita');
      expect(result.description).toContain('กาม');
    });

    it('should return info for โทสจริต', () => {
      const result = getCaritaDisplayInfo('โทสจริต');

      expect(result.emoji).toBe('🔥');
      expect(result.color).toBe('text-red-400');
      expect(result.pali).toBe('Dosa-carita');
      expect(result.description).toContain('โกรธ');
    });

    it('should return info for โมหจริต', () => {
      const result = getCaritaDisplayInfo('โมหจริต');

      expect(result.emoji).toBe('🌀');
      expect(result.color).toBe('text-gray-400');
      expect(result.pali).toBe('Moha-carita');
      expect(result.description).toContain('หลงงมงาย');
    });

    it('should return info for สัทธาจริต', () => {
      const result = getCaritaDisplayInfo('สัทธาจริต');

      expect(result.emoji).toBe('🙏');
      expect(result.color).toBe('text-blue-400');
      expect(result.pali).toBe('Saddha-carita');
      expect(result.description).toContain('ศรัทธา');
    });

    it('should return info for พุทธิจริต', () => {
      const result = getCaritaDisplayInfo('พุทธิจริต');

      expect(result.emoji).toBe('🧠');
      expect(result.color).toBe('text-purple-400');
      expect(result.pali).toBe('Buddhi-carita');
      expect(result.description).toContain('ปัญญา');
    });

    it('should return info for วิตกจริต', () => {
      const result = getCaritaDisplayInfo('วิตกจริต');

      expect(result.emoji).toBe('💭');
      expect(result.color).toBe('text-cyan-400');
      expect(result.pali).toBe('Vitakka-carita');
      expect(result.description).toContain('ความคิด');
    });

    it('should have unique emoji for each carita', () => {
      const caritas: CaritaType[] = [
        'ราคจริต',
        'โทสจริต',
        'โมหจริต',
        'สัทธาจริต',
        'พุทธิจริต',
        'วิตกจริต',
      ];
      const emojis = caritas.map((c) => getCaritaDisplayInfo(c).emoji);
      const uniqueEmojis = new Set(emojis);

      expect(uniqueEmojis.size).toBe(6);
    });
  });

  describe('getIntensityDisplay', () => {
    it('should return correct data for mild intensity', () => {
      const result = getIntensityDisplay('mild');

      expect(result.label).toBe('เล็กน้อย');
      expect(result.emoji).toBe('○');
      expect(result.multiplier).toBe(1);
      expect(result.color).toContain('blue');
    });

    it('should return correct data for moderate intensity', () => {
      const result = getIntensityDisplay('moderate');

      expect(result.label).toBe('ปานกลาง');
      expect(result.emoji).toBe('◐');
      expect(result.multiplier).toBe(2);
      expect(result.color).toContain('yellow');
    });

    it('should return correct data for severe intensity', () => {
      const result = getIntensityDisplay('severe');

      expect(result.label).toBe('รุนแรง');
      expect(result.emoji).toBe('◕');
      expect(result.multiplier).toBe(4);
      expect(result.color).toContain('orange');
    });

    it('should return correct data for extreme intensity', () => {
      const result = getIntensityDisplay('extreme');

      expect(result.label).toBe('สูงสุด');
      expect(result.emoji).toBe('●');
      expect(result.multiplier).toBe(8);
      expect(result.color).toContain('red');
    });

    it('should have increasing multipliers', () => {
      const mild = getIntensityDisplay('mild');
      const moderate = getIntensityDisplay('moderate');
      const severe = getIntensityDisplay('severe');
      const extreme = getIntensityDisplay('extreme');

      expect(mild.multiplier).toBeLessThan(moderate.multiplier);
      expect(moderate.multiplier).toBeLessThan(severe.multiplier);
      expect(severe.multiplier).toBeLessThan(extreme.multiplier);
    });

    it('should have unique emojis for each intensity', () => {
      const intensities = ['mild', 'moderate', 'severe', 'extreme'] as const;
      const emojis = intensities.map((i) => getIntensityDisplay(i).emoji);
      const uniqueEmojis = new Set(emojis);

      expect(uniqueEmojis.size).toBe(4);
    });
  });
});
