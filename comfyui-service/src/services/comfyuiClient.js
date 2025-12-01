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
  const { prompt, referenceImage, workerId } = params;
  
  // Clone workflow
  const workflow = JSON.parse(JSON.stringify(workflowTemplate));
  
  // Replace prompt in CLIPTextEncode nodes
  for (const [nodeId, node] of Object.entries(workflow)) {
    if (node.class_type === 'CLIPTextEncode' && node.inputs.text) {
      node.inputs.text = prompt;
    }
    
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
    
    const FormData = (await import('formidable')).default;
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
          
          if (onProgress) {
            await onProgress(progress);
          }
        }
        
        if (message.type === 'executing' && message.data.node === null) {
          // Execution complete
          console.log(`✅ Execution complete for prompt ${promptId}`);
          
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

    // Timeout after 5 minutes
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        reject(new Error('Generation timeout (5 minutes)'));
      }
    }, 5 * 60 * 1000);
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
    for (const [nodeId, output] of Object.entries(history.outputs)) {
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
