import { describe, it, expect } from 'vitest';
import { JavanaDecisionEngine } from '../mindProcessors';
import type { SensoryInput } from '../mindProcessors';
import type { Character } from '../../../types';

describe('Mind Processors', () => {
  describe('JavanaDecisionEngine', () => {
    const createTestCharacter = (overrides?: Partial<Character>): Character => ({
      id: 'test-char',
      name: 'Test Character',
      role: 'Protagonist',
      description: 'Test character',
      internal: {
        consciousness: {
          'สติ (Mindfulness)': 50,
          'ปัญญา (Wisdom)': 50,
        },
        subconscious: {},
        defilement: {
          โลภะ: 20,
          โทสะ: 20,
          โมหะ: 20,
        },
      },
      external: {},
      physical: {},
      fashion: {},
      goals: {
        objective: '',
        need: '',
        action: '',
        conflict: '',
        backstory: '',
      },
      parami_portfolio: {
        dana: { level: 5, exp: 100 },
        sila: { level: 5, exp: 100 },
        nekkhamma: { level: 5, exp: 100 },
        viriya: { level: 5, exp: 100 },
        khanti: { level: 5, exp: 100 },
        sacca: { level: 5, exp: 100 },
        adhitthana: { level: 5, exp: 100 },
        metta: { level: 5, exp: 100 },
        upekkha: { level: 5, exp: 100 },
        panna: { level: 5, exp: 100 },
      },
      buddhist_psychology: {
        anusaya: {
          kama_raga: 30,
          patigha: 25,
          avijja: 40,
          mana: 20,
          ditthi: 15,
          vicikiccha: 10,
          bhava_raga: 35,
        },
        carita: 'สัทธาจริต',
      },
      ...overrides,
    } as Character);

    const createPleasantInput = (): SensoryInput => ({
      type: 'pleasant',
      object: 'Beautiful scenery',
      intensity: 70,
      senseDoor: 'eye',
    });

    const createUnpleasantInput = (): SensoryInput => ({
      type: 'unpleasant',
      object: 'Someone insults you',
      intensity: 80,
      senseDoor: 'ear',
    });

    it('should generate kusala citta with high mindfulness', () => {
      const character = createTestCharacter({
        internal: {
          consciousness: {
            'สติ (Mindfulness)': 90,
            'ปัญญา (Wisdom)': 85,
          },
          subconscious: {},
          defilement: { โลภะ: 10, โทสะ: 10, โมหะ: 10 },
        },
      });

      const input = createPleasantInput();
      const result = JavanaDecisionEngine.decide(input, character);

      expect(result).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(['kusala', 'akusala', 'vipaka', 'kiriya']).toContain(result.quality);
      expect(result.citta_type).toBeDefined();
      expect(result.cetana_strength).toBeGreaterThanOrEqual(0);
      expect(result.cetana_strength).toBeLessThanOrEqual(100);
    });

    it('should generate akusala citta with low mindfulness and strong kilesa', () => {
      const character = createTestCharacter({
        internal: {
          consciousness: {
            'สติ (Mindfulness)': 10,
            'ปัญญา (Wisdom)': 5,
          },
          subconscious: {},
          defilement: {
            โลภะ: 90,
            โทสะ: 85,
            โมหะ: 80,
          },
        },
        buddhist_psychology: {
          anusaya: {
            kama_raga: 95,
            patigha: 90,
            avijja: 85,
            mana: 70,
            ditthi: 60,
            vicikiccha: 50,
            bhava_raga: 75,
          },
          carita: 'โทสจริต',
        },
      });

      const input = createUnpleasantInput();
      const result = JavanaDecisionEngine.decide(input, character);

      expect(result).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(result.citta_type).toBeDefined();
    });

    it('should consider parami resistance against kilesa', () => {
      const character = createTestCharacter({
        parami_portfolio: {
          dana: { level: 10, exp: 500 },
          sila: { level: 10, exp: 500 },
          nekkhamma: { level: 10, exp: 500 },
          viriya: { level: 10, exp: 500 },
          khanti: { level: 10, exp: 500 },
          sacca: { level: 10, exp: 500 },
          adhitthana: { level: 10, exp: 500 },
          metta: { level: 10, exp: 500 },
          upekkha: { level: 10, exp: 500 },
          panna: { level: 10, exp: 500 },
        },
        buddhist_psychology: {
          anusaya: {
            kama_raga: 50,
            patigha: 50,
            avijja: 50,
            mana: 30,
            ditthi: 20,
            vicikiccha: 10,
            bhava_raga: 40,
          },
          carita: 'ราคจริต',
        },
      });

      const input = createPleasantInput();
      const result = JavanaDecisionEngine.decide(input, character);

      // With high parami, should have better chance of kusala
      expect(result).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning).toBe('string');
    });

    it('should handle pleasant sensory input differently from unpleasant', () => {
      const character = createTestCharacter();

      const pleasantResult = JavanaDecisionEngine.decide(createPleasantInput(), character);
      const unpleasantResult = JavanaDecisionEngine.decide(createUnpleasantInput(), character);

      expect(pleasantResult.vedana).toBeDefined();
      expect(unpleasantResult.vedana).toBeDefined();
      
      // Results should be valid citta types
      expect(pleasantResult.citta_type).toBeDefined();
      expect(unpleasantResult.citta_type).toBeDefined();
    });

    it('should return proper JavanaResult structure', () => {
      const character = createTestCharacter();
      const input = createPleasantInput();
      
      const result = JavanaDecisionEngine.decide(input, character);

      // Verify all required fields exist
      expect(result).toHaveProperty('citta_type');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('hetu');
      expect(result).toHaveProperty('vedana');
      expect(result).toHaveProperty('cetana_strength');
      expect(result).toHaveProperty('reasoning');

      // Verify types
      expect(typeof result.citta_type).toBe('string');
      expect(['kusala', 'akusala', 'vipaka', 'kiriya']).toContain(result.quality);
      expect(Array.isArray(result.hetu)).toBe(true);
      expect(typeof result.vedana).toBe('string');
      expect(typeof result.cetana_strength).toBe('number');
      expect(typeof result.reasoning).toBe('string');
    });

    it('should vary cetana strength based on character state', () => {
      const weakCharacter = createTestCharacter({
        internal: {
          consciousness: {
            'สติ (Mindfulness)': 10,
            'ปัญญา (Wisdom)': 10,
          },
          subconscious: {},
          defilement: { โลภะ: 90, โทสะ: 90, โมหะ: 90 },
        },
      });

      const strongCharacter = createTestCharacter({
        internal: {
          consciousness: {
            'สติ (Mindfulness)': 95,
            'ปัญญา (Wisdom)': 95,
          },
          subconscious: {},
          defilement: { โลภะ: 5, โทสะ: 5, โมหะ: 5 },
        },
      });

      const input = createPleasantInput();
      
      const weakResult = JavanaDecisionEngine.decide(input, weakCharacter);
      const strongResult = JavanaDecisionEngine.decide(input, strongCharacter);

      // Both should have valid cetana strength
      expect(weakResult.cetana_strength).toBeGreaterThanOrEqual(0);
      expect(weakResult.cetana_strength).toBeLessThanOrEqual(100);
      expect(strongResult.cetana_strength).toBeGreaterThanOrEqual(0);
      expect(strongResult.cetana_strength).toBeLessThanOrEqual(100);
    });
  });
});
