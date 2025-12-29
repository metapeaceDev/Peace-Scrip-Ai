/**
 * LoRA Model Auto-Installer Service
 * Automatically detects, downloads, and installs required LoRA models
 */

export interface LoRAModel {
  name: string;
  filename: string;
  displayName: string;
  description: string;
  downloadUrl: string;
  size: string; // e.g., "150 MB"
  required: boolean;
  category: 'character' | 'style' | 'general';
}

export interface LoRAStatus {
  installed: boolean;
  available: boolean;
  error?: string;
}

export interface InstallProgress {
  modelName: string;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'installing' | 'completed' | 'error';
  message: string;
  error?: string;
}

const COMFYUI_API_URL = import.meta.env.VITE_COMFYUI_API_URL || 'http://localhost:8188';

/**
 * Required LoRA Models for Peace Script AI
 */
export const REQUIRED_LORA_MODELS: LoRAModel[] = [
  {
    name: 'CHARACTER_CONSISTENCY',
    // Keep in sync with src/services/geminiService.ts (SDXL_LORA_MODELS)
    filename: 'add-detail-xl.safetensors',
    displayName: 'Character Consistency LoRA',
    description: 'Essential for Face ID matching and character consistency across scenes',
    // Optional: set to a real direct-download URL if you want auto-install.
    downloadUrl: '',
    size: '45 MB',
    required: true,
    category: 'character',
  },
  {
    name: 'CINEMATIC_STYLE',
    filename: 'cinematic_film_v2.safetensors',
    displayName: 'Cinematic Film Style',
    description: 'Professional cinematic lighting and composition',
    downloadUrl: 'https://civitai.com/api/download/models/234567',
    size: '180 MB',
    required: false,
    category: 'style',
  },
  {
    name: 'THAI_STYLE',
    filename: 'thai_movie_style.safetensors',
    displayName: 'Thai Movie Style',
    description: 'Thai cinema aesthetics and cultural elements',
    downloadUrl: 'https://civitai.com/api/download/models/345678',
    size: '165 MB',
    required: false,
    category: 'style',
  },
  {
    name: 'FLUX_LORA',
    filename: '241007_MICKMUMPITZ_FLUX+LORA.safetensors',
    displayName: 'Flux Enhancement LoRA',
    description: 'General quality and detail enhancement',
    downloadUrl: 'https://civitai.com/api/download/models/456789',
    size: '200 MB',
    required: false,
    category: 'general',
  },
];

/**
 * Check which LoRA models are installed in ComfyUI
 */
export async function checkLoRAModels(): Promise<Record<string, LoRAStatus>> {
  try {
    console.log('🔍 Checking installed LoRA models...');

    // Query ComfyUI for available models (silent error)
    const response = await fetch(`${COMFYUI_API_URL}/object_info/LoraLoader`, {
      signal: AbortSignal.timeout(3000),
    }).catch((): null => null);

    if (!response?.ok) {
      throw new Error('Failed to query ComfyUI LoRA list');
    }

    const data = await response.json();
    const availableLoras = data?.LoraLoader?.input?.required?.lora_name?.[0] || [];

    console.log('📋 Available LoRAs in ComfyUI:', availableLoras.length);

    const status: Record<string, LoRAStatus> = {};

    for (const model of REQUIRED_LORA_MODELS) {
      const installed = availableLoras.includes(model.filename);
      status[model.name] = {
        installed,
        available: true,
      };

      if (installed) {
        console.log(`✅ ${model.displayName}: Installed`);
      } else {
        console.log(`❌ ${model.displayName}: Not installed`);
      }
    }

    return status;
  } catch (error: any) {
    console.error('❌ Failed to check LoRA models:', error);

    // Return error status for all models
    const status: Record<string, LoRAStatus> = {};
    for (const model of REQUIRED_LORA_MODELS) {
      status[model.name] = {
        installed: false,
        available: false,
        error: error.message,
      };
    }
    return status;
  }
}

/**
 * Download LoRA model via ComfyUI Manager API (if available)
 */
export async function downloadLoRAModel(
  model: LoRAModel,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    console.log(`⬇️ Downloading ${model.displayName}...`);

    // Method 1: Try using ComfyUI Manager's download API
    try {
      const managerResponse = await fetch(`${COMFYUI_API_URL}/manager/download_lora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: model.downloadUrl,
          filename: model.filename,
        }),
      });

      if (managerResponse.ok) {
        console.log(`✅ ${model.displayName} downloaded via ComfyUI Manager`);
        return;
      }
    } catch (managerError) {
      console.log('ComfyUI Manager not available, trying direct download...');
    }

    // Method 2: Direct download via browser (with CORS limitations)
    const response = await fetch(model.downloadUrl);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const contentLength = parseInt(response.headers.get('Content-Length') || '0');

    if (!reader) {
      throw new Error('Unable to read download stream');
    }

    let receivedLength = 0;
    const chunks: BlobPart[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (contentLength > 0 && onProgress) {
        const progress = (receivedLength / contentLength) * 100;
        onProgress(progress);
      }
    }

    // Combine chunks
    const blob = new Blob(chunks);

    // Save to ComfyUI via upload endpoint
    const formData = new FormData();
    formData.append('file', blob, model.filename);
    formData.append('subfolder', 'loras');

    const uploadResponse = await fetch(`${COMFYUI_API_URL}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload LoRA to ComfyUI');
    }

    console.log(`✅ ${model.displayName} installed successfully`);
  } catch (error: any) {
    console.error(`❌ Failed to download ${model.displayName}:`, error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Get manual installation instructions for a LoRA model
 */
export function getManualInstallInstructions(model: LoRAModel): {
  steps: string[];
  loraFolder: string;
} {
  const isWindows = navigator.userAgent.toLowerCase().includes('win');
  const isMac = navigator.userAgent.toLowerCase().includes('mac');

  let loraFolder = 'ComfyUI/models/loras/';

  if (isWindows) {
    // This project uses a Docker-mounted ComfyUI models folder under the current Windows user profile.
    loraFolder = 'C:\\Users\\USER\\ComfyUI\\models\\loras\\';
  } else if (isMac) {
    loraFolder = '~/ComfyUI/models/loras/';
  }

  return {
    loraFolder,
    steps: [
      `1. Download ${model.displayName} from:`,
      `   ${model.downloadUrl}`,
      '',
      `2. Save the file as: ${model.filename}`,
      '',
      `3. Move the file to ComfyUI's LoRA folder:`,
      `   ${loraFolder}`,
      '',
      "4. Restart ComfyUI if it's already running",
      '',
      '5. Return to Peace Script AI and click "Check Again"',
    ],
  };
}

/**
 * Check if all required LoRA models are installed
 */
export async function checkAllRequiredModels(): Promise<{
  allInstalled: boolean;
  missing: LoRAModel[];
  installed: LoRAModel[];
}> {
  const status = await checkLoRAModels();

  const missing: LoRAModel[] = [];
  const installed: LoRAModel[] = [];

  for (const model of REQUIRED_LORA_MODELS) {
    if (model.required) {
      if (status[model.name]?.installed) {
        installed.push(model);
      } else {
        missing.push(model);
      }
    }
  }

  return {
    allInstalled: missing.length === 0,
    missing,
    installed,
  };
}

/**
 * Batch install all required LoRA models
 */
export async function* installAllRequiredModels(): AsyncGenerator<InstallProgress> {
  const { missing } = await checkAllRequiredModels();

  for (const model of missing) {
    yield {
      modelName: model.displayName,
      progress: 0,
      status: 'pending',
      message: `Preparing to download ${model.displayName}...`,
    };

    try {
      yield {
        modelName: model.displayName,
        progress: 0,
        status: 'downloading',
        message: `Downloading ${model.displayName} (${model.size})...`,
      };

      await downloadLoRAModel(model, _progress => {
        // Progress callback handled by individual downloads
      });

      yield {
        modelName: model.displayName,
        progress: 100,
        status: 'completed',
        message: `${model.displayName} installed successfully!`,
      };
    } catch (error: any) {
      yield {
        modelName: model.displayName,
        progress: 0,
        status: 'error',
        message: `Failed to install ${model.displayName}`,
        error: error.message,
      };
    }
  }
}

/**
 * Save user preference for auto-install LoRA
 */
export function setAutoInstallLoRA(enabled: boolean): void {
  localStorage.setItem('peace_auto_install_lora', enabled ? 'true' : 'false');
}

/**
 * Get user preference for auto-install LoRA
 */
export function getAutoInstallLoRA(): boolean {
  return localStorage.getItem('peace_auto_install_lora') !== 'false'; // Default: true
}

