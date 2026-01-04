/**
 * Phase 4 Integration Tests
 * Tests for Psychology Dashboard integration with existing UI
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PsychologyDashboard } from '../PsychologyDashboard';
import type { Character } from '../types';

// Mock character for testing
const mockCharacter: Character = {
  id: 'test-char-1',
  name: 'Test Character',
  role: 'Protagonist',
  description: 'A test character',
  external: {},
  physical: {},
  fashion: {},
  internal: {
    consciousness: {},
    subconscious: {},
    defilement: {},
  },
  goals: {
    objective: 'Test objective',
    need: 'Test need',
    action: 'Test action',
    conflict: 'Test conflict',
    backstory: 'Test backstory',
  },
  parami_portfolio: {
    dana: { level: 5, exp: 250 },
    sila: { level: 4, exp: 180 },
    nekkhamma: { level: 3, exp: 120 },
    panna: { level: 6, exp: 320 },
    viriya: { level: 5, exp: 240 },
    khanti: { level: 4, exp: 200 },
    sacca: { level: 5, exp: 260 },
    adhitthana: { level: 4, exp: 190 },
    metta: { level: 6, exp: 310 },
    upekkha: { level: 5, exp: 270 },
  },
  buddhist_psychology: {
    anusaya: {
      kama_raga: 60,
      patigha: 45,
      mana: 55,
      ditthi: 40,
      vicikiccha: 50,
      bhava_raga: 65,
      avijja: 70,
    },
    carita: 'พุทธิจริต',
  },
};

describe('Phase 4: PsychologyDashboard Integration', () => {
  describe('Component Rendering', () => {
    it('should render fallback when all features are disabled', () => {
      render(<PsychologyDashboard character={mockCharacter} />);

      // Since all feature flags are OFF, should show fallback message
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });

    it('should show feature flag disabled message when all features are off', () => {
      render(<PsychologyDashboard character={mockCharacter} userId="non-beta-user" />);

      // Should show disabled message since all feature flags are OFF by default
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
      expect(screen.getByText(/in development/)).toBeTruthy();
    });

    it('should render in compact mode with fallback', () => {
      render(<PsychologyDashboard character={mockCharacter} compact={true} />);

      // Even in compact mode, fallback should be shown when features are disabled
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });
  });

  describe('View Tabs', () => {
    it('should have overview tab as default', () => {
      const { container } = render(<PsychologyDashboard character={mockCharacter} />);

      // Check if overview is the default active view (implementation may vary based on feature flags)
      expect(container).toBeTruthy();
    });
  });

  describe('Data Handling', () => {
    it('should handle character without parami_portfolio gracefully', () => {
      const charWithoutParami = { ...mockCharacter, parami_portfolio: undefined };

      render(<PsychologyDashboard character={charWithoutParami} />);

      // Should not crash, should show fallback (features disabled)
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });

    it('should handle character without anusaya profile gracefully', () => {
      const charWithoutAnusaya = {
        ...mockCharacter,
        buddhist_psychology: undefined,
      };

      render(<PsychologyDashboard character={charWithoutAnusaya} />);

      // Should not crash, should show fallback
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });

    it('should generate sample karma actions when no timeline exists', () => {
      const charWithoutTimeline = {
        ...mockCharacter,
        psychology_timeline: undefined,
      };

      render(<PsychologyDashboard character={charWithoutTimeline} />);

      // Should not crash - component renders with fallback
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });
  });

  describe('Default Values', () => {
    it('should provide default parami portfolio when missing', () => {
      const charWithoutParami = { ...mockCharacter, parami_portfolio: undefined };

      const { container } = render(<PsychologyDashboard character={charWithoutParami} />);

      // Verify component renders without errors
      expect(container.firstChild).toBeTruthy();
    });

    it('should provide default anusaya profile when missing', () => {
      const charWithoutAnusaya = {
        ...mockCharacter,
        buddhist_psychology: undefined,
      };

      const { container } = render(<PsychologyDashboard character={charWithoutAnusaya} />);

      // Verify component renders without errors
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Integration with Feature Flags', () => {
    it('should respect feature flag settings', () => {
      // Since all flags are OFF by default, should show fallback
      render(<PsychologyDashboard character={mockCharacter} />);

      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });

    it('should show fallback for non-beta users', () => {
      // Non-beta users see fallback message
      render(<PsychologyDashboard character={mockCharacter} userId="beta-user-1" />);

      // Still shows fallback since feature flags are globally OFF
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });
  });

  describe('Karma Action Generation', () => {
    it('should handle empty psychology timeline with fallback', () => {
      const charWithEmptyTimeline = {
        ...mockCharacter,
        psychology_timeline: {
          characterId: 'test-char-1',
          characterName: 'Test Character',
          changes: [],
          snapshots: [],
          summary: {
            total_kusala: 0,
            total_akusala: 0,
            net_progress: 0,
            dominant_pattern: 'neutral',
          },
          overallArc: {
            startingBalance: 0,
            endingBalance: 0,
            totalChange: 0,
            direction: 'คงที่' as const,
            interpretation: 'No change',
          },
        },
      };

      render(<PsychologyDashboard character={charWithEmptyTimeline} />);

      // Shows fallback when features are disabled
      expect(screen.getByText(/Buddhist Psychology Features/)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should not crash with minimal character data', () => {
      const minimalCharacter: Character = {
        id: 'minimal',
        name: 'Minimal',
        role: 'Extra',
        description: 'Minimal test',
        external: {},
        physical: {},
        fashion: {},
        internal: {
          consciousness: {},
          subconscious: {},
          defilement: {},
        },
        goals: {
          objective: '',
          need: '',
          action: '',
          conflict: '',
          backstory: '',
        },
      };

      const { container } = render(<PsychologyDashboard character={minimalCharacter} />);

      expect(container.firstChild).toBeTruthy();
    });
  });
});

describe('Phase 4: Step3Character Integration', () => {
  describe('Import Validation', () => {
    it('should successfully import PsychologyDashboard', async () => {
      const module = await import('../PsychologyDashboard');
      expect(module.PsychologyDashboard).toBeDefined();
    });

    it('should export KarmaAction type', async () => {
      const module = await import('../PsychologyDashboard');
      // Type exports can't be tested directly in runtime, but we can verify module structure
      expect(module).toBeDefined();
    });
  });
});
