import { describe, it, expect, beforeEach } from 'vitest';
import {
  TanhaToUpadana_Escalator,
  Kilesa_Eradication_Processor,
  getNextMaggaStage,
  getMaggaDescription,
  type ActiveUpadana,
  type Samyojana,
  type MaggaStage,
} from '../advancedProcessors';
import type { Character, AnusayaProfile } from '../../types';

describe('advancedProcessors', () => {
  // ========================================================================
  // TANHA TO UPADANA ESCALATOR
  // ========================================================================

  describe('TanhaToUpadana_Escalator', () => {
    describe('checkForEscalation', () => {
      it('should return null when tanha history is insufficient', () => {
        const result = TanhaToUpadana_Escalator.checkForEscalation(
          70,
          [65, 68], // Only 2 moments
          'เงิน',
          []
        );

        expect(result).toBeNull();
      });

      it('should return null when tanha does not exceed threshold consistently', () => {
        const result = TanhaToUpadana_Escalator.checkForEscalation(
          70,
          [65, 40, 68, 70, 75], // One moment (40) below threshold
          'เงิน',
          []
        );

        expect(result).toBeNull();
      });

      it('should create new kamupadana when tanha exceeds threshold for sensual target', () => {
        const result = TanhaToUpadana_Escalator.checkForEscalation(
          70,
          [65, 68, 70, 72, 75], // All exceed threshold (60)
          'เงิน',
          []
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe('kamupadana');
        expect(result?.target).toBe('เงิน');
        expect(result?.intensity).toBeGreaterThan(40); // Base + (avg - threshold)
        expect(result?.tanha_history).toHaveLength(5);
      });

      it('should create ditthupadana for view-related targets', () => {
        const result = TanhaToUpadana_Escalator.checkForEscalation(
          80,
          [70, 75, 78, 80, 82],
          'ความเชื่อทางการเมือง',
          []
        );

        expect(result?.type).toBe('ditthupadana');
        expect(result?.target).toBe('ความเชื่อทางการเมือง');
      });

      it('should create silabbatupadana for ritual targets', () => {
        const result = TanhaToUpadana_Escalator.checkForEscalation(
          75,
          [65, 70, 72, 75, 78],
          'พิธีกรรมทางศาสนา',
          []
        );

        expect(result?.type).toBe('silabbatupadana');
      });

      it('should create attavadupadana for self-related targets', () => {
        const result = TanhaToUpadana_Escalator.checkForEscalation(
          70,
          [62, 65, 68, 70, 72],
          'ตัวตนของฉัน',
          []
        );

        expect(result?.type).toBe('attavadupadana');
      });

      it('should return null and strengthen existing upadana instead of creating duplicate', () => {
        const existing_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 50,
            target: 'เงิน',
            created_at: Date.now(),
            tanha_history: [60, 62, 65],
          },
        ];

        const result = TanhaToUpadana_Escalator.checkForEscalation(
          70,
          [65, 68, 70, 72, 75],
          'เงิน',
          existing_upadanas
        );

        expect(result).toBeNull();
        expect(existing_upadanas[0].intensity).toBe(55); // Strengthened by 5
      });

      it('should cap upadana intensity at 100 when strengthening', () => {
        const existing_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 98,
            target: 'อาหาร',
            created_at: Date.now(),
            tanha_history: [60, 62],
          },
        ];

        TanhaToUpadana_Escalator.checkForEscalation(
          70,
          [65, 68, 70, 72, 75],
          'อาหาร',
          existing_upadanas
        );

        expect(existing_upadanas[0].intensity).toBe(100); // Capped
      });

      it('should calculate intensity based on average tanha', () => {
        const result = TanhaToUpadana_Escalator.checkForEscalation(
          90,
          [80, 85, 88, 90, 92], // Average = 87
          'pleasure',
          []
        );

        // Intensity = base(40) + (avg(87) - threshold(60)) = 40 + 27 = 67
        expect(result?.intensity).toBeCloseTo(67, 0);
      });
    });

    describe('processUpadanas', () => {
      it('should strengthen upadanas that are fed by current tanha', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 50,
            target: 'เงิน',
            created_at: Date.now(),
            tanha_history: [60, 65],
          },
        ];

        const current_tanha_targets = new Set(['เงิน']);

        const processed = TanhaToUpadana_Escalator.processUpadanas(
          active_upadanas,
          current_tanha_targets
        );

        expect(processed).toHaveLength(1);
        expect(processed[0].intensity).toBe(53); // +3
      });

      it('should cap strengthened upadana at 100', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 99,
            target: 'money',
            created_at: Date.now(),
            tanha_history: [70],
          },
        ];

        const processed = TanhaToUpadana_Escalator.processUpadanas(
          active_upadanas,
          new Set(['money'])
        );

        expect(processed[0].intensity).toBe(100);
      });

      it('should decay upadanas not fed by current tanha', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 50,
            target: 'เงิน',
            created_at: Date.now(),
            tanha_history: [60],
          },
        ];

        const processed = TanhaToUpadana_Escalator.processUpadanas(
          active_upadanas,
          new Set(['อาหาร']) // Different target
        );

        expect(processed[0].intensity).toBe(48); // -2
      });

      it('should remove upadanas that decay to 0', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 1,
            target: 'เงิน',
            created_at: Date.now(),
            tanha_history: [60],
          },
        ];

        const processed = TanhaToUpadana_Escalator.processUpadanas(active_upadanas, new Set());

        expect(processed).toHaveLength(0); // Removed
      });

      it('should handle multiple upadanas with mixed feeding', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 60,
            target: 'เงิน',
            created_at: Date.now(),
            tanha_history: [65],
          },
          {
            type: 'ditthupadana',
            intensity: 40,
            target: 'ความคิด',
            created_at: Date.now(),
            tanha_history: [70],
          },
          {
            type: 'attavadupadana',
            intensity: 30,
            target: 'ตัวตน',
            created_at: Date.now(),
            tanha_history: [62],
          },
        ];

        const processed = TanhaToUpadana_Escalator.processUpadanas(
          active_upadanas,
          new Set(['เงิน', 'ตัวตน']) // Feed only 2
        );

        expect(processed).toHaveLength(3);
        expect(processed[0].intensity).toBe(63); // เงิน +3
        expect(processed[1].intensity).toBe(38); // ความคิด -2
        expect(processed[2].intensity).toBe(33); // ตัวตน +3
      });
    });

    describe('getUpadanaAkusalaBonus', () => {
      it('should return 0 when no active upadanas', () => {
        const bonus = TanhaToUpadana_Escalator.getUpadanaAkusalaBonus([]);
        expect(bonus).toBe(0);
      });

      it('should calculate bonus based on average intensity', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 60,
            target: 'เงิน',
            created_at: Date.now(),
            tanha_history: [],
          },
          {
            type: 'ditthupadana',
            intensity: 80,
            target: 'ความเชื่อ',
            created_at: Date.now(),
            tanha_history: [],
          },
        ];

        // Average intensity = (60 + 80) / 2 = 70
        // Bonus = 70 / 2 = 35
        const bonus = TanhaToUpadana_Escalator.getUpadanaAkusalaBonus(active_upadanas);
        expect(bonus).toBe(35);
      });

      it('should return maximum bonus of 50 for very high intensity', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 100,
            target: 'test',
            created_at: Date.now(),
            tanha_history: [],
          },
        ];

        const bonus = TanhaToUpadana_Escalator.getUpadanaAkusalaBonus(active_upadanas);
        expect(bonus).toBe(50); // 100 / 2
      });

      it('should handle single upadana', () => {
        const active_upadanas: ActiveUpadana[] = [
          {
            type: 'kamupadana',
            intensity: 40,
            target: 'test',
            created_at: Date.now(),
            tanha_history: [],
          },
        ];

        const bonus = TanhaToUpadana_Escalator.getUpadanaAkusalaBonus(active_upadanas);
        expect(bonus).toBe(20); // 40 / 2
      });
    });
  });

  // ========================================================================
  // KILESA ERADICATION PROCESSOR
  // ========================================================================

  describe('Kilesa_Eradication_Processor', () => {
    let initial_samyojana: Samyojana;
    let initial_anusaya: AnusayaProfile;

    beforeEach(() => {
      initial_samyojana = Kilesa_Eradication_Processor.initializeSamyojana();
      initial_anusaya = {
        kama_raga: 80,
        patigha: 70,
        mana: 60,
        vicikiccha: 50,
        ditthi: 40,
        bhava_raga: 30,
        avijja: 90,
      };
    });

    describe('initializeSamyojana', () => {
      it('should initialize all 10 fetters as true', () => {
        const samyojana = Kilesa_Eradication_Processor.initializeSamyojana();

        expect(samyojana.sakkaya_ditthi).toBe(true);
        expect(samyojana.vicikiccha).toBe(true);
        expect(samyojana.silabbata_paramasa).toBe(true);
        expect(samyojana.kama_raga).toBe(true);
        expect(samyojana.patigha).toBe(true);
        expect(samyojana.rupa_raga).toBe(true);
        expect(samyojana.arupa_raga).toBe(true);
        expect(samyojana.mana).toBe(true);
        expect(samyojana.uddhacca).toBe(true);
        expect(samyojana.avijja).toBe(true);
      });
    });

    describe('applyMagga - Sotapatti', () => {
      it('should eradicate first 3 fetters at sotapatti', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'sotapatti',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_samyojana.sakkaya_ditthi).toBe(false);
        expect(result.updated_samyojana.vicikiccha).toBe(false);
        expect(result.updated_samyojana.silabbata_paramasa).toBe(false);
        expect(result.eradicated_fetters).toHaveLength(3);
      });

      it('should eradicate related anusaya at sotapatti', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'sotapatti',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_anusaya.avijja).toBe(0);
        expect(result.updated_anusaya.vicikiccha).toBe(0);
      });

      it('should preserve remaining fetters at sotapatti', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'sotapatti',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_samyojana.kama_raga).toBe(true);
        expect(result.updated_samyojana.patigha).toBe(true);
        expect(result.updated_samyojana.rupa_raga).toBe(true);
      });
    });

    describe('applyMagga - Sakadagami', () => {
      it('should weaken kama-raga and patigha at sakadagami', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'sakadagami',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_anusaya.kama_raga).toBe(30);
        expect(result.updated_anusaya.patigha).toBe(30);
        expect(result.eradicated_fetters).toContain('Kāma-rāga weakened');
        expect(result.eradicated_fetters).toContain('Paṭigha weakened');
      });

      it('should not weaken if already below threshold', () => {
        const weak_anusaya = { ...initial_anusaya, kama_raga: 20, patigha: 15 };

        const result = Kilesa_Eradication_Processor.applyMagga(
          'sakadagami',
          initial_samyojana,
          weak_anusaya
        );

        expect(result.updated_anusaya.kama_raga).toBe(20);
        expect(result.updated_anusaya.patigha).toBe(15);
        expect(result.eradicated_fetters).toHaveLength(0);
      });
    });

    describe('applyMagga - Anagami', () => {
      it('should completely eradicate kama-raga and patigha at anagami', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'anagami',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_samyojana.kama_raga).toBe(false);
        expect(result.updated_samyojana.patigha).toBe(false);
        expect(result.updated_anusaya.kama_raga).toBe(0);
        expect(result.updated_anusaya.patigha).toBe(0);
        expect(result.eradicated_fetters).toContain('Kāma-rāga (Sensual Lust) - ERADICATED');
        expect(result.eradicated_fetters).toContain('Paṭigha (Ill-will) - ERADICATED');
      });

      it('should preserve higher fetters at anagami', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'anagami',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_samyojana.rupa_raga).toBe(true);
        expect(result.updated_samyojana.arupa_raga).toBe(true);
        expect(result.updated_samyojana.mana).toBe(true);
      });
    });

    describe('applyMagga - Arahatta', () => {
      it('should eradicate all remaining 5 fetters at arahatta', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'arahatta',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_samyojana.rupa_raga).toBe(false);
        expect(result.updated_samyojana.arupa_raga).toBe(false);
        expect(result.updated_samyojana.mana).toBe(false);
        expect(result.updated_samyojana.uddhacca).toBe(false);
        expect(result.updated_samyojana.avijja).toBe(false);
        expect(result.eradicated_fetters).toHaveLength(5);
      });

      it('should eradicate ALL anusaya at arahatta', () => {
        const result = Kilesa_Eradication_Processor.applyMagga(
          'arahatta',
          initial_samyojana,
          initial_anusaya
        );

        expect(result.updated_anusaya.kama_raga).toBe(0);
        expect(result.updated_anusaya.patigha).toBe(0);
        expect(result.updated_anusaya.mana).toBe(0);
        expect(result.updated_anusaya.vicikiccha).toBe(0);
        expect(result.updated_anusaya.ditthi).toBe(0);
        expect(result.updated_anusaya.bhava_raga).toBe(0);
        expect(result.updated_anusaya.avijja).toBe(0);
      });
    });

    describe('canAttainMagga - Sotapatti', () => {
      it('should allow sotapatti when all requirements met', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 70, experience: 0 },
            panna: { level: 60, experience: 0 },
            viriya: { level: 50, experience: 0 },
            nekkhamma: { level: 0, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 20,
              patigha: 20,
              mana: 20,
              vicikiccha: 20,
              ditthi: 20,
              bhava_raga: 20,
              avijja: 20,
            },
          },
        } as Character;

        const result = Kilesa_Eradication_Processor.canAttainMagga('sotapatti', character);

        expect(result.can_attain).toBe(true);
        expect(result.requirements_met).toHaveLength(4);
        expect(result.requirements_missing).toHaveLength(0);
      });

      it('should deny sotapatti when sacca insufficient', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 50, experience: 0 }, // Too low
            panna: { level: 60, experience: 0 },
            viriya: { level: 50, experience: 0 },
            nekkhamma: { level: 0, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 20,
              patigha: 20,
              mana: 20,
              vicikiccha: 20,
              ditthi: 20,
              bhava_raga: 20,
              avijja: 20,
            },
          },
        } as Character;

        const result = Kilesa_Eradication_Processor.canAttainMagga('sotapatti', character);

        expect(result.can_attain).toBe(false);
        expect(result.requirements_missing).toContain('Sacca needs 20 more levels');
      });

      it('should deny sotapatti when total kilesa too high', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 70, experience: 0 },
            panna: { level: 60, experience: 0 },
            viriya: { level: 50, experience: 0 },
            nekkhamma: { level: 0, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 50,
              patigha: 50,
              mana: 50,
              vicikiccha: 50,
              ditthi: 50,
              bhava_raga: 50,
              avijja: 50, // Total = 350 > 200
            },
          },
        } as Character;

        const result = Kilesa_Eradication_Processor.canAttainMagga('sotapatti', character);

        expect(result.can_attain).toBe(false);
        expect(result.requirements_missing[0]).toContain('Total Kilesa too high');
      });
    });

    describe('canAttainMagga - Sakadagami', () => {
      it('should require higher panna and weakened kilesa for sakadagami', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 70, experience: 0 },
            panna: { level: 80, experience: 0 },
            viriya: { level: 50, experience: 0 },
            nekkhamma: { level: 0, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 40,
              patigha: 40,
              mana: 20,
              vicikiccha: 0,
              ditthi: 20,
              bhava_raga: 20,
              avijja: 0,
            },
          },
        } as Character;

        const result = Kilesa_Eradication_Processor.canAttainMagga('sakadagami', character);

        expect(result.can_attain).toBe(true);
        expect(result.requirements_met).toContain('Paññā enhanced');
        expect(result.requirements_met).toContain('Kāma-rāga weakened');
        expect(result.requirements_met).toContain('Paṭigha weakened');
      });
    });

    describe('canAttainMagga - Anagami', () => {
      it('should require very high panna and nekkhamma for anagami', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 70, experience: 0 },
            panna: { level: 100, experience: 0 },
            viriya: { level: 50, experience: 0 },
            nekkhamma: { level: 80, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 5,
              patigha: 5,
              mana: 20,
              vicikiccha: 0,
              ditthi: 0,
              bhava_raga: 20,
              avijja: 0,
            },
          },
        } as Character;

        const result = Kilesa_Eradication_Processor.canAttainMagga('anagami', character);

        expect(result.can_attain).toBe(true);
        expect(result.requirements_met).toContain('Paññā very strong');
        expect(result.requirements_met).toContain('Nekkhamma (Renunciation) sufficient');
      });
    });

    describe('canAttainMagga - Arahatta', () => {
      it('should require perfect panna, upekkha, and zero kilesa', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 150, experience: 0 },
            panna: { level: 150, experience: 0 },
            viriya: { level: 150, experience: 0 },
            nekkhamma: { level: 150, experience: 0 },
            upekkha: { level: 120, experience: 0 },
            metta: { level: 150, experience: 0 },
            adhitthana: { level: 150, experience: 0 },
            khanti: { level: 150, experience: 0 },
            caga: { level: 150, experience: 0 },
            sila: { level: 150, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 0,
              patigha: 0,
              mana: 0,
              vicikiccha: 0,
              ditthi: 0,
              bhava_raga: 0,
              avijja: 0,
            },
          },
        } as Character;

        const result = Kilesa_Eradication_Processor.canAttainMagga('arahatta', character);

        expect(result.can_attain).toBe(true);
        expect(result.requirements_met).toContain('Paññā perfected');
        expect(result.requirements_met).toContain('Upekkhā (Equanimity) perfected');
        expect(result.requirements_met).toContain('All Kilesa eradicated');
      });

      it('should deny arahatta if any kilesa remains', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 150, experience: 0 },
            panna: { level: 150, experience: 0 },
            viriya: { level: 150, experience: 0 },
            nekkhamma: { level: 150, experience: 0 },
            upekkha: { level: 120, experience: 0 },
            metta: { level: 150, experience: 0 },
            adhitthana: { level: 150, experience: 0 },
            khanti: { level: 150, experience: 0 },
            caga: { level: 150, experience: 0 },
            sila: { level: 150, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 0,
              patigha: 0,
              mana: 1, // Even 1 remaining
              vicikiccha: 0,
              ditthi: 0,
              bhava_raga: 0,
              avijja: 0,
            },
          },
        } as Character;

        const result = Kilesa_Eradication_Processor.canAttainMagga('arahatta', character);

        expect(result.can_attain).toBe(false);
        expect(result.requirements_missing).toContain('All Kilesa must be eradicated first');
      });
    });

    describe('calculateMaggaProgress', () => {
      it('should return 100% when all requirements met', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 70, experience: 0 },
            panna: { level: 60, experience: 0 },
            viriya: { level: 50, experience: 0 },
            nekkhamma: { level: 0, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 20,
              patigha: 20,
              mana: 20,
              vicikiccha: 20,
              ditthi: 20,
              bhava_raga: 20,
              avijja: 20,
            },
          },
        } as Character;

        const progress = Kilesa_Eradication_Processor.calculateMaggaProgress(
          'sotapatti',
          character
        );

        expect(progress).toBe(100);
      });

      it('should return 0% when no requirements met', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 0, experience: 0 },
            panna: { level: 0, experience: 0 },
            viriya: { level: 0, experience: 0 },
            nekkhamma: { level: 0, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 100,
              patigha: 100,
              mana: 100,
              vicikiccha: 100,
              ditthi: 100,
              bhava_raga: 100,
              avijja: 100,
            },
          },
        } as Character;

        const progress = Kilesa_Eradication_Processor.calculateMaggaProgress(
          'sotapatti',
          character
        );

        expect(progress).toBe(0);
      });

      it('should return partial progress when some requirements met', () => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          parami_portfolio: {
            sacca: { level: 70, experience: 0 }, // Met
            panna: { level: 60, experience: 0 }, // Met
            viriya: { level: 30, experience: 0 }, // Not met
            nekkhamma: { level: 0, experience: 0 },
            upekkha: { level: 0, experience: 0 },
            metta: { level: 0, experience: 0 },
            adhitthana: { level: 0, experience: 0 },
            khanti: { level: 0, experience: 0 },
            caga: { level: 0, experience: 0 },
            sila: { level: 0, experience: 0 },
          },
          buddhist_psychology: {
            anusaya: {
              kama_raga: 50,
              patigha: 50,
              mana: 50,
              vicikiccha: 50,
              ditthi: 50,
              bhava_raga: 50,
              avijja: 50, // Total too high
            },
          },
        } as Character;

        const progress = Kilesa_Eradication_Processor.calculateMaggaProgress(
          'sotapatti',
          character
        );

        expect(progress).toBe(50); // 2 out of 4 requirements met
      });
    });
  });

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  describe('getNextMaggaStage', () => {
    it('should return sotapatti when current is null', () => {
      const next = getNextMaggaStage(null);
      expect(next).toBe('sotapatti');
    });

    it('should return sakadagami after sotapatti', () => {
      const next = getNextMaggaStage('sotapatti');
      expect(next).toBe('sakadagami');
    });

    it('should return anagami after sakadagami', () => {
      const next = getNextMaggaStage('sakadagami');
      expect(next).toBe('anagami');
    });

    it('should return arahatta after anagami', () => {
      const next = getNextMaggaStage('anagami');
      expect(next).toBe('arahatta');
    });

    it('should return null after arahatta (already perfected)', () => {
      const next = getNextMaggaStage('arahatta');
      expect(next).toBeNull();
    });
  });

  describe('getMaggaDescription', () => {
    it('should return Thai description for sotapatti', () => {
      const desc = getMaggaDescription('sotapatti');
      expect(desc).toContain('โสดาบัน');
      expect(desc).toContain('ไม่ตกอบาย');
    });

    it('should return Thai description for sakadagami', () => {
      const desc = getMaggaDescription('sakadagami');
      expect(desc).toContain('สกทาคามี');
      expect(desc).toContain('กลับมาอีกครั้งเดียว');
    });

    it('should return Thai description for anagami', () => {
      const desc = getMaggaDescription('anagami');
      expect(desc).toContain('อนาคามี');
      expect(desc).toContain('สุทธาวาส');
    });

    it('should return Thai description for arahatta', () => {
      const desc = getMaggaDescription('arahatta');
      expect(desc).toContain('อรหัตต์');
      expect(desc).toContain('ปรินิพพาน');
    });
  });
});
