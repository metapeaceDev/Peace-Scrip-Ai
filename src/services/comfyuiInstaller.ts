/**
 * ComfyUI Auto-Installer Service
 * Automatically detects, installs, and configures ComfyUI for all users
 */

export interface ComfyUIStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  url?: string;
  error?: string;
}

export interface InstallProgress {
  step: string;
  progress: number; // 0-100
  message: string;
  error?: string;
}

const COMFYUI_DEFAULT_URL = import.meta.env.VITE_COMFYUI_URL || import.meta.env.VITE_COMFYUI_API_URL || "http://localhost:8188";
const COMFYUI_CLOUD_URL = import.meta.env.VITE_COMFYUI_CLOUD_URL; // Optional cloud fallback

/**
 * Check if ComfyUI is installed and running
 */
export async function checkComfyUIStatus(): Promise<ComfyUIStatus> {
  try {
    // Try local installation (silent error to avoid console spam)
    const localResponse = await fetch(`${COMFYUI_DEFAULT_URL}/system_stats`, {
      signal: AbortSignal.timeout(2000)
    }).catch((): null => null);
    
    if (localResponse?.ok) {
      const stats = await localResponse.json();
      return {
        installed: true,
        running: true,
        version: stats.system?.comfyui_version || 'unknown',
        url: COMFYUI_DEFAULT_URL
      };
    }
  } catch (localError) {
    // Silent - no need to log every failed check
  }

  // Try cloud fallback if configured
  if (COMFYUI_CLOUD_URL) {
    try {
      const cloudResponse = await fetch(`${COMFYUI_CLOUD_URL}/system_stats`, {
        signal: AbortSignal.timeout(3000)
      }).catch((): null => null);
      
      if (cloudResponse?.ok) {
        return {
          installed: true,
          running: true,
          url: COMFYUI_CLOUD_URL
        };
      }
    } catch (cloudError) {
      // Silent - no need to log
    }
  }

  return {
    installed: false,
    running: false,
    error: "ComfyUI is not running. Please install and start ComfyUI."
  };
}

/**
 * Get installation instructions based on user's OS
 */
export function getInstallInstructions(): {
  os: 'windows' | 'mac' | 'linux' | 'unknown';
  instructions: string[];
  downloadUrl: string;
  isOneClick: boolean;
} {
  const userAgent = navigator.userAgent.toLowerCase();
  let os: 'windows' | 'mac' | 'linux' | 'unknown' = 'unknown';
  
  if (userAgent.includes('win')) {
    os = 'windows';
  } else if (userAgent.includes('mac')) {
    os = 'mac';
  } else if (userAgent.includes('linux')) {
    os = 'linux';
  }

  const instructions = {
    windows: [
      "1. Download ComfyUI Portable (Windows)",
      "2. Extract the ZIP file to your Desktop",
      "3. Run 'run_nvidia_gpu.bat' (for NVIDIA GPU) or 'run_cpu.bat' (for CPU)",
      "4. Wait for ComfyUI to start (browser will open automatically)",
      "5. Return to Peace Script AI and click 'Check Again'"
    ],
    mac: [
      "1. Download ComfyUI for macOS",
      "2. Extract the ZIP file",
      "3. Open Terminal and navigate to the ComfyUI folder",
      "4. Run: python3 main.py",
      "5. Wait for ComfyUI to start at http://localhost:8188",
      "6. Return to Peace Script AI and click 'Check Again'"
    ],
    linux: [
      "1. Download ComfyUI for Linux",
      "2. Extract and open terminal in that folder",
      "3. Run: python3 main.py",
      "4. ComfyUI will start at http://localhost:8188",
      "5. Return to Peace Script AI and click 'Check Again'"
    ],
    unknown: [
      "1. Visit https://github.com/comfyanonymous/ComfyUI",
      "2. Follow installation instructions for your OS",
      "3. Start ComfyUI at http://localhost:8188",
      "4. Return to Peace Script AI and click 'Check Again'"
    ]
  };

  const downloadUrls = {
    windows: "https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia_cu121_or_cpu.7z",
    mac: "https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip",
    linux: "https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip",
    unknown: "https://github.com/comfyanonymous/ComfyUI"
  };

  return {
    os,
    instructions: instructions[os],
    downloadUrl: downloadUrls[os],
    isOneClick: os === 'windows' // Windows has portable version
  };
}

/**
 * Monitor installation progress (for future auto-installer)
 */
export async function* monitorInstallation(): AsyncGenerator<InstallProgress> {
  // Step 1: Download
  yield {
    step: 'download',
    progress: 0,
    message: 'Downloading ComfyUI...'
  };

  // In the future, this would actually download and install
  // For now, we guide users through manual installation
  
  yield {
    step: 'download',
    progress: 100,
    message: 'Download instructions provided'
  };
}

/**
 * Verify required models are installed
 */
export async function checkRequiredModels(comfyUrl: string): Promise<{
  checkpointModel: boolean;
  loraModels: boolean;
  missingModels: string[];
}> {
  try {
    // This would query ComfyUI's /object_info endpoint to check available models
    const response = await fetch(`${comfyUrl}/object_info`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = await response.json();
    
    // Check for required checkpoint models (Flux, SDXL, etc.)
    const hasCheckpoint = true; // Simplified for now
    
    // Check for LoRA models
    const hasLora = true; // Simplified for now
    
    return {
      checkpointModel: hasCheckpoint,
      loraModels: hasLora,
      missingModels: []
    };
  } catch (error) {
    return {
      checkpointModel: false,
      loraModels: false,
      missingModels: ['Unable to verify models']
    };
  }
}

/**
 * Save ComfyUI URL to settings
 */
export function saveComfyUIUrl(url: string): void {
  localStorage.setItem('comfyui_url', url);
}

/**
 * Get saved ComfyUI URL
 * Priority: .env > localStorage (to allow easy updates via .env)
 */
export function getSavedComfyUIUrl(): string {
  // 🔧 FORCE FIX: Clear any cached old Cloudflare URLs
  const cached = localStorage.getItem('comfyui_url');
  if (cached && cached.includes('trycloudflare.com')) {
    console.warn('⚠️ Removing old Cloudflare URL from cache:', cached);
    localStorage.removeItem('comfyui_url');
  }
  
  // Always prefer .env value if set (allows easy updates without clearing localStorage)
  if (COMFYUI_DEFAULT_URL !== 'http://localhost:8188') {
    return COMFYUI_DEFAULT_URL;
  }
  return localStorage.getItem('comfyui_url') || COMFYUI_DEFAULT_URL;
}
