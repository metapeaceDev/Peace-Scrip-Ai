import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step3Character from '../components/Step3Character';
import { EMPTY_CHARACTER } from '../../constants';

describe('Step3Character', () => {
  const mockSetScriptData = vi.fn();
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();

  const defaultProps = {
    scriptData: {
      title: 'Test Script',
      mainGenre: 'Drama',
      projectType: 'Movie' as const,
      characters: [],
      secondaryGenres: [],
      language: 'English' as const,
      bigIdea: '',
      premise: '',
      theme: '',
      logLine: '',
      timeline: {
        movieTiming: '',
        seasons: '',
        date: '',
        social: '',
        economist: '',
        environment: ''
      },
      structure: [],
      scenesPerPoint: {},
      generatedScenes: {},
      team: []
    },
    setScriptData: mockSetScriptData,
    nextStep: mockNextStep,
    prevStep: mockPrevStep
  };

  it('renders character creation section', () => {
    render(<Step3Character {...defaultProps} />);
    expect(screen.getByText(/ตัวละคร/i)).toBeInTheDocument();
  });

  it('displays generate character button', () => {
    render(<Step3Character {...defaultProps} />);
    const generateBtn = screen.getByText(/สร้างตัวละครด้วย AI/i);
    expect(generateBtn).toBeInTheDocument();
  });

  it('calls prevStep when back button is clicked', () => {
    render(<Step3Character {...defaultProps} />);
    const backButton = screen.getByText(/ย้อนกลับ/i);
    fireEvent.click(backButton);
    expect(mockPrevStep).toHaveBeenCalled();
  });

  it('shows character list when characters exist', () => {
    const testCharacter = { 
      ...EMPTY_CHARACTER, 
      id: '1', 
      name: 'Test Character'
    };
    
    const propsWithCharacters = {
      ...defaultProps,
      scriptData: {
        ...defaultProps.scriptData,
        characters: [testCharacter]
      }
    };
    render(<Step3Character {...propsWithCharacters} />);
    expect(screen.getByText('Test Character')).toBeInTheDocument();
  });
});
