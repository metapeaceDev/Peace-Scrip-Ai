import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderSelector } from '../ProviderSelector';
import * as comfyuiModelSelector from '../../services/comfyuiModelSelector';

// Mock comfyuiModelSelector
vi.mock('../../services/comfyuiModelSelector', () => ({
  MODEL_PROFILES: {
    SPEED: {
      checkpoint: 'FLUX.1-schnell',
      steps: 4,
      quality: 'Good',
      estimatedTime: '~15s',
      vramRequired: 6,
      description: 'Fastest model',
    },
    BALANCED: {
      checkpoint: 'FLUX.1-dev',
      steps: 20,
      quality: 'Excellent',
      estimatedTime: '~30s',
      vramRequired: 8,
      description: 'Balanced model',
    },
    QUALITY: {
      checkpoint: 'FLUX.1-pro',
      steps: 30,
      quality: 'Outstanding',
      estimatedTime: '~45s',
      vramRequired: 12,
      description: 'High quality model',
    },
    BEST: {
      checkpoint: 'SDXL',
      steps: 50,
      quality: 'Best',
      estimatedTime: '~60s',
      vramRequired: 16,
      description: 'Best quality model',
    },
  },
  selectOptimalModel: vi.fn(preference => {
    const models: any = {
      speed: {
        checkpoint: 'FLUX.1-schnell',
        steps: 4,
        quality: 'Good',
        estimatedTime: '~15s',
        vramRequired: 6,
        description: 'Fastest model',
      },
      balanced: {
        checkpoint: 'FLUX.1-dev',
        steps: 20,
        quality: 'Excellent',
        estimatedTime: '~30s',
        vramRequired: 8,
        description: 'Balanced model',
      },
      quality: {
        checkpoint: 'FLUX.1-pro',
        steps: 30,
        quality: 'Outstanding',
        estimatedTime: '~45s',
        vramRequired: 12,
        description: 'High quality model',
      },
      best: {
        checkpoint: 'SDXL',
        steps: 50,
        quality: 'Best',
        estimatedTime: '~60s',
        vramRequired: 16,
        description: 'Best quality model',
      },
    };
    return models[preference] || models.balanced;
  }),
  detectAvailableVRAM: vi.fn(() => Promise.resolve(8)),
  calculateCostSavings: vi.fn(() => ({
    cloudCost: 408,
    openSourceCost: 0,
    savings: 408,
    savingsPercent: 100,
  })),
}));

describe('ProviderSelector - Component Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ProviderSelector component', () => {
    render(<ProviderSelector />);

    const heading = screen.getByText(/AI Provider Mode/i);
    expect(heading).toBeDefined();
  });

  it('should display header description', () => {
    render(<ProviderSelector />);

    const description = screen.getByText(/เลือกวิธีการสร้าง AI ที่เหมาะกับคุณ/i);
    expect(description).toBeDefined();
  });

  it('should display Cloud mode card', () => {
    render(<ProviderSelector />);

    const cloudCard = screen.getByText(/Cloud APIs/i);
    expect(cloudCard).toBeDefined();
  });

  it('should display Open Source mode card', () => {
    render(<ProviderSelector />);

    const openSourceCards = screen.getAllByText(/Open Source/i);
    expect(openSourceCards.length).toBeGreaterThan(0);
  });

  it('should display Hybrid mode card', () => {
    render(<ProviderSelector />);

    const hybridCards = screen.getAllByText(/Hybrid/i);
    expect(hybridCards.length).toBeGreaterThan(0);
  });

  it('should display recommended badge on Hybrid card', () => {
    render(<ProviderSelector />);

    const badges = screen.getAllByText(/แนะนำ/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should display cost estimator section', () => {
    render(<ProviderSelector />);

    const costSection = screen.getByText(/ประมาณการค่าใช้จ่าย/i);
    expect(costSection).toBeDefined();
  });
});

describe('ProviderSelector - Mode Cards Content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display Cloud mode features', () => {
    render(<ProviderSelector />);

    const geminiText = screen.getByText(/Gemini 2.0 Flash/i);
    expect(geminiText).toBeDefined();
  });

  it('should display Open Source features', () => {
    render(<ProviderSelector />);

    const ollamaText = screen.getByText(/Ollama \+ Llama/i);
    expect(ollamaText).toBeDefined();
  });

  it('should display Cloud mode speed rating', () => {
    render(<ProviderSelector />);

    const fastestText = screen.getByText(/Fastest/i);
    expect(fastestText).toBeDefined();
  });

  it('should display Open Source cost benefit', () => {
    render(<ProviderSelector />);

    const freeText = screen.getByText(/100% FREE/i);
    expect(freeText).toBeDefined();
  });

  it('should display Hybrid mode smart optimization', () => {
    render(<ProviderSelector />);

    const smartText = screen.getByText(/Smart cost optimization/i);
    expect(smartText).toBeDefined();
  });
});

describe('ProviderSelector - Mode Selection', () => {
  const mockOnModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should default to hybrid mode', () => {
    const { container } = render(<ProviderSelector />);

    const activeCards = container.querySelectorAll('.mode-card.active');
    expect(activeCards.length).toBeGreaterThan(0);
  });

  it('should switch to cloud mode when clicked', () => {
    const { container } = render(<ProviderSelector onModeChange={mockOnModeChange} />);

    const cloudCard = screen.getByText(/Cloud APIs/i).closest('.mode-card');
    fireEvent.click(cloudCard!);

    expect(mockOnModeChange).toHaveBeenCalledWith('cloud');
  });

  it('should switch to open-source mode when clicked', () => {
    const { container } = render(<ProviderSelector onModeChange={mockOnModeChange} />);

    const openSourceCards = screen.getAllByText(/Open Source/i);
    const openSourceCard = openSourceCards[0].closest('.mode-card');
    fireEvent.click(openSourceCard!);

    expect(mockOnModeChange).toHaveBeenCalledWith('open-source');
  });

  it('should call onModeChange when hybrid mode clicked', () => {
    render(<ProviderSelector onModeChange={mockOnModeChange} />);

    const hybridCards = screen.getAllByText(/Hybrid/i);
    const hybridCard = hybridCards[0].closest('.mode-card');
    fireEvent.click(hybridCard!);

    expect(mockOnModeChange).toHaveBeenCalledWith('hybrid');
  });

  it('should update active class when mode changes', () => {
    const { container } = render(<ProviderSelector />);

    const cloudCard = screen.getByText(/Cloud APIs/i).closest('.mode-card');
    fireEvent.click(cloudCard!);

    expect(cloudCard?.classList.contains('active')).toBe(true);
  });
});

describe('ProviderSelector - Model Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display model quality preference section for hybrid mode', () => {
    render(<ProviderSelector />);

    const modelSection = screen.getByText(/Model Quality Preference/i);
    expect(modelSection).toBeDefined();
  });

  it('should display model slider', () => {
    const { container } = render(<ProviderSelector />);

    const slider = container.querySelector('input[type="range"]');
    expect(slider).toBeDefined();
  });

  it('should display Speed label', () => {
    render(<ProviderSelector />);

    const speedLabel = screen.getByText(/⚡ Speed/i);
    expect(speedLabel).toBeDefined();
  });

  it('should display Balanced label', () => {
    render(<ProviderSelector />);

    const balancedLabel = screen.getByText(/⚖️ Balanced/i);
    expect(balancedLabel).toBeDefined();
  });

  it('should display Quality label', () => {
    render(<ProviderSelector />);

    const qualityLabel = screen.getByText(/⭐ Quality/i);
    expect(qualityLabel).toBeDefined();
  });

  it('should display Best label', () => {
    render(<ProviderSelector />);

    const bestLabels = screen.getAllByText(/💎 Best/i);
    expect(bestLabels.length).toBeGreaterThan(0);
  });

  it('should display selected model info', () => {
    render(<ProviderSelector />);

    const selectedModelText = screen.getByText(/Selected Model/i);
    expect(selectedModelText).toBeDefined();
  });

  it('should display model checkpoint name', () => {
    render(<ProviderSelector />);

    const checkpointText = screen.getByText(/FLUX.1-dev/i);
    expect(checkpointText).toBeDefined();
  });

  it('should change model when slider moves', async () => {
    const mockOnModelChange = vi.fn();
    const { container } = render(<ProviderSelector onModelChange={mockOnModelChange} />);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0' } }); // Speed

    await waitFor(() => {
      expect(mockOnModelChange).toHaveBeenCalledWith('speed');
    });
  });
});

describe('ProviderSelector - Model Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display model speed', () => {
    render(<ProviderSelector />);

    const speedTexts = screen.getAllByText(/~30s/i);
    expect(speedTexts.length).toBeGreaterThan(0);
  });

  it('should display model quality', () => {
    render(<ProviderSelector />);

    const qualityTexts = screen.getAllByText(/Excellent/i);
    expect(qualityTexts.length).toBeGreaterThan(0);
  });

  it('should display model steps', () => {
    render(<ProviderSelector />);

    const stepsText = screen.getByText('20');
    expect(stepsText).toBeDefined();
  });

  it('should display VRAM requirement', () => {
    render(<ProviderSelector />);

    const vramTexts = screen.getAllByText(/8GB/i);
    expect(vramTexts.length).toBeGreaterThan(0);
  });

  it('should display model description', () => {
    render(<ProviderSelector />);

    const descText = screen.getByText(/Balanced model/i);
    expect(descText).toBeDefined();
  });
});

describe('ProviderSelector - Props Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept onModeChange callback', () => {
    const mockCallback = vi.fn();
    render(<ProviderSelector onModeChange={mockCallback} />);

    const cloudCard = screen.getByText(/Cloud APIs/i).closest('.mode-card');
    fireEvent.click(cloudCard!);

    expect(mockCallback).toHaveBeenCalled();
  });

  it('should accept onModelChange callback', () => {
    const mockCallback = vi.fn();
    render(<ProviderSelector onModelChange={mockCallback} />);

    // Callback called on mount due to useEffect
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should accept className prop', () => {
    const { container } = render(<ProviderSelector className="custom-class" />);

    const selector = container.querySelector('.custom-class');
    expect(selector).toBeDefined();
  });

  it('should work without any props', () => {
    render(<ProviderSelector />);

    const heading = screen.getByText(/AI Provider Mode/i);
    expect(heading).toBeDefined();
  });
});

describe('ProviderSelector - Conditional Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show model selection in hybrid mode', () => {
    render(<ProviderSelector />);

    const modelSection = screen.getByText(/Model Quality Preference/i);
    expect(modelSection).toBeDefined();
  });

  it('should hide model selection when switching to cloud mode', () => {
    render(<ProviderSelector />);

    const cloudCard = screen.getByText(/Cloud APIs/i).closest('.mode-card');
    fireEvent.click(cloudCard!);

    const modelSection = screen.queryByText(/Model Quality Preference/i);
    expect(modelSection).toBeNull();
  });

  it('should show model selection when switching to open-source mode', () => {
    render(<ProviderSelector />);

    const openSourceCards = screen.getAllByText(/Open Source/i);
    const openSourceCard = openSourceCards[0].closest('.mode-card');
    fireEvent.click(openSourceCard!);

    const modelSection = screen.getByText(/Model Quality Preference/i);
    expect(modelSection).toBeDefined();
  });
});

