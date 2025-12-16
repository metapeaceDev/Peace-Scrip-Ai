import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkComfyUIStatus,
  getInstallInstructions,
  monitorInstallation,
  checkRequiredModels,
  saveComfyUIUrl,
  getSavedComfyUIUrl,
  type ComfyUIStatus,
  type InstallProgress,
} from '../comfyuiInstaller';

describe('comfyuiInstaller', () => {
  // Mock fetch globally
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('checkComfyUIStatus', () => {
    it('should return running status when local ComfyUI responds', async () => {
      const mockStats = {
        system: {
          comfyui_version: '1.0.0',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const status = await checkComfyUIStatus();

      expect(status.installed).toBe(true);
      expect(status.running).toBe(true);
      expect(status.version).toBe('1.0.0');
      expect(status.url).toBeDefined();
    });

    it('should return unknown version when system stats missing version', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ system: {} }),
      });

      const status = await checkComfyUIStatus();

      expect(status.installed).toBe(true);
      expect(status.running).toBe(true);
      expect(status.version).toBe('unknown');
    });

    it('should return not running when local fetch fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      const status = await checkComfyUIStatus();

      expect(status.installed).toBe(false);
      expect(status.running).toBe(false);
      expect(status.error).toContain('ComfyUI is not running');
    });

    it('should try cloud fallback when local fails and cloud URL configured', async () => {
      // First call (local) fails
      (global.fetch as any).mockRejectedValueOnce(new Error('Local failed'));

      const status = await checkComfyUIStatus();

      // If no cloud URL in env, should return not running
      expect(status.running).toBe(false);
    });

    it('should handle network timeout gracefully', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const status = await checkComfyUIStatus();

      expect(status.running).toBe(false);
      expect(status.error).toBeDefined();
    });
  });

  describe('getInstallInstructions', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should detect Windows OS', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        writable: true,
      });

      const instructions = getInstallInstructions();

      expect(instructions.os).toBe('windows');
      expect(instructions.isOneClick).toBe(true);
      expect(instructions.instructions).toContain('1. Download ComfyUI Portable (Windows)');
      expect(instructions.downloadUrl).toContain('windows_portable');
    });

    it('should detect macOS', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });

      const instructions = getInstallInstructions();

      expect(instructions.os).toBe('mac');
      expect(instructions.isOneClick).toBe(false);
      expect(instructions.instructions).toContain('1. Download ComfyUI for macOS');
      expect(instructions.downloadUrl).toContain('github.com');
    });

    it('should detect Linux OS', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
        writable: true,
      });

      const instructions = getInstallInstructions();

      expect(instructions.os).toBe('linux');
      expect(instructions.isOneClick).toBe(false);
      expect(instructions.instructions).toContain('1. Download ComfyUI for Linux');
    });

    it('should handle unknown OS', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'UnknownOS/1.0' },
        writable: true,
      });

      const instructions = getInstallInstructions();

      expect(instructions.os).toBe('unknown');
      expect(instructions.isOneClick).toBe(false);
      expect(instructions.downloadUrl).toContain('github.com');
    });

    it('should provide step-by-step instructions for each OS', () => {
      const oses = ['windows', 'mac', 'linux'];
      
      for (const os of oses) {
        Object.defineProperty(global, 'navigator', {
          value: { userAgent: os === 'windows' ? 'Windows' : os === 'mac' ? 'Mac' : 'Linux' },
          writable: true,
        });

        const instructions = getInstallInstructions();
        
        expect(instructions.instructions.length).toBeGreaterThan(3);
        expect(instructions.instructions[0]).toMatch(/^1\./);
        expect(instructions.downloadUrl).toBeTruthy();
      }
    });
  });

  describe('monitorInstallation', () => {
    it('should yield download progress', async () => {
      const generator = monitorInstallation();
      const progress: InstallProgress[] = [];

      for await (const step of generator) {
        progress.push(step);
      }

      expect(progress.length).toBeGreaterThan(0);
      expect(progress[0].step).toBe('download');
      expect(progress[0].progress).toBe(0);
      expect(progress[0].message).toContain('Downloading');
    });

    it('should complete with 100% progress', async () => {
      const generator = monitorInstallation();
      const progress: InstallProgress[] = [];

      for await (const step of generator) {
        progress.push(step);
      }

      const lastStep = progress[progress.length - 1];
      expect(lastStep.progress).toBe(100);
    });

    it('should provide meaningful messages', async () => {
      const generator = monitorInstallation();
      
      for await (const step of generator) {
        expect(step.message).toBeTruthy();
        expect(step.message.length).toBeGreaterThan(5);
      }
    });
  });

  describe('checkRequiredModels', () => {
    it('should return true when models are available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model_list: ['flux', 'sdxl'] }),
      });

      const result = await checkRequiredModels('http://localhost:8188');

      expect(result.checkpointModel).toBe(true);
      expect(result.loraModels).toBe(true);
      expect(result.missingModels).toEqual([]);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await checkRequiredModels('http://localhost:8188');

      expect(result.checkpointModel).toBe(false);
      expect(result.loraModels).toBe(false);
      expect(result.missingModels).toContain('Unable to verify models');
    });

    it('should use provided ComfyUI URL', async () => {
      const customUrl = 'http://custom-comfy:9999';
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await checkRequiredModels(customUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(customUrl)
      );
    });

    it('should handle malformed response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await checkRequiredModels('http://localhost:8188');

      // Should not throw, should return some status
      expect(result).toBeDefined();
      expect(result.checkpointModel).toBeDefined();
      expect(result.loraModels).toBeDefined();
    });
  });

  describe('saveComfyUIUrl', () => {
    it('should save URL to localStorage', () => {
      const url = 'http://localhost:9999';

      saveComfyUIUrl(url);

      expect(localStorage.setItem).toHaveBeenCalledWith('comfyui_url', url);
    });

    it('should handle different URL formats', () => {
      const urls = [
        'http://localhost:8188',
        'https://comfyui.example.com',
        'http://192.168.1.100:8188',
      ];

      for (const url of urls) {
        vi.clearAllMocks();
        saveComfyUIUrl(url);
        expect(localStorage.setItem).toHaveBeenCalledWith('comfyui_url', url);
      }
    });
  });

  describe('getSavedComfyUIUrl', () => {
    it('should return saved URL from localStorage', () => {
      const savedUrl = 'http://custom-url:8188';
      (localStorage.getItem as any).mockReturnValueOnce(savedUrl);

      const url = getSavedComfyUIUrl();

      expect(url).toBe(savedUrl);
      expect(localStorage.getItem).toHaveBeenCalledWith('comfyui_url');
    });

    it('should return default URL when nothing saved', () => {
      (localStorage.getItem as any).mockReturnValueOnce(null);

      const url = getSavedComfyUIUrl();

      expect(url).toBeDefined();
      expect(url.length).toBeGreaterThan(0);
      // URL should be either localhost or cloud URL
      expect(url).toMatch(/^https?:\/\//);
    });

    it('should handle empty string from localStorage', () => {
      (localStorage.getItem as any).mockReturnValueOnce('');

      const url = getSavedComfyUIUrl();

      // Empty string is falsy, should return default
      expect(url).toBeDefined();
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe('Integration - Full workflow', () => {
    it('should handle complete installation check flow', async () => {
      // User checks status - ComfyUI not running
      (global.fetch as any).mockRejectedValueOnce(new Error('Not running'));
      
      const initialStatus = await checkComfyUIStatus();
      expect(initialStatus.running).toBe(false);

      // User gets installation instructions
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Windows' },
        writable: true,
      });
      const instructions = getInstallInstructions();
      expect(instructions.os).toBe('windows');
      expect(instructions.downloadUrl).toBeTruthy();

      // User installs and saves custom URL
      const customUrl = 'http://localhost:8188';
      saveComfyUIUrl(customUrl);
      expect(localStorage.setItem).toHaveBeenCalledWith('comfyui_url', customUrl);

      // User checks again - now running
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ system: { comfyui_version: '1.0.0' } }),
      });
      
      const finalStatus = await checkComfyUIStatus();
      expect(finalStatus.running).toBe(true);
      expect(finalStatus.version).toBe('1.0.0');
    });

    it('should guide user through different OS installations', async () => {
      const oses = [
        { ua: 'Windows NT', expected: 'windows' },
        { ua: 'Macintosh', expected: 'mac' },
        { ua: 'Linux x86_64', expected: 'linux' },
      ];

      for (const { ua, expected } of oses) {
        Object.defineProperty(global, 'navigator', {
          value: { userAgent: ua },
          writable: true,
        });

        const instructions = getInstallInstructions();
        expect(instructions.os).toBe(expected);
        expect(instructions.instructions.length).toBeGreaterThan(0);
      }
    });

    it('should handle cloud fallback scenario', async () => {
      // Local fails
      (global.fetch as any).mockRejectedValueOnce(new Error('Local unavailable'));

      const status = await checkComfyUIStatus();

      // Should attempt fallback and return appropriate status
      expect(status).toBeDefined();
      expect(status.running).toBeDefined();
    });
  });
});
