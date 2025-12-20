import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProviderSelector } from './ProviderSelector';
import * as modelSelector from '../services/comfyuiModelSelector';

// Mock the model selector service
vi.mock('../services/comfyuiModelSelector', () => ({
  MODEL_PROFILES: {
    SPEED: {
      checkpoint: 'FLUX schnell',
      steps: 4,
      vramRequired: 6,
      estimatedTime: '8-12s',
      quality: 'Good',
      description: 'Fastest generation',
    },
    BALANCED: {
      checkpoint: 'FLUX dev (Q8)',
      steps: 20,
      vramRequired: 8,
      estimatedTime: '25-35s',
      quality: 'Great',
      description: 'Balanced quality/speed',
    },
    QUALITY: {
      checkpoint: 'FLUX dev',
      steps: 28,
      vramRequired: 12,
      estimatedTime: '40-60s',
      quality: 'Excellent',
      description: 'High quality',
    },
    BEST: {
      checkpoint: 'FLUX pro',
      steps: 40,
      vramRequired: 16,
      estimatedTime: '80-120s',
      quality: 'Best',
      description: 'Ultimate quality',
    },
  },
  selectOptimalModel: vi.fn((preference: string) => {
    const profiles = {
      speed: {
        checkpoint: 'FLUX schnell',
        steps: 4,
        vramRequired: 6,
        estimatedTime: '8-12s',
        quality: 'Good',
        description: 'Fastest generation',
      },
      balanced: {
        checkpoint: 'FLUX dev (Q8)',
        steps: 20,
        vramRequired: 8,
        estimatedTime: '25-35s',
        quality: 'Great',
        description: 'Balanced quality/speed',
      },
      quality: {
        checkpoint: 'FLUX dev',
        steps: 28,
        vramRequired: 12,
        estimatedTime: '40-60s',
        quality: 'Excellent',
        description: 'High quality',
      },
      best: {
        checkpoint: 'FLUX pro',
        steps: 40,
        vramRequired: 16,
        estimatedTime: '80-120s',
        quality: 'Best',
        description: 'Ultimate quality',
      },
    };
    return profiles[preference as keyof typeof profiles] || profiles.balanced;
  }),
  detectAvailableVRAM: vi.fn(() => Promise.resolve(8)),
  calculateCostSavings: vi.fn(() => ({
    savings: 12.5,
    savingsPercent: 65,
  })),
}));

describe('ProviderSelector', () => {
  const mockOnModeChange = vi.fn();
  const mockOnModelChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render component header', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('🤖 AI Provider Mode')).toBeInTheDocument();
      expect(screen.getByText(/เลือกวิธีการสร้าง AI ที่เหมาะกับคุณ/)).toBeInTheDocument();
    });

    it('should render all three mode cards', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('Cloud APIs')).toBeInTheDocument();
      expect(screen.getByText('Open Source')).toBeInTheDocument();
      // Hybrid appears multiple times (mode card + cost table)
      const hybridTexts = screen.getAllByText('Hybrid');
      expect(hybridTexts.length).toBeGreaterThan(0);
    });

    it('should have hybrid mode selected by default', () => {
      render(<ProviderSelector />);
      const modeCards = document.querySelectorAll('.mode-card');
      const hybridCard = Array.from(modeCards).find(
        card => card.querySelector('h4')?.textContent === 'Hybrid'
      );
      expect(hybridCard?.className).toContain('active');
    });
  });

  describe('Cloud Mode Card', () => {
    it('should display cloud mode features', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('☁️')).toBeInTheDocument();
      expect(screen.getByText('⚡⚡⚡⚡ Fastest')).toBeInTheDocument();
      expect(screen.getByText('3-10s')).toBeInTheDocument();
      expect(screen.getByText('💰 Uses credits')).toBeInTheDocument();
    });

    it('should display cloud providers list', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/Gemini 2.0 Flash/)).toBeInTheDocument();
      expect(screen.getByText(/Gemini Imagen 3/)).toBeInTheDocument();
      expect(screen.getByText(/Veo 3.1/)).toBeInTheDocument();
    });

    it('should show cloud cost', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/Costs ฿34\/project/)).toBeInTheDocument();
    });
  });

  describe('Open Source Mode Card', () => {
    it('should display open source mode features', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('🔓')).toBeInTheDocument();
      expect(screen.getByText('⚡⚡ Medium')).toBeInTheDocument();
      expect(screen.getByText('20-60s')).toBeInTheDocument();
      expect(screen.getByText('💚 100% FREE')).toBeInTheDocument();
    });

    it('should display open source providers list', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/Ollama \+ Llama 3.2/)).toBeInTheDocument();
      expect(screen.getByText(/ComfyUI \+ FLUX/)).toBeInTheDocument();
      expect(screen.getByText(/AnimateDiff/)).toBeInTheDocument();
    });

    it('should show GPU requirement warning', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/Requires GPU \(8GB\+\)/)).toBeInTheDocument();
    });
  });

  describe('Hybrid Mode Card', () => {
    it('should display recommended badge', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('⭐ แนะนำ')).toBeInTheDocument();
    });

    it('should display hybrid mode features', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('🔀')).toBeInTheDocument();
      expect(screen.getByText('⚡⚡⚡ Fast')).toBeInTheDocument();
      expect(screen.getByText('10-30s')).toBeInTheDocument();
      expect(screen.getByText('💎 Best Value')).toBeInTheDocument();
    });

    it('should show hybrid cost range', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/Costs ฿5-15\/project/)).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should select cloud mode when clicked', () => {
      render(<ProviderSelector onModeChange={mockOnModeChange} />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      expect(mockOnModeChange).toHaveBeenCalledWith('cloud');
      expect(cloudCard?.className).toContain('active');
    });

    it('should select open-source mode when clicked', () => {
      render(<ProviderSelector onModeChange={mockOnModeChange} />);

      const openSourceCard = screen.getByText('Open Source').closest('.mode-card');
      fireEvent.click(openSourceCard!);

      expect(mockOnModeChange).toHaveBeenCalledWith('open-source');
      expect(openSourceCard?.className).toContain('active');
    });

    it('should select hybrid mode when clicked', () => {
      render(<ProviderSelector onModeChange={mockOnModeChange} />);

      const modeCards = document.querySelectorAll('.mode-card');
      const hybridCard = Array.from(modeCards).find(
        card => card.querySelector('h4')?.textContent === 'Hybrid'
      );
      fireEvent.click(hybridCard!);

      expect(mockOnModeChange).toHaveBeenCalledWith('hybrid');
    });
  });

  describe('Model Selection UI - Visibility', () => {
    it('should show model selection for hybrid mode', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('🎨 Model Quality Preference')).toBeInTheDocument();
    });

    it('should show model selection for open-source mode', () => {
      render(<ProviderSelector />);

      const openSourceCard = screen.getByText('Open Source').closest('.mode-card');
      fireEvent.click(openSourceCard!);

      expect(screen.getByText('🎨 Model Quality Preference')).toBeInTheDocument();
    });

    it('should hide model selection for cloud mode', () => {
      render(<ProviderSelector />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      expect(screen.queryByText('🎨 Model Quality Preference')).not.toBeInTheDocument();
    });
  });

  describe('Model Preference Slider', () => {
    it('should display slider labels', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('⚡ Speed')).toBeInTheDocument();
      expect(screen.getByText('⚖️ Balanced')).toBeInTheDocument();
      expect(screen.getByText('⭐ Quality')).toBeInTheDocument();
      expect(screen.getByText('💎 Best')).toBeInTheDocument();
    });

    it('should have balanced selected by default', () => {
      render(<ProviderSelector />);
      const balancedLabel = screen.getByText('⚖️ Balanced');
      expect(balancedLabel.className).toContain('active');
    });

    it('should change preference when slider moves', () => {
      render(<ProviderSelector onModelChange={mockOnModelChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2' } });

      expect(mockOnModelChange).toHaveBeenCalledWith('quality');
    });

    it('should update active label when slider changes', () => {
      render(<ProviderSelector />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0' } });

      const speedLabel = screen.getByText('⚡ Speed');
      expect(speedLabel.className).toContain('active');
    });
  });

  describe('Selected Model Info', () => {
    it('should display selected model details', async () => {
      render(<ProviderSelector />);

      await waitFor(() => {
        expect(screen.getByText('📦 Selected Model')).toBeInTheDocument();
        expect(screen.getByText('FLUX dev (Q8)')).toBeInTheDocument();
        expect(screen.getByText('25-35s')).toBeInTheDocument();
        expect(screen.getByText('Great')).toBeInTheDocument();
      });
    });

    it('should show model steps', async () => {
      render(<ProviderSelector />);

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument();
      });
    });

    it('should show VRAM requirement', async () => {
      render(<ProviderSelector />);

      await waitFor(() => {
        expect(screen.getByText('8GB')).toBeInTheDocument();
      });
    });

    it('should update model when preference changes', async () => {
      render(<ProviderSelector />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0' } });

      await waitFor(() => {
        expect(screen.getByText('FLUX schnell')).toBeInTheDocument();
        expect(screen.getByText('8-12s')).toBeInTheDocument();
      });
    });
  });

  describe('Cost Estimator', () => {
    it('should display cost estimator section', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('💰 ประมาณการค่าใช้จ่าย')).toBeInTheDocument();
    });

    it('should have default 12 generations', () => {
      render(<ProviderSelector />);
      const input = screen.getByDisplayValue('12');
      expect(input).toHaveValue(12);
    });

    it('should allow changing generation count', () => {
      render(<ProviderSelector />);
      const input = screen.getByDisplayValue('12') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '20' } });
      expect(input).toHaveValue(20);
    });

    it('should show cost table headers', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('รายการ')).toBeInTheDocument();
      // Hybrid appears in mode card and table header
      const hybridTexts = screen.getAllByText('Hybrid');
      expect(hybridTexts.length).toBeGreaterThan(0);
      expect(screen.getByText('Cloud (เปรียบเทียบ)')).toBeInTheDocument();
    });
  });

  describe('Cost Calculations - Hybrid Mode', () => {
    it('should calculate hybrid text cost', () => {
      render(<ProviderSelector />);
      const cells = screen.getAllByText('฿0');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should calculate hybrid image cost', () => {
      render(<ProviderSelector />);
      // 12 images × ฿0.50 = ฿6.00
      expect(screen.getByText('฿6.00')).toBeInTheDocument();
    });

    it('should calculate hybrid video cost', () => {
      render(<ProviderSelector />);
      const cells = screen.getAllByText('฿0');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should update image cost when generations change', async () => {
      render(<ProviderSelector />);
      const input = screen.getByDisplayValue('12') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '20' } });

      // 20 images × ฿0.50 = ฿10.00
      await waitFor(() => {
        expect(screen.getByText('฿10.00')).toBeInTheDocument();
      });
    });
  });

  describe('Cost Calculations - Cloud Mode', () => {
    it('should calculate cloud text cost', () => {
      render(<ProviderSelector />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      expect(screen.getAllByText('฿0.35').length).toBeGreaterThan(0);
    });

    it('should calculate cloud image cost', async () => {
      render(<ProviderSelector />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      // 12 images × ฿1.40 = ฿16.80
      // This value appears in both columns (cloud and comparison)
      await waitFor(() => {
        const prices = screen.getAllByText('฿16.80');
        expect(prices.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should calculate cloud video cost', () => {
      render(<ProviderSelector />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      expect(screen.getAllByText('฿17.50').length).toBeGreaterThan(0);
    });
  });

  describe('Cost Calculations - Open Source Mode', () => {
    it('should show zero cost for open source', () => {
      render(<ProviderSelector />);

      const openSourceCard = screen.getByText('Open Source').closest('.mode-card');
      fireEvent.click(openSourceCard!);

      const zeroCosts = screen.getAllByText('฿0');
      expect(zeroCosts.length).toBeGreaterThan(3); // text, images, video, total
    });
  });

  describe('Savings Display', () => {
    it('should show savings for hybrid mode', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/ประหยัดได้ ฿12.50/)).toBeInTheDocument();
      expect(screen.getByText(/\(65%\)/)).toBeInTheDocument();
    });

    it('should show savings for open-source mode', () => {
      render(<ProviderSelector />);

      const openSourceCard = screen.getByText('Open Source').closest('.mode-card');
      fireEvent.click(openSourceCard!);

      expect(screen.getByText(/ประหยัดได้/)).toBeInTheDocument();
    });

    it('should not show savings for cloud mode', () => {
      render(<ProviderSelector />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      expect(screen.queryByText(/ประหยัดได้/)).not.toBeInTheDocument();
    });
  });

  describe('Hardware Requirements', () => {
    it('should show hardware requirements for hybrid mode', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('⚙️ ความต้องการของระบบ')).toBeInTheDocument();
    });

    it('should show hardware requirements for open-source mode', () => {
      render(<ProviderSelector />);

      const openSourceCard = screen.getByText('Open Source').closest('.mode-card');
      fireEvent.click(openSourceCard!);

      expect(screen.getByText('⚙️ ความต้องการของระบบ')).toBeInTheDocument();
    });

    it('should hide hardware requirements for cloud mode', () => {
      render(<ProviderSelector />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      expect(screen.queryByText('⚙️ ความต้องการของระบบ')).not.toBeInTheDocument();
    });

    it('should display GPU requirement', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/8GB VRAM ขึ้นไป/)).toBeInTheDocument();
    });

    it('should display storage requirement', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/~20GB สำหรับ models/)).toBeInTheDocument();
    });

    it('should display RAM requirement', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/16GB แนะนำ/)).toBeInTheDocument();
    });

    it('should display OS compatibility', () => {
      render(<ProviderSelector />);
      expect(screen.getByText(/Windows, macOS, Linux/)).toBeInTheDocument();
    });
  });

  describe('Setup Links', () => {
    it('should display setup links', () => {
      render(<ProviderSelector />);
      expect(screen.getByText('📖 คู่มือติดตั้ง ComfyUI')).toBeInTheDocument();
      expect(screen.getByText('📖 คู่มือติดตั้ง Ollama')).toBeInTheDocument();
      expect(screen.getByText('📥 ดาวน์โหลด Models')).toBeInTheDocument();
    });
  });

  describe('VRAM Detection', () => {
    it('should detect available VRAM on mount', async () => {
      render(<ProviderSelector />);

      await waitFor(() => {
        expect(modelSelector.detectAvailableVRAM).toHaveBeenCalled();
      });
    });

    it('should show warning when VRAM is insufficient', async () => {
      (modelSelector.detectAvailableVRAM as any).mockResolvedValueOnce(4);

      render(<ProviderSelector />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '3' } }); // Best quality needs 16GB

      await waitFor(() => {
        expect(screen.getByText(/VRAM ของคุณอาจไม่พอ/)).toBeInTheDocument();
      });
    });
  });

  describe('Callback Functions', () => {
    it('should call onModeChange when mode changes', () => {
      render(<ProviderSelector onModeChange={mockOnModeChange} />);

      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      fireEvent.click(cloudCard!);

      expect(mockOnModeChange).toHaveBeenCalledWith('cloud');
    });

    it('should call onModelChange when model preference changes', async () => {
      render(<ProviderSelector onModelChange={mockOnModelChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2' } });

      await waitFor(() => {
        expect(mockOnModelChange).toHaveBeenCalledWith('quality');
      });
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(<ProviderSelector className="custom-class" />);
      const providerSelector = container.querySelector('.provider-selector');
      expect(providerSelector?.className).toContain('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have role="button" on mode cards', () => {
      render(<ProviderSelector />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(2);
    });

    it('should have tabIndex on mode cards', () => {
      render(<ProviderSelector />);
      const cloudCard = screen.getByText('Cloud APIs').closest('.mode-card');
      expect(cloudCard).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid generation count', async () => {
      render(<ProviderSelector />);
      const input = screen.getByDisplayValue('12') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      await waitFor(() => {
        expect(input).toHaveValue(1); // Defaults to 1
      });
    });

    it('should handle slider value changes smoothly', () => {
      render(<ProviderSelector />);
      const slider = screen.getByRole('slider');

      for (let i = 0; i <= 3; i++) {
        fireEvent.change(slider, { target: { value: i.toString() } });
      }

      // Should not throw errors
      expect(slider).toBeInTheDocument();
    });
  });

  describe('Integration with Model Selector Service', () => {
    it('should call selectOptimalModel with correct parameters', async () => {
      render(<ProviderSelector />);

      await waitFor(() => {
        expect(modelSelector.selectOptimalModel).toHaveBeenCalledWith('balanced', 8);
      });
    });

    it('should call calculateCostSavings with correct parameters', async () => {
      render(<ProviderSelector />);

      await waitFor(() => {
        expect(modelSelector.calculateCostSavings).toHaveBeenCalled();
      });
    });
  });
});

