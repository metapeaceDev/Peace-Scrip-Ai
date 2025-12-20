import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TTSSettingsModal, TTSSettings, TTSEngine } from './TTSSettingsModal';

describe('TTSSettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnPreview = vi.fn();

  const defaultSettings: TTSSettings = {
    engine: 'browser',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  const propsWithOpen = {
    isOpen: true,
    onClose: mockOnClose,
    currentSettings: defaultSettings,
    onSave: mockOnSave,
    onPreview: mockOnPreview,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<TTSSettingsModal {...propsWithOpen} isOpen={false} />);

      expect(screen.queryByText('Voice Reading Settings')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Voice Reading Settings')).toBeInTheDocument();
    });

    it('should render modal header', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Voice Reading Settings')).toBeInTheDocument();
      expect(screen.getByText('เลือก TTS Engine และปรับแต่งเสียงอ่าน')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const closeButtons = document.querySelectorAll('button');
      const closeButton = Array.from(closeButtons).find(btn => {
        const svg = btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]');
        return svg !== null;
      });
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const closeButtons = document.querySelectorAll('button');
      const closeButton = Array.from(closeButtons).find(btn => {
        const svg = btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]');
        return svg !== null;
      });

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Engine Selection', () => {
    it('should render all TTS engine options', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText(/Browser TTS/)).toBeInTheDocument();
      expect(screen.getByText(/Google Cloud Text-to-Speech/)).toBeInTheDocument();
      expect(screen.getByText(/Azure Cognitive Services/)).toBeInTheDocument();
      expect(screen.getByText(/Amazon Polly/)).toBeInTheDocument();
      expect(screen.getByText(/PyThaiNLP TTS/)).toBeInTheDocument();
    });

    it('should highlight selected engine', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const browserButton = screen.getByText(/Browser TTS/).closest('button');
      expect(browserButton?.className).toContain('border-cyan-500');
    });

    it('should change engine when clicked', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const googleButton = screen.getByText(/Google Cloud Text-to-Speech/).closest('button');
      if (googleButton) {
        fireEvent.click(googleButton);
      }

      // Check if Google engine is now selected
      expect(googleButton?.className).toContain('border-cyan-500');
    });

    it('should show engine info for browser', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText(/ฟรี 100%/)).toBeInTheDocument();
      expect(screen.getByText(/💚 ฟรี ไม่มีค่าใช้จ่าย/)).toBeInTheDocument();
    });

    it('should show engine info for Google', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText(/คุณภาพเสียงไทยสูงสุด/)).toBeInTheDocument();
      // Multiple engines may have same pricing, just check it exists
      const pricingElements = screen.getAllByText(/\$4\/1M chars/);
      expect(pricingElements.length).toBeGreaterThan(0);
    });

    it('should show engine info for Azure', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText(/Microsoft TTS/)).toBeInTheDocument();
      expect(screen.getByText(/\$1\/1K requests/)).toBeInTheDocument();
    });

    it('should show engine info for AWS', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText(/AWS TTS/)).toBeInTheDocument();
    });

    it('should show engine info for PyThaiNLP', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText(/ฟรี Open Source/)).toBeInTheDocument();
    });
  });

  describe('API Configuration', () => {
    it('should not show API config for browser engine', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.queryByText('API Configuration')).not.toBeInTheDocument();
    });

    it('should show Google API config when Google selected', () => {
      const googleSettings = { ...defaultSettings, engine: 'google' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={googleSettings} />);

      expect(screen.getByText('API Configuration')).toBeInTheDocument();
      expect(screen.getByText('Google Cloud API Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
    });

    it('should show Azure API config when Azure selected', () => {
      const azureSettings = { ...defaultSettings, engine: 'azure' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={azureSettings} />);

      expect(screen.getByText('API Configuration')).toBeInTheDocument();
      expect(screen.getByText('Azure Speech Key')).toBeInTheDocument();
      expect(screen.getByText('Region')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('southeastasia')).toBeInTheDocument();
    });

    it('should show AWS API config when AWS selected', () => {
      const awsSettings = { ...defaultSettings, engine: 'aws' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={awsSettings} />);

      expect(screen.getByText('API Configuration')).toBeInTheDocument();
      expect(screen.getByText('AWS Access Key ID')).toBeInTheDocument();
      expect(screen.getByText('AWS Secret Access Key')).toBeInTheDocument();
      expect(screen.getByText('AWS Region')).toBeInTheDocument();
    });

    it('should show PyThaiNLP config when PyThaiNLP selected', () => {
      const pythainlpSettings = { ...defaultSettings, engine: 'pythainlp' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={pythainlpSettings} />);

      expect(screen.getByText('API Configuration')).toBeInTheDocument();
      expect(screen.getByText('PyThaiNLP Server Endpoint')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('http://localhost:8000/tts')).toBeInTheDocument();
    });

    it('should update Google API key on input', () => {
      const googleSettings = { ...defaultSettings, engine: 'google' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={googleSettings} />);

      const input = screen.getByPlaceholderText('AIza...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'AIza123456' } });

      expect(input.value).toBe('AIza123456');
    });

    it('should update Azure keys on input', () => {
      const azureSettings = { ...defaultSettings, engine: 'azure' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={azureSettings} />);

      const keyInput = screen.getByPlaceholderText(
        'Enter your Azure Speech key'
      ) as HTMLInputElement;
      const regionInput = screen.getByPlaceholderText('southeastasia') as HTMLInputElement;

      fireEvent.change(keyInput, { target: { value: 'azure-key-123' } });
      fireEvent.change(regionInput, { target: { value: 'eastasia' } });

      expect(keyInput.value).toBe('azure-key-123');
      expect(regionInput.value).toBe('eastasia');
    });

    it('should update AWS credentials on input', () => {
      const awsSettings = { ...defaultSettings, engine: 'aws' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={awsSettings} />);

      const accessKeyInput = screen.getByPlaceholderText('AKIA...') as HTMLInputElement;
      const secretKeyInput = screen.getByPlaceholderText('Enter secret key') as HTMLInputElement;
      const regionInput = screen.getByPlaceholderText('ap-southeast-1') as HTMLInputElement;

      fireEvent.change(accessKeyInput, { target: { value: 'AKIA123' } });
      fireEvent.change(secretKeyInput, { target: { value: 'secret123' } });
      fireEvent.change(regionInput, { target: { value: 'us-east-1' } });

      expect(accessKeyInput.value).toBe('AKIA123');
      expect(secretKeyInput.value).toBe('secret123');
      expect(regionInput.value).toBe('us-east-1');
    });

    it('should update PyThaiNLP endpoint on input', () => {
      const pythainlpSettings = { ...defaultSettings, engine: 'pythainlp' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={pythainlpSettings} />);

      const input = screen.getByPlaceholderText('http://localhost:8000/tts') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'http://192.168.1.1:8000/tts' } });

      expect(input.value).toBe('http://192.168.1.1:8000/tts');
    });
  });

  describe('Voice Controls', () => {
    it('should render voice controls section', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Voice Controls')).toBeInTheDocument();
    });

    it('should render rate slider with default value', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Speed (ความเร็ว)')).toBeInTheDocument();
      expect(screen.getByText('1.00x')).toBeInTheDocument();
    });

    it('should render pitch slider with default value', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Pitch (โทนเสียง)')).toBeInTheDocument();
      expect(screen.getByText('1.00')).toBeInTheDocument();
    });

    it('should render volume slider with default value', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Volume (ระดับเสียง)')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should update rate value when slider changed', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      const rateSlider = sliders[0] as HTMLInputElement;

      fireEvent.change(rateSlider, { target: { value: '1.5' } });

      expect(screen.getByText('1.50x')).toBeInTheDocument();
    });

    it('should update pitch value when slider changed', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      const pitchSlider = sliders[1] as HTMLInputElement;

      fireEvent.change(pitchSlider, { target: { value: '0.75' } });

      expect(screen.getByText('0.75')).toBeInTheDocument();
    });

    it('should update volume value when slider changed', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      const volumeSlider = sliders[2] as HTMLInputElement;

      fireEvent.change(volumeSlider, { target: { value: '0.5' } });

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should have correct slider min/max/step for rate', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      const rateSlider = sliders[0] as HTMLInputElement;

      expect(rateSlider.min).toBe('0.5');
      expect(rateSlider.max).toBe('2.0');
      expect(rateSlider.step).toBe('0.05');
    });

    it('should have correct slider min/max/step for pitch', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      const pitchSlider = sliders[1] as HTMLInputElement;

      expect(pitchSlider.min).toBe('0.5');
      expect(pitchSlider.max).toBe('2.0');
      expect(pitchSlider.step).toBe('0.05');
    });

    it('should have correct slider min/max/step for volume', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      const volumeSlider = sliders[2] as HTMLInputElement;

      expect(volumeSlider.min).toBe('0');
      expect(volumeSlider.max).toBe('1');
      expect(volumeSlider.step).toBe('0.05');
    });

    it('should display custom rate value correctly', () => {
      const customSettings = { ...defaultSettings, rate: 1.75 };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={customSettings} />);

      expect(screen.getByText('1.75x')).toBeInTheDocument();
    });

    it('should display custom pitch value correctly', () => {
      const customSettings = { ...defaultSettings, pitch: 0.8 };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={customSettings} />);

      expect(screen.getByText('0.80')).toBeInTheDocument();
    });

    it('should display custom volume value correctly', () => {
      const customSettings = { ...defaultSettings, volume: 0.65 };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={customSettings} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
    });
  });

  describe('Preview Section', () => {
    it('should render preview section', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('ทดสอบเสียง')).toBeInTheDocument();
    });

    it('should render preview textarea with default text', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const textarea = screen.getByPlaceholderText(
        'พิมพ์ข้อความเพื่อทดสอบเสียง...'
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe('สวัสดีครับ ผมเป็นระบบอ่านเรื่องอัตโนมัติ');
    });

    it('should update preview text on input', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const textarea = screen.getByPlaceholderText(
        'พิมพ์ข้อความเพื่อทดสอบเสียง...'
      ) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'ทดสอบเสียงใหม่' } });

      expect(textarea.value).toBe('ทดสอบเสียงใหม่');
    });

    it('should render preview button', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Preview เสียง')).toBeInTheDocument();
    });

    it('should call onPreview when preview button clicked', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const previewButton = screen.getByText('Preview เสียง');
      fireEvent.click(previewButton);

      expect(mockOnPreview).toHaveBeenCalledWith(
        'สวัสดีครับ ผมเป็นระบบอ่านเรื่องอัตโนมัติ',
        defaultSettings
      );
    });

    it('should call onPreview with custom text', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const textarea = screen.getByPlaceholderText('พิมพ์ข้อความเพื่อทดสอบเสียง...');
      fireEvent.change(textarea, { target: { value: 'ข้อความทดสอบ' } });

      const previewButton = screen.getByText('Preview เสียง');
      fireEvent.click(previewButton);

      expect(mockOnPreview).toHaveBeenCalledWith('ข้อความทดสอบ', defaultSettings);
    });

    it('should call onPreview with updated settings', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      // Change rate
      const sliders = document.querySelectorAll('input[type="range"]');
      fireEvent.change(sliders[0], { target: { value: '1.5' } });

      const previewButton = screen.getByText('Preview เสียง');
      fireEvent.click(previewButton);

      expect(mockOnPreview).toHaveBeenCalledWith(
        'สวัสดีครับ ผมเป็นระบบอ่านเรื่องอัตโนมัติ',
        expect.objectContaining({ rate: 1.5 })
      );
    });
  });

  describe('Footer Actions', () => {
    it('should render Cancel button', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render Save Settings button', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onSave and onClose when Save clicked', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(defaultSettings);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should save updated settings', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      // Change engine
      const googleButton = screen.getByText(/Google Cloud Text-to-Speech/).closest('button');
      if (googleButton) {
        fireEvent.click(googleButton);
      }

      // Change rate
      const sliders = document.querySelectorAll('input[type="range"]');
      fireEvent.change(sliders[0], { target: { value: '1.25' } });

      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          engine: 'google',
          rate: 1.25,
        })
      );
    });
  });

  describe('Settings Persistence', () => {
    it('should load currentSettings on mount', () => {
      const customSettings: TTSSettings = {
        engine: 'azure',
        rate: 1.3,
        pitch: 0.9,
        volume: 0.8,
        azureApiKey: 'test-key',
        azureRegion: 'eastasia',
      };

      render(<TTSSettingsModal {...propsWithOpen} currentSettings={customSettings} />);

      expect(screen.getByText('1.30x')).toBeInTheDocument();
      expect(screen.getByText('0.90')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should update settings when currentSettings prop changes', () => {
      const { rerender } = render(<TTSSettingsModal {...propsWithOpen} />);

      expect(screen.getByText('1.00x')).toBeInTheDocument();

      const newSettings = { ...defaultSettings, rate: 1.5 };
      rerender(<TTSSettingsModal {...propsWithOpen} currentSettings={newSettings} />);

      expect(screen.getByText('1.50x')).toBeInTheDocument();
    });

    it('should reset settings when modal reopened', () => {
      const { rerender } = render(<TTSSettingsModal {...propsWithOpen} />);

      // Change rate
      const sliders = document.querySelectorAll('input[type="range"]');
      fireEvent.change(sliders[0], { target: { value: '1.5' } });

      expect(screen.getByText('1.50x')).toBeInTheDocument();

      // Close modal
      rerender(<TTSSettingsModal {...propsWithOpen} isOpen={false} />);

      // Reopen modal with original settings
      rerender(<TTSSettingsModal {...propsWithOpen} isOpen={true} />);

      expect(screen.getByText('1.00x')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty API keys', () => {
      const googleSettings = { ...defaultSettings, engine: 'google' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={googleSettings} />);

      const input = screen.getByPlaceholderText('AIza...') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle extreme rate values', () => {
      const extremeSettings = { ...defaultSettings, rate: 2.0 };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={extremeSettings} />);

      expect(screen.getByText('2.00x')).toBeInTheDocument();
    });

    it('should handle minimum rate values', () => {
      const minSettings = { ...defaultSettings, rate: 0.5 };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={minSettings} />);

      expect(screen.getByText('0.50x')).toBeInTheDocument();
    });

    it('should handle zero volume', () => {
      const zeroVolumeSettings = { ...defaultSettings, volume: 0 };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={zeroVolumeSettings} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle empty preview text', () => {
      render(<TTSSettingsModal {...propsWithOpen} />);

      const textarea = screen.getByPlaceholderText('พิมพ์ข้อความเพื่อทดสอบเสียง...');
      fireEvent.change(textarea, { target: { value: '' } });

      const previewButton = screen.getByText('Preview เสียง');
      fireEvent.click(previewButton);

      expect(mockOnPreview).toHaveBeenCalledWith('', defaultSettings);
    });

    it('should handle all engines with full settings', () => {
      const fullSettings: TTSSettings = {
        engine: 'aws',
        rate: 1.2,
        pitch: 0.8,
        volume: 0.9,
        googleApiKey: 'google-key',
        azureApiKey: 'azure-key',
        azureRegion: 'eastasia',
        awsAccessKey: 'aws-access',
        awsSecretKey: 'aws-secret',
        awsRegion: 'us-west-2',
        pythainlpEndpoint: 'http://localhost:8000/tts',
        selectedVoice: 'th-TH-Standard-A',
      };

      render(<TTSSettingsModal {...propsWithOpen} currentSettings={fullSettings} />);

      expect(screen.getByText('1.20x')).toBeInTheDocument();
      expect(screen.getByText('0.80')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('should render Google Cloud link when Google selected', () => {
      const googleSettings = { ...defaultSettings, engine: 'google' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={googleSettings} />);

      const link = screen.getByText(/Get API Key from Google Cloud Console/).closest('a');
      expect(link).toHaveAttribute('href', 'https://cloud.google.com/text-to-speech');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should render Azure link when Azure selected', () => {
      const azureSettings = { ...defaultSettings, engine: 'azure' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={azureSettings} />);

      const link = screen.getByText(/Get API Key from Azure Portal/).closest('a');
      expect(link).toHaveAttribute(
        'href',
        'https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/'
      );
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should render AWS link when AWS selected', () => {
      const awsSettings = { ...defaultSettings, engine: 'aws' as TTSEngine };
      render(<TTSSettingsModal {...propsWithOpen} currentSettings={awsSettings} />);

      const link = screen.getByText(/Get API Key from AWS Console/).closest('a');
      expect(link).toHaveAttribute('href', 'https://aws.amazon.com/polly/');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});

