import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProviderConfig,
  saveProviderConfig,
  setProviderMode,
  setModelPreference,
  setAvailableVRAM,
  isUsingOpenSource,
  isUsingCloud,
  type ProviderConfig,
  type ProviderMode,
  type ModelPreference,
} from '../providerConfigStore';

describe('providerConfigStore', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // @ts-expect-error - mocking localStorage
    global.localStorage = localStorageMock;
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getProviderConfig', () => {
    it('should return default config when localStorage is empty', () => {
      const config = getProviderConfig();

      expect(config).toEqual({
        mode: 'hybrid',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });
    });

    it('should return stored config from localStorage', () => {
      const storedConfig: ProviderConfig = {
        mode: 'cloud',
        modelPreference: 'quality',
        availableVRAM: 24,
        autoFallback: false,
      };
      localStorageMock.setItem(
        'peace-script-provider-config',
        JSON.stringify(storedConfig)
      );

      const config = getProviderConfig();

      expect(config).toEqual(storedConfig);
    });

    it('should merge stored config with defaults', () => {
      // Store partial config
      localStorageMock.setItem(
        'peace-script-provider-config',
        JSON.stringify({ mode: 'open-source' })
      );

      const config = getProviderConfig();

      expect(config).toEqual({
        mode: 'open-source',
        modelPreference: 'balanced', // from default
        availableVRAM: 16, // from default
        autoFallback: true, // from default
      });
    });

    it('should return default config on JSON parse error', () => {
      localStorageMock.setItem('peace-script-provider-config', 'invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = getProviderConfig();

      expect(config).toEqual({
        mode: 'hybrid',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading provider config:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should return default config if localStorage throws error', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = getProviderConfig();

      expect(config).toEqual({
        mode: 'hybrid',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('saveProviderConfig', () => {
    it('should save config to localStorage', () => {
      const config: ProviderConfig = {
        mode: 'cloud',
        modelPreference: 'speed',
        availableVRAM: 8,
        autoFallback: false,
      };

      saveProviderConfig(config);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'peace-script-provider-config',
        JSON.stringify(config)
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config: ProviderConfig = {
        mode: 'cloud',
        modelPreference: 'best',
        availableVRAM: 32,
        autoFallback: true,
      };

      expect(() => saveProviderConfig(config)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving provider config:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('setProviderMode', () => {
    it('should update provider mode while preserving other settings', () => {
      // Set initial config
      const initialConfig: ProviderConfig = {
        mode: 'hybrid',
        modelPreference: 'quality',
        availableVRAM: 24,
        autoFallback: true,
      };
      saveProviderConfig(initialConfig);
      vi.clearAllMocks();

      setProviderMode('cloud');

      const saved = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1] as string
      );
      expect(saved).toEqual({
        mode: 'cloud',
        modelPreference: 'quality', // preserved
        availableVRAM: 24, // preserved
        autoFallback: true, // preserved
      });
    });

    it('should work with all provider modes', () => {
      const modes: ProviderMode[] = ['cloud', 'open-source', 'hybrid'];

      modes.forEach((mode) => {
        vi.clearAllMocks();
        setProviderMode(mode);

        const saved = JSON.parse(
          localStorageMock.setItem.mock.calls[0][1] as string
        );
        expect(saved.mode).toBe(mode);
      });
    });
  });

  describe('setModelPreference', () => {
    it('should update model preference while preserving other settings', () => {
      const initialConfig: ProviderConfig = {
        mode: 'cloud',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: false,
      };
      saveProviderConfig(initialConfig);
      vi.clearAllMocks();

      setModelPreference('quality');

      const saved = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1] as string
      );
      expect(saved).toEqual({
        mode: 'cloud', // preserved
        modelPreference: 'quality',
        availableVRAM: 16, // preserved
        autoFallback: false, // preserved
      });
    });

    it('should work with all model preferences', () => {
      const preferences: ModelPreference[] = ['speed', 'balanced', 'quality', 'best'];

      preferences.forEach((preference) => {
        vi.clearAllMocks();
        setModelPreference(preference);

        const saved = JSON.parse(
          localStorageMock.setItem.mock.calls[0][1] as string
        );
        expect(saved.modelPreference).toBe(preference);
      });
    });
  });

  describe('setAvailableVRAM', () => {
    it('should update available VRAM while preserving other settings', () => {
      const initialConfig: ProviderConfig = {
        mode: 'open-source',
        modelPreference: 'speed',
        availableVRAM: 8,
        autoFallback: true,
      };
      saveProviderConfig(initialConfig);
      vi.clearAllMocks();

      setAvailableVRAM(32);

      const saved = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1] as string
      );
      expect(saved).toEqual({
        mode: 'open-source', // preserved
        modelPreference: 'speed', // preserved
        availableVRAM: 32,
        autoFallback: true, // preserved
      });
    });

    it('should handle different VRAM values', () => {
      const vramValues = [4, 8, 12, 16, 24, 32, 48, 64];

      vramValues.forEach((vram) => {
        vi.clearAllMocks();
        setAvailableVRAM(vram);

        const saved = JSON.parse(
          localStorageMock.setItem.mock.calls[0][1] as string
        );
        expect(saved.availableVRAM).toBe(vram);
      });
    });
  });

  describe('isUsingOpenSource', () => {
    it('should return true for open-source mode', () => {
      saveProviderConfig({
        mode: 'open-source',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });

      expect(isUsingOpenSource()).toBe(true);
    });

    it('should return true for hybrid mode', () => {
      saveProviderConfig({
        mode: 'hybrid',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });

      expect(isUsingOpenSource()).toBe(true);
    });

    it('should return false for cloud mode', () => {
      saveProviderConfig({
        mode: 'cloud',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });

      expect(isUsingOpenSource()).toBe(false);
    });
  });

  describe('isUsingCloud', () => {
    it('should return true for cloud mode', () => {
      saveProviderConfig({
        mode: 'cloud',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });

      expect(isUsingCloud()).toBe(true);
    });

    it('should return true for hybrid mode', () => {
      saveProviderConfig({
        mode: 'hybrid',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });

      expect(isUsingCloud()).toBe(true);
    });

    it('should return false for open-source mode', () => {
      saveProviderConfig({
        mode: 'open-source',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: true,
      });

      expect(isUsingCloud()).toBe(false);
    });
  });

  describe('Integration - Full workflow', () => {
    it('should handle complete configuration lifecycle', () => {
      // Initial state
      const initial = getProviderConfig();
      expect(initial.mode).toBe('hybrid');

      // User switches to cloud
      setProviderMode('cloud');
      expect(getProviderConfig().mode).toBe('cloud');

      // User adjusts preferences
      setModelPreference('quality');
      expect(getProviderConfig().modelPreference).toBe('quality');

      // User updates VRAM
      setAvailableVRAM(24);
      expect(getProviderConfig().availableVRAM).toBe(24);

      // Verify final state
      const final = getProviderConfig();
      expect(final).toEqual({
        mode: 'cloud',
        modelPreference: 'quality',
        availableVRAM: 24,
        autoFallback: true,
      });

      expect(isUsingCloud()).toBe(true);
      expect(isUsingOpenSource()).toBe(false);
    });

    it('should handle switch from cloud to open-source', () => {
      // Start with cloud
      saveProviderConfig({
        mode: 'cloud',
        modelPreference: 'best',
        availableVRAM: 8,
        autoFallback: false,
      });
      expect(isUsingCloud()).toBe(true);
      expect(isUsingOpenSource()).toBe(false);

      // Switch to open-source
      setProviderMode('open-source');
      expect(isUsingCloud()).toBe(false);
      expect(isUsingOpenSource()).toBe(true);

      // Adjust VRAM for local models
      setAvailableVRAM(16);
      setModelPreference('balanced');

      const final = getProviderConfig();
      expect(final).toEqual({
        mode: 'open-source',
        modelPreference: 'balanced',
        availableVRAM: 16,
        autoFallback: false, // preserved from initial
      });
    });

    it('should handle hybrid mode correctly', () => {
      setProviderMode('hybrid');
      setModelPreference('balanced');

      const config = getProviderConfig();
      expect(config.mode).toBe('hybrid');

      // Hybrid should use both
      expect(isUsingCloud()).toBe(true);
      expect(isUsingOpenSource()).toBe(true);
    });
  });
});
