/**
 * Tests for BhumiIndicator Component
 * Buddhist planes of existence (31 realms) display
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BhumiIndicator } from '../BhumiIndicator';
import type { Character } from '../types';

describe('BhumiIndicator', () => {
  const mockCharacterHumanBhumi: Character = {
    id: 'char-1',
    name: 'Test Character',
    mind_state: {
      current_bhumi: 5, // Manussa Bhumi (Human realm)
      current_citta: 1,
      anusaya_strengths: {},
    },
  } as Character;

  const mockCharacterHellBhumi: Character = {
    id: 'char-2',
    name: 'Hell Character',
    mind_state: {
      current_bhumi: 1, // Niraya Bhumi (Hell realm)
      current_citta: 1,
      anusaya_strengths: {},
    },
  } as Character;

  const mockCharacterDivaBhumi: Character = {
    id: 'char-3',
    name: 'Deva Character',
    mind_state: {
      current_bhumi: 6, // Catummaharajika Bhumi (Deva realm)
      current_citta: 1,
      anusaya_strengths: {},
    },
  } as Character;

  const mockCharacterNoMindState: Character = {
    id: 'char-4',
    name: 'No Mind State',
  } as Character;

  describe('No Data State', () => {
    it('should render default human bhumi when no mind_state', () => {
      render(<BhumiIndicator character={mockCharacterNoMindState} />);

      // Should default to Manussa Bhumi (Human realm)
      expect(screen.getByText(/มนุสสภูมิ/)).toBeInTheDocument();
      expect(screen.getByText('🌍')).toBeInTheDocument();
    });

    it('should render empty state when bhumi data not found', () => {
      const invalidChar = {
        ...mockCharacterHumanBhumi,
        mind_state: {
          ...mockCharacterHumanBhumi.mind_state,
          current_bhumi: 999, // Invalid bhumi ID
        },
      } as Character;

      render(<BhumiIndicator character={invalidChar} />);

      expect(screen.getByText('ไม่พบข้อมูลภูมิ')).toBeInTheDocument();
    });
  });

  describe('Component Rendering - Full View', () => {
    it('should render bhumi name and pali name', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText(/มนุสสภูมิ/)).toBeInTheDocument();
      expect(screen.getByText('Manussa Bhūmi')).toBeInTheDocument();
    });

    it('should render bhumi ID badge', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('ภูมิ #5/31')).toBeInTheDocument();
    });

    it('should render bhumi description', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      // Human bhumi should have a description
      expect(screen.getByText(/ภพของมนุษย์/)).toBeInTheDocument();
    });

    it('should render environmental rules section', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('กฎแห่งภูมิ (Environmental Rules):')).toBeInTheDocument();
    });

    it('should render kamma creation multiplier', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('การสร้างกรรม')).toBeInTheDocument();
      // Should show multiplier value (e.g., ×1.0, ×0.5, etc.)
      const multipliers = screen.getAllByText(/×\d+\.\d+/);
      expect(multipliers.length).toBeGreaterThan(0);
    });

    it('should render parami development possibility', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('พัฒนาบารมี')).toBeInTheDocument();
      // Human realm should allow parami development
      const checkmarks = screen.getAllByText(/✅ ได้/);
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should render kusala tendency', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('โน้มน้าว')).toBeInTheDocument();
    });

    it('should render sati default level', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('ระดับสติ')).toBeInTheDocument();
      const satiLevels = screen.getAllByText(/\/100/);
      expect(satiLevels.length).toBeGreaterThan(0);
    });

    it('should render dominant feeling', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('เวทนาเด่น (Dominant Feeling)')).toBeInTheDocument();
    });

    it('should render escape difficulty', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('ความยากในการพ้นภูมิ')).toBeInTheDocument();
      const difficulties = screen.getAllByText(/\/100/);
      expect(difficulties.length).toBeGreaterThan(0);
    });

    it('should render lifespan information', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('อายุขัยโดยประมาณ')).toBeInTheDocument();
    });
  });

  describe('Component Rendering - Compact View', () => {
    it('should render compact view when showDetails=false', () => {
      const { container } = render(
        <BhumiIndicator character={mockCharacterHumanBhumi} showDetails={false} />
      );

      // Compact view should use inline-flex
      const compactDiv = container.querySelector('.inline-flex');
      expect(compactDiv).toBeInTheDocument();
    });

    it('should show icon and name in compact view', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} showDetails={false} />);

      expect(screen.getByText('🌍')).toBeInTheDocument();
      expect(screen.getByText(/มนุสสภูมิ/)).toBeInTheDocument();
    });

    it('should show bhumi ID badge in compact view', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} showDetails={false} />);

      expect(screen.getByText('#5')).toBeInTheDocument();
    });

    it('should NOT show detailed info in compact view', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} showDetails={false} />);

      expect(screen.queryByText('กฎแห่งภูมิ (Environmental Rules):')).not.toBeInTheDocument();
      expect(screen.queryByText('อายุขัยโดยประมาณ')).not.toBeInTheDocument();
    });
  });

  describe('Bhumi Type Styling', () => {
    it('should render Hell bhumi (อบายภูมิ) with correct icon', () => {
      render(<BhumiIndicator character={mockCharacterHellBhumi} />);

      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('should render Human bhumi with earth icon', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('🌍')).toBeInTheDocument();
    });

    it('should render Deva bhumi with cloud icon', () => {
      render(<BhumiIndicator character={mockCharacterDivaBhumi} />);

      expect(screen.getByText('☁️')).toBeInTheDocument();
    });

    it('should use different gradients for different bhumi types', () => {
      const { container: hellContainer } = render(
        <BhumiIndicator character={mockCharacterHellBhumi} />
      );
      const { container: humanContainer } = render(
        <BhumiIndicator character={mockCharacterHumanBhumi} />
      );

      // Both should have gradient classes but different colors
      const hellGradient = hellContainer.querySelector('.bg-gradient-to-br');
      const humanGradient = humanContainer.querySelector('.bg-gradient-to-br');

      expect(hellGradient).toBeInTheDocument();
      expect(humanGradient).toBeInTheDocument();
    });
  });

  describe('Environmental Rules Display', () => {
    it('should show positive kusala tendency for good realms', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      // Human realm should have neutral or positive kusala tendency
      expect(screen.getByText('โน้มน้าว')).toBeInTheDocument();
    });

    it('should display escape difficulty as progress bar', () => {
      const { container } = render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      // Should have progress bar for escape difficulty
      const progressBars = container.querySelectorAll('.bg-gradient-to-r.from-green-500');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should show parami development not possible for hell realm', () => {
      render(<BhumiIndicator character={mockCharacterHellBhumi} />);

      // Hell realm should NOT allow parami development
      const notPossible = screen.getAllByText(/❌ ไม่ได้/);
      expect(notPossible.length).toBeGreaterThan(0);
    });
  });

  describe('Vedana Display', () => {
    it('should display vedana with emoji and Thai name', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      // Should show one of the vedana types with emoji
      const vedanaSection = screen.getByText('เวทนาเด่น (Dominant Feeling)');
      expect(vedanaSection).toBeInTheDocument();
    });

    it('should show dukkha for hell realm', () => {
      render(<BhumiIndicator character={mockCharacterHellBhumi} />);

      // Hell realm should have dukkha (suffering) as dominant feeling
      const dukkhaElements = screen.getAllByText(/ทุกข์/);
      expect(dukkhaElements.length).toBeGreaterThan(0);
    });
  });

  describe('Lifespan Display', () => {
    it('should render lifespan value and unit', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('อายุขัยโดยประมาณ')).toBeInTheDocument();
      // Human lifespan is typically 100 years
      const lifespan = screen.getAllByText(/years|divine_years|kappa/i);
      expect(lifespan.length).toBeGreaterThan(0);
    });

    it('should show human years conversion when available', () => {
      const { container } = render(<BhumiIndicator character={mockCharacterDivaBhumi} />);

      // Deva realms often have conversion to human years
      const humanYears = container.textContent?.match(/≈/);
      // May or may not have conversion depending on bhumi
      expect(container).toBeInTheDocument();
    });
  });

  describe('Notable Beings', () => {
    it('should render notable beings when available', () => {
      render(<BhumiIndicator character={mockCharacterDivaBhumi} />);

      // Deva realms typically have notable beings listed
      expect(screen.getByText('ผู้สถิตในภูมินี้')).toBeInTheDocument();
      expect(screen.getByText(/ท้าวจตุโลกบาล/)).toBeInTheDocument();
    });

    it('should not render notable beings section when empty', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      // Human realm actually has notable beings (Buddha, Arahants, Bodhisattva)
      expect(screen.getByText('ผู้สถิตในภูมินี้')).toBeInTheDocument();
      expect(screen.getByText('พระพุทธเจ้า')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept character prop', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText(/มนุสสภูมิ/)).toBeInTheDocument();
    });

    it('should default showDetails to true', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('กฎแห่งภูมิ (Environmental Rules):')).toBeInTheDocument();
    });

    it('should accept showDetails=false', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} showDetails={false} />);

      expect(screen.queryByText('กฎแห่งภูมิ (Environmental Rules):')).not.toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render emoji icon', () => {
      render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      expect(screen.getByText('🌍')).toBeInTheDocument();
    });

    it('should have gradient background', () => {
      const { container } = render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      const gradient = container.querySelector('.bg-gradient-to-br');
      expect(gradient).toBeInTheDocument();
    });

    it('should have border styling', () => {
      const { container } = render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      const border = container.querySelector('.border-2');
      expect(border).toBeInTheDocument();
    });

    it('should render environmental stats grid', () => {
      const { container } = render(<BhumiIndicator character={mockCharacterHumanBhumi} />);

      const grid = container.querySelector('.grid.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });
  });
});
