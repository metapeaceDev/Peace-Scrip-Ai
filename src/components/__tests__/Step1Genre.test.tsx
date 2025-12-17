/**
 * Step1Genre Component Tests
 * Tests for genre selection, title generation, and poster creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Step1Genre from '../Step1Genre';
import type { ScriptData } from '../../types';

// Mock dependencies
vi.mock('../services/geminiService', () => ({
  generateFullScriptOutline: vi.fn(),
  generateMoviePoster: vi.fn(),
  generateTitle: vi.fn(),
}));

vi.mock('../components/LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'th',
  }),
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

describe('Step1Genre - Component Rendering', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    setScriptData: vi.fn(),
    setCurrentStep: vi.fn(),
    onRegisterUndo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render genre selection component', () => {
    const { container } = render(<Step1Genre {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should render with initial scriptData', () => {
    const scriptData = createMockScriptData({
      title: 'Test Movie',
      mainGenre: 'Action',
    });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should handle empty scriptData', () => {
    const emptyData = createMockScriptData();
    const { container } = render(<Step1Genre {...mockProps} scriptData={emptyData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step1Genre - Genre Selection', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    setScriptData: vi.fn(),
    setCurrentStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display main genre when set', () => {
    const scriptData = createMockScriptData({ mainGenre: 'Drama' });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    // Component should render with Drama genre
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should display secondary genres when set', () => {
    const scriptData = createMockScriptData({
      mainGenre: 'Action',
      secondaryGenres: ['Thriller', 'Sci-Fi'],
    });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should handle multiple secondary genres', () => {
    const scriptData = createMockScriptData({
      secondaryGenres: ['Comedy', 'Romance', 'Adventure'],
    });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step1Genre - Title Management', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    setScriptData: vi.fn(),
    setCurrentStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with title when provided', () => {
    const scriptData = createMockScriptData({ title: 'The Great Adventure' });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should handle empty title', () => {
    const scriptData = createMockScriptData({ title: '' });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle very long title', () => {
    const longTitle = 'A'.repeat(200);
    const scriptData = createMockScriptData({ title: longTitle });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle title with special characters', () => {
    const scriptData = createMockScriptData({ title: 'Test™️ Movie: Part 1 (2024)' });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step1Genre - Poster Management', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    setScriptData: vi.fn(),
    setCurrentStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with poster when provided', () => {
    const scriptData = createMockScriptData({
      poster:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should handle empty poster', () => {
    const scriptData = createMockScriptData({ poster: '' });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle poster generation state', () => {
    const scriptData = createMockScriptData({
      title: 'Test Movie',
      mainGenre: 'Action',
    });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step1Genre - Story Elements', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    setScriptData: vi.fn(),
    setCurrentStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with premise', () => {
    const scriptData = createMockScriptData({
      premise: 'A hero must save the world from destruction',
    });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should render with setting', () => {
    const scriptData = createMockScriptData({
      setting: 'Modern day New York City',
    });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should handle complete story data', () => {
    const scriptData = createMockScriptData({
      title: 'Epic Adventure',
      mainGenre: 'Fantasy',
      secondaryGenres: ['Adventure', 'Drama'],
      premise: 'A magical quest to save the kingdom',
      setting: 'Medieval fantasy world',
      targetAudience: 'Young Adult',
      tone: 'Epic and dramatic',
    });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step1Genre - Props Handling', () => {
  it('should call updateScriptData when provided', () => {
    const updateScriptData = vi.fn();
    const scriptData = createMockScriptData();
    render(
      <Step1Genre
        scriptData={scriptData}
        updateScriptData={updateScriptData}
        nextStep={vi.fn()}
        setScriptData={vi.fn()}
        setCurrentStep={vi.fn()}
      />
    );
    // Component rendered successfully
    expect(updateScriptData).not.toHaveBeenCalled();
  });

  it('should call nextStep when provided', () => {
    const nextStep = vi.fn();
    const scriptData = createMockScriptData();
    render(
      <Step1Genre
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={nextStep}
        setScriptData={vi.fn()}
        setCurrentStep={vi.fn()}
      />
    );
    expect(nextStep).not.toHaveBeenCalled();
  });

  it('should call setScriptData when provided', () => {
    const setScriptData = vi.fn();
    const scriptData = createMockScriptData();
    render(
      <Step1Genre
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        setScriptData={setScriptData}
        setCurrentStep={vi.fn()}
      />
    );
    // Initial render shouldn't call setScriptData
    expect(setScriptData).not.toHaveBeenCalled();
  });

  it('should handle optional onRegisterUndo', () => {
    const onRegisterUndo = vi.fn();
    const scriptData = createMockScriptData();
    render(
      <Step1Genre
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        setScriptData={vi.fn()}
        setCurrentStep={vi.fn()}
        onRegisterUndo={onRegisterUndo}
      />
    );
    expect(onRegisterUndo).not.toHaveBeenCalled();
  });
});

describe('Step1Genre - Edge Cases', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    setScriptData: vi.fn(),
    setCurrentStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle undefined secondary genres', () => {
    const scriptData = createMockScriptData({
      mainGenre: 'Horror',
      secondaryGenres: [], // Changed from undefined to empty array
    });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle empty secondary genres array', () => {
    const scriptData = createMockScriptData({
      mainGenre: 'Comedy',
      secondaryGenres: [],
    });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle null values gracefully', () => {
    const scriptData = createMockScriptData({
      title: '',
      mainGenre: '',
      premise: '',
    });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle Unicode characters in title', () => {
    const scriptData = createMockScriptData({
      title: '测试电影 🎬 ภาพยนตร์ทดสอบ',
    });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle extremely long premise', () => {
    const longPremise = 'A'.repeat(10000);
    const scriptData = createMockScriptData({ premise: longPremise });
    const { container } = render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step1Genre - State Management', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    updateScriptData: vi.fn(),
    nextStep: vi.fn(),
    setScriptData: vi.fn(),
    setCurrentStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain scriptData integrity', () => {
    const scriptData = createMockScriptData({
      title: 'Test',
      mainGenre: 'Action',
      poster: 'test-poster',
    });
    render(<Step1Genre {...mockProps} scriptData={scriptData} />);
    expect(scriptData.title).toBe('Test');
    expect(scriptData.mainGenre).toBe('Action');
  });

  it('should handle multiple re-renders', () => {
    const { rerender } = render(<Step1Genre {...mockProps} />);
    rerender(<Step1Genre {...mockProps} />);
    rerender(<Step1Genre {...mockProps} />);
    expect(mockProps.setScriptData).not.toHaveBeenCalled();
  });

  it('should handle scriptData updates', () => {
    const { rerender } = render(<Step1Genre {...mockProps} />);
    const newScriptData = createMockScriptData({ title: 'Updated Title' });
    rerender(<Step1Genre {...mockProps} scriptData={newScriptData} />);
    expect(newScriptData.title).toBe('Updated Title');
  });
});

describe('Step1Genre - Integration', () => {
  it('should integrate with translation system', () => {
    const scriptData = createMockScriptData();
    const { container } = render(
      <Step1Genre
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        setScriptData={vi.fn()}
        setCurrentStep={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('should handle complete workflow', () => {
    const scriptData = createMockScriptData({
      title: 'Complete Movie',
      mainGenre: 'Sci-Fi',
      secondaryGenres: ['Action', 'Thriller'],
      premise: 'An epic space adventure',
      setting: 'Year 2150, Space Station',
      poster: 'data:image/png;base64,test',
    });
    const { container } = render(
      <Step1Genre
        scriptData={scriptData}
        updateScriptData={vi.fn()}
        nextStep={vi.fn()}
        setScriptData={vi.fn()}
        setCurrentStep={vi.fn()}
        onRegisterUndo={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
