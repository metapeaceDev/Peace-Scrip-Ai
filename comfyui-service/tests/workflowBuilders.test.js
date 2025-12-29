import { describe, it, expect } from 'vitest';
import { buildAnimateDiffWorkflow, buildWanWorkflow } from '../src/utils/workflowBuilders.js';

describe('workflowBuilders', () => {
  describe('buildAnimateDiffWorkflow', () => {
    it('should not pass unsupported inputs to AnimateDiff nodes', () => {
      const wf = buildAnimateDiffWorkflow('test prompt');

      expect(wf).toBeTruthy();
      expect(wf['5']?.class_type).toBe('ADE_LoadAnimateDiffModel');
      expect(wf['5b']?.class_type).toBe('ADE_ApplyAnimateDiffModelSimple');

      // Critical: ADE_ApplyAnimateDiffModelSimple only accepts motion_model (no `model`)
      expect(wf['5b']?.inputs).toHaveProperty('motion_model');
      expect(wf['5b']?.inputs).not.toHaveProperty('model');
    });

    it('should include VHS_VideoCombine MP4 export node', () => {
      const wf = buildAnimateDiffWorkflow('test prompt');

      expect(wf['8']?.class_type).toBe('VHS_VideoCombine');
      expect(wf['8']?.inputs?.format).toBe('video/h264-mp4');
      expect(wf['8']?.inputs?.save_output).toBe(true);
    });

    it('should wire LoRA without mutating AnimateDiff apply node inputs', () => {
      const wf = buildAnimateDiffWorkflow('test prompt', { lora: 'some-lora.safetensors' });

      expect(wf['9']?.class_type).toBe('LoraLoader');
      expect(wf['5b']?.inputs).toHaveProperty('motion_model');
      expect(wf['5b']?.inputs).not.toHaveProperty('model');

      // With LoRA, evolved sampling should use LoRA model
      expect(wf['5c']?.inputs?.model).toEqual(['9', 0]);
    });
  });

  describe('buildWanWorkflow', () => {
    it('should build a minimal WAN graph with MP4 output', () => {
      const wf = buildWanWorkflow('A cat walking in the garden');

      expect(wf).toBeTruthy();
      expect(wf['1']?.class_type).toBe('WanVideoModelLoader');
      expect(wf['2']?.class_type).toBe('LoadWanVideoT5TextEncoder');
      expect(wf['3']?.class_type).toBe('WanVideoTextEncode');
      expect(wf['4']?.class_type).toBe('WanVideoEmptyEmbeds');
      expect(wf['5']?.class_type).toBe('WanVideoSampler');
      expect(wf['6']?.class_type).toBe('WanVideoVAELoader');
      expect(wf['7']?.class_type).toBe('WanVideoDecode');
      expect(wf['8']?.class_type).toBe('VHS_VideoCombine');

      expect(wf['3']?.inputs?.positive_prompt).toBeTruthy();
      expect(wf['3']?.inputs).toHaveProperty('negative_prompt');
      expect(wf['3']?.inputs?.t5).toEqual(['2', 0]);

      expect(wf['4']?.inputs).toHaveProperty('num_frames');
      expect(wf['4']?.inputs).toHaveProperty('width');
      expect(wf['4']?.inputs).toHaveProperty('height');

      expect(wf['5']?.inputs?.model).toEqual(['1', 0]);
      expect(wf['5']?.inputs?.image_embeds).toEqual(['4', 0]);
      expect(wf['5']?.inputs?.text_embeds).toEqual(['3', 0]);
      expect(wf['5']?.inputs?.seed).toBeTypeOf('number');

      expect(wf['8']?.inputs?.format).toBe('video/h264-mp4');
      expect(wf['8']?.inputs?.save_output).toBe(true);
      expect(wf['8']?.inputs?.images).toEqual(['7', 0]);
    });

    it('should include seed only when provided', () => {
      const wfSeed = buildWanWorkflow('test', { seed: 123 });
      expect(wfSeed['5']?.inputs?.seed).toBe(123);
    });
  });
});
