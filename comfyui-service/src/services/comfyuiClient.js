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
 * Generate image or video with ComfyUI
 */
export async function generateWithComfyUI({ 
  worker, 
  prompt, 
  workflow, 
  referenceImage, 
  isVideo = false,
  metadata = {},
  onProgress 
}) {
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
    console.log(`🔍 Workflow type: ${isVideo ? 'VIDEO' : 'IMAGE'}`);
    if (isVideo && metadata) {
      console.log(`🎬 Video config: ${metadata.numFrames} frames @ ${metadata.fps} fps`);
    }

    // Submit workflow to ComfyUI
    const response = await axios.post(`${worker.url}/prompt`, {
      prompt: finalWorkflow,
      client_id: promptId
    });

    const { prompt_id } = response.data;
    console.log(`📤 Submitted workflow to ${worker.url}, prompt_id: ${prompt_id}`);

    // Track progress via WebSocket (enhanced for video)
    const result = await trackProgress(
      worker.url, 
      prompt_id, 
      onProgress,
      isVideo,
      metadata
    );
    
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
 * Enhanced for video with frame-by-frame tracking
 */
function trackProgress(workerUrl, promptId, onProgress, isVideo = false, metadata = {}) {
  return new Promise((resolve, reject) => {
    const wsUrl = workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsUrl}/ws?clientId=${promptId}`);
    
    let currentProgress = 0;
    let currentNode = null;
    let totalSteps = 0;
    let currentStep = 0;
    
    ws.on('open', () => {
      console.log(`🔌 WebSocket connected to ${wsUrl}`);
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle executing node
        if (message.type === 'executing') {
          currentNode = message.data.node;
          
          if (currentNode === null) {
            // Execution complete
            console.log(`✅ Execution complete for prompt ${promptId}`);
            
            if (onProgress) {
              await onProgress(100);
            }
            
            // Retrieve result
            try {
              const result = isVideo 
                ? await retrieveVideo(workerUrl, promptId)
                : await retrieveImage(workerUrl, promptId);
              ws.close();
              resolve(result);
            } catch (error) {
              ws.close();
              reject(error);
            }
          }
        }
        
        // Handle different message types
        if (message.type === 'progress') {
          currentStep = message.data.value;
          totalSteps = message.data.max;
          const progress = Math.round((currentStep / totalSteps) * 100);
          currentProgress = progress;
          console.log(`📊 WebSocket Progress: ${progress}% (${currentStep}/${totalSteps})`);
          
          if (onProgress) {
            await onProgress(progress, {
              currentStep,
              totalSteps,
              currentNode,
              isVideo,
              numFrames: metadata.numFrames
            });
          }
        }
        
        if (message.type === 'executing' && message.data.node === null) {
          // Execution complete
          console.log(`✅ Job completed (detected via WebSocket)`);
          if (onProgress) {
            await onProgress(100, {
              currentStep: totalSteps,
              totalSteps,
              currentNode: 'complete',
              isVideo,
              numFrames: metadata.numFrames
            });
          }
          
          // Retrieve image or video based on type
          try {
            const result = isVideo 
              ? await retrieveVideo(workerUrl, promptId)
              : await retrieveImage(workerUrl, promptId);
            ws.close();
            resolve(result);
          } catch (error) {
            ws.close();
            reject(error);
          }
        }
        
        if (message.type === 'execution_error') {
          console.error(`❌ Execution error:`, message.data);
          const errorMsg = isVideo 
            ? `Video generation error: ${JSON.stringify(message.data)}`
            : `Execution error: ${JSON.stringify(message.data)}`;
          ws.close();
          reject(new Error(errorMsg));
        }
        
        if (message.type === 'execution_cached') {
          console.log(`📋 Cached execution detected`);
          // Some nodes were cached, still valid completion
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
    const maxPolls = isVideo ? 600 : 300; // 20 min for video, 10 min for images
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      // Estimate progress based on time elapsed (simple linear estimation)
      // This gives user feedback even if WebSocket doesn't work
      const estimatedProgress = Math.min(90, 10 + (pollCount / maxPolls) * 80);
      
      if (onProgress && pollCount % 3 === 0) { // Update every 6 seconds
        await onProgress(Math.floor(estimatedProgress), {
          currentStep: pollCount,
          totalSteps: maxPolls,
          currentNode: 'polling',
          isVideo,
          numFrames: metadata.numFrames
        });
        console.log(`📊 Polling Progress (estimated): ${Math.floor(estimatedProgress)}% ${isVideo ? '(video)' : ''}`);
      }
      
      try {
        const historyResponse = await axios.get(`${workerUrl}/history/${promptId}`);
        const history = historyResponse.data[promptId];
        
        if (history) {
            // Check for outputs (success)
            if (history.outputs && Object.keys(history.outputs).length > 0) {
                console.log(`✅ Job completed (detected via polling - outputs found)`);
                if (onProgress) {
                  await onProgress(100, {
                    currentStep: maxPolls,
                    totalSteps: maxPolls,
                    currentNode: 'complete',
                    isVideo,
                    numFrames: metadata.numFrames
                  });
                }
                clearInterval(pollInterval);
                try {
                    const result = isVideo 
                      ? await retrieveVideo(workerUrl, promptId)
                      : await retrieveImage(workerUrl, promptId);
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                    resolve(result);
                } catch (error) {
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                    reject(error);
                }
                return;
            }

            // Check for status.completed
            if (history.status && history.status.completed) {
                console.log(`✅ Job completed (detected via polling - status.completed)`);
                if (onProgress) {
                  await onProgress(100, {
                    currentStep: maxPolls,
                    totalSteps: maxPolls,
                    currentNode: 'complete',
                    isVideo,
                    numFrames: metadata.numFrames
                  });
                }
                clearInterval(pollInterval);
                try {
                    const result = isVideo 
                      ? await retrieveVideo(workerUrl, promptId)
                      : await retrieveImage(workerUrl, promptId);
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                    resolve(result);
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

    // Timeout: 20 minutes for video, 10 minutes for images
    const timeout = isVideo ? 20 * 60 * 1000 : 10 * 60 * 1000;
    setTimeout(() => {
      clearInterval(pollInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        const timeoutMsg = isVideo 
          ? 'Video generation timeout (20 minutes)' 
          : 'Generation timeout (10 minutes)';
        reject(new Error(timeoutMsg));
      }
    }, timeout);
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
 * Retrieve generated video from ComfyUI
 */
async function retrieveVideo(workerUrl, promptId) {
  try {
    // Get history to find output videos
    const historyResponse = await axios.get(`${workerUrl}/history/${promptId}`);
    const history = historyResponse.data[promptId];
    
    if (!history || !history.outputs) {
      throw new Error('No outputs found in history');
    }

    // Find VHS_VideoCombine node output (gifs = videos in VHS)
    let videoInfo = null;
    for (const [, output] of Object.entries(history.outputs)) {
      if (output.gifs && output.gifs.length > 0) {
        videoInfo = output.gifs[0];
        break;
      }
    }

    if (!videoInfo) {
      throw new Error('No video found in outputs');
    }

    // Download video
    const videoUrl = `${workerUrl}/view?filename=${videoInfo.filename}&subfolder=${videoInfo.subfolder || ''}&type=${videoInfo.type}`;
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    
    // Convert to base64
    const base64Video = Buffer.from(videoResponse.data).toString('base64');
    const mimeType = videoInfo.filename.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    
    return {
      videoUrl,
      videoData: `data:${mimeType};base64,${base64Video}`,
      filename: videoInfo.filename
    };
    
  } catch (error) {
    console.error('❌ Failed to retrieve video:', error.message);
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

/**
 * Detect installed video models (AnimateDiff, SVD)
 */
export async function detectVideoModels(workerUrl) {
  try {
    const response = await axios.get(`${workerUrl}/object_info`, { timeout: 10000 });
    const objectInfo = response.data;

    const result = {
      animateDiff: {
        supported: false,
        motionModels: [],
        baseModels: []
      },
      svd: {
        supported: false,
        checkpoints: []
      },
      vhs: {
        supported: false
      }
    };

    // Check for AnimateDiff nodes
    if (objectInfo.AnimateDiffLoaderV1 || objectInfo.AnimateDiffModelLoader) {
      result.animateDiff.supported = true;
      
      // Try to get available motion models
      if (objectInfo.AnimateDiffLoaderV1?.input?.required?.model_name) {
        result.animateDiff.motionModels = objectInfo.AnimateDiffLoaderV1.input.required.model_name[0] || [];
      }
    }

    // Check for SVD nodes
    if (objectInfo.SVD_img2vid_Conditioning || objectInfo.ImageOnlyCheckpointLoader) {
      result.svd.supported = true;
    }

    // Check for VHS Video Combine
    if (objectInfo.VHS_VideoCombine) {
      result.vhs.supported = true;
    }

    // Get available checkpoints
    if (objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name) {
      const checkpoints = objectInfo.CheckpointLoaderSimple.input.required.ckpt_name[0] || [];
      
      // Filter AnimateDiff base models
      result.animateDiff.baseModels = checkpoints.filter(name => 
        name.includes('v1-5') || 
        name.includes('realisticVision') ||
        name.includes('sd15')
      );
      
      // Filter SVD checkpoints
      result.svd.checkpoints = checkpoints.filter(name => 
        name.includes('svd') || 
        name.toLowerCase().includes('stable-video-diffusion')
      );
    }

    return result;
    
  } catch (error) {
    console.error('❌ Failed to detect video models:', error.message);
    throw error;
  }
}

/**
 * Check VRAM requirements for video generation
 */
export async function checkVRAMRequirements(workerUrl, videoType = 'animatediff') {
  try {
    const response = await axios.get(`${workerUrl}/system_stats`, { timeout: 5000 });
    const vram = response.data.vram || {};
    
    // VRAM requirements (GB)
    const requirements = {
      animatediff: {
        '512x512_12frames': 6,
        '512x512_16frames': 8,
        '768x768_16frames': 12
      },
      svd: {
        '1024x576_25frames': 12,
        '1024x576_14frames': 8
      }
    };

    const totalVRAM = (vram.total || 0) / (1024 * 1024 * 1024); // Convert to GB
    const freeVRAM = (vram.free || 0) / (1024 * 1024 * 1024);

    const recommended = videoType === 'animatediff' 
      ? requirements.animatediff['512x512_16frames']
      : requirements.svd['1024x576_25frames'];

    return {
      totalVRAM: totalVRAM.toFixed(2),
      freeVRAM: freeVRAM.toFixed(2),
      recommended,
      sufficient: totalVRAM >= recommended,
      warnings: totalVRAM < recommended 
        ? [`Insufficient VRAM: ${totalVRAM.toFixed(1)}GB available, ${recommended}GB recommended`]
        : []
    };
    
  } catch (error) {
    console.error('❌ Failed to check VRAM:', error.message);
    return {
      totalVRAM: 0,
      freeVRAM: 0,
      recommended: 8,
      sufficient: false,
      warnings: ['Could not detect VRAM']
    };
  }
}

/**
 * Verify video generation requirements
 */
export async function verifyVideoRequirements(workerUrl, videoType = 'animatediff') {
  try {
    const [models, vram] = await Promise.all([
      detectVideoModels(workerUrl),
      checkVRAMRequirements(workerUrl, videoType)
    ]);

    const issues = [];
    const warnings = [...vram.warnings];

    // Check AnimateDiff requirements
    if (videoType === 'animatediff') {
      if (!models.animateDiff.supported) {
        issues.push('ComfyUI-AnimateDiff extension not installed');
      }
      if (models.animateDiff.motionModels.length === 0) {
        issues.push('No motion modules found (mm_sd_v15_v2.ckpt required)');
      }
      if (models.animateDiff.baseModels.length === 0) {
        warnings.push('No SD 1.5 checkpoints found (recommended: realisticVisionV51)');
      }
    }

    // Check SVD requirements
    if (videoType === 'svd') {
      if (!models.svd.supported) {
        issues.push('SVD nodes not found in ComfyUI');
      }
      if (models.svd.checkpoints.length === 0) {
        issues.push('No SVD checkpoints found (svd_xt_1_1.safetensors required)');
      }
    }

    // Check VHS
    if (!models.vhs.supported) {
      issues.push('ComfyUI-VideoHelperSuite not installed (required for MP4 output)');
    }

    return {
      ready: issues.length === 0 && vram.sufficient,
      models,
      vram,
      issues,
      warnings
    };
    
  } catch (error) {
    console.error('❌ Failed to verify video requirements:', error.message);
    throw error;
  }
}

export default {
  generateWithComfyUI,
  verifyLoRAModels,
  detectVideoModels,
  checkVRAMRequirements,
  verifyVideoRequirements
};
