/**
 * Ollama Service - Local Text Generation
 *
 * Provides local AI text generation as an alternative to cloud APIs.
 * Supports Llama 3.2, Qwen 2.5, DeepSeek-R1 for cost-free text generation.
 *
 * Cost Comparison:
 * - Gemini 1.5 Flash: ~฿0.35 per project
 * - Ollama (local): ฿0 per project (100% free!)
 */

export interface OllamaModel {
  name: string;
  size: string;
  speedTier: 'fast' | 'balanced' | 'advanced';
  quality: 1 | 2 | 3 | 4 | 5;
  useCase: string;
  requirements: {
    ram: string;
    vram?: string;
    diskSpace: string;
  };
  avgSpeed: string;
}

export interface OllamaGenerationRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface OllamaGenerationResponse {
  text: string;
  tokensUsed: number;
  generationTime: number;
  model: string;
  cost: number; // Always 0 for local!
}

/**
 * Recommended Ollama models for different use cases
 */
export const OLLAMA_MODELS: Record<string, OllamaModel> = {
  // Fast & Lightweight (3B models)
  'llama3.2:3b': {
    name: 'Llama 3.2 3B',
    size: '2GB',
    speedTier: 'fast',
    quality: 3,
    useCase: 'Quick drafts, dialogue, character names',
    requirements: {
      ram: '8GB',
      diskSpace: '2GB',
    },
    avgSpeed: '1-2s per response',
  },
  'qwen2.5:3b': {
    name: 'Qwen 2.5 3B',
    size: '2GB',
    speedTier: 'fast',
    quality: 3,
    useCase: 'Short text, summaries, quick ideas',
    requirements: {
      ram: '8GB',
      diskSpace: '2GB',
    },
    avgSpeed: '1-2s per response',
  },

  // Balanced (7B models)
  'llama3.2:7b': {
    name: 'Llama 3.2 7B',
    size: '4GB',
    speedTier: 'balanced',
    quality: 4,
    useCase: 'Scene descriptions, plot development',
    requirements: {
      ram: '16GB',
      diskSpace: '4GB',
    },
    avgSpeed: '3-5s per response',
  },
  'qwen2.5:7b': {
    name: 'Qwen 2.5 7B',
    size: '4GB',
    speedTier: 'balanced',
    quality: 4,
    useCase: 'Creative writing, detailed scenes',
    requirements: {
      ram: '16GB',
      diskSpace: '4GB',
    },
    avgSpeed: '3-5s per response',
  },

  // Advanced (14B+ models)
  'qwen2.5:14b': {
    name: 'Qwen 2.5 14B',
    size: '9GB',
    speedTier: 'advanced',
    quality: 5,
    useCase: 'Complex narratives, screenplay writing',
    requirements: {
      ram: '32GB',
      vram: '8GB+ (recommended)',
      diskSpace: '9GB',
    },
    avgSpeed: '8-12s per response',
  },
  'deepseek-r1:7b': {
    name: 'DeepSeek R1 7B',
    size: '4.7GB',
    speedTier: 'balanced',
    quality: 5,
    useCase: 'Reasoning, plot analysis, structure',
    requirements: {
      ram: '16GB',
      diskSpace: '5GB',
    },
    avgSpeed: '5-8s per response',
  },
};

/**
 * Default Ollama API endpoint
 */
const OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * Check if Ollama is running and accessible
 */
export async function checkOllamaStatus(): Promise<{
  isRunning: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/version`);
    if (!response.ok) {
      return { isRunning: false, error: 'Ollama service not responding' };
    }
    const data = await response.json();
    return { isRunning: true, version: data.version };
  } catch (error) {
    return {
      isRunning: false,
      error: `Cannot connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List installed Ollama models
 */
export async function listInstalledModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch (error) {
    console.error('Error listing models:', error);
    return [];
  }
}

/**
 * Select optimal Ollama model based on user preference and system resources
 */
export async function selectOptimalOllamaModel(
  preference: 'fast' | 'balanced' | 'advanced' = 'balanced',
  availableRAM: number = 16 // GB
): Promise<OllamaModel> {
  // Get installed models
  const installed = await listInstalledModels();

  // Priority order by preference
  const modelPriority: Record<string, string[]> = {
    fast: ['llama3.2:3b', 'qwen2.5:3b', 'llama3.2:7b'],
    balanced: ['llama3.2:7b', 'qwen2.5:7b', 'deepseek-r1:7b', 'llama3.2:3b'],
    advanced: ['qwen2.5:14b', 'deepseek-r1:7b', 'qwen2.5:7b'],
  };

  // Find first installed model that matches preference
  for (const modelName of modelPriority[preference]) {
    if (installed.includes(modelName)) {
      const model = OLLAMA_MODELS[modelName];
      const requiredRAM = parseInt(model.requirements.ram);

      // Check if system has enough RAM
      if (availableRAM >= requiredRAM) {
        return model;
      }
    }
  }

  // Fallback: Return smallest model that's installed
  for (const modelName of ['llama3.2:3b', 'qwen2.5:3b', 'llama3.2:7b']) {
    if (installed.includes(modelName)) {
      return OLLAMA_MODELS[modelName];
    }
  }

  // Default fallback (even if not installed yet)
  return OLLAMA_MODELS['llama3.2:3b'];
}

/**
 * Generate text using Ollama
 */
export async function generateText(
  request: OllamaGenerationRequest
): Promise<OllamaGenerationResponse> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
        stream: request.stream || false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generationTime = (Date.now() - startTime) / 1000;

    return {
      text: data.response || '',
      tokensUsed: data.eval_count || 0,
      generationTime,
      model: request.model,
      cost: 0, // Local generation is FREE!
    };
  } catch (error) {
    throw new Error(
      `Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate cost savings vs cloud APIs
 */
export function calculateTextGenerationSavings(numProjects: number): {
  cloudCost: number;
  ollamaCost: number;
  savings: number;
  savingsPercent: number;
} {
  const geminiCostPerProject = 0.35; // ฿0.35 per project
  const cloudCost = numProjects * geminiCostPerProject;
  const ollamaCost = 0; // Always free!

  return {
    cloudCost,
    ollamaCost,
    savings: cloudCost,
    savingsPercent: 100,
  };
}

/**
 * Get download instructions for a specific model
 */
export function getOllamaDownloadCommand(modelName: string): string {
  return `ollama pull ${modelName}`;
}

/**
 * Get recommended model for specific use case
 */
export function getRecommendedModelForUseCase(useCase: string): OllamaModel {
  const useCaseMap: Record<string, string> = {
    'quick-draft': 'llama3.2:3b',
    dialogue: 'llama3.2:3b',
    'scene-description': 'llama3.2:7b',
    'plot-development': 'qwen2.5:7b',
    screenplay: 'qwen2.5:14b',
    analysis: 'deepseek-r1:7b',
  };

  const modelName = useCaseMap[useCase] || 'llama3.2:7b';
  return OLLAMA_MODELS[modelName];
}

/**
 * Generate enhanced prompt for script writing
 */
export function buildScriptPrompt(
  genre: string,
  characterCount: number,
  sceneCount: number,
  additionalContext?: string
): string {
  return `You are a professional Thai screenplay writer. Create a compelling script outline with the following requirements:

Genre: ${genre}
Number of Characters: ${characterCount}
Number of Scenes: ${sceneCount}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Please provide:
1. Brief story synopsis (2-3 sentences)
2. Character list with brief descriptions
3. Scene-by-scene breakdown with:
   - Scene number
   - Location
   - Characters involved
   - Brief description of action
   - Key dialogue or events

Write in a clear, professional screenplay format suitable for Thai cinema production.`;
}

/**
 * Stream text generation (for real-time updates)
 */
export async function* streamText(
  request: OllamaGenerationRequest
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model,
      prompt: request.prompt,
      temperature: request.temperature || 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
