/**
 * Psychology Thai TTS Service
 * Integration with custom Thai TTS model featuring 6 psychology carita types
 */

export type CaritaType = 'tanha' | 'dosa' | 'moha' | 'saddha' | 'buddhi' | 'vitakka';

export interface PsychologyTTSOptions {
  text: string;
  carita: CaritaType;
  speakerId?: number;
  speed?: number;
  pitchScale?: number;
  energyScale?: number;
}

export interface TTSResponse {
  status: string;
  message: string;
  audioFormat: string;
  sampleRate: number;
  duration: number;
  carita: string;
}

export interface CaritaInfo {
  name: string;
  emotion: string;
  pitchModifier: number;
  speedModifier: number;
  energyModifier: number;
}

export const CARITA_TYPES: Record<CaritaType, CaritaInfo> = {
  tanha: {
    name: 'Taṇhācarita',
    emotion: 'greedy',
    pitchModifier: 1.15,
    speedModifier: 1.2,
    energyModifier: 1.3,
  },
  dosa: {
    name: 'Dosacarita',
    emotion: 'angry',
    pitchModifier: 0.85,
    speedModifier: 1.15,
    energyModifier: 1.4,
  },
  moha: {
    name: 'Mohācarita',
    emotion: 'confused',
    pitchModifier: 1.0,
    speedModifier: 0.75,
    energyModifier: 0.8,
  },
  saddha: {
    name: 'Saddhācarita',
    emotion: 'faithful',
    pitchModifier: 1.0,
    speedModifier: 1.0,
    energyModifier: 1.0,
  },
  buddhi: {
    name: 'Buddhicarita',
    emotion: 'intelligent',
    pitchModifier: 0.95,
    speedModifier: 0.9,
    energyModifier: 0.9,
  },
  vitakka: {
    name: 'Vitakkacarita',
    emotion: 'anxious',
    pitchModifier: 1.1,
    speedModifier: 1.1,
    energyModifier: 1.2,
  },
};

export class PsychologyTTSService {
  private baseURL: string;
  private isAvailable: boolean = false;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
    // Check health silently on initialization (don't spam console)
    this.checkHealth(true).catch(() => {
      // Silently fail - service is optional
      this.isAvailable = false;
    });
  }

  /**
   * Check if TTS server is available
   * @param silent - If true, suppresses error logging (for background checks)
   */
  async checkHealth(silent: boolean = false): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      
      if (!response.ok) {
        this.isAvailable = false;
        return false;
      }
      
      const data = await response.json();
      this.isAvailable = data.status === 'healthy' && data.model_loaded;
      
      if (!silent && this.isAvailable) {
        console.log('✅ TTS server available:', this.baseURL);
      }
      
      return this.isAvailable;
    } catch (error) {
      // Only log error if not in silent mode and not a connection refused error
      if (!silent && !(error instanceof TypeError && error.message.includes('fetch'))) {
        console.warn('TTS server not available:', error instanceof Error ? error.message : 'Unknown error');
      }
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Get available carita types
   */
  async getCaritas(): Promise<Record<string, CaritaInfo>> {
    try {
      const response = await fetch(`${this.baseURL}/caritas`);
      const data = await response.json();
      return data.caritas;
    } catch (error) {
      console.error('Failed to fetch caritas:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text
   */
  async synthesize(options: PsychologyTTSOptions): Promise<Blob> {
    if (!this.isAvailable) {
      await this.checkHealth();
      if (!this.isAvailable) {
        throw new Error('Psychology TTS server is not available');
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: options.text,
          carita: options.carita,
          speaker_id: options.speakerId ?? 0,
          speed: options.speed ?? 1.0,
          pitch_scale: options.pitchScale ?? 1.0,
          energy_scale: options.energyScale ?? 1.0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'TTS synthesis failed');
      }

      return await response.blob();
    } catch (error) {
      console.error('TTS synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Synthesize and play audio
   */
  async synthesizeAndPlay(options: PsychologyTTSOptions): Promise<void> {
    const audioBlob = await this.synthesize(options);
    const audioURL = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioURL);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioURL);
        resolve();
      };
      audio.onerror = error => {
        URL.revokeObjectURL(audioURL);
        reject(error);
      };
      audio.play();
    });
  }

  /**
   * Download audio as WAV file
   */
  async downloadAudio(options: PsychologyTTSOptions, filename?: string): Promise<void> {
    const audioBlob = await this.synthesize(options);
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `tts_${options.carita}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get carita information
   */
  getCaritaInfo(carita: CaritaType): CaritaInfo {
    return CARITA_TYPES[carita];
  }

  /**
   * Validate carita type
   */
  isValidCarita(carita: string): carita is CaritaType {
    return carita in CARITA_TYPES;
  }
}

// Export singleton instance
export const psychologyTTS = new PsychologyTTSService();
