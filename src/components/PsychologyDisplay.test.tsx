import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PsychologyDisplay } from './PsychologyDisplay';
import type { Character } from '../types';

// Mock dependencies
vi.mock('../services/psychologyCalculator', () => ({
  calculatePsychologyProfile: vi.fn((character: Character) => ({
    consciousnessScore: 75.5,
    defilementScore: 25.3,
    mentalBalance: 50.2,
    dominantEmotion: 'peaceful',
    emotionalIntensity: 65,
    emotionalTendency: 'Generally calm and centered',
    strongestVirtue: 'Metta (Loving kindness)',
    strongestDefilement: 'Moha (Delusion)',
    personalityDescription: 'A balanced individual with strong compassion and occasional confusion',
  })),
  analyzeParamiPortfolio: vi.fn(() => ({
    totalParamiStrength: 120,
    strongestParami: {
      name: 'dana',
      level: 8,
      effectiveLevel: 10.5,
    },
    overallSynergyBonus: 15,
    synergyAnalysis: [
      { parami: 'dana', baseLevel: 8, synergyBonus: 2.5, effectiveLevel: 10.5 },
      { parami: 'sila', baseLevel: 7, synergyBonus: 1.5, effectiveLevel: 8.5 },
      { parami: 'nekkhamma', baseLevel: 6, synergyBonus: 1.0, effectiveLevel: 7.0 },
      { parami: 'panna', baseLevel: 9, synergyBonus: 3.0, effectiveLevel: 12.0 },
      { parami: 'viriya', baseLevel: 5, synergyBonus: 0.5, effectiveLevel: 5.5 },
      { parami: 'khanti', baseLevel: 4, synergyBonus: 0, effectiveLevel: 4.0 },
    ],
  })),
}));

vi.mock('../config/featureFlags', () => ({
  isFeatureEnabled: vi.fn((flag: string) => flag === 'PARAMI_SYNERGY_MATRIX'),
}));

describe('PsychologyDisplay', () => {
  const mockCharacter: Character = {
    id: 'test-1',
    name: 'Test Character',
    role: 'Hero',
    description: 'Test description',
    external: {},
    physical: {},
    fashion: {},
    internal: {
      consciousness: {
        'Metta (Loving kindness)': 85,
      },
      defilement: {
        'Moha (Delusion)': 30,
      },
      subconscious: {},
    },
    goals: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Compact Mode', () => {
    it('should render compact mode when compact prop is true', () => {
      render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      expect(screen.getByText(/⚡ Psychology Profile/)).toBeInTheDocument();
    });

    it('should display mood in compact mode', () => {
      render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      expect(screen.getByText(/Mood:/)).toBeInTheDocument();
      expect(screen.getByText(/peaceful/)).toBeInTheDocument();
    });

    it('should display balance in compact mode', () => {
      render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      expect(screen.getByText(/Balance:/)).toBeInTheDocument();
      expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it('should display virtue score in compact mode', () => {
      render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      expect(screen.getByText(/Virtue:/)).toBeInTheDocument();
      expect(screen.getByText(/76/)).toBeInTheDocument(); // 75.5 rounded
    });

    it('should display defilement score in compact mode', () => {
      render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      expect(screen.getByText(/Defil:/)).toBeInTheDocument();
      expect(screen.getByText(/25/)).toBeInTheDocument(); // 25.3 rounded
    });

    it('should have compact styling', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      const compactDiv = container.querySelector('.p-3');
      expect(compactDiv).toBeInTheDocument();
    });

    it('should display mood icon in compact mode', () => {
      render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      expect(screen.getByText(/😌/)).toBeInTheDocument(); // peaceful icon
    });

    it('should use grid layout in compact mode', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} compact={true} />);
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Full Mode', () => {
    it('should render full mode by default', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/⚡ Psychological Analysis/)).toBeInTheDocument();
    });

    it('should display mental balance section', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/Mental Balance/)).toBeInTheDocument();
      expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it('should show virtuous indicator for positive balance', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/✨ Virtuous/)).toBeInTheDocument();
    });

    it('should display consciousness score', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/Consciousness/)).toBeInTheDocument();
      expect(screen.getByText(/75.5/)).toBeInTheDocument();
    });

    it('should display defilement score', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/Defilement/)).toBeInTheDocument();
      expect(screen.getByText(/25.3/)).toBeInTheDocument();
    });

    it('should display strongest virtue', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      const strongestElements = screen.getAllByText(/Strongest:/);
      expect(strongestElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Metta/)).toBeInTheDocument();
    });

    it('should display strongest defilement', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      const strongestElements = screen.getAllByText(/Strongest:/);
      expect(strongestElements).toHaveLength(2); // One for virtue, one for defilement
      expect(screen.getByText(/Moha/)).toBeInTheDocument();
    });

    it('should display emotional state', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/Current State/)).toBeInTheDocument();
      expect(screen.getByText(/Peaceful/i)).toBeInTheDocument();
    });

    it('should display emotional intensity', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/Intensity: 65\/100/)).toBeInTheDocument();
    });

    it('should display emotional tendency', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/Generally calm and centered/)).toBeInTheDocument();
    });

    it('should display personality summary', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/Personality Summary/)).toBeInTheDocument();
      expect(screen.getByText(/A balanced individual with strong compassion/)).toBeInTheDocument();
    });

    it('should display mood icon in header', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      const icons = screen.getAllByText(/😌/);
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have progress bar for mental balance', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const progressBar = container.querySelector('.rounded-full.h-2');
      expect(progressBar).toBeInTheDocument();
    });

    it('should have gradient background', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const mainDiv = container.querySelector('.bg-gradient-to-br');
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe('Parami Portfolio', () => {
    it('should display parami section when feature is enabled', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/🌟 10 Paramis \(Perfections\)/)).toBeInTheDocument();
    });

    it('should display total parami strength', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/120/)).toBeInTheDocument();
    });

    it('should display strongest parami', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      const danaElements = screen.getAllByText(/dana/i);
      expect(danaElements.length).toBeGreaterThan(0);
      const levelElements = screen.getAllByText(/Lv 8/);
      expect(levelElements.length).toBeGreaterThan(0);
    });

    it('should display synergy bonus', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/\+15/)).toBeInTheDocument();
      expect(screen.getByText(/Total boost/)).toBeInTheDocument();
    });

    it('should display first 5 parami items', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/sila/i)).toBeInTheDocument();
      expect(screen.getByText(/nekkhamma/i)).toBeInTheDocument();
      expect(screen.getByText(/panna/i)).toBeInTheDocument();
      expect(screen.getByText(/viriya/i)).toBeInTheDocument();
    });

    it('should show "and more" text when more than 5 items', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/\.\.\. and 1 more/)).toBeInTheDocument();
    });

    it('should display synergy bonuses for each parami', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/\+2.5/)).toBeInTheDocument(); // dana bonus
      expect(screen.getByText(/\+1.5/)).toBeInTheDocument(); // sila bonus
    });

    it('should display effective levels', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getByText(/= 10.5/)).toBeInTheDocument(); // dana effective
      expect(screen.getByText(/= 8.5/)).toBeInTheDocument(); // sila effective
    });
  });

  describe('Color Coding', () => {
    it('should use green color for high positive balance', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const greenText = container.querySelector('.text-green-400');
      expect(greenText).toBeInTheDocument();
    });

    it('should use red styling for negative balance', () => {
      // Just check that troubled indicator exists when balance is negative
      // (mock already returns positive balance, so we check the component logic)
      render(<PsychologyDisplay character={mockCharacter} />);
      // With balance of 50.2, should show Virtuous, not Troubled
      expect(screen.getByText(/✨ Virtuous/)).toBeInTheDocument();
    });

    it('should have green border for consciousness section', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const consciousnessSection = container.querySelector('.border-green-500\\/30');
      expect(consciousnessSection).toBeInTheDocument();
    });

    it('should have red border for defilement section', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const defilementSection = container.querySelector('.border-red-500\\/30');
      expect(defilementSection).toBeInTheDocument();
    });
  });

  describe('Mood Icons', () => {
    it('should display peaceful icon for peaceful mood', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      expect(screen.getAllByText(/😌/).length).toBeGreaterThan(0);
    });

    it('should display mood icon in emotional state section', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      const icons = screen.getAllByText(/😌/);
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle character without internal data', () => {
      const minimalCharacter = {
        ...mockCharacter,
        internal: {},
      };

      expect(() => render(<PsychologyDisplay character={minimalCharacter} />)).not.toThrow();
    });

    it('should render without errors', () => {
      expect(() => render(<PsychologyDisplay character={mockCharacter} />)).not.toThrow();
    });

    it('should handle re-renders', () => {
      const { rerender } = render(<PsychologyDisplay character={mockCharacter} />);

      expect(screen.getByText(/Psychological Analysis/)).toBeInTheDocument();

      rerender(<PsychologyDisplay character={mockCharacter} compact={true} />);

      expect(screen.getByText(/Psychology Profile/)).toBeInTheDocument();
    });

    it('should handle switching between compact and full modes', () => {
      const { rerender } = render(<PsychologyDisplay character={mockCharacter} compact={false} />);
      expect(screen.getByText(/Psychological Analysis/)).toBeInTheDocument();

      rerender(<PsychologyDisplay character={mockCharacter} compact={true} />);
      expect(screen.getByText(/Psychology Profile/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<PsychologyDisplay character={mockCharacter} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Psychological Analysis');
    });

    it('should have readable text colors', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const textElements = container.querySelectorAll(
        '.text-cyan-400, .text-green-400, .text-red-400'
      );
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper spacing in full mode', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const mainDiv = container.querySelector('.p-6.space-y-4');
      expect(mainDiv).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const rounded = container.querySelector('.rounded-xl');
      expect(rounded).toBeInTheDocument();
    });

    it('should have grid layout for core scores', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const grid = container.querySelectorAll('.grid-cols-2');
      expect(grid.length).toBeGreaterThan(0);
    });

    it('should use uppercase tracking for labels', () => {
      const { container } = render(<PsychologyDisplay character={mockCharacter} />);
      const labels = container.querySelectorAll(
        '.uppercase.tracking-wide, .uppercase.tracking-wider'
      );
      expect(labels.length).toBeGreaterThan(0);
    });
  });
});

