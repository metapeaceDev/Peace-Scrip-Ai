/**
 * Psychology TTS Service Tests
 * Tests for Thai TTS with Buddhist psychology carita types
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PsychologyTTSService,
  CARITA_TYPES,
  type CaritaType,
  type CaritaInfo,
  type PsychologyTTSOptions,
} from '../psychologyTTSService';

// Mock fetch globally
global.fetch = vi.fn();

describe('psychologyTTSService', () => {
  let service: PsychologyTTSService;

  beforeEach(() => {
    service = new PsychologyTTSService('http://test-server:8000');
    vi.clearAllMocks();
  });

  describe('CARITA_TYPES constant', () => {
    it('should have all 6 carita types', () => {
      expect(Object.keys(CARITA_TYPES).length).toBe(6);
      expect(CARITA_TYPES).toHaveProperty('tanha');
      expect(CARITA_TYPES).toHaveProperty('dosa');
      expect(CARITA_TYPES).toHaveProperty('moha');
      expect(CARITA_TYPES).toHaveProperty('saddha');
      expect(CARITA_TYPES).toHaveProperty('buddhi');
      expect(CARITA_TYPES).toHaveProperty('vitakka');
    });

    it('should have correct emotion for each carita', () => {
      expect(CARITA_TYPES.tanha.emotion).toBe('greedy');
      expect(CARITA_TYPES.dosa.emotion).toBe('angry');
      expect(CARITA_TYPES.moha.emotion).toBe('confused');
      expect(CARITA_TYPES.saddha.emotion).toBe('faithful');
      expect(CARITA_TYPES.buddhi.emotion).toBe('intelligent');
      expect(CARITA_TYPES.vitakka.emotion).toBe('anxious');
    });

    it('should have pitch modifiers', () => {
      Object.values(CARITA_TYPES).forEach(carita => {
        expect(carita.pitchModifier).toBeGreaterThan(0);
        expect(typeof carita.pitchModifier).toBe('number');
      });
    });

    it('should have speed modifiers', () => {
      Object.values(CARITA_TYPES).forEach(carita => {
        expect(carita.speedModifier).toBeGreaterThan(0);
        expect(typeof carita.speedModifier).toBe('number');
      });
    });

    it('should have energy modifiers', () => {
      Object.values(CARITA_TYPES).forEach(carita => {
        expect(carita.energyModifier).toBeGreaterThan(0);
        expect(typeof carita.energyModifier).toBe('number');
      });
    });

    it('should have all required properties', () => {
      Object.values(CARITA_TYPES).forEach(carita => {
        expect(carita).toHaveProperty('name');
        expect(carita).toHaveProperty('emotion');
        expect(carita).toHaveProperty('pitchModifier');
        expect(carita).toHaveProperty('speedModifier');
        expect(carita).toHaveProperty('energyModifier');
      });
    });

    it('should have saddha as neutral (1.0 modifiers)', () => {
      expect(CARITA_TYPES.saddha.pitchModifier).toBe(1.0);
      expect(CARITA_TYPES.saddha.speedModifier).toBe(1.0);
      expect(CARITA_TYPES.saddha.energyModifier).toBe(1.0);
    });

    it('should have tanha with increased pitch and speed', () => {
      expect(CARITA_TYPES.tanha.pitchModifier).toBeGreaterThan(1.0);
      expect(CARITA_TYPES.tanha.speedModifier).toBeGreaterThan(1.0);
      expect(CARITA_TYPES.tanha.energyModifier).toBeGreaterThan(1.0);
    });

    it('should have dosa with decreased pitch but increased energy', () => {
      expect(CARITA_TYPES.dosa.pitchModifier).toBeLessThan(1.0);
      expect(CARITA_TYPES.dosa.energyModifier).toBeGreaterThan(1.0);
    });

    it('should have moha with slower speed', () => {
      expect(CARITA_TYPES.moha.speedModifier).toBeLessThan(1.0);
    });
  });

  describe('getCaritaInfo', () => {
    it('should return correct info for tanha', () => {
      const info = service.getCaritaInfo('tanha');
      
      expect(info.name).toBe('Taṇhācarita');
      expect(info.emotion).toBe('greedy');
      expect(info.pitchModifier).toBe(1.15);
    });

    it('should return correct info for dosa', () => {
      const info = service.getCaritaInfo('dosa');
      
      expect(info.name).toBe('Dosacarita');
      expect(info.emotion).toBe('angry');
      expect(info.pitchModifier).toBe(0.85);
    });

    it('should return correct info for moha', () => {
      const info = service.getCaritaInfo('moha');
      
      expect(info.name).toBe('Mohācarita');
      expect(info.emotion).toBe('confused');
      expect(info.speedModifier).toBe(0.75);
    });

    it('should return correct info for saddha', () => {
      const info = service.getCaritaInfo('saddha');
      
      expect(info.name).toBe('Saddhācarita');
      expect(info.emotion).toBe('faithful');
    });

    it('should return correct info for buddhi', () => {
      const info = service.getCaritaInfo('buddhi');
      
      expect(info.name).toBe('Buddhicarita');
      expect(info.emotion).toBe('intelligent');
    });

    it('should return correct info for vitakka', () => {
      const info = service.getCaritaInfo('vitakka');
      
      expect(info.name).toBe('Vitakkacarita');
      expect(info.emotion).toBe('anxious');
    });

    it('should return CaritaInfo object', () => {
      const info = service.getCaritaInfo('tanha');
      
      expect(typeof info).toBe('object');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('emotion');
      expect(info).toHaveProperty('pitchModifier');
      expect(info).toHaveProperty('speedModifier');
      expect(info).toHaveProperty('energyModifier');
    });
  });

  describe('isValidCarita', () => {
    it('should return true for valid carita types', () => {
      expect(service.isValidCarita('tanha')).toBe(true);
      expect(service.isValidCarita('dosa')).toBe(true);
      expect(service.isValidCarita('moha')).toBe(true);
      expect(service.isValidCarita('saddha')).toBe(true);
      expect(service.isValidCarita('buddhi')).toBe(true);
      expect(service.isValidCarita('vitakka')).toBe(true);
    });

    it('should return false for invalid carita types', () => {
      expect(service.isValidCarita('invalid')).toBe(false);
      expect(service.isValidCarita('lobha')).toBe(false);
      expect(service.isValidCarita('TANHA')).toBe(false);
      expect(service.isValidCarita('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(service.isValidCarita('Tanha')).toBe(false);
      expect(service.isValidCarita('MOHA')).toBe(false);
    });

    it('should handle special characters', () => {
      expect(service.isValidCarita('tanha!')).toBe(false);
      expect(service.isValidCarita('tanha ')).toBe(false);
      expect(service.isValidCarita(' tanha')).toBe(false);
    });
  });

  describe('Carita Properties', () => {
    it('should have higher energy for tanha (greedy)', () => {
      expect(CARITA_TYPES.tanha.energyModifier).toBeGreaterThan(1.2);
    });

    it('should have highest energy for dosa (angry)', () => {
      const energies = Object.values(CARITA_TYPES).map(c => c.energyModifier);
      const maxEnergy = Math.max(...energies);
      
      expect(CARITA_TYPES.dosa.energyModifier).toBe(maxEnergy);
    });

    it('should have lowest speed for moha (confused)', () => {
      const speeds = Object.values(CARITA_TYPES).map(c => c.speedModifier);
      const minSpeed = Math.min(...speeds);
      
      expect(CARITA_TYPES.moha.speedModifier).toBe(minSpeed);
    });

    it('should have moderate values for buddhi (intelligent)', () => {
      expect(CARITA_TYPES.buddhi.pitchModifier).toBeCloseTo(1.0, 0.1);
      expect(CARITA_TYPES.buddhi.speedModifier).toBeCloseTo(1.0, 0.2);
      expect(CARITA_TYPES.buddhi.energyModifier).toBeCloseTo(1.0, 0.2);
    });

    it('should have increased pitch for vitakka (anxious)', () => {
      expect(CARITA_TYPES.vitakka.pitchModifier).toBeGreaterThan(1.0);
    });

    it('should differentiate between carita types', () => {
      const caritas = Object.keys(CARITA_TYPES) as CaritaType[];
      
      // Check that no two caritas have identical modifiers
      for (let i = 0; i < caritas.length; i++) {
        for (let j = i + 1; j < caritas.length; j++) {
          const c1 = CARITA_TYPES[caritas[i]];
          const c2 = CARITA_TYPES[caritas[j]];
          
          const identical = 
            c1.pitchModifier === c2.pitchModifier &&
            c1.speedModifier === c2.speedModifier &&
            c1.energyModifier === c2.energyModifier;
          
          expect(identical).toBe(false);
        }
      }
    });
  });

  describe('Integration Tests', () => {
    it('should validate and get carita info workflow', () => {
      const caritaName = 'tanha';
      
      expect(service.isValidCarita(caritaName)).toBe(true);
      
      const info = service.getCaritaInfo(caritaName as CaritaType);
      
      expect(info.emotion).toBe('greedy');
      expect(info.pitchModifier).toBeGreaterThan(1.0);
    });

    it('should handle invalid carita gracefully', () => {
      const invalidCarita = 'invalid';
      
      expect(service.isValidCarita(invalidCarita)).toBe(false);
      
      // Should not throw when checking validity
      expect(() => service.isValidCarita(invalidCarita)).not.toThrow();
    });

    it('should provide consistent carita information', () => {
      const carita: CaritaType = 'dosa';
      
      const info1 = service.getCaritaInfo(carita);
      const info2 = service.getCaritaInfo(carita);
      
      expect(info1).toEqual(info2);
    });

    it('should map all carita types to emotions', () => {
      const caritas: CaritaType[] = ['tanha', 'dosa', 'moha', 'saddha', 'buddhi', 'vitakka'];
      
      caritas.forEach(carita => {
        const info = service.getCaritaInfo(carita);
        expect(info.emotion).toBeTruthy();
        expect(typeof info.emotion).toBe('string');
      });
    });

    it('should have unique emotion for each carita', () => {
      const emotions = Object.values(CARITA_TYPES).map(c => c.emotion);
      const uniqueEmotions = new Set(emotions);
      
      expect(uniqueEmotions.size).toBe(6);
    });

    it('should have Pali names for all caritas', () => {
      Object.values(CARITA_TYPES).forEach(carita => {
        expect(carita.name).toContain('carita');
        expect(carita.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string validation', () => {
      expect(service.isValidCarita('')).toBe(false);
    });

    it('should handle null validation gracefully', () => {
      expect(service.isValidCarita(null as any)).toBe(false);
    });

    it('should handle undefined validation gracefully', () => {
      expect(service.isValidCarita(undefined as any)).toBe(false);
    });

    it('should handle numeric input validation', () => {
      expect(service.isValidCarita('123' as any)).toBe(false);
    });

    it('should have all modifiers as positive numbers', () => {
      Object.values(CARITA_TYPES).forEach(carita => {
        expect(carita.pitchModifier).toBeGreaterThan(0);
        expect(carita.speedModifier).toBeGreaterThan(0);
        expect(carita.energyModifier).toBeGreaterThan(0);
        expect(Number.isFinite(carita.pitchModifier)).toBe(true);
        expect(Number.isFinite(carita.speedModifier)).toBe(true);
        expect(Number.isFinite(carita.energyModifier)).toBe(true);
      });
    });

    it('should have reasonable modifier ranges', () => {
      Object.values(CARITA_TYPES).forEach(carita => {
        expect(carita.pitchModifier).toBeGreaterThan(0.5);
        expect(carita.pitchModifier).toBeLessThan(2.0);
        expect(carita.speedModifier).toBeGreaterThan(0.5);
        expect(carita.speedModifier).toBeLessThan(2.0);
        expect(carita.energyModifier).toBeGreaterThan(0.5);
        expect(carita.energyModifier).toBeLessThan(2.0);
      });
    });
  });

  describe('Carita Characteristics', () => {
    it('should represent tanha (greed) with high energy and pitch', () => {
      const tanha = CARITA_TYPES.tanha;
      
      expect(tanha.pitchModifier).toBeGreaterThan(1.1);
      expect(tanha.energyModifier).toBeGreaterThan(1.2);
    });

    it('should represent dosa (anger) with low pitch and high energy', () => {
      const dosa = CARITA_TYPES.dosa;
      
      expect(dosa.pitchModifier).toBeLessThan(0.9);
      expect(dosa.energyModifier).toBeGreaterThan(1.3);
    });

    it('should represent moha (delusion) with reduced energy', () => {
      const moha = CARITA_TYPES.moha;
      
      expect(moha.energyModifier).toBeLessThan(1.0);
    });

    it('should represent saddha (faith) as baseline', () => {
      const saddha = CARITA_TYPES.saddha;
      
      expect(saddha.pitchModifier).toBe(1.0);
      expect(saddha.speedModifier).toBe(1.0);
      expect(saddha.energyModifier).toBe(1.0);
    });

    it('should represent buddhi (wisdom) with slight reduction', () => {
      const buddhi = CARITA_TYPES.buddhi;
      
      expect(buddhi.speedModifier).toBeLessThan(1.0);
      expect(buddhi.energyModifier).toBeLessThan(1.0);
    });

    it('should represent vitakka (speculation) with increased activity', () => {
      const vitakka = CARITA_TYPES.vitakka;
      
      expect(vitakka.pitchModifier).toBeGreaterThan(1.0);
      expect(vitakka.speedModifier).toBeGreaterThan(1.0);
    });
  });
});
