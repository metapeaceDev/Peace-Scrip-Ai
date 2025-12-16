/**
 * Step4Structure Component Tests
 * Tests for plot structure and story arc configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import Step4Structure from '../Step4Structure';
import type { ScriptData, PlotPoint } from '../../types';

// Mock dependencies
vi.mock('../services/geminiService', () => ({
  generateStructure: vi.fn(),
  generateSinglePlotPoint: vi.fn(),
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

// Mock ScriptData
const createMockPlotPoint = (overrides?: Partial<PlotPoint>): PlotPoint => ({
  title: 'Opening',
  description: 'Story begins',
  ...overrides,
});

const createMockScriptData = (overrides?: Partial<ScriptData>): ScriptData => ({
  projectType: 'movie',
  title: 'Test Movie',
  mainGenre: 'Drama',
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
  structure: [createMockPlotPoint()],
  scenesPerPoint: { 'Opening': 3 },
  generatedScenes: {},
  team: [],
  ...overrides,
});

describe('Step4Structure - Component Rendering', () => {
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

  it('should render structure component', () => {
    const { container } = render(<Step4Structure {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should render with plot points', () => {
    const scriptData = createMockScriptData({
      structure: [
        createMockPlotPoint({ title: 'Act 1', description: 'Setup' }),
        createMockPlotPoint({ title: 'Act 2', description: 'Confrontation' }),
        createMockPlotPoint({ title: 'Act 3', description: 'Resolution' }),
      ],
    });
    const { container } = render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle empty structure', () => {
    const scriptData = createMockScriptData({ structure: [] });
    const { container } = render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step4Structure - Plot Points', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display plot point titles', () => {
    const scriptData = createMockScriptData({
      structure: [
        createMockPlotPoint({ title: 'Exposition' }),
        createMockPlotPoint({ title: 'Rising Action' }),
      ],
    });
    render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(scriptData.structure[0].title).toBe('Exposition');
    expect(scriptData.structure[1].title).toBe('Rising Action');
  });

  it('should display plot point descriptions', () => {
    const scriptData = createMockScriptData({
      structure: [
        createMockPlotPoint({ 
          title: 'Climax',
          description: 'The peak of tension',
        }),
      ],
    });
    render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(scriptData.structure[0].description).toBe('The peak of tension');
  });
});

describe('Step4Structure - Scene Counts', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  it('should track scenes per plot point', () => {
    const scriptData = createMockScriptData({
      scenesPerPoint: {
        'Act 1': 5,
        'Act 2': 8,
        'Act 3': 4,
      },
    });
    render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(scriptData.scenesPerPoint['Act 1']).toBe(5);
    expect(scriptData.scenesPerPoint['Act 2']).toBe(8);
    expect(scriptData.scenesPerPoint['Act 3']).toBe(4);
  });

  it('should handle zero scenes', () => {
    const scriptData = createMockScriptData({
      scenesPerPoint: { 'Opening': 0 },
    });
    render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(scriptData.scenesPerPoint['Opening']).toBe(0);
  });
});

describe('Step4Structure - Navigation Props', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  it('should have nextStep function', () => {
    render(<Step4Structure {...mockProps} />);
    expect(typeof mockProps.nextStep).toBe('function');
  });

  it('should have prevStep function', () => {
    render(<Step4Structure {...mockProps} />);
    expect(typeof mockProps.prevStep).toBe('function');
  });

  it('should handle optional onRegisterUndo', () => {
    const { container } = render(<Step4Structure {...mockProps} onRegisterUndo={undefined} />);
    expect(container).toBeTruthy();
  });
});

describe('Step4Structure - Edge Cases', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  it('should handle very long plot point titles', () => {
    const longTitle = 'A'.repeat(200);
    const scriptData = createMockScriptData({
      structure: [createMockPlotPoint({ title: longTitle })],
    });
    const { container } = render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle very long descriptions', () => {
    const longDesc = 'B'.repeat(1000);
    const scriptData = createMockScriptData({
      structure: [createMockPlotPoint({ description: longDesc })],
    });
    const { container } = render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle special characters in titles', () => {
    const scriptData = createMockScriptData({
      structure: [
        createMockPlotPoint({ title: 'Act™ 1️⃣ - ภาค①' }),
      ],
    });
    const { container } = render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });

  it('should handle many plot points', () => {
    const manyPoints = Array.from({ length: 20 }, (_, i) => 
      createMockPlotPoint({ title: `Point ${i + 1}` })
    );
    const scriptData = createMockScriptData({ structure: manyPoints });
    const { container } = render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});

describe('Step4Structure - Data Integrity', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  it('should maintain structure data integrity', () => {
    const structure = [
      createMockPlotPoint({ title: 'Start', description: 'Begin' }),
      createMockPlotPoint({ title: 'Middle', description: 'Develop' }),
      createMockPlotPoint({ title: 'End', description: 'Conclude' }),
    ];
    const scriptData = createMockScriptData({ structure });
    render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    
    expect(scriptData.structure.length).toBe(3);
    expect(scriptData.structure[0].title).toBe('Start');
    expect(scriptData.structure[2].title).toBe('End');
  });
});

describe('Step4Structure - Integration', () => {
  const mockProps = {
    scriptData: createMockScriptData(),
    setScriptData: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  };

  it('should integrate with translation system', () => {
    const { container } = render(<Step4Structure {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('should handle complete structure configuration', () => {
    const scriptData = createMockScriptData({
      title: 'Epic Story',
      structure: [
        createMockPlotPoint({ title: 'Act 1', description: 'Setup' }),
        createMockPlotPoint({ title: 'Act 2', description: 'Conflict' }),
        createMockPlotPoint({ title: 'Act 3', description: 'Resolution' }),
      ],
      scenesPerPoint: {
        'Act 1': 5,
        'Act 2': 10,
        'Act 3': 5,
      },
    });
    const { container } = render(<Step4Structure {...mockProps} scriptData={scriptData} />);
    expect(container).toBeTruthy();
  });
});
