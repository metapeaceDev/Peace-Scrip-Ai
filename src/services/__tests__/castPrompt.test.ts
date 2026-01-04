import { describe, expect, it } from 'vitest';
import { buildCastPromptBlock, normalizeCastNames } from '../castPrompt';

describe('castPrompt', () => {
  it('normalizes cast from comma string', () => {
    expect(normalizeCastNames('A, B ,C')).toEqual(['A', 'B', 'C']);
  });

  it('normalizes cast from array', () => {
    expect(normalizeCastNames(['A', 'B, C', '', null as any])).toEqual(['A', 'B', 'C']);
  });

  it('builds block for no cast', () => {
    const block = buildCastPromptBlock([]);
    expect(block).toContain('CAST RULES');
    expect(block.toLowerCase()).toContain('no humans');
  });

  it('builds block for single cast', () => {
    const block = buildCastPromptBlock(['Monk']);
    expect(block).toContain('Exactly 1 person');
    expect(block).toContain('Monk');
    expect(block).toContain('No extra people');
  });

  it('builds block for multi cast', () => {
    const block = buildCastPromptBlock(['A', 'B']);
    expect(block).toContain('Exactly 2 people');
    expect(block).toContain('A, B');
    expect(block.toLowerCase()).toContain('do not drop');
  });

  it('adds Thai/Asian appearance hint when names are Thai', () => {
    const block = buildCastPromptBlock(['พระ', 'เณร']);
    expect(block).toContain('Appearance: Thai/Asian features');
  });
});
