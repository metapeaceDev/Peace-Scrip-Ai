/**
 * Voice Cloning Service
 * Client for interacting with Voice Cloning Backend API
 */

import type {
  VoiceUploadResponse,
  VoiceListResponse,
  VoiceDeleteResponse,
  ModelInfo,
  HealthCheckResponse,
  CleanupResponse,
  VoiceSynthesisRequest,
} from '../types/voice-cloning';

export class VoiceCloningService {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL =
      baseURL || import.meta.env.VITE_VOICE_CLONING_ENDPOINT || 'http://localhost:8001';
  }

  /**
   * Check if voice cloning server is available
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    const response = await fetch(`${this.baseURL}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<ModelInfo> {
    const response = await fetch(`${this.baseURL}/model/info`);

    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload voice sample for cloning
   */
  async uploadVoiceSample(file: File, voiceName?: string): Promise<VoiceUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (voiceName) {
      formData.append('voice_name', voiceName);
    }

    const response = await fetch(`${this.baseURL}/voice/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * List all uploaded voices
   */
  async listVoices(): Promise<VoiceListResponse> {
    const response = await fetch(`${this.baseURL}/voice/list`);

    if (!response.ok) {
      throw new Error(`Failed to list voices: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a voice sample
   */
  async deleteVoice(voiceId: string): Promise<VoiceDeleteResponse> {
    const response = await fetch(`${this.baseURL}/voice/delete/${voiceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Delete failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Synthesize speech with cloned voice
   */
  async synthesizeSpeech(request: VoiceSynthesisRequest): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        voice_id: request.voice_id,
        language: request.language || 'th',
        speed: request.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Synthesis failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Synthesize and play audio
   */
  async synthesizeAndPlay(request: VoiceSynthesisRequest): Promise<void> {
    const audioBlob = await this.synthesizeSpeech(request);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onerror = _e => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }

  /**
   * Get voice sample audio file URL
   */
  getVoiceSampleUrl(voiceId: string): string {
    return `${this.baseURL}/voice/sample/${voiceId}`;
  }

  /**
   * Get voice details
   */
  async getVoiceDetails(voiceId: string): Promise<any> {
    const listResponse = await this.listVoices();
    return listResponse.voices.find(v => v.voice_id === voiceId);
  }

  /**
   * Cleanup old generated files
   */
  async cleanup(maxAgeHours: number = 24): Promise<CleanupResponse> {
    const response = await fetch(`${this.baseURL}/cleanup?max_age_hours=${maxAgeHours}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Cleanup failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Download generated audio
   */
  async downloadAudio(request: VoiceSynthesisRequest, filename?: string): Promise<void> {
    const audioBlob = await this.synthesizeSpeech(request);
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `voice_cloned_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Validate audio file
   */
  validateAudioFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/flac',
      'audio/ogg',
      'audio/m4a',
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|flac|ogg|m4a)$/i)) {
      return { valid: false, error: 'Invalid file type. Allowed: WAV, MP3, FLAC, OGG, M4A' };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  }
}

// Export singleton instance
export const voiceCloningService = new VoiceCloningService();

