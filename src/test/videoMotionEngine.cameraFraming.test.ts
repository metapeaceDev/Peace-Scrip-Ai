import { describe, it, expect } from 'vitest';

import type { Character, GeneratedScene } from '../types';
import { buildVideoPrompt } from '../services/videoMotionEngine';

function makeMinimalCharacter(name: string): Character {
  return {
    id: 'c1',
    name,
    role: 'Protagonist',
    description: '',
    external: {},
    physical: {},
    fashion: {},
    internal: {
      consciousness: {},
      subconscious: {},
      defilement: {},
    },
    goals: {
      objective: '',
      need: '',
      action: '',
      conflict: '',
      backstory: '',
    },
    emotionalState: {
      currentMood: 'peaceful',
      energyLevel: 50,
      mentalBalance: 50,
    },
    buddhist_psychology: {
      carita: 'วิตกจริต',
      anusaya: {
        kama_raga: 0,
        patigha: 0,
        mana: 0,
        ditthi: 0,
        vicikiccha: 0,
        bhava_raga: 0,
        avijja: 0,
      },
    },
  };
}

function makeMinimalScene(): GeneratedScene {
  return {
    sceneNumber: 1,
    sceneDesign: {
      sceneName: 'Test Scene',
      characters: ['พีท'],
      location: 'Bangkok',
      situations: [],
      moodTone: 'calm',
    },
    shotList: [
      {
        scene: '1',
        shot: 7,
        description: 'Test shot',
        durationSec: 5,
        shotSize: 'MS',
        perspective: 'Eye level',
        movement: 'Static',
        equipment: 'Tripod',
        focalLength: '35mm',
        aspectRatio: '16:9',
        lightingDesign: 'soft',
        colorTemperature: 'warm',
        cast: 'พีท',
      },
    ],
    storyboard: [],
    propList: [],
    breakdown: {
      part1: [],
      part2: [],
      part3: [],
    },
  };
}

function getActionLine(prompt: string): string {
  return prompt.split('\n').find(line => line.startsWith('- ACTION (CONTENT ONLY')) || '';
}

describe('videoMotionEngine camera framing', () => {
  it('MS shotSize stays authoritative even if description says wide shot (Thai/English)', () => {
    const character = makeMinimalCharacter('พีท');
    const scene = makeMinimalScene();

    const shotData = {
      shot: 7,
      scene: '1',
      description: 'ภาพมุมกว้าง (wide shot) พีทเดินเข้ามาในฉาก',
      shotSize: 'MS',
      perspective: 'Eye level',
      movement: 'Static',
      equipment: 'Tripod',
      durationSec: 5,
      cast: 'พีท',
      aspectRatio: '16:9',
    };

    const prompt = buildVideoPrompt(shotData, scene, character, 'base prompt');

    expect(prompt).toContain('CAMERA FRAMING (AUTHORITATIVE): Medium Shot (MS)');
    expect(prompt).toContain('ไม่ใช่มุมกว้าง');

    const actionLine = getActionLine(prompt);
    expect(actionLine).not.toMatch(/มุมกว้าง/iu);
    expect(actionLine).not.toMatch(/wide\s*shot/iu);
  });

  it('Thai shotSize synonyms normalize to WS and action line strips close-up terms', () => {
    const character = makeMinimalCharacter('พีท');
    const scene = makeMinimalScene();

    const shotData = {
      shot: 8,
      scene: '1',
      description: 'Close-up on พีท face while speaking',
      shotSize: 'ภาพมุมกว้าง',
      perspective: 'Eye level',
      movement: 'Static',
      equipment: 'Tripod',
      durationSec: 5,
      cast: 'พีท',
      aspectRatio: '16:9',
    };

    const prompt = buildVideoPrompt(shotData, scene, character, 'base prompt');

    expect(prompt).toContain('CAMERA FRAMING (AUTHORITATIVE): Wide Shot (WS)');

    const actionLine = getActionLine(prompt);
    expect(actionLine).not.toMatch(/close-?up/iu);
    expect(actionLine).not.toMatch(/\bCU\b/iu);
    expect(actionLine).not.toMatch(/\bECU\b/iu);
  });

  it('perspective stays authoritative and action line strips conflicting angle terms', () => {
    const character = makeMinimalCharacter('พีท');
    const scene = makeMinimalScene();

    const shotData = {
      shot: 9,
      scene: '1',
      description: 'low angle (มุมต่ำ) พีทพูดกับกล้องอย่างมั่นใจ',
      shotSize: 'MS',
      perspective: 'High angle (มุมสูง)',
      movement: 'Static',
      equipment: 'Tripod',
      durationSec: 5,
      cast: 'พีท',
      aspectRatio: '16:9',
    };

    const prompt = buildVideoPrompt(shotData, scene, character, 'base prompt');
    expect(prompt).toContain('CAMERA PERSPECTIVE (AUTHORITATIVE): High-angle');

    const actionLine = getActionLine(prompt);
    expect(actionLine).not.toMatch(/low\s*angle/iu);
    expect(actionLine).not.toMatch(/มุมต่ำ/iu);
  });
});
