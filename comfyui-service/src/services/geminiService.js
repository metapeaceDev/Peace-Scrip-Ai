/**
 * Placeholder Gemini integration for comfyui-service.
 *
 * The main application (frontend) already contains a full Gemini implementation.
 * The comfyui-service load balancer supports a "gemini" backend option, but
 * in local/dev deployments this backend is typically disabled.
 *
 * This module exists so bundlers/test runners can resolve the dynamic import.
 */

export async function generateVideoWithGemini(_payload) {
  throw new Error(
    'Gemini backend is not configured in comfyui-service. ' +
      'Use the app\'s Gemini provider directly, or disable the "gemini" backend in comfyui-service.'
  );
}
