/**
 * Tests for Psychology Integration Service
 * Integration between psychologyEvolution and scene generation workflow
 */

import { describe, it, expect, vi } from 'vitest';
import {
  initializeProjectPsychology,
  updatePsychologyAfterScene,
  validateProjectPsychology,
  getPsychologySummary,
} from '../psychologyIntegration';
import type { ScriptData, GeneratedScene, PlotPoint, Character } from '../../../types';

// Mock psychologyEvolution module
vi.mock('../psychologyEvolution', () => ({
  initializePsychologyTimeline: vi.fn(character => ({
    characterId: character.id,
    characterName: character.name,
    snapshots: [],
    changes: [],
    overallArc: {
      direction: 'neutral',
      totalChange: 0,
      interpretation: 'ยังไม่มีการเปลี่ยนแปลง',
    },
  })),
  updatePsychologyTimeline: vi.fn((timeline, character, scene, plotTitle) => ({
    timeline: {
      ...timeline,
      changes: [
        ...timeline.changes,
        {
          sceneNumber: scene.sceneNumber,
          reasoning: 'Test change reasoning',
          changeVector: { consciousness: { 'ปัญญา (Wisdom)': 5 } },
        },
      ],
      overallArc: {
        direction: 'positive',
        totalChange: 5,
        interpretation: 'มีการพัฒนาในทางบวก',
      },
    },
    updatedCharacter: {
      ...character,
      internal: {
        ...character.internal,
        consciousness: {
          ...character.internal?.consciousness,
          'ปัญญา (Wisdom)': (character.internal?.consciousness?.['ปัญญา (Wisdom)'] || 0) + 5,
        },
      },
    },
  })),
  validateCharacterArc: vi.fn(timeline => ({
    valid: timeline.changes.length > 0,
    warnings: timeline.changes.length === 0 ? ['No changes detected'] : [],
    recommendations: ['Continue development'],
  })),
}));

describe('psychologyIntegration', () => {
  const mockCharacter1: Character = {
    id: 'char-1',
    name: 'พระเอก',
    internal: {
      consciousness: {
        'ปัญญา (Wisdom)': 50,
        'เมตตา (Compassion)': 60,
      },
      defilement: {
        'โลภะ (Greed)': 30,
      },
    },
  } as Character;

  const mockCharacter2: Character = {
    id: 'char-2',
    name: 'นางเอก',
    internal: {
      consciousness: {
        'ศรัทธา (Faith)': 70,
      },
      defilement: {
        'โทสะ (Anger)': 20,
      },
    },
  } as Character;

  const mockScriptData: ScriptData = {
    projectId: 'test-project',
    characters: [mockCharacter1, mockCharacter2],
    plotPoints: [],
    scenes: [],
  } as ScriptData;

  const mockScene: GeneratedScene = {
    sceneNumber: 1,
    sceneDesign: {
      characters: ['พระเอก', 'นางเอก'],
      situations: [],
      timing: 'morning',
      location: 'temple',
    },
  } as GeneratedScene;

  const mockPlotPoint: PlotPoint = {
    id: 'plot-1',
    title: 'จุดเปลี่ยนสำคัญ',
    description: 'Character realizes truth',
  } as PlotPoint;

  describe('initializeProjectPsychology', () => {
    it('should initialize psychology timelines for all characters', () => {
      const result = initializeProjectPsychology(mockScriptData);

      expect(result.psychologyTimelines).toBeDefined();
      expect(result.psychologyTimelines!['char-1']).toBeDefined();
      expect(result.psychologyTimelines!['char-2']).toBeDefined();
    });

    it('should create timeline with character ID and name', () => {
      const result = initializeProjectPsychology(mockScriptData);

      expect(result.psychologyTimelines!['char-1'].characterId).toBe('char-1');
      expect(result.psychologyTimelines!['char-1'].characterName).toBe('พระเอก');
    });

    it('should initialize empty snapshots and changes arrays', () => {
      const result = initializeProjectPsychology(mockScriptData);

      expect(result.psychologyTimelines!['char-1'].snapshots).toEqual([]);
      expect(result.psychologyTimelines!['char-1'].changes).toEqual([]);
    });

    it('should set initial neutral arc', () => {
      const result = initializeProjectPsychology(mockScriptData);

      expect(result.psychologyTimelines!['char-1'].overallArc.direction).toBe('neutral');
      expect(result.psychologyTimelines!['char-1'].overallArc.totalChange).toBe(0);
    });

    it('should preserve other scriptData properties', () => {
      const result = initializeProjectPsychology(mockScriptData);

      expect(result.projectId).toBe('test-project');
      expect(result.characters).toEqual(mockScriptData.characters);
    });
  });

  describe('updatePsychologyAfterScene', () => {
    it('should initialize timelines if not exists', () => {
      const scriptWithoutTimelines = { ...mockScriptData };
      delete (scriptWithoutTimelines as any).psychologyTimelines;

      const result = updatePsychologyAfterScene(scriptWithoutTimelines, mockScene, mockPlotPoint);

      expect(result.psychologyTimelines).toBeDefined();
    });

    it('should update psychology for characters in scene', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = updatePsychologyAfterScene(scriptWithTimelines, mockScene, mockPlotPoint);

      const char1Timeline = result.psychologyTimelines!['char-1'];
      expect(char1Timeline.changes.length).toBeGreaterThan(0);
    });

    it('should update character consciousness values', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = updatePsychologyAfterScene(scriptWithTimelines, mockScene, mockPlotPoint);

      const updatedChar = result.characters.find(c => c.id === 'char-1');
      expect(updatedChar?.internal?.consciousness?.['ปัญญา (Wisdom)']).toBeGreaterThan(50);
    });

    it('should add change reasoning to timeline', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = updatePsychologyAfterScene(scriptWithTimelines, mockScene, mockPlotPoint);

      const char1Timeline = result.psychologyTimelines!['char-1'];
      const lastChange = char1Timeline.changes[char1Timeline.changes.length - 1];
      expect(lastChange.reasoning).toBe('Test change reasoning');
    });

    it('should update overall arc direction', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = updatePsychologyAfterScene(scriptWithTimelines, mockScene, mockPlotPoint);

      const char1Timeline = result.psychologyTimelines!['char-1'];
      expect(char1Timeline.overallArc.direction).toBe('positive');
      expect(char1Timeline.overallArc.totalChange).toBe(5);
    });

    it('should skip characters not in scene', () => {
      const sceneWithOneChar = {
        ...mockScene,
        sceneDesign: {
          ...mockScene.sceneDesign,
          characters: ['พระเอก'], // Only one character
        },
      };

      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const initialChar2Timeline = { ...scriptWithTimelines.psychologyTimelines!['char-2'] };

      const result = updatePsychologyAfterScene(
        scriptWithTimelines,
        sceneWithOneChar,
        mockPlotPoint
      );

      // char-2 timeline should remain unchanged
      expect(result.psychologyTimelines!['char-2'].changes.length).toBe(
        initialChar2Timeline.changes.length
      );
    });

    it('should preserve characters not in scene', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = updatePsychologyAfterScene(scriptWithTimelines, mockScene, mockPlotPoint);

      expect(result.characters).toHaveLength(2);
      expect(result.characters.find(c => c.id === 'char-2')).toBeDefined();
    });
  });

  describe('validateProjectPsychology', () => {
    it('should return invalid when no timelines exist', () => {
      const scriptWithoutTimelines = { ...mockScriptData };
      delete (scriptWithoutTimelines as any).psychologyTimelines;

      const result = validateProjectPsychology(scriptWithoutTimelines);

      expect(result.valid).toBe(false);
      expect(result.overallSummary).toContain('ยังไม่มีข้อมูล');
    });

    it('should validate all character timelines', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = validateProjectPsychology(scriptWithTimelines);

      expect(result.characterResults['char-1']).toBeDefined();
      expect(result.characterResults['char-2']).toBeDefined();
    });

    it('should include character names in results', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = validateProjectPsychology(scriptWithTimelines);

      expect(result.characterResults['char-1'].characterName).toBe('พระเอก');
      expect(result.characterResults['char-2'].characterName).toBe('นางเอก');
    });

    it('should mark as invalid when warnings exist', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = validateProjectPsychology(scriptWithTimelines);

      // Initial timelines have no changes, so warnings should exist
      expect(result.characterResults['char-1'].warnings.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
    });

    it('should provide overall summary', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = validateProjectPsychology(scriptWithTimelines);

      expect(result.overallSummary).toBeDefined();
      expect(typeof result.overallSummary).toBe('string');
    });

    it('should count total warnings', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = validateProjectPsychology(scriptWithTimelines);

      const totalWarnings = Object.values(result.characterResults).reduce(
        (sum, r) => sum + r.warnings.length,
        0
      );
      expect(totalWarnings).toBeGreaterThan(0);
    });

    it('should mark as valid when no warnings', () => {
      // Create script with updated timelines (has changes)
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const updatedScript = updatePsychologyAfterScene(
        scriptWithTimelines,
        mockScene,
        mockPlotPoint
      );

      const result = validateProjectPsychology(updatedScript);

      expect(result.characterResults['char-1'].valid).toBe(true);
      expect(result.characterResults['char-1'].warnings.length).toBe(0);
    });
  });

  describe('getPsychologySummary', () => {
    it('should return message when no timelines exist', () => {
      const scriptWithoutTimelines = { ...mockScriptData };
      delete (scriptWithoutTimelines as any).psychologyTimelines;

      const result = getPsychologySummary(scriptWithoutTimelines);

      expect(result).toBe('ยังไม่มีข้อมูลการพัฒนาตัวละคร');
    });

    it('should include character names in summary', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = getPsychologySummary(scriptWithTimelines);

      expect(result).toContain('พระเอก');
      expect(result).toContain('นางเอก');
    });

    it('should include arc direction for each character', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = getPsychologySummary(scriptWithTimelines);

      expect(result).toContain('neutral');
    });

    it('should show total change with sign', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const updatedScript = updatePsychologyAfterScene(
        scriptWithTimelines,
        mockScene,
        mockPlotPoint
      );
      const result = getPsychologySummary(updatedScript);

      expect(result).toMatch(/[+-]\d+\.\d+/); // +5.0 or -2.3 format
    });

    it('should include interpretation for each character', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = getPsychologySummary(scriptWithTimelines);

      expect(result).toContain('ยังไม่มีการเปลี่ยนแปลง');
    });

    it('should format multiple characters with separators', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const result = getPsychologySummary(scriptWithTimelines);

      expect(result).toContain('\n\n'); // Characters separated by double newline
    });

    it('should handle characters with positive change', () => {
      const scriptWithTimelines = initializeProjectPsychology(mockScriptData);
      const updatedScript = updatePsychologyAfterScene(
        scriptWithTimelines,
        mockScene,
        mockPlotPoint
      );
      const result = getPsychologySummary(updatedScript);

      expect(result).toContain('+5.0'); // Positive change with + sign
      expect(result).toContain('positive');
    });
  });

  describe('Integration', () => {
    it('should handle full workflow: initialize → update → validate → summary', () => {
      // Step 1: Initialize
      let script = initializeProjectPsychology(mockScriptData);
      expect(script.psychologyTimelines).toBeDefined();

      // Step 2: Update after scene
      script = updatePsychologyAfterScene(script, mockScene, mockPlotPoint);
      expect(script.psychologyTimelines!['char-1'].changes.length).toBeGreaterThan(0);

      // Step 3: Validate
      const validation = validateProjectPsychology(script);
      expect(validation.characterResults['char-1'].valid).toBe(true);

      // Step 4: Get summary
      const summary = getPsychologySummary(script);
      expect(summary).toContain('พระเอก');
      expect(summary).toContain('positive');
    });

    it('should maintain timeline consistency across updates', () => {
      let script = initializeProjectPsychology(mockScriptData);

      // Update with multiple scenes
      script = updatePsychologyAfterScene(script, mockScene, mockPlotPoint);
      const scene2 = { ...mockScene, sceneNumber: 2 };
      script = updatePsychologyAfterScene(script, scene2, mockPlotPoint);

      // Timeline should have accumulated changes
      expect(script.psychologyTimelines!['char-1'].changes.length).toBe(2);
    });
  });
});
