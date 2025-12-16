import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceSettings } from './DeviceSettings';
import * as deviceManager from '../services/deviceManager';

// Mock the deviceManager service
vi.mock('../services/deviceManager', () => ({
  detectSystemResources: vi.fn(),
  checkComfyUIHealth: vi.fn(),
  getRecommendedSettings: vi.fn(),
  saveRenderSettings: vi.fn(),
  loadRenderSettings: vi.fn(),
  getDeviceDisplayName: vi.fn(),
  estimateRenderTime: vi.fn(),
  getCloudProviders: vi.fn(),
}));

describe('DeviceSettings', () => {
  const mockResources: deviceManager.SystemResources = {
    platform: 'darwin',
    cpu: {
      cores: 8,
      model: 'Apple M1',
    },
    memory: {
      total: 16384, // 16 GB
      available: 8192, // 8 GB
    },
    devices: [
      {
        type: 'mps',
        name: 'Apple M1 GPU',
        available: true,
        isRecommended: true,
        vram: 8192,
      },
      {
        type: 'cpu',
        name: 'CPU (Fallback)',
        available: true,
        isRecommended: false,
      },
      {
        type: 'cuda',
        name: 'NVIDIA GPU',
        available: false,
      },
    ],
  };

  const mockSettings: deviceManager.RenderSettings = {
    device: 'mps',
    executionMode: 'local',
    useLowVRAM: false,
    cloudProvider: 'colab',
  };

  const mockHealthy = {
    status: 'healthy',
    message: 'ระบบพร้อมทำงาน',
    local: true,
    cloud: true,
    resources: mockResources,
  };

  const mockCloudProviders: deviceManager.CloudProvider[] = [
    {
      id: 'colab',
      name: 'Google Colab Pro+',
      description: 'แนะนำ - A100 GPU ความเร็วสูง',
      available: true,
      speed: 'เร็วมาก',
      cost: '฿300/เดือน',
      gpu: 'A100 40GB',
      setupRequired: true,
    },
    {
      id: 'firebase',
      name: 'Firebase Functions',
      description: 'รัน workflow บน serverless',
      available: false,
      speed: 'ปานกลาง',
      cost: 'Pay per use',
      gpu: 'Cloud GPU',
      setupRequired: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(deviceManager.checkComfyUIHealth).mockResolvedValue(mockHealthy);
    vi.mocked(deviceManager.detectSystemResources).mockResolvedValue(mockResources);
    vi.mocked(deviceManager.loadRenderSettings).mockReturnValue(mockSettings);
    vi.mocked(deviceManager.getRecommendedSettings).mockReturnValue(mockSettings);
    vi.mocked(deviceManager.getDeviceDisplayName).mockReturnValue('Apple M1 GPU');
    vi.mocked(deviceManager.estimateRenderTime).mockReturnValue('~30 วินาที');
    vi.mocked(deviceManager.getCloudProviders).mockReturnValue(mockCloudProviders);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should show loading state initially', () => {
      render(<DeviceSettings />);
      expect(screen.getByText('🖥️ กำลังตรวจสอบ...')).toBeInTheDocument();
    });

    it('should load system info on mount', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(deviceManager.checkComfyUIHealth).toHaveBeenCalled();
      });
    });

    it('should show device button after loading', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });
    });

    it('should disable button while loading', () => {
      render(<DeviceSettings />);
      const button = screen.getByRole('button', { name: /กำลังตรวจสอบ/ });
      expect(button).toBeDisabled();
    });
  });

  describe('Modal Interaction', () => {
    it('should open modal when clicking device button', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      const triggerButton = screen.getByRole('button', { name: /Apple M1 GPU/ });
      fireEvent.click(triggerButton);

      expect(screen.getByText('⚙️ การตั้งค่าอุปกรณ์ Render')).toBeInTheDocument();
    });

    it('should close modal when clicking close button', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      // Close modal
      const closeButton = screen.getByRole('button', { name: '✕' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('⚙️ การตั้งค่าอุปกรณ์ Render')).not.toBeInTheDocument();
      });
    });

    it('should close modal when clicking overlay', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const overlay = document.querySelector('.device-settings-modal-overlay');
      expect(overlay).toBeInTheDocument();
      
      fireEvent.click(overlay!);

      await waitFor(() => {
        expect(screen.queryByText('⚙️ การตั้งค่าอุปกรณ์ Render')).not.toBeInTheDocument();
      });
    });

    it('should not close modal when clicking inside modal', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const modal = document.querySelector('.device-settings-modal');
      fireEvent.click(modal!);

      expect(screen.getByText('⚙️ การตั้งค่าอุปกรณ์ Render')).toBeInTheDocument();
    });
  });

  describe('Health Status Display', () => {
    it('should show healthy status with checkmark', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('ระบบพร้อมทำงาน')).toBeInTheDocument();
    });

    it('should show degraded status with warning', async () => {
      vi.mocked(deviceManager.checkComfyUIHealth).mockResolvedValue({
        status: 'degraded',
        message: 'บางฟีเจอร์อาจไม่พร้อม',
        local: true,
        cloud: false,
        resources: mockResources,
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('บางฟีเจอร์อาจไม่พร้อม')).toBeInTheDocument();
    });

    it('should show down status with error icon', async () => {
      vi.mocked(deviceManager.checkComfyUIHealth).mockResolvedValue({
        status: 'down',
        message: 'ไม่สามารถเชื่อมต่อได้',
        local: false,
        cloud: false,
        resources: mockResources,
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('ไม่สามารถเชื่อมต่อได้')).toBeInTheDocument();
    });

    it('should show local and cloud availability', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText(/Local: ✓ พร้อมใช้งาน/)).toBeInTheDocument();
      expect(screen.getByText(/Cloud: ✓ พร้อมใช้งาน/)).toBeInTheDocument();
    });

    it('should refresh health status when clicking refresh button', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const refreshButton = screen.getByRole('button', { name: /🔄 รีเฟรช/ });
      fireEvent.click(refreshButton);

      // Should call checkComfyUIHealth again (once on mount, once on refresh)
      await waitFor(() => {
        expect(deviceManager.checkComfyUIHealth).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('System Resources Display', () => {
    it('should show platform information', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('แพลตฟอร์ม:')).toBeInTheDocument();
      expect(screen.getByText('darwin')).toBeInTheDocument();
    });

    it('should show CPU cores', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('CPU Cores:')).toBeInTheDocument();
      expect(screen.getByText('8 cores')).toBeInTheDocument();
    });

    it('should show memory information', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('RAM:')).toBeInTheDocument();
      expect(screen.getByText(/8.0 GB \/ 16.0 GB/)).toBeInTheDocument();
    });
  });

  describe('Device Selection', () => {
    it('should show all available devices', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('Apple M1 GPU')).toBeInTheDocument();
      expect(screen.getByText('CPU (Fallback)')).toBeInTheDocument();
      expect(screen.getByText('NVIDIA GPU')).toBeInTheDocument();
    });

    it('should highlight selected device', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const deviceCards = document.querySelectorAll('.device-card');
      const selectedCard = Array.from(deviceCards).find(card => 
        card.classList.contains('selected')
      );

      expect(selectedCard).toBeInTheDocument();
      expect(selectedCard?.textContent).toContain('Apple M1 GPU');
    });

    it('should show recommended badge for recommended device', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('แนะนำ')).toBeInTheDocument();
    });

    it('should show VRAM for devices that have it', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText(/VRAM: 8.0 GB/)).toBeInTheDocument();
    });

    it('should disable unavailable devices', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const deviceCards = document.querySelectorAll('.device-card');
      const unavailableCard = Array.from(deviceCards).find(card => 
        card.textContent?.includes('NVIDIA GPU')
      );

      expect(unavailableCard).toHaveClass('disabled');
      expect(screen.getByText('ไม่พร้อมใช้งาน')).toBeInTheDocument();
    });

    it('should change device when clicking available device', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const deviceCards = document.querySelectorAll('.device-card');
      const cpuCard = Array.from(deviceCards).find(card => 
        card.textContent?.includes('CPU (Fallback)')
      ) as HTMLElement;

      fireEvent.click(cpuCard);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalledWith({
        ...mockSettings,
        device: 'cpu',
      });
    });

    it('should not change device when clicking disabled device', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const deviceCards = document.querySelectorAll('.device-card');
      const cudaCard = Array.from(deviceCards).find(card => 
        card.textContent?.includes('NVIDIA GPU')
      ) as HTMLElement;

      fireEvent.click(cudaCard);

      // Should not save settings
      expect(deviceManager.saveRenderSettings).not.toHaveBeenCalled();
    });

    it('should show estimated render time', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText(/⏱️ เวลาโดยประมาณ: ~30 วินาที/)).toBeInTheDocument();
    });
  });

  describe('Execution Mode Selection', () => {
    it('should show all execution modes', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText(/🏠 Local \(เครื่องของคุณ\)/)).toBeInTheDocument();
      expect(screen.getByText(/☁️ Cloud \(เซิร์ฟเวอร์\)/)).toBeInTheDocument();
      expect(screen.getByText(/🔄 Hybrid \(อัตโนมัติ\)/)).toBeInTheDocument();
    });

    it('should select local mode by default', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const localRadio = screen.getByRole('radio', { name: /Local/ }) as HTMLInputElement;
      expect(localRadio.checked).toBe(true);
    });

    it('should change to cloud mode when selected', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const cloudRadio = screen.getByRole('radio', { name: /Cloud/ });
      fireEvent.click(cloudRadio);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalledWith({
        ...mockSettings,
        executionMode: 'cloud',
      });
    });

    it('should change to hybrid mode when selected', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const hybridRadio = screen.getByRole('radio', { name: /Hybrid/ });
      fireEvent.click(hybridRadio);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalledWith({
        ...mockSettings,
        executionMode: 'hybrid',
      });
    });

    it('should disable local mode when not available', async () => {
      vi.mocked(deviceManager.checkComfyUIHealth).mockResolvedValue({
        status: 'degraded',
        message: 'Local ไม่พร้อม',
        local: false,
        cloud: true,
        resources: mockResources,
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const localRadio = screen.getByRole('radio', { name: /Local/ });
      expect(localRadio).toBeDisabled();
    });

    it('should disable cloud mode when not available', async () => {
      vi.mocked(deviceManager.checkComfyUIHealth).mockResolvedValue({
        status: 'degraded',
        message: 'Cloud ไม่พร้อม',
        local: true,
        cloud: false,
        resources: mockResources,
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const cloudRadio = screen.getByRole('radio', { name: /Cloud/ });
      expect(cloudRadio).toBeDisabled();
    });
  });

  describe('Cloud Provider Selection', () => {
    it('should show cloud providers when in cloud mode', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('☁️ เลือก Cloud Provider')).toBeInTheDocument();
      expect(screen.getByText('Google Colab Pro+')).toBeInTheDocument();
      expect(screen.getByText('Firebase Functions')).toBeInTheDocument();
    });

    it('should show cloud providers when in hybrid mode', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'hybrid',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('☁️ เลือก Cloud Provider')).toBeInTheDocument();
    });

    it('should not show cloud providers in local mode', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.queryByText('☁️ เลือก Cloud Provider')).not.toBeInTheDocument();
    });

    it('should show provider details', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('แนะนำ - A100 GPU ความเร็วสูง')).toBeInTheDocument();
      expect(screen.getByText('เร็วมาก')).toBeInTheDocument();
      expect(screen.getByText('฿300/เดือน')).toBeInTheDocument();
      expect(screen.getByText('GPU: A100 40GB')).toBeInTheDocument();
    });

    it('should highlight selected provider', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const providerCards = document.querySelectorAll('.provider-card');
      const selectedCard = Array.from(providerCards).find(card => 
        card.classList.contains('selected')
      );

      expect(selectedCard).toBeInTheDocument();
      expect(selectedCard?.textContent).toContain('Google Colab Pro+');
    });

    it('should show recommended badge for Colab when available', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('แนะนำ - คุ้มที่สุด!')).toBeInTheDocument();
    });

    it('should show setup required for unavailable providers', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const providerCards = document.querySelectorAll('.provider-card');
      const firebaseCard = Array.from(providerCards).find(card => 
        card.textContent?.includes('Firebase Functions')
      );

      expect(firebaseCard).toHaveClass('disabled');
      expect(screen.getByText(/ต้องตั้งค่า/)).toBeInTheDocument();
    });

    it('should change provider when clicking available provider', async () => {
      const mockProviders: deviceManager.CloudProvider[] = [
        ...mockCloudProviders,
        {
          id: 'runpod',
          name: 'RunPod',
          description: 'GPU Cloud',
          available: true,
          speed: 'เร็ว',
          cost: 'Pay per use',
          gpu: 'RTX 4090',
          setupRequired: false,
        },
      ];

      vi.mocked(deviceManager.getCloudProviders).mockReturnValue(mockProviders);
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const providerCards = document.querySelectorAll('.provider-card');
      const runpodCard = Array.from(providerCards).find(card => 
        card.textContent?.includes('RunPod')
      ) as HTMLElement;

      fireEvent.click(runpodCard);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalledWith({
        ...mockSettings,
        executionMode: 'cloud',
        cloudProvider: 'runpod',
      });
    });

    it('should show Colab setup guide when Colab is selected', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
        cloudProvider: 'colab',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('🎓 วิธีตั้งค่า Google Colab Pro+:')).toBeInTheDocument();
      expect(screen.getByText(/อัพโหลด notebook:/)).toBeInTheDocument();
      expect(screen.getByText('comfyui_server.ipynb')).toBeInTheDocument();
    });

    it('should show hint about Colab Pro+', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        executionMode: 'cloud',
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('💡 คุณจ่าย Colab Pro+ แล้ว ใช้ให้คุ้มค่า!')).toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('should show Low VRAM checkbox', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText(/🔧 โหมด Low VRAM/)).toBeInTheDocument();
    });

    it('should toggle Low VRAM mode', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalledWith({
        ...mockSettings,
        useLowVRAM: true,
      });
    });

    it('should show enabled hint when Low VRAM is on', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue({
        ...mockSettings,
        useLowVRAM: true,
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
      expect(screen.getByText(/- เปิดใช้งาน/)).toBeInTheDocument();
    });

    it('should show tips and recommendations', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('💡 คำแนะนำ:')).toBeInTheDocument();
      expect(screen.getByText(/NVIDIA GPU \(CUDA\):/)).toBeInTheDocument();
      expect(screen.getByText(/Apple Silicon \(MPS\):/)).toBeInTheDocument();
      // Check for CPU and Cloud in info box content
      const infoBox = document.querySelector('.info-box');
      expect(infoBox?.textContent).toContain('CPU:');
      expect(infoBox?.textContent).toContain('Cloud:');
    });
  });

  describe('Error Handling', () => {
    it('should handle health check error gracefully', async () => {
      vi.mocked(deviceManager.checkComfyUIHealth).mockRejectedValue(
        new Error('Network error')
      );

      render(<DeviceSettings />);

      await waitFor(() => {
        // Should still show button after error
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should show unknown status when health check fails', async () => {
      vi.mocked(deviceManager.checkComfyUIHealth).mockResolvedValue({
        resources: mockResources,
      });

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByText('ไม่ทราบสถานะ')).toBeInTheDocument();
    });

    it('should load recommended settings when no saved settings exist', async () => {
      vi.mocked(deviceManager.loadRenderSettings).mockReturnValue(null);

      render(<DeviceSettings />);

      await waitFor(() => {
        expect(deviceManager.getRecommendedSettings).toHaveBeenCalledWith(mockResources);
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should load saved settings on mount', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(deviceManager.loadRenderSettings).toHaveBeenCalled();
      });
    });

    it('should save device changes', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const deviceCards = document.querySelectorAll('.device-card');
      const cpuCard = Array.from(deviceCards).find(card => 
        card.textContent?.includes('CPU (Fallback)')
      ) as HTMLElement;

      fireEvent.click(cpuCard);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalled();
    });

    it('should save mode changes', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const cloudRadio = screen.getByRole('radio', { name: /Cloud/ });
      fireEvent.click(cloudRadio);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalled();
    });

    it('should save Low VRAM changes', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(deviceManager.saveRenderSettings).toHaveBeenCalled();
    });
  });

  describe('Modal Footer', () => {
    it('should show save and close button', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      expect(screen.getByRole('button', { name: '✓ บันทึกและปิด' })).toBeInTheDocument();
    });

    it('should close modal when clicking save button', async () => {
      render(<DeviceSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Apple M1 GPU/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apple M1 GPU/ }));

      const saveButton = screen.getByRole('button', { name: '✓ บันทึกและปิด' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText('⚙️ การตั้งค่าอุปกรณ์ Render')).not.toBeInTheDocument();
      });
    });
  });
});
