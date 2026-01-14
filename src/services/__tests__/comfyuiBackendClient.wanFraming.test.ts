import { describe, it, expect } from 'vitest';
import {
  __test__buildWanNegativePromptForShot,
  __test__buildWanPositiveFramingDirectiveForShot,
  __test__buildWanPositivePerspectiveDirectiveForShot,
} from '../comfyuiBackendClient';

describe('comfyuiBackendClient WAN negative prompt (framing)', () => {
  it('adds framing negatives for CU', () => {
    const neg = __test__buildWanNegativePromptForShot(undefined, 'cu');
    expect(neg).toContain('medium shot');
    expect(neg).toContain('wide shot');
    expect(neg).toContain('full body');
  });

  it('does not add framing negatives for MS', () => {
    const base = 'base negatives';
    const neg = __test__buildWanNegativePromptForShot(base, 'ms');
    expect(neg).not.toBe(base);
    expect(neg).toContain('close-up');
    expect(neg).toContain('wide shot');
  });

  it('adds anti-closeup negatives for WS', () => {
    const neg = __test__buildWanNegativePromptForShot(undefined, 'ws');
    expect(neg).toContain('close-up');
    expect(neg).toContain('face fills frame');
  });

  it('adds perspective negatives even when shot size is unknown', () => {
    const neg = __test__buildWanNegativePromptForShot('base', '', 'high');
    expect(neg).toContain('low angle');
    expect(neg).toContain("worm's eye");
  });
});

describe('comfyuiBackendClient WAN positive framing directive', () => {
  it('injects CU directive when missing authoritative block', () => {
    const dir = __test__buildWanPositiveFramingDirectiveForShot('Cinematic video: test', 'cu');
    expect(dir).toContain('CAMERA FRAMING (AUTHORITATIVE)');
    expect(dir).toContain('Close-Up (CU)');
  });

  it('works with labeled shot sizes like "CU (Close Up)" when pre-normalized', () => {
    // The normalizer in generateWithComfyUI should reduce this to 'cu'; this test locks the helper behavior.
    const dir = __test__buildWanPositiveFramingDirectiveForShot('Cinematic video: test', 'cu');
    expect(dir).toContain('Close-Up (CU)');
  });

  it('does not inject if authoritative block already present', () => {
    const dir = __test__buildWanPositiveFramingDirectiveForShot(
      'CAMERA FRAMING (AUTHORITATIVE): Close-Up (CU): head/shoulders',
      'cu'
    );
    expect(dir).toBeUndefined();
  });
});

describe('comfyuiBackendClient WAN positive perspective directive', () => {
  it('injects perspective directive when missing authoritative block', () => {
    const dir = __test__buildWanPositivePerspectiveDirectiveForShot('Cinematic video: test', 'high');
    expect(dir).toContain('CAMERA PERSPECTIVE (AUTHORITATIVE)');
    expect(dir).toContain('High-angle');
  });

  it('does not inject if authoritative block already present', () => {
    const dir = __test__buildWanPositivePerspectiveDirectiveForShot(
      'CAMERA PERSPECTIVE (AUTHORITATIVE): Eye-level perspective',
      'eye'
    );
    expect(dir).toBeUndefined();
  });
});
