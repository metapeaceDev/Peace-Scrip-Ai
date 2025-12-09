import { describe, it, expect } from 'vitest';
import { calculateParamiSynergy, updateParamiFromAction, PARAMI_SYNERGY_MATRIX } from '../paramiSystem';
import type { ParamiPortfolio } from '../../../types';

describe('Parami System', () => {
  describe('PARAMI_SYNERGY_MATRIX', () => {
    it('should have entries for all 10 paramis', () => {
      const expectedParamis = [
        'dana', 'sila', 'nekkhamma', 'viriya', 'khanti',
        'sacca', 'adhitthana', 'metta', 'upekkha', 'panna'
      ];

      expectedParamis.forEach(parami => {
        expect(PARAMI_SYNERGY_MATRIX).toHaveProperty(parami);
      });
    });

    it('should have valid synergy definitions', () => {
      Object.entries(PARAMI_SYNERGY_MATRIX).forEach(([_parami, config]) => {
        expect(config).toHaveProperty('supporting_paramis');
        expect(config).toHaveProperty('boost_formula');
        expect(config).toHaveProperty('explanation');
        expect(Array.isArray(config.supporting_paramis)).toBe(true);
        expect(typeof config.boost_formula).toBe('string');
        expect(typeof config.explanation).toBe('string');
      });
    });
  });

  describe('calculateParamiSynergy', () => {
    const createTestPortfolio = (overrides?: Partial<ParamiPortfolio>): ParamiPortfolio => ({
      dana: { level: 0, exp: 0 },
      sila: { level: 0, exp: 0 },
      nekkhamma: { level: 0, exp: 0 },
      viriya: { level: 0, exp: 0 },
      khanti: { level: 0, exp: 0 },
      sacca: { level: 0, exp: 0 },
      adhitthana: { level: 0, exp: 0 },
      metta: { level: 0, exp: 0 },
      upekkha: { level: 0, exp: 0 },
      panna: { level: 0, exp: 0 },
      ...overrides,
    });

    it('should calculate Dana synergy correctly', () => {
      // Dana synergy = 0.1 * (khanti + adhitthana + metta)
      const portfolio = createTestPortfolio({
        dana: { level: 5, exp: 100 },
        khanti: { level: 4, exp: 80 },
        adhitthana: { level: 6, exp: 120 },
        metta: { level: 3, exp: 60 },
      });

      const synergy = calculateParamiSynergy('dana', portfolio);

      // Expected: 0.1 * (4 + 6 + 3) = 1.3
      expect(synergy).toBeCloseTo(1.3, 1);
    });

    it('should return 0 synergy if supporting paramis are at level 0', () => {
      const portfolio = createTestPortfolio({
        dana: { level: 5, exp: 100 },
        // All supporting paramis at 0
      });

      const synergy = calculateParamiSynergy('dana', portfolio);
      expect(synergy).toBe(0);
    });

    it('should calculate Panna synergy correctly', () => {
      // Panna synergy = 0.15 * (nekkhamma + adhitthana + viriya)
      const portfolio = createTestPortfolio({
        panna: { level: 8, exp: 200 },
        nekkhamma: { level: 5, exp: 100 },
        adhitthana: { level: 6, exp: 120 },
        viriya: { level: 4, exp: 80 },
      });

      const synergy = calculateParamiSynergy('panna', portfolio);

      // Expected: 0.15 * (5 + 6 + 4) = 2.25
      expect(synergy).toBeCloseTo(2.25, 1);
    });

    it('should calculate Metta synergy correctly', () => {
      // Metta synergy = 0.1 * (khanti + upekkha + panna)
      const portfolio = createTestPortfolio({
        metta: { level: 7, exp: 150 },
        khanti: { level: 5, exp: 100 },
        upekkha: { level: 6, exp: 120 },
        panna: { level: 4, exp: 80 },
      });

      const synergy = calculateParamiSynergy('metta', portfolio);

      // Expected: 0.1 * (5 + 6 + 4) = 1.5
      expect(synergy).toBeCloseTo(1.5, 1);
    });
  });

  describe('updateParamiFromAction', () => {
    it('should increase Dana when character gives/helps', () => {
      const portfolio = createTestPortfolio({
        dana: { level: 3, exp: 50 },
      });

      const action = {
        กาย: ['ช่วยเหลือผู้อื่น', 'ให้ของ'],
        วาจา: ['พูดคำดี'],
        ใจ: ['มีจิตใจดี'],
      };

      const updated = updateParamiFromAction(portfolio, action, 'กุศลกรรม');

      expect(updated.dana.exp).toBeGreaterThan(50);
    });

    it('should increase Khanti when character shows patience', () => {
      const portfolio = createTestPortfolio({
        khanti: { level: 2, exp: 30 },
      });

      const action = {
        กาย: ['อดทน', 'อดกลั้น'],
        วาจา: ['ไม่โต้ตอบ'],
        ใจ: ['ใจเย็น'],
      };

      const updated = updateParamiFromAction(portfolio, action, 'กุศลกรรม');

      expect(updated.khanti.exp).toBeGreaterThan(30);
    });

    it('should not update parami for unwholesome actions', () => {
      const portfolio = createTestPortfolio({
        metta: { level: 3, exp: 50 },
      });

      const action = {
        กาย: ['ทำร้าย'],
        วาจา: ['ด่า'],
        ใจ: ['โกรธ'],
      };

      const updated = updateParamiFromAction(portfolio, action, 'อกุศลกรรม');

      // Unwholesome actions should not increase paramis
      expect(updated.metta.exp).toBe(50);
    });

    it('should handle level up when exp exceeds 100', () => {
      const portfolio = createTestPortfolio({
        viriya: { level: 5, exp: 95 },
      });

      const action = {
        กาย: ['พยายาม', 'เพียรพยายาม'],
        วาจา: ['กล่าวถึงความพยายาม'],
        ใจ: ['มีกำลังใจ'],
      };

      const updated = updateParamiFromAction(portfolio, action, 'กุศลกรรม');

      // Should level up to 6
      expect(updated.viriya.level).toBe(6);
      expect(updated.viriya.exp).toBeLessThan(100);
    });
  });

  describe('Parami Synergy Integration', () => {
    it('should apply synergy bonus to effective level', () => {
      const portfolio = createTestPortfolio({
        dana: { level: 5, exp: 50 },
        khanti: { level: 4, exp: 0 },
        adhitthana: { level: 6, exp: 0 },
        metta: { level: 3, exp: 0 },
      });

      const synergy = calculateParamiSynergy('dana', portfolio);
      const effectiveLevel = portfolio.dana.level + synergy;

      // Effective level should be higher than base level
      expect(effectiveLevel).toBeGreaterThan(portfolio.dana.level);
      // Dana: 5 + 1.3 = 6.3
      expect(effectiveLevel).toBeCloseTo(6.3, 1);
    });
  });
});

// Helper function (moved outside describe for reuse)
function createTestPortfolio(overrides?: Partial<ParamiPortfolio>): ParamiPortfolio {
  return {
    dana: { level: 0, exp: 0 },
    sila: { level: 0, exp: 0 },
    nekkhamma: { level: 0, exp: 0 },
    viriya: { level: 0, exp: 0 },
    khanti: { level: 0, exp: 0 },
    sacca: { level: 0, exp: 0 },
    adhitthana: { level: 0, exp: 0 },
    metta: { level: 0, exp: 0 },
    upekkha: { level: 0, exp: 0 },
    panna: { level: 0, exp: 0 },
    ...overrides,
  };
}
