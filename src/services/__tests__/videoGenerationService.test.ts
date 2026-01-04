import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Character, GeneratedScene } from '../../types';

vi.mock('../geminiService', () => ({
  generateStoryboardVideo: vi.fn(async () => 'https://example.com/video.mp4'),
}));

import { generateStoryboardVideo } from '../geminiService';
import { generateShotVideo } from '../videoGenerationService';
import type { VideoGenerationOptions } from '../videoGenerationService';

describe('videoGenerationService - seeding behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes caller-provided seed through to generateStoryboardVideo', async () => {
    const shot = {
      shot: 1,
      shotSize: 'MS',
      description: 'Test shot description',
      durationSec: 3,
    };

    await generateShotVideo(shot, undefined, {
      seed: 123456,
      cfg: 6,
      steps: 25,
    } as unknown as VideoGenerationOptions);

    expect(generateStoryboardVideo).toHaveBeenCalledTimes(1);
    const args = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[0];

    // Signature: (prompt, initImage, onProgress, preferredModel, generationOptions)
    const generationOptions = args[4] as Record<string, unknown>;
    expect(generationOptions.seed).toBe(123456);
  });

  it('derives a stable seed when caller seed is omitted (default behavior)', async () => {
    const shot = {
      shot: 5,
      shotSize: 'MLS',
      description: 'Another test shot',
      durationSec: 4,
    };

    await generateShotVideo(shot, undefined, {
      cfg: 6,
      steps: 25,
    } as unknown as VideoGenerationOptions);

    expect(generateStoryboardVideo).toHaveBeenCalledTimes(1);
    const args = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const generationOptions = args[4] as Record<string, unknown>;

    expect(typeof generationOptions.seed).toBe('number');
  });

  it('locks seed per character.id for WAN T2V when caller seed is omitted', async () => {
    const character = {
      id: 'char-123',
      name: 'A',
      role: 'Protagonist',
      description: 'Test character',
      external: {},
      physical: {},
      fashion: {},
      internal: { consciousness: {}, subconscious: {}, defilement: {} },
      goals: { objective: '', need: '', action: '', conflict: '', backstory: '' },
    } as unknown as Character;

    const shot1 = { shot: 1, shotSize: 'MS', description: 'Shot one', durationSec: 3 };
    const shot2 = { shot: 2, shotSize: 'CU', description: 'Shot two', durationSec: 3 };

    await generateShotVideo(shot1, undefined, { preferredModel: 'comfyui-wan-t2v', character });
    await generateShotVideo(shot2, undefined, { preferredModel: 'comfyui-wan-t2v', character });

    expect(generateStoryboardVideo).toHaveBeenCalledTimes(2);
    const call1 = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const call2 = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[1];
    const opts1 = call1[4] as Record<string, unknown>;
    const opts2 = call2[4] as Record<string, unknown>;

    expect(typeof opts1.seed).toBe('number');
    expect(opts1.seed).toBe(opts2.seed);
  });

  it('locks costume/fashion per scene for WAN T2V when characterOutfits is present', async () => {
    const character = {
      id: 'char-999',
      name: 'Hero',
      role: 'Protagonist',
      description: 'Test character',
      external: {},
      physical: {},
      fashion: {},
      internal: { consciousness: {}, subconscious: {}, defilement: {} },
      goals: { objective: '', need: '', action: '', conflict: '', backstory: '' },
    } as unknown as Character;

    const sceneA = {
      sceneNumber: 1,
      characterOutfits: { Hero: 'outfit-red-robe' },
      sceneDesign: {},
    } as unknown as GeneratedScene;
    const sceneB = {
      sceneNumber: 2,
      characterOutfits: { Hero: 'outfit-blue-robe' },
      sceneDesign: {},
    } as unknown as GeneratedScene;

    const shot1 = {
      shot: 1,
      shotSize: 'MS',
      description: 'Scene A shot 1',
      durationSec: 3,
      costume: 'red robe',
    };
    const shot2 = {
      shot: 2,
      shotSize: 'CU',
      description: 'Scene A shot 2',
      durationSec: 3,
      costume: 'red robe',
    };
    const shot3 = {
      shot: 1,
      shotSize: 'MS',
      description: 'Scene B shot 1',
      durationSec: 3,
      costume: 'blue robe',
    };

    await generateShotVideo(shot1, undefined, {
      preferredModel: 'comfyui-wan-t2v',
      character,
      currentScene: sceneA,
    });
    await generateShotVideo(shot2, undefined, {
      preferredModel: 'comfyui-wan-t2v',
      character,
      currentScene: sceneA,
    });
    await generateShotVideo(shot3, undefined, {
      preferredModel: 'comfyui-wan-t2v',
      character,
      currentScene: sceneB,
    });

    expect(generateStoryboardVideo).toHaveBeenCalledTimes(3);
    const call1 = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const call2 = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[1];
    const call3 = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[2];
    const opts1 = call1[4] as Record<string, unknown>;
    const opts2 = call2[4] as Record<string, unknown>;
    const opts3 = call3[4] as Record<string, unknown>;

    // Same scene outfit -> same seed
    expect(opts1.seed).toBe(opts2.seed);
    // Different outfit -> different seed
    expect(opts1.seed).not.toBe(opts3.seed);
  });

  it('does not pass initImage for WAN T2V (prompt-driven)', async () => {
    const character = {
      id: 'char-wan-1',
      name: 'Hero',
      role: 'Protagonist',
      description: 'Test character',
      external: {},
      physical: {},
      fashion: {},
      internal: { consciousness: {}, subconscious: {}, defilement: {} },
      goals: { objective: '', need: '', action: '', conflict: '', backstory: '' },
    } as unknown as Character;

    const shot = {
      shot: 1,
      shotSize: 'MS',
      description: 'WAN T2V should ignore init image',
      durationSec: 3,
    };
    await generateShotVideo(shot, 'base64-image-data', {
      preferredModel: 'comfyui-wan-t2v',
      character,
    });

    expect(generateStoryboardVideo).toHaveBeenCalledTimes(1);
    const args = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const initImage = args[1];
    expect(initImage).toBeUndefined();
  });

  it('injects authoritative hair line and hair negatives when character.physical contains hair details', async () => {
    const character = {
      id: 'char-hair-1',
      name: 'Maysa',
      role: 'Protagonist',
      description: 'Test character',
      external: {},
      physical: {
        'Physical Characteristics': 'ผมยาวประบ่า ดัดลอนอ่อนๆ สีน้ำตาลเข้ม',
      },
      fashion: {},
      internal: { consciousness: {}, subconscious: {}, defilement: {} },
      goals: { objective: '', need: '', action: '', conflict: '', backstory: '' },
    } as unknown as Character;

    const shot = { shot: 1, shotSize: 'CU', description: 'Close-up test', durationSec: 3 };
    await generateShotVideo(shot, undefined, { preferredModel: 'comfyui-wan-t2v', character });

    expect(generateStoryboardVideo).toHaveBeenCalledTimes(1);
    const args = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const prompt = String(args[0]);
    const generationOptions = args[4] as Record<string, unknown>;

    expect(prompt).toContain('Hair (AUTHORITATIVE):');
    expect(prompt).toMatch(/shoulder-length|ผมยาวประบ่า/);

    const negValue = generationOptions['negativePrompt'];
    const neg = typeof negValue === 'string' ? negValue : '';
    expect(neg).toContain('short hair');
    expect(neg).toContain('blonde hair');
  });

  it('injects multi-cast identity anchors when castCharacters are provided', async () => {
    const lead = {
      id: 'char-lead-1',
      name: 'Maysa',
      role: 'Lead',
      description: 'Lead character',
      external: {},
      physical: {
        Hair: 'ผมยาวประบ่า สีน้ำตาลเข้ม',
      },
      fashion: {
        Outfit: 'black dress',
      },
      internal: { consciousness: {}, subconscious: {}, defilement: {} },
      goals: { objective: '', need: '', action: '', conflict: '', backstory: '' },
    } as unknown as Character;

    const pete = {
      id: 'char-support-1',
      name: 'Pete',
      role: 'Supporting',
      description: 'Supporting character',
      external: {},
      physical: {
        Hair: 'short hair, black',
      },
      fashion: {
        Outfit: 'white shirt',
      },
      internal: { consciousness: {}, subconscious: {}, defilement: {} },
      goals: { objective: '', need: '', action: '', conflict: '', backstory: '' },
    } as unknown as Character;

    const shot = {
      shot: 1,
      shotSize: 'MS',
      description: 'Two characters talking',
      durationSec: 3,
      cast: 'Maysa, Pete',
    };
    await generateShotVideo(shot, undefined, {
      preferredModel: 'comfyui-wan-t2v',
      character: lead,
      castCharacters: [lead, pete],
    });

    expect(generateStoryboardVideo).toHaveBeenCalledTimes(1);
    const args = (generateStoryboardVideo as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const prompt = String(args[0]);

    expect(prompt).toContain('Other characters (IDENTITY LOCK):');
    expect(prompt).toContain('Character: Pete');
    expect(prompt).toContain('Do not swap faces');
  });
});
