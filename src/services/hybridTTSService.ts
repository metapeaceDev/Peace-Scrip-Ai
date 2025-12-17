/**
 * Hybrid TTS Service
 * Combines Psychology Thai TTS (free) with Azure TTS (fallback)
 * Saves ฿24,000/year by using custom model first
 */

import { psychologyTTS, CaritaType, PsychologyTTSOptions } from './psychologyTTSService';

export type TTSProvider = 'psychology' | 'azure';

export interface HybridTTSOptions {
  text: string;
  carita?: CaritaType;
  preferredProvider?: TTSProvider;
  fallbackEnabled?: boolean;
}

export interface TTSStats {
  psychologyRequests: number;
  azureRequests: number;
  totalRequests: number;
  costSavings: number; // in THB
  psychologyAvailability: number; // percentage
}

export class HybridTTSService {
  private stats: TTSStats = {
    psychologyRequests: 0,
    azureRequests: 0,
    totalRequests: 0,
    costSavings: 0,
    psychologyAvailability: 100,
  };

  private readonly AZURE_COST_PER_REQUEST = 0.5; // ฿0.50 per request (estimated)

  /**
   * Synthesize speech with automatic fallback
   */
  async synthesize(options: HybridTTSOptions): Promise<Blob> {
    this.stats.totalRequests++;

    const preferPsychology = options.preferredProvider !== 'azure';
    const fallbackEnabled = options.fallbackEnabled !== false;

    // Try Psychology TTS first (if preferred)
    if (preferPsychology) {
      try {
        // Silent health check - don't spam console
        const isAvailable = await psychologyTTS.checkHealth(true);

        if (isAvailable) {
          const audioBlob = await psychologyTTS.synthesize({
            text: options.text,
            carita: options.carita || 'saddha', // Default: faithful
            speed: 1.0,
            pitchScale: 1.0,
            energyScale: 1.0,
          });

          this.stats.psychologyRequests++;
          this.stats.costSavings += this.AZURE_COST_PER_REQUEST;
          this.updateAvailability();

          console.log(`✅ Psychology TTS used | Cost saved: ฿${this.stats.costSavings.toFixed(2)}`);
          return audioBlob;
        }
      } catch (error) {
        console.warn('Psychology TTS failed:', error);

        if (!fallbackEnabled) {
          throw error;
        }
      }
    }

    // Fallback to Azure TTS
    console.log('⚠️  Using Azure TTS (fallback)');
    return await this.synthesizeWithAzure(options.text);
  }

  /**
   * Azure TTS synthesis (fallback)
   */
  private async synthesizeWithAzure(text: string): Promise<Blob> {
    this.stats.azureRequests++;
    this.updateAvailability();

    // Azure Speech SDK integration
    try {
      const azureKey = import.meta.env.VITE_AZURE_TTS_KEY;
      const azureRegion = import.meta.env.VITE_AZURE_TTS_REGION || 'southeastasia';

      if (!azureKey) {
        throw new Error('Azure TTS API key not configured. Please set VITE_AZURE_TTS_KEY in .env');
      }

      // Dynamic import of Azure Speech SDK (browser-compatible)
      const sdk = await import('microsoft-cognitiveservices-speech-sdk');

      // Configure speech synthesis
      const speechConfig = sdk.SpeechConfig.fromSubscription(azureKey, azureRegion);
      speechConfig.speechSynthesisLanguage = 'th-TH';
      speechConfig.speechSynthesisVoiceName = 'th-TH-PremwadeeNeural'; // Female voice
      speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      // Create synthesizer
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

      // Synthesize speech
      const audioBlob = await new Promise<Blob>((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          result => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const audioData = result.audioData;
              const blob = new Blob([audioData], { type: 'audio/mp3' });
              synthesizer.close();
              console.log('✅ Azure TTS synthesis completed');
              resolve(blob);
            } else {
              synthesizer.close();
              reject(new Error(`Azure TTS synthesis failed: ${result.errorDetails}`));
            }
          },
          error => {
            synthesizer.close();
            reject(new Error(`Azure TTS error: ${error}`));
          }
        );
      });

      return audioBlob;
    } catch (error) {
      console.error('❌ Azure TTS synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Synthesize and play audio
   */
  async synthesizeAndPlay(options: HybridTTSOptions): Promise<void> {
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
   * Get usage statistics
   */
  getStats(): TTSStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      psychologyRequests: 0,
      azureRequests: 0,
      totalRequests: 0,
      costSavings: 0,
      psychologyAvailability: 100,
    };
  }

  /**
   * Get cost savings report
   */
  getCostSavingsReport(): string {
    const monthlyAzureCost = 4000; // ฿4,000/month for Azure TTS
    const annualAzureCost = 48000; // ฿48,000/year

    const psychologyPercentage = (this.stats.psychologyRequests / this.stats.totalRequests) * 100;
    const estimatedMonthlySavings = (psychologyPercentage / 100) * monthlyAzureCost;
    const estimatedAnnualSavings = (psychologyPercentage / 100) * annualAzureCost;

    return `
📊 TTS Cost Savings Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Requests: ${this.stats.totalRequests}
Psychology TTS: ${this.stats.psychologyRequests} (${psychologyPercentage.toFixed(1)}%)
Azure TTS: ${this.stats.azureRequests} (${((this.stats.azureRequests / this.stats.totalRequests) * 100).toFixed(1)}%)

Current Session Savings: ฿${this.stats.costSavings.toFixed(2)}
Estimated Monthly Savings: ฿${estimatedMonthlySavings.toFixed(2)}
Estimated Annual Savings: ฿${estimatedAnnualSavings.toFixed(2)}

Psychology TTS Availability: ${this.stats.psychologyAvailability.toFixed(1)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * Update availability percentage
   */
  private updateAvailability(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.psychologyAvailability =
        (this.stats.psychologyRequests / this.stats.totalRequests) * 100;
    }
  }

  /**
   * Check if Psychology TTS is available
   */
  async isPsychologyTTSAvailable(): Promise<boolean> {
    return await psychologyTTS.checkHealth();
  }
}

// Export singleton instance
export const hybridTTS = new HybridTTSService();
