/**
 * Psychology Calculator Tests
 * Tests for Buddhist psychology calculations
 */

import { describe, it, expect } from 'vitest';
import { calculatePsychologyProfile, type PsychologyProfile } from '../psychologyCalculator';
import type { Character } from '../../../types';

// Helper to create mock character
function createMockCharacter(consciousnessLevel = 50, defilementLevel = 50): Character {
  return {
    id: 'test-character',
    name: 'Test Character',
    description: 'Test',
    internal: {
      consciousness: {
        'Sati (Mindfulness)': consciousnessLevel,
        'Sampajañña (Clear Comprehension)': consciousnessLevel,
        'Paññā (Wisdom)': consciousnessLevel,
        'Mettā (Loving-kindness)': consciousnessLevel,
        'Karuṇā (Compassion)': consciousnessLevel,
      },
      defilement: {
        'Lobha (Greed)': defilementLevel,
        'Dosa (Anger)': defilementLevel,
        'Moha (delusion)': defilementLevel,
        'Māna (Conceit)': defilementLevel,
        'Diṭṭhi (Wrong view)': defilementLevel,
      },
      parami: {
        'Dāna (Generosity)': 50,
        'Sīla (Morality)': 50,
        'Nekkhamma (Renunciation)': 50,
        'Paññā (Wisdom)': 50,
        'Viriya (Energy)': 50,
        'Khanti (Patience)': 50,
        'Sacca (Truthfulness)': 50,
        'Adhiṭṭhāna (Determination)': 50,
        'Mettā (Loving-kindness)': 50,
        'Upekkhā (Equanimity)': 50,
      },
    },
    appearance: {
      physicalDescription: 'Test',
      clothingStyle: 'Test',
      distinctiveFeatures: [],
    },
    psychology_timeline: [],
  } as Character;
}

describe('psychologyCalculator', () => {
  describe('calculatePsychologyProfile', () => {
    it('should calculate consciousness score', () => {
      const character = createMockCharacter(80, 20);

      const profile = calculatePsychologyProfile(character);

      expect(profile.consciousnessScore).toBeGreaterThanOrEqual(0);
      expect(profile.consciousnessScore).toBeLessThanOrEqual(100);
    });

    it('should calculate defilement score', () => {
      const character = createMockCharacter(20, 80);

      const profile = calculatePsychologyProfile(character);

      expect(profile.defilementScore).toBeGreaterThanOrEqual(0);
      expect(profile.defilementScore).toBeLessThanOrEqual(100);
    });

    it('should calculate mental balance', () => {
      const character = createMockCharacter(70, 30);

      const profile = calculatePsychologyProfile(character);

      expect(profile.mentalBalance).toBeGreaterThanOrEqual(-100);
      expect(profile.mentalBalance).toBeLessThanOrEqual(100);
    });

    it('should identify dominant emotion for peaceful character', () => {
      const character = createMockCharacter(90, 10);

      const profile = calculatePsychologyProfile(character);

      expect(['peaceful', 'joyful']).toContain(profile.dominantEmotion);
    });

    it('should identify dominant emotion for angry character', () => {
      const character = createMockCharacter(10, 90);
      const angryChar = { ...character };
      angryChar.internal.defilement['Dosa (Anger)'] = 95;

      const profile = calculatePsychologyProfile(angryChar);

      expect(['angry', 'confused', 'fearful']).toContain(profile.dominantEmotion);
    });

    it('should calculate emotional intensity', () => {
      const character = createMockCharacter(60, 40);

      const profile = calculatePsychologyProfile(character);

      expect(profile.emotionalIntensity).toBeGreaterThanOrEqual(0);
      expect(profile.emotionalIntensity).toBeLessThanOrEqual(100);
    });

    it('should identify strongest virtue', () => {
      const character = createMockCharacter(80, 20);
      character.internal.consciousness['Paññā (Wisdom)'] = 95;

      const profile = calculatePsychologyProfile(character);

      expect(profile.strongestVirtue).toBeTruthy();
      expect(typeof profile.strongestVirtue).toBe('string');
    });

    it('should identify strongest defilement', () => {
      const character = createMockCharacter(20, 80);
      character.internal.defilement['Lobha (Greed)'] = 95;

      const profile = calculatePsychologyProfile(character);

      expect(profile.strongestDefilement).toBeTruthy();
      expect(typeof profile.strongestDefilement).toBe('string');
    });

    it('should generate personality description', () => {
      const character = createMockCharacter(65, 35);

      const profile = calculatePsychologyProfile(character);

      expect(profile.personalityDescription).toBeTruthy();
      expect(typeof profile.personalityDescription).toBe('string');
      expect(profile.personalityDescription.length).toBeGreaterThan(0);
    });

    it('should generate emotional tendency', () => {
      const character = createMockCharacter(55, 45);

      const profile = calculatePsychologyProfile(character);

      expect(profile.emotionalTendency).toBeTruthy();
      expect(typeof profile.emotionalTendency).toBe('string');
      expect(profile.emotionalTendency.length).toBeGreaterThan(0);
    });

    it('should show positive mental balance for high consciousness', () => {
      const character = createMockCharacter(85, 15);

      const profile = calculatePsychologyProfile(character);

      expect(profile.mentalBalance).toBeGreaterThan(0);
    });

    it('should show negative mental balance for high defilement', () => {
      const character = createMockCharacter(15, 85);

      const profile = calculatePsychologyProfile(character);

      expect(profile.mentalBalance).toBeLessThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle character with all zero consciousness', () => {
      const character = createMockCharacter(0, 50);

      const profile = calculatePsychologyProfile(character);

      expect(profile.consciousnessScore).toBe(0);
    });

    it('should handle character with all max consciousness', () => {
      const character = createMockCharacter(100, 0);

      const profile = calculatePsychologyProfile(character);

      expect(profile.consciousnessScore).toBeGreaterThanOrEqual(90);
    });

    it('should handle character with all max defilement', () => {
      const character = createMockCharacter(0, 100);

      const profile = calculatePsychologyProfile(character);

      expect(profile.defilementScore).toBeGreaterThanOrEqual(90);
    });

    it('should handle balanced character', () => {
      const character = createMockCharacter(50, 50);

      const profile = calculatePsychologyProfile(character);

      expect(Math.abs(profile.mentalBalance)).toBeLessThan(20);
    });

    it('should handle extreme virtuous character', () => {
      const character = createMockCharacter(100, 0);

      const profile = calculatePsychologyProfile(character);

      expect(profile.dominantEmotion).toMatch(/peaceful|joyful/);
      expect(profile.mentalBalance).toBeGreaterThan(50);
    });

    it('should handle extreme defiled character', () => {
      const character = createMockCharacter(0, 100);

      const profile = calculatePsychologyProfile(character);

      expect(profile.dominantEmotion).toMatch(/angry|confused|fearful/);
      expect(profile.mentalBalance).toBeLessThan(-50);
    });
  });

  describe('Integration Tests', () => {
    it('should produce consistent results for same input', () => {
      const character = createMockCharacter(60, 40);

      const profile1 = calculatePsychologyProfile(character);
      const profile2 = calculatePsychologyProfile(character);

      expect(profile1).toEqual(profile2);
    });

    it('should handle character evolution', () => {
      const character1 = createMockCharacter(30, 70);
      const character2 = createMockCharacter(70, 30);

      const profile1 = calculatePsychologyProfile(character1);
      const profile2 = calculatePsychologyProfile(character2);

      expect(profile1.mentalBalance).toBeLessThan(profile2.mentalBalance);
    });

    it('should differentiate between character types', () => {
      const peaceful = createMockCharacter(90, 10);
      const angry = createMockCharacter(10, 90);
      const balanced = createMockCharacter(50, 50);

      const peacefulProfile = calculatePsychologyProfile(peaceful);
      const angryProfile = calculatePsychologyProfile(angry);
      const balancedProfile = calculatePsychologyProfile(balanced);

      expect(peacefulProfile.dominantEmotion).not.toBe(angryProfile.dominantEmotion);
      expect(peacefulProfile.mentalBalance).toBeGreaterThan(balancedProfile.mentalBalance);
      expect(angryProfile.mentalBalance).toBeLessThan(balancedProfile.mentalBalance);
    });

    it('should return all required profile properties', () => {
      const character = createMockCharacter(65, 35);

      const profile = calculatePsychologyProfile(character);

      expect(profile).toHaveProperty('consciousnessScore');
      expect(profile).toHaveProperty('defilementScore');
      expect(profile).toHaveProperty('mentalBalance');
      expect(profile).toHaveProperty('dominantEmotion');
      expect(profile).toHaveProperty('emotionalIntensity');
      expect(profile).toHaveProperty('strongestVirtue');
      expect(profile).toHaveProperty('strongestDefilement');
      expect(profile).toHaveProperty('personalityDescription');
      expect(profile).toHaveProperty('emotionalTendency');
    });

    it('should handle multiple calculations efficiently', () => {
      const characters = Array.from({ length: 10 }, (_, i) =>
        createMockCharacter(i * 10, 100 - i * 10)
      );

      const profiles = characters.map(char => calculatePsychologyProfile(char));

      expect(profiles.length).toBe(10);
      profiles.forEach(profile => {
        expect(profile.consciousnessScore).toBeGreaterThanOrEqual(0);
        expect(profile.defilementScore).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
