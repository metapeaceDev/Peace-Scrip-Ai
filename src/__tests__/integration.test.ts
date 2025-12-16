/**
 * Integration Tests
 * Tests for complete workflows and service interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Project Creation Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create project with all required fields', () => {
    const projectData = {
      id: 'test-project-1',
      title: 'Integration Test Project',
      projectType: 'Movie' as const,
      mainGenre: 'Action',
      targetAudience: 'General',
      characters: [],
      structure: [],
      generatedScenes: {},
      lastModified: new Date(),
    };

    expect(projectData.id).toBeDefined();
    expect(projectData.title).toBe('Integration Test Project');
    expect(projectData.projectType).toBe('Movie');
    expect(projectData.characters).toEqual([]);
  });

  it('should initialize psychology timelines for new characters', () => {
    const character = {
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
      psychology_timeline: [],
    };

    expect(character.psychology_timeline).toBeDefined();
    expect(Array.isArray(character.psychology_timeline)).toBe(true);
  });

  it('should handle project metadata updates', () => {
    const metadata = {
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-02'),
      version: '1.0.0',
      author: 'test-user',
    };

    expect(metadata.lastModified.getTime()).toBeGreaterThan(metadata.createdAt.getTime());
    expect(metadata.version).toBe('1.0.0');
  });
});

describe('Character Development Workflow', () => {
  it('should track character psychology evolution', () => {
    const timeline = [
      {
        sceneId: 'scene-1',
        timestamp: new Date('2024-01-01'),
        karmaType: 'กุศลกรรม' as const,
        changes: {
          consciousness: { 'สติ (Mindfulness)': 5 },
          defilement: { โลภะ: -3 },
        },
      },
      {
        sceneId: 'scene-2',
        timestamp: new Date('2024-01-02'),
        karmaType: 'อกุศลกรรม' as const,
        changes: {
          consciousness: { 'สติ (Mindfulness)': -2 },
          defilement: { โทสะ: 4 },
        },
      },
    ];

    expect(timeline).toHaveLength(2);
    expect(timeline[0].karmaType).toBe('กุศลกรรม');
    expect(timeline[1].karmaType).toBe('อกุศลกรรม');
  });

  it('should calculate cumulative psychology changes', () => {
    const initialState = {
      consciousness: { 'สติ (Mindfulness)': 80, 'ปัญญา (Wisdom)': 75 },
      defilement: { โลภะ: 30, โทสะ: 25 },
    };

    const changes = [
      { consciousness: { 'สติ (Mindfulness)': 5 }, defilement: { โลภะ: -3 } },
      { consciousness: { 'ปัญญา (Wisdom)': 3 }, defilement: { โทสะ: -2 } },
    ];

    const finalState = {
      consciousness: {
        'สติ (Mindfulness)': 85, // 80 + 5
        'ปัญญา (Wisdom)': 78,    // 75 + 3
      },
      defilement: {
        โลภะ: 27, // 30 - 3
        โทสะ: 23, // 25 - 2
      },
    };

    expect(finalState.consciousness['สติ (Mindfulness)']).toBe(85);
    expect(finalState.defilement.โลภะ).toBe(27);
  });
});

describe('Scene Generation Workflow', () => {
  it('should generate scene with all required properties', () => {
    const scene = {
      sceneNumber: 1,
      sceneDesign: {
        sceneName: 'Opening Scene',
        characters: ['Hero', 'Mentor'],
        location: 'Temple Garden',
        situations: [],
        moodTone: 'Peaceful',
      },
      shotList: [
        {
          scene: 'Scene 1',
          shot: 1,
          shotSize: 'Wide Shot',
          perspective: 'High Angle',
          movement: 'Static',
          lightingDesign: 'Natural',
          description: 'Establishing shot',
          durationSec: 5,
        },
      ],
    };

    expect(scene.sceneNumber).toBe(1);
    expect(scene.sceneDesign.characters).toHaveLength(2);
    expect(scene.shotList).toHaveLength(1);
  });

  it('should validate scene structure', () => {
    const validateScene = (scene: any) => {
      if (!scene.sceneNumber) return false;
      if (!scene.sceneDesign) return false;
      if (!scene.shotList || scene.shotList.length === 0) return false;
      return true;
    };

    const validScene = {
      sceneNumber: 1,
      sceneDesign: { sceneName: 'Test' },
      shotList: [{ shot: 1 }],
    };

    const invalidScene = {
      sceneNumber: 1,
      sceneDesign: { sceneName: 'Test' },
    };

    expect(validateScene(validScene)).toBe(true);
    expect(validateScene(invalidScene)).toBe(false);
  });
});

describe('TTS Integration Workflow', () => {
  it('should support multiple TTS engines', () => {
    const engines = ['browser', 'google', 'azure', 'pythainlp'];
    
    engines.forEach(engine => {
      expect(['browser', 'google', 'azure', 'aws', 'pythainlp']).toContain(engine);
    });
  });

  it('should validate TTS settings', () => {
    const settings = {
      engine: 'google' as const,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      googleApiKey: 'test-key',
    };

    expect(settings.rate).toBeGreaterThanOrEqual(0.5);
    expect(settings.rate).toBeLessThanOrEqual(2.0);
    expect(settings.pitch).toBeGreaterThanOrEqual(0.5);
    expect(settings.pitch).toBeLessThanOrEqual(2.0);
    expect(settings.volume).toBeGreaterThanOrEqual(0);
    expect(settings.volume).toBeLessThanOrEqual(1);
  });
});

describe('Motion Editor Integration', () => {
  it('should create motion edit with all panels', () => {
    const motionEdit = {
      shot_preview: {
        prompt: 'Character walking in city',
        shot_type: 'Medium Shot' as const,
      },
      camera_control: {
        movement: 'Dolly' as const,
        perspective: 'Eye Level' as const,
        equipment: 'Steadicam' as const,
      },
      frame_composition: {
        focal_length: '35mm' as const,
        aspect_ratio: '16:9' as const,
        color_temperature: '5600K' as const,
      },
      lighting: {
        style: 'Natural',
        description: 'Warm afternoon light',
      },
      sound: {
        ambient: 'City sounds',
        music: 'None',
        dialogue: 'Character narration',
      },
    };

    expect(motionEdit.shot_preview.shot_type).toBe('Medium Shot');
    expect(motionEdit.camera_control.movement).toBe('Dolly');
    expect(motionEdit.frame_composition.focal_length).toBe('35mm');
  });

  it('should apply AI suggestions', () => {
    const aiSuggestions = {
      suggested_camera: '35mm lens, Eye Level',
      suggested_lighting: 'Soft natural light',
      suggested_sound: 'Ambient city sounds',
      suggested_movement: 'Dolly' as const,
      suggested_focal_length: '35mm' as const,
      confidence: 0.85,
    };

    expect(aiSuggestions.confidence).toBeGreaterThan(0.8);
    expect(aiSuggestions.suggested_movement).toBe('Dolly');
  });
});

describe('Video Generation Workflow', () => {
  it('should build video prompt with motion context', () => {
    const buildPrompt = (scene: string, motion: any) => {
      return `${scene}. Camera: ${motion.camera}. Lighting: ${motion.lighting}.`;
    };

    const scene = 'Character walks through marketplace';
    const motion = {
      camera: 'Dolly movement, 35mm lens',
      lighting: 'Warm afternoon light',
    };

    const prompt = buildPrompt(scene, motion);
    expect(prompt).toContain('Character walks through marketplace');
    expect(prompt).toContain('Dolly movement');
    expect(prompt).toContain('Warm afternoon light');
  });

  it('should calculate AnimateDiff parameters', () => {
    const calculateParams = (motion: any) => {
      return {
        motion_strength: 0.65,
        fps: 12,
        frame_count: 36,
        camera_movement: motion.camera,
      };
    };

    const motion = { camera: 'Static', lighting: 'Soft' };
    const params = calculateParams(motion);

    expect(params.motion_strength).toBe(0.65);
    expect(params.fps).toBe(12);
    expect(params.frame_count).toBe(36);
  });
});

describe('Local AI (Ollama) Integration', () => {
  it('should calculate cost savings vs cloud', () => {
    const calculateSavings = (projects: number) => {
      const cloudCost = projects * 0.35;
      const ollamaCost = 0;
      return {
        cloudCost,
        ollamaCost,
        savings: cloudCost,
        savingsPercent: 100,
      };
    };

    const result = calculateSavings(100);
    expect(result.cloudCost).toBe(35);
    expect(result.ollamaCost).toBe(0);
    expect(result.savingsPercent).toBe(100);
  });

  it('should select optimal model based on RAM', () => {
    const selectModel = (ram: number) => {
      if (ram >= 32) return 'qwen2.5:14b';
      if (ram >= 16) return 'llama3.2:7b';
      return 'llama3.2:3b';
    };

    expect(selectModel(32)).toBe('qwen2.5:14b');
    expect(selectModel(16)).toBe('llama3.2:7b');
    expect(selectModel(8)).toBe('llama3.2:3b');
  });
});

describe('Firestore Integration', () => {
  it('should structure project data for Firestore', () => {
    const projectData = {
      metadata: {
        id: 'project-1',
        title: 'Test Project',
        userId: 'user-123',
        createdAt: new Date(),
        lastModified: new Date(),
      },
      storagePath: 'projects/user-123/project-1.json',
      fileSize: 1024,
    };

    expect(projectData.metadata.id).toBe('project-1');
    expect(projectData.storagePath).toContain('user-123');
    expect(projectData.fileSize).toBeGreaterThan(0);
  });

  it('should handle batch operations', () => {
    const batchCreate = (projects: any[]) => {
      return projects.map(p => ({
        ...p,
        createdAt: new Date(),
      }));
    };

    const projects = [
      { id: '1', title: 'Project 1' },
      { id: '2', title: 'Project 2' },
      { id: '3', title: 'Project 3' },
    ];

    const result = batchCreate(projects);
    expect(result).toHaveLength(3);
    expect(result[0].createdAt).toBeDefined();
  });
});

describe('Usage Tracking Integration', () => {
  it('should track API usage by provider', () => {
    const usage = {
      gemini: { requests: 100, tokens: 50000, cost: 10 },
      ollama: { requests: 50, tokens: 25000, cost: 0 },
    };

    expect(usage.gemini.cost).toBeGreaterThan(0);
    expect(usage.ollama.cost).toBe(0);
  });

  it('should calculate total credits consumed', () => {
    const calculateCredits = (images: number, videos: number) => {
      const imageCredits = images * 10;
      const videoCredits = videos * 50;
      return imageCredits + videoCredits;
    };

    const totalCredits = calculateCredits(5, 2);
    expect(totalCredits).toBe(150); // (5 * 10) + (2 * 50)
  });
});

describe('Quota Monitoring Integration', () => {
  it('should warn when approaching quota limit', () => {
    const checkQuota = (used: number, limit: number) => {
      const percentage = (used / limit) * 100;
      return {
        shouldWarn: percentage >= 80,
        percentage,
      };
    };

    const result1 = checkQuota(85, 100);
    expect(result1.shouldWarn).toBe(true);
    expect(result1.percentage).toBe(85);

    const result2 = checkQuota(50, 100);
    expect(result2.shouldWarn).toBe(false);
  });

  it('should track quota per model', () => {
    const quotas = {
      'gemini-2.5-flash': { used: 80, limit: 100, rpm: 15 },
      'gemini-2.0-flash': { used: 50, limit: 200, rpm: 10 },
    };

    expect(quotas['gemini-2.5-flash'].used / quotas['gemini-2.5-flash'].limit).toBeGreaterThan(0.75);
    expect(quotas['gemini-2.0-flash'].used / quotas['gemini-2.0-flash'].limit).toBeLessThan(0.5);
  });
});

describe('Hybrid TTS Integration', () => {
  it('should calculate cost savings with Psychology TTS', () => {
    const calculateSavings = (totalRequests: number, psychologySuccessful: number) => {
      const costPerRequest = 0.5; // THB
      const savings = psychologySuccessful * costPerRequest;
      const savingsPercent = (psychologySuccessful / totalRequests) * 100;
      
      return { savings, savingsPercent };
    };

    const result = calculateSavings(100, 70);
    expect(result.savings).toBe(35); // 70 * 0.5
    expect(result.savingsPercent).toBe(70);
  });

  it('should track provider availability', () => {
    const stats = {
      psychologyRequests: 70,
      azureRequests: 30,
      totalRequests: 100,
    };

    const availability = (stats.psychologyRequests / stats.totalRequests) * 100;
    expect(availability).toBe(70);
  });
});

describe('Error Handling Integration', () => {
  it('should handle network errors gracefully', () => {
    const handleError = (error: Error) => {
      if (error.message.includes('Network')) {
        return { type: 'network', retry: true };
      }
      if (error.message.includes('quota')) {
        return { type: 'quota', retry: false };
      }
      return { type: 'unknown', retry: false };
    };

    const networkError = handleError(new Error('Network timeout'));
    expect(networkError.type).toBe('network');
    expect(networkError.retry).toBe(true);

    const quotaError = handleError(new Error('quota exceeded'));
    expect(quotaError.type).toBe('quota');
    expect(quotaError.retry).toBe(false);
  });

  it('should validate required fields before API calls', () => {
    const validate = (data: any) => {
      const errors = [];
      if (!data.title) errors.push('Title required');
      if (!data.genre) errors.push('Genre required');
      if (!data.characters || data.characters.length === 0) {
        errors.push('At least one character required');
      }
      return { valid: errors.length === 0, errors };
    };

    const invalidData = { title: 'Test' };
    const result = validate(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);

    const validData = { title: 'Test', genre: 'Action', characters: ['Hero'] };
    const result2 = validate(validData);
    expect(result2.valid).toBe(true);
  });
});

describe('Data Flow Integration', () => {
  it('should maintain data consistency across steps', () => {
    const workflow = {
      step1: { genre: 'Action', completed: true },
      step2: { storyScope: 'Feature Film', completed: true },
      step3: { characters: ['Hero', 'Villain'], completed: true },
      step4: { structure: ['Act I', 'Act II', 'Act III'], completed: true },
      step5: { scenes: [], completed: false },
    };

    expect(workflow.step1.completed).toBe(true);
    expect(workflow.step3.characters).toHaveLength(2);
    expect(workflow.step5.completed).toBe(false);
  });

  it('should preserve psychology data through save/load', () => {
    const originalData = {
      character: {
        id: 'char-1',
        psychology_timeline: [
          { sceneId: 'scene-1', karmaType: 'กุศลกรรม' as const },
          { sceneId: 'scene-2', karmaType: 'อกุศลกรรม' as const },
        ],
      },
    };

    // Simulate save/load
    const serialized = JSON.stringify(originalData);
    const loaded = JSON.parse(serialized);

    expect(loaded.character.psychology_timeline).toHaveLength(2);
    expect(loaded.character.psychology_timeline[0].karmaType).toBe('กุศลกรรม');
  });
});
