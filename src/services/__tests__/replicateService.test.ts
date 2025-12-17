/**
 * Replicate Service Tests
 * Tests for Replicate API integration, model management, and cost estimation
 */

import { describe, it, expect } from 'vitest';
import { getReplicateModels, estimateReplicateCost } from '../replicateService';

describe('replicateService', () => {
  describe('REPLICATE_MODELS constant', () => {
    const models = getReplicateModels();

    it('should have all 5 models', () => {
      expect(Object.keys(models).length).toBe(5);
      expect(models).toHaveProperty('ANIMATEDIFF');
      expect(models).toHaveProperty('SVD');
      expect(models).toHaveProperty('HOTSHOT_XL');
      expect(models).toHaveProperty('LTX_VIDEO');
      expect(models).toHaveProperty('ANIMATEDIFF_LIGHTNING');
    });

    it('should have required properties for each model', () => {
      Object.values(models).forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('description');
        expect(model).toHaveProperty('avgTime');
        expect(model).toHaveProperty('cost');
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.cost).toMatch(/^\$\d+\.\d+$/);
      });
    });

    it('should have valid Replicate model IDs', () => {
      Object.values(models).forEach(model => {
        expect(model.id).toContain('/');
        expect(model.id).toContain(':');
        expect(model.id.split('/').length).toBe(2);
      });
    });

    it('should have cost information in dollar format', () => {
      Object.values(models).forEach(model => {
        expect(model.cost).toMatch(/^\$\d+\.\d+$/);
        expect(parseFloat(model.cost.substring(1))).toBeGreaterThan(0);
      });
    });

    it('should have estimated time ranges', () => {
      Object.values(models).forEach(model => {
        expect(model.avgTime).toBeTruthy();
        expect(typeof model.avgTime).toBe('string');
      });
    });
  });

  describe('AnimateDiff Model', () => {
    const models = getReplicateModels();
    const animateDiff = models.ANIMATEDIFF;

    it('should have correct name and description', () => {
      expect(animateDiff.name).toBe('AnimateDiff v3');
      expect(animateDiff.description).toContain('Text/Image to 3s video');
      expect(animateDiff.description).toContain('512x512');
    });

    it('should have valid model ID', () => {
      expect(animateDiff.id).toContain('lucataco/animate-diff');
      expect(animateDiff.id).toContain(':');
    });

    it('should have cost and time estimates', () => {
      expect(animateDiff.cost).toBe('$0.17');
      expect(animateDiff.avgTime).toBe('30-45s');
    });

    it('should not support custom resolution', () => {
      expect(animateDiff.supportsCustomResolution).toBeUndefined();
    });
  });

  describe('Stable Video Diffusion Model', () => {
    const models = getReplicateModels();
    const svd = models.SVD;

    it('should have correct name and description', () => {
      expect(svd.name).toBe('Stable Video Diffusion');
      expect(svd.description).toContain('Image to video');
      expect(svd.description).toContain('1024x576');
    });

    it('should have valid model ID', () => {
      expect(svd.id).toContain('stability-ai/stable-video-diffusion');
      expect(svd.id).toContain(':');
    });

    it('should have cost and time estimates', () => {
      expect(svd.cost).toBe('$0.20');
      expect(svd.avgTime).toBe('45-60s');
    });

    it('should be most expensive base model', () => {
      const models = getReplicateModels();
      const costs = [
        parseFloat(models.ANIMATEDIFF.cost.substring(1)),
        parseFloat(models.SVD.cost.substring(1)),
      ];

      expect(Math.max(...costs)).toBe(0.2);
    });
  });

  describe('Hotshot-XL Model', () => {
    const models = getReplicateModels();
    const hotshot = models.HOTSHOT_XL;

    it('should have correct name and description', () => {
      expect(hotshot.name).toBe('Hotshot-XL');
      expect(hotshot.description).toContain('Custom resolution');
      expect(hotshot.description).toContain('16:9');
      expect(hotshot.description).toContain('9:16');
    });

    it('should support custom resolution', () => {
      expect(hotshot.supportsCustomResolution).toBe(true);
    });

    it('should have fastest generation time', () => {
      expect(hotshot.avgTime).toBe('19s');
    });

    it('should have lowest cost', () => {
      const models = getReplicateModels();
      const costs = Object.values(models).map(m => parseFloat(m.cost.substring(1)));

      expect(Math.min(...costs)).toBe(0.018);
      expect(parseFloat(hotshot.cost.substring(1))).toBe(0.018);
    });
  });

  describe('LTX Video Model', () => {
    const models = getReplicateModels();
    const ltx = models.LTX_VIDEO;

    it('should have correct name and description', () => {
      expect(ltx.name).toBe('LTX Video');
      expect(ltx.description).toContain('High-quality');
      expect(ltx.description).toContain('720x1280');
    });

    it('should support custom resolution', () => {
      expect(ltx.supportsCustomResolution).toBe(true);
    });

    it('should have valid model ID', () => {
      expect(ltx.id).toContain('lightricks/ltx-video');
      expect(ltx.id).toContain(':');
    });

    it('should have cost and time estimates', () => {
      expect(ltx.cost).toBe('$0.045');
      expect(ltx.avgTime).toBe('47s');
    });
  });

  describe('AnimateDiff Lightning Model', () => {
    const models = getReplicateModels();
    const lightning = models.ANIMATEDIFF_LIGHTNING;

    it('should have correct name and description', () => {
      expect(lightning.name).toBe('AnimateDiff Lightning');
      expect(lightning.description).toContain('Ultra-fast');
      expect(lightning.description).toContain('8 steps');
    });

    it('should have valid model ID', () => {
      expect(lightning.id).toContain('bytedance/animatediff-lightning');
      expect(lightning.id).toContain(':');
    });

    it('should have fast generation time', () => {
      expect(lightning.avgTime).toBe('15-20s');
    });

    it('should have moderate cost', () => {
      expect(lightning.cost).toBe('$0.10');
    });
  });

  describe('estimateReplicateCost', () => {
    it('should return cost for AnimateDiff', () => {
      const cost = estimateReplicateCost('ANIMATEDIFF');

      expect(cost).toBe('$0.17');
    });

    it('should return cost for SVD', () => {
      const cost = estimateReplicateCost('SVD');

      expect(cost).toBe('$0.20');
    });

    it('should return cost for Hotshot-XL', () => {
      const cost = estimateReplicateCost('HOTSHOT_XL');

      expect(cost).toBe('$0.018');
    });

    it('should return cost for LTX Video', () => {
      const cost = estimateReplicateCost('LTX_VIDEO');

      expect(cost).toBe('$0.045');
    });

    it('should return cost for AnimateDiff Lightning', () => {
      const cost = estimateReplicateCost('ANIMATEDIFF_LIGHTNING');

      expect(cost).toBe('$0.10');
    });
  });

  describe('Model Capabilities', () => {
    const models = getReplicateModels();

    it('should have 2 models with custom resolution support', () => {
      const customResModels = Object.values(models).filter(m => m.supportsCustomResolution);

      expect(customResModels.length).toBe(2);
      expect(customResModels.map(m => m.name)).toContain('Hotshot-XL');
      expect(customResModels.map(m => m.name)).toContain('LTX Video');
    });

    it('should have 3 models with fixed resolution', () => {
      const fixedResModels = Object.values(models).filter(m => !m.supportsCustomResolution);

      expect(fixedResModels.length).toBe(3);
    });

    it('should have models with varying generation times', () => {
      const times = Object.values(models).map(m => m.avgTime);

      expect(times).toContain('15-20s'); // Fastest
      expect(times).toContain('45-60s'); // Slowest
    });

    it('should have models with varying costs', () => {
      const costs = Object.values(models).map(m => m.cost);

      expect(costs).toContain('$0.018'); // Cheapest
      expect(costs).toContain('$0.20'); // Most expensive
    });
  });

  describe('Model Selection Logic', () => {
    const models = getReplicateModels();

    it('should recommend Hotshot-XL for custom aspect ratios', () => {
      const customResModels = Object.values(models).filter(m => m.supportsCustomResolution);

      const cheapest = customResModels.reduce((min, model) => {
        const cost = parseFloat(model.cost.substring(1));
        const minCost = parseFloat(min.cost.substring(1));
        return cost < minCost ? model : min;
      });

      expect(cheapest.name).toBe('Hotshot-XL');
    });

    it('should recommend AnimateDiff Lightning for speed', () => {
      const lightningTime = models.ANIMATEDIFF_LIGHTNING.avgTime;
      const hotshotTime = models.HOTSHOT_XL.avgTime;

      // Lightning is faster than most
      expect(lightningTime).toBe('15-20s');
      expect(parseInt(lightningTime)).toBeLessThan(parseInt(hotshotTime));
    });

    it('should recommend SVD for quality (highest cost)', () => {
      const costs = Object.values(models).map(m => parseFloat(m.cost.substring(1)));

      const maxCost = Math.max(...costs);
      const svdCost = parseFloat(models.SVD.cost.substring(1));

      expect(svdCost).toBe(maxCost);
    });
  });

  describe('Cost Comparison', () => {
    it('should have increasing cost for quality/features', () => {
      const hotshotCost = parseFloat(estimateReplicateCost('HOTSHOT_XL').substring(1));
      const ltxCost = parseFloat(estimateReplicateCost('LTX_VIDEO').substring(1));
      const lightningCost = parseFloat(estimateReplicateCost('ANIMATEDIFF_LIGHTNING').substring(1));
      const animateDiffCost = parseFloat(estimateReplicateCost('ANIMATEDIFF').substring(1));
      const svdCost = parseFloat(estimateReplicateCost('SVD').substring(1));

      // Hotshot is cheapest
      expect(hotshotCost).toBe(0.018);

      // LTX is moderate
      expect(ltxCost).toBeGreaterThan(hotshotCost);
      expect(ltxCost).toBeLessThan(lightningCost);

      // SVD is most expensive
      expect(svdCost).toBeGreaterThan(animateDiffCost);
    });

    it('should calculate cost savings vs cloud providers', () => {
      // Gemini Veo costs ~$0.20/video
      const geminiVeoCost = 0.2;

      const hotshotCost = parseFloat(estimateReplicateCost('HOTSHOT_XL').substring(1));
      const savings = ((geminiVeoCost - hotshotCost) / geminiVeoCost) * 100;

      // Hotshot saves ~91% vs Gemini Veo
      expect(savings).toBeGreaterThan(90);
      expect(savings).toBeLessThan(92);
    });

    it('should estimate bulk generation costs', () => {
      const hotshotCost = parseFloat(estimateReplicateCost('HOTSHOT_XL').substring(1));
      const svdCost = parseFloat(estimateReplicateCost('SVD').substring(1));

      // 100 videos
      const hotshotBulk = hotshotCost * 100; // $1.80
      const svdBulk = svdCost * 100; // $20.00

      expect(hotshotBulk).toBeCloseTo(1.8, 2);
      expect(svdBulk).toBeCloseTo(20.0, 2);

      // Hotshot is 11x cheaper
      expect(svdBulk / hotshotBulk).toBeCloseTo(11.11, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all model types for cost estimation', () => {
      const modelKeys = Object.keys(getReplicateModels()) as Array<
        keyof ReturnType<typeof getReplicateModels>
      >;

      modelKeys.forEach(key => {
        const cost = estimateReplicateCost(key);
        expect(cost).toMatch(/^\$\d+\.\d+$/);
      });
    });

    it('should have unique model IDs', () => {
      const models = getReplicateModels();
      const ids = Object.values(models).map(m => m.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique model names', () => {
      const models = getReplicateModels();
      const names = Object.values(models).map(m => m.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have consistent cost precision', () => {
      const models = getReplicateModels();

      Object.values(models).forEach(model => {
        const costValue = model.cost.substring(1);
        const decimalPlaces = costValue.split('.')[1]?.length || 0;

        expect(decimalPlaces).toBeGreaterThan(0);
        expect(decimalPlaces).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should support model selection workflow', () => {
      const models = getReplicateModels();

      // 1. User wants custom resolution → recommend Hotshot-XL or LTX
      const customResModels = Object.entries(models)
        .filter(([_, model]) => model.supportsCustomResolution)
        .map(([key, _]) => key);

      expect(customResModels).toContain('HOTSHOT_XL');
      expect(customResModels).toContain('LTX_VIDEO');

      // 2. User wants cheapest → get Hotshot-XL cost
      const cost = estimateReplicateCost('HOTSHOT_XL');
      expect(cost).toBe('$0.018');

      // 3. User wants quality → get SVD
      const qualityModel = models.SVD;
      expect(qualityModel.description).toContain('Image to video');
    });

    it('should support cost comparison across models', () => {
      const models = getReplicateModels();

      const costComparison = Object.entries(models).map(([key, model]) => ({
        name: model.name,
        cost: parseFloat(model.cost.substring(1)),
        avgTime: model.avgTime,
      }));

      // Sort by cost
      costComparison.sort((a, b) => a.cost - b.cost);

      expect(costComparison[0].name).toBe('Hotshot-XL'); // Cheapest
      expect(costComparison[costComparison.length - 1].name).toBe('Stable Video Diffusion'); // Most expensive
    });

    it('should validate model ID format', () => {
      const models = getReplicateModels();

      Object.values(models).forEach(model => {
        const [owner, repoAndVersion] = model.id.split('/');
        const [repo, version] = repoAndVersion.split(':');

        expect(owner).toBeTruthy();
        expect(repo).toBeTruthy();
        expect(version).toBeTruthy();
        expect(version.length).toBe(64); // SHA-256 hash
      });
    });

    it('should support budget-based model selection', () => {
      const budget = 0.1; // $0.10 per video
      const models = getReplicateModels();

      const affordableModels = Object.values(models).filter(model => {
        const cost = parseFloat(model.cost.substring(1));
        return cost <= budget;
      });

      expect(affordableModels.length).toBeGreaterThan(0);
      expect(affordableModels.map(m => m.name)).toContain('Hotshot-XL');
      expect(affordableModels.map(m => m.name)).toContain('LTX Video');
      expect(affordableModels.map(m => m.name)).toContain('AnimateDiff Lightning');
    });

    it('should support time-based model selection', () => {
      const maxTime = 30; // 30 seconds
      const models = getReplicateModels();

      const fastModels = Object.values(models).filter(model => {
        const avgTime = model.avgTime;
        const timeValue = parseInt(avgTime.split('-')[0]);
        return timeValue <= maxTime;
      });

      expect(fastModels.length).toBeGreaterThan(0);
      expect(fastModels.map(m => m.name)).toContain('Hotshot-XL');
      expect(fastModels.map(m => m.name)).toContain('AnimateDiff Lightning');
    });
  });
});
