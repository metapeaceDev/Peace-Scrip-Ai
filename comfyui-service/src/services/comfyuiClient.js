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
  // clientId is used for ComfyUI WebSocket routing
  const clientId = uuidv4();
  
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

    let result;
    try {
      // Submit workflow to ComfyUI
      // /prompt should respond quickly (enqueue + prompt_id). If this hangs, the whole job appears stuck.
      const response = await axios.post(`${worker.url}/prompt`, {
        prompt: finalWorkflow,
        client_id: clientId
      }, {
        timeout: 15000
      });

      const { prompt_id } = response.data;
      console.log(`📤 Submitted workflow to ${worker.url}, prompt_id: ${prompt_id}`);

      // Track progress via WebSocket (enhanced for video)
      result = await trackProgress(
        worker.url, 
        prompt_id, 
        clientId,
        onProgress,
        isVideo,
        metadata
      );
    } catch (innerError) {
      // Fallback for testing/dev if ComfyUI is missing nodes or fails
      // This allows verifying the pipeline logic even if local ComfyUI is incomplete
      // IMPORTANT: Do NOT auto-mock in development. Only mock when explicitly enabled.
      if (process.env.MOCK_COMFYUI) {
        console.warn('⚠️ ComfyUI request failed, using MOCK response for testing (MOCK_COMFYUI enabled):', innerError.message);
        if (innerError.response) {
          console.warn('⚠️ ComfyUI Error:', JSON.stringify(innerError.response.data));
        }
        
        // Simulate progress
        if (onProgress) {
          for (let i = 10; i <= 100; i += 20) {
            await new Promise(r => setTimeout(r, 500));
            onProgress(i);
          }
        }
        
        result = {
          imageUrl: isVideo ? null : 'https://placehold.co/512x512.png',
          videoUrl: isVideo ? 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4' : null,
          images: [],
          _debug_error: innerError.message,
          _debug_details: innerError.response ? innerError.response.data : 'No response data'
        };
      } else {
        throw innerError;
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      ...result,
      processingTime,
      workerId: worker.id
    };

  } catch (error) {
    if (error.response) {
      console.error('❌ ComfyUI Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error(`❌ ComfyUI generation failed:`, error.message);
    const details = error.response?.data ? ` | details: ${JSON.stringify(error.response.data)}` : '';
    throw new Error(`ComfyUI generation failed: ${error.message}${details}`);
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

  // ✅ NEW: Validate and auto-fix SVD prerequisites (CLIP vision models + required inputs)
  await ensureSvdPrereqs(workflow, workerId);

  // ✅ NEW: If workflow requests LoRAs that are not installed on this worker,
  // strip the LoraLoader node(s) and rewire downstream connections back to the base model/clip.
  await stripInvalidLoraLoaders(workflow, workerId);
  
  return workflow;
}

async function ensureSvdPrereqs(workflow, workerId) {
  const hasSvd = Object.values(workflow).some((node) => node?.class_type === 'SVD_img2vid_Conditioning');
  if (!hasSvd) return;

  const worker = getWorkerManager().getWorker(workerId);
  if (!worker?.url) return;

  let clipVisionChoices = [];
  try {
    const response = await axios.get(`${worker.url}/object_info/CLIPVisionLoader`, { timeout: 10000 });
    const choices = response.data?.CLIPVisionLoader?.input?.required?.clip_name?.[0];
    clipVisionChoices = Array.isArray(choices) ? choices : [];
  } catch (error) {
    throw new Error(`SVD prerequisites check failed: ${error.message}`);
  }

  if (clipVisionChoices.length === 0) {
    throw new Error(
      'SVD requires a CLIP Vision model, but none were found in ComfyUI (models/clip_vision is empty). ' +
      'Install a CLIP vision .safetensors into ComfyUI/models/clip_vision and restart ComfyUI, then try again.'
    );
  }

  // Fix CLIPVisionLoader nodes (choose first available if missing/invalid)
  const clipVisionLoaderNodes = Object.entries(workflow).filter(([, node]) => node?.class_type === 'CLIPVisionLoader');
  for (const [, node] of clipVisionLoaderNodes) {
    const requested = node?.inputs?.clip_name;
    if (!requested || !clipVisionChoices.includes(requested)) {
      node.inputs = node.inputs || {};
      node.inputs.clip_name = clipVisionChoices[0];
    }
  }

  // Ensure SVD conditioning nodes have the required input names.
  const checkpointNodeId = Object.entries(workflow).find(([, node]) => node?.class_type === 'CheckpointLoaderSimple')?.[0];
  const vaeSource = checkpointNodeId ? [checkpointNodeId, 2] : null;

  for (const node of Object.values(workflow)) {
    if (node?.class_type !== 'SVD_img2vid_Conditioning') continue;

    node.inputs = node.inputs || {};
    if (node.inputs.image && !node.inputs.init_image) {
      node.inputs.init_image = node.inputs.image;
      delete node.inputs.image;
    }
    if (!node.inputs.vae && vaeSource) {
      node.inputs.vae = vaeSource;
    }
  }
}

async function stripInvalidLoraLoaders(workflow, workerId) {
  const worker = getWorkerManager().getWorker(workerId);
  if (!worker?.url) return;

  const loraNodes = Object.entries(workflow).filter(([, node]) => node?.class_type === 'LoraLoader');
  if (loraNodes.length === 0) return;

  let availableLoras;
  try {
    const response = await axios.get(`${worker.url}/object_info`, { timeout: 10000 });
    const loraLoaderInfo = response.data?.LoraLoader;
    const choices = loraLoaderInfo?.input?.required?.lora_name?.[0];
    availableLoras = Array.isArray(choices) ? choices : [];
  } catch (error) {
    // If we cannot detect, prefer resiliency over strictness:
    // strip LoRA nodes to avoid ComfyUI rejecting an unknown LoRA choice with HTTP 400.
    console.warn('⚠️ Could not fetch LoRA list from ComfyUI; stripping LoRAs for resiliency:', error.message);
    availableLoras = [];
  }

  for (const [loraNodeId, loraNode] of loraNodes) {
    const requested = loraNode?.inputs?.lora_name;
    if (!requested) continue;

    if (availableLoras.includes(requested)) continue;

    console.warn(`⚠️ LoRA not installed on worker (${worker.id}): ${requested} — stripping LoraLoader node ${loraNodeId}`);

    const modelSource = loraNode.inputs?.model;
    const clipSource = loraNode.inputs?.clip;

    // Rewire any downstream references to this LoraLoader outputs.
    for (const node of Object.values(workflow)) {
      if (!node?.inputs) continue;
      for (const [key, value] of Object.entries(node.inputs)) {
        if (!Array.isArray(value)) continue;
        if (value[0] !== loraNodeId) continue;

        if (value[1] === 0 && modelSource) {
          node.inputs[key] = modelSource;
        } else if (value[1] === 1 && clipSource) {
          node.inputs[key] = clipSource;
        }
      }
    }

    delete workflow[loraNodeId];
  }
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
  // Backward compatible signature (older callers passed only workerUrl + promptId)
  // New signature: (workerUrl, promptId, clientId, onProgress, isVideo, metadata)
  let clientId = promptId;
  let progressCb = onProgress;
  let videoFlag = isVideo;
  let meta = metadata;

  // Detect new call form by argument count
  if (typeof arguments[2] === 'string' && typeof arguments[3] === 'function') {
    clientId = arguments[2];
    progressCb = arguments[3];
    videoFlag = arguments[4] || false;
    meta = arguments[5] || {};
  }

  return new Promise((resolve, reject) => {
    const wsUrl = workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsUrl}/ws?clientId=${clientId}`);
    
    let currentProgress = 0;
    let currentNode = null;
    let totalSteps = 0;
    let currentStep = 0;
    let settled = false;
    let pollInterval = null;

    const cleanup = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch {
        // ignore
      }
    };

    const safeResolve = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const safeReject = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };
    
    ws.on('open', () => {
      console.log(`🔌 WebSocket connected to ${wsUrl}`);
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle executing node
        if (message.type === 'executing') {
          currentNode = message.data.node;
        }
        
        // Handle different message types
        if (message.type === 'progress') {
          currentStep = message.data.value;
          totalSteps = message.data.max;
          const progress = Math.round((currentStep / totalSteps) * 100);
          currentProgress = progress;
          console.log(`📊 WebSocket Progress: ${progress}% (${currentStep}/${totalSteps})`);
          
          if (progressCb) {
            await progressCb(progress, {
              currentStep,
              totalSteps,
              currentNode,
              isVideo: videoFlag,
              numFrames: meta.numFrames
            });
          }
        }
        
        if (message.type === 'executing' && message.data.node === null) {
          // Execution complete
          console.log(`✅ Job completed (detected via WebSocket)`);
          if (progressCb) {
            await progressCb(100, {
              currentStep: totalSteps,
              totalSteps,
              currentNode: 'complete',
              isVideo: videoFlag,
              numFrames: meta.numFrames
            });
          }
          
          // Retrieve image or video based on type
          try {
            const result = videoFlag 
              ? await retrieveVideo(workerUrl, promptId)
              : await retrieveImage(workerUrl, promptId);
            safeResolve(result);
          } catch (error) {
            safeReject(error);
          }
        }
        
        if (message.type === 'execution_error') {
          console.error(`❌ Execution error:`, message.data);
          const errorMsg = videoFlag 
            ? `Video generation error: ${JSON.stringify(message.data)}`
            : `Execution error: ${JSON.stringify(message.data)}`;
          safeReject(new Error(errorMsg));
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
      // Don't kill the job immediately: polling fallback may still succeed.
      // We only reject on hard timeout or explicit execution_error.
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
    });

    // Polling fallback if WebSocket doesn't work
    let pollCount = 0;
    const maxPolls = videoFlag ? 1800 : 300; // 60 min for video, 10 min for images
    pollInterval = setInterval(async () => {
      pollCount++;
      
      // Estimate progress based on time elapsed (simple linear estimation)
      // This gives user feedback even if WebSocket doesn't work
      const estimatedProgress = Math.min(90, 10 + (pollCount / maxPolls) * 80);
      
      if (progressCb && pollCount % 3 === 0) { // Update every 6 seconds
        console.log(`⏳ ComfyUI Polling Progress: ${Math.floor(estimatedProgress)}% (poll ${pollCount}/${maxPolls})`);
        await progressCb(Math.floor(estimatedProgress), {
          currentStep: pollCount,
          totalSteps: maxPolls,
          currentNode: 'polling',
          isVideo: videoFlag,
          numFrames: meta.numFrames
        });
        console.log(`📊 Polling Progress (estimated): ${Math.floor(estimatedProgress)}% ${videoFlag ? '(video)' : ''}`);
      }
      
      try {
        const historyResponse = await axios.get(`${workerUrl}/history/${promptId}`, { timeout: 5000 });
        const history = historyResponse.data[promptId];
        
        if (history) {
            // Check for outputs (success)
            if (history.outputs && Object.keys(history.outputs).length > 0) {
                console.log(`✅ Job completed (detected via polling - outputs found)`);
                if (progressCb) {
                  await progressCb(100, {
                    currentStep: maxPolls,
                    totalSteps: maxPolls,
                    currentNode: 'complete',
                    isVideo: videoFlag,
                    numFrames: meta.numFrames
                  });
                }
                try {
                    const result = videoFlag 
                      ? await retrieveVideo(workerUrl, promptId, meta)
                      : await retrieveImage(workerUrl, promptId);
                    safeResolve(result);
                } catch (error) {
                    safeReject(error);
                }
                return;
            }

            // Check for status.completed
            if (history.status && history.status.completed) {
                console.log(`✅ Job completed (detected via polling - status.completed)`);
                if (progressCb) {
                  await progressCb(100, {
                    currentStep: maxPolls,
                    totalSteps: maxPolls,
                    currentNode: 'complete',
                    isVideo: videoFlag,
                    numFrames: meta.numFrames
                  });
                }
                try {
                    const result = videoFlag 
                      ? await retrieveVideo(workerUrl, promptId, meta)
                      : await retrieveImage(workerUrl, promptId);
                    safeResolve(result);
                } catch (error) {
                    safeReject(error);
                }
                return;
            }
        }
      } catch (error) {
        // Ignore polling errors
        // console.warn('Polling error:', error.message);
      }
    }, 2000); // Poll every 2 seconds

    // Timeout: 60 minutes for video, 10 minutes for images
    const timeout = videoFlag ? 60 * 60 * 1000 : 10 * 60 * 1000;
    setTimeout(() => {
      if (settled) return;
      const timeoutMsg = videoFlag
        ? 'Video generation timeout (60 minutes)'
        : 'Generation timeout (10 minutes)';
      safeReject(new Error(timeoutMsg));
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
async function retrieveVideo(workerUrl, promptId, meta = {}) {
  try {
    // Get history to find output videos
    const historyResponse = await axios.get(`${workerUrl}/history/${promptId}`);
    const history = historyResponse.data[promptId];
    
    if (!history || !history.outputs) {
      throw new Error('No outputs found in history');
    }

    // Find VHS_VideoCombine node output (gifs = videos in VHS)
    // IMPORTANT: Some ComfyUI installs may produce multiple `gifs` outputs (e.g. previews).
    // Prefer the known VHS_VideoCombine node id and/or filename prefix from metadata.
    const preferredNodeIds = [];
    if (meta && typeof meta.videoNodeId === 'string') {
      preferredNodeIds.push(meta.videoNodeId);
    }
    if (meta && typeof meta.videoType === 'string') {
      // Default node ids produced by our workflow builders
      if (meta.videoType === 'svd') preferredNodeIds.push('6');
      if (meta.videoType === 'animatediff') preferredNodeIds.push('8');
      if (meta.videoType === 'wan') preferredNodeIds.push('8');
    }

    const preferredFilenamePrefix = meta && typeof meta.filenamePrefix === 'string' ? meta.filenamePrefix : null;

    let videoInfo = null;

    // 1) Try preferred node id(s) first
    for (const nodeId of preferredNodeIds) {
      const output = history.outputs?.[nodeId];
      if (output?.gifs?.length > 0) {
        videoInfo = output.gifs[0];
        break;
      }
    }

    // 2) Try filename prefix match (more robust than output ordering)
    if (!videoInfo && preferredFilenamePrefix) {
      for (const [, output] of Object.entries(history.outputs)) {
        if (output?.gifs?.length > 0) {
          const candidate = output.gifs[0];
          if (candidate?.filename && String(candidate.filename).includes(preferredFilenamePrefix)) {
            videoInfo = candidate;
            break;
          }
        }
      }
    }

    // 3) Fallback: first gifs output found
    if (!videoInfo) {
      for (const [, output] of Object.entries(history.outputs)) {
        if (output?.gifs?.length > 0) {
          videoInfo = output.gifs[0];
          break;
        }
      }
    }

    if (!videoInfo) {
      throw new Error('No video found in outputs');
    }

    // Download video
    const videoUrl = `${workerUrl}/view?filename=${videoInfo.filename}&subfolder=${videoInfo.subfolder || ''}&type=${videoInfo.type}`;
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    
    // Return raw buffer for Firebase Storage upload
    const videoBuffer = Buffer.from(videoResponse.data);
    const mimeType = videoInfo.filename.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    
    return {
      videoUrl,
      videoData: videoBuffer, // 🆕 Return Buffer instead of Data URL
      filename: videoInfo.filename,
      mimeType, // 🆕 Include mimeType for Firebase Storage
      numFrames: videoInfo.num_frames,
      fps: videoInfo.fps
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
      wan: {
        supported: false,
        models: []
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

    // Check for WAN (WanVideoWrapper)
    if (objectInfo.WanVideoModelLoader && objectInfo.WanVideoSampler && objectInfo.WanVideoTextEncode) {
      result.wan.supported = true;

      // Try to get available model paths (if exposed by object_info)
      const modelChoices = objectInfo.WanVideoModelLoader?.input?.required?.model?.[0] || [];
      result.wan.models = Array.isArray(modelChoices) ? modelChoices : [];
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

    // Check WAN requirements
    if (videoType === 'wan') {
      if (!models.wan.supported) {
        issues.push('ComfyUI-WanVideoWrapper nodes not found (WanVideoModelLoader/WanVideoSampler/WanVideoTextEncode)');
      }
      if (models.wan.models.length === 0) {
        warnings.push('WAN model list not detected via /object_info (ensure WAN checkpoint is installed)');
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

