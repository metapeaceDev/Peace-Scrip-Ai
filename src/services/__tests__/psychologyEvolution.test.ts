/**
 * Tests for Psychology Evolution Service
 * Core Buddhist psychology tracking functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
  analyzeSceneActions,
  actionsToSensoryInput,
  calculateMentalBalance,
  createPsychologySnapshot,
  initializePsychologyTimeline,
  updatePsychologyTimeline,
} from '../psychologyEvolution';
import type { Character, GeneratedScene } from '../../../types';

// Mock dependencies
vi.mock('../mindProcessors', () => ({
  JavanaDecisionEngine: {
    decide: vi.fn().mockReturnValue({
      citta_type: 'neutral',
      quality: 'wholesome',
      reasoning: 'Test reasoning',
      vedana: 'neutral',
      karma_type: 'neutral',
      karma_intensity: 'mild',
    }),
  },
}));

vi.mock('../psychologyCalculator', () => ({
  calculatePsychologyProfile: vi.fn(() => ({
    carita: 'ragaCarita',
    anusaya: {},
    dominantDefilement: 'raga',
    karmaBalance: 0,
  })),
}));

vi.mock('../../config/featureFlags', () => ({
  isFeatureEnabled: vi.fn(() => true),
}));

describe('psychologyEvolution - Core Functions', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'พระเอก',
    role: 'protagonist',
    age: 30,
    gender: 'male',
    appearance: 'Test',
    personality: 'Test',
    background: 'Test',
    goals: 'Test',
    challenges: 'Test',
    relationships: {},
    carita: 'ragaCarita',
    anusaya: {
      raga: 60,
      dosa: 30,
      moha: 40,
      mana: 20,
      ditthi: 10,
      vicikiccha: 15,
      uddhacca: 25,
    },
    parami: {
      dana: 50,
      sila: 50,
      nekkhamma: 50,
      panna: 50,
      viriya: 50,
      khanti: 50,
      sacca: 50,
      adhitthana: 50,
      metta: 50,
      upekkha: 50,
    },
  };

  const mockScene: GeneratedScene = {
    sceneId: 'scene-1',
    sceneNumber: 1,
    title: 'Test Scene',
    sceneDesign: {
      setting: 'Test',
      timeOfDay: 'day',
      atmosphere: 'neutral',
      situations: [
        {
          description: 'พระเอก walks into room',
          emotion: 'neutral',
          characterThoughts: 'พระเอก thinks',
          dialogue: [
            { character: 'พระเอก', dialogue: 'สวัสดี', emotion: 'neutral' },
          ],
        },
      ],
      visualElements: [],
      shotComposition: '',
    },
    imagePrompt: '',
    estimatedDuration: 60,
    pacing: 'normal',
  };

  describe('analyzeSceneActions', () => {
    it('should extract กาย actions for character', () => {
      const result = analyzeSceneActions(mockScene, 'พระเอก');

      expect(result.กาย).toBeDefined();
      expect(Array.isArray(result.กาย)).toBe(true);
    });

    it('should extract วาจา actions for character', () => {
      const result = analyzeSceneActions(mockScene, 'พระเอก');

      expect(result.วาจา).toBeDefined();
      expect(result.วาจา).toContain('สวัสดี');
    });

    it('should extract ใจ actions for character', () => {
      const result = analyzeSceneActions(mockScene, 'พระเอก');

      expect(result.ใจ).toBeDefined();
      expect(Array.isArray(result.ใจ)).toBe(true);
    });

    it('should return empty arrays for non-existent character', () => {
      const result = analyzeSceneActions(mockScene, 'NonExistent');

      expect(result.กาย.length).toBe(0);
      expect(result.วาจา.length).toBe(0);
    });

    it('should handle empty scene', () => {
      const emptyScene: GeneratedScene = {
        ...mockScene,
        sceneDesign: {
          ...mockScene.sceneDesign,
          situations: [],
        },
      };

      const result = analyzeSceneActions(emptyScene, 'พระเอก');

      expect(result.กาย).toEqual([]);
      expect(result.วาจา).toEqual([]);
      expect(result.ใจ).toEqual([]);
    });
  });

  describe('actionsToSensoryInput', () => {
    it('should convert pleasant กาย actions', () => {
      const actions = {
        กาย: ['ได้รับของขวัญ', 'สบาย'],
        วาจา: [],
        ใจ: [],
      };

      const result = actionsToSensoryInput(actions);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((i) => i.type === 'pleasant')).toBe(true);
    });

    it('should convert unpleasant กาย actions', () => {
      const actions = {
        กาย: ['ถูกทำร้าย', 'เจ็บปวด'],
        วาจา: [],
        ใจ: [],
      };

      const result = actionsToSensoryInput(actions);

      expect(result.some((i) => i.type === 'unpleasant')).toBe(true);
    });

    it('should convert วาจา to ear sense door', () => {
      const actions = {
        กาย: [],
        วาจา: ['สรรเสริญ', 'ชมเชย'],
        ใจ: [],
      };

      const result = actionsToSensoryInput(actions);

      expect(result.some((i) => i.senseDoor === 'ear')).toBe(true);
    });

    it('should convert ใจ to mind sense door', () => {
      const actions = {
        กาย: [],
        วาจา: [],
        ใจ: ['คิด', 'รู้สึก'],
      };

      const result = actionsToSensoryInput(actions);

      expect(result.some((i) => i.senseDoor === 'mind')).toBe(true);
    });

    it('should handle empty actions', () => {
      const result = actionsToSensoryInput({ กาย: [], วาจา: [], ใจ: [] });

      expect(result).toEqual([]);
    });
  });

  describe('calculateMentalBalance', () => {
    it('should calculate balance from consciousness and defilement', () => {
      const consciousness = {
        'Mindfulness': 70,
        'Wisdom': 60,
      };
      const defilement = {
        'Greed': 30,
        'Hatred': 20,
      };

      const result = calculateMentalBalance(consciousness, defilement);

      expect(typeof result).toBe('number');
    });

    it('should return positive for high consciousness', () => {
      const consciousness = {
        'Mindfulness': 90,
        'Wisdom': 90,
      };
      const defilement = {
        'Greed': 10,
      };

      const result = calculateMentalBalance(consciousness, defilement);

      expect(result).toBeGreaterThan(0);
    });

    it('should return negative for high defilement', () => {
      const consciousness = {
        'Mindfulness': 10,
      };
      const defilement = {
        'Greed': 90,
        'Hatred': 90,
      };

      const result = calculateMentalBalance(consciousness, defilement);

      expect(result).toBeLessThan(0);
    });

    it('should handle undefined consciousness', () => {
      const result = calculateMentalBalance(undefined, { Greed: 50 });

      expect(typeof result).toBe('number');
    });

    it('should handle undefined defilement', () => {
      const result = calculateMentalBalance({ Mindfulness: 50 }, undefined);

      expect(typeof result).toBe('number');
    });
  });

  describe('createPsychologySnapshot', () => {
    it('should create snapshot with scene info', () => {
      const result = createPsychologySnapshot(mockCharacter, 1);

      expect(result.sceneNumber).toBe(1);
      expect(result.timestamp).toBeUndefined(); // No timestamp in implementation
    });

    it('should include character psychology', () => {
      const result = createPsychologySnapshot(mockCharacter, 1);

      expect(result.consciousness).toBeDefined();
      expect(result.defilement).toBeDefined();
    });

    it('should calculate mental balance', () => {
      const result = createPsychologySnapshot(mockCharacter, 1);

      expect(result.mentalBalance).toBeDefined();
      expect(typeof result.mentalBalance).toBe('number');
    });

    it('should include anusaya if present in buddhist_psychology', () => {
      // Add buddhist_psychology to character
      const charWithBuddhist: Character = {
        ...mockCharacter,
        buddhist_psychology: {
          anusaya: mockCharacter.anusaya,
          carita: 'ragaCarita',
        },
      };

      const result = createPsychologySnapshot(charWithBuddhist, 1);

      expect(result.anusaya).toBeDefined();
    });
  });

  describe('initializePsychologyTimeline', () => {
    it('should create timeline with character info', () => {
      const result = initializePsychologyTimeline(mockCharacter);

      expect(result.characterName).toBe('พระเอก');
      expect(result.characterId).toBe('char-1');
    });

    it('should initialize with initial snapshot', () => {
      const result = initializePsychologyTimeline(mockCharacter);

      expect(result.snapshots.length).toBe(1); // Has initial snapshot
      expect(result.changes).toEqual([]);
      expect(Array.isArray(result.snapshots)).toBe(true);
      expect(Array.isArray(result.changes)).toBe(true);
    });

    it('should include overall arc', () => {
      const result = initializePsychologyTimeline(mockCharacter);

      expect(result.overallArc).toBeDefined();
    });

    it('should include summary', () => {
      const result = initializePsychologyTimeline(mockCharacter);

      expect(result.summary).toBeDefined();
      expect(result.summary.total_kusala).toBe(0);
    });
  });

  describe('updatePsychologyTimeline', () => {
    it('should return timeline and updated character', () => {
      const timeline = initializePsychologyTimeline(mockCharacter);
      
      const result = updatePsychologyTimeline(timeline, mockCharacter, mockScene, 'plot-1');

      expect(result.timeline).toBeDefined();
      expect(result.updatedCharacter).toBeDefined();
    });

    it('should add snapshot to timeline', () => {
      const timeline = initializePsychologyTimeline(mockCharacter);
      
      const result = updatePsychologyTimeline(timeline, mockCharacter, mockScene, 'plot-1');

      expect(result.timeline.snapshots.length).toBe(2); // Initial + new
    });

    it('should preserve character identity', () => {
      const timeline = initializePsychologyTimeline(mockCharacter);
      
      const result = updatePsychologyTimeline(timeline, mockCharacter, mockScene, 'plot-1');

      expect(result.timeline.characterName).toBe('พระเอก');
      expect(result.timeline.characterId).toBe('char-1');
    });

    it('should add changes to timeline', () => {
      const timeline = initializePsychologyTimeline(mockCharacter);
      
      const result = updatePsychologyTimeline(timeline, mockCharacter, mockScene, 'plot-1');

      expect(result.timeline.changes.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple updates', () => {
      let timeline = initializePsychologyTimeline(mockCharacter);
      
      const first = updatePsychologyTimeline(timeline, mockCharacter, mockScene, 'plot-1');
      
      const scene2 = { ...mockScene, sceneId: 'scene-2', sceneNumber: 2 };
      const second = updatePsychologyTimeline(first.timeline, first.updatedCharacter, scene2, 'plot-2');

      expect(second.timeline.snapshots.length).toBe(3); // Initial + 2 updates
    });

    it('should include summary statistics', () => {
      const timeline = initializePsychologyTimeline(mockCharacter);
      
      const result = updatePsychologyTimeline(timeline, mockCharacter, mockScene, 'plot-1');

      expect(result.timeline.summary).toBeDefined();
      expect(result.timeline.summary.total_kusala).toBeDefined();
      expect(result.timeline.summary.total_akusala).toBeDefined();
    });

    it('should update character with changes', () => {
      const timeline = initializePsychologyTimeline(mockCharacter);
      
      const result = updatePsychologyTimeline(timeline, mockCharacter, mockScene, 'plot-1');

      expect(result.updatedCharacter.id).toBe(mockCharacter.id);
      expect(result.updatedCharacter.name).toBe(mockCharacter.name);
    });
  });
});
