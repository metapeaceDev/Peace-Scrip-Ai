import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkLoRAModels,
  downloadLoRAModel,
  getManualInstallInstructions,
  checkAllRequiredModels,
  installAllRequiredModels,
  setAutoInstallLoRA,
  getAutoInstallLoRA,
  REQUIRED_LORA_MODELS,
  type LoRAModel,
} from '../loraInstaller';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
let localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    localStorageStore = {};
  }),
  key: vi.fn(),
  length: 0,
};
global.localStorage = localStorageMock as any;

// Mock navigator
const originalNavigator = global.navigator;

describe('loraInstaller', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorageStore = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('REQUIRED_LORA_MODELS', () => {
    it('should have all required fields for each model', () => {
      expect(REQUIRED_LORA_MODELS.length).toBeGreaterThan(0);

      REQUIRED_LORA_MODELS.forEach(model => {
        expect(model.name).toBeDefined();
        expect(model.filename).toBeDefined();
        expect(model.displayName).toBeDefined();
        expect(model.description).toBeDefined();
        expect(model.downloadUrl).toBeDefined();
        expect(model.size).toBeDefined();
        expect(typeof model.required).toBe('boolean');
        expect(['character', 'style', 'general']).toContain(model.category);
      });
    });

    it('should have at least one required model', () => {
      const requiredModels = REQUIRED_LORA_MODELS.filter(m => m.required);
      expect(requiredModels.length).toBeGreaterThan(0);
    });

    it('should have models in different categories', () => {
      const categories = new Set(REQUIRED_LORA_MODELS.map(m => m.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('checkLoRAModels', () => {
    it('should return installed status for all models when ComfyUI responds', async () => {
      const mockLoraList = [
        'character_consistency_v1.safetensors',
        'cinematic_film_v2.safetensors',
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [mockLoraList],
              },
            },
          },
        }),
      });

      const status = await checkLoRAModels();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/object_info/LoraLoader'),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );

      expect(status.CHARACTER_CONSISTENCY.installed).toBe(true);
      expect(status.CHARACTER_CONSISTENCY.available).toBe(true);
      expect(status.CINEMATIC_STYLE.installed).toBe(true);
      expect(status.THAI_STYLE.installed).toBe(false);
    });

    it('should return not installed for all models when ComfyUI is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const status = await checkLoRAModels();

      Object.values(status).forEach(modelStatus => {
        expect(modelStatus.installed).toBe(false);
        expect(modelStatus.available).toBe(false);
        expect(modelStatus.error).toBeDefined();
      });
    });

    it('should handle malformed ComfyUI response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing expected structure
      });

      const status = await checkLoRAModels();

      Object.values(status).forEach(modelStatus => {
        expect(modelStatus.installed).toBe(false);
      });
    });

    it('should timeout after 3 seconds', async () => {
      let abortSignalUsed: AbortSignal | undefined;

      mockFetch.mockImplementationOnce((url, options: any) => {
        abortSignalUsed = options.signal;
        return new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000)
        );
      });

      await checkLoRAModels();

      expect(abortSignalUsed).toBeDefined();
    });

    it('should handle fetch returning null (silent error)', async () => {
      mockFetch.mockImplementationOnce(() => null);

      const status = await checkLoRAModels();

      Object.values(status).forEach(modelStatus => {
        expect(modelStatus.installed).toBe(false);
        expect(modelStatus.available).toBe(false);
      });
    });
  });

  describe('downloadLoRAModel', () => {
    const testModel: LoRAModel = {
      name: 'TEST_MODEL',
      filename: 'test_model.safetensors',
      displayName: 'Test Model',
      description: 'Test Description',
      downloadUrl: 'https://example.com/model.safetensors',
      size: '100 MB',
      required: true,
      category: 'general',
    };

    it('should download via ComfyUI Manager if available', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true }); // Manager endpoint

      await downloadLoRAModel(testModel);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/manager/download_lora'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: testModel.downloadUrl,
            filename: testModel.filename,
          }),
        })
      );
    });

    it('should fallback to direct download when Manager unavailable', async () => {
      // Manager fails
      mockFetch.mockRejectedValueOnce(new Error('Manager not found'));

      // Direct download succeeds
      const mockBlob = new Blob(['test data']);
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'Content-Length': '100' }),
          body: { getReader: () => mockReader },
        })
        .mockResolvedValueOnce({ ok: true }); // Upload endpoint

      await downloadLoRAModel(testModel);

      expect(mockFetch).toHaveBeenCalledWith(testModel.downloadUrl);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload/image'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should call progress callback during download', async () => {
      const onProgress = vi.fn();

      mockFetch.mockRejectedValueOnce(new Error('Manager not found'));

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array(50) })
          .mockResolvedValueOnce({ done: false, value: new Uint8Array(50) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'Content-Length': '100' }),
          body: { getReader: () => mockReader },
        })
        .mockResolvedValueOnce({ ok: true });

      await downloadLoRAModel(testModel, onProgress);

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls[0][0]).toBeGreaterThan(0);
    });

    it('should throw error when download fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Manager not found'));
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

      await expect(downloadLoRAModel(testModel)).rejects.toThrow('Download failed');
    });

    it('should throw error when reader unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Manager not found'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        body: null, // No reader
      });

      await expect(downloadLoRAModel(testModel)).rejects.toThrow('Unable to read download stream');
    });

    it('should throw error when upload to ComfyUI fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Manager not found'));

      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          body: { getReader: () => mockReader },
        })
        .mockResolvedValueOnce({ ok: false }); // Upload fails

      await expect(downloadLoRAModel(testModel)).rejects.toThrow(
        'Failed to upload LoRA to ComfyUI'
      );
    });
  });

  describe('getManualInstallInstructions', () => {
    const testModel: LoRAModel = {
      name: 'TEST',
      filename: 'test.safetensors',
      displayName: 'Test Model',
      description: 'Test',
      downloadUrl: 'https://example.com/test',
      size: '100 MB',
      required: true,
      category: 'general',
    };

    it('should return Windows path when on Windows', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        writable: true,
        configurable: true,
      });

      const instructions = getManualInstallInstructions(testModel);

      expect(instructions.loraFolder).toContain('C:\\');
      expect(instructions.loraFolder).toContain('ComfyUI\\models\\loras\\');
      expect(instructions.steps.length).toBeGreaterThan(0);
      expect(instructions.steps.some(s => s.includes(testModel.downloadUrl))).toBe(true);
    });

    it('should return Mac path when on macOS', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
        configurable: true,
      });

      const instructions = getManualInstallInstructions(testModel);

      expect(instructions.loraFolder).toContain('~/ComfyUI/models/loras/');
      expect(instructions.steps.length).toBeGreaterThan(0);
    });

    it('should return Linux path when on Linux', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
        writable: true,
        configurable: true,
      });

      const instructions = getManualInstallInstructions(testModel);

      expect(instructions.loraFolder).toContain('ComfyUI/models/loras/');
      expect(instructions.steps.length).toBeGreaterThan(0);
    });

    it('should include model filename in instructions', () => {
      const instructions = getManualInstallInstructions(testModel);

      expect(instructions.steps.some(s => s.includes(testModel.filename))).toBe(true);
    });

    it('should include download URL in instructions', () => {
      const instructions = getManualInstallInstructions(testModel);

      expect(instructions.steps.some(s => s.includes(testModel.downloadUrl))).toBe(true);
    });
  });

  describe('checkAllRequiredModels', () => {
    it('should return all installed when all required models present', async () => {
      const allFilenames = REQUIRED_LORA_MODELS.map(m => m.filename);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [allFilenames],
              },
            },
          },
        }),
      });

      const result = await checkAllRequiredModels();

      expect(result.allInstalled).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.installed.length).toBeGreaterThan(0);
    });

    it('should return missing models when some not installed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [['cinematic_film_v2.safetensors']], // Only one installed
              },
            },
          },
        }),
      });

      const result = await checkAllRequiredModels();

      const requiredCount = REQUIRED_LORA_MODELS.filter(m => m.required).length;
      if (requiredCount > 1) {
        expect(result.allInstalled).toBe(false);
        expect(result.missing.length).toBeGreaterThan(0);
      }
    });

    it('should only check required models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [[]],
              },
            },
          },
        }),
      });

      const result = await checkAllRequiredModels();

      // Only required models counted in missing/installed
      const requiredModels = REQUIRED_LORA_MODELS.filter(m => m.required);
      expect(result.missing.length + result.installed.length).toBe(requiredModels.length);
    });
  });

  describe('installAllRequiredModels', () => {
    it('should yield progress for each missing model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [[]],
              },
            },
          },
        }),
      });

      // Mock successful downloads
      mockFetch.mockResolvedValue({ ok: true });

      const generator = installAllRequiredModels();
      const progress = [];

      for await (const step of generator) {
        progress.push(step);
      }

      expect(progress.length).toBeGreaterThan(0);
      expect(progress.some(p => p.status === 'pending')).toBe(true);
      expect(progress.some(p => p.status === 'downloading')).toBe(true);
    });

    it('should yield error status when download fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [[]],
              },
            },
          },
        }),
      });

      // Mock failed download
      mockFetch.mockRejectedValue(new Error('Download failed'));

      const generator = installAllRequiredModels();
      const progress = [];

      for await (const step of generator) {
        progress.push(step);
      }

      expect(progress.some(p => p.status === 'error')).toBe(true);
      expect(progress.some(p => p.error)).toBe(true);
    });

    it('should include model name in progress updates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [[]],
              },
            },
          },
        }),
      });

      mockFetch.mockResolvedValue({ ok: true });

      const generator = installAllRequiredModels();
      const progress = [];

      for await (const step of generator) {
        progress.push(step);
        expect(step.modelName).toBeDefined();
        expect(step.message).toBeDefined();
      }
    });
  });

  describe('setAutoInstallLoRA', () => {
    it('should save true to localStorage', () => {
      setAutoInstallLoRA(true);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('peace_auto_install_lora', 'true');
      expect(localStorageStore.peace_auto_install_lora).toBe('true');
    });

    it('should save false to localStorage', () => {
      setAutoInstallLoRA(false);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('peace_auto_install_lora', 'false');
      expect(localStorageStore.peace_auto_install_lora).toBe('false');
    });
  });

  describe('getAutoInstallLoRA', () => {
    it('should return true by default when not set', () => {
      const result = getAutoInstallLoRA();
      expect(result).toBe(true);
    });

    it('should return true when set to true', () => {
      localStorageStore.peace_auto_install_lora = 'true';

      const result = getAutoInstallLoRA();
      expect(result).toBe(true);
    });

    it('should return false when explicitly set to false', () => {
      localStorageStore.peace_auto_install_lora = 'false';

      const result = getAutoInstallLoRA();
      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full check and install workflow', async () => {
      // Initial check shows missing models
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [[]],
              },
            },
          },
        }),
      });

      const initialCheck = await checkAllRequiredModels();
      expect(initialCheck.allInstalled).toBe(false);

      // Install missing models
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [[]],
              },
            },
          },
        }),
      });

      mockFetch.mockResolvedValue({ ok: true });

      const generator = installAllRequiredModels();
      for await (const _step of generator) {
        // Installation in progress
      }

      // Final check after installation
      const allFilenames = REQUIRED_LORA_MODELS.map(m => m.filename);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          LoraLoader: {
            input: {
              required: {
                lora_name: [allFilenames],
              },
            },
          },
        }),
      });

      const finalCheck = await checkAllRequiredModels();
      expect(finalCheck.allInstalled).toBe(true);
    });
  });
});
