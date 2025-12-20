import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuotaWidget } from './QuotaWidget';
import { useAuth } from '../contexts/AuthContext';
import { getUserSubscription } from '../services/subscriptionManager';

// Mock dependencies
vi.mock('../contexts/AuthContext');
vi.mock('../services/subscriptionManager');

describe('QuotaWidget', () => {
  const mockOnUpgradeClick = vi.fn();
  const mockCurrentUser = { uid: 'test-user-123' };

  // Helper to find toggle button by checking text content
  const getToggleButton = () => {
    const buttons = screen.getAllByRole('button');
    return buttons[0]; // First button is always the toggle
  };

  const createMockSubscriptionData = (tier: string, creditsUsed = 50, maxCredits = 100) => ({
    subscription: {
      tier,
      maxCredits,
      features: {
        maxProjects: tier === 'free' ? 1 : tier === 'basic' ? 5 : -1,
        maxResolution: tier === 'free' ? '1024×1024' : tier === 'basic' ? '2048×2048' : '4096×4096',
        storageLimit: tier === 'free' ? 1 : tier === 'basic' ? 10 : 100,
      },
    },
    monthlyUsage: {
      creditsUsed,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ currentUser: mockCurrentUser });
  });

  describe('Component Rendering', () => {
    it('should not render when loading', () => {
      (useAuth as any).mockReturnValue({ currentUser: null });
      const { container } = render(<QuotaWidget />);
      expect(container.firstChild).toBeNull();
    });

    it('should render quota widget for free tier', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free', 0, 0));

      render(<QuotaWidget onUpgradeClick={mockOnUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });
    });

    it('should render quota widget for basic tier', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 30, 100));

      render(<QuotaWidget onUpgradeClick={mockOnUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });
    });

    it('should render quota widget for pro tier', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('pro', 100, 500));

      render(<QuotaWidget onUpgradeClick={mockOnUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText('Pro')).toBeInTheDocument();
      });
    });

    it('should render quota widget for enterprise tier', async () => {
      (getUserSubscription as any).mockResolvedValue(
        createMockSubscriptionData('enterprise', 500, -1)
      );

      render(<QuotaWidget onUpgradeClick={mockOnUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText('Enterprise')).toBeInTheDocument();
      });
    });
  });

  describe('Tier Icons and Colors', () => {
    it('should show free tier icon', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('🆓')).toBeInTheDocument();
      });
    });

    it('should show basic tier icon', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('⭐')).toBeInTheDocument();
      });
    });

    it('should show pro tier icon', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('pro'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('💎')).toBeInTheDocument();
      });
    });

    it('should show enterprise tier icon', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('enterprise'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('🏆')).toBeInTheDocument();
      });
    });
  });

  describe('Credits Display', () => {
    it('should show credits for basic tier', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 30, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('30/100')).toBeInTheDocument();
      });
    });

    it('should show credits for pro tier', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('pro', 150, 500));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('150/500')).toBeInTheDocument();
      });
    });

    it('should show infinity symbol for unlimited credits', async () => {
      (getUserSubscription as any).mockResolvedValue(
        createMockSubscriptionData('enterprise', 500, -1)
      );

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('∞')).toBeInTheDocument();
      });
    });

    it('should highlight low credits (>70%) in yellow', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 75, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        const creditsText = screen.getByText('75/100');
        expect(creditsText.className).toContain('text-yellow-400');
      });
    });

    it('should highlight very low credits (>90%) in red', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 95, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        const creditsText = screen.getByText('95/100');
        expect(creditsText.className).toContain('text-red-400');
      });
    });

    it('should show normal credits color when below 70%', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 50, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        const creditsText = screen.getByText('50/100');
        expect(creditsText.className).toContain('text-gray-300');
      });
    });
  });

  describe('Dropdown Toggle', () => {
    it('should toggle dropdown on button click', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      // Initially dropdown is closed
      expect(screen.queryByText('Current Plan')).not.toBeInTheDocument();

      // Click to open
      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
      });

      // Click to close
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByText('Current Plan')).not.toBeInTheDocument();
      });
    });

    it('should rotate dropdown arrow when open', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      const svg = button.querySelector('svg');

      // Initially not rotated - use getAttribute for SVG
      const initialClass = svg?.getAttribute('class') || '';
      expect(initialClass).not.toContain('rotate-180');

      // Click to open
      fireEvent.click(button);

      await waitFor(() => {
        const openClass = svg?.getAttribute('class') || '';
        expect(openClass).toContain('rotate-180');
      });
    });
  });

  describe('Dropdown Content', () => {
    it('should show current plan header', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
      });
    });

    it('should show tier price in dropdown', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText('$9.99/mo').length).toBeGreaterThan(0);
      });
    });

    it('should show credits progress for non-free tiers', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 30, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Credits:')).toBeInTheDocument();
      });
    });

    it('should show storage information', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Storage:')).toBeInTheDocument();
        expect(screen.getByText('0 / 10 GB')).toBeInTheDocument();
      });
    });

    it('should show quick stats - projects', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('โปรเจกต์')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should show unlimited projects for pro tier', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('pro'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Pro')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Unlimited')).toBeInTheDocument();
      });
    });

    it('should show quick stats - resolution', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('pro'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Pro')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('ความละเอียด')).toBeInTheDocument();
        expect(screen.getByText('4096×4096')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Bar Styling', () => {
    it('should show cyan progress bar for normal usage', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 30, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-cyan-500');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should show yellow progress bar for low credits', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 75, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-yellow-500');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should show red progress bar for very low credits', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 95, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-red-500');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should cap progress bar at 100%', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 150, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        const progressBar = document.querySelector('[style*="width: 100%"]');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Available Plans Section', () => {
    it('should show available plans header', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Available Plans')).toBeInTheDocument();
      });
    });

    it('should show checkmark for current tier (free)', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        // Should have ✓ symbol for current tier
        const checkmarks = screen.getAllByText('✓');
        expect(checkmarks.length).toBeGreaterThan(0);
      });
    });

    it('should show checkmark for current tier (basic)', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        const checkmarks = screen.getAllByText('✓');
        expect(checkmarks.length).toBeGreaterThan(0);
      });
    });

    it('should show all tier prices in plan options', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText(/Free/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\$9\.99\/mo/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\$29\.99\/mo/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\$99\.99\/mo/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Upgrade Click Handler', () => {
    it('should call onUpgradeClick when clicking plan button', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free'));

      render(<QuotaWidget onUpgradeClick={mockOnUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Available Plans')).toBeInTheDocument();
      });

      // Click on free plan button - it's the first plan button in dropdown
      const planButtons = screen.getAllByRole('button');
      // Skip toggle button (index 0), get first plan button
      const freePlanButton = planButtons[1];
      fireEvent.click(freePlanButton);

      expect(mockOnUpgradeClick).toHaveBeenCalled();
    });

    it('should call onUpgradeClick and close dropdown', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free'));

      render(<QuotaWidget onUpgradeClick={mockOnUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });

      const toggleButton = getToggleButton();
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Available Plans')).toBeInTheDocument();
      });

      // Click on basic plan
      const basicButtons = screen.getAllByText(/BASIC/i);
      const basicPlanButton = basicButtons[basicButtons.length - 1].closest('button');
      fireEvent.click(basicPlanButton!);

      expect(mockOnUpgradeClick).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.queryByText('Available Plans')).not.toBeInTheDocument();
      });
    });

    it('should call onUpgradeClick when clicking view all plans button', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget onUpgradeClick={mockOnUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('ดูรายละเอียดแพ็กเกจทั้งหมด')).toBeInTheDocument();
      });

      const viewAllButton = screen.getByText('ดูรายละเอียดแพ็กเกจทั้งหมด').closest('button');
      fireEvent.click(viewAllButton!);

      expect(mockOnUpgradeClick).toHaveBeenCalled();
    });
  });

  describe('Click Outside Handler', () => {
    it('should close dropdown when clicking outside', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(
        <div>
          <div data-testid="outside">Outside Element</div>
          <QuotaWidget />
        </div>
      );

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      // Open dropdown
      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
      });

      // Click outside
      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);

      await waitFor(() => {
        expect(screen.queryByText('Current Plan')).not.toBeInTheDocument();
      });
    });

    it('should not close dropdown when clicking inside', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      // Open dropdown
      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Current Plan')).toBeInTheDocument();
      });

      // Click inside dropdown
      const planHeader = screen.getByText('Current Plan');
      fireEvent.mouseDown(planHeader);

      // Should still be open
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle subscription loading error gracefully', async () => {
      (getUserSubscription as any).mockRejectedValue(new Error('Failed to load'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { container } = render(<QuotaWidget />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error loading quota:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Tier-Specific Behavior', () => {
    it('should not show credits progress for free tier', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('free', 0, 0));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByText('Credits:')).not.toBeInTheDocument();
      });
    });

    it('should show enterprise tier with gradient text', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('enterprise'));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Enterprise')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        // Check for gradient in dropdown tier display
        const gradientElements = document.querySelectorAll('.bg-gradient-to-r');
        expect(gradientElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate 30% usage correctly', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic', 30, 100));

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        const progressBar = document.querySelector('[style*="width: 30%"]');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should calculate 0% for unlimited credits', async () => {
      (getUserSubscription as any).mockResolvedValue(
        createMockSubscriptionData('enterprise', 500, -1)
      );

      render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Enterprise')).toBeInTheDocument();
      });

      // Should not show progress bar for unlimited
      const button = getToggleButton();
      fireEvent.click(button);

      await waitFor(() => {
        const progressBar = document.querySelector('.bg-cyan-500, .bg-yellow-500, .bg-red-500');
        expect(progressBar).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup event listeners on unmount', async () => {
      (getUserSubscription as any).mockResolvedValue(createMockSubscriptionData('basic'));
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(<QuotaWidget />);

      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });
  });
});

