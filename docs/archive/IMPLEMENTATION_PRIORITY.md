# 🎯 Peace Script AI - Implementation Priority

**Updated**: 10 ธันวาคม 2568  
**Focus**: พัฒนา ComfyUI + LoRA + Open Source เพื่อลดต้นทุนและเป็นทางเลือก

---

## 📋 Current Status

✅ **Completed**:
- i18n implementation (513 keys, Thai + English)
- Production deployment (https://peace-script-ai.web.app)
- Multi-tier AI system (Gemini → HuggingFace → ComfyUI)
- Basic ComfyUI integration (FLUX, SDXL, SVD)
- LoRA support (Character Consistency, Cinematic Style)
- Documentation (1,400+ lines)

⏸️ **On Hold**:
- New pricing model changes
- Trial system implementation
- Subscription management overhaul

🔄 **Current Focus**:
- **Optimize ComfyUI infrastructure**
- **Enhance LoRA models**
- **Integrate open source alternatives**
- **Reduce API costs**
- **Provide user choice** (Cloud vs Open Source)

---

## 🎯 Phase 1: ComfyUI Optimization (Week 1-2) - PRIORITY

### Goal: ทำให้ ComfyUI เป็นทางเลือกหลักที่ใช้งานได้จริง

#### 1.1 Add Efficient Models
**Priority: HIGH**
```bash
# Download to ComfyUI/models/checkpoints/

# FLUX.1-schnell (faster than dev, same quality)
wget https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors

# SDXL Turbo (4 steps only - ultra fast)
wget https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0.safetensors

# SD 1.5 (for low-end devices)
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
```

**Tasks**:
- [ ] Download FLUX.1-schnell
- [ ] Download SDXL Turbo
- [ ] Test generation speed (target: 10s for SDXL Turbo, 20s for FLUX schnell)
- [ ] Update workflow builder to support new models
- [ ] Add model auto-selection based on user's hardware

**Expected Impact**: 
- Speed: 2-3x faster than current FLUX.1-dev
- Cost: ฿0 (vs ฿16.80 per image with Gemini Imagen)
- Quality: Same as FLUX.1-dev

---

#### 1.2 Optimize ComfyUI Backend Service
**Priority: HIGH**

**Current Issues**:
- Single worker (can't handle multiple requests)
- No queue system
- No auto-scaling

**Solution**: Implement Redis + Bull queue
```typescript
// src/services/comfyuiQueueManager.ts
import Queue from 'bull';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});

const imageQueue = new Queue('comfyui-images', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

const videoQueue = new Queue('comfyui-videos', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

// Add job to queue
export async function queueImageGeneration(prompt: string, options: any) {
  const job = await imageQueue.add(
    {
      prompt,
      options,
      userId: options.userId,
      tier: options.tier || 'free',
    },
    {
      priority: options.tier === 'pro' ? 1 : 10, // PRO users get priority
      attempts: 3,
      backoff: 5000,
    }
  );
  
  return job.id;
}

// Get job status
export async function getJobStatus(jobId: string) {
  const job = await imageQueue.getJob(jobId);
  
  if (!job) return { status: 'not_found' };
  
  const state = await job.getState();
  
  return {
    status: state,
    progress: job.progress(),
    result: job.returnvalue,
    failedReason: job.failedReason,
  };
}
```

**Tasks**:
- [ ] Install Redis (local or cloud)
- [ ] Implement Bull queue system
- [ ] Add job status tracking
- [ ] Build progress indicator UI
- [ ] Add auto-retry for failed jobs
- [ ] Implement priority queue (PRO users first)

**Expected Impact**:
- Handle 10x more concurrent users
- Fair queue system (no blocking)
- Better UX with progress tracking

---

#### 1.3 Model Selection Strategy
**Priority: MEDIUM**

```typescript
// src/services/comfyuiModelSelector.ts
export const MODEL_PROFILES = {
  SPEED: {
    checkpoint: 'sd_xl_turbo_1.0.safetensors',
    steps: 4,
    cfg: 1.0,
    resolution: '1024x1024',
    estimatedTime: '5s',
    quality: '⭐⭐⭐',
    vram: '6GB',
  },
  BALANCED: {
    checkpoint: 'sd_xl_base_1.0.safetensors',
    steps: 20,
    cfg: 7.0,
    resolution: '1024x1024',
    estimatedTime: '15s',
    quality: '⭐⭐⭐⭐',
    vram: '8GB',
  },
  QUALITY: {
    checkpoint: 'flux1-schnell.safetensors',
    steps: 8,
    cfg: 3.5,
    resolution: '1024x1024',
    estimatedTime: '20s',
    quality: '⭐⭐⭐⭐⭐',
    vram: '12GB',
  },
  BEST: {
    checkpoint: 'flux1-dev.safetensors',
    steps: 28,
    cfg: 3.5,
    resolution: '2048x2048',
    estimatedTime: '45s',
    quality: '⭐⭐⭐⭐⭐',
    vram: '16GB',
  },
};

export function selectOptimalModel(
  userPreference: 'speed' | 'balanced' | 'quality' | 'best',
  availableVRAM: number
): ModelProfile {
  const profile = MODEL_PROFILES[userPreference.toUpperCase()];
  
  // Downgrade if not enough VRAM
  if (profile.vram > availableVRAM) {
    if (availableVRAM >= 12) return MODEL_PROFILES.QUALITY;
    if (availableVRAM >= 8) return MODEL_PROFILES.BALANCED;
    return MODEL_PROFILES.SPEED;
  }
  
  return profile;
}
```

**Tasks**:
- [ ] Detect user's GPU VRAM
- [ ] Auto-select optimal model
- [ ] Add user preference UI (Speed/Balanced/Quality/Best)
- [ ] Show estimated time before generation

---

## 🎨 Phase 2: LoRA Enhancement (Week 2-3) - PRIORITY

### Goal: ปรับปรุง LoRA models สำหรับ Thai film production

#### 2.1 Download More LoRA Models
**Priority: HIGH**

```bash
# ComfyUI/models/loras/

# Character Consistency (better than current)
wget https://civitai.com/api/download/models/403131 -O ip-adapter-faceid-plusv2_sdxl.safetensors

# Thai Cinema Style
wget https://civitai.com/api/download/models/xxx -O thai-cinema-style.safetensors

# Realistic Details
wget https://huggingface.co/latent-consistency/lcm-lora-sdxl/resolve/main/pytorch_lora_weights.safetensors -O lcm-lora-sdxl.safetensors

# Film Grain & Cinematic Look
wget https://civitai.com/api/download/models/xxx -O cinematic-film-grain.safetensors
```

**Tasks**:
- [ ] Research Thai cinema LoRA models
- [ ] Download IP-Adapter FaceID Plus v2 (better character consistency)
- [ ] Test LCM LoRA (faster generation)
- [ ] Create custom LoRA list for Thai films
- [ ] Update LoRA selector UI

**Expected Impact**:
- Better character consistency across scenes
- Thai cultural authenticity
- Faster generation with LCM LoRA

---

#### 2.2 LoRA Combination Strategy
**Priority: MEDIUM**

```typescript
// src/services/loraComposer.ts
export const LORA_PRESETS = {
  CHARACTER_CONSISTENCY: [
    { name: 'ip-adapter-faceid-plusv2_sdxl', strength: 0.8 },
    { name: 'add-detail-xl', strength: 0.5 },
  ],
  
  THAI_CINEMA: [
    { name: 'thai-cinema-style', strength: 0.7 },
    { name: 'cinematic-film-grain', strength: 0.4 },
  ],
  
  FAST_GENERATION: [
    { name: 'lcm-lora-sdxl', strength: 1.0 },
  ],
  
  ULTRA_REALISTIC: [
    { name: 'add-detail-xl', strength: 0.8 },
    { name: 'Hunt3', strength: 0.6 },
    { name: 'ip-adapter-faceid-plusv2_sdxl', strength: 0.7 },
  ],
};

export function buildLoraWorkflow(
  basePrompt: string,
  preset: keyof typeof LORA_PRESETS,
  referenceImage?: string
): ComfyUIWorkflow {
  const loras = LORA_PRESETS[preset];
  
  // Build workflow with multiple LoRAs chained
  // ...implementation
}
```

**Tasks**:
- [ ] Create LoRA preset system
- [ ] Test LoRA combinations
- [ ] Optimize LoRA strength values
- [ ] Add LoRA preset UI selector

---

## 🔓 Phase 3: Open Source Integration (Week 3-4) - MEDIUM PRIORITY

### Goal: ให้ user เลือกใช้ open source แทน paid APIs ได้

#### 3.1 Text Generation - Ollama Integration
**Priority: MEDIUM**

```typescript
// src/services/ollamaService.ts
export async function generateWithOllama(
  prompt: string,
  model: string = 'llama3.2:3b'
): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });
    
    if (!response.ok) throw new Error('Ollama generation failed');
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama error:', error);
    throw error;
  }
}

// Models to support
export const OLLAMA_MODELS = {
  FAST: 'llama3.2:3b',        // 2GB, fast
  BALANCED: 'qwen2.5:7b',     // 4.7GB, better quality
  QUALITY: 'deepseek-r1:8b',  // 4.9GB, best reasoning
  THAI: 'typhoon-7b',         // Thai language support (if available)
};
```

**Setup Guide**:
```bash
# Install Ollama
brew install ollama  # macOS
# or download from ollama.ai

# Start server
ollama serve &

# Download models
ollama pull llama3.2:3b
ollama pull qwen2.5:7b
ollama pull deepseek-r1:8b
```

**Tasks**:
- [ ] Implement Ollama service
- [ ] Create Ollama setup guide
- [ ] Add model auto-download
- [ ] Test quality vs Gemini
- [ ] Add fallback to Gemini if Ollama fails

**Expected Impact**:
- Cost: ฿0 (vs ฿0.01-0.35 per generation with Gemini)
- Quality: 80-90% of Gemini quality
- Privacy: 100% local processing

---

#### 3.2 Provider Selection System
**Priority: HIGH**

```typescript
// src/components/ProviderSelector.tsx
export function ProviderSelector() {
  const [mode, setMode] = useState<'cloud' | 'opensource' | 'hybrid'>('hybrid');
  
  return (
    <div className="provider-selector">
      <h3>🤖 AI Provider Mode</h3>
      
      <div className="mode-cards">
        {/* Cloud Mode */}
        <div 
          className={`mode-card ${mode === 'cloud' ? 'active' : ''}`}
          onClick={() => setMode('cloud')}
        >
          <h4>☁️ Cloud APIs</h4>
          <p className="speed">⚡⚡⚡⚡ Fastest (3-10s)</p>
          <p className="quality">⭐⭐⭐⭐⭐ Best Quality</p>
          <p className="cost">💰 Uses credits/API costs</p>
          <ul>
            <li>✅ Gemini 2.0 Flash (text)</li>
            <li>✅ Gemini Imagen 3 (image)</li>
            <li>✅ Veo 3.1 (video)</li>
            <li>✅ No setup needed</li>
          </ul>
        </div>
        
        {/* Open Source Mode */}
        <div 
          className={`mode-card ${mode === 'opensource' ? 'active' : ''}`}
          onClick={() => setMode('opensource')}
        >
          <h4>🔓 Open Source</h4>
          <p className="speed">⚡⚡ Medium (20-60s)</p>
          <p className="quality">⭐⭐⭐⭐ Good Quality</p>
          <p className="cost">💚 100% FREE</p>
          <ul>
            <li>✅ Ollama + Llama 3.2 (text)</li>
            <li>✅ ComfyUI + FLUX (image)</li>
            <li>✅ AnimateDiff (video)</li>
            <li>⚠️ Requires GPU or cloud hosting</li>
          </ul>
        </div>
        
        {/* Hybrid Mode */}
        <div 
          className={`mode-card recommended ${mode === 'hybrid' ? 'active' : ''}`}
          onClick={() => setMode('hybrid')}
        >
          <div className="badge">⭐ แนะนำ</div>
          <h4>🔀 Hybrid</h4>
          <p className="speed">⚡⚡⚡ Fast (10-30s)</p>
          <p className="quality">⭐⭐⭐⭐⭐ Excellent</p>
          <p className="cost">💎 Best Value (mostly free)</p>
          <ul>
            <li>✅ Try Open Source first</li>
            <li>✅ Fallback to Cloud if needed</li>
            <li>✅ Smart cost optimization</li>
            <li>✅ Best of both worlds</li>
          </ul>
        </div>
      </div>
      
      {/* Cost Estimator */}
      <div className="cost-estimate">
        <h4>💰 ประมาณการค่าใช้จ่าย (1 โปรเจกต์)</h4>
        <table>
          <tr>
            <td>Text (script generation):</td>
            <td>{mode === 'cloud' ? '฿0.35' : '฿0'}</td>
          </tr>
          <tr>
            <td>Images (12 storyboards):</td>
            <td>{mode === 'cloud' ? '฿16.80' : '฿0'}</td>
          </tr>
          <tr>
            <td>Video (1 preview):</td>
            <td>{mode === 'cloud' ? '฿17.50' : '฿0'}</td>
          </tr>
          <tr className="total">
            <td><strong>Total:</strong></td>
            <td><strong>{mode === 'cloud' ? '฿34.65' : mode === 'opensource' ? '฿0' : '฿5-15'}</strong></td>
          </tr>
        </table>
      </div>
    </div>
  );
}
```

**Tasks**:
- [ ] Build ProviderSelector UI
- [ ] Implement mode switching
- [ ] Add cost tracking
- [ ] Save user preference
- [ ] Show real-time cost updates

---

## 📊 Phase 4: Cost Analytics & Reporting (Week 4) - LOW PRIORITY

### Goal: ให้ user เห็นว่าประหยัดได้เท่าไหร่

#### 4.1 Usage Dashboard
```typescript
// src/components/UsageDashboard.tsx
export function UsageDashboard() {
  const [stats, setStats] = useState({
    totalGenerations: 0,
    cloudGenerations: 0,
    opensourceGenerations: 0,
    totalCost: 0,
    savedMoney: 0,
  });
  
  return (
    <div className="usage-dashboard">
      <h3>📊 การใช้งานของคุณ (เดือนนี้)</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalGenerations}</div>
          <div className="stat-label">สร้างทั้งหมด</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">฿{stats.totalCost.toFixed(2)}</div>
          <div className="stat-label">ค่าใช้จ่ายจริง</div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-value">฿{stats.savedMoney.toFixed(2)}</div>
          <div className="stat-label">ประหยัดได้ 💚</div>
        </div>
      </div>
      
      <div className="provider-breakdown">
        <h4>แบ่งตาม Provider:</h4>
        <div className="provider-bar">
          <div 
            className="bar opensource"
            style={{ width: `${(stats.opensourceGenerations / stats.totalGenerations) * 100}%` }}
          >
            Open Source: {stats.opensourceGenerations}
          </div>
          <div 
            className="bar cloud"
            style={{ width: `${(stats.cloudGenerations / stats.totalGenerations) * 100}%` }}
          >
            Cloud: {stats.cloudGenerations}
          </div>
        </div>
      </div>
      
      <div className="recommendation">
        {stats.opensourceGenerations / stats.totalGenerations > 0.8 ? (
          <p>✅ เยี่ยม! คุณใช้ Open Source 80%+ ประหยัดได้มาก!</p>
        ) : (
          <p>💡 ลอง Open Source Mode เพื่อลดค่าใช้จ่ายมากขึ้น</p>
        )}
      </div>
    </div>
  );
}
```

**Tasks**:
- [ ] Track usage by provider
- [ ] Calculate cost savings
- [ ] Build usage dashboard
- [ ] Add monthly reports
- [ ] Show recommendations

---

## ✅ Implementation Checklist

### Week 1-2: ComfyUI Optimization
- [ ] Download FLUX.1-schnell, SDXL Turbo models
- [ ] Test generation speed
- [ ] Implement Redis + Bull queue
- [ ] Add progress tracking UI
- [ ] Build model selector
- [ ] Update documentation

### Week 2-3: LoRA Enhancement
- [ ] Research & download Thai cinema LoRAs
- [ ] Download IP-Adapter FaceID Plus v2
- [ ] Test LoRA combinations
- [ ] Create LoRA presets
- [ ] Build LoRA selector UI

### Week 3-4: Open Source Integration
- [ ] Implement Ollama service
- [ ] Create setup guides
- [ ] Build Provider Selector UI
- [ ] Test hybrid mode
- [ ] Add cost tracking

### Week 4: Polish & Documentation
- [ ] Build usage dashboard
- [ ] Write user guides
- [ ] Create video tutorials
- [ ] Performance optimization
- [ ] Final testing

---

## 🎯 Success Metrics

### Technical Metrics
- ✅ ComfyUI generation time: <20s (FLUX schnell)
- ✅ Queue system: Handle 50+ concurrent users
- ✅ LoRA quality: 90%+ character consistency
- ✅ Ollama quality: 85%+ vs Gemini

### Business Metrics
- ✅ Cost per user: Reduce from ฿34 → ฿5-10 (70% reduction)
- ✅ Open Source adoption: 60%+ of generations
- ✅ User satisfaction: 85%+ with hybrid mode
- ✅ API cost reduction: 70-90%

### User Experience
- ✅ Clear provider choice (Cloud vs Open Source)
- ✅ Transparent cost display
- ✅ Usage analytics dashboard
- ✅ One-click setup guides

---

## 📝 Documentation To Update

### User-Facing
- [ ] `COST_OPTIMIZATION_ROADMAP.md` - Keep current, add progress tracking
- [ ] `COMFYUI_SETUP.md` - Update with new models
- [ ] `OLLAMA_SETUP.md` - Create new guide
- [ ] `PROVIDER_COMPARISON.md` - Create new comparison guide
- [ ] `FAQ.md` - Add open source questions

### Developer
- [ ] `src/services/README.md` - Update architecture
- [ ] `CONTRIBUTING.md` - Add LoRA contribution guide
- [ ] `DEPLOYMENT.md` - Update with Redis setup
- [ ] API documentation

---

## 🚀 Next Actions (This Week)

### Immediate (Day 1-2)
1. Download FLUX.1-schnell and test
2. Download SDXL Turbo and benchmark
3. Setup Redis locally
4. Implement basic queue system

### Short-term (Day 3-5)
5. Build Provider Selector UI
6. Implement Ollama integration
7. Test hybrid fallback mechanism
8. Create setup documentation

### This Week
9. Deploy to staging
10. Internal testing with team
11. Collect feedback
12. Prepare for beta launch

---

**Current Focus**: ✅ ใช้ pricing เดิม, พัฒนา ComfyUI + LoRA + Open Source เป็นทางเลือก  
**Goal**: ลดต้นทุน API 70-90%, ให้ user เลือกได้ตามความต้องการ  
**Timeline**: 4 สัปดาห์

🎬 **Let's build the best cost-effective AI filmmaking tool!**
