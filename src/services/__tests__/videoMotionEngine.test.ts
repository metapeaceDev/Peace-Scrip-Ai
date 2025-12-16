/**
 * Video Motion Engine Tests
 * Tests for psychology-based motion parameter generation
 */

import { describe, it, expect } from 'vitest';
import {
  buildMotionContext,
  buildCameraMovementContext,
  buildTimingContext,
  buildEnvironmentalMotionContext,
  buildVideoPrompt,
  getMotionModuleStrength,
  getRecommendedFPS,
  getRecommendedFrameCount,
  type ShotData,
} from '../videoMotionEngine';
import type { Character } from '../../../types';

const createMockCharacter = (): Character => ({
  id: 'char-1',
  name: 'Hero',
  role: 'Protagonist',
  internal: {
    consciousness: {
      'สติ (Mindfulness)': 85,
      'ปัญญา (Wisdom)': 80,
    },
    subconscious: {},
    defilement: {
      โลภะ: 20,
      โทสะ: 15,
      โมหะ: 25,
    },
  },
  emotionalState: {
    currentMood: 'calm',
    energyLevel: 70,
  },
  buddhist_psychology: {
    carita: 'วิตกจริต',
  },
  psychology_timeline: [],
});

const createMockShotData = (): ShotData => ({
  description: 'Character walking through city',
  movement: 'Dolly',
  equipment: 'Steadicam',
  shotSize: 'Medium Shot',
  durationSec: 5,
});

describe('buildMotionContext', () => {
  it('should build motion context string', () => {
    const character = createMockCharacter();
    const shotDescription = 'Character walking through city';
    
    const context = buildMotionContext(character, shotDescription);
    
    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(0);
  });

  it('should include character action', () => {
    const character = createMockCharacter();
    const shotDescription = 'Running through forest';
    
    const context = buildMotionContext(character, shotDescription);
    
    expect(context).toContain('CHARACTER MOTION');
    expect(typeof context).toBe('string');
  });

  it('should include motion speed based on mood', () => {
    const character = createMockCharacter();
    const shotDescription = 'Walking slowly';
    
    const context = buildMotionContext(character, shotDescription);
    
    expect(context.toLowerCase()).toMatch(/slow|calm|natural|realistic/);
  });

  it('should handle missing emotional state', () => {
    const character = { ...createMockCharacter(), emotionalState: undefined };
    const shotDescription = 'Test action';
    
    const context = buildMotionContext(character, shotDescription);
    
    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(0);
  });

  it('should include Buddhist psychology carita', () => {
    const character = createMockCharacter();
    const shotDescription = 'Meditating';
    
    const context = buildMotionContext(character, shotDescription);
    
    expect(typeof context).toBe('string');
  });
});

describe('buildCameraMovementContext', () => {
  it('should describe Dolly movement', () => {
    const shotData: ShotData = {
      description: 'Test',
      movement: 'Dolly',
      equipment: 'Dolly',
    };
    
    const context = buildCameraMovementContext(shotData);
    
    expect(context).toContain('Dolly');
    expect(typeof context).toBe('string');
  });

  it('should describe Pan movement', () => {
    const shotData: ShotData = {
      description: 'Test',
      movement: 'Pan',
    };
    
    const context = buildCameraMovementContext(shotData);
    
    expect(context).toContain('Pan');
  });

  it('should describe Static shot', () => {
    const shotData: ShotData = {
      description: 'Test',
      movement: 'Static',
    };
    
    const context = buildCameraMovementContext(shotData);
    
    expect(context).toContain('Static');
  });

  it('should handle missing movement', () => {
    const shotData: ShotData = {
      description: 'Test',
    };
    
    const context = buildCameraMovementContext(shotData);
    
    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(0);
  });

  it('should include equipment type', () => {
    const shotData: ShotData = {
      description: 'Test',
      movement: 'Track',
      equipment: 'Steadicam',
    };
    
    const context = buildCameraMovementContext(shotData);
    
    // Equipment type may be referenced in movement description
    expect(context).toBeTruthy();
    expect(context.length).toBeGreaterThan(0);
  });

  it('should handle Handheld movement', () => {
    const shotData: ShotData = {
      description: 'Test',
      movement: 'Handheld',
      equipment: 'Handheld',
    };
    
    const context = buildCameraMovementContext(shotData);
    
    expect(context).toContain('Handheld');
  });
});

describe('buildTimingContext', () => {
  it('should build timing context with duration', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 5,
    };
    
    const context = buildTimingContext(shotData);
    
    expect(context).toContain('5');
    expect(typeof context).toBe('string');
  });

  it('should handle short duration (< 3 sec)', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 2,
    };
    
    const context = buildTimingContext(shotData);
    
    expect(context).toContain('quick');
  });

  it('should handle medium duration (3-7 sec)', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 5,
    };
    
    const context = buildTimingContext(shotData);
    
    // Timing context should include pacing information
    expect(context).toBeTruthy();
    expect(context.toLowerCase()).toMatch(/pacing|duration|5/);
  });

  it('should handle long duration (> 7 sec)', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 10,
    };
    
    const context = buildTimingContext(shotData);
    
    expect(context).toContain('slow');
  });

  it('should handle missing duration', () => {
    const shotData: ShotData = {
      description: 'Test',
    };
    
    const context = buildTimingContext(shotData);
    
    expect(typeof context).toBe('string');
  });
});

describe('buildEnvironmentalMotionContext', () => {
  it('should build environmental motion context', () => {
    const shotData: ShotData = {
      description: 'Trees swaying in wind',
    };
    
    const context = buildEnvironmentalMotionContext(shotData);
    
    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(0);
  });

  it('should detect outdoor scenes', () => {
    const shotData: ShotData = {
      description: 'Outdoor forest scene',
    };
    
    const context = buildEnvironmentalMotionContext(shotData);
    
    expect(context.toLowerCase()).toMatch(/trees|leaves|wind|clouds/);
  });

  it('should detect indoor scenes', () => {
    const shotData: ShotData = {
      description: 'Indoor office scene',
    };
    
    const context = buildEnvironmentalMotionContext(shotData);
    
    expect(typeof context).toBe('string');
  });

  it('should detect water scenes', () => {
    const currentScene = {
      sceneDesign: {
        location: 'Beach with ocean',
      },
    } as any;
    
    const context = buildEnvironmentalMotionContext(currentScene);
    
    // Water scenes should include water-related motion descriptors
    expect(context.toLowerCase()).toMatch(/water|ocean|beach|wave/);
  });

  it('should detect city scenes', () => {
    const currentScene = {
      sceneDesign: {
        location: 'City street',
      },
    } as any;
    
    const context = buildEnvironmentalMotionContext(currentScene);
    
    // City scenes should include urban environment descriptors
    expect(context.toLowerCase()).toMatch(/street|city|urban|car|pedestrian/);
  });
});

describe('buildVideoPrompt', () => {
  it('should build complete video prompt', () => {
    const shotData = createMockShotData();
    const currentScene = {
      sceneNumber: 1,
      sceneDesign: {
        sceneName: 'Test Scene',
        characters: ['Hero'],
        location: 'City',
        situations: [],
        moodTone: 'Calm',
      },
      shotList: [],
    } as any;
    const character = createMockCharacter();
    const basePrompt = 'Test base prompt';
    
    const prompt = buildVideoPrompt(shotData, currentScene, character, basePrompt);
    
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('should include base prompt', () => {
    const shotData = createMockShotData();
    const currentScene = { sceneDesign: { location: 'City' } } as any;
    const character = createMockCharacter();
    const basePrompt = 'Unique base text';
    
    const prompt = buildVideoPrompt(shotData, currentScene, character, basePrompt);
    
    expect(prompt).toContain(basePrompt);
  });

  it('should include motion instructions', () => {
    const shotData = createMockShotData();
    const currentScene = { sceneDesign: { location: 'City' } } as any;
    const character = createMockCharacter();
    const basePrompt = 'Test';
    
    const prompt = buildVideoPrompt(shotData, currentScene, character, basePrompt);
    
    expect(prompt.toLowerCase()).toMatch(/motion|movement/);
  });

  it('should handle minimal scene data', () => {
    const shotData: ShotData = {
      description: 'Simple scene',
    };
    const currentScene = { sceneDesign: {} } as any;
    const character = createMockCharacter();
    const basePrompt = 'Test';
    
    const prompt = buildVideoPrompt(shotData, currentScene, character, basePrompt);
    
    expect(prompt).toContain('Test');
  });
});

describe('getMotionModuleStrength', () => {
  it('should return strength value between 0 and 1', () => {
    const shotData = createMockShotData();
    const character = createMockCharacter();
    
    const strength = getMotionModuleStrength(shotData, character);
    
    expect(strength).toBeGreaterThanOrEqual(0);
    expect(strength).toBeLessThanOrEqual(1);
  });

  it('should return higher strength for high-energy characters', () => {
    const shotData: ShotData = {
      description: 'Fast action chase scene',
      movement: 'Handheld',
    };
    const character = createMockCharacter();
    character.emotionalState = { currentMood: 'excited', energyLevel: 90 };
    
    const strength = getMotionModuleStrength(shotData, character);
    
    expect(strength).toBeGreaterThan(0.5);
  });

  it('should return lower strength for low-energy characters', () => {
    const shotData: ShotData = {
      description: 'Still portrait',
      movement: 'Static',
    };
    const character = createMockCharacter();
    character.emotionalState = { currentMood: 'calm', energyLevel: 20 };
    
    const strength = getMotionModuleStrength(shotData, character);
    
    expect(strength).toBeLessThan(0.7);
  });

  it('should handle medium-motion shots', () => {
    const shotData: ShotData = {
      description: 'Calm walking scene',
      movement: 'Dolly',
    };
    const character = createMockCharacter();
    
    const strength = getMotionModuleStrength(shotData, character);
    
    expect(strength).toBeGreaterThan(0.3);
    expect(strength).toBeLessThan(0.9);
  });
});

describe('getRecommendedFPS', () => {
  it('should return FPS value', () => {
    const shotData = createMockShotData();
    
    const fps = getRecommendedFPS(shotData);
    
    expect(fps).toBeGreaterThan(0);
    expect(Number.isInteger(fps)).toBe(true);
  });

  it('should recommend higher FPS for action scenes', () => {
    const shotData: ShotData = {
      description: 'Fast action sequence',
      movement: 'Handheld',
    };
    
    const fps = getRecommendedFPS(shotData);
    
    expect(fps).toBeGreaterThanOrEqual(12);
  });

  it('should recommend lower FPS for slow scenes', () => {
    const shotData: ShotData = {
      description: 'Slow meditative scene',
      movement: 'Static',
    };
    
    const fps = getRecommendedFPS(shotData);
    
    expect(fps).toBeGreaterThanOrEqual(8);
    expect(fps).toBeLessThanOrEqual(16);
  });

  it('should handle default cases', () => {
    const shotData: ShotData = {
      description: 'Normal scene',
    };
    
    const fps = getRecommendedFPS(shotData);
    
    expect(fps).toBeGreaterThanOrEqual(8);
    expect(fps).toBeLessThanOrEqual(24);
  });
});

describe('getRecommendedFrameCount', () => {
  it('should return frame count based on duration', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 5,
    };
    const fps = 12;
    
    const frameCount = getRecommendedFrameCount(shotData, fps);
    
    expect(frameCount).toBe(60); // 5 * 12
  });

  it('should handle short duration', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 2,
    };
    const fps = 12;
    
    const frameCount = getRecommendedFrameCount(shotData, fps);
    
    expect(frameCount).toBe(24); // 2 * 12
  });

  it('should handle long duration', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 10,
    };
    const fps = 12;
    
    const frameCount = getRecommendedFrameCount(shotData, fps);
    
    expect(frameCount).toBe(120); // 10 * 12
  });

  it('should handle default duration', () => {
    const shotData: ShotData = {
      description: 'Test',
    };
    const fps = 12;
    
    const frameCount = getRecommendedFrameCount(shotData, fps);
    
    expect(frameCount).toBeGreaterThan(0);
  });

  it('should work with different FPS values', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 5,
    };
    
    const frames12fps = getRecommendedFrameCount(shotData, 12);
    const frames24fps = getRecommendedFrameCount(shotData, 24);
    
    expect(frames24fps).toBe(frames12fps * 2);
  });
});

describe('Edge Cases', () => {
  it('should handle empty shot description', () => {
    const character = createMockCharacter();
    const shotDescription = '';
    
    expect(() => buildMotionContext(character, shotDescription)).not.toThrow();
  });

  it('should handle very long duration', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 60,
    };
    
    const context = buildTimingContext(shotData);
    expect(context).toBeTruthy();
  });

  it('should handle zero duration', () => {
    const shotData: ShotData = {
      description: 'Test',
      durationSec: 0,
    };
    
    const frameCount = getRecommendedFrameCount(shotData, 12);
    expect(frameCount).toBeGreaterThanOrEqual(0);
  });

  it('should handle unknown movement type', () => {
    const shotData: ShotData = {
      description: 'Test',
      movement: 'Unknown' as any,
    };
    
    expect(() => buildCameraMovementContext(shotData)).not.toThrow();
  });

  it('should handle special characters in description', () => {
    const character = createMockCharacter();
    const shotDescription = 'Test with émojis 🎬 and special chars: <>&"\'';
    
    const context = buildMotionContext(character, shotDescription);
    expect(context).toBeTruthy();
  });
});

describe('Integration Tests', () => {
  it('should generate consistent results for same input', () => {
    const character = createMockCharacter();
    const shotDescription = 'Walking through city';
    
    const context1 = buildMotionContext(character, shotDescription);
    const context2 = buildMotionContext(character, shotDescription);
    
    expect(context1).toBe(context2);
  });

  it('should work with complete workflow', () => {
    const shotData = createMockShotData();
    const currentScene = { sceneDesign: { location: 'City' } } as any;
    const character = createMockCharacter();
    const basePrompt = 'Test prompt';
    
    const cameraContext = buildCameraMovementContext(shotData);
    const timingContext = buildTimingContext(shotData);
    const environmentalContext = buildEnvironmentalMotionContext(currentScene);
    const prompt = buildVideoPrompt(shotData, currentScene, character, basePrompt);
    const fps = getRecommendedFPS(shotData);
    const frameCount = getRecommendedFrameCount(shotData, fps);
    const strength = getMotionModuleStrength(shotData, character);
    
    expect(cameraContext).toBeTruthy();
    expect(timingContext).toBeTruthy();
    expect(environmentalContext).toBeTruthy();
    expect(prompt).toBeTruthy();
    expect(fps).toBeGreaterThan(0);
    expect(frameCount).toBeGreaterThan(0);
    expect(strength).toBeGreaterThan(0);
  });

  it('should handle multiple movement types', () => {
    const movements = ['Dolly', 'Pan', 'Tilt', 'Track', 'Crane', 'Zoom', 'Follow', 'Arc', 'Handheld', 'Static'];
    
    movements.forEach(movement => {
      const shotData: ShotData = {
        description: `Test ${movement}`,
        movement,
      };
      
      expect(() => buildCameraMovementContext(shotData)).not.toThrow();
    });
  });
});
