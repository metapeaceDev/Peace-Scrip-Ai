/**
 * ComfyUI Workflow Builder Tests
 * Tests for workflow generation, node connections, and parameter validation
 */

import { describe, it, expect } from 'vitest';
import {
  MODE_PRESETS,
  buildSDXLWorkflow,
  buildSDXLFaceIDWorkflow,
  buildFluxWorkflow,
  buildIPAdapterWorkflow,
  buildWorkflow,
  type GenerationMode,
  type ModeSettings,
} from '../comfyuiWorkflowBuilder';

describe('comfyuiWorkflowBuilder', () => {
  describe('MODE_PRESETS constant', () => {
    it('should have all 3 generation modes', () => {
      expect(Object.keys(MODE_PRESETS).length).toBe(3);
      expect(MODE_PRESETS).toHaveProperty('quality');
      expect(MODE_PRESETS).toHaveProperty('balanced');
      expect(MODE_PRESETS).toHaveProperty('speed');
    });

    it('should have required properties for each mode', () => {
      Object.values(MODE_PRESETS).forEach(mode => {
        expect(mode).toHaveProperty('steps');
        expect(mode).toHaveProperty('weight');
        expect(mode).toHaveProperty('cfg');
        expect(mode).toHaveProperty('loraStrength');
        expect(typeof mode.steps).toBe('number');
        expect(typeof mode.weight).toBe('number');
        expect(typeof mode.cfg).toBe('number');
        expect(typeof mode.loraStrength).toBe('number');
      });
    });

    it('should have quality mode with highest settings', () => {
      const quality = MODE_PRESETS.quality;

      expect(quality.steps).toBe(25);
      expect(quality.weight).toBe(0.95);
      expect(quality.cfg).toBe(8.0);
      expect(quality.loraStrength).toBe(0.8);
    });

    it('should have balanced mode with moderate settings', () => {
      const balanced = MODE_PRESETS.balanced;

      expect(balanced.steps).toBe(20);
      expect(balanced.weight).toBe(0.9);
      expect(balanced.cfg).toBe(8.0);
      expect(balanced.loraStrength).toBe(0.8);
    });

    it('should have speed mode with lowest settings', () => {
      const speed = MODE_PRESETS.speed;

      expect(speed.steps).toBe(15);
      expect(speed.weight).toBe(0.85);
      expect(speed.cfg).toBe(7.5);
      expect(speed.loraStrength).toBe(0.75);
    });

    it('should have decreasing steps from quality to speed', () => {
      expect(MODE_PRESETS.quality.steps).toBeGreaterThan(MODE_PRESETS.balanced.steps);
      expect(MODE_PRESETS.balanced.steps).toBeGreaterThan(MODE_PRESETS.speed.steps);
    });

    it('should have decreasing weight from quality to speed', () => {
      expect(MODE_PRESETS.quality.weight).toBeGreaterThan(MODE_PRESETS.balanced.weight);
      expect(MODE_PRESETS.balanced.weight).toBeGreaterThan(MODE_PRESETS.speed.weight);
    });

    it('should have all weights between 0 and 1', () => {
      Object.values(MODE_PRESETS).forEach(mode => {
        expect(mode.weight).toBeGreaterThan(0);
        expect(mode.weight).toBeLessThanOrEqual(1);
        expect(mode.loraStrength).toBeGreaterThan(0);
        expect(mode.loraStrength).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('buildSDXLWorkflow', () => {
    it('should create basic workflow with prompt', () => {
      const workflow = buildSDXLWorkflow('a beautiful sunset');

      expect(workflow).toBeDefined();
      expect(workflow['3']).toBeDefined(); // KSampler
      expect(workflow['4']).toBeDefined(); // CheckpointLoader
      expect(workflow['5']).toBeDefined(); // EmptyLatentImage
      expect(workflow['6']).toBeDefined(); // Positive CLIP
      expect(workflow['7']).toBeDefined(); // Negative CLIP
    });

    it('should use default checkpoint', () => {
      const workflow = buildSDXLWorkflow('test prompt');

      expect(workflow['4'].inputs.ckpt_name).toBe('sd_xl_base_1.0.safetensors');
      expect(workflow['4'].class_type).toBe('CheckpointLoaderSimple');
    });

    it('should allow custom checkpoint', () => {
      const workflow = buildSDXLWorkflow('test', {
        ckpt_name: 'custom_model.safetensors',
      });

      expect(workflow['4'].inputs.ckpt_name).toBe('custom_model.safetensors');
    });

    it('should generate random seed if not provided', () => {
      const workflow1 = buildSDXLWorkflow('test');
      const workflow2 = buildSDXLWorkflow('test');

      expect(workflow1['3'].inputs.seed).toBeDefined();
      expect(workflow2['3'].inputs.seed).toBeDefined();
      expect(typeof workflow1['3'].inputs.seed).toBe('number');
    });

    it('should use provided seed', () => {
      const workflow = buildSDXLWorkflow('test', { seed: 12345 });

      expect(workflow['3'].inputs.seed).toBe(12345);
    });

    it('should use default sampling parameters', () => {
      const workflow = buildSDXLWorkflow('test');

      expect(workflow['3'].inputs.steps).toBe(25);
      expect(workflow['3'].inputs.cfg).toBe(7.5);
      expect(workflow['3'].inputs.sampler_name).toBe('euler');
      expect(workflow['3'].inputs.scheduler).toBe('normal');
      expect(workflow['3'].inputs.denoise).toBe(1);
    });

    it('should allow custom steps and cfg', () => {
      const workflow = buildSDXLWorkflow('test', { steps: 30, cfg: 8.5 });

      expect(workflow['3'].inputs.steps).toBe(30);
      expect(workflow['3'].inputs.cfg).toBe(8.5);
    });

    it('should set default image dimensions to 1024x1024', () => {
      const workflow = buildSDXLWorkflow('test');

      expect(workflow['5'].inputs.width).toBe(1024);
      expect(workflow['5'].inputs.height).toBe(1024);
      expect(workflow['5'].inputs.batch_size).toBe(1);
    });

    it('should use default negative prompt', () => {
      const workflow = buildSDXLWorkflow('test');

      expect(workflow['7'].inputs.text).toContain('low quality');
    });

    it('should allow custom negative prompt', () => {
      const workflow = buildSDXLWorkflow('test', {
        negativePrompt: 'custom negative',
      });

      expect(workflow['7'].inputs.text).toBe('custom negative');
    });

    it('should connect nodes correctly', () => {
      const workflow = buildSDXLWorkflow('test');

      // KSampler connections
      expect(workflow['3'].inputs.model).toEqual(['4', 0]);
      expect(workflow['3'].inputs.positive).toEqual(['6', 0]);
      expect(workflow['3'].inputs.negative).toEqual(['7', 0]);
      expect(workflow['3'].inputs.latent_image).toEqual(['5', 0]);
    });
  });

  describe('buildSDXLFaceIDWorkflow', () => {
    it('should create workflow with InstantID nodes', () => {
      const workflow = buildSDXLFaceIDWorkflow('a portrait', 'reference.jpg');

      expect(workflow['11']).toBeDefined(); // LoadImage
      expect(workflow['12']).toBeDefined(); // InstantIDModelLoader
      expect(workflow['13']).toBeDefined(); // InstantIDFaceAnalysis
      expect(workflow['14']).toBeDefined(); // ApplyInstantID
      expect(workflow['15']).toBeDefined(); // ControlNetLoader
      expect(workflow['16']).toBeDefined(); // ControlNetApply (positive)
      expect(workflow['17']).toBeDefined(); // ControlNetApply (negative)
    });

    it('should load reference image', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'face.jpg');

      expect(workflow['11'].inputs.image).toBe('face.jpg');
      expect(workflow['11'].class_type).toBe('LoadImage');
    });

    it('should use InstantID model', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg');

      expect(workflow['12'].inputs.instantid_file).toBe('ip-adapter.bin');
      expect(workflow['12'].class_type).toBe('InstantIDModelLoader');
    });

    it('should use CPU provider for face analysis', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg');

      expect(workflow['13'].inputs.provider).toBe('CPU');
      expect(workflow['13'].class_type).toBe('InstantIDFaceAnalysis');
    });

    it('should apply ControlNet with balanced strength', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg');

      expect(workflow['16'].inputs.strength).toBe(0.6);
      expect(workflow['17'].inputs.strength).toBe(0.6);
    });

    it('should connect ControlNet to conditioning', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg');

      expect(workflow['16'].inputs.conditioning).toEqual(['6', 0]);
      expect(workflow['17'].inputs.conditioning).toEqual(['7', 0]);
      expect(workflow['16'].inputs.control_net).toEqual(['15', 0]);
      expect(workflow['17'].inputs.control_net).toEqual(['15', 0]);
    });

    it('should apply InstantID with balanced weight', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg');

      expect(workflow['14'].inputs.weight).toBe(0.7);
      expect(workflow['14'].inputs.start_at).toBe(0.0);
      expect(workflow['14'].inputs.end_at).toBe(1.0);
    });

    it('should update KSampler to use InstantID', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg');

      expect(workflow['3'].inputs.model).toEqual(['14', 0]);
      expect(workflow['3'].inputs.positive).toEqual(['14', 1]);
      expect(workflow['3'].inputs.negative).toEqual(['14', 2]);
    });

    it('should preserve base workflow options', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg', {
        steps: 30,
        cfg: 8.5,
        seed: 42,
      });

      expect(workflow['3'].inputs.steps).toBe(30);
      expect(workflow['3'].inputs.cfg).toBe(8.5);
      expect(workflow['3'].inputs.seed).toBe(42);
    });
  });

  describe('buildIPAdapterWorkflow', () => {
    it('should create workflow with IP-Adapter nodes', () => {
      const workflow = buildIPAdapterWorkflow('a portrait', 'reference.jpg');

      expect(workflow['11']).toBeDefined(); // LoadImage
      expect(workflow['20']).toBeDefined(); // IPAdapterUnifiedLoader
      expect(workflow['21']).toBeDefined(); // IPAdapter
    });

    it('should use PLUS FACE preset for portraits', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      expect(workflow['20'].inputs.preset).toBe('PLUS FACE (portraits)');
      expect(workflow['20'].class_type).toBe('IPAdapterUnifiedLoader');
    });

    it('should use balanced mode by default', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      expect(workflow['21'].inputs.weight).toBe(MODE_PRESETS.balanced.weight);
      expect(workflow['21'].inputs.weight).toBe(0.9);
    });

    it('should use quality mode when specified', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg', {
        generationMode: 'quality',
      });

      expect(workflow['21'].inputs.weight).toBe(MODE_PRESETS.quality.weight);
      expect(workflow['21'].inputs.weight).toBe(0.95);
    });

    it('should use speed mode when specified', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg', {
        generationMode: 'speed',
      });

      expect(workflow['21'].inputs.weight).toBe(MODE_PRESETS.speed.weight);
      expect(workflow['21'].inputs.weight).toBe(0.85);
    });

    it('should use style transfer weight type', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      expect(workflow['21'].inputs.weight_type).toBe('style transfer');
      expect(workflow['21'].inputs.start_at).toBe(0.0);
      expect(workflow['21'].inputs.end_at).toBe(1.0);
    });

    it('should connect IP-Adapter to reference image', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      expect(workflow['21'].inputs.image).toEqual(['11', 0]);
      expect(workflow['21'].inputs.model).toEqual(['20', 0]);
      expect(workflow['21'].inputs.ipadapter).toEqual(['20', 1]);
    });

    it('should update KSampler to use IP-Adapter model', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      expect(workflow['3'].inputs.model).toEqual(['21', 0]);
    });

    it('should use default steps of 30', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      expect(workflow['3'].inputs.steps).toBe(30);
    });

    it('should use default cfg of 8.0', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      expect(workflow['3'].inputs.cfg).toBe(8.0);
    });
  });

  describe('buildFluxWorkflow', () => {
    it('should create Flux workflow', () => {
      const workflow = buildFluxWorkflow('a beautiful landscape');

      expect(workflow).toBeDefined();
      expect(workflow['3']).toBeDefined(); // KSampler or equivalent
    });

    it('should handle Flux-specific options', () => {
      const workflow = buildFluxWorkflow('test', {
        steps: 20,
        cfg: 7.0,
        seed: 99,
      });

      expect(workflow).toBeDefined();
    });
  });

  describe('buildWorkflow (main export)', () => {
    it('should use SDXL workflow by default', () => {
      const workflow = buildWorkflow('test prompt');

      expect(workflow['4']).toBeDefined(); // CheckpointLoader
      expect(workflow['11']).toBeUndefined(); // No reference image nodes
    });

    it('should use IP-Adapter workflow when specified', () => {
      const workflow = buildWorkflow('test', {
        referenceImage: 'ref.jpg',
        useIPAdapter: true,
      });

      expect(workflow['20']).toBeDefined(); // IPAdapterUnifiedLoader
      expect(workflow['21']).toBeDefined(); // IPAdapter
    });

    it('should use InstantID workflow when reference provided without useIPAdapter', () => {
      const workflow = buildWorkflow('test', {
        referenceImage: 'ref.jpg',
        useIPAdapter: false,
      });

      expect(workflow['12']).toBeDefined(); // InstantIDModelLoader
      expect(workflow['13']).toBeDefined(); // InstantIDFaceAnalysis
      expect(workflow['14']).toBeDefined(); // ApplyInstantID
    });

    it('should default to InstantID when useIPAdapter not specified', () => {
      const workflow = buildWorkflow('test', {
        referenceImage: 'ref.jpg',
      });

      expect(workflow['12']).toBeDefined(); // InstantID nodes
    });
  });

  describe('Node Connections', () => {
    it('should have valid node references in SDXL workflow', () => {
      const workflow = buildSDXLWorkflow('test');

      // All referenced nodes should exist
      expect(workflow['3'].inputs.model[0]).toBe('4');
      expect(workflow['4']).toBeDefined();

      expect(workflow['3'].inputs.positive[0]).toBe('6');
      expect(workflow['6']).toBeDefined();

      expect(workflow['3'].inputs.negative[0]).toBe('7');
      expect(workflow['7']).toBeDefined();
    });

    it('should have valid node references in InstantID workflow', () => {
      const workflow = buildSDXLFaceIDWorkflow('test', 'ref.jpg');

      // ControlNet connections
      expect(workflow['16'].inputs.control_net[0]).toBe('15');
      expect(workflow['15']).toBeDefined();

      // InstantID connections
      expect(workflow['14'].inputs.instantid[0]).toBe('12');
      expect(workflow['12']).toBeDefined();

      expect(workflow['14'].inputs.insightface[0]).toBe('13');
      expect(workflow['13']).toBeDefined();
    });

    it('should have valid node references in IP-Adapter workflow', () => {
      const workflow = buildIPAdapterWorkflow('test', 'ref.jpg');

      // IP-Adapter connections
      expect(workflow['21'].inputs.model[0]).toBe('20');
      expect(workflow['20']).toBeDefined();

      expect(workflow['21'].inputs.ipadapter[0]).toBe('20');
      expect(workflow['21'].inputs.ipadapter[1]).toBe(1);
    });
  });

  describe('Parameter Validation', () => {
    it('should handle empty options', () => {
      const workflow = buildSDXLWorkflow('test', {});

      expect(workflow).toBeDefined();
      expect(workflow['3'].inputs.steps).toBe(25);
    });

    it('should handle all custom options', () => {
      const workflow = buildSDXLWorkflow('test', {
        lora: 'anime.safetensors',
        loraStrength: 0.9,
        negativePrompt: 'ugly',
        steps: 40,
        cfg: 9.0,
        seed: 777,
        ckpt_name: 'custom.safetensors',
      });

      expect(workflow['3'].inputs.steps).toBe(40);
      expect(workflow['3'].inputs.cfg).toBe(9.0);
      expect(workflow['3'].inputs.seed).toBe(777);
      expect(workflow['4'].inputs.ckpt_name).toBe('custom.safetensors');
    });

    it('should handle generation mode settings', () => {
      const modes: GenerationMode[] = ['quality', 'balanced', 'speed'];

      modes.forEach(mode => {
        const workflow = buildIPAdapterWorkflow('test', 'ref.jpg', {
          generationMode: mode,
        });

        expect(workflow['21'].inputs.weight).toBe(MODE_PRESETS[mode].weight);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long prompts', () => {
      const longPrompt = 'a '.repeat(1000) + 'beautiful sunset';
      const workflow = buildSDXLWorkflow(longPrompt);

      expect(workflow).toBeDefined();
      expect(workflow['6'].inputs.text).toBe(longPrompt);
    });

    it('should handle special characters in prompts', () => {
      const specialPrompt = 'test "quoted" and (parentheses) & symbols';
      const workflow = buildSDXLWorkflow(specialPrompt);

      expect(workflow['6'].inputs.text).toBe(specialPrompt);
    });

    it('should handle zero seed as random (falsy value)', () => {
      const workflow = buildSDXLWorkflow('test', { seed: 0 });

      // Seed 0 is falsy, so it will generate random seed
      expect(workflow['3'].inputs.seed).toBeDefined();
      expect(typeof workflow['3'].inputs.seed).toBe('number');
    });

    it('should handle large seed values', () => {
      const workflow = buildSDXLWorkflow('test', { seed: 999999999 });

      expect(workflow['3'].inputs.seed).toBe(999999999);
    });

    it('should handle minimum steps', () => {
      const workflow = buildSDXLWorkflow('test', { steps: 1 });

      expect(workflow['3'].inputs.steps).toBe(1);
    });

    it('should handle maximum steps', () => {
      const workflow = buildSDXLWorkflow('test', { steps: 150 });

      expect(workflow['3'].inputs.steps).toBe(150);
    });
  });

  describe('Integration Tests', () => {
    it('should support complete workflow generation pipeline', () => {
      // 1. User wants portrait with reference face
      const workflow = buildWorkflow('a professional headshot', {
        referenceImage: 'face.jpg',
        useIPAdapter: true,
        generationMode: 'quality',
        steps: 30,
        cfg: 8.5,
        seed: 42,
      });

      // 2. Verify it uses IP-Adapter
      expect(workflow['20']).toBeDefined();
      expect(workflow['21']).toBeDefined();

      // 3. Verify quality mode
      expect(workflow['21'].inputs.weight).toBe(0.95);

      // 4. Verify custom parameters
      expect(workflow['3'].inputs.steps).toBe(30);
      expect(workflow['3'].inputs.cfg).toBe(8.5);
      expect(workflow['3'].inputs.seed).toBe(42);
    });

    it('should support mode-based parameter selection', () => {
      const modes: GenerationMode[] = ['speed', 'balanced', 'quality'];
      const workflows = modes.map(mode =>
        buildIPAdapterWorkflow('test', 'ref.jpg', { generationMode: mode })
      );

      // Speed should have lowest weight
      expect(workflows[0]['21'].inputs.weight).toBe(0.85);

      // Balanced should be moderate
      expect(workflows[1]['21'].inputs.weight).toBe(0.9);

      // Quality should have highest weight
      expect(workflows[2]['21'].inputs.weight).toBe(0.95);
    });

    it('should support platform-specific workflow selection', () => {
      // Mac: IP-Adapter
      const macWorkflow = buildWorkflow('test', {
        referenceImage: 'ref.jpg',
        useIPAdapter: true,
      });

      expect(macWorkflow['20']).toBeDefined(); // IP-Adapter
      expect(macWorkflow['13']).toBeUndefined(); // No InstantID

      // Windows/Linux: InstantID
      const windowsWorkflow = buildWorkflow('test', {
        referenceImage: 'ref.jpg',
        useIPAdapter: false,
      });

      expect(windowsWorkflow['13']).toBeDefined(); // InstantID
      expect(windowsWorkflow['20']).toBeUndefined(); // No IP-Adapter
    });
  });
});
