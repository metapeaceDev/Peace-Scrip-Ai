import { describe, it, expect, vi } from 'vitest';

// Simplified tests focusing on module structure and exports
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({})),
}));

vi.mock('../comfyuiBackendClient', () => ({}));
vi.mock('../psychologyCalculator', () => ({}));
vi.mock('../userStore', () => ({}));
vi.mock('../subscriptionManager', () => ({}));
vi.mock('../../config/firebase', () => ({ auth: {} }));
vi.mock('../deviceManager', () => ({}));
vi.mock('../replicateService', () => ({}));

describe('geminiService - Module Structure Tests', () => {
  it('should export AI_MODELS configuration', async () => {
    const module = await import('../geminiService');
    expect(module.AI_MODELS).toBeDefined();
    expect(module.AI_MODELS.FREE).toBeDefined();
    expect(module.AI_MODELS.PAID).toBeDefined();
  });

  it('should have FREE models with correct cost', async () => {
    const module = await import('../geminiService');
    expect(module.AI_MODELS.FREE.POLLINATIONS.cost).toBe('FREE');
    expect(module.AI_MODELS.FREE.COMFYUI_SDXL).toBeDefined();
    expect(module.AI_MODELS.FREE.GEMINI_FLASH).toBeDefined();
  });

  it('should have PAID models', async () => {
    const module = await import('../geminiService');
    expect(module.AI_MODELS.PAID.GEMINI_PRO).toBeDefined();
    expect(module.AI_MODELS.PAID.COMFYUI_FLUX).toBeDefined();
  });

  it('should export VIDEO_MODELS_CONFIG', async () => {
    const module = await import('../geminiService');
    expect(module.VIDEO_MODELS_CONFIG).toBeDefined();
  });

  it('should export generateTitle function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateTitle).toBe('function');
  });

  it('should export generateCharacterDetails function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateCharacterDetails).toBe('function');
  });

  it('should export generateAllCharactersFromStory function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateAllCharactersFromStory).toBe('function');
  });

  it('should export fillMissingCharacterDetails function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.fillMissingCharacterDetails).toBe('function');
  });

  it('should export generateFullScriptOutline function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateFullScriptOutline).toBe('function');
  });

  it('should export generateScene function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateScene).toBe('function');
  });

  it('should export refineScene function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.refineScene).toBe('function');
  });

  it('should export regenerateWithEdits function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.regenerateWithEdits).toBe('function');
  });

  it('should export convertDialogueToDialect function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.convertDialogueToDialect).toBe('function');
  });

  it('should export generateStoryboardImage function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateStoryboardImage).toBe('function');
  });

  it('should export generateCharacterImage function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateCharacterImage).toBe('function');
  });

  it('should export generateStoryboardVideo function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateStoryboardVideo).toBe('function');
  });

  it('should export generateMoviePoster function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateMoviePoster).toBe('function');
  });

  it('should export generateStructure function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateStructure).toBe('function');
  });

  it('should export generateSinglePlotPoint function', async () => {
    const module = await import('../geminiService');
    expect(typeof module.generateSinglePlotPoint).toBe('function');
  });

  it('should have model properties', async () => {
    const module = await import('../geminiService');
    const model = module.AI_MODELS.FREE.POLLINATIONS;
    expect(model.id).toBe('pollinations');
    expect(model.name).toBeDefined();
    expect(model.provider).toBeDefined();
  });
});
