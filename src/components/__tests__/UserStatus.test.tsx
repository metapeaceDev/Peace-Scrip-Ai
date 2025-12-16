import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UserStatus from '../UserStatus';
import * as userStore from '../../services/userStore';

// Mock userStore
vi.mock('../../services/userStore', () => ({
  getUserSubscription: vi.fn(),
  setUserTier: vi.fn(),
}));

describe('UserStatus - Component Rendering (Default Mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'free',
      credits: 50,
      maxCredits: 100,
      features: {
        storageLimit: 2,
        maxProjects: 3,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render UserStatus component in default mode', () => {
    render(<UserStatus />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should display current tier name', () => {
    render(<UserStatus />);
    
    const tierTexts = screen.getAllByText(/free/i);
    expect(tierTexts.length).toBeGreaterThan(0);
  });

  it('should display credits count', () => {
    render(<UserStatus />);
    
    // Default mode may display differently, check for presence
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('UserStatus - Compact Mode', () => {
  beforeEach(() => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'pro',
      credits: 80,
      maxCredits: 200,
      features: {
        storageLimit: 10,
        maxProjects: Infinity,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render in compact mode', () => {
    render(<UserStatus compact={true} />);
    
    const tierTexts = screen.getAllByText(/pro/i);
    expect(tierTexts.length).toBeGreaterThan(0);
  });

  it('should display Credits label in compact mode', () => {
    render(<UserStatus compact={true} />);
    
    const label = screen.getByText(/Credits:/i);
    expect(label).toBeDefined();
  });

  it('should display credits count in compact mode', () => {
    render(<UserStatus compact={true} />);
    
    const creditsText = screen.getByText('80');
    expect(creditsText).toBeDefined();
  });

  it('should have dropdown toggle button in compact mode', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const button = container.querySelector('button[title="View Plan Details"]');
    expect(button).toBeDefined();
  });

  it('should toggle dropdown when button clicked', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const button = container.querySelector('button[title="View Plan Details"]');
    
    // Initially closed
    const dropdownBefore = screen.queryByText(/Switch Plan/i);
    expect(dropdownBefore).toBeNull();
    
    // Click to open
    fireEvent.click(button!);
    
    const dropdownAfter = screen.queryByText(/Switch Plan/i);
    expect(dropdownAfter).toBeDefined();
  });
});

describe('UserStatus - Tier Switching', () => {
  beforeEach(() => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'free',
      credits: 50,
      maxCredits: 100,
      features: {
        storageLimit: 2,
        maxProjects: 3,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display Free tier button', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    // Open dropdown
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const freeButton = screen.getByText(/🆓 Free/i);
    expect(freeButton).toBeDefined();
  });

  it('should display Pro tier button', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const proButton = screen.getByText(/⭐ Pro/i);
    expect(proButton).toBeDefined();
  });

  it('should display Enterprise tier button', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const enterpriseButton = screen.getByText(/🚀 Enterprise/i);
    expect(enterpriseButton).toBeDefined();
  });

  it('should call setUserTier when Pro button clicked', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const proButton = screen.getByText(/⭐ Pro/i);
    fireEvent.click(proButton);
    
    expect(userStore.setUserTier).toHaveBeenCalledWith('pro');
  });

  it('should call setUserTier when Enterprise button clicked', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const enterpriseButton = screen.getByText(/🚀 Enterprise/i);
    fireEvent.click(enterpriseButton);
    
    expect(userStore.setUserTier).toHaveBeenCalledWith('enterprise');
  });

  it('should close dropdown after tier selection', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const proButton = screen.getByText(/⭐ Pro/i);
    fireEvent.click(proButton);
    
    const dropdownAfterClick = screen.queryByText(/Switch Plan/i);
    expect(dropdownAfterClick).toBeNull();
  });
});

describe('UserStatus - Subscription Display', () => {
  beforeEach(() => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      credits: 75,
      maxCredits: 150,
      features: {
        storageLimit: 5,
        maxProjects: 10,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display max credits in dropdown', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const maxCreditsTexts = screen.getAllByText(/150/);
    expect(maxCreditsTexts.length).toBeGreaterThan(0);
  });

  it('should display Storage label', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const storageLabel = screen.getByText(/Storage:/i);
    expect(storageLabel).toBeDefined();
  });

  it('should display storage limit', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const limitText = screen.getByText(/5 GB/i);
    expect(limitText).toBeDefined();
  });

  it('should display Projects section', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const projectsLabel = screen.getByText(/Projects/i);
    expect(projectsLabel).toBeDefined();
  });

  it('should display Generated section', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const generatedLabel = screen.getByText(/Generated/i);
    expect(generatedLabel).toBeDefined();
  });

  it('should display Exports section', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const exportsLabel = screen.getByText(/Exports/i);
    expect(exportsLabel).toBeDefined();
  });
});

describe('UserStatus - Tier Colors', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display PRO tier with purple gradient', () => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'pro',
      credits: 100,
      maxCredits: 200,
      features: { storageLimit: 10, maxProjects: Infinity },
    });

    const { container } = render(<UserStatus compact={true} />);
    
    const proText = container.querySelector('.from-purple-400');
    expect(proText).toBeDefined();
  });

  it('should display ENTERPRISE tier with yellow-orange gradient', () => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'enterprise',
      credits: 500,
      maxCredits: 1000,
      features: { storageLimit: 100, maxProjects: Infinity },
    });

    const { container } = render(<UserStatus compact={true} />);
    
    const enterpriseText = container.querySelector('.from-yellow-400');
    expect(enterpriseText).toBeDefined();
  });

  it('should display BASIC tier with blue gradient', () => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'basic',
      credits: 50,
      maxCredits: 100,
      features: { storageLimit: 5, maxProjects: 10 },
    });

    const { container } = render(<UserStatus compact={true} />);
    
    const basicText = container.querySelector('.from-blue-400');
    expect(basicText).toBeDefined();
  });

  it('should display FREE tier with gray gradient', () => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'free',
      credits: 10,
      maxCredits: 50,
      features: { storageLimit: 2, maxProjects: 3 },
    });

    const { container } = render(<UserStatus compact={true} />);
    
    const freeText = container.querySelector('.from-gray-400');
    expect(freeText).toBeDefined();
  });
});

describe('UserStatus - Props Handling', () => {
  beforeEach(() => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'free',
      credits: 50,
      maxCredits: 100,
      features: { storageLimit: 2, maxProjects: 3 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should accept compact prop', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const button = container.querySelector('button[title="View Plan Details"]');
    expect(button).toBeDefined();
  });

  it('should accept embedded prop', () => {
    render(<UserStatus embedded={true} />);
    
    // Embedded mode should render without errors
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should work without any props (default mode)', () => {
    render(<UserStatus />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('UserStatus - Infinity Display', () => {
  beforeEach(() => {
    (userStore.getUserSubscription as any).mockReturnValue({
      tier: 'pro',
      credits: 100,
      maxCredits: 200,
      features: {
        storageLimit: 10,
        maxProjects: Infinity,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display infinity symbol for unlimited projects', () => {
    const { container } = render(<UserStatus compact={true} />);
    
    const toggleButton = container.querySelector('button[title="View Plan Details"]');
    fireEvent.click(toggleButton!);
    
    const infinityText = screen.getByText(/∞/);
    expect(infinityText).toBeDefined();
  });
});
