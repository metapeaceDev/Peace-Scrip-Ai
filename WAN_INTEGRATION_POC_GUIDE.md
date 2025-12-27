# WAN Integration: Proof of Concept Guide

> **สถานะ:** 🚧 แนวทางการพัฒนา (ยังไม่เริ่มดำเนินการ)  
> **เวลาประมาณ:** 2 สัปดาห์  
> **ความเสี่ยง:** Medium-High  

---

## 📋 เป้าหมาย POC

ทดสอบความเป็นไปได้ในการนำ WAN 2.1 T2V มาใช้ในระบบ โดยเปรียบเทียบกับ AnimateDiff และ Gemini Veo 2

**Success Criteria:**
- ✅ WAN สามารถสร้างวิดีโอได้สำเร็จ
- ✅ คุณภาพดีกว่า AnimateDiff อย่างน้อย 20%
- ✅ ราคาถูกกว่า Gemini อย่างน้อย 30%
- ✅ เวลาไม่เกิน Gemini + 50%
- ✅ RTX 5090 24GB รองรับได้

---

## 🎯 Week 1: Setup & Basic Testing

### Day 1-2: ComfyUI-WanVideoWrapper Installation

#### ขั้นตอนที่ 1: ติดตั้ง Custom Nodes

```bash
cd ComfyUI/custom_nodes

# Clone ComfyUI-WanVideoWrapper
git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
cd ComfyUI-WanVideoWrapper

# Install dependencies
pip install -r requirements.txt

# ตรวจสอบการติดตั้ง
python test_installation.py
```

#### ขั้นตอนที่ 2: Download WAN 2.1 T2V 1.3B Model

```bash
# สร้างโฟลเดอร์สำหรับ models
mkdir -p ComfyUI/models/wan/checkpoints

# Download from HuggingFace
huggingface-cli download \
  Kijai/WanVideoFun \
  models/wan-2.1-t2v-1.3b.safetensors \
  --local-dir ComfyUI/models/wan/

# ตรวจสอบไฟล์
ls -lh ComfyUI/models/wan/checkpoints/
# Expected: wan-2.1-t2v-1.3b.safetensors (~8.5 GB)
```

#### ขั้นตอนที่ 3: Test Basic Workflow

```json
{
  "1": {
    "inputs": {
      "model_path": "wan-2.1-t2v-1.3b.safetensors"
    },
    "class_type": "WanVideoFunModelLoader"
  },
  "2": {
    "inputs": {
      "prompt": "A cat walking in the garden",
      "negative_prompt": "blurry, low quality",
      "num_frames": 16,
      "fps": 8,
      "width": 512,
      "height": 512,
      "model": ["1", 0]
    },
    "class_type": "WanVideoFunTextToVideo"
  },
  "3": {
    "inputs": {
      "frames": ["2", 0],
      "fps": 8,
      "format": "video/h264-mp4"
    },
    "class_type": "VHS_VideoCombine"
  }
}
```

**ทดสอบ:**
```bash
# ใน ComfyUI terminal, ดู logs
# Expected:
# - Loading WAN model... ✓
# - Generating frames 1/16... ✓
# - Saving video... ✓
```

---

### Day 3-4: Performance Benchmarking

#### Test Suite

```javascript
// test-wan-performance.js
const tests = [
  {
    name: "Basic T2V (16 frames, 512x512)",
    prompt: "A peaceful sunset over mountains",
    numFrames: 16,
    width: 512,
    height: 512,
  },
  {
    name: "Complex Motion (16 frames, 512x512)",
    prompt: "A dancer performing ballet, graceful movements, studio lighting",
    numFrames: 16,
    width: 512,
    height: 512,
  },
  {
    name: "High Resolution (16 frames, 720p)",
    prompt: "A city street at night, neon lights, cinematic",
    numFrames: 16,
    width: 1280,
    height: 720,
  }
];

// Run benchmarks
for (const test of tests) {
  console.log(`\n=== ${test.name} ===`);
  const startTime = Date.now();
  
  // Generate video (will implement in Week 2)
  const result = await generateWanVideo(test);
  
  const duration = Date.now() - startTime;
  console.log(`Time: ${(duration / 1000 / 60).toFixed(2)} min`);
  console.log(`Cost: $${calculateCost(duration)}`);
  console.log(`VRAM Peak: ${result.vramPeak} GB`);
}
```

**Metrics to Track:**
- ⏱️ Generation time per frame
- 💾 VRAM usage (idle → peak → stable)
- 💰 Cost per video
- ⭐ Quality score (manual rating 1-5)
- 🎯 Success rate

---

### Day 5-7: Quality Comparison

#### Comparison Matrix

| Test | AnimateDiff | WAN 1.3B | Gemini Veo 2 | Winner |
|------|------------|----------|--------------|--------|
| **Sunset scene** | ⭐⭐⭐ | ? | ⭐⭐⭐⭐⭐ | ? |
| **Complex motion** | ⭐⭐ | ? | ⭐⭐⭐⭐⭐ | ? |
| **Character animation** | ⭐⭐⭐ | ? | ⭐⭐⭐⭐ | ? |
| **Camera movement** | ❌ | ? | ⭐⭐⭐⭐⭐ | ? |

**Evaluation Criteria:**
1. **Motion Quality** - ความนุ่มนวลของการเคลื่อนไหว
2. **Detail Preservation** - ความคมชัดและรายละเอียด
3. **Temporal Consistency** - ความต่อเนื่องระหว่างเฟรม
4. **Prompt Adherence** - ตรงกับ prompt มากน้อยแค่ไหน
5. **Artifacts** - มี artifacts/glitches หรือไม่

---

## 🎯 Week 2: Integration POC

### Day 8-10: Create WAN Client Wrapper

#### File Structure

```
comfyui-service/src/
├── services/
│   ├── wanClient.js          # 🆕 WAN API client
│   └── wanWorkflowBuilder.js  # 🆕 WAN workflow generator
└── routes/
    └── wan.js                 # 🆕 WAN API endpoints
```

#### wanClient.js (Minimal Version)

```javascript
/**
 * WAN Video Client
 * 
 * Handles WAN video generation via ComfyUI-WanVideoWrapper
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class WanClient {
  constructor(worker) {
    this.worker = worker;
    this.url = worker.url;
  }

  /**
   * Generate video using WAN T2V
   */
  async generateTextToVideo(params) {
    const {
      prompt,
      negativePrompt = 'blurry, low quality',
      numFrames = 16,
      fps = 8,
      width = 512,
      height = 512,
      model = 'wan-2.1-t2v-1.3b.safetensors',
      onProgress
    } = params;

    const workflow = this.buildT2VWorkflow({
      prompt,
      negativePrompt,
      numFrames,
      fps,
      width,
      height,
      model
    });

    const promptId = uuidv4();
    
    try {
      // Submit to ComfyUI
      const response = await axios.post(`${this.url}/prompt`, {
        prompt: workflow,
        client_id: promptId
      });

      const { prompt_id } = response.data;
      console.log(`🎬 WAN T2V submitted: ${prompt_id}`);

      // Track progress (similar to AnimateDiff)
      const result = await this.trackProgress(
        prompt_id,
        onProgress,
        numFrames
      );

      return result;

    } catch (error) {
      console.error('❌ WAN generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Build WAN T2V workflow
   */
  buildT2VWorkflow(params) {
    return {
      "1": {
        "inputs": {
          "model_path": params.model
        },
        "class_type": "WanVideoFunModelLoader"
      },
      "2": {
        "inputs": {
          "prompt": params.prompt,
          "negative_prompt": params.negativePrompt,
          "num_frames": params.numFrames,
          "fps": params.fps,
          "width": params.width,
          "height": params.height,
          "model": ["1", 0]
        },
        "class_type": "WanVideoFunTextToVideo"
      },
      "3": {
        "inputs": {
          "frames": ["2", 0],
          "fps": params.fps,
          "format": "video/h264-mp4",
          "filename_prefix": "peace-script-wan"
        },
        "class_type": "VHS_VideoCombine"
      }
    };
  }

  /**
   * Track progress via WebSocket (simplified)
   */
  async trackProgress(promptId, onProgress, totalFrames) {
    // TODO: Implement WebSocket tracking
    // For POC, use polling
    return new Promise((resolve, reject) => {
      const checkProgress = setInterval(async () => {
        try {
          const status = await axios.get(`${this.url}/history/${promptId}`);
          
          if (status.data[promptId]?.status?.status_str === 'completed') {
            clearInterval(checkProgress);
            
            // Get video URL
            const outputs = status.data[promptId].outputs;
            const videoNode = Object.values(outputs).find(o => o.videos);
            
            if (videoNode && videoNode.videos[0]) {
              resolve({
                videoUrl: `${this.url}/view?filename=${videoNode.videos[0].filename}`,
                videoData: null // Will download later if needed
              });
            } else {
              reject(new Error('Video not found in outputs'));
            }
          }
          
          // Report progress (rough estimate)
          if (onProgress) {
            const progress = Math.min(95, (Date.now() - startTime) / (totalFrames * 8000) * 100);
            onProgress(progress);
          }
          
        } catch (error) {
          clearInterval(checkProgress);
          reject(error);
        }
      }, 2000);
      
      const startTime = Date.now();
    });
  }
}

export default WanClient;
```

---

### Day 11-12: Create API Endpoint

#### wan.js Routes

```javascript
/**
 * WAN Video Generation Routes (POC)
 */

import express from 'express';
import { WanClient } from '../services/wanClient.js';
import { getWorkerManager } from '../services/workerManager.js';
import { addVideoJob } from '../services/queueService.js';
import { authenticateOptional } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/video/generate/wan/t2v
 * Generate video using WAN T2V (POC)
 */
router.post('/generate/wan/t2v', authenticateOptional, async (req, res, next) => {
  try {
    const {
      prompt,
      negativePrompt = 'blurry, low quality',
      numFrames = 16,
      fps = 8,
      width = 512,
      height = 512,
      userId
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: prompt'
      });
    }

    // Get worker
    const workerManager = getWorkerManager();
    const worker = workerManager.getNextWorker();

    // Create WAN client
    const wanClient = new WanClient(worker);

    // Add to queue (reuse video queue)
    const job = await addVideoJob({
      type: 'wan-t2v',
      prompt,
      metadata: {
        videoType: 'wan-t2v',
        numFrames,
        fps,
        width,
        height
      },
      processor: async (job) => {
        console.log(`🎬 Processing WAN T2V job ${job.id}`);
        
        const result = await wanClient.generateTextToVideo({
          prompt,
          negativePrompt,
          numFrames,
          fps,
          width,
          height,
          onProgress: async (progress) => {
            await job.progress(progress);
          }
        });

        return result;
      },
      userId: userId || req.user?.uid || 'anonymous'
    });

    res.status(202).json({
      success: true,
      message: 'WAN T2V job queued successfully (POC)',
      data: {
        jobId: job.jobId,
        type: 'wan-t2v',
        estimatedTime: Math.ceil(numFrames * 8), // 8 min/frame estimate
        queuePosition: job.queuePosition
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
```

---

### Day 13-14: End-to-End Testing

#### Test Script

```powershell
# test-wan-poc.ps1

Write-Host "`n=== WAN POC End-to-End Test ===" -ForegroundColor Magenta

# Test 1: Basic WAN T2V
Write-Host "`n1️⃣ Testing WAN T2V..." -ForegroundColor Cyan
$body = @{
    prompt = "A peaceful sunset over mountains, golden hour"
    numFrames = 16
    fps = 8
    width = 512
    height = 512
} | ConvertTo-Json

$job = Invoke-RestMethod -Uri "http://localhost:8000/api/video/generate/wan/t2v" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

Write-Host "Job ID: $($job.data.jobId)" -ForegroundColor Yellow
Write-Host "Estimated Time: $($job.data.estimatedTime) min" -ForegroundColor White

# Monitor progress
Write-Host "`n2️⃣ Monitoring progress..." -ForegroundColor Cyan
$jobId = $job.data.jobId
$startTime = Get-Date

for ($i = 1; $i -le 100; $i++) {
    Start-Sleep -Seconds 10
    
    $status = Invoke-RestMethod "http://localhost:8000/api/video/job/$jobId"
    $progress = $status.data.progress
    $state = $status.data.state
    
    Write-Host "[$i] $progress% | $state" -ForegroundColor Cyan
    
    if ($state -eq 'completed') {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMinutes
        
        Write-Host "`n✅ Completed!" -ForegroundColor Green
        Write-Host "Duration: $([math]::Round($duration, 2)) min" -ForegroundColor White
        Write-Host "Video URL: $($status.data.result.videoUrl)" -ForegroundColor White
        
        break
    }
    
    if ($state -eq 'failed') {
        Write-Host "`n❌ Failed!" -ForegroundColor Red
        Write-Host "Error: $($status.data.error)" -ForegroundColor Red
        break
    }
}

# Test 2: Compare with AnimateDiff
Write-Host "`n3️⃣ Comparing with AnimateDiff..." -ForegroundColor Cyan
Write-Host "Run same prompt on AnimateDiff and compare quality" -ForegroundColor Yellow
```

---

## 📊 Week 2 Deliverables

### Required Outputs

1. **Performance Report**
   ```
   WAN 2.1 T2V 1.3B Benchmark Results
   ===================================
   Test: "Peaceful sunset" (16 frames, 512x512)
   
   Generation Time: 128 min (8 min/frame)
   VRAM Peak: 18.2 GB
   Cost per Video: $1.02
   Quality Score: 4.2/5.0
   
   Comparison:
   - AnimateDiff: 32 min, $0.26, 3.0/5.0
   - WAN 1.3B: 128 min, $1.02, 4.2/5.0 ← +40% quality, +4x time, +4x cost
   - Gemini Veo 2: 45 min, $1.20, 4.8/5.0
   ```

2. **Cost Analysis**
   ```
   1,000 videos/month:
   - AnimateDiff: $260/month
   - WAN 1.3B Local: $1,020/month
   - Gemini Veo 2: $1,200/month
   
   Conclusion: WAN is middle ground (quality vs cost)
   ```

3. **Quality Comparison**
   - Side-by-side videos
   - User feedback scores
   - Blind A/B testing results

4. **Go/No-Go Decision**
   - ✅ GO if: Quality score > 4.0 AND Cost < $1.50/video
   - ❌ NO-GO if: Quality score < 3.5 OR VRAM > 20GB consistently

---

## ⚠️ Known Risks & Challenges

### Technical Risks

1. **VRAM Overflow**
   - **Likelihood:** Medium
   - **Impact:** High
   - **Mitigation:** Use CPU offloading, reduce batch size

2. **Slow Generation**
   - **Likelihood:** High
   - **Impact:** Medium
   - **Mitigation:** Set realistic user expectations, async processing

3. **Model Compatibility**
   - **Likelihood:** Low
   - **Impact:** High
   - **Mitigation:** Test thoroughly before production

### Business Risks

1. **Development Time Overrun**
   - **Likelihood:** High
   - **Impact:** Medium
   - **Mitigation:** Strict 2-week deadline, daily standup

2. **User Dissatisfaction**
   - **Likelihood:** Low
   - **Impact:** High
   - **Mitigation:** Keep AnimateDiff as default, WAN as opt-in

3. **ROI Uncertainty**
   - **Likelihood:** Medium
   - **Impact:** Medium
   - **Mitigation:** POC first, full rollout only if metrics met

---

## ✅ Success Checklist

**Week 1:**
- [ ] ComfyUI-WanVideoWrapper installed
- [ ] WAN 2.1 T2V 1.3B downloaded
- [ ] Basic workflow tested successfully
- [ ] Performance benchmarks completed
- [ ] Quality comparison done

**Week 2:**
- [ ] wanClient.js implemented
- [ ] API endpoint created
- [ ] End-to-end test passed
- [ ] Documentation written
- [ ] Go/No-Go decision made

**Go Decision Criteria:**
- [ ] Quality score ≥ 4.0/5.0
- [ ] Cost per video ≤ $1.50
- [ ] VRAM usage ≤ 22 GB
- [ ] Generation time ≤ 200 min (16 frames)
- [ ] Success rate ≥ 90%

---

## 📚 Resources

### Required Downloads
- [ComfyUI-WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper)
- [WAN 2.1 T2V 1.3B](https://huggingface.co/Kijai/WanVideoFun)

### Documentation
- [WAN Official Docs](https://github.com/Alibaba-Wanx/Wanx)
- [AnimateDiff Comparison](./WAN_VS_ANIMATEDIFF_COMPARISON.md)
- [Video API Guide](./comfyui-service/README.md)

---

**หมายเหตุ:**  
นี่เป็น POC ขั้นต้น เป้าหมายคือหาข้อมูลเพื่อตัดสินใจ ไม่ใช่สร้างระบบ production

**Status:** 🚧 รอการอนุมัติเพื่อเริ่ม POC  
**Updated:** 28 ธันวาคม 2025
