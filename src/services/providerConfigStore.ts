/**
 * Provider Configuration Store
 * Manages AI provider mode selection and preferences
 */

export type ProviderMode = 'cloud' | 'open-source' | 'hybrid';
export type ModelPreference = 'speed' | 'balanced' | 'quality' | 'best';

export interface ProviderConfig {
  mode: ProviderMode;
  modelPreference: ModelPreference;
  availableVRAM: number;
  autoFallback: boolean; // For hybrid mode
}

const STORAGE_KEY = 'peace-script-provider-config';

const DEFAULT_CONFIG: ProviderConfig = {
  mode: 'hybrid',
  modelPreference: 'balanced',
  availableVRAM: 16, // GB
  autoFallback: true,
};

/**
 * Get provider configuration from localStorage
 */
export function getProviderConfig(): ProviderConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading provider config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save provider configuration to localStorage
 */
export function saveProviderConfig(config: ProviderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving provider config:', error);
  }
}

/**
 * Update provider mode
 */
export function setProviderMode(mode: ProviderMode): void {
  const config = getProviderConfig();
  saveProviderConfig({ ...config, mode });
}

/**
 * Update model preference
 */
export function setModelPreference(preference: ModelPreference): void {
  const config = getProviderConfig();
  saveProviderConfig({ ...config, modelPreference: preference });
}

/**
 * Update available VRAM
 */
export function setAvailableVRAM(vram: number): void {
  const config = getProviderConfig();
  saveProviderConfig({ ...config, availableVRAM: vram });
}

/**
 * Check if using open source (for cost tracking)
 */
export function isUsingOpenSource(): boolean {
  const config = getProviderConfig();
  return config.mode === 'open-source' || config.mode === 'hybrid';
}

/**
 * Check if using cloud (for API key requirements)
 */
export function isUsingCloud(): boolean {
  const config = getProviderConfig();
  return config.mode === 'cloud' || config.mode === 'hybrid';
}

