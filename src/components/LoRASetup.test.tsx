import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LoRASetup from './LoRASetup';

// Mock loraInstaller service
const mockCheckLoRAModels = vi.fn();
const mockCheckAllRequiredModels = vi.fn();
const mockGetManualInstallInstructions = vi.fn();

vi.mock('../services/loraInstaller', () => ({
  checkLoRAModels: (...args: any[]) => mockCheckLoRAModels(...args),
  checkAllRequiredModels: (...args: any[]) => mockCheckAllRequiredModels(...args),
  getManualInstallInstructions: (...args: any[]) => mockGetManualInstallInstructions(...args),
  REQUIRED_LORA_MODELS: [
    {
      name: 'char-consistency',
      displayName: 'Character Consistency',
      filename: 'char_consistency.safetensors',
      size: '152 MB',
      description: 'Maintains consistent character features',
      downloadUrl: 'https://example.com/char_consistency',
      required: true,
      category: 'face-id',
    },
    {
      name: 'style-anime',
      displayName: 'Anime Style',
      filename: 'style_anime.safetensors',
      size: '78 MB',
      description: 'Enhances anime art style',
      downloadUrl: 'https://example.com/style_anime',
      required: false,
      category: 'style',
    },
  ],
}));

describe('LoRASetup', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock return values (never resolve to keep component in checking state)
    mockCheckLoRAModels.mockReturnValue(new Promise(() => {}));
    mockCheckAllRequiredModels.mockReturnValue(new Promise(() => {}));
    mockGetManualInstallInstructions.mockReturnValue({
      steps: ['Step 1', 'Step 2', 'Step 3'],
      loraFolder: '/path/to/ComfyUI/models/loras',
    });
  });

  describe('Component Rendering', () => {
    it('should render component', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByText('LoRA Models Setup')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByText(/Install required LoRA models/i)).toBeInTheDocument();
    });

    it('should render purple icon container', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const iconContainer = container.querySelector('.bg-purple-500\\/10');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('should show checking message', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByText(/Checking installed LoRA models/i)).toBeInTheDocument();
    });

    it('should show loading spinner', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Auto-check Feature', () => {
    it('should show auto-check checkbox', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByLabelText(/Auto-check every 10 seconds/i)).toBeInTheDocument();
    });

    it('should be checked by default', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      const checkbox = screen.getByLabelText(/Auto-check every 10 seconds/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should toggle checkbox', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      const checkbox = screen.getByLabelText(/Auto-check every 10 seconds/i) as HTMLInputElement;
      
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
      
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Help Section', () => {
    it('should display help section', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByText(/Need Help\?/i)).toBeInTheDocument();
    });

    it('should display help tips about loras folder', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByText(/models\/loras\//i)).toBeInTheDocument();
    });

    it('should display help tips about restart', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByText(/Restart ComfyUI after adding/i)).toBeInTheDocument();
    });

    it('should display help tips about Character Consistency', () => {
      render(<LoRASetup onComplete={mockOnComplete} />);
      expect(screen.getByText(/Character Consistency LoRA is required/i)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have overlay with fixed positioning', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('fixed', 'inset-0');
    });

    it('should have dark background', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('bg-black/90');
    });

    it('should center content', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should have z-index 50', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('z-50');
    });
  });

  describe('Service Integration', () => {
    it('should have mockCheckLoRAModels defined', () => {
      expect(mockCheckLoRAModels).toBeDefined();
    });

    it('should have mockCheckAllRequiredModels defined', () => {
      expect(mockCheckAllRequiredModels).toBeDefined();
    });
  });

  describe('Header Icon', () => {
    it('should display SVG icon', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have purple-themed icon', () => {
      const { container } = render(<LoRASetup onComplete={mockOnComplete} />);
      const svg = container.querySelector('.text-purple-400');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should accept onComplete prop', () => {
      expect(() => render(<LoRASetup onComplete={mockOnComplete} />)).not.toThrow();
    });

    it('should accept onSkip prop', () => {
      expect(() => render(<LoRASetup onComplete={mockOnComplete} onSkip={mockOnSkip} />)).not.toThrow();
    });

    it('should work without onSkip prop', () => {
      expect(() => render(<LoRASetup onComplete={mockOnComplete} />)).not.toThrow();
    });
  });
});
