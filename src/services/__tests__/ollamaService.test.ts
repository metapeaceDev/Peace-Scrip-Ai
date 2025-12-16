/**
 * Ollama Service Tests
 * Tests for local AI text generation with Llama, Qwen, DeepSeek models
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OLLAMA_MODELS,
  checkOllamaStatus,
  listInstalledModels,
  selectOptimalOllamaModel,
  generateText,
  calculateTextGenerationSavings,
  getOllamaDownloadCommand,
  getRecommendedModelForUseCase,
  buildScriptPrompt,
  streamText,
  type OllamaModel,
  type OllamaGenerationRequest,
} from '../ollamaService';

// Mock fetch globally
global.fetch = vi.fn();

describe('ollamaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OLLAMA_MODELS constant', () => {
    it('should export all model configurations', () => {
      expect(OLLAMA_MODELS).toBeDefined();
      expect(Object.keys(OLLAMA_MODELS).length).toBeGreaterThan(0);
    });

    it('should have llama3.2:3b model', () => {
      expect(OLLAMA_MODELS['llama3.2:3b']).toBeDefined();
      expect(OLLAMA_MODELS['llama3.2:3b'].speedTier).toBe('fast');
      expect(OLLAMA_MODELS['llama3.2:3b'].size).toBe('2GB');
    });

    it('should have qwen2.5:7b model', () => {
      expect(OLLAMA_MODELS['qwen2.5:7b']).toBeDefined();
      expect(OLLAMA_MODELS['qwen2.5:7b'].speedTier).toBe('balanced');
      expect(OLLAMA_MODELS['qwen2.5:7b'].quality).toBe(4);
    });

    it('should have deepseek-r1:7b model', () => {
      expect(OLLAMA_MODELS['deepseek-r1:7b']).toBeDefined();
      expect(OLLAMA_MODELS['deepseek-r1:7b'].quality).toBe(5);
    });

    it('should have required fields for all models', () => {
      Object.values(OLLAMA_MODELS).forEach((model) => {
        expect(model.name).toBeDefined();
        expect(model.size).toBeDefined();
        expect(model.speedTier).toBeDefined();
        expect(model.quality).toBeGreaterThanOrEqual(1);
        expect(model.quality).toBeLessThanOrEqual(5);
        expect(model.useCase).toBeDefined();
        expect(model.requirements.ram).toBeDefined();
        expect(model.requirements.diskSpace).toBeDefined();
        expect(model.avgSpeed).toBeDefined();
      });
    });
  });

  describe('checkOllamaStatus', () => {
    it('should return running status when Ollama is available', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.1.20' }),
      });

      const result = await checkOllamaStatus();

      expect(result.isRunning).toBe(true);
      expect(result.version).toBe('0.1.20');
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/version');
    });

    it('should return not running when service is down', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
      });

      const result = await checkOllamaStatus();

      expect(result.isRunning).toBe(false);
      expect(result.error).toBe('Ollama service not responding');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

      const result = await checkOllamaStatus();

      expect(result.isRunning).toBe(false);
      expect(result.error).toContain('Cannot connect to Ollama');
      expect(result.error).toContain('Connection refused');
    });

    it('should handle timeout errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Request timeout'));

      const result = await checkOllamaStatus();

      expect(result.isRunning).toBe(false);
      expect(result.error).toContain('Request timeout');
    });
  });

  describe('listInstalledModels', () => {
    it('should return list of installed models', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3.2:3b' },
            { name: 'qwen2.5:7b' },
            { name: 'deepseek-r1:7b' },
          ],
        }),
      });

      const models = await listInstalledModels();

      expect(models).toEqual(['llama3.2:3b', 'qwen2.5:7b', 'deepseek-r1:7b']);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });

    it('should return empty array when no models installed', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const models = await listInstalledModels();

      expect(models).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
      });

      const models = await listInstalledModels();

      expect(models).toEqual([]);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const models = await listInstalledModels();

      expect(models).toEqual([]);
    });

    it('should handle malformed response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}), // No models field
      });

      const models = await listInstalledModels();

      expect(models).toEqual([]);
    });
  });

  describe('selectOptimalOllamaModel', () => {
    it('should select fast model when preference is fast', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2:3b' }, { name: 'llama3.2:7b' }],
        }),
      });

      const model = await selectOptimalOllamaModel('fast', 16);

      expect(model.name).toBe('Llama 3.2 3B');
      expect(model.speedTier).toBe('fast');
    });

    it('should select balanced model when preference is balanced', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2:7b' }, { name: 'qwen2.5:7b' }],
        }),
      });

      const model = await selectOptimalOllamaModel('balanced', 16);

      expect(model.name).toBe('Llama 3.2 7B');
      expect(model.speedTier).toBe('balanced');
    });

    it('should select advanced model when preference is advanced', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen2.5:14b' }],
        }),
      });

      const model = await selectOptimalOllamaModel('advanced', 32);

      expect(model.name).toBe('Qwen 2.5 14B');
      expect(model.speedTier).toBe('advanced');
      expect(model.quality).toBe(5);
    });

    it('should respect RAM constraints', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen2.5:14b' }, { name: 'llama3.2:7b' }],
        }),
      });

      // Only 16GB RAM available, cannot use 14B model (requires 32GB)
      const model = await selectOptimalOllamaModel('advanced', 16);

      // Should fallback to smaller model
      expect(model.requirements.ram).not.toBe('32GB');
    });

    it('should fallback to smallest model when preferred not available', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2:3b' }], // Only 3B available
        }),
      });

      const model = await selectOptimalOllamaModel('advanced', 32);

      // Should use smallest available model
      expect(model.size).toBe('2GB');
    });

    it('should return default model when none installed', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const model = await selectOptimalOllamaModel('balanced', 16);

      expect(model).toBeDefined();
      expect(model.name).toBe('Llama 3.2 3B'); // Default fallback
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        response: 'Generated script content here...',
        eval_count: 250,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const request: OllamaGenerationRequest = {
        model: 'llama3.2:7b',
        prompt: 'Write a scene about...',
        temperature: 0.7,
        maxTokens: 2000,
      };

      const result = await generateText(request);

      expect(result.text).toBe('Generated script content here...');
      expect(result.tokensUsed).toBe(250);
      expect(result.model).toBe('llama3.2:7b');
      expect(result.cost).toBe(0); // Always free!
      expect(result.generationTime).toBeGreaterThanOrEqual(0);
    });

    it('should use default temperature if not provided', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'Test', eval_count: 100 }),
      });

      await generateText({
        model: 'llama3.2:3b',
        prompt: 'Test prompt',
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.temperature).toBe(0.7);
    });

    it('should use default maxTokens if not provided', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'Test', eval_count: 100 }),
      });

      await generateText({
        model: 'llama3.2:3b',
        prompt: 'Test prompt',
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.max_tokens).toBe(2000);
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Model not found',
      });

      const request: OllamaGenerationRequest = {
        model: 'invalid-model',
        prompt: 'Test',
      };

      await expect(generateText(request)).rejects.toThrow('Ollama API error: Model not found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection timeout'));

      const request: OllamaGenerationRequest = {
        model: 'llama3.2:7b',
        prompt: 'Test',
      };

      await expect(generateText(request)).rejects.toThrow('Failed to generate text');
    });

    it('should always return cost as 0', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'Test', eval_count: 1000 }),
      });

      const result = await generateText({
        model: 'qwen2.5:14b',
        prompt: 'Long prompt...',
        maxTokens: 5000,
      });

      expect(result.cost).toBe(0); // Local = FREE!
    });
  });

  describe('calculateTextGenerationSavings', () => {
    it('should calculate savings for 1 project', () => {
      const result = calculateTextGenerationSavings(1);

      expect(result.cloudCost).toBe(0.35);
      expect(result.ollamaCost).toBe(0);
      expect(result.savings).toBe(0.35);
      expect(result.savingsPercent).toBe(100);
    });

    it('should calculate savings for 10 projects', () => {
      const result = calculateTextGenerationSavings(10);

      expect(result.cloudCost).toBe(3.5);
      expect(result.ollamaCost).toBe(0);
      expect(result.savings).toBe(3.5);
      expect(result.savingsPercent).toBe(100);
    });

    it('should calculate savings for 100 projects', () => {
      const result = calculateTextGenerationSavings(100);

      expect(result.cloudCost).toBe(35);
      expect(result.ollamaCost).toBe(0);
      expect(result.savings).toBe(35);
      expect(result.savingsPercent).toBe(100);
    });

    it('should always show 100% savings with Ollama', () => {
      const projects = [1, 5, 10, 50, 100, 1000];

      projects.forEach((count) => {
        const result = calculateTextGenerationSavings(count);
        expect(result.savingsPercent).toBe(100);
        expect(result.ollamaCost).toBe(0);
      });
    });
  });

  describe('getOllamaDownloadCommand', () => {
    it('should return correct download command for llama', () => {
      const cmd = getOllamaDownloadCommand('llama3.2:3b');
      expect(cmd).toBe('ollama pull llama3.2:3b');
    });

    it('should return correct download command for qwen', () => {
      const cmd = getOllamaDownloadCommand('qwen2.5:7b');
      expect(cmd).toBe('ollama pull qwen2.5:7b');
    });

    it('should return correct download command for deepseek', () => {
      const cmd = getOllamaDownloadCommand('deepseek-r1:7b');
      expect(cmd).toBe('ollama pull deepseek-r1:7b');
    });

    it('should work with any model name', () => {
      const cmd = getOllamaDownloadCommand('custom-model:latest');
      expect(cmd).toBe('ollama pull custom-model:latest');
    });
  });

  describe('getRecommendedModelForUseCase', () => {
    it('should recommend 3B model for quick drafts', () => {
      const model = getRecommendedModelForUseCase('quick-draft');
      expect(model.name).toBe('Llama 3.2 3B');
      expect(model.speedTier).toBe('fast');
    });

    it('should recommend 3B model for dialogue', () => {
      const model = getRecommendedModelForUseCase('dialogue');
      expect(model.name).toBe('Llama 3.2 3B');
    });

    it('should recommend 7B model for scene descriptions', () => {
      const model = getRecommendedModelForUseCase('scene-description');
      expect(model.name).toBe('Llama 3.2 7B');
      expect(model.speedTier).toBe('balanced');
    });

    it('should recommend Qwen for plot development', () => {
      const model = getRecommendedModelForUseCase('plot-development');
      expect(model.name).toBe('Qwen 2.5 7B');
    });

    it('should recommend 14B model for screenplay', () => {
      const model = getRecommendedModelForUseCase('screenplay');
      expect(model.name).toBe('Qwen 2.5 14B');
      expect(model.quality).toBe(5);
    });

    it('should recommend DeepSeek for analysis', () => {
      const model = getRecommendedModelForUseCase('analysis');
      expect(model.name).toBe('DeepSeek R1 7B');
      expect(model.useCase).toContain('Reasoning');
    });

    it('should fallback to balanced model for unknown use case', () => {
      const model = getRecommendedModelForUseCase('unknown-use-case');
      expect(model.name).toBe('Llama 3.2 7B');
      expect(model.speedTier).toBe('balanced');
    });
  });

  describe('buildScriptPrompt', () => {
    it('should build complete prompt with all parameters', () => {
      const prompt = buildScriptPrompt('Action', 5, 10, 'Set in Bangkok');

      expect(prompt).toContain('Genre: Action');
      expect(prompt).toContain('Number of Characters: 5');
      expect(prompt).toContain('Number of Scenes: 10');
      expect(prompt).toContain('Additional Context: Set in Bangkok');
      expect(prompt).toContain('Thai screenplay writer');
    });

    it('should work without additional context', () => {
      const prompt = buildScriptPrompt('Drama', 3, 8);

      expect(prompt).toContain('Genre: Drama');
      expect(prompt).toContain('Number of Characters: 3');
      expect(prompt).toContain('Number of Scenes: 8');
      expect(prompt).not.toContain('Additional Context:');
    });

    it('should include screenplay formatting instructions', () => {
      const prompt = buildScriptPrompt('Comedy', 4, 6);

      expect(prompt).toContain('Scene number');
      expect(prompt).toContain('Location');
      expect(prompt).toContain('Characters involved');
      expect(prompt).toContain('professional screenplay format');
    });

    it('should handle different genres', () => {
      const genres = ['Action', 'Drama', 'Comedy', 'Thriller', 'Romance'];

      genres.forEach((genre) => {
        const prompt = buildScriptPrompt(genre, 3, 5);
        expect(prompt).toContain(`Genre: ${genre}`);
      });
    });

    it('should handle various character and scene counts', () => {
      const prompt = buildScriptPrompt('Sci-Fi', 15, 50);

      expect(prompt).toContain('Number of Characters: 15');
      expect(prompt).toContain('Number of Scenes: 50');
    });
  });

  describe('streamText', () => {
    it('should stream text chunks', async () => {
      const mockChunks = [
        { response: 'First ' },
        { response: 'chunk. ' },
        { response: 'Second ' },
        { response: 'chunk.' },
      ];

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(JSON.stringify(mockChunks[0]) + '\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(JSON.stringify(mockChunks[1]) + '\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(JSON.stringify(mockChunks[2]) + '\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(JSON.stringify(mockChunks[3]) + '\n'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const chunks: string[] = [];
      const generator = streamText({
        model: 'llama3.2:7b',
        prompt: 'Test',
      });

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['First ', 'chunk. ', 'Second ', 'chunk.']);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Service unavailable',
      });

      const generator = streamText({
        model: 'llama3.2:7b',
        prompt: 'Test',
      });

      await expect(async () => {
        for await (const _ of generator) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Ollama API error');
    });

    it('should handle missing response body', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: null,
      });

      const generator = streamText({
        model: 'llama3.2:7b',
        prompt: 'Test',
      });

      await expect(async () => {
        for await (const _ of generator) {
          // Should throw
        }
      }).rejects.toThrow('Response body is not readable');
    });

    it('should skip invalid JSON lines', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"response": "Valid"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('Invalid JSON\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"response": "Also valid"}\n'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const chunks: string[] = [];
      const generator = streamText({
        model: 'llama3.2:7b',
        prompt: 'Test',
      });

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Valid', 'Also valid']); // Invalid JSON skipped
    });

    it('should release lock on early termination', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"response": "First"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"response": "Second"}\n'),
          }),
        releaseLock: vi.fn(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const generator = streamText({
        model: 'llama3.2:7b',
        prompt: 'Test',
      });

      // Break after first chunk
      for await (const chunk of generator) {
        expect(chunk).toBe('First');
        break;
      }

      expect(mockReader.releaseLock).toHaveBeenCalled();
    });
  });
});
