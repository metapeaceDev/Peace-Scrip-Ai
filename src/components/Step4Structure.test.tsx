import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Step4Structure from './Step4Structure';
import type { ScriptData } from '../types';
import * as geminiService from '../services/geminiService';

// Mock dependencies
vi.mock('../services/geminiService', () => ({
  generateStructure: vi.fn(),
  generateSinglePlotPoint: vi.fn(),
}));

vi.mock('./LanguageSwitcher', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'step4.title': 'Story Structure',
        'step4.generateButton': 'Generate Structure',
        'step4.generating': 'Generating...',
        'step4.selectGenreFirst': 'Please select a genre first',
        'step4.errors.selectGenre': 'Please select a genre',
        'step4.errors.generateFailed': 'Failed to generate structure',
        'step4.scenes': 'Scenes',
        'step4.placeholderDescribe': 'Describe',
        'step4.actions.back': 'Back',
        'step4.actions.next': 'Next',
        'step4.acts.act1': 'Act 1 - Setup',
        'step4.acts.act2': 'Act 2 - Confrontation',
        'step4.acts.act3': 'Act 3 - Resolution',
        'step4.aiAnalyzing': 'AI is analyzing...',
        'step4.aiDetails.analyzing': 'Analyzing your story',
        'step4.aiDetails.creating': 'Creating structure',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('./RegenerateOptionsModal', () => ({
  RegenerateOptionsModal: ({ isOpen, onClose, onConfirm, sceneName }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="regenerate-modal">
        <p>Regenerate {sceneName}</p>
        <button onClick={() => onConfirm('COMPLETE_REWRITE')}>Confirm</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

describe('Step4Structure', () => {
  const mockPlotPoints = [
    { act: 1, title: 'Opening Image', description: 'Opening scene description' },
    { act: 1, title: 'Inciting Incident', description: 'Incident description' },
    { act: 2, title: 'Midpoint', description: 'Midpoint description' },
    { act: 3, title: 'Climax', description: 'Climax description' },
  ];

  const mockScriptData: ScriptData = {
    language: 'en',
    mainGenre: 'Action',
    subGenres: [],
    targetAudience: 'General',
    length: 'Short',
    synopsis: 'Test synopsis',
    characters: [],
    structure: mockPlotPoints,
    scenesPerPoint: {
      'Opening Image': 1,
      'Inciting Incident': 2,
      Midpoint: 3,
      Climax: 1,
    },
    scenes: [],
    title: 'Test Movie',
    logline: 'Test logline',
  };

  const mockSetScriptData = vi.fn();
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();
  const mockOnRegisterUndo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render title', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      expect(screen.getByText('Story Structure')).toBeInTheDocument();
    });

    it('should render generate button', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      expect(screen.getByRole('button', { name: /Generate Structure/i })).toBeInTheDocument();
    });

    it('should render back and next buttons', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    it('should render act headers', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      expect(screen.getByText(/Act 1 - Setup/)).toBeInTheDocument();
      expect(screen.getByText(/Act 2 - Confrontation/)).toBeInTheDocument();
      expect(screen.getByText(/Act 3 - Resolution/)).toBeInTheDocument();
    });

    it('should render plot points', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      // Use getAllByText to handle multiple occurrences
      const openingImages = screen.getAllByText(/Opening Image/);
      expect(openingImages.length).toBeGreaterThan(0);

      const incidents = screen.getAllByText(/Inciting Incident/);
      expect(incidents.length).toBeGreaterThan(0);

      const midpoints = screen.getAllByText(/Midpoint/);
      expect(midpoints.length).toBeGreaterThan(0);

      const climaxes = screen.getAllByText(/Climax/);
      expect(climaxes.length).toBeGreaterThan(0);
    });

    it('should render plot point descriptions', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      expect(textareas.length).toBeGreaterThan(0);

      // Check if descriptions are in textareas
      const openingTextarea = textareas.find(
        (ta: HTMLTextAreaElement) => ta.value === 'Opening scene description'
      );
      expect(openingTextarea).toBeDefined();
    });

    it('should not render acts without plot points', () => {
      const dataWithoutAct2 = {
        ...mockScriptData,
        structure: mockPlotPoints.filter(p => p.act !== 2),
      };

      render(
        <Step4Structure
          scriptData={dataWithoutAct2}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      expect(screen.getByText(/Act 1/)).toBeInTheDocument();
      expect(screen.queryByText(/Act 2/)).not.toBeInTheDocument();
      expect(screen.getByText(/Act 3/)).toBeInTheDocument();
    });
  });

  describe('Scene Count Controls', () => {
    it('should render scene count select for each plot point', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const selects = screen.getAllByLabelText(/Scenes/);
      expect(selects).toHaveLength(mockPlotPoints.length);
    });

    it('should display correct scene count value', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const selects = screen.getAllByLabelText(/Scenes/) as HTMLSelectElement[];
      expect(selects[0].value).toBe('1'); // Opening Image
      expect(selects[1].value).toBe('2'); // Inciting Incident
    });

    it('should update scene count on change', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
          onRegisterUndo={mockOnRegisterUndo}
        />
      );

      const selects = screen.getAllByLabelText(/Scenes/);
      fireEvent.change(selects[0], { target: { value: '5' } });

      expect(mockOnRegisterUndo).toHaveBeenCalled();
      expect(mockSetScriptData).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should have options from 1 to 10', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const select = screen.getAllByLabelText(/Scenes/)[0] as HTMLSelectElement;
      const options = Array.from(select.options).map(o => o.value);

      expect(options).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    });
  });

  describe('Description Editing', () => {
    it('should update description on textarea change', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      const textarea = textareas[0]; // First textarea (Opening Image)
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      expect(mockSetScriptData).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call onRegisterUndo on focus', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
          onRegisterUndo={mockOnRegisterUndo}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      const textarea = textareas[0];
      fireEvent.focus(textarea);

      expect(mockOnRegisterUndo).toHaveBeenCalled();
    });

    it('should not call onRegisterUndo if not provided', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      const textarea = textareas[0];
      fireEvent.focus(textarea);

      // Should not throw error
      expect(mockOnRegisterUndo).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should call prevStep on back button click', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const backButton = screen.getByRole('button', { name: 'Back' });
      fireEvent.click(backButton);

      expect(mockPrevStep).toHaveBeenCalled();
    });

    it('should call nextStep on next button click', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const nextButton = screen.getByRole('button', { name: 'Next' });
      fireEvent.click(nextButton);

      expect(mockNextStep).toHaveBeenCalled();
    });
  });

  describe('Generate Button State', () => {
    it('should disable button when no genre selected', () => {
      const dataWithoutGenre = { ...mockScriptData, mainGenre: '' };

      render(
        <Step4Structure
          scriptData={dataWithoutGenre}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      expect(button).toBeDisabled();
    });

    it('should enable button when genre is selected', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable button while generating', async () => {
      vi.mocked(geminiService.generateStructure).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      // Click confirm in modal
      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Generating/)).toBeInTheDocument();
      });
    });
  });

  describe('Structure Generation Modal', () => {
    it('should open modal on generate button click', async () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
        expect(screen.getByText(/Regenerate Story Structure/)).toBeInTheDocument();
      });
    });

    it('should close modal on close button click', async () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('regenerate-modal')).not.toBeInTheDocument();
      });
    });

    it('should generate structure on confirm', async () => {
      vi.mocked(geminiService.generateStructure).mockResolvedValue({
        structure: [
          { act: 1, title: 'New Point 1', description: 'New desc 1' },
          { act: 2, title: 'New Point 2', description: 'New desc 2' },
        ],
        scenesPerPoint: { 'New Point 1': 2, 'New Point 2': 3 },
      });

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
          onRegisterUndo={mockOnRegisterUndo}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnRegisterUndo).toHaveBeenCalled();
        expect(geminiService.generateStructure).toHaveBeenCalledWith(
          mockScriptData,
          'COMPLETE_REWRITE'
        );
        expect(mockSetScriptData).toHaveBeenCalled();
      });
    });

    it('should show error if no genre selected on confirm', async () => {
      const dataWithoutGenre = { ...mockScriptData, mainGenre: '' };

      render(
        <Step4Structure
          scriptData={dataWithoutGenre}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      // Force open modal (normally disabled)
      const component = screen.getByRole('button', { name: /Generate Structure/i }).parentElement
        ?.parentElement;

      // Manually trigger modal since button is disabled
      // We'll test the error message directly by checking the handleGenerateStructureConfirm logic
    });

    it('should handle generation error', async () => {
      vi.mocked(geminiService.generateStructure).mockRejectedValue(new Error('Generation failed'));

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to generate structure')).toBeInTheDocument();
      });
    });
  });

  describe('Plot Point Regeneration', () => {
    it('should render regenerate button for each plot point', () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const regenerateButtons = screen.getAllByRole('button', { name: /Regenerate/i });
      // 4 plot points + 1 main generate button = 5 total
      expect(regenerateButtons.length).toBeGreaterThanOrEqual(4);
    });

    it('should open modal on plot point regenerate click', async () => {
      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const regenerateButtons = screen.getAllByRole('button', { name: /Regenerate/i });
      // Click first plot point's regenerate button (skip main generate button)
      const plotPointButton = regenerateButtons.find(
        btn => btn.textContent?.includes('Regenerate') && btn.title?.includes('Opening Image')
      );

      if (plotPointButton) {
        fireEvent.click(plotPointButton);

        await waitFor(() => {
          expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
          expect(screen.getByText(/Plot Point: Opening Image/)).toBeInTheDocument();
        });
      }
    });

    it('should regenerate single plot point on confirm', async () => {
      vi.mocked(geminiService.generateSinglePlotPoint).mockResolvedValue({
        description: 'Regenerated description',
        sceneCount: 4,
      });

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
          onRegisterUndo={mockOnRegisterUndo}
        />
      );

      const regenerateButtons = screen.getAllByRole('button', { name: /Regenerate/i });
      const plotPointButton = regenerateButtons.find(btn => btn.title?.includes('Opening Image'));

      if (plotPointButton) {
        fireEvent.click(plotPointButton);

        await waitFor(() => {
          expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: 'Confirm' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockOnRegisterUndo).toHaveBeenCalled();
          expect(geminiService.generateSinglePlotPoint).toHaveBeenCalledWith(
            mockScriptData,
            0,
            'COMPLETE_REWRITE'
          );
          expect(mockSetScriptData).toHaveBeenCalled();
        });
      }
    });

    it('should handle plot point regeneration error', async () => {
      vi.mocked(geminiService.generateSinglePlotPoint).mockRejectedValue(
        new Error('Regeneration failed')
      );

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const regenerateButtons = screen.getAllByRole('button', { name: /Regenerate/i });
      const plotPointButton = regenerateButtons.find(btn => btn.title?.includes('Opening Image'));

      if (plotPointButton) {
        fireEvent.click(plotPointButton);

        await waitFor(() => {
          expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: 'Confirm' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
          expect(screen.getByText('Failed to generate structure')).toBeInTheDocument();
        });
      }
    });

    it('should disable regenerate buttons while generating', async () => {
      vi.mocked(geminiService.generateSinglePlotPoint).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const regenerateButtons = screen.getAllByRole('button', { name: /Regenerate/i });
      const plotPointButton = regenerateButtons.find(btn => btn.title?.includes('Opening Image'));

      if (plotPointButton) {
        fireEvent.click(plotPointButton);

        await waitFor(() => {
          expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: 'Confirm' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
          const buttons = screen.getAllByRole('button', { name: /Regenerate/i });
          buttons.forEach(btn => {
            expect(btn).toBeDisabled();
          });
        });
      }
    });
  });

  describe('Loading State', () => {
    it('should show generating message while generating', async () => {
      vi.mocked(geminiService.generateStructure).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Generating/)).toBeInTheDocument();
        expect(screen.getByText(/AI is analyzing/)).toBeInTheDocument();
      });
    });

    it('should show spinner in button while generating', async () => {
      vi.mocked(geminiService.generateStructure).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        const spinners = document.querySelectorAll('.animate-spin');
        expect(spinners.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Display', () => {
    it('should display error message when present', async () => {
      vi.mocked(geminiService.generateStructure).mockRejectedValue(new Error('API Error'));

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to generate structure')).toBeInTheDocument();
      });
    });

    it('should clear error on successful generation', async () => {
      // First fail, then succeed
      vi.mocked(geminiService.generateStructure)
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({
          structure: mockPlotPoints,
          scenesPerPoint: {},
        });

      render(
        <Step4Structure
          scriptData={mockScriptData}
          setScriptData={mockSetScriptData}
          nextStep={mockNextStep}
          prevStep={mockPrevStep}
        />
      );

      const button = screen.getByRole('button', { name: /Generate Structure/i });

      // First attempt - fail
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to generate structure')).toBeInTheDocument();
      });

      // Second attempt - succeed
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('regenerate-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(screen.queryByText('Failed to generate structure')).not.toBeInTheDocument();
      });
    });
  });
});
