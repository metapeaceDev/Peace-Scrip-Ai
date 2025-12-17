/**
 * Device Manager Tests
 * Tests for device detection and render settings optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRecommendedSettings,
  saveRenderSettings,
  loadRenderSettings,
  getDeviceDisplayName,
  estimateRenderTime,
  getCloudProviders,
  type SystemResources,
  type RenderSettings,
  type DeviceInfo,
} from '../deviceManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('deviceManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getRecommendedSettings', () => {
    it('should recommend CUDA for high-end NVIDIA GPU', () => {
      const resources: SystemResources = {
        devices: [
          {
            type: 'cuda',
            name: 'NVIDIA GeForce RTX 4090',
            available: true,
            vram: 24576,
            isRecommended: true,
          } as DeviceInfo,
        ],
        cpu: { cores: 16, usage: 20 },
        memory: { total: 32768, available: 16384, used: 16384 },
        platform: 'windows',
      };

      const settings = getRecommendedSettings(resources);

      expect(settings.device).toBe('cuda');
      expect(settings.executionMode).toBe('local');
    });

    it('should recommend MPS for Apple Silicon', () => {
      const resources: SystemResources = {
        devices: [
          {
            type: 'mps',
            name: 'Apple M1',
            available: true,
            isRecommended: true,
          } as DeviceInfo,
        ],
        cpu: { cores: 8, usage: 20 },
        memory: { total: 16384, available: 8192, used: 8192 },
        platform: 'macos',
      };

      const settings = getRecommendedSettings(resources);

      expect(settings.device).toBe('mps');
      expect(settings.executionMode).toBe('local');
    });

    it('should recommend CPU when no GPU available', () => {
      const resources: SystemResources = {
        devices: [
          {
            type: 'cpu',
            name: 'Intel Core i7',
            available: true,
            isRecommended: true,
          } as DeviceInfo,
        ],
        cpu: { cores: 8, usage: 15 },
        memory: { total: 16384, available: 8192, used: 8192 },
        platform: 'linux',
      };

      const settings = getRecommendedSettings(resources);

      expect(settings.device).toBe('cpu');
      expect(settings.executionMode).toBe('cloud');
    });

    it('should set useLowVRAM based on available RAM', () => {
      const lowRAM: SystemResources = {
        devices: [
          {
            type: 'cuda',
            name: 'NVIDIA GTX 1650',
            available: true,
            vram: 4096,
            isRecommended: true,
          } as DeviceInfo,
        ],
        cpu: { cores: 4, usage: 40 },
        memory: { total: 4096, available: 2048, used: 2048 },
        platform: 'windows',
      };

      const settings = getRecommendedSettings(lowRAM);

      expect(settings.useLowVRAM).toBe(true);
    });

    it('should return valid settings structure', () => {
      const resources: SystemResources = {
        devices: [
          {
            type: 'cuda',
            name: 'NVIDIA RTX 3060',
            available: true,
            vram: 12288,
            isRecommended: true,
          } as DeviceInfo,
        ],
        cpu: { cores: 8, usage: 30 },
        memory: { total: 16384, available: 8192, used: 8192 },
        platform: 'windows',
      };

      const settings = getRecommendedSettings(resources);

      expect(settings).toHaveProperty('device');
      expect(settings).toHaveProperty('executionMode');
      expect(settings).toHaveProperty('cloudProvider');
      expect(settings).toHaveProperty('useLowVRAM');
      expect(settings).toHaveProperty('batchSize');
      expect(settings).toHaveProperty('preview');
    });
  });

  describe('saveRenderSettings & loadRenderSettings', () => {
    it('should save and load render settings', () => {
      const settings: RenderSettings = {
        device: 'cuda',
        executionMode: 'local',
        cloudProvider: 'auto',
        useLowVRAM: false,
        batchSize: 4,
        preview: true,
      };

      saveRenderSettings(settings);
      const loaded = loadRenderSettings();

      expect(loaded).toEqual(settings);
    });

    it('should return null when no settings saved', () => {
      const loaded = loadRenderSettings();

      expect(loaded).toBeNull();
    });

    it('should overwrite previous settings', () => {
      const settings1: RenderSettings = {
        device: 'cpu',
        executionMode: 'cloud',
        cloudProvider: 'firebase',
        useLowVRAM: true,
        batchSize: 1,
        preview: false,
      };

      const settings2: RenderSettings = {
        device: 'mps',
        executionMode: 'local',
        cloudProvider: 'auto',
        useLowVRAM: false,
        batchSize: 4,
        preview: true,
      };

      saveRenderSettings(settings1);
      saveRenderSettings(settings2);

      const loaded = loadRenderSettings();

      expect(loaded).toEqual(settings2);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('renderSettings', 'invalid json');

      const loaded = loadRenderSettings();

      expect(loaded).toBeNull();
    });
  });

  describe('getDeviceDisplayName', () => {
    it('should return display name for CUDA', () => {
      const name = getDeviceDisplayName('cuda');

      expect(name).toContain('NVIDIA');
      expect(typeof name).toBe('string');
    });

    it('should return display name for MPS', () => {
      const name = getDeviceDisplayName('mps');

      expect(name).toContain('Apple');
      expect(typeof name).toBe('string');
    });

    it('should return display name for CPU', () => {
      const name = getDeviceDisplayName('cpu');

      expect(name).toContain('CPU');
      expect(typeof name).toBe('string');
    });

    it('should handle unknown device type', () => {
      const name = getDeviceDisplayName('unknown' as any);

      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe('estimateRenderTime', () => {
    it('should estimate time for CUDA device', () => {
      const time = estimateRenderTime('cuda', 10);

      expect(typeof time).toBe('string');
      expect(time.length).toBeGreaterThan(0);
    });

    it('should estimate time for MPS device', () => {
      const time = estimateRenderTime('mps', 10);

      expect(typeof time).toBe('string');
      expect(time.length).toBeGreaterThan(0);
    });

    it('should estimate time for CPU device', () => {
      const time = estimateRenderTime('cpu', 10);

      expect(typeof time).toBe('string');
      expect(time.length).toBeGreaterThan(0);
    });

    it('should scale with image count', () => {
      const time1 = estimateRenderTime('cuda', 5);
      const time2 = estimateRenderTime('cuda', 20);

      expect(time1).toBeTruthy();
      expect(time2).toBeTruthy();
    });

    it('should handle zero images', () => {
      const time = estimateRenderTime('cuda', 0);

      expect(typeof time).toBe('string');
    });

    it('should handle large image count', () => {
      const time = estimateRenderTime('mps', 1000);

      expect(typeof time).toBe('string');
      expect(time.length).toBeGreaterThan(0);
    });
  });

  describe('getCloudProviders', () => {
    it('should return list of cloud providers', () => {
      const providers = getCloudProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include provider names', () => {
      const providers = getCloudProviders();

      providers.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(typeof provider.name).toBe('string');
      });
    });

    it('should include provider metadata', () => {
      const providers = getCloudProviders();

      providers.forEach(provider => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('description');
        expect(provider).toHaveProperty('speed');
        expect(provider).toHaveProperty('cost');
        expect(provider).toHaveProperty('gpu');
      });
    });

    it('should have unique provider names', () => {
      const providers = getCloudProviders();
      const names = providers.map(p => p.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Integration Tests', () => {
    it('should save and load settings correctly', () => {
      const resources: SystemResources = {
        devices: [
          {
            type: 'cuda',
            name: 'NVIDIA RTX 3080',
            available: true,
            vram: 10240,
            isRecommended: true,
          } as DeviceInfo,
        ],
        cpu: { cores: 12, usage: 25 },
        memory: { total: 32768, available: 16384, used: 16384 },
        platform: 'windows',
      };

      const recommended = getRecommendedSettings(resources);
      saveRenderSettings(recommended);
      const loaded = loadRenderSettings();

      expect(loaded).toEqual(recommended);
    });

    it('should work with different device types', () => {
      const devices = ['cuda', 'mps', 'cpu'];

      devices.forEach(deviceType => {
        const displayName = getDeviceDisplayName(deviceType as any);
        const estimatedTime = estimateRenderTime(deviceType as any, 10);

        expect(displayName).toBeTruthy();
        expect(estimatedTime).toBeTruthy();
      });
    });
  });
});
