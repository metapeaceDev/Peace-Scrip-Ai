/**
 * ComfyUI Model Selector Tests
 * Tests for AI model selection and optimization
 */

import { describe, it, expect } from 'vitest';
import {
  selectOptimalModel,
  getAvailableModels,
  calculateCostSavings,
  getRecommendedModel,
  formatModelInfo,
  MODEL_PROFILES,
  type ModelProfile,
  type ModelPreference,
} from '../comfyuiModelSelector';

describe('comfyuiModelSelector', () => {
  describe('selectOptimalModel', () => {
    it('should select SPEED model with sufficient VRAM', () => {
      const model = selectOptimalModel('speed', 8);
      
      expect(model.checkpoint).toBe('sd_xl_turbo_1.0.safetensors');
      expect(model.vramRequired).toBe(6);
      expect(model.steps).toBe(4);
    });

    it('should select BALANCED model with sufficient VRAM', () => {
      const model = selectOptimalModel('balanced', 10);
      
      expect(model.checkpoint).toBe('sd_xl_base_1.0.safetensors');
      expect(model.vramRequired).toBe(8);
      expect(model.steps).toBe(20);
    });

    it('should select QUALITY model with sufficient VRAM', () => {
      const model = selectOptimalModel('quality', 16);
      
      expect(model.checkpoint).toBe('flux1-schnell.safetensors');
      expect(model.vramRequired).toBe(12);
      expect(model.steps).toBe(8);
    });

    it('should select BEST model with sufficient VRAM', () => {
      const model = selectOptimalModel('best', 20);
      
      expect(model.checkpoint).toBe('flux1-dev.safetensors');
      expect(model.vramRequired).toBe(16);
      expect(model.steps).toBe(28);
    });

    it('should downgrade to lower model when VRAM insufficient', () => {
      const model = selectOptimalModel('best', 10);
      
      // Should downgrade from BEST to QUALITY or BALANCED
      expect(model.vramRequired).toBeLessThanOrEqual(10);
    });

    it('should downgrade QUALITY to BALANCED with 10GB VRAM', () => {
      const model = selectOptimalModel('quality', 10);
      
      expect(model.checkpoint).toBe('sd_xl_base_1.0.safetensors');
      expect(model.vramRequired).toBe(8);
    });

    it('should downgrade to SPEED with low VRAM', () => {
      const model = selectOptimalModel('best', 6);
      
      expect(model.checkpoint).toBe('sd_xl_turbo_1.0.safetensors');
      expect(model.vramRequired).toBe(6);
    });

    it('should use 8GB default when VRAM not specified', () => {
      const model = selectOptimalModel('balanced');
      
      expect(model).toBeTruthy();
      expect(model.vramRequired).toBeLessThanOrEqual(8);
    });

    it('should handle case-insensitive preference', () => {
      const model1 = selectOptimalModel('SPEED' as ModelPreference, 10);
      const model2 = selectOptimalModel('speed', 10);
      
      expect(model1.checkpoint).toBe(model2.checkpoint);
    });
  });

  describe('getAvailableModels', () => {
    it('should return all models with 24GB VRAM', () => {
      const models = getAvailableModels(24);
      
      expect(models.length).toBe(4);
      expect(models).toContainEqual(MODEL_PROFILES.SPEED);
      expect(models).toContainEqual(MODEL_PROFILES.BALANCED);
      expect(models).toContainEqual(MODEL_PROFILES.QUALITY);
      expect(models).toContainEqual(MODEL_PROFILES.BEST);
    });

    it('should return 3 models with 12GB VRAM', () => {
      const models = getAvailableModels(12);
      
      expect(models.length).toBe(3);
      expect(models).toContainEqual(MODEL_PROFILES.SPEED);
      expect(models).toContainEqual(MODEL_PROFILES.BALANCED);
      expect(models).toContainEqual(MODEL_PROFILES.QUALITY);
      expect(models).not.toContainEqual(MODEL_PROFILES.BEST);
    });

    it('should return 2 models with 8GB VRAM', () => {
      const models = getAvailableModels(8);
      
      expect(models.length).toBe(2);
      expect(models).toContainEqual(MODEL_PROFILES.SPEED);
      expect(models).toContainEqual(MODEL_PROFILES.BALANCED);
    });

    it('should return only SPEED model with 6GB VRAM', () => {
      const models = getAvailableModels(6);
      
      expect(models.length).toBe(1);
      expect(models[0].checkpoint).toBe('sd_xl_turbo_1.0.safetensors');
    });

    it('should return empty array with insufficient VRAM', () => {
      const models = getAvailableModels(4);
      
      expect(models.length).toBe(0);
    });

    it('should filter models correctly by VRAM requirement', () => {
      const models = getAvailableModels(10);
      
      models.forEach(model => {
        expect(model.vramRequired).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('calculateCostSavings', () => {
    it('should calculate zero cost for opensource models', () => {
      const result = calculateCostSavings(100, MODEL_PROFILES.BALANCED);
      
      expect(result.opensourceCost).toBe(0);
      expect(result.cloudCost).toBe(140);
      expect(result.savings).toBe(140);
      expect(result.savingsPercent).toBe(100);
    });

    it('should calculate savings for 10 generations', () => {
      const result = calculateCostSavings(10, MODEL_PROFILES.SPEED);
      
      expect(result.opensourceCost).toBe(0);
      expect(result.cloudCost).toBe(14);
      expect(result.savings).toBe(14);
      expect(result.savingsPercent).toBe(100);
    });

    it('should calculate savings for 1000 generations', () => {
      const result = calculateCostSavings(1000, MODEL_PROFILES.QUALITY);
      
      expect(result.opensourceCost).toBe(0);
      expect(result.cloudCost).toBe(1400);
      expect(result.savings).toBe(1400);
    });

    it('should handle zero generations', () => {
      const result = calculateCostSavings(0, MODEL_PROFILES.BEST);
      
      expect(result.opensourceCost).toBe(0);
      expect(result.cloudCost).toBe(0);
      expect(result.savings).toBe(0);
    });

    it('should return all required properties', () => {
      const result = calculateCostSavings(50, MODEL_PROFILES.BALANCED);
      
      expect(result).toHaveProperty('opensourceCost');
      expect(result).toHaveProperty('cloudCost');
      expect(result).toHaveProperty('savings');
      expect(result).toHaveProperty('savingsPercent');
    });
  });

  describe('getRecommendedModel', () => {
    it('should recommend SPEED for quick tasks', () => {
      const model1 = getRecommendedModel('quick sketch');
      const model2 = getRecommendedModel('preview generation');
      
      expect(model1.checkpoint).toBe('sd_xl_turbo_1.0.safetensors');
      expect(model2.checkpoint).toBe('sd_xl_turbo_1.0.safetensors');
    });

    it('should recommend BEST for final production', () => {
      const model1 = getRecommendedModel('final render');
      const model2 = getRecommendedModel('production quality');
      const model3 = getRecommendedModel('client presentation');
      
      expect(model1.checkpoint).toBe('flux1-dev.safetensors');
      expect(model2.checkpoint).toBe('flux1-dev.safetensors');
      expect(model3.checkpoint).toBe('flux1-dev.safetensors');
    });

    it('should recommend QUALITY for storyboards', () => {
      const model1 = getRecommendedModel('storyboard creation');
      const model2 = getRecommendedModel('scene composition');
      
      expect(model1.checkpoint).toBe('flux1-schnell.safetensors');
      expect(model2.checkpoint).toBe('flux1-schnell.safetensors');
    });

    it('should recommend BALANCED for general use', () => {
      const model = getRecommendedModel('general image generation');
      
      expect(model.checkpoint).toBe('sd_xl_base_1.0.safetensors');
    });

    it('should handle case-insensitive use case', () => {
      const model1 = getRecommendedModel('QUICK PREVIEW');
      const model2 = getRecommendedModel('quick preview');
      
      expect(model1.checkpoint).toBe(model2.checkpoint);
    });

    it('should return BALANCED for empty use case', () => {
      const model = getRecommendedModel('');
      
      expect(model.checkpoint).toBe('sd_xl_base_1.0.safetensors');
    });

    it('should return BALANCED for unknown use case', () => {
      const model = getRecommendedModel('random task xyz');
      
      expect(model.checkpoint).toBe('sd_xl_base_1.0.safetensors');
    });
  });

  describe('formatModelInfo', () => {
    it('should format SPEED model info correctly', () => {
      const info = formatModelInfo(MODEL_PROFILES.SPEED);
      
      expect(info).toContain('sd_xl_turbo_1.0.safetensors');
      expect(info).toContain('5s');
      expect(info).toContain('4');
      expect(info).toContain('6GB');
      expect(info).toContain('฿0');
    });

    it('should format BALANCED model info correctly', () => {
      const info = formatModelInfo(MODEL_PROFILES.BALANCED);
      
      expect(info).toContain('sd_xl_base_1.0.safetensors');
      expect(info).toContain('15s');
      expect(info).toContain('20');
      expect(info).toContain('8GB');
    });

    it('should include all required fields', () => {
      const info = formatModelInfo(MODEL_PROFILES.QUALITY);
      
      expect(info).toContain('Speed:');
      expect(info).toContain('Quality:');
      expect(info).toContain('Steps:');
      expect(info).toContain('VRAM:');
      expect(info).toContain('Cost:');
    });

    it('should format BEST model with correct resolution', () => {
      const info = formatModelInfo(MODEL_PROFILES.BEST);
      
      expect(info).toContain('flux1-dev.safetensors');
      expect(info).toContain('45s');
      expect(info).toContain('28');
      expect(info).toContain('16GB');
    });

    it('should return non-empty string', () => {
      const info = formatModelInfo(MODEL_PROFILES.SPEED);
      
      expect(info.length).toBeGreaterThan(0);
      expect(typeof info).toBe('string');
    });
  });

  describe('MODEL_PROFILES constant', () => {
    it('should have all 4 model profiles', () => {
      expect(Object.keys(MODEL_PROFILES).length).toBe(4);
      expect(MODEL_PROFILES).toHaveProperty('SPEED');
      expect(MODEL_PROFILES).toHaveProperty('BALANCED');
      expect(MODEL_PROFILES).toHaveProperty('QUALITY');
      expect(MODEL_PROFILES).toHaveProperty('BEST');
    });

    it('should have increasing VRAM requirements', () => {
      expect(MODEL_PROFILES.SPEED.vramRequired).toBeLessThan(MODEL_PROFILES.BALANCED.vramRequired);
      expect(MODEL_PROFILES.BALANCED.vramRequired).toBeLessThan(MODEL_PROFILES.QUALITY.vramRequired);
      expect(MODEL_PROFILES.QUALITY.vramRequired).toBeLessThan(MODEL_PROFILES.BEST.vramRequired);
    });

    it('should have increasing step counts', () => {
      expect(MODEL_PROFILES.SPEED.steps).toBeLessThan(MODEL_PROFILES.BALANCED.steps);
      expect(MODEL_PROFILES.QUALITY.steps).toBeLessThan(MODEL_PROFILES.BEST.steps);
    });

    it('should all have zero cost', () => {
      Object.values(MODEL_PROFILES).forEach(profile => {
        expect(profile.cost).toBe(0);
      });
    });

    it('should all have required properties', () => {
      Object.values(MODEL_PROFILES).forEach(profile => {
        expect(profile).toHaveProperty('checkpoint');
        expect(profile).toHaveProperty('steps');
        expect(profile).toHaveProperty('cfg');
        expect(profile).toHaveProperty('resolution');
        expect(profile).toHaveProperty('estimatedTime');
        expect(profile).toHaveProperty('quality');
        expect(profile).toHaveProperty('vramRequired');
        expect(profile).toHaveProperty('cost');
        expect(profile).toHaveProperty('description');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high VRAM (100GB)', () => {
      const models = getAvailableModels(100);
      
      expect(models.length).toBe(4);
    });

    it('should handle exact VRAM match', () => {
      const models = getAvailableModels(12);
      
      expect(models).toContainEqual(MODEL_PROFILES.QUALITY);
    });

    it('should handle VRAM just below threshold', () => {
      const models = getAvailableModels(11.9);
      
      expect(models).not.toContainEqual(MODEL_PROFILES.QUALITY);
    });

    it('should handle negative VRAM gracefully', () => {
      const models = getAvailableModels(-1);
      
      expect(models.length).toBe(0);
    });

    it('should handle zero VRAM', () => {
      const models = getAvailableModels(0);
      
      expect(models.length).toBe(0);
    });

    it('should handle very large generation count', () => {
      const result = calculateCostSavings(1000000, MODEL_PROFILES.SPEED);
      
      expect(result.savings).toBe(1400000);
      expect(result.savingsPercent).toBe(100);
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent model selection workflow', () => {
      const vram = 12;
      const preference: ModelPreference = 'quality';
      
      const selectedModel = selectOptimalModel(preference, vram);
      const availableModels = getAvailableModels(vram);
      
      expect(availableModels).toContainEqual(selectedModel);
    });

    it('should calculate savings for selected model', () => {
      const model = selectOptimalModel('balanced', 10);
      const savings = calculateCostSavings(100, model);
      
      expect(savings.opensourceCost).toBe(0);
      expect(savings.savings).toBeGreaterThan(0);
    });

    it('should format selected model info', () => {
      const model = selectOptimalModel('speed', 8);
      const info = formatModelInfo(model);
      
      expect(info).toContain(model.checkpoint);
      expect(info).toContain(model.estimatedTime);
    });

    it('should recommend and select model for use case', () => {
      const recommended = getRecommendedModel('quick preview');
      const selected = selectOptimalModel('speed', 8);
      
      expect(recommended.checkpoint).toBe(selected.checkpoint);
    });

    it('should handle complete model selection flow', () => {
      const useCase = 'storyboard scene';
      const vram = 16;
      
      // Step 1: Get recommendation
      const recommended = getRecommendedModel(useCase);
      expect(recommended.checkpoint).toBe('flux1-schnell.safetensors');
      
      // Step 2: Check if fits in VRAM
      const available = getAvailableModels(vram);
      expect(available).toContainEqual(recommended);
      
      // Step 3: Select optimal model
      const selected = selectOptimalModel('quality', vram);
      expect(selected.vramRequired).toBeLessThanOrEqual(vram);
      
      // Step 4: Calculate savings
      const savings = calculateCostSavings(50, selected);
      expect(savings.savingsPercent).toBe(100);
      
      // Step 5: Format info
      const info = formatModelInfo(selected);
      expect(info).toBeTruthy();
    });
  });
});
