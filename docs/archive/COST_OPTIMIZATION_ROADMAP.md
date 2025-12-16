# 💰 Cost Optimization & Open Source AI Roadmap

**Date**: 10 ธันวาคม 2568  
**Goal**: ลดต้นทุน เพิ่มการเข้าถึง ด้วย Open Source AI Solutions  
**Current System**: Peace Script AI v1.4 (มี ComfyUI + FLUX + LoRA infrastructure)

---

## 🎯 เป้าหมายหลัก

### 1. ลดต้นทุน (Cost Reduction)
- ลด API costs (Gemini, Veo) จาก $7-50/month → $0-5/month
- ใช้ Open Source models แทน Commercial APIs
- Self-hosted infrastructure (optional)

### 2. เพิ่มการเข้าถึง (Accessibility)
- ไม่จำกัด quota (unlimited generation)
- Offline-capable (optional)
- Community-driven improvements

### 3. ระบบที่ยืดหยุ่น (Flexibility)
- หลายทางเลือก (Hybrid approach)
- Fallback mechanisms
- User preferences

---

## 📊 วิเคราะห์ต้นทุนปัจจุบัน

### Current Cost Breakdown

| Service | Monthly Cost | Usage | Alternative |
|---------|-------------|-------|-------------|
| **Gemini 2.0 Flash** | $0-7 | 1M tokens | Llama 3.2, Qwen 2.5 |
| **Gemini Veo 3.1** | $0-30 | Video gen | ComfyUI + SVD/AnimateDiff |
| **HuggingFace Pro** | $9 | Image gen | Local FLUX/SDXL |
| **Firebase Hosting** | $0 | Unlimited | Keep (good) |
| **Firebase Storage** | $0-5 | 5GB free | Keep + cleanup |
| **Total** | **$9-51/month** | - | **Target: $0-5** |

### Cost Saving Potential

- **Text Generation**: $0-7 → $0 (Open source LLMs)
- **Image Generation**: $9 → $0 (Local ComfyUI)
- **Video Generation**: $0-30 → $0 (Local ComfyUI + SVD)
- **Total Savings**: **$9-51/month → $0-5/month** (89-98% reduction)

---

## 🏗️ Architecture แบบ Hybrid (แนะนำ)

```
┌─────────────────────────────────────────────────────────────┐
│                    Peace Script AI v2.0                     │
│                     (Hybrid System)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
           ┌────────▼────────┐  ┌────────▼─────────┐
           │  Cloud APIs     │  │  Open Source     │
           │  (Tier 1)       │  │  (Tier 2)        │
           └────────┬────────┘  └────────┬─────────┘
                    │                    │
         ┌──────────┼────────┐  ┌────────┼──────────┐
         │          │        │  │        │          │
    ┌────▼──┐  ┌───▼───┐  ┌─▼──▼──┐ ┌──▼────┐ ┌──▼──────┐
    │Gemini│  │ Veo   │  │ FLUX  │ │ SVD   │ │ Llama   │
    │Flash │  │ 3.1   │  │ +LoRA │ │ Video │ │ 3.2     │
    └──────┘  └───────┘  └───────┘ └───────┘ └─────────┘
    (Paid)    (Paid)     (Free)    (Free)    (Free)
    
    Priority: Try Free First → Fallback to Paid if needed
```

---

## 🚀 Implementation Phases

### Phase 1: Open Source Text Generation (Priority: HIGH)
**Timeline**: Week 1-2  
**Impact**: -$0-7/month

#### 1.1 Integration Options

**Option A: Ollama (Local - Recommended ⭐⭐⭐⭐⭐)**
```bash
# Install
brew install ollama

# Download models
ollama pull llama3.2:3b      # Fast, 2GB
ollama pull qwen2.5:7b       # Better quality, 4.7GB
ollama pull deepseek-r1:8b   # Reasoning, 4.9GB

# Start server
ollama serve
```

**Pros**:
- ✅ 100% free, unlimited
- ✅ Offline-capable
- ✅ Fast (local GPU/CPU)
- ✅ Privacy (no data sent out)

**Cons**:
- ⚠️ Requires download (2-5GB)
- ⚠️ Quality slightly lower than Gemini

**Option B: Groq Cloud (Fast Remote - Free Tier)**
```typescript
// Ultra-fast inference (0.5s for script generation)
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY // Free tier
});

const completion = await groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: "llama-3.2-90b-vision-preview", // Free
});
```

**Pros**:
- ✅ Ultra-fast (300+ tokens/sec)
- ✅ Free tier (unlimited?)
- ✅ No installation needed

**Cons**:
- ⚠️ Requires internet
- ⚠️ API key needed

**Option C: Together.ai (Multiple Models)**
```typescript
// Access to 50+ open source models
const response = await fetch('https://api.together.xyz/inference', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOGETHER_API_KEY}`,
  },
  body: JSON.stringify({
    model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    prompt: prompt,
    max_tokens: 2000,
  })
});
```

**Pros**:
- ✅ Many models (Llama, Qwen, Mistral)
- ✅ Free tier ($1 credit)
- ✅ Fast inference

**Cons**:
- ⚠️ Limited free tier

#### 1.2 Implementation Strategy

```typescript
// src/services/textGenerationService.ts
export const TEXT_PROVIDERS = {
  OLLAMA: 'ollama',           // Priority 1: Local, Free
  GROQ: 'groq',               // Priority 2: Fast, Free Cloud
  TOGETHER: 'together',       // Priority 3: Multiple models
  GEMINI: 'gemini',           // Priority 4: Fallback (paid)
};

export async function generateText(prompt: string, options = {}) {
  const providers = [
    TEXT_PROVIDERS.OLLAMA,
    TEXT_PROVIDERS.GROQ,
    TEXT_PROVIDERS.TOGETHER,
    TEXT_PROVIDERS.GEMINI,
  ];
  
  for (const provider of providers) {
    try {
      return await generateWithProvider(provider, prompt, options);
    } catch (error) {
      console.warn(`${provider} failed, trying next...`);
      continue;
    }
  }
  
  throw new Error('All text generation providers failed');
}
```

**Models Recommendation**:
- **Llama 3.2 (3B)**: Fast, good for dialogue
- **Qwen 2.5 (7B)**: Better quality, Thai language support
- **DeepSeek-R1 (8B)**: Best reasoning, code generation
- **Llama 3.1 (70B)**: Highest quality (remote only)

---

### Phase 2: Open Source Image Generation (Priority: HIGH)
**Timeline**: Week 2-3  
**Impact**: -$9/month (HuggingFace)

#### 2.1 Optimize ComfyUI Infrastructure

**Current System** (มีอยู่แล้ว):
- ✅ FLUX.1-dev (16GB) - Best quality
- ✅ SDXL (6.5GB) - Good quality, faster
- ✅ LoRA support (add-detail-xl, Hunt3)
- ✅ ComfyUI backend service

**Improvements Needed**:

**A. Add More Efficient Models**
```bash
# Download to ComfyUI/models/checkpoints/

# FLUX.1-schnell (faster than dev, 16GB)
wget https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors

# SD 1.5 (smaller, 2GB - for low-end devices)
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors

# SDXL Turbo (4 steps only, 6.5GB - ultra fast)
wget https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0.safetensors
```

**B. Add More LoRAs** (Character Consistency)
```bash
# Download to ComfyUI/models/loras/

# Thai style
wget https://civitai.com/api/download/models/xxx -O thai-cinema.safetensors

# Face consistency (InstantID alternative)
wget https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid_sdxl.bin

# Costume reference
wget https://civitai.com/api/download/models/xxx -O costume-ref.safetensors
```

**C. Model Selection Strategy**
```typescript
// src/services/comfyuiModelSelector.ts
export const MODEL_PROFILES = {
  SPEED: {
    checkpoint: 'sdxl_turbo_1.0.safetensors',
    steps: 4,
    cfg: 1.0,
    speed: '⚡⚡⚡ 5s',
  },
  BALANCED: {
    checkpoint: 'sd_xl_base_1.0.safetensors',
    steps: 20,
    cfg: 7.0,
    speed: '⚡⚡ 15s',
  },
  QUALITY: {
    checkpoint: 'flux1-dev.safetensors',
    steps: 28,
    cfg: 3.5,
    speed: '⚡ 30s',
  },
};

export function selectModel(
  generationMode: 'SPEED' | 'BALANCED' | 'QUALITY',
  deviceCapability: 'HIGH' | 'MEDIUM' | 'LOW'
) {
  // Auto-select based on user device
  if (deviceCapability === 'LOW') return MODEL_PROFILES.SPEED;
  if (generationMode === 'SPEED') return MODEL_PROFILES.SPEED;
  if (generationMode === 'QUALITY') return MODEL_PROFILES.QUALITY;
  return MODEL_PROFILES.BALANCED;
}
```

#### 2.2 ComfyUI Backend Optimization

**Current**: Single ComfyUI instance  
**Improvement**: Queue system + Multiple workers

```python
# comfyui-service/queue_manager.py
import redis
from rq import Queue

# Redis queue for job management
redis_conn = redis.Redis(host='localhost', port=6379)
comfyui_queue = Queue('comfyui-jobs', connection=redis_conn)

def submit_job(prompt, workflow):
    """Submit job to queue"""
    job = comfyui_queue.enqueue(
        'workers.comfyui_worker.generate_image',
        prompt,
        workflow,
        job_timeout='5m'
    )
    return job.id

def get_job_status(job_id):
    """Check job status"""
    job = comfyui_queue.fetch_job(job_id)
    return {
        'status': job.get_status(),
        'result': job.result if job.is_finished else None
    }
```

**Benefits**:
- ✅ Handle multiple requests
- ✅ Auto-retry failed jobs
- ✅ Distribute load across workers
- ✅ Priority queue (VIP users first)

---

### Phase 3: Open Source Video Generation (Priority: MEDIUM)
**Timeline**: Week 3-4  
**Impact**: -$0-30/month (Veo 3.1)

#### 3.1 AnimateDiff Integration (Better than SVD)

**Why AnimateDiff?**
- ✅ Better motion quality than SVD
- ✅ Works with any SDXL model
- ✅ LoRA compatible
- ✅ Customizable motion modules

```bash
# Install AnimateDiff nodes
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved

# Download motion modules
cd ComfyUI/custom_nodes/ComfyUI-AnimateDiff-Evolved/motion_modules
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt
wget https://huggingface.co/guoyww/animatediff/resolve/main/mm_sdxl_v10_beta.ckpt
```

**Workflow Builder**:
```typescript
// src/services/comfyuiVideoWorkflowBuilder.ts
export function buildAnimateDiffWorkflow(prompt: string, options = {}) {
  return {
    // Load AnimateDiff motion module
    "1": {
      "inputs": {
        "model_name": "mm_sdxl_v10_beta.ckpt"
      },
      "class_type": "AnimateDiffLoader"
    },
    
    // Base checkpoint
    "2": {
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0.safetensors"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    
    // Apply AnimateDiff
    "3": {
      "inputs": {
        "model": ["2", 0],
        "motion_model": ["1", 0],
        "frame_number": options.frameCount || 16,
        "fps": options.fps || 8
      },
      "class_type": "AnimateDiffCombine"
    },
    
    // ... rest of workflow (KSampler, VAE, etc.)
  };
}
```

#### 3.2 Video Enhancement Options

**Option A: Topaz Video AI (Local)**
- Post-processing for quality
- Upscale to 4K
- Frame interpolation (8fps → 24fps)
- ~$300 one-time (optional)

**Option B: Real-ESRGAN (Free)**
```bash
# Free video upscaling
git clone https://github.com/xinntao/Real-ESRGAN
cd Real-ESRGAN

# Upscale video 2x
python inference_realesrgan_video.py \
  -i input_video.mp4 \
  -o output_video.mp4 \
  -s 2
```

---

### Phase 4: Self-Hosted Backend (Priority: LOW)
**Timeline**: Week 5-6  
**Impact**: Complete independence

#### 4.1 Hardware Options

**Option A: Personal GPU Server**
- RTX 4090 (24GB): ~$1,600
- Supports: FLUX, SDXL, AnimateDiff
- Speed: FLUX 20s, Video 60s
- Cost: $0/month after purchase

**Option B: Cloud GPU (On-demand)**
- RunPod: $0.34/hour (RTX 4090)
- Vast.ai: $0.25/hour (RTX 3090)
- Lambda Labs: $0.50/hour (A100)
- Use only when needed

**Option C: Google Colab Pro+**
- $50/month unlimited
- A100 GPU access
- Good for testing/development

#### 4.2 Docker Setup

```dockerfile
# Dockerfile.comfyui-complete
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install ComfyUI + All models
RUN git clone https://github.com/comfyanonymous/ComfyUI && \
    cd ComfyUI && \
    pip install -r requirements.txt

# Download models (cached)
COPY download_models.sh /app/
RUN bash /app/download_models.sh

# Install custom nodes
RUN cd /app/ComfyUI/custom_nodes && \
    git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved

EXPOSE 8188
CMD ["python", "main.py", "--listen", "0.0.0.0"]
```

---

## 📋 Feature Roadmap by Priority

### 🔴 Priority 1: Immediate Cost Reduction (Week 1-2)

1. **Text Generation → Ollama/Groq**
   - [ ] Install Ollama locally
   - [ ] Download Llama 3.2 (3B) + Qwen 2.5 (7B)
   - [ ] Integrate Groq API (free tier)
   - [ ] Update `geminiService.ts` with fallback chain
   - [ ] Test script generation quality

2. **Image Generation → Optimize ComfyUI**
   - [ ] Add SDXL Turbo (4-step generation)
   - [ ] Implement model selection based on user preference
   - [ ] Add device capability detection
   - [ ] Update UI with "Speed/Balanced/Quality" toggle

**Expected Savings**: -$7-16/month

---

### 🟡 Priority 2: Enhanced Features (Week 3-4)

3. **Video Generation → AnimateDiff**
   - [ ] Install AnimateDiff nodes
   - [ ] Download motion modules
   - [ ] Build AnimateDiff workflow
   - [ ] Integrate with existing video service
   - [ ] Add motion presets (slow/medium/fast)

4. **Character Consistency → IP-Adapter FaceID**
   - [ ] Download IP-Adapter FaceID model
   - [ ] Integrate face extraction
   - [ ] Update character generation workflow
   - [ ] Test character consistency across scenes

**Expected Savings**: -$9-30/month

---

### 🟢 Priority 3: Advanced Optimization (Week 5-6)

5. **Queue System → Redis + RQ**
   - [ ] Setup Redis server
   - [ ] Implement job queue
   - [ ] Add progress tracking
   - [ ] Build admin dashboard

6. **Model Management → Auto-Download**
   - [ ] Build model downloader UI
   - [ ] Track available models
   - [ ] Auto-select optimal model
   - [ ] Clean up unused models

---

### 🔵 Priority 4: Future Enhancements (Week 7+)

7. **Multi-Language Text Models**
   - [ ] Add Thai-specific models (WangchanBERTa)
   - [ ] Fine-tune for screenplay format
   - [ ] Implement few-shot prompting

8. **Community LoRA Hub**
   - [ ] Allow users to upload custom LoRAs
   - [ ] Rate and review LoRAs
   - [ ] Auto-tag and categorize
   - [ ] Share custom styles

---

## 💡 Implementation Guide

### Step 1: Text Generation (Ollama)

```bash
# Install Ollama
brew install ollama

# Start server
ollama serve &

# Download models
ollama pull llama3.2:3b
ollama pull qwen2.5:7b
```

```typescript
// src/services/ollamaService.ts
export async function generateWithOllama(
  prompt: string,
  model: string = 'llama3.2:3b'
): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
    }),
  });
  
  const data = await response.json();
  return data.response;
}
```

### Step 2: Update Text Generation Service

```typescript
// src/services/textGenerationService.ts
import { generateWithOllama } from './ollamaService';
import { generateWithGroq } from './groqService';
import { generateWithGemini } from './geminiService';

export async function generateScript(prompt: string): Promise<string> {
  const providers = [
    { name: 'Ollama', fn: () => generateWithOllama(prompt, 'qwen2.5:7b') },
    { name: 'Groq', fn: () => generateWithGroq(prompt) },
    { name: 'Gemini', fn: () => generateWithGemini(prompt) },
  ];
  
  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name}...`);
      const result = await provider.fn();
      console.log(`✅ ${provider.name} succeeded`);
      return result;
    } catch (error) {
      console.warn(`❌ ${provider.name} failed:`, error);
      continue;
    }
  }
  
  throw new Error('All text generation providers failed');
}
```

### Step 3: Add Model Selection UI

```typescript
// src/components/ModelSelector.tsx
export function ModelSelector() {
  const [textModel, setTextModel] = useState('auto');
  const [imageModel, setImageModel] = useState('balanced');
  
  return (
    <div className="model-selector">
      <h3>🤖 AI Model Settings</h3>
      
      <div>
        <label>Text Generation:</label>
        <select value={textModel} onChange={(e) => setTextModel(e.target.value)}>
          <option value="auto">Auto (Free → Paid)</option>
          <option value="ollama">Ollama (Free, Local)</option>
          <option value="groq">Groq (Free, Cloud)</option>
          <option value="gemini">Gemini (Paid, Best)</option>
        </select>
      </div>
      
      <div>
        <label>Image Quality:</label>
        <select value={imageModel} onChange={(e) => setImageModel(e.target.value)}>
          <option value="speed">Speed (4 steps, 5s)</option>
          <option value="balanced">Balanced (20 steps, 15s)</option>
          <option value="quality">Quality (28 steps, 30s)</option>
        </select>
      </div>
    </div>
  );
}
```

---

## 📊 Cost Comparison

### Before (Current)
```
Monthly Costs:
- Gemini API: $0-7
- HuggingFace Pro: $9
- Veo 3.1: $0-30 (usage-based)
- Firebase: $0-5
━━━━━━━━━━━━━━━━━━━━
Total: $9-51/month
```

### After (Phase 1-2)
```
Monthly Costs:
- Text Generation: $0 (Ollama/Groq)
- Image Generation: $0 (Local ComfyUI)
- Video Generation: $0 (AnimateDiff)
- Firebase: $0-5
━━━━━━━━━━━━━━━━━━━━
Total: $0-5/month
Savings: 89-98%
```

### After (Phase 4 - Self-Hosted)
```
One-time: RTX 4090 ~$1,600
Monthly: Electricity ~$5
━━━━━━━━━━━━━━━━━━━━
Total: $5/month (after 6 months ROI)
Savings: 90-100%
```

---

## 🎯 Success Metrics

### Quantitative
- ✅ Reduce monthly cost by 89-98%
- ✅ Increase generation speed by 50%+
- ✅ Support 1000+ users simultaneously
- ✅ 99.9% uptime (queue system)

### Qualitative
- ✅ User can choose speed/quality trade-off
- ✅ No quota limits (unlimited generation)
- ✅ Privacy (local processing option)
- ✅ Community-driven improvements

---

## 🔧 Technical Stack (Updated)

### Text Generation
- **Ollama** (Local, Free) - Primary
- **Groq** (Cloud, Free) - Backup
- **Together.ai** (Cloud, Free tier) - Alternative
- **Gemini** (Cloud, Paid) - Fallback

### Image Generation
- **ComfyUI + FLUX** (Local/Cloud, Free) - Primary
- **ComfyUI + SDXL** (Local/Cloud, Free) - Balanced
- **ComfyUI + SD 1.5** (Local/Cloud, Free) - Speed
- **HuggingFace** (Cloud, Paid) - Fallback

### Video Generation
- **AnimateDiff** (Local/Cloud, Free) - Primary
- **SVD** (Local/Cloud, Free) - Alternative
- **Veo 3.1** (Cloud, Paid) - Fallback

### Infrastructure
- **Redis** - Job queue
- **RQ (Python)** - Worker management
- **Docker** - Deployment
- **Firebase** - Database + Storage

---

## 🚦 Risk Mitigation

### Risk 1: Local Models Lower Quality
**Mitigation**:
- Provide quality slider (Speed/Balanced/Quality)
- Use ensemble (multiple models vote)
- Fine-tune on Thai screenplay data
- Always keep paid API as fallback

### Risk 2: Setup Complexity
**Mitigation**:
- One-click installers
- Docker containers (pre-configured)
- Detailed documentation
- Video tutorials

### Risk 3: Hardware Requirements
**Mitigation**:
- Offer cloud backend (shared ComfyUI)
- Support lightweight models (SD 1.5, Llama 3.2 3B)
- Auto-detect device capability
- Graceful degradation

### Risk 4: User Adoption
**Mitigation**:
- Default to "Auto" mode (try free first)
- Show cost savings in UI
- Gamify (earn credits for using free)
- Community showcase (user-generated content)

---

## 📅 Timeline Summary

| Phase | Duration | Focus | Cost Impact |
|-------|----------|-------|-------------|
| Phase 1 | Week 1-2 | Text + Image (Local) | -$16/month |
| Phase 2 | Week 3-4 | Video + Character | -$30/month |
| Phase 3 | Week 5-6 | Queue + Optimization | Scalability |
| Phase 4 | Week 7+ | Self-hosted + Community | Independence |

**Total Timeline**: 6-8 weeks to complete  
**Total Cost Savings**: $9-51 → $0-5 per month (89-98%)

---

## ✅ Next Actions

### Immediate (This Week)
1. [ ] Install Ollama locally
2. [ ] Test Llama 3.2 vs Qwen 2.5 quality
3. [ ] Download SDXL Turbo for ComfyUI
4. [ ] Setup Groq API account (free)
5. [ ] Update `geminiService.ts` with provider chain

### Short-term (Next Week)
6. [ ] Integrate Ollama into Peace Script
7. [ ] Add model selector UI
8. [ ] Test AnimateDiff for video
9. [ ] Setup Redis queue (optional)
10. [ ] Document cost savings for users

### Long-term (Month 2+)
11. [ ] Build admin dashboard
12. [ ] Community LoRA hub
13. [ ] Self-hosted option
14. [ ] Fine-tune Thai models
15. [ ] Write comprehensive docs

---

**Status**: Ready to implement  
**Investment**: $0-1,600 (optional GPU)  
**ROI**: 6 months (if buying GPU)  
**Monthly Savings**: $9-51 → $0-5 (89-98%)

🚀 **Let's build the most cost-effective AI screenplay platform!**
