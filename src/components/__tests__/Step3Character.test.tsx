/**
 * Step3Character Component Tests
 * Tests for character management, psychology integration, and character generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import Step3Character from '../Step3Character';
import type { ScriptData, Character } from '../types';

// Mock dependencies
vi.mock('./LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th',
  }),
}));

vi.mock('./RegenerateOptionsModal', () => ({
  RegenerateOptionsModal: ({ isOpen }: any) => (isOpen ? <div>Regenerate Modal</div> : null),
}));

vi.mock('./PsychologyTestPanel', () => ({
  PsychologyTestPanel: () => <div>Psychology Test Panel</div>,
}));

vi.mock('./PsychologyDisplay', () => ({
  PsychologyDisplay: () => <div>Psychology Display</div>,
}));

vi.mock('./PsychologyDashboard', () => ({
  PsychologyDashboard: () => <div>Psychology Dashboard</div>,
}));

vi.mock('./CharacterComparison', () => ({
  CharacterComparison: () => <div>Character Comparison</div>,
}));

vi.mock('./PsychologyTimeline', () => ({
  PsychologyTimeline: () => <div>Psychology Timeline</div>,
}));

vi.mock('../services/geminiService', () => ({
  generateCharacterDetails: vi.fn(),
  fillMissingCharacterDetails: vi.fn(),
  generateCharacterImage: vi.fn(),
  generateCostumeImage: vi.fn(),
  generateCostumeFashionDesign: vi.fn(),
  generateAllCharactersFromStory: vi.fn(),
}));

vi.mock('../services/hybridTTSService', () => ({
  HybridTTSService: {
    speak: vi.fn(),
    stop: vi.fn(),
  },
}));

// Mock ScriptData and Character
const createMockCharacter = (overrides?: Partial<Character>): Character => ({
  id: 'char-1',
  name: 'Test Character',
  role: 'Protagonist',
  description: 'A brave hero',
  external: {},
  physical: {},
  fashion: {},
  internal: {
    consciousness: {},
    subconscious: {},
    defilement: {},
  },
  goals: {
    objective: 'Save the world',
    need: 'Prove worth',
    action: 'Fight evil',
    conflict: 'Self-doubt',
    backstory: 'Orphan raised by monks',
  },
  ...overrides,
});

const createMockScriptData = (overrides?: Partial<ScriptData>): ScriptData => ({
  projectType: 'movie',
  title: '',
  mainGenre: '',
  secondaryGenres: [],
  language: 'Thai',
  bigIdea: '',
  premise: '',
  theme: '',
  logLine: '',
  synopsis: '',
  timeline: {
    movieTiming: '',
    seasons: '',
    date: '',
    social: '',
    economist: '',
    environment: '',
  },
  characters: [],
  structure: [],
  scenesPerPoint: {},
  generatedScenes: {},
  team: [],
  ...overrides,
});

describe('Step3Character - Component Rendering', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    onRegisterUndo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render character component', () => {
    const { container } = render(<Step3Character {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should render with empty characters array', () => {
    const scriptData = createMockScriptData({ characters: [] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should render with single character', () => {
    const character = createMockCharacter();
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should render with multiple characters', () => {
    const characters = [
      createMockCharacter({ id: 'char-1', name: 'Hero', role: 'Protagonist' }),
      createMockCharacter({ id: 'char-2', name: 'Villain', role: 'Antagonist' }),
      createMockCharacter({ id: 'char-3', name: 'Sidekick', role: 'Supporting' }),
    ];
    const scriptData = createMockScriptData({ characters });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step3Character - Character Data', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle character with complete data', () => {
    const character = createMockCharacter({
      name: 'John Doe',
      role: 'Protagonist',
      description: 'A skilled detective',
      image: 'data:image/png;base64,test',
      imageStyle: 'realistic',
    });
    const scriptData = createMockScriptData({ characters: [character] });
    render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(character.name).toBe('John Doe');
  });

  it('should handle character with goals', () => {
    const character = createMockCharacter({
      goals: {
        objective: 'Find the killer',
        need: 'Justice',
        action: 'Investigate',
        conflict: 'Corruption',
        backstory: 'Former cop',
      },
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle character with psychology data', () => {
    const character = createMockCharacter({
      buddhist_psychology: {
        anusaya: {
          kama_raga: 60,
          patigha: 45,
          mana: 55,
          ditthi: 40,
          vicikiccha: 50,
          bhava_raga: 65,
          avijja: 70,
        },
        carita: 'พุทธิจริต',
      },
      parami_portfolio: {
        dana: { level: 5, exp: 250 },
        sila: { level: 4, exp: 180 },
        nekkhamma: { level: 3, exp: 120 },
        panna: { level: 6, exp: 320 },
        viriya: { level: 5, exp: 240 },
        khanti: { level: 4, exp: 200 },
        sacca: { level: 5, exp: 260 },
        adhitthana: { level: 4, exp: 190 },
        metta: { level: 6, exp: 310 },
        upekkha: { level: 5, exp: 270 },
      },
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step3Character - Speech Patterns', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle character with speech pattern', () => {
    const character = createMockCharacter({
      speechPattern: {
        dialect: 'isaan',
        accent: 'northern',
        formalityLevel: 'informal',
        personality: 'humorous',
        customPhrases: ['บ่ต้อง', 'แหน่ะ'],
        speechTics: ['เนอะ', 'นะจ๊ะ'],
      },
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle different dialect types', () => {
    const characters = [
      createMockCharacter({
        id: 'c1',
        speechPattern: {
          dialect: 'standard',
          accent: 'none',
          formalityLevel: 'formal',
          personality: 'polite',
        },
      }),
      createMockCharacter({
        id: 'c2',
        speechPattern: {
          dialect: 'southern',
          accent: 'southern',
          formalityLevel: 'casual',
          personality: 'rude',
        },
      }),
      createMockCharacter({
        id: 'c3',
        speechPattern: {
          dialect: 'northern',
          accent: 'northern',
          formalityLevel: 'informal',
          personality: 'elderly',
        },
      }),
    ];
    const scriptData = createMockScriptData({ characters });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step3Character - Character Images', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle character with profile image', () => {
    const character = createMockCharacter({
      image:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle character with face reference', () => {
    const character = createMockCharacter({
      faceReferenceImage: 'data:image/png;base64,test-face',
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle character with fashion reference', () => {
    const character = createMockCharacter({
      fashionReferenceImage: 'data:image/png;base64,test-fashion',
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle character with outfit collection', () => {
    const character = createMockCharacter({
      outfitCollection: [
        { id: 'outfit-1', description: 'Casual wear', image: 'data:image/png;base64,casual' },
        { id: 'outfit-2', description: 'Formal suit', image: 'data:image/png;base64,suit' },
        { id: 'outfit-3', description: 'Battle armor', image: 'data:image/png;base64,armor' },
      ],
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step3Character - Props Handling', () => {
  it('should handle targetCharId prop', () => {
    const scriptData = createMockScriptData({
      characters: [createMockCharacter({ id: 'target-char' })],
    });
    const { container } = render(
      <Step3Character
        scriptData={scriptData}
        setScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
        targetCharId="target-char"
        onResetTargetCharId={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should handle returnToStep prop', () => {
    const scriptData = createMockScriptData();
    const { container } = render(
      <Step3Character
        scriptData={scriptData}
        setScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
        returnToStep={2}
        onReturnToOrigin={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should handle autoOpenPsychology prop', () => {
    const character = createMockCharacter();
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(
      <Step3Character
        scriptData={scriptData}
        setScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
        autoOpenPsychology={true}
        onResetAutoOpenPsychology={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});

describe('Step3Character - Edge Cases', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle very long character name', () => {
    const character = createMockCharacter({
      name: 'A'.repeat(200),
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle Unicode characters in name', () => {
    const character = createMockCharacter({
      name: '测试角色 🎭 ตัวละครทดสอบ',
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle extremely long description', () => {
    const character = createMockCharacter({
      description: 'A hero who '.repeat(1000),
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle many characters', () => {
    const characters = Array.from({ length: 50 }, (_, i) =>
      createMockCharacter({ id: `char-${i}`, name: `Character ${i}` })
    );
    const scriptData = createMockScriptData({ characters });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle character with all empty fields', () => {
    const character = createMockCharacter({
      name: '',
      role: '',
      description: '',
      external: {},
      physical: {},
      fashion: {},
      goals: {
        objective: '',
        need: '',
        action: '',
        conflict: '',
        backstory: '',
      },
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step3Character - Data Integrity', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain character array integrity', () => {
    const characters = [
      createMockCharacter({ id: 'c1', name: 'Hero' }),
      createMockCharacter({ id: 'c2', name: 'Villain' }),
    ];
    const scriptData = createMockScriptData({ characters });
    render(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(scriptData.characters).toHaveLength(2);
    expect(scriptData.characters[0].name).toBe('Hero');
  });

  it('should handle multiple re-renders', () => {
    const character = createMockCharacter({ name: 'Test' });
    const scriptData = createMockScriptData({ characters: [character] });
    const { rerender } = render(<Step3Character {...mockProps} scriptData={scriptData} />);
    rerender(<Step3Character {...mockProps} scriptData={scriptData} />);
    rerender(<Step3Character {...mockProps} scriptData={scriptData} />);
    expect(scriptData.characters[0].name).toBe('Test');
  });
});

describe('Step3Character - Integration', () => {
  it('should integrate with psychology components', () => {
    const character = createMockCharacter({
      parami_portfolio: {
        dana: { level: 5, exp: 250 },
        sila: { level: 4, exp: 180 },
        nekkhamma: { level: 3, exp: 120 },
        panna: { level: 6, exp: 320 },
        viriya: { level: 5, exp: 240 },
        khanti: { level: 4, exp: 200 },
        sacca: { level: 5, exp: 260 },
        adhitthana: { level: 4, exp: 190 },
        metta: { level: 6, exp: 310 },
        upekkha: { level: 5, exp: 270 },
      },
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(
      <Step3Character
        scriptData={scriptData}
        setScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should handle complete character workflow', () => {
    const character = createMockCharacter({
      name: 'Complete Character',
      role: 'Protagonist',
      description: 'A fully developed character',
      image: 'data:image/png;base64,profile',
      faceReferenceImage: 'data:image/png;base64,face',
      fashionReferenceImage: 'data:image/png;base64,fashion',
      imageStyle: 'anime',
      preferredModel: 'comfyui-sdxl',
      outfitCollection: [{ id: 'o1', description: 'Outfit 1', image: 'data:image/png;base64,o1' }],
      external: { build: 'Athletic', height: '180cm' },
      physical: { hair: 'Black', eyes: 'Brown' },
      fashion: { style: 'Modern casual' },
      goals: {
        objective: 'Save the city',
        need: 'Redemption',
        action: 'Fight crime',
        conflict: 'Dark past',
        backstory: 'Former criminal turned hero',
      },
      speechPattern: {
        dialect: 'standard',
        accent: 'none',
        formalityLevel: 'formal',
        personality: 'serious',
        customPhrases: ['Justice prevails'],
        speechTics: [],
      },
      buddhist_psychology: {
        anusaya: {
          kama_raga: 50,
          patigha: 40,
          mana: 45,
          ditthi: 35,
          vicikiccha: 30,
          bhava_raga: 55,
          avijja: 60,
        },
        carita: 'วิริยจริต',
      },
      parami_portfolio: {
        dana: { level: 7, exp: 400 },
        sila: { level: 6, exp: 350 },
        nekkhamma: { level: 5, exp: 280 },
        panna: { level: 8, exp: 450 },
        viriya: { level: 9, exp: 500 },
        khanti: { level: 6, exp: 330 },
        sacca: { level: 7, exp: 380 },
        adhitthana: { level: 8, exp: 420 },
        metta: { level: 5, exp: 290 },
        upekkha: { level: 6, exp: 340 },
      },
    });
    const scriptData = createMockScriptData({ characters: [character] });
    const { container } = render(
      <Step3Character
        scriptData={scriptData}
        setScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
        onRegisterUndo={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
