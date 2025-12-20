/**
 * Tests for UserStatus Component
 *
 * Component: 437 lines - Subscription status, credits, tier management
 * Features tested:
 * - Subscription tier display (free/basic/pro/enterprise)
 * - Credits tracking and display
 * - Storage usage display
 * - Tier switching (demo mode)
 * - Compact mode (header)
 * - Embedded mode (settings panel)
 * - Floating mode (default)
 * - Auto-refresh subscription data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserStatus from './UserStatus';
import * as userStore from '../services/userStore';
import type { Subscription, SubscriptionTier } from '../types';

// Mock userStore
vi.mock('../services/userStore', () => ({
  getUserSubscription: vi.fn(),
  setUserTier: vi.fn(),
}));

describe('UserStatus Component', () => {
  let mockSubscription: Subscription;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock subscription
    mockSubscription = {
      tier: 'pro',
      credits: 850,
      maxCredits: 1000,
      features: {
        maxProjects: 20,
        storageLimit: '50 GB',
        aiModels: ['all'],
        exportFormats: ['all'],
        teamMembers: 10,
        prioritySupport: true,
      },
    };

    (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Compact Mode (Header)', () => {
    it('should render compact mode with tier and credits', () => {
      render(<UserStatus compact={true} />);

      expect(screen.getByText('pro')).toBeInTheDocument();
      expect(screen.getByText('Credits:')).toBeInTheDocument();
      expect(screen.getByText('850')).toBeInTheDocument();
    });

    it('should display correct tier color for pro', () => {
      render(<UserStatus compact={true} />);

      const tierBadge = screen.getByText('pro');
      expect(tierBadge.className).toContain('from-purple-400');
      expect(tierBadge.className).toContain('to-pink-400');
    });

    it('should display correct tier color for enterprise', () => {
      mockSubscription.tier = 'enterprise';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      const tierBadge = screen.getByText('enterprise');
      expect(tierBadge.className).toContain('from-yellow-400');
      expect(tierBadge.className).toContain('to-orange-400');
    });

    it('should display correct tier color for basic', () => {
      mockSubscription.tier = 'basic';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      const tierBadge = screen.getByText('basic');
      expect(tierBadge.className).toContain('from-blue-400');
      expect(tierBadge.className).toContain('to-cyan-400');
    });

    it('should display correct tier color for free', () => {
      mockSubscription.tier = 'free';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      const tierBadge = screen.getByText('free');
      expect(tierBadge.className).toContain('from-gray-400');
      expect(tierBadge.className).toContain('to-gray-500');
    });

    it('should toggle dropdown on button click', () => {
      render(<UserStatus compact={true} />);

      const button = screen.getByTitle('View Plan Details');

      // Initially closed
      expect(screen.queryByText('Storage:')).not.toBeInTheDocument();

      // Open dropdown
      fireEvent.click(button);
      expect(screen.getByText('Storage:')).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(button);
      expect(screen.queryByText('Storage:')).not.toBeInTheDocument();
    });

    it('should show credits progress bar in dropdown', () => {
      render(<UserStatus compact={true} />);

      // Open dropdown
      fireEvent.click(screen.getByTitle('View Plan Details'));

      // Check credits display
      expect(screen.getByText('850/1000')).toBeInTheDocument();

      // Progress bar should be ~85% (850/1000)
      const progressBar = document.querySelector('.bg-gradient-to-r.from-cyan-500');
      expect(progressBar).toHaveStyle({ width: '85%' });
    });

    it('should show storage usage in dropdown', () => {
      render(<UserStatus compact={true} />);

      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText(/34.86 MB/)).toBeInTheDocument();
      expect(screen.getByText(/50 GB/)).toBeInTheDocument();
    });
  });

  describe('Embedded Mode (Settings Panel)', () => {
    it('should render embedded mode', () => {
      render(<UserStatus embedded={true} />);

      // Embedded mode shows tier badge
      expect(screen.getByText('pro')).toBeInTheDocument();
    });

    it('should display current tier in embedded mode', () => {
      render(<UserStatus embedded={true} />);

      expect(screen.getByText('pro')).toBeInTheDocument();
      expect(screen.getByText('฿999/เดือน')).toBeInTheDocument();
    });

    it('should show API Credits in embedded mode', () => {
      render(<UserStatus embedded={true} />);

      expect(screen.getByText('API Credits:')).toBeInTheDocument();
      expect(screen.getByText('850/1000')).toBeInTheDocument();
    });
  });

  describe('Tier Management', () => {
    it('should change tier when clicking upgrade button', async () => {
      mockSubscription.tier = 'free';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      // Open dropdown
      fireEvent.click(screen.getByTitle('View Plan Details'));

      // Find and click tier button
      const proButton = screen.getByText('⭐ Pro');
      fireEvent.click(proButton);

      expect(userStore.setUserTier).toHaveBeenCalledWith('pro');
    });

    it('should update subscription after tier change', async () => {
      const updatedSub = { ...mockSubscription, tier: 'enterprise' as SubscriptionTier };

      (userStore.getUserSubscription as any)
        .mockReturnValueOnce(mockSubscription)
        .mockReturnValueOnce(updatedSub);

      render(<UserStatus compact={true} />);

      // Open dropdown
      fireEvent.click(screen.getByTitle('View Plan Details'));

      // Trigger tier change
      const enterpriseButton = screen.getByText('🚀 Enterprise');
      fireEvent.click(enterpriseButton);

      // Verify setUserTier was called
      expect(userStore.setUserTier).toHaveBeenCalledWith('enterprise');
    });

    it('should close dropdown after tier change', () => {
      mockSubscription.tier = 'basic';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      // Open dropdown
      fireEvent.click(screen.getByTitle('View Plan Details'));
      expect(screen.getByText('Switch Plan (Demo):')).toBeInTheDocument();

      // Change tier
      const proButton = screen.getByText('⭐ Pro');
      fireEvent.click(proButton);

      // Dropdown should close
      expect(screen.queryByText('Switch Plan (Demo):')).not.toBeInTheDocument();
    });
  });

  describe('Tier Pricing Display', () => {
    it('should show correct price for free tier', () => {
      mockSubscription.tier = 'free';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText('ฟรี')).toBeInTheDocument();
    });

    it('should show correct price for basic tier', () => {
      mockSubscription.tier = 'basic';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText('฿299/เดือน')).toBeInTheDocument();
    });

    it('should show correct price for pro tier', () => {
      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText('฿999/เดือน')).toBeInTheDocument();
    });

    it('should show contact price for enterprise tier', () => {
      mockSubscription.tier = 'enterprise';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText('ติดต่อ')).toBeInTheDocument();
    });
  });

  describe('Credits Display', () => {
    it('should show credits with correct values', () => {
      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText('850/1000')).toBeInTheDocument();
    });

    it('should show correct progress bar percentage for 85% credits', () => {
      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      const progressBar = document.querySelector('.bg-gradient-to-r.from-cyan-500');
      expect(progressBar).toHaveStyle({ width: '85%' });
    });

    it('should show correct progress bar percentage for 0% credits', () => {
      mockSubscription.credits = 0;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      const progressBar = document.querySelector('.bg-gradient-to-r.from-cyan-500');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('should show correct progress bar percentage for 100% credits', () => {
      mockSubscription.credits = 1000;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      const progressBar = document.querySelector('.bg-gradient-to-r.from-cyan-500');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should handle low credits (< 10%)', () => {
      mockSubscription.credits = 50;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText('50/1000')).toBeInTheDocument();

      const progressBar = document.querySelector('.bg-gradient-to-r.from-cyan-500');
      expect(progressBar).toHaveStyle({ width: '5%' });
    });
  });

  describe('Auto-refresh Functionality', () => {
    it('should auto-refresh subscription every second', () => {
      render(<UserStatus compact={true} />);

      expect(userStore.getUserSubscription).toHaveBeenCalledTimes(1);

      // Fast-forward 1 second
      vi.advanceTimersByTime(1000);
      expect(userStore.getUserSubscription).toHaveBeenCalledTimes(2);

      // Fast-forward 2 more seconds
      vi.advanceTimersByTime(2000);
      expect(userStore.getUserSubscription).toHaveBeenCalledTimes(4);
    });

    it('should update display when subscription changes', () => {
      const { rerender } = render(<UserStatus compact={true} />);

      // Initial state
      expect(screen.getByText('850')).toBeInTheDocument();

      // Change subscription
      mockSubscription.credits = 500;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      // Trigger refresh
      vi.advanceTimersByTime(1000);
      rerender(<UserStatus compact={true} />);

      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('should cleanup interval on unmount', () => {
      const { unmount } = render(<UserStatus compact={true} />);

      const callCountBeforeUnmount = (userStore.getUserSubscription as any).mock.calls.length;

      unmount();

      // Fast-forward time after unmount
      vi.advanceTimersByTime(5000);

      // Should not call getUserSubscription after unmount
      expect(userStore.getUserSubscription).toHaveBeenCalledTimes(callCountBeforeUnmount);
    });
  });

  describe('Tier Color Styling', () => {
    it('should apply correct background color for free tier button', () => {
      mockSubscription.tier = 'free';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus />); // Floating mode

      const tierBadge = document.querySelector('.bg-gray-600');
      expect(tierBadge).toBeInTheDocument();
    });

    it('should apply correct background color for basic tier button', () => {
      mockSubscription.tier = 'basic';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus />);

      const tierBadge = document.querySelector('.bg-blue-600');
      expect(tierBadge).toBeInTheDocument();
    });

    it('should apply correct background color for pro tier button', () => {
      render(<UserStatus />);

      const tierBadge = document.querySelector('.bg-purple-600');
      expect(tierBadge).toBeInTheDocument();
    });

    it('should apply correct gradient for enterprise tier button', () => {
      mockSubscription.tier = 'enterprise';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus />);

      const tierBadge = document.querySelector('.bg-gradient-to-r.from-yellow-600');
      expect(tierBadge).toBeInTheDocument();
    });
  });

  describe('Storage Display', () => {
    it('should show storage usage with correct format', () => {
      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText(/34.86 MB/)).toBeInTheDocument();
    });

    it('should show storage limit from subscription', () => {
      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText(/50 GB/)).toBeInTheDocument();
    });

    it('should display different storage limits for different tiers', () => {
      mockSubscription.tier = 'free';
      mockSubscription.features.storageLimit = '5 GB';
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText(/5 GB/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero credits', () => {
      mockSubscription.credits = 0;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle very large credit numbers', () => {
      mockSubscription.credits = 999999;
      mockSubscription.maxCredits = 1000000;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);
      fireEvent.click(screen.getByTitle('View Plan Details'));

      expect(screen.getByText('999999/1000000')).toBeInTheDocument();
    });

    it('should handle missing features object', () => {
      mockSubscription.features = undefined as any;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      // Should not crash
      expect(screen.getByText('pro')).toBeInTheDocument();
    });

    it('should handle undefined tier gracefully', () => {
      mockSubscription.tier = undefined as any;
      (userStore.getUserSubscription as any).mockReturnValue(mockSubscription);

      render(<UserStatus compact={true} />);

      // Should render without crashing
      expect(screen.getByTitle('View Plan Details')).toBeInTheDocument();
    });
  });
});

