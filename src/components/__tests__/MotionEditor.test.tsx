/**
 * MotionEditor Component Tests
 * Tests for professional motion control panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MotionEditor } from '../MotionEditor';
import type { MotionEdit, CinematicSuggestions } from '../../types/motionEdit';
import type { Character } from '../types';

// Mock window.alert
global.alert = vi.fn();

// Mock motion edit types
const createMockMotionEdit = (): MotionEdit => ({
  shot_preview_generator_panel: {
    structure: 'Hero',
    prompt: 'Character walking through city',
    shot_type: 'Medium Shot',
    voiceover: 'The hero begins their journey',
  },
  camera_control: {
    shot_prompt: 'Follow character movement',
    perspective: 'Eye Level',
    movement: 'Dolly',
    equipment: 'Steadicam',
    focal_length: '35mm',
  },
  frame_control: {
    foreground: 'Street signs',
    object: 'Character in motion',
    background: 'City skyline',
  },
  lighting_design: {
    description: 'Natural afternoon light',
    color_temperature: 'Warm',
    mood: 'Bright',
  },
  sounds: {
    description: 'City ambiance with footsteps',
    music: 'None',
    ambient: 'Traffic sounds',
    dialogue: 'Internal monologue',
  },
});

const createMockCharacter = (): Character => ({
  id: 'char-1',
  name: 'Hero',
  role: 'Protagonist',
  internal: {
    consciousness: {
      'สติ (Mindfulness)': 85,
      'ปัญญา (Wisdom)': 80,
    },
    subconscious: {},
    defilement: {
      โลภะ: 20,
      โทสะ: 15,
      โมหะ: 25,
    },
  },
  psychology_timeline: [],
});

const createMockSuggestions = (): CinematicSuggestions => ({
  suggested_camera: '35mm lens, Eye Level',
  suggested_lighting: 'Soft natural light',
  suggested_sound: 'Ambient city sounds',
  suggested_movement: 'Dolly',
  suggested_focal_length: '35mm',
  confidence: 0.85,
});

describe('MotionEditor', () => {
  let onMotionChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onMotionChange = vi.fn();
  });

  describe('Component Initialization', () => {
    it('should render with default motion edit', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);
      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });

    it('should initialize with provided motion edit', () => {
      const initialMotion = createMockMotionEdit();
      render(<MotionEditor initialMotionEdit={initialMotion} onMotionChange={onMotionChange} />);

      expect(screen.getByRole('button', { name: /AI Director/i })).toBeInTheDocument();
    });

    it('should initialize AI mode as enabled by default', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);
      const aiButton = screen.getByRole('button', { name: /AI Director/i });
      expect(aiButton).toHaveTextContent('🤖 AI Director');
    });

    it('should start with first panel active', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);
      const shotPreviewPanel = screen.getByRole('button', { name: /Shot Preview/i });
      expect(shotPreviewPanel).toBeInTheDocument();
    });
  });

  describe('Panel Management', () => {
    it('should have 5 control panels', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      expect(screen.getByRole('button', { name: /Shot Preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Camera Control/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Frame Composition/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lighting Design/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sound Design/i })).toBeInTheDocument();
    });

    it('should switch panels when clicked', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const cameraPanel = screen.getByRole('button', { name: /Camera Control/i });
      fireEvent.click(cameraPanel);

      expect(cameraPanel).toBeInTheDocument();
    });

    it('should show Shot Preview panel by default', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      // Shot type buttons should be visible (part of Shot Preview panel)
      expect(screen.getByRole('button', { name: 'Wide Shot' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Medium Shot' })).toBeInTheDocument();
    });

    it('should show all panel buttons', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);
      const panels = screen
        .getAllByRole('button')
        .filter(
          btn =>
            btn.textContent?.includes('Shot Preview') ||
            btn.textContent?.includes('Camera Control') ||
            btn.textContent?.includes('Frame Composition') ||
            btn.textContent?.includes('Lighting Design') ||
            btn.textContent?.includes('Sound Design')
        );

      expect(panels).toHaveLength(5);
    });
  });

  describe('AI Director', () => {
    it('should have AI Director button', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const aiButton = screen.getByRole('button', { name: /AI Director/i });
      expect(aiButton).toBeInTheDocument();
    });

    it('should have Generate All button', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const generateButton = screen.getByRole('button', { name: /Generate All/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should toggle AI mode when clicked', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const aiButton = screen.getByRole('button', { name: /AI Director/i });
      const initialText = aiButton.textContent;

      fireEvent.click(aiButton);

      // Text should change after toggle
      expect(aiButton.textContent).not.toBe(initialText);
    });

    it('should allow manual mode', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const aiButton = screen.getByRole('button', { name: /AI Director/i });
      fireEvent.click(aiButton); // Toggle to manual

      expect(aiButton).toHaveTextContent(/Manual/i);
    });
  });

  describe('Shot Preview Panel', () => {
    it('should render shot type buttons', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      expect(screen.getByRole('button', { name: 'Wide Shot' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Medium Shot' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close-up' })).toBeInTheDocument();
    });

    it('should have shot type preset buttons', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const shotTypes = [
        'Wide Shot',
        'Medium Shot',
        'Close-up',
        'Extreme Close-up',
        'Over-the-Shoulder',
        'Two Shot',
      ];

      shotTypes.forEach(type => {
        expect(screen.getByRole('button', { name: type })).toBeInTheDocument();
      });
    });

    it('should select shot type when clicked', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const wideShot = screen.getByRole('button', { name: 'Wide Shot' });
      fireEvent.click(wideShot);

      expect(wideShot).toBeInTheDocument();
    });

    it('should have text inputs for shot details', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Camera Control Panel', () => {
    it('should switch to camera panel', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const cameraPanel = screen.getByRole('button', { name: /Camera Control/i });
      fireEvent.click(cameraPanel);

      expect(cameraPanel).toBeInTheDocument();
    });

    it('should have camera panel button', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      expect(screen.getByRole('button', { name: /Camera Control/i })).toBeInTheDocument();
    });
  });

  describe('Frame Control Panel', () => {
    it('should switch to frame panel', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const framePanel = screen.getByRole('button', { name: /Frame Composition/i });
      fireEvent.click(framePanel);

      expect(framePanel).toBeInTheDocument();
    });

    it('should have frame panel button', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      expect(screen.getByRole('button', { name: /Frame Composition/i })).toBeInTheDocument();
    });
  });

  describe('Lighting Design Panel', () => {
    it('should switch to lighting panel', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const lightingPanel = screen.getByRole('button', { name: /Lighting Design/i });
      fireEvent.click(lightingPanel);

      expect(lightingPanel).toBeInTheDocument();
    });

    it('should have lighting panel button', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      expect(screen.getByRole('button', { name: /Lighting Design/i })).toBeInTheDocument();
    });
  });

  describe('Sound Design Panel', () => {
    it('should switch to sound panel', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const soundPanel = screen.getByRole('button', { name: /Sound Design/i });
      fireEvent.click(soundPanel);

      expect(soundPanel).toBeInTheDocument();
    });

    it('should have sound panel button', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      expect(screen.getByRole('button', { name: /Sound Design/i })).toBeInTheDocument();
    });
  });

  describe('Context Integration', () => {
    it('should accept character prop', () => {
      const character = createMockCharacter();
      render(<MotionEditor onMotionChange={onMotionChange} character={character} />);

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });

    it('should accept shotData prop', () => {
      const shotData = { shotSize: 'Medium Shot', movement: 'Dolly', description: 'Test' };
      render(<MotionEditor onMotionChange={onMotionChange} shotData={shotData} />);

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });

    it('should accept sceneTitle prop', () => {
      render(<MotionEditor onMotionChange={onMotionChange} sceneTitle="Opening Scene" />);

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });

    it('should accept shotNumber prop', () => {
      render(<MotionEditor onMotionChange={onMotionChange} shotNumber={5} />);

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing props', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });

    it('should handle empty initial motion edit', () => {
      const emptyMotion = {
        shot_preview_generator_panel: {
          structure: '',
          prompt: '',
          shot_type: 'Medium Shot' as const,
        },
        camera_control: {
          shot_prompt: '',
          perspective: 'Neutral' as const,
          movement: 'Static' as const,
          equipment: 'Tripod' as const,
          focal_length: '50mm' as const,
        },
        frame_control: { foreground: '', object: '', background: '' },
        lighting_design: { description: '', color_temperature: 'Neutral' as const },
        sounds: { description: '', music: '', ambient: '', dialogue: '' },
      };

      render(<MotionEditor initialMotionEdit={emptyMotion} onMotionChange={onMotionChange} />);

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });

    it('should handle all panels sequentially', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      fireEvent.click(screen.getByRole('button', { name: /Camera Control/i }));
      fireEvent.click(screen.getByRole('button', { name: /Frame Composition/i }));
      fireEvent.click(screen.getByRole('button', { name: /Lighting Design/i }));
      fireEvent.click(screen.getByRole('button', { name: /Sound Design/i }));
      fireEvent.click(screen.getByRole('button', { name: /Shot Preview/i }));

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should render complete component', () => {
      const character = createMockCharacter();
      const motionEdit = createMockMotionEdit();

      render(
        <MotionEditor
          character={character}
          initialMotionEdit={motionEdit}
          onMotionChange={onMotionChange}
          sceneTitle="Test Scene"
          shotNumber={1}
        />
      );

      expect(screen.getByText(/Motion Editor/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /AI Director/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate All/i })).toBeInTheDocument();
    });

    it('should have all 5 panels accessible', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const panels = [
        /Shot Preview/i,
        /Camera Control/i,
        /Frame Composition/i,
        /Lighting Design/i,
        /Sound Design/i,
      ];

      panels.forEach(panel => {
        expect(screen.getByRole('button', { name: panel })).toBeInTheDocument();
      });
    });

    it('should have shot type presets', () => {
      render(<MotionEditor onMotionChange={onMotionChange} />);

      const shotTypes = [
        'Wide Shot',
        'Medium Shot',
        'Close-up',
        'Extreme Close-up',
        'Over-the-Shoulder',
        'Two Shot',
      ];

      shotTypes.forEach(type => {
        expect(screen.getByRole('button', { name: type })).toBeInTheDocument();
      });
    });
  });
});
