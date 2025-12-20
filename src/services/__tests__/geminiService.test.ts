import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateTitle, 
  generateStructure, 
  generateCharacterDetails, 
  generateScene 
} from '../geminiService';

// Mock dependencies
const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  countTokens: vi.fn().mockResolvedValue({ totalTokens: 100 }),
}));

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        countTokens: mocks.countTokens,
        generateContent: mocks.generateContent,
      };
    },
  };
});

vi.mock('../../config/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' },
  },
}));

vi.mock('../userStore', () => ({
  hasAccessToModel: vi.fn().mockResolvedValue(true),
  deductCredits: vi.fn().mockResolvedValue(true),
}));

vi.mock('../subscriptionManager', () => ({
  checkQuota: vi.fn().mockResolvedValue({ allowed: true }),
  recordUsage: vi.fn().mockResolvedValue(true),
  checkVeoQuota: vi.fn().mockResolvedValue({ allowed: true }),
  recordVeoUsage: vi.fn().mockResolvedValue(true),
}));

vi.mock('../modelUsageTracker', () => ({
  recordGeneration: vi.fn().mockResolvedValue(true),
}));

// Mock other services to avoid errors
vi.mock('../comfyuiBackendClient', () => ({
  generateWithComfyUI: vi.fn(),
  checkBackendStatus: vi.fn(),
}));

vi.mock('../psychologyCalculator', () => ({
  formatPsychologyForPrompt: vi.fn(),
  calculatePsychologyProfile: vi.fn(),
}));

vi.mock('../deviceManager', () => ({
  loadRenderSettings: vi.fn(),
}));

vi.mock('../replicateService', () => ({
  generateAnimateDiffVideo: vi.fn(),
  generateSVDVideo: vi.fn(),
  generateHotshotXL: vi.fn(),
}));

vi.mock('../videoPersistenceService', () => ({
  persistVideoUrl: vi.fn(),
}));

vi.mock('../comfyuiInstaller', () => ({
  getSavedComfyUIUrl: vi.fn(),
  checkComfyUIStatus: vi.fn(),
}));

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTitle', () => {
    it('should generate a title based on script data', async () => {
      const mockResponse = {
        text: JSON.stringify({ title: 'The Great Adventure' }),
      };
      mocks.generateContent.mockResolvedValue(mockResponse);

      const scriptData = {
        genre: 'Adventure',
        premise: 'A hero goes on a journey',
      };

      const title = await generateTitle(scriptData as any);
      expect(title).toBe('The Great Adventure');
      expect(mocks.generateContent).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
       mocks.generateContent.mockRejectedValue(new Error('API Error'));
       const scriptData = {
        genre: 'Adventure',
        premise: 'A hero goes on a journey',
      };
      
      await expect(generateTitle(scriptData as any)).rejects.toThrow();
    });
  });

  describe('generateStructure', () => {
      it('should generate structure', async () => {
          const mockStructure = [
              { title: 'Inciting Incident', description: 'Something happens' }
          ];
          const mockResponse = {
            text: JSON.stringify(mockStructure),
          };
          mocks.generateContent.mockResolvedValue(mockResponse);

          const scriptData = {
            genre: 'Drama',
            premise: 'A sad story',
            theme: 'Loss',
            characters: [],
          };

          const result = await generateStructure(scriptData as any);
          expect(result).toEqual(mockStructure);
      });
  });

  describe('generateCharacterDetails', () => {
    it('should generate character details', async () => {
      const mockDetails = {
        background: 'A mysterious past',
        psychology: 'Introverted',
      };
      const mockResponse = {
        text: JSON.stringify(mockDetails),
      };
      mocks.generateContent.mockResolvedValue(mockResponse);

      const result = await generateCharacterDetails('John', 'Protagonist', 'A hero', 'English');
      expect(result).toEqual(mockDetails);
    });
  });

  describe('generateScene', () => {
    it('should generate a scene', async () => {
      const mockScene = {
        slugline: 'INT. ROOM - DAY',
        sceneDesign: {
          situations: [
            {
              action: 'John enters.',
              dialogue: [{ speaker: 'John', text: 'Hello.' }],
            }
          ]
        }
      };
      const mockResponse = {
        text: JSON.stringify(mockScene),
      };
      mocks.generateContent.mockResolvedValue(mockResponse);

      const scriptData = {
        genre: 'Drama',
        characters: [{ name: 'John', role: 'Protagonist', goals: { objective: 'To survive' } }],
        generatedScenes: {},
      };
      const plotPoint = {
        title: 'Inciting Incident',
        description: 'Something happens',
      };

      const result = await generateScene(scriptData as any, plotPoint as any, 0, 1, 1);
      // The result will be processed, so we check if it contains our data
      expect(result.slugline).toEqual(mockScene.slugline);
      expect(result.sceneDesign.situations[0].action).toEqual(mockScene.sceneDesign.situations[0].action);
    });
  });
});

