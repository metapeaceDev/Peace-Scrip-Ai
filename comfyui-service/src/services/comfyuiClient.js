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

  // ✅ Validate and auto-fix SVD prerequisites (CLIP vision models + required inputs)
  await ensureSvdPrereqs(workflow, workerId);

  // ✅ Validate IP-Adapter prerequisites (requires CLIP Vision model for Face presets)
  await ensureIPAdapterPrereqs(workflow, workerId);

  // ✅ Validate and auto-fix WAN model selection (map basename -> actual ComfyUI choice)
  // If a reference image is provided, prefer switching to an I2V WAN model when available.
  await ensureWanPrereqs(workflow, workerId, { preferI2V: !!referenceImage });

  // ✅ Best-effort: if a reference image is provided, try to convert WAN T2V workflow
  // into an I2V-conditioned workflow by injecting a LoadImage + WanVideo image-embed node.
  // If the worker doesn't expose a compatible node, keep the original T2V workflow.
  await ensureWanI2VConditioning(workflow, workerId, referenceImage);
  
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
      console.log('📸 Found LoadImage node, uploading reference image...');
      // Upload reference image first
      const uploadedImageName = await uploadImageToComfyUI(referenceImage, workerId);
      console.log(`✅ Reference image uploaded as: ${uploadedImageName}`);
      node.inputs.image = uploadedImageName;
      console.log(`✅ Updated LoadImage node to use: ${uploadedImageName}`);
    }
  }

  // ✅ NEW: If workflow requests LoRAs that are not installed on this worker,
  // strip the LoraLoader node(s) and rewire downstream connections back to the base model/clip.
  await stripInvalidLoraLoaders(workflow, workerId);
  
  return workflow;
}

async function ensureIPAdapterPrereqs(workflow, workerId) {
  const hasIpAdapter = Object.values(workflow).some((node) => {
    const type = String(node?.class_type || '');
    return type === 'IPAdapterUnifiedLoader' || type === 'IPAdapter' || type.toLowerCase().includes('ipadapter');
  });
  if (!hasIpAdapter) return;

  const worker = getWorkerManager().getWorker(workerId);
  if (!worker?.url) return;

  let clipVisionChoices = [];
  try {
    const response = await axios.get(`${worker.url}/object_info/CLIPVisionLoader`, { timeout: 10000 });
    const choices = response.data?.CLIPVisionLoader?.input?.required?.clip_name?.[0];
    clipVisionChoices = Array.isArray(choices) ? choices : [];
  } catch (error) {
    throw new Error(`IP-Adapter prerequisites check failed: ${error.message}`);
  }

  // IP-Adapter Face workflows need a CLIP vision model (not just SVD encoders).
  const usableChoices = clipVisionChoices.filter((name) => !String(name || '').toLowerCase().includes('svd'));

  if (usableChoices.length === 0) {
    const detected = clipVisionChoices.length > 0 ? ` Detected: ${clipVisionChoices.join(', ')}` : '';
    throw new Error(
      'IP-Adapter Face ID requires a CLIP Vision model, but none were found in ComfyUI/models/clip_vision ' +
        '(only SVD encoders or empty).' +
        detected +
        ' Install a CLIP vision model suitable for IP-Adapter (commonly: clip_vision_g.safetensors) into ComfyUI/models/clip_vision and restart ComfyUI.'
    );
  }

  // Best-effort: Fix CLIPVisionLoader nodes (choose first usable if missing/invalid)
  const clipVisionLoaderNodes = Object.entries(workflow).filter(([, node]) => node?.class_type === 'CLIPVisionLoader');
  for (const [, node] of clipVisionLoaderNodes) {
    const requested = node?.inputs?.clip_name;
    const reqLower = String(requested || '').toLowerCase();
    const isSvd = reqLower.includes('svd');

    if (!requested || !clipVisionChoices.includes(requested) || isSvd) {
      node.inputs = node.inputs || {};
      node.inputs.clip_name = usableChoices[0];
    }
  }
}

async function ensureWanPrereqs(workflow, workerId, opts = {}) {
  const wanLoaderNodes = Object.entries(workflow).filter(([, node]) => node?.class_type === 'WanVideoModelLoader');
  if (wanLoaderNodes.length === 0) return;

  // NOTE: We no longer auto-switch T2V -> I2V here.
  // Switching to an I2V checkpoint is only safe if we successfully inject a compatible
  // image-conditioning embed node (handled in ensureWanI2VConditioning).
  void opts;

  const worker = getWorkerManager().getWorker(workerId);
  if (!worker?.url) return;

  const fetchChoices = async () => {
    try {
      const response = await axios.get(`${worker.url}/object_info/WanVideoModelLoader`, { timeout: 10000 });
      const choices = response.data?.WanVideoModelLoader?.input?.required?.model?.[0];
      return Array.isArray(choices) ? choices : [];
    } catch {
      // Fallback for older ComfyUI servers that may not support per-node object_info
      const response = await axios.get(`${worker.url}/object_info`, { timeout: 10000 });
      const choices = response.data?.WanVideoModelLoader?.input?.required?.model?.[0];
      return Array.isArray(choices) ? choices : [];
    }
  };

  const modelChoices = await fetchChoices();
  if (modelChoices.length === 0) {
    throw new Error(
      'WAN workflow requested, but ComfyUI reports zero WAN models for WanVideoModelLoader. ' +
        'Install WAN .safetensors in the folder scanned by the WanVideoWrapper node and restart ComfyUI.'
    );
  }

  const normalize = (s) => String(s || '').replace(/\\/g, '/').trim().toLowerCase();
  const baseName = (s) => normalize(s).split('/').pop() || normalize(s);
  const stripExt = (s) => s.replace(/\.(safetensors|ckpt|pt)$/i, '');

  const tryResolveChoice = (requested) => {
    const req = String(requested || '').trim();
    if (!req) return null;

    // 1) Exact match (case-insensitive, path-normalized)
    const reqNorm = normalize(req);
    const exact = modelChoices.find((c) => normalize(c) === reqNorm);
    if (exact) return exact;

    // 2) Append .safetensors if caller passed basename
    if (!/\.(safetensors|ckpt|pt)$/i.test(req)) {
      const withExt = modelChoices.find((c) => normalize(c) === normalize(`${req}.safetensors`));
      if (withExt) return withExt;
    }

    // 3) Match by basename without extension (handles subfolders)
    const reqBase = stripExt(baseName(req));
    const candidates = modelChoices.filter((c) => stripExt(baseName(c)) === reqBase);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      const reqLower = reqNorm;
      // Prefer the candidate that contains the requested substring
      const contains = candidates.find((c) => normalize(c).includes(reqLower));
      if (contains) return contains;

      // Heuristic: prefer fp8/fp16 alignment if present
      const wantsFp8 = reqLower.includes('fp8');
      const wantsFp16 = reqLower.includes('fp16');
      if (wantsFp8) {
        const fp8 = candidates.find((c) => normalize(c).includes('fp8'));
        if (fp8) return fp8;
      }
      if (wantsFp16) {
        const fp16 = candidates.find((c) => normalize(c).includes('fp16'));
        if (fp16) return fp16;
      }
      return candidates[0];
    }

    // 4) Heuristic fallback by task type (handles differing naming conventions)
    const reqLower = reqNorm;
    const wantsI2v = reqLower.includes('i2v') || reqLower.includes('img2vid') || reqLower.includes('image-to-video');
    const wantsT2v = reqLower.includes('t2v') || reqLower.includes('txt2vid') || reqLower.includes('text-to-video');
    if (wantsI2v || wantsT2v) {
      const typeToken = wantsI2v ? 'i2v' : 't2v';
      const typeMatches = modelChoices.filter((c) => normalize(c).includes(typeToken));
      if (typeMatches.length > 0) {
        const wantsFp8 = reqLower.includes('fp8');
        const wantsFp16 = reqLower.includes('fp16');
        if (wantsFp8) {
          const fp8 = typeMatches.find((c) => normalize(c).includes('fp8'));
          if (fp8) return fp8;
        }
        if (wantsFp16) {
          const fp16 = typeMatches.find((c) => normalize(c).includes('fp16'));
          if (fp16) return fp16;
        }
        return typeMatches[0];
      }
    }

    return null;
  };

  for (const [nodeId, node] of wanLoaderNodes) {
    node.inputs = node.inputs || {};
    const requested = node.inputs.model;
    const resolved = requested ? tryResolveChoice(requested) : modelChoices[0];

    if (!resolved) {
      const requestedLabel = requested ? String(requested) : '(missing)';
      const sample = modelChoices.slice(0, 12).join(', ');
      throw new Error(
        `WAN model not available in ComfyUI. Requested: ${requestedLabel}. ` +
          `WanVideoModelLoader choices: ${modelChoices.length}. ` +
          `Sample: ${sample}`
      );
    }

    if (requested !== resolved) {
      console.log(`🔧 WAN model auto-resolve: node ${nodeId}: ${requested || '(unset)'} -> ${resolved}`);
    }
    node.inputs.model = resolved;
  }
}

async function ensureWanI2VConditioning(workflow, workerId, referenceImage) {
  if (!referenceImage) return;

  const hasWanSampler = Object.values(workflow).some((n) => n?.class_type === 'WanVideoSampler');
  const hasWanLoader = Object.values(workflow).some((n) => n?.class_type === 'WanVideoModelLoader');
  if (!hasWanSampler || !hasWanLoader) return;

  // If the workflow already has a LoadImage node, assume the builder knows what it's doing.
  const alreadyHasLoadImage = Object.values(workflow).some((n) => n?.class_type === 'LoadImage');
  if (alreadyHasLoadImage) return;

  const worker = getWorkerManager().getWorker(workerId);
  if (!worker?.url) return;

  let objectInfo;
  try {
    const response = await axios.get(`${worker.url}/object_info`, { timeout: 10000 });
    objectInfo = response.data || {};
  } catch (error) {
    console.warn('⚠️ Could not fetch ComfyUI object_info for WAN I2V conditioning:', error.message);
    return;
  }

  const candidates = Object.keys(objectInfo)
    .filter((name) => {
      if (!/^WanVideo/i.test(name)) return false;
      if (/EmptyEmbeds/i.test(name)) return false;
      return /(Image|Img).*(Embed|Embeds|Encode)/i.test(name);
    })
    .map((name) => {
      const required = objectInfo?.[name]?.input?.required;
      const keys = required && typeof required === 'object' ? Object.keys(required) : [];
      const hasImageKey = keys.includes('image') || keys.includes('images');
      const hasModelKey = keys.includes('model') || keys.includes('model_to_offload');
      return { name, keys, hasImageKey, hasModelKey };
    })
    .sort((a, b) => {
      // Prefer nodes that accept an image input, then prefer nodes that also accept the WAN model.
      const byImage = Number(b.hasImageKey) - Number(a.hasImageKey);
      if (byImage) return byImage;
      return Number(b.hasModelKey) - Number(a.hasModelKey);
    });

  const selected = candidates.find((c) => c.hasImageKey);
  if (!selected) {
    // If the workflow is currently configured with an I2V checkpoint but we can't inject conditioning,
    // auto-fallback to a T2V checkpoint to avoid runtime channel-mismatch errors.
    try {
      const loaderEntry = Object.entries(workflow).find(([, n]) => n?.class_type === 'WanVideoModelLoader');
      const loaderNode = loaderEntry ? workflow[loaderEntry[0]] : null;
      const currentModel = String(loaderNode?.inputs?.model || '');
      if (/i2v/i.test(currentModel)) {
        const choices = (() => {
          const raw = objectInfo?.WanVideoModelLoader?.input?.required?.model?.[0];
          return Array.isArray(raw) ? raw : [];
        })();

        const normalizeModel = (s) => String(s || '').replace(/\\/g, '/').trim().toLowerCase();
        const t2vCandidate = choices.find((c) => normalizeModel(c).includes('t2v'));
        if (t2vCandidate && loaderNode?.inputs) {
          console.warn(
            `⚠️ WAN I2V conditioning unavailable on this worker; falling back to T2V model: ${currentModel} -> ${t2vCandidate}`
          );
          loaderNode.inputs.model = t2vCandidate;
        }
      }
    } catch {
      // ignore; proceed without conditioning
    }

    console.warn(
      '⚠️ WAN reference images were provided, but no compatible WanVideoWrapper image-embed node was found in ComfyUI. ' +
        'WAN will run in text-to-video mode (character identity may drift).'
    );
    return;
  }

  // Identify key nodes/inputs from the existing WAN workflow.
  const samplerEntry = Object.entries(workflow).find(([, n]) => n?.class_type === 'WanVideoSampler');
  const loaderEntry = Object.entries(workflow).find(([, n]) => n?.class_type === 'WanVideoModelLoader');
  if (!samplerEntry || !loaderEntry) return;

  const [samplerId, samplerNode] = samplerEntry;
  const [loaderId] = loaderEntry;
  const loaderNode = workflow[loaderId];

  const embedsLink = samplerNode?.inputs?.image_embeds;
  const embedsNodeId = Array.isArray(embedsLink) ? String(embedsLink[0]) : null;
  const embedsNode = embedsNodeId ? workflow[embedsNodeId] : null;

  const width = embedsNode?.inputs?.width;
  const height = embedsNode?.inputs?.height;
  const numFrames = embedsNode?.inputs?.num_frames;

  const requiredKeys = new Set(selected.keys);
  const allowedKeys = new Set([
    'image',
    'images',
    'width',
    'height',
    'num_frames',
    'batch_size',
    'frames',
    'model',
    'model_to_offload',
    'force_offload',
    'device',
  ]);

  for (const key of requiredKeys) {
    if (!allowedKeys.has(key)) {
      console.warn(
        `⚠️ WAN I2V conditioning skipped: node ${selected.name} requires unsupported input key '${key}'. ` +
          'WAN will run in text-to-video mode.'
      );
      return;
    }
  }

  const numericIds = Object.keys(workflow)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n));
  const nextBase = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 100;
  const loadImageId = String(nextBase);
  const embedId = String(nextBase + 1);

  workflow[loadImageId] = {
    inputs: {
      // This value will be replaced by the upload step in prepareWorkflow.
      image: '__REFERENCE_IMAGE__',
    },
    class_type: 'LoadImage',
  };

  const embedInputs = {};
  if (requiredKeys.has('image')) embedInputs.image = [loadImageId, 0];
  if (requiredKeys.has('images')) embedInputs.images = [loadImageId, 0];
  if (requiredKeys.has('width') && typeof width === 'number') embedInputs.width = width;
  if (requiredKeys.has('height') && typeof height === 'number') embedInputs.height = height;
  if (requiredKeys.has('num_frames') && typeof numFrames === 'number') embedInputs.num_frames = numFrames;
  if (requiredKeys.has('batch_size') && typeof numFrames === 'number') embedInputs.batch_size = numFrames;
  if (requiredKeys.has('frames') && typeof numFrames === 'number') embedInputs.frames = numFrames;
  if (requiredKeys.has('model')) embedInputs.model = [loaderId, 0];
  if (requiredKeys.has('model_to_offload')) embedInputs.model_to_offload = [loaderId, 0];
  if (requiredKeys.has('force_offload')) embedInputs.force_offload = true;
  if (requiredKeys.has('device')) embedInputs.device = 'gpu';

  workflow[embedId] = {
    inputs: embedInputs,
    class_type: selected.name,
  };

  // Rewire sampler to use the image-conditioned embeds.
  samplerNode.inputs = samplerNode.inputs || {};
  samplerNode.inputs.image_embeds = [embedId, 0];

  // If we successfully injected conditioning, prefer an I2V checkpoint when available.
  // This prevents users from selecting I2V models that would otherwise fail without conditioning,
  // and improves identity consistency when the worker supports I2V.
  try {
    if (loaderNode?.inputs) {
      const choices = (() => {
        const raw = objectInfo?.WanVideoModelLoader?.input?.required?.model?.[0];
        return Array.isArray(raw) ? raw : [];
      })();
      const normalizeModel = (s) => String(s || '').replace(/\\/g, '/').trim().toLowerCase();
      const currentModel = String(loaderNode.inputs.model || '');
      const currentNorm = normalizeModel(currentModel);

      // Only switch if we're not already on an I2V checkpoint and the user/model isn't explicitly T2V.
      // This keeps WAN 2.1 T2V truly prompt-driven when selected.
      if (!currentNorm.includes('i2v') && !currentNorm.includes('t2v')) {
        const i2vCandidates = choices.filter((c) => normalizeModel(c).includes('i2v'));
        if (i2vCandidates.length > 0) {
          // Heuristic: prefer same precision token if present (fp8/fp16)
          const wantsFp8 = currentNorm.includes('fp8');
          const wantsFp16 = currentNorm.includes('fp16');
          let picked = i2vCandidates[0];
          if (wantsFp8) picked = i2vCandidates.find((c) => normalizeModel(c).includes('fp8')) || picked;
          if (wantsFp16) picked = i2vCandidates.find((c) => normalizeModel(c).includes('fp16')) || picked;
          console.log(`🔁 WAN model switch (I2V conditioning enabled): ${currentModel} -> ${picked}`);
          loaderNode.inputs.model = picked;
        }
      }
    }
  } catch {
    // ignore
  }

  console.log(`🎭 WAN I2V conditioning enabled: ${selected.name} (sampler ${samplerId}) using reference image`);
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
  
  console.log(`📤 Uploading image to ComfyUI (worker: ${workerId})...`);
  console.log(`📏 Image size: ${Math.round(base64Image.length / 1024)} KB`);
  
  const worker = getWorkerManager().getWorker(workerId);
  if (!worker) {
    throw new Error(`Worker ${workerId} not found`);
  }

  try {
    // Remove data:image/...;base64, prefix if exists
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(imageData, 'base64');
    
    console.log(`📦 Image buffer size: ${Math.round(buffer.length / 1024)} KB`);
    
    // Use form-data package for creating multipart/form-data
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    const filename = `ref-${Date.now()}.png`;
    form.append('image', buffer, {
      filename: filename,
      contentType: 'image/png'
    });

    console.log(`🌐 Uploading to: ${worker.url}/upload/image`);
    const response = await axios.post(`${worker.url}/upload/image`, form, {
      headers: form.getHeaders()
    });

    console.log(`✅ Upload successful! Response:`, response.data);
    return response.data.name;
  } catch (error) {
    console.error('❌ Failed to upload image to ComfyUI:', error.message);
    if (error.response) {
      console.error('📋 Response data:', error.response.data);
      console.error('📋 Response status:', error.response.status);
    }
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

    // Ensure progress is monotonic and doesn't bounce between polling and WebSocket.
    let lastReportedProgress = 0;
    let lastWsProgressAt = 0;

    const reportProgress = async (progress, details) => {
      if (!progressCb) return;
      const bounded = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
      const next = Math.max(lastReportedProgress, bounded);
      if (next === lastReportedProgress) return;
      lastReportedProgress = next;
      await progressCb(next, details);
    };

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
        if (settled) return;
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
          lastWsProgressAt = Date.now();
          console.log(`📊 WebSocket Progress: ${progress}% (${currentStep}/${totalSteps})`);
          
          await reportProgress(progress, {
            currentStep,
            totalSteps,
            currentNode,
            isVideo: videoFlag,
            numFrames: meta.numFrames,
            source: 'ws'
          });
        }
        
        if (message.type === 'executing' && message.data.node === null) {
          // Execution complete
          console.log(`✅ Job completed (detected via WebSocket)`);
          await reportProgress(100, {
            currentStep: totalSteps,
            totalSteps,
            currentNode: 'complete',
            isVideo: videoFlag,
            numFrames: meta.numFrames,
            source: 'ws'
          });
          
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

      // If WebSocket is delivering progress, do not overwrite with estimated polling.
      // This prevents UI jumps like 0% -> 92% and progress going backwards.
      const wsRecentlyActive = lastWsProgressAt && (Date.now() - lastWsProgressAt) < 15000;
      if (wsRecentlyActive) {
        return;
      }
      
      // Estimate progress based on time elapsed (simple linear estimation)
      // This gives user feedback even if WebSocket doesn't work
      const estimatedProgress = Math.min(90, 10 + (pollCount / maxPolls) * 80);
      
      if (pollCount % 3 === 0) { // Update every 6 seconds
        console.log(`⏳ ComfyUI Polling Progress: ${Math.floor(estimatedProgress)}% (poll ${pollCount}/${maxPolls})`);
        await reportProgress(Math.floor(estimatedProgress), {
          currentStep: pollCount,
          totalSteps: maxPolls,
          currentNode: 'polling',
          isVideo: videoFlag,
          numFrames: meta.numFrames,
          source: 'poll'
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

      // Try to get available model paths.
      // Some ComfyUI builds don't include the full choices list in the top-level /object_info response.
      let modelChoices = objectInfo.WanVideoModelLoader?.input?.required?.model?.[0] || [];
      result.wan.models = Array.isArray(modelChoices) ? modelChoices : [];

      if (result.wan.models.length === 0) {
        try {
          const nodeInfo = await axios.get(`${workerUrl}/object_info/WanVideoModelLoader`, { timeout: 10000 });
          modelChoices = nodeInfo.data?.WanVideoModelLoader?.input?.required?.model?.[0] || [];
          const extra = Array.isArray(modelChoices) ? modelChoices : [];
          if (extra.length > 0) {
            result.wan.models = extra;
          }
        } catch (error) {
          // keep empty; verifyVideoRequirements will provide guidance
          void error;
        }
      }
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

