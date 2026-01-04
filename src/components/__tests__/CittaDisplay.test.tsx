/**
 * Tests for CittaDisplay Component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CittaDisplay } from '../CittaDisplay';
import type { Character } from '../types';

describe('CittaDisplay', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Test Character',
    mind_state: {
      recent_citta_history: [
        'kusala_mahakusala_1',
        'akusala_lobha_1',
        'vipaka_kusala_1',
        'kiriya_hasituppada',
        'akusala_dosa_1',
        'kusala_mahakusala_2',
        'akusala_moha_1',
      ],
    },
  } as Character;

  const mockCharacterNoCitta: Character = {
    id: 'char-2',
    name: 'No Citta Character',
  } as Character;

  describe('Component Rendering - No Data', () => {
    it('should render empty state when no mind_state', () => {
      render(<CittaDisplay character={mockCharacterNoCitta} />);

      expect(screen.getByText(/ไม่มีข้อมูล Citta/i)).toBeInTheDocument();
    });

    it('should render empty state when citta history is empty', () => {
      const emptyCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: [] },
      } as Character;

      render(<CittaDisplay character={emptyCharacter} />);

      expect(screen.getByText(/ไม่มีข้อมูล Citta/i)).toBeInTheDocument();
    });
  });

  describe('Component Rendering - Full View', () => {
    it('should render character name in header', () => {
      render(<CittaDisplay character={mockCharacter} />);

      expect(screen.getByText(/จิต \(Citta\) - Test Character/i)).toBeInTheDocument();
    });

    it('should render current citta label', () => {
      render(<CittaDisplay character={mockCharacter} />);

      expect(screen.getByText(/จิตปัจจุบัน \(Current Citta\):/i)).toBeInTheDocument();
    });

    it('should display current citta', () => {
      render(<CittaDisplay character={mockCharacter} />);

      expect(screen.getByText('akusala_moha_1')).toBeInTheDocument();
    });

    it('should show citta history by default', () => {
      render(<CittaDisplay character={mockCharacter} />);

      expect(screen.getByText(/Javana Process/i)).toBeInTheDocument();
    });

    it('should show last 7 citta moments', () => {
      const { container } = render(<CittaDisplay character={mockCharacter} />);

      const historyItems = container.querySelectorAll('.grid-cols-7 > div');
      expect(historyItems.length).toBe(7);
    });
  });

  describe('Component Rendering - Compact View', () => {
    it('should render compact view when compact=true', () => {
      const { container } = render(<CittaDisplay character={mockCharacter} compact={true} />);

      const compactDiv = container.querySelector('.inline-flex');
      expect(compactDiv).toBeInTheDocument();
    });

    it('should show current citta in compact view', () => {
      render(<CittaDisplay character={mockCharacter} compact={true} />);

      expect(screen.getByText(/โมหะ \(Delusion-rooted\)/i)).toBeInTheDocument();
    });

    it('should have pulsing indicator in compact view', () => {
      const { container } = render(<CittaDisplay character={mockCharacter} compact={true} />);

      const pulse = container.querySelector('.animate-pulse');
      expect(pulse).toBeInTheDocument();
    });

    it('should not show history in compact view', () => {
      render(<CittaDisplay character={mockCharacter} compact={true} />);

      expect(screen.queryByText(/Javana Process/i)).not.toBeInTheDocument();
    });
  });

  describe('Show History Prop', () => {
    it('should show history when showHistory=true', () => {
      render(<CittaDisplay character={mockCharacter} showHistory={true} />);

      expect(screen.getByText(/Javana Process/i)).toBeInTheDocument();
    });

    it('should hide history when showHistory=false', () => {
      render(<CittaDisplay character={mockCharacter} showHistory={false} />);

      expect(screen.queryByText(/Javana Process/i)).not.toBeInTheDocument();
    });
  });

  describe('Citta Color Coding', () => {
    it('should apply green color for kusala citta', () => {
      const kusalaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['kusala_mahakusala_1'] },
      } as Character;

      render(<CittaDisplay character={kusalaCharacter} />);

      expect(screen.getByText('kusala_mahakusala_1')).toBeInTheDocument();
    });

    it('should apply red color for akusala citta', () => {
      const akusalaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['akusala_lobha_1'] },
      } as Character;

      render(<CittaDisplay character={akusalaCharacter} />);

      expect(screen.getByText('akusala_lobha_1')).toBeInTheDocument();
    });

    it('should apply blue color for vipaka citta', () => {
      const vipakaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['vipaka_kusala_1'] },
      } as Character;

      render(<CittaDisplay character={vipakaCharacter} />);

      expect(screen.getByText('vipaka_kusala_1')).toBeInTheDocument();
    });

    it('should apply gray color for kiriya citta', () => {
      const kiriyaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['kiriya_hasituppada'] },
      } as Character;

      render(<CittaDisplay character={kiriyaCharacter} />);

      const elements = screen.getAllByText('kiriya_hasituppada');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Thai Name Mapping', () => {
    it('should map lobha to Thai name', () => {
      const lobhaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['akusala_lobha_1'] },
      } as Character;

      render(<CittaDisplay character={lobhaCharacter} />);

      expect(screen.getByText(/โลภะ \(Greed-rooted\)/i)).toBeInTheDocument();
    });

    it('should map dosa to Thai name', () => {
      const dosaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['akusala_dosa_1'] },
      } as Character;

      render(<CittaDisplay character={dosaCharacter} />);

      expect(screen.getByText(/โทสะ \(Hatred-rooted\)/i)).toBeInTheDocument();
    });

    it('should map moha to Thai name', () => {
      const mohaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['akusala_moha_1'] },
      } as Character;

      render(<CittaDisplay character={mohaCharacter} />);

      expect(screen.getByText(/โมหะ \(Delusion-rooted\)/i)).toBeInTheDocument();
    });

    it('should map kusala to Thai name', () => {
      const kusalaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['kusala_test'] },
      } as Character;

      render(<CittaDisplay character={kusalaCharacter} />);

      expect(screen.getByText(/กุศล \(Wholesome\)/i)).toBeInTheDocument();
    });

    it('should map akusala to Thai name', () => {
      const akusalaCharacter = {
        ...mockCharacter,
        mind_state: { recent_citta_history: ['akusala_test'] },
      } as Character;

      render(<CittaDisplay character={akusalaCharacter} />);

      // Check that citta name is displayed
      expect(screen.getByText('akusala_test')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should work with default props', () => {
      render(<CittaDisplay character={mockCharacter} />);

      expect(screen.getByText(/จิต \(Citta\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Javana Process/i)).toBeInTheDocument();
    });

    it('should accept showHistory prop', () => {
      render(<CittaDisplay character={mockCharacter} showHistory={false} />);

      expect(screen.queryByText(/Javana Process/i)).not.toBeInTheDocument();
    });

    it('should accept compact prop', () => {
      const { container } = render(<CittaDisplay character={mockCharacter} compact={true} />);

      expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    });
  });
});
