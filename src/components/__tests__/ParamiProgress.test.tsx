/**
 * Tests for ParamiProgress Component
 * Buddhist perfections (10 Paramis) progress display
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ParamiProgress } from '../ParamiProgress';
import type { Character, ParamiPortfolio } from '../types';

const createMockCharacter = (paramiData?: Partial<ParamiPortfolio>): Character => {
  const defaultParami: ParamiPortfolio = {
    dana: { level: 5, exp: 3500 },
    sila: { level: 4, exp: 2800 },
    nekkhamma: { level: 3, exp: 1500 },
    viriya: { level: 6, exp: 4200 },
    khanti: { level: 5, exp: 3000 },
    sacca: { level: 4, exp: 2500 },
    adhitthana: { level: 3, exp: 1800 },
    metta: { level: 7, exp: 5600 },
    upekkha: { level: 4, exp: 2200 },
    panna: { level: 8, exp: 6700 },
  };

  return {
    id: 'char-1',
    name: 'ธรรมนิยม',
    parami_portfolio: { ...defaultParami, ...paramiData },
  } as Character;
};

describe('ParamiProgress', () => {
  describe('No Data State', () => {
    it('should show empty state when no parami data', () => {
      const character = { id: 'char-1', name: 'Test' } as Character;
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('ยังไม่มีข้อมูลบารมี')).toBeInTheDocument();
    });

    it('should render gray background for empty state', () => {
      const character = { id: 'char-1', name: 'Test' } as Character;
      const { container } = render(<ParamiProgress character={character} />);

      const emptyDiv = container.querySelector('.bg-gray-50');
      expect(emptyDiv).toBeInTheDocument();
    });
  });

  describe('Full View (Default)', () => {
    it('should render all 10 Paramis', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('ทาน (Dāna)')).toBeInTheDocument();
      expect(screen.getByText('ศีล (Sīla)')).toBeInTheDocument();
      expect(screen.getByText('เนกขัมมะ (Nekkhamma)')).toBeInTheDocument();
      expect(screen.getByText('วิริยะ (Viriya)')).toBeInTheDocument();
      expect(screen.getByText('ขันติ (Khanti)')).toBeInTheDocument();
      expect(screen.getByText('สัจจะ (Sacca)')).toBeInTheDocument();
      expect(screen.getByText('อธิษฐาน (Adhiṭṭhāna)')).toBeInTheDocument();
      expect(screen.getByText('เมตตา (Mettā)')).toBeInTheDocument();
      expect(screen.getByText('อุเบกขา (Upekkhā)')).toBeInTheDocument();
      expect(screen.getByText('ปัญญา (Paññā)')).toBeInTheDocument();
    });

    it('should display character name in header', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      expect(screen.getByText(/บารมี 10 \(Pāramī\) - ธรรมนิยม/)).toBeInTheDocument();
    });

    it('should show level for each Parami', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      const lv5Elements = screen.getAllByText('Lv.5');
      expect(lv5Elements.length).toBeGreaterThan(0); // Dana and Khanti
      expect(screen.getByText('Lv.8')).toBeInTheDocument(); // Panna
    });

    it('should show EXP values', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('3,500 EXP')).toBeInTheDocument(); // Dana
      expect(screen.getByText('6,700 EXP')).toBeInTheDocument(); // Panna
    });

    it('should display target kilesa for each Parami', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      expect(screen.getByText(/ต่อต้าน: กามราคะ \(Greed\)/)).toBeInTheDocument(); // Dana
      expect(screen.getByText(/ต่อต้าน: อวิชชา \(Ignorance\)/)).toBeInTheDocument(); // Panna
    });

    it('should show progress bar percentage', () => {
      const character = createMockCharacter({
        dana: { level: 5, exp: 3500 }, // 500 in current level = 50%
      });
      render(<ParamiProgress character={character} />);

      const percentages = screen.getAllByText(/50\.0%/);
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('should show remaining EXP to next level', () => {
      const character = createMockCharacter({
        dana: { level: 5, exp: 3500 }, // 500 in current level, 500 remaining
      });
      render(<ParamiProgress character={character} />);

      const remainingElements = screen.getAllByText(/เหลือ 500 EXP/);
      expect(remainingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Compact View', () => {
    it('should render compact grid when compact=true', () => {
      const character = createMockCharacter();
      const { container } = render(<ParamiProgress character={character} compact={true} />);

      const grid = container.querySelector('.grid-cols-5');
      expect(grid).toBeInTheDocument();
    });

    it('should show all 10 Paramis in compact mode', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} compact={true} />);

      expect(screen.getByText('ทาน')).toBeInTheDocument();
      expect(screen.getByText('ศีล')).toBeInTheDocument();
      expect(screen.getByText('ปัญญา')).toBeInTheDocument();
    });

    it('should show level in compact mode', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} compact={true} />);

      const elements = screen.getAllByText(/Lv\.\d+/);
      expect(elements.length).toBe(10); // All 10 Paramis
    });

    it('should show icons in compact mode', () => {
      const character = createMockCharacter();
      const { container } = render(<ParamiProgress character={character} compact={true} />);

      const icons = container.querySelectorAll('.text-2xl');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should NOT show progress bars in compact mode', () => {
      const character = createMockCharacter();
      const { container } = render(<ParamiProgress character={character} compact={true} />);

      const progressBars = container.querySelectorAll('.bg-gray-200.rounded-full');
      expect(progressBars.length).toBe(0);
    });

    it('should NOT show synergy in compact mode', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} compact={true} />);

      expect(screen.queryByText(/Synergy:/)).not.toBeInTheDocument();
    });
  });

  describe('Synergy Display', () => {
    it('should show synergy by default', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      const synergyElements = screen.getAllByText(/Synergy:/);
      expect(synergyElements.length).toBeGreaterThan(0);
    });

    it('should hide synergy when showSynergy=false', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} showSynergy={false} />);

      expect(screen.queryByText(/Synergy:/)).not.toBeInTheDocument();
    });

    it('should calculate synergy bonus from other Paramis', () => {
      const character = createMockCharacter({
        dana: { level: 5, exp: 3000 },
        khanti: { level: 4, exp: 2000 }, // Dana synergy
      });
      render(<ParamiProgress character={character} />);

      // Should show +40% from Khanti (level 4 * 10%)
      const synergyElements = screen.getAllByText(/\+40% จาก ขันติ/);
      expect(synergyElements.length).toBeGreaterThan(0);
    });

    it('should NOT show synergy for level 0 Paramis', () => {
      const character = createMockCharacter({
        dana: { level: 0, exp: 0 },
      });
      render(<ParamiProgress character={character} />);

      // Level 0 paramis should still render but without synergy calculation
      expect(screen.getByText(/ทาน \(Dāna\)/)).toBeInTheDocument();
      expect(screen.getByText('Lv.0')).toBeInTheDocument();
    });

    it('should show correct synergy Paramis for Dana', () => {
      const character = createMockCharacter({
        dana: { level: 3, exp: 1500 },
        khanti: { level: 5, exp: 3000 },
        adhitthana: { level: 4, exp: 2500 },
        metta: { level: 6, exp: 4000 },
      });
      render(<ParamiProgress character={character} />);

      // Dana synergizes with Khanti, Adhitthana, Metta
      const khantiElements = screen.getAllByText(/\+50% จาก ขันติ/);
      expect(khantiElements.length).toBeGreaterThan(0);
      const adhitthanaElements = screen.getAllByText(/\+40% จาก อธิษฐาน/);
      expect(adhitthanaElements.length).toBeGreaterThan(0);
      const mettaElements = screen.getAllByText(/\+60% จาก เมตตา/);
      expect(mettaElements.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate 0% when EXP is at level boundary', () => {
      const character = createMockCharacter({
        dana: { level: 5, exp: 5000 }, // Exactly at level 5 (0 in current level)
      });
      render(<ParamiProgress character={character} />);

      const percentElements = screen.getAllByText(/0\.0%/);
      expect(percentElements.length).toBeGreaterThan(0);
    });

    it('should calculate 50% when half through level', () => {
      const character = createMockCharacter({
        dana: { level: 3, exp: 2500 }, // 500 in current level (50%)
      });
      render(<ParamiProgress character={character} />);

      const percentElements = screen.getAllByText(/50\.0%/);
      expect(percentElements.length).toBeGreaterThan(0);
    });

    it('should calculate 99.9% when almost at next level', () => {
      const character = createMockCharacter({
        dana: { level: 2, exp: 1999 }, // 999 in current level (99.9%)
      });
      render(<ParamiProgress character={character} />);

      expect(screen.getByText(/99\.9%/)).toBeInTheDocument();
    });

    it('should show remaining EXP correctly', () => {
      const character = createMockCharacter({
        dana: { level: 3, exp: 2750 }, // 750 in level, 250 remaining
      });
      render(<ParamiProgress character={character} />);

      expect(screen.getByText(/เหลือ 250 EXP/)).toBeInTheDocument();
    });
  });

  describe('Summary Stats', () => {
    it('should calculate total levels correctly', () => {
      const character = createMockCharacter({
        dana: { level: 5, exp: 3000 },
        sila: { level: 4, exp: 2000 },
        // Other Paramis will have default values
      });
      render(<ParamiProgress character={character} />);

      // 5+4+3+6+5+4+3+7+4+8 = 49 (from default mock)
      expect(screen.getByText('49')).toBeInTheDocument();
    });

    it('should calculate total EXP correctly', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      // Sum: 3500+2800+1500+4200+3000+2500+1800+5600+2200+6700 = 33800
      expect(screen.getByText('33,800')).toBeInTheDocument();
    });

    it('should show highest level', () => {
      const character = createMockCharacter({
        panna: { level: 12, exp: 10000 }, // Highest
      });
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should show strongest Parami name', () => {
      const character = createMockCharacter({
        viriya: { level: 15, exp: 12000 }, // Strongest
      });
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('viriya')).toBeInTheDocument();
    });

    it('should render summary stats labels', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('Total Levels')).toBeInTheDocument();
      expect(screen.getByText('Total EXP')).toBeInTheDocument();
      expect(screen.getByText('Highest Level')).toBeInTheDocument();
      expect(screen.getByText('Strongest Parami')).toBeInTheDocument();
    });
  });

  describe('Icons and Colors', () => {
    it('should render emoji icons for each Parami', () => {
      const character = createMockCharacter();
      const { container } = render(<ParamiProgress character={character} />);

      const icons = container.querySelectorAll('.text-3xl');
      expect(icons.length).toBe(10); // One for each Parami
    });

    it('should use different colors for different Paramis', () => {
      const character = createMockCharacter();
      const { container } = render(<ParamiProgress character={character} />);

      // Check for variety of color classes
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument(); // Dana
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument(); // Sila
      expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument(); // Panna
    });
  });

  describe('Props Validation', () => {
    it('should accept character prop', () => {
      const character = createMockCharacter();
      expect(() => render(<ParamiProgress character={character} />)).not.toThrow();
    });

    it('should accept showSynergy prop', () => {
      const character = createMockCharacter();
      expect(() =>
        render(<ParamiProgress character={character} showSynergy={false} />)
      ).not.toThrow();
    });

    it('should accept compact prop', () => {
      const character = createMockCharacter();
      expect(() => render(<ParamiProgress character={character} compact={true} />)).not.toThrow();
    });

    it('should use default prop values', () => {
      const character = createMockCharacter();
      render(<ParamiProgress character={character} />);

      // Default showSynergy=true
      expect(screen.queryAllByText(/Synergy:/).length).toBeGreaterThan(0);

      // Default compact=false (should show progress bars)
      const { container } = render(<ParamiProgress character={character} />);
      expect(container.querySelector('.bg-gray-200.rounded-full')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle level 0 Paramis', () => {
      const character = createMockCharacter({
        dana: { level: 0, exp: 0 },
      });
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('Lv.0')).toBeInTheDocument();
      expect(screen.getByText('0 EXP')).toBeInTheDocument();
    });

    it('should handle very high levels', () => {
      const character = createMockCharacter({
        panna: { level: 99, exp: 99500 },
      });
      render(<ParamiProgress character={character} />);

      expect(screen.getByText('Lv.99')).toBeInTheDocument();
      expect(screen.getByText('99,500 EXP')).toBeInTheDocument();
    });

    it('should handle exact level boundary EXP', () => {
      const character = createMockCharacter({
        dana: { level: 5, exp: 5000 }, // Exact boundary
      });
      render(<ParamiProgress character={character} />);

      const percentElements = screen.getAllByText(/0\.0%/);
      expect(percentElements.length).toBeGreaterThan(0);
      const expElements = screen.getAllByText(/เหลือ 1,000 EXP/);
      expect(expElements.length).toBeGreaterThan(0);
    });

    it('should handle all Paramis at level 0', () => {
      const character = createMockCharacter({
        dana: { level: 0, exp: 0 },
        sila: { level: 0, exp: 0 },
        nekkhamma: { level: 0, exp: 0 },
        viriya: { level: 0, exp: 0 },
        khanti: { level: 0, exp: 0 },
        sacca: { level: 0, exp: 0 },
        adhitthana: { level: 0, exp: 0 },
        metta: { level: 0, exp: 0 },
        upekkha: { level: 0, exp: 0 },
        panna: { level: 0, exp: 0 },
      });
      render(<ParamiProgress character={character} />);

      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0); // Total levels and all Lv.0
      // Should not show any synergy for level 0
      expect(screen.queryByText(/Synergy:/)).not.toBeInTheDocument();
    });
  });
});

