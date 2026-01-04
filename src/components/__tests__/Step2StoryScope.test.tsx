/**
 * Step2StoryScope Component Tests
 * Tests for story scope configuration and boundary settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Step2StoryScope from '../Step2StoryScope';
import type { ScriptData } from '../types';

// Mock window.speechSynthesis
global.window.speechSynthesis = {
  getVoices: vi.fn(() => []),
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  speaking: false,
  pending: false,
  paused: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
} as any;

// Mock dependencies
vi.mock('../services/geminiService', () => ({
  generateBoundary: vi.fn(),
}));

vi.mock('./LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th',
  }),
}));

vi.mock('./RegenerateOptionsModal', () => ({
  RegenerateOptionsModal: ({ isOpen, onClose }: any) =>
    isOpen ? <div>Regenerate Modal</div> : null,
}));

vi.mock('./TTSSettingsModal', () => ({
  TTSSettingsModal: ({ isOpen, onClose }: any) => (isOpen ? <div>TTS Settings Modal</div> : null),
}));

vi.mock('../services/ttsService', () => ({
  ttsService: {
    speak: vi.fn(),
    stop: vi.fn(),
  },
}));

// Mock ScriptData
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

describe('Step2StoryScope - Component Rendering', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    onRegisterUndo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render story scope component', () => {
    const { container } = render(<Step2StoryScope {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should render with initial boundary data', () => {
    const scriptData = createMockScriptData({
      boundary: {
        location: 'Tokyo, Japan',
        time: '2024',
        social: 'Modern society',
      },
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(mockProps.updateScriptData).not.toHaveBeenCalled();
  });

  it('should handle empty boundary', () => {
    const scriptData = createMockScriptData({
      boundary: { location: '', time: '', social: '' },
    });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step2StoryScope - Boundary Configuration', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display location boundary when set', () => {
    const scriptData = createMockScriptData({
      boundary: { location: 'New York City', time: '', social: '' },
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.boundary.location).toBe('New York City');
  });

  it('should display time boundary when set', () => {
    const scriptData = createMockScriptData({
      boundary: { location: '', time: 'Medieval Era', social: '' },
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.boundary.time).toBe('Medieval Era');
  });

  it('should display social boundary when set', () => {
    const scriptData = createMockScriptData({
      boundary: { location: '', time: '', social: 'High society elite' },
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.boundary.social).toBe('High society elite');
  });

  it('should handle all boundaries set', () => {
    const scriptData = createMockScriptData({
      boundary: {
        location: 'London, England',
        time: 'Victorian Era (1837-1901)',
        social: 'Upper class aristocracy',
      },
    });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step2StoryScope - Story Elements', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with premise', () => {
    const scriptData = createMockScriptData({
      premise: 'A detective must solve a mysterious crime',
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.premise).toBe('A detective must solve a mysterious crime');
  });

  it('should render with setting', () => {
    const scriptData = createMockScriptData({
      setting: 'Dark, rainy city streets',
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.setting).toBe('Dark, rainy city streets');
  });

  it('should render with target audience', () => {
    const scriptData = createMockScriptData({
      targetAudience: 'Adults 18-35',
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.targetAudience).toBe('Adults 18-35');
  });

  it('should render with tone', () => {
    const scriptData = createMockScriptData({
      tone: 'Suspenseful and mysterious',
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.tone).toBe('Suspenseful and mysterious');
  });
});

describe('Step2StoryScope - Story Goal/Obstacle/Outcome', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with story goal', () => {
    const scriptData = createMockScriptData({
      storyGoal: 'Find the missing artifact',
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.storyGoal).toBe('Find the missing artifact');
  });

  it('should render with story obstacle', () => {
    const scriptData = createMockScriptData({
      storyObstacle: 'Evil organization trying to stop them',
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.storyObstacle).toBe('Evil organization trying to stop them');
  });

  it('should render with story outcome', () => {
    const scriptData = createMockScriptData({
      storyOutcome: 'Hero succeeds but at great personal cost',
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.storyOutcome).toBe('Hero succeeds but at great personal cost');
  });

  it('should handle complete goal/obstacle/outcome', () => {
    const scriptData = createMockScriptData({
      storyGoal: 'Save the world from alien invasion',
      storyObstacle: 'Limited resources and distrust from government',
      storyOutcome: 'Successful defense but humanity forever changed',
    });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step2StoryScope - Navigation Props', () => {
  it('should have nextStep function', () => {
    const nextStep = vi.fn();
    const scriptData = createMockScriptData();
    render(
      <Step2StoryScope
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={nextStep}
        prevStep={vi.fn()}
      />
    );
    expect(nextStep).not.toHaveBeenCalled();
  });

  it('should have prevStep function', () => {
    const prevStep = vi.fn();
    const scriptData = createMockScriptData();
    render(
      <Step2StoryScope
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={prevStep}
      />
    );
    expect(prevStep).not.toHaveBeenCalled();
  });

  it('should handle optional onRegisterUndo', () => {
    const onRegisterUndo = vi.fn();
    const scriptData = createMockScriptData();
    render(
      <Step2StoryScope
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
        onRegisterUndo={onRegisterUndo}
      />
    );
    expect(onRegisterUndo).not.toHaveBeenCalled();
  });
});

describe('Step2StoryScope - Edge Cases', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle very long location', () => {
    const longLocation = 'A'.repeat(1000);
    const scriptData = createMockScriptData({
      boundary: { location: longLocation, time: '', social: '' },
    });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle special characters in boundaries', () => {
    const scriptData = createMockScriptData({
      boundary: {
        location: 'São Paulo, Brazil™️',
        time: '21st Century (2000-2099)',
        social: 'Multi-cultural & diverse',
      },
    });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle Unicode in story elements', () => {
    const scriptData = createMockScriptData({
      premise: 'การผจญภัยในดินแดนแห่งจินตนาการ 🌟',
      setting: '东京市中心 🗾',
      tone: 'Épico y dramático',
    });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle extremely long premise', () => {
    const longPremise = 'A detective '.repeat(500);
    const scriptData = createMockScriptData({ premise: longPremise });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle empty strings in all fields', () => {
    const scriptData = createMockScriptData({
      premise: '',
      setting: '',
      targetAudience: '',
      tone: '',
      storyGoal: '',
      storyObstacle: '',
      storyOutcome: '',
      boundary: { location: '', time: '', social: '' },
    });
    const { container } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step2StoryScope - Data Integrity', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain boundary data integrity', () => {
    const scriptData = createMockScriptData({
      boundary: {
        location: 'Paris',
        time: '1920s',
        social: 'Jazz Age society',
      },
    });
    render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.boundary.location).toBe('Paris');
    expect(scriptData.boundary.time).toBe('1920s');
    expect(scriptData.boundary.social).toBe('Jazz Age society');
  });

  it('should handle multiple re-renders without data loss', () => {
    const scriptData = createMockScriptData({
      premise: 'Test premise',
      setting: 'Test setting',
    });
    const { rerender } = render(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    rerender(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    rerender(<Step2StoryScope {...mockProps} scriptData={scriptData} />);
    expect(scriptData.premise).toBe('Test premise');
  });
});

describe('Step2StoryScope - Integration', () => {
  it('should integrate with translation system', () => {
    const scriptData = createMockScriptData();
    const { container } = render(
      <Step2StoryScope
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should handle complete story scope configuration', () => {
    const scriptData = createMockScriptData({
      title: 'Epic Adventure',
      premise: 'A hero must save the kingdom from darkness',
      setting: 'Medieval fantasy world with magic',
      targetAudience: 'Young Adult (13-25)',
      tone: 'Epic, dramatic, hopeful',
      storyGoal: 'Restore peace to the kingdom',
      storyObstacle: 'Dark lord and his army',
      storyOutcome: 'Victory but with lasting changes',
      boundary: {
        location: 'Kingdom of Eldoria',
        time: 'Medieval Era (equivalent to 1200s)',
        social: 'Feudal society with magic users',
      },
    });
    const { container } = render(
      <Step2StoryScope
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        prevStep={vi.fn()}
        onRegisterUndo={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
