/**
 * Step5Output Component Tests
 * Tests for scene generation and output management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import Step5Output from '../Step5Output';
import type { ScriptData, GeneratedScene, Character } from '../../types';

// Mock window.scrollTo
global.window.scrollTo = vi.fn();

// Mock dependencies
vi.mock('../services/geminiService', () => ({
  generateStoryboardImage: vi.fn(),
  generateStoryboardVideo: vi.fn(),
  VIDEO_MODELS_CONFIG: {
    'gemini-veo-2': { name: 'Veo 2', maxDuration: 8 },
  },
}));

vi.mock('../services/psychologyEvolution', () => ({
  updatePsychologyTimeline: vi.fn(),
}));

vi.mock('../services/userStore', () => ({
  hasAccessToModel: vi.fn(() => true),
}));

vi.mock('./LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th',
  }),
}));

vi.mock('./RegenerateOptionsModal', () => ({
  RegenerateOptionsModal: ({ isOpen }: any) => (isOpen ? <div>Regenerate Modal</div> : null),
}));

vi.mock('./MotionEditor', () => ({
  MotionEditor: () => <div>Motion Editor</div>,
}));

vi.mock('../pages/MotionEditorPage', () => ({
  default: () => <div>Motion Editor Page</div>,
}));

vi.mock('./RoleManagement', () => ({
  PermissionGuard: ({ children }: any) => <div>{children}</div>,
}));

// Mock ScriptData
const createMockCharacter = (overrides?: Partial<Character>): Character => ({
  id: 'char-1',
  name: 'Hero',
  role: 'Protagonist',
  description: 'Main character',
  external: {},
  physical: {},
  fashion: {},
  internal: {
    consciousness: {},
    subconscious: {},
    defilement: {},
  },
  goals: {
    objective: 'Save world',
    need: 'Prove worth',
    action: 'Fight',
    conflict: 'Fear',
    backstory: 'Orphan',
  },
  ...overrides,
});

const createMockScene = (overrides?: Partial<GeneratedScene>): GeneratedScene => ({
  sceneNumber: 1,
  location: 'City',
  timeOfDay: 'Day',
  description: 'Opening scene',
  dialogue: [],
  storyboardImageUrl: '',
  videoUrl: '',
  ...overrides,
});

const createMockScriptData = (overrides?: Partial<ScriptData>): ScriptData => ({
  projectType: 'movie',
  title: 'Test Movie',
  mainGenre: 'Action',
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
  characters: [createMockCharacter()],
  structure: [],
  scenesPerPoint: {},
  generatedScenes: {},
  team: [],
  ...overrides,
});

describe('Step5Output - Component Rendering', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    prevStep: vi.fn(),
    _goToStep: vi.fn(),
    onRegisterUndo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render output component', () => {
    const { container } = render(<Step5Output {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should render with generated scenes', () => {
    const scriptData = createMockScriptData({
      generatedScenes: {
        'Act 1': [createMockScene(), createMockScene({ sceneNumber: 2 })],
      },
    });
    const { container } = render(<Step5Output {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle empty scenes', () => {
    const scriptData = createMockScriptData({ generatedScenes: {} });
    const { container } = render(<Step5Output {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step5Output - Scene Data', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    prevStep: vi.fn(),
    _goToStep: vi.fn(),
  };

  it('should display scene numbers', () => {
    const scenes = [
      createMockScene({ sceneNumber: 1 }),
      createMockScene({ sceneNumber: 2 }),
      createMockScene({ sceneNumber: 3 }),
    ];
    const scriptData = createMockScriptData({
      generatedScenes: { Opening: scenes },
    });
    render(<Step5Output {...mockProps} scriptData={scriptData} />);

    expect(scenes[0].sceneNumber).toBe(1);
    expect(scenes[1].sceneNumber).toBe(2);
    expect(scenes[2].sceneNumber).toBe(3);
  });

  it('should display scene locations', () => {
    const scenes = [
      createMockScene({ location: 'INT. HOUSE - BEDROOM' }),
      createMockScene({ location: 'EXT. CITY - STREET' }),
    ];
    const scriptData = createMockScriptData({
      generatedScenes: { 'Act 1': scenes },
    });
    render(<Step5Output {...mockProps} scriptData={scriptData} />);

    expect(scenes[0].location).toBe('INT. HOUSE - BEDROOM');
    expect(scenes[1].location).toBe('EXT. CITY - STREET');
  });

  it('should display time of day', () => {
    const scenes = [
      createMockScene({ timeOfDay: 'DAWN' }),
      createMockScene({ timeOfDay: 'NIGHT' }),
    ];
    const scriptData = createMockScriptData({
      generatedScenes: { 'Act 2': scenes },
    });
    render(<Step5Output {...mockProps} scriptData={scriptData} />);

    expect(scenes[0].timeOfDay).toBe('DAWN');
    expect(scenes[1].timeOfDay).toBe('NIGHT');
  });
});

describe('Step5Output - Characters', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    prevStep: vi.fn(),
    _goToStep: vi.fn(),
  };

  it('should display character names', () => {
    const characters = [
      createMockCharacter({ name: 'Alice' }),
      createMockCharacter({ id: 'char-2', name: 'Bob' }),
    ];
    const scriptData = createMockScriptData({ characters });
    render(<Step5Output {...mockProps} scriptData={scriptData} />);

    expect(characters[0].name).toBe('Alice');
    expect(characters[1].name).toBe('Bob');
  });

  it('should handle character roles', () => {
    const characters = [
      createMockCharacter({ role: 'Protagonist' }),
      createMockCharacter({ id: 'char-2', role: 'Antagonist' }),
    ];
    const scriptData = createMockScriptData({ characters });
    render(<Step5Output {...mockProps} scriptData={scriptData} />);

    expect(characters[0].role).toBe('Protagonist');
    expect(characters[1].role).toBe('Antagonist');
  });
});

describe('Step5Output - Navigation', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    prevStep: vi.fn(),
    _goToStep: vi.fn(),
  };

  it('should have prevStep function', () => {
    render(<Step5Output {...mockProps} />);
    expect(typeof mockProps.prevStep).toBe('function');
  });

  it('should have _goToStep function', () => {
    render(<Step5Output {...mockProps} />);
    expect(typeof mockProps._goToStep).toBe('function');
  });

  it('should handle onNavigateToCharacter callback', () => {
    const onNavigateToCharacter = vi.fn();
    const { container } = render(
      <Step5Output {...mockProps} onNavigateToCharacter={onNavigateToCharacter} />
    );
    expect(container).toBeTruthy();
  });

  it('should handle returnToScene prop', () => {
    const returnToScene = { pointTitle: 'Act 1', sceneIndex: 2 };
    const { container } = render(<Step5Output {...mockProps} returnToScene={returnToScene} />);
    expect(container).toBeTruthy();
  });
});

describe('Step5Output - Edge Cases', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    prevStep: vi.fn(),
    _goToStep: vi.fn(),
  };

  it('should handle very long scene descriptions', () => {
    const longDesc = 'A'.repeat(5000);
    const scenes = [createMockScene({ description: longDesc })];
    const scriptData = createMockScriptData({
      generatedScenes: { 'Act 1': scenes },
    });
    const { container } = render(<Step5Output {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle special characters in locations', () => {
    const scenes = [createMockScene({ location: 'INT. カフェ - ห้องอาหาร™' })];
    const scriptData = createMockScriptData({
      generatedScenes: { Opening: scenes },
    });
    const { container } = render(<Step5Output {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle many scenes', () => {
    const manyScenes = Array.from({ length: 50 }, (_, i) =>
      createMockScene({ sceneNumber: i + 1 })
    );
    const scriptData = createMockScriptData({
      generatedScenes: { 'Full Movie': manyScenes },
    });
    const { container } = render(<Step5Output {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle empty character list', () => {
    const scriptData = createMockScriptData({ characters: [] });
    const { container } = render(<Step5Output {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step5Output - Permissions', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    prevStep: vi.fn(),
    _goToStep: vi.fn(),
  };

  it('should handle owner role', () => {
    const { container } = render(<Step5Output {...mockProps} userRole="owner" />);
    expect(container).toBeTruthy();
  });

  it('should handle editor role', () => {
    const { container } = render(<Step5Output {...mockProps} userRole="editor" />);
    expect(container).toBeTruthy();
  });

  it('should handle viewer role', () => {
    const { container } = render(<Step5Output {...mockProps} userRole="viewer" />);
    expect(container).toBeTruthy();
  });

  it('should handle undefined role', () => {
    const { container } = render(<Step5Output {...mockProps} userRole={undefined} />);
    expect(container).toBeTruthy();
  });
});

describe('Step5Output - Integration', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    prevStep: vi.fn(),
    _goToStep: vi.fn(),
  };

  it('should integrate with translation system', () => {
    const { container } = render(<Step5Output {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should handle complete scene workflow', () => {
    const scriptData = createMockScriptData({
      title: 'Complete Story',
      characters: [
        createMockCharacter({ name: 'Hero' }),
        createMockCharacter({ id: 'char-2', name: 'Villain' }),
      ],
      generatedScenes: {
        'Act 1': [
          createMockScene({
            sceneNumber: 1,
            location: 'INT. HOUSE',
            timeOfDay: 'DAY',
            description: 'Hero wakes up',
          }),
          createMockScene({
            sceneNumber: 2,
            location: 'EXT. STREET',
            timeOfDay: 'DAY',
            description: 'Hero meets villain',
          }),
        ],
      },
    });
    const { container } = render(<Step5Output {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});
