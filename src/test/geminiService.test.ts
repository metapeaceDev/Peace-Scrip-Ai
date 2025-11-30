import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCharacter, generateScene, generateImage } from '../services/geminiService';

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

  describe('generateCharacter', () => {
    it('generates character with AI', async () => {
      const result = await generateCharacter({
        genre: 'Drama',
        role: 'protagonist'
      });

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('age');
      expect(result).toHaveProperty('role');
    });

    it('handles generation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Test error handling
      await expect(
        generateCharacter({ genre: '', role: '' })
      ).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('generateScene', () => {
    it('generates scene with dialogue', async () => {
      const result = await generateScene({
        title: 'Opening Scene',
        characters: ['Character A', 'Character B'],
        setting: 'Office'
      });

      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('dialogue');
    });
  });

  describe('generateImage', () => {
    it('generates image URL from prompt', async () => {
      const result = await generateImage('A beautiful sunset');
      expect(result).toContain('https://');
    });
  });
});
