import { describe, it, expect, vi } from 'vitest';

// Mock Google GenAI
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: () => JSON.stringify({
          name: 'Test Character',
          age: 30,
          role: 'protagonist'
        })
      })
    }
  }))
}));

// Mock environment
vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

describe('geminiService', () => {
  it('service can be imported', async () => {
    const geminiService = await import('../services/geminiService');
    expect(geminiService).toBeDefined();
  });

  it('has AI_MODELS defined', async () => {
    const { AI_MODELS } = await import('../services/geminiService');
    expect(AI_MODELS).toBeDefined();
    expect(AI_MODELS.FREE).toBeDefined();
  });
});
