/**
 * TTS Service Tests
 * Tests for unified Text-to-Speech with multiple engines
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTSService, ttsService } from '../ttsService';
import type { TTSSettings } from '../../components/TTSSettingsModal';

// Mock global objects
const mockSpeechSynthesis = {
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  speak: vi.fn(),
  speaking: false,
  paused: false,
  getVoices: vi.fn(() => [
    { name: 'Kanya', lang: 'th-TH', default: false, localService: true, voiceURI: 'Kanya' },
    { name: 'Google Thai', lang: 'th-TH', default: false, localService: false, voiceURI: 'Google Thai' },
    { name: 'Alex', lang: 'en-US', default: true, localService: true, voiceURI: 'Alex' },
  ]),
};

const mockUtterance = {
  text: '',
  lang: '',
  voice: null as any,
  volume: 1,
  rate: 1,
  pitch: 1,
  onend: null as any,
  onerror: null as any,
};

global.SpeechSynthesisUtterance = vi.fn((text: string) => {
  const utterance = { ...mockUtterance, text };
  return utterance as any;
}) as any;

Object.defineProperty(global.window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock Audio
const mockAudio = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onended: null as any,
  onerror: null as any,
  volume: 1,
};

global.Audio = vi.fn(() => mockAudio) as any;

// Mock URL
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
} as any;

describe('TTSService', () => {
  let service: TTSService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = TTSService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = TTSService.getInstance();
      const instance2 = TTSService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(ttsService).toBeDefined();
      expect(ttsService).toBe(TTSService.getInstance());
    });
  });

  describe('browser TTS', () => {
    const browserSettings: TTSSettings = {
      engine: 'browser',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    };

    it('should speak using browser TTS', async () => {
      const text = 'สวัสดีครับ';

      const speakPromise = service.speak(text, browserSettings);

      // Simulate speech end
      const utterance = (global.SpeechSynthesisUtterance as any).mock.results[0].value;
      if (utterance.onend) utterance.onend();

      await speakPromise;

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should select Thai voice', async () => {
      const text = 'ทดสอบ';

      const speakPromise = service.speak(text, browserSettings);

      const utterance = (global.SpeechSynthesisUtterance as any).mock.results[0].value;
      if (utterance.onend) utterance.onend();

      await speakPromise;

      expect(utterance.voice?.name).toBe('Kanya');
      expect(utterance.lang).toBe('th-TH');
    });

    it('should apply voice settings', async () => {
      const customSettings: TTSSettings = {
        engine: 'browser',
        rate: 1.5,
        pitch: 0.8,
        volume: 0.7,
      };

      const speakPromise = service.speak('test', customSettings);

      const utterance = (global.SpeechSynthesisUtterance as any).mock.results[0].value;
      expect(utterance.rate).toBe(1.5);
      expect(utterance.pitch).toBe(0.8);
      expect(utterance.volume).toBe(0.7);

      if (utterance.onend) utterance.onend();
      await speakPromise;
    });

    it('should handle speech errors', async () => {
      const speakPromise = service.speak('test', browserSettings);

      const utterance = (global.SpeechSynthesisUtterance as any).mock.results[0].value;
      if (utterance.onerror) {
        utterance.onerror({ error: 'synthesis-failed' });
      }

      await expect(speakPromise).rejects.toThrow('Speech synthesis error');
    });

    it('should cancel previous speech before new one', async () => {
      const speakPromise = service.speak('test', browserSettings);

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();

      const utterance = (global.SpeechSynthesisUtterance as any).mock.results[0].value;
      if (utterance.onend) utterance.onend();
      await speakPromise;
    });
  });

  describe('stop, pause, resume', () => {
    it('should stop speech', () => {
      service.stop();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should pause speech when speaking', () => {
      mockSpeechSynthesis.speaking = true;
      service.pause();
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });

    it('should not pause when not speaking', () => {
      mockSpeechSynthesis.speaking = false;
      service.pause();
      expect(mockSpeechSynthesis.pause).not.toHaveBeenCalled();
    });

    it('should resume speech when paused', () => {
      mockSpeechSynthesis.paused = true;
      service.resume();
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });

    it('should not resume when not paused', () => {
      mockSpeechSynthesis.paused = false;
      service.resume();
      expect(mockSpeechSynthesis.resume).not.toHaveBeenCalled();
    });
  });

  describe('Google Cloud TTS', () => {
    const googleSettings: TTSSettings = {
      engine: 'google',
      googleApiKey: 'test-api-key',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    };

    it('should require API key', async () => {
      const settingsWithoutKey: TTSSettings = {
        engine: 'google',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      };

      await expect(service.speak('test', settingsWithoutKey))
        .rejects.toThrow('Google API Key is required');
    });

    it('should synthesize speech successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          audioContent: 'base64-encoded-audio-data',
        }),
      });

      // Trigger audio end automatically
      mockAudio.play.mockImplementation(() => {
        setTimeout(() => {
          if (mockAudio.onended) mockAudio.onended();
        }, 0);
        return Promise.resolve();
      });

      await service.speak('สวัสดีครับ', googleSettings);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('texttospeech.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should split long text into chunks', async () => {
      const longText = 'a'.repeat(5000);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ audioContent: 'audio-data' }),
      });

      // Auto-trigger audio end
      let callCount = 0;
      mockAudio.play.mockImplementation(() => {
        setTimeout(() => {
          if (mockAudio.onended) mockAudio.onended();
        }, 0);
        callCount++;
        return Promise.resolve();
      });

      await service.speak(longText, googleSettings);

      expect(global.fetch).toHaveBeenCalled();
      expect(callCount).toBeGreaterThan(1); // Multiple chunks
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          error: { message: 'Invalid API key' },
        }),
      });

      await expect(service.speak('test', googleSettings))
        .rejects.toThrow('Google TTS API error');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(service.speak('test', googleSettings))
        .rejects.toThrow();
    });

    it('should provide helpful error for invalid API key', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API key not valid'));

      await expect(service.speak('test', googleSettings))
        .rejects.toThrow('Invalid Google Cloud API Key');
    });

    it('should provide helpful error for quota exceeded', async () => {
      (global.fetch as any).mockRejectedValue(new Error('quota exceeded'));

      await expect(service.speak('test', googleSettings))
        .rejects.toThrow('Google Cloud TTS quota exceeded');
    });

    it('should apply voice settings correctly', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ audioContent: 'audio-data' }),
      });

      const customSettings: TTSSettings = {
        engine: 'google',
        googleApiKey: 'test-key',
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
      };

      // Auto-trigger audio end
      mockAudio.play.mockImplementation(() => {
        setTimeout(() => {
          if (mockAudio.onended) mockAudio.onended();
        }, 0);
        return Promise.resolve();
      });

      await service.speak('test', customSettings);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.audioConfig.speakingRate).toBe(1.5);
      expect(body.audioConfig.pitch).toBeCloseTo(4, 1); // (1.2 - 1) * 20
    });
  });

  describe('Azure TTS', () => {
    const azureSettings: TTSSettings = {
      engine: 'azure',
      azureApiKey: 'test-key',
      azureRegion: 'southeastasia',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    };

    it('should require API key and region', async () => {
      const settingsWithoutKey: TTSSettings = {
        engine: 'azure',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      };

      await expect(service.speak('test', settingsWithoutKey))
        .rejects.toThrow('Azure API Key and Region are required');
    });

    it('should synthesize speech successfully', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mp3' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const speakPromise = service.speak('สวัสดีครับ', azureSettings);
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockAudio.onended) mockAudio.onended();

      await speakPromise;

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('southeastasia.tts.speech.microsoft.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': 'test-key',
            'Content-Type': 'application/ssml+xml',
          }),
        })
      );
    });

    it('should use SSML format', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mp3' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const speakPromise = service.speak('test', azureSettings);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockAudio.onended) mockAudio.onended();
      await speakPromise;

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = fetchCall[1].body;
      
      expect(body).toContain('<speak version=\'1.0\'');
      expect(body).toContain('th-TH-PremwadeeNeural');
      expect(body).toContain('<prosody');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      });

      await expect(service.speak('test', azureSettings))
        .rejects.toThrow('Azure TTS API error');
    });

    it('should handle audio playback errors', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mp3' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      mockAudio.play.mockRejectedValue(new Error('Playback failed'));

      await expect(service.speak('test', azureSettings))
        .rejects.toThrow();
    });

    it('should cleanup blob URL', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/mp3' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const speakPromise = service.speak('test', azureSettings);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockAudio.onended) mockAudio.onended();
      await speakPromise;

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('AWS Polly', () => {
    const awsSettings: TTSSettings = {
      engine: 'aws',
      awsAccessKey: 'test-access-key',
      awsSecretKey: 'test-secret-key',
      awsRegion: 'ap-southeast-1',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    };

    it('should require AWS credentials', async () => {
      const settingsWithoutCreds: TTSSettings = {
        engine: 'aws',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      };

      await expect(service.speak('test', settingsWithoutCreds))
        .rejects.toThrow('AWS credentials and region are required');
    });

    it('should throw security warning', async () => {
      await expect(service.speak('test', awsSettings))
        .rejects.toThrow('AWS Polly integration requires backend implementation');
    });
  });

  describe('PyThaiNLP TTS', () => {
    const pythainlpSettings: TTSSettings = {
      engine: 'pythainlp',
      pythainlpEndpoint: 'http://localhost:8080/tts',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    };

    it('should require endpoint', async () => {
      const settingsWithoutEndpoint: TTSSettings = {
        engine: 'pythainlp',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      };

      await expect(service.speak('test', settingsWithoutEndpoint))
        .rejects.toThrow('PyThaiNLP endpoint is required');
    });

    it('should synthesize speech successfully', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
        headers: new Map([['content-type', 'audio/wav']]),
      });

      const speakPromise = service.speak('สวัสดีครับ', pythainlpSettings);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockAudio.onended) mockAudio.onended();

      await speakPromise;

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/tts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should add http protocol if missing', async () => {
      const settingsWithoutProtocol: TTSSettings = {
        ...pythainlpSettings,
        pythainlpEndpoint: 'localhost:8080/tts',
      };

      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
        headers: new Map([['content-type', 'audio/wav']]),
      });

      const speakPromise = service.speak('test', settingsWithoutProtocol);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockAudio.onended) mockAudio.onended();
      await speakPromise;

      expect((global.fetch as any).mock.calls[0][0]).toMatch(/^http:/);
    });

    it('should handle connection errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Failed to fetch'));

      await expect(service.speak('test', pythainlpSettings))
        .rejects.toThrow('Cannot connect to PyThaiNLP server');
    });

    it('should handle empty audio response', async () => {
      const emptyBlob = new Blob([], { type: 'audio/wav' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => emptyBlob,
        headers: new Map([['content-type', 'audio/wav']]),
      });

      await expect(service.speak('test', pythainlpSettings))
        .rejects.toThrow('PyThaiNLP returned empty audio');
    });

    it('should split long text into chunks', async () => {
      const longText = 'a'.repeat(3500);
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
        headers: new Map([['content-type', 'audio/wav']]),
      });

      // Auto-trigger audio end for multiple chunks
      let callCount = 0;
      mockAudio.play.mockImplementation(() => {
        setTimeout(() => {
          if (mockAudio.onended) mockAudio.onended();
        }, 0);
        callCount++;
        return Promise.resolve();
      });

      await service.speak(longText, pythainlpSettings);

      expect(global.fetch).toHaveBeenCalled();
      expect(callCount).toBeGreaterThan(1); // Multiple chunks
    });
  });

  describe('unknown engine', () => {
    it('should throw error for unknown engine', async () => {
      const invalidSettings: any = {
        engine: 'invalid-engine',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      };

      await expect(service.speak('test', invalidSettings))
        .rejects.toThrow('Unknown TTS engine');
    });
  });
});
