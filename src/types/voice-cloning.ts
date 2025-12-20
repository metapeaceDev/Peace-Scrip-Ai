// Voice Cloning TypeScript Types

export interface VoiceProfile {
  voice_id: string;
  voice_name: string;
  filename: string;
  duration: number;
  sample_rate: number;
  file_size: number;
  created_at: string;
  recommendation?: 'optimal' | 'acceptable' | 'too_short';
}

export interface VoiceUploadResponse {
  success: boolean;
  voice_id: string;
  voice_name: string;
  sample_path: string;
  duration: number;
  sample_rate: number;
  file_size: number;
  recommendation: 'optimal' | 'acceptable' | 'too_short';
}

export interface VoiceListResponse {
  success: boolean;
  count: number;
  voices: VoiceProfile[];
}

export interface VoiceSynthesisRequest {
  text: string;
  voice_id: string;
  language?: string;
  speed?: number;
}

export interface VoiceDeleteResponse {
  success: boolean;
  message: string;
}

export interface ModelInfo {
  success: boolean;
  model_name: string;
  model_type: string;
  languages: string[];
  features: string[];
  device: string;
  loaded: boolean;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  model: string;
  model_status: 'loaded' | 'not_loaded';
  device: string;
  cuda_available: boolean;
}

export interface CleanupResponse {
  success: boolean;
  deleted_files: number;
  freed_space_mb: number;
  max_age_hours: number;
}

