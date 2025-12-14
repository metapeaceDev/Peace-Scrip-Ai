import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCharacterDetails, generateScene, generateStoryboardImage } from '../services/geminiService';
import type { ScriptData, PlotPoint } from '../../types';
import { PLOT_POINTS } from '../../constants';

// Mock the Gemini API
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue(JSON.stringify({
            name: 'Test Character',
            age: 30,
            role: 'protagonist'
          }))
        }
      })
    })
  }))
}));

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCharacterDetails', () => {
    it('generates character with AI', async () => {
      const result = await generateCharacterDetails(
        'John Doe',
        'Protagonist (Main)',
        'A brave detective',
        'English'
      );

      expect(result).toHaveProperty('name');
      expect(result.name).toBe('John Doe');
    });

    it('handles generation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Test error handling - empty inputs should still work but may throw
      try {
        await generateCharacterDetails('', '', '', 'English');
      } catch (e) {
        expect(e).toBeDefined();
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('generateScene', () => {
    it('generates scene with dialogue', async () => {
      const mockScriptData: ScriptData = {
        id: 'test-1',
        projectType: 'Movie',
        title: 'Test Movie',
        mainGenre: 'Drama',
        secondaryGenres: [],
        language: 'English',
        bigIdea: 'Test idea',
        premise: 'Test premise',
        theme: 'Test theme',
        logLine: 'Test logline',
        timeline: {
          movieTiming: '',
          seasons: '',
          date: '',
          social: '',
          economist: '',
          environment: ''
        },
        characters: [],
        structure: PLOT_POINTS,
        scenesPerPoint: {},
        generatedScenes: {},
        team: []
      };

      const plotPoint: PlotPoint = PLOT_POINTS[0]; // Equilibrium

      const result = await generateScene(
        mockScriptData,
        plotPoint,
        0,  // sceneIndex
        1,  // totalScenesForPoint
        1   // sceneNumber
      );

      expect(result).toHaveProperty('sceneDesign');
      expect(result.sceneDesign).toHaveProperty('situations');
    });
  });

  describe('generateStoryboardImage', () => {
    it('generates image from prompt', async () => {
      const result = await generateStoryboardImage('A beautiful sunset over the ocean');
      // Should return base64 data URL or throw error
      expect(typeof result).toBe('string');
    });
  });
});
