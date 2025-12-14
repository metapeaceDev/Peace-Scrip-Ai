/**
 * ComfyUI Client
 * 
 * Handles direct communication with ComfyUI API
 * Supports:
 * - Workflow submission
 * - Progress tracking via WebSocket
 * - Image retrieval
 * - LoRA model verification
 */

import axios from 'axios';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { getWorkerManager } from './workerManager.js';

/**
 * Generate image with ComfyUI
 */
export async function generateWithComfyUI({ worker, prompt, workflow, referenceImage, onProgress }) {
  const startTime = Date.now();
  const promptId = uuidv4();
  
  try {
    // Prepare workflow
    const finalWorkflow = await prepareWorkflow(workflow, {
      prompt,
      referenceImage,
      workerId: worker.id
    });

    console.log(`🔍 Workflow nodes: ${Object.keys(finalWorkflow).length}`);
    console.log(`🔍 Workflow structure:`, JSON.stringify(Object.keys(finalWorkflow).reduce((acc, key) => {
      acc[key] = finalWorkflow[key].class_type;
      return acc;
    }, {})));

    // Submit workflow to ComfyUI
    const response = await axios.post(`${worker.url}/prompt`, {
      prompt: finalWorkflow,
      client_id: promptId
    });

    const { prompt_id } = response.data;
    console.log(`📤 Submitted workflow to ${worker.url}, prompt_id: ${prompt_id}`);

    // Track progress via WebSocket
    const result = await trackProgress(worker.url, prompt_id, onProgress);
    
    const processingTime = Date.now() - startTime;
    
    return {
      ...result,
      processingTime,
      workerId: worker.id
    };

  } catch (error) {
    console.error(`❌ ComfyUI generation failed:`, error.message);
    throw new Error(`ComfyUI generation failed: ${error.message}`);
  }
}

/**
 * Prepare workflow with dynamic values
 */
async function prepareWorkflow(workflowTemplate, params) {
  const { referenceImage, workerId } = params;
  
  // Clone workflow
  const workflow = JSON.parse(JSON.stringify(workflowTemplate));
  
  // ❌ REMOVED BUG: Don't replace prompts!
  // Frontend workflow builder already set Node 6 (positive prompt) and Node 7 (negative prompt) correctly
  // The old code below REPLACED BOTH positive AND negative nodes with the same prompt!
  // This caused negative prompt to be overwritten, making all images cartoon style
  
  // OLD BUGGY CODE (commented out):
  // for (const [nodeId, node] of Object.entries(workflow)) {
  //   if (node.class_type === 'CLIPTextEncode' && node.inputs.text) {
  //     node.inputs.text = prompt; // ← BUG: This replaced negative prompt too!
  //   }
  // }
  
  // ✅ NEW: Only handle reference image uploads
  for (const node of Object.values(workflow)) {
    // If LoadImage node and we have reference image
    if (node.class_type === 'LoadImage' && referenceImage) {
      // Upload reference image first
      const uploadedImageName = await uploadImageToComfyUI(referenceImage, workerId);
      node.inputs.image = uploadedImageName;
    }
  }
  
  return workflow;
}

/**
 * Upload image to ComfyUI
 */
async function uploadImageToComfyUI(base64Image, workerId) {
  // ComfyUI expects images in its input folder
  // We'll use the upload/image endpoint
  
  const worker = getWorkerManager().getWorker(workerId);
  if (!worker) {
    throw new Error(`Worker ${workerId} not found`);
  }

  try {
    // Remove data:image/...;base64, prefix if exists
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(imageData, 'base64');
    
    // Use form-data package for creating multipart/form-data
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('image', buffer, {
      filename: `ref-${Date.now()}.png`,
      contentType: 'image/png'
    });

    const response = await axios.post(`${worker.url}/upload/image`, form, {
      headers: form.getHeaders()
    });

    return response.data.name;
  } catch (error) {
    console.error('❌ Failed to upload image to ComfyUI:', error.message);
    throw error;
  }
}

/**
 * Track progress via WebSocket
 */
function trackProgress(workerUrl, promptId, onProgress) {
  return new Promise((resolve, reject) => {
    const wsUrl = workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsUrl}/ws?clientId=${promptId}`);
    
    let currentProgress = 0;
    
    ws.on('open', () => {
      console.log(`🔌 WebSocket connected to ${wsUrl}`);
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle different message types
        if (message.type === 'progress') {
          const progress = Math.round((message.data.value / message.data.max) * 100);
          currentProgress = progress;
          console.log(`📊 WebSocket Progress: ${progress}%`);
          
          if (onProgress) {
            await onProgress(progress);
          }
        }
        
        if (message.type === 'executing' && message.data.node === null) {
          // Execution complete
          console.log(`✅ Execution complete for prompt ${promptId}`);
          
          if (onProgress) {
            await onProgress(100);
          }
          
          // Retrieve image
          try {
            const imageData = await retrieveImage(workerUrl, promptId);
            ws.close();
            resolve(imageData);
          } catch (error) {
            ws.close();
            reject(error);
          }
        }
        
        if (message.type === 'execution_error') {
          console.error(`❌ Execution error:`, message.data);
          ws.close();
          reject(new Error(`Execution error: ${JSON.stringify(message.data)}`));
        }
        
      } catch (error) {
        console.error('❌ WebSocket message parse error:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
    });

    // Polling fallback if WebSocket doesn't work
    let pollCount = 0;
    const maxPolls = 300; // 300 polls * 2s = 10 minutes
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      // Estimate progress based on time elapsed (simple linear estimation)
      // This gives user feedback even if WebSocket doesn't work
      const estimatedProgress = Math.min(90, 10 + (pollCount / maxPolls) * 80);
      
      if (onProgress && pollCount % 3 === 0) { // Update every 6 seconds
        await onProgress(Math.floor(estimatedProgress));
        console.log(`📊 Polling Progress (estimated): ${Math.floor(estimatedProgress)}%`);
      }
      
      try {
        const historyResponse = await axios.get(`${workerUrl}/history/${promptId}`);
        const history = historyResponse.data[promptId];
        
        if (history) {
            // Check for outputs (success)
            if (history.outputs && Object.keys(history.outputs).length > 0) {
                console.log(`✅ Job completed (detected via polling - outputs found)`);
                if (onProgress) await onProgress(100);
                clearInterval(pollInterval);
                try {
                    const imageData = await retrieveImage(workerUrl, promptId);
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                    resolve(imageData);
                } catch (error) {
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                    reject(error);
                }
                return;
            }

            // Check for status.completed
            if (history.status && history.status.completed) {
                console.log(`✅ Job completed (detected via polling - status.completed)`);
                if (onProgress) await onProgress(100);
                clearInterval(pollInterval);
                try {
                    const imageData = await retrieveImage(workerUrl, promptId);
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                    resolve(imageData);
                } catch (error) {
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                    reject(error);
                }
                return;
            }
        }
      } catch (error) {
        // Ignore polling errors
        // console.warn('Polling error:', error.message);
      }
    }, 2000); // Poll every 2 seconds

    // Timeout after 10 minutes (increased from 5)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        reject(new Error('Generation timeout (10 minutes)'));
      }
    }, 10 * 60 * 1000);
  });
}

/**
 * Retrieve generated image from ComfyUI
 */
async function retrieveImage(workerUrl, promptId) {
  try {
    // Get history to find output images
    const historyResponse = await axios.get(`${workerUrl}/history/${promptId}`);
    const history = historyResponse.data[promptId];
    
    if (!history || !history.outputs) {
      throw new Error('No outputs found in history');
    }

    // Find SaveImage node output
    let imageInfo = null;
    for (const [, output] of Object.entries(history.outputs)) {
      if (output.images && output.images.length > 0) {
        imageInfo = output.images[0];
        break;
      }
    }

    if (!imageInfo) {
      throw new Error('No image found in outputs');
    }

    // Download image
    const imageUrl = `${workerUrl}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type}`;
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    // Convert to base64
    const base64Image = Buffer.from(imageResponse.data).toString('base64');
    const mimeType = imageInfo.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    return {
      imageUrl,
      imageData: `data:${mimeType};base64,${base64Image}`,
      filename: imageInfo.filename
    };
    
  } catch (error) {
    console.error('❌ Failed to retrieve image:', error.message);
    throw error;
  }
}

/**
 * Verify LoRA models are installed
 */
export async function verifyLoRAModels(workerUrl, requiredModels) {
  try {
    // ComfyUI doesn't have a direct LoRA list endpoint
    // We need to check the models directory or use object_info
    const response = await axios.get(`${workerUrl}/object_info`);
    const loraLoader = response.data.LoraLoader;
    
    if (!loraLoader || !loraLoader.input || !loraLoader.input.required) {
      throw new Error('LoRA loader not found in ComfyUI');
    }

    const availableModels = loraLoader.input.required.lora_name?.[0] || [];
    
    const missing = requiredModels.filter(model => !availableModels.includes(model));
    
    return {
      available: availableModels,
      required: requiredModels,
      missing,
      allInstalled: missing.length === 0
    };
    
  } catch (error) {
    console.error('❌ Failed to verify LoRA models:', error.message);
    throw error;
  }
}

export default {
  generateWithComfyUI,
  verifyLoRAModels
};
