# Video Generation Testing Guide

Complete testing procedures for all 3 tiers of video generation.

---

## 📊 Testing Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VIDEO GENERATION TIERS                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Tier 1: Gemini Veo 3.1 (TESTED & WORKING)               │
│     - Resolution: 720p (1280x720)                           │
│     - Duration: 30-120 seconds                              │
│     - Status: Production ready ✅                           │
│                                                              │
│  🔄 Tier 2: ComfyUI + AnimateDiff (TO BE TESTED)            │
│     - Resolution: 512x512                                   │
│     - Duration: ~3 seconds (25 frames @ 8fps)               │
│     - Status: Code ready, awaiting backend deploy           │
│                                                              │
│  🔄 Tier 3: ComfyUI + SVD (TO BE TESTED)                    │
│     - Resolution: 1024x576                                  │
│     - Duration: ~3 seconds (25 frames)                      │
│     - Status: Code ready, awaiting backend deploy           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Tier 1: Gemini Veo 3.1 Testing

### Status: **PASSED ✅** (Tested Dec 11, 2024)

### Test Results

```
Console Output:
🎬 Generating video with model: auto
🎬 Tier 1: Trying Gemini Veo 3.1...
✅ Tier 1 Success: Gemini Veo 3.1
```

### How to Re-test

1. **Open Peace Script AI**

   ```
   https://peace-script-ai.web.app
   ```

2. **Navigate to Studio**

   ```
   Auth → Projects → Select "แสนโสพา" → Studio
   ```

3. **Select a Shot**

   ```
   - Click any scene
   - Click any shot
   - Ensure base image exists
   ```

4. **Generate Video**

   ```
   - Click "Generate Video" button
   - Model: Leave as "auto" or select "Gemini Veo 3.1"
   - Click confirm
   ```

5. **Verify Console Logs**

   ```javascript
   // Open DevTools (F12)
   // Should see:
   🎬 Tier 1: Trying Gemini Veo 3.1...
   ✅ Tier 1 Success: Gemini Veo 3.1

   // Should NOT see errors
   ```

6. **Check Video Output**
   ```
   - Video player should appear
   - Video should play smoothly
   - Resolution: 720p
   - Duration: 30-120 seconds
   - No watermarks
   ```

### Success Criteria

- ✅ Console shows "Tier 1 Success"
- ✅ Video URL returned (starts with `https://generativelanguage.googleapis.com/`)
- ✅ Video plays in browser
- ✅ No CORS errors
- ✅ Generation time < 2 minutes

---

## 🔄 Tier 2: ComfyUI + AnimateDiff Testing

### Status: **PENDING** (Awaiting backend deployment)

### Prerequisites

```bash
# 1. Backend must be deployed and running
curl https://your-backend-url/health/detailed
# Should return: {"success": true}

# 2. Frontend .env updated
VITE_COMFYUI_SERVICE_URL=https://your-backend-url
VITE_USE_COMFYUI_BACKEND=true

# 3. Frontend rebuilt and deployed
npm run build && firebase deploy --only hosting
```

### Test Procedure

#### Test 2.1: Basic AnimateDiff Generation

1. **Setup**

   ```
   - Open https://peace-script-ai.web.app (Incognito mode)
   - Login → Projects → Studio
   - Select scene with base image
   ```

2. **Generate**

   ```
   - Click "Generate Video"
   - Model: "ComfyUI + AnimateDiff" (or "auto")
   - Click confirm
   ```

3. **Monitor Console**

   ```javascript
   // Expected output:
   🎬 Generating video with model: comfyui-animatediff
   🎬 Tier 2: Trying ComfyUI + AnimateDiff...
   📤 Job submitted: <job-id>
   📊 Job <id>: queued (0%)
   📊 Job <id>: running (10%)
   📊 Job <id>: running (30%)
   📊 Job <id>: running (50%)
   📊 Job <id>: running (80%)
   📊 Job <id>: completed (100%)
   ✅ Tier 2 Success: ComfyUI + AnimateDiff
   ```

4. **Verify Output**
   ```
   - Video should appear
   - Resolution: 512x512
   - Duration: ~3 seconds
   - Frame rate: 8 fps
   - Total frames: 25
   - Quality: Check for smooth motion
   ```

#### Test 2.2: Motion Strength Validation

Test different motion strengths:

```javascript
// Low motion (0.3)
// Should see: Subtle, slow movements

// Medium motion (0.8) - Default
// Should see: Natural motion

// High motion (1.5)
// Should see: Exaggerated, fast movements
```

#### Test 2.3: Multiple Concurrent Jobs

```
1. Generate video for Shot 1 (don't wait)
2. Immediately generate for Shot 2
3. Check console for job queue:
   📊 Job 1: running
   📊 Job 2: queued (waiting)
4. After Job 1 completes:
   📊 Job 2: running
5. Both should succeed
```

### Success Criteria

- ✅ Console shows "Tier 2: Trying ComfyUI..."
- ✅ Job ID returned and tracked
- ✅ Progress updates appear (0% → 100%)
- ✅ Video generates successfully
- ✅ No backend errors in console
- ✅ Generation time < 60 seconds
- ✅ Video quality acceptable (smooth motion)
- ✅ Queue handles multiple jobs

### Expected Issues & Solutions

| Issue                | Solution                                   |
| -------------------- | ------------------------------------------ |
| "Backend timeout"    | Check backend is running, increase timeout |
| "Job not found"      | Backend restarted, retry generation        |
| "CUDA out of memory" | Reduce MAX_CONCURRENT_JOBS to 1            |
| "Model not found"    | Download models: `./download-models.sh`    |

---

## 🔄 Tier 3: ComfyUI + SVD Testing

### Status: **PENDING** (Awaiting backend deployment)

### Prerequisites

Same as Tier 2 + ensure SVD model downloaded:

```bash
# Check model exists:
ls /workspace/ComfyUI/models/checkpoints/svd_xt_1_1.safetensors
# Should show ~9.6GB file
```

### Test Procedure

#### Test 3.1: Basic SVD Generation

1. **Generate**

   ```
   - Click "Generate Video"
   - Model: "ComfyUI + SVD"
   - Click confirm
   ```

2. **Monitor Console**

   ```javascript
   🎬 Tier 2: Trying ComfyUI + SVD...
   📤 Job submitted: <job-id>
   📊 Job <id>: running (X%)
   ✅ Tier 2 Success: ComfyUI + SVD
   ```

3. **Verify Output**
   ```
   - Resolution: 1024x576 (16:9)
   - Duration: ~3 seconds
   - Frame rate: variable
   - Quality: Should be BETTER than AnimateDiff
   ```

#### Test 3.2: Compare Quality (AnimateDiff vs SVD)

Generate same shot with both models:

| Metric     | AnimateDiff | SVD                    |
| ---------- | ----------- | ---------------------- |
| Resolution | 512x512     | 1024x576 ✅ Better     |
| Quality    | Good        | Excellent ✅ Better    |
| Motion     | Natural     | Very Natural ✅ Better |
| Speed      | ~20-30s     | ~30-40s (slower)       |
| VRAM       | ~6-8GB      | ~10-12GB (more)        |

### Success Criteria

- ✅ SVD generates successfully
- ✅ Higher resolution than AnimateDiff
- ✅ Better quality output
- ✅ Smooth, natural motion
- ✅ No artifacts or glitches

---

## 🔁 Fallback Chain Testing

### Test 4.1: Tier 1 → Tier 2 Fallback

**Scenario:** Veo API fails, should fallback to ComfyUI

1. **Simulate Veo Failure**

   ```bash
   # Temporarily break Veo by using wrong API key
   # Edit .env:
   VITE_GEMINI_API_KEY=INVALID_KEY_FOR_TESTING

   # Rebuild & deploy
   npm run build
   firebase deploy --only hosting
   ```

2. **Generate Video**

   ```
   - Model: "auto"
   - Click generate
   ```

3. **Expected Console Output**

   ```javascript
   🎬 Generating video with model: auto
   🎬 Tier 1: Trying Gemini Veo 3.1...
   ❌ Tier 1 (Veo) failed: API key not valid
   🎬 Tier 2: Trying ComfyUI + AnimateDiff...
   📤 Job submitted: <job-id>
   ✅ Tier 2 Success: ComfyUI + AnimateDiff
   ```

4. **Verify**
   - ✅ Tier 1 fails gracefully (no crash)
   - ✅ Tier 2 starts automatically
   - ✅ Video generates successfully
   - ✅ User sees helpful error message

5. **Restore**
   ```bash
   # Fix API key
   VITE_GEMINI_API_KEY=<correct-key>
   npm run build && firebase deploy
   ```

### Test 4.2: Tier 1 → Tier 2 → Tier 3 Fallback

**Scenario:** Both Veo and AnimateDiff fail, fallback to SVD

1. **Simulate Double Failure**

   ```bash
   # Break Veo (wrong API key)
   VITE_GEMINI_API_KEY=INVALID_KEY

   # Break AnimateDiff (comment out model in backend)
   # In comfyui-backend/main.py, temporarily:
   # raise Exception("AnimateDiff temporarily disabled")
   ```

2. **Generate**

   ```
   - Model: "auto"
   - Should see:
   ❌ Tier 1 failed
   🎬 Tier 2: Trying ComfyUI + AnimateDiff...
   ❌ Tier 2 failed
   🎬 Tier 2: Trying ComfyUI + SVD...
   ✅ Tier 2 Success: ComfyUI + SVD
   ```

3. **Verify Full Chain**
   - ✅ All tiers attempt in order
   - ✅ Each failure logged clearly
   - ✅ Final tier succeeds
   - ✅ No crashes or undefined errors

---

## 📊 Performance Testing

### Test 5.1: Generation Speed

Measure time for each tier:

| Tier                 | Expected Time | Your Result |
| -------------------- | ------------- | ----------- |
| Tier 1 (Veo)         | 30-60s        | \_\_\_      |
| Tier 2 (AnimateDiff) | 20-40s        | \_\_\_      |
| Tier 3 (SVD)         | 30-60s        | \_\_\_      |

```javascript
// Add timing to console:
console.time('Video Generation');
// ... generate video ...
console.timeEnd('Video Generation');
```

### Test 5.2: Concurrent Load

Generate multiple videos simultaneously:

1. **Prepare 5 shots** with base images
2. **Rapid fire generate** (click all 5 quickly)
3. **Monitor:**
   ```
   - Queue depth
   - Memory usage (backend)
   - Generation times
   - Success rate
   ```

**Expected:**

- ✅ All jobs queue properly
- ✅ Backend handles 2 concurrent (MAX_CONCURRENT_JOBS)
- ✅ Others wait in queue
- ✅ All complete successfully
- ✅ No CUDA OOM errors

### Test 5.3: Resource Monitoring

During generation, monitor:

```bash
# On backend server:

# GPU usage
nvidia-smi -l 1

# Expected:
# - VRAM: 6-10GB during generation
# - GPU: 80-100% utilization
# - Power: 200-300W

# CPU/Memory
htop

# Expected:
# - CPU: 20-40% (minimal)
# - RAM: 4-8GB
```

---

## 🎨 Quality Testing

### Test 6.1: Visual Quality Assessment

Generate same shot with all tiers, compare:

| Aspect     | Tier 1 (Veo)    | Tier 2 (AnimateDiff) | Tier 3 (SVD)    |
| ---------- | --------------- | -------------------- | --------------- |
| Resolution | 1280x720 ✅     | 512x512              | 1024x576 ✅     |
| Sharpness  | Excellent ✅    | Good                 | Excellent ✅    |
| Motion     | Very Natural ✅ | Natural              | Very Natural ✅ |
| Duration   | 30-120s ✅      | 3s                   | 3s              |
| Artifacts  | None ✅         | Minimal              | Minimal         |
| **Score**  | **10/10**       | **7/10**             | **8/10**        |

### Test 6.2: Edge Cases

Test with challenging inputs:

1. **Very complex prompt**

   ```
   "A cinematic scene with multiple characters,
    dynamic lighting, camera movements, and
    detailed background with reflections"
   ```

   - Expected: May be slower, but should work

2. **Minimal prompt**

   ```
   "A person"
   ```

   - Expected: Should work, generic output

3. **Very dark/bright scenes**
   - Test lighting extremes
   - Expected: Should handle reasonably

4. **No base image**
   - Only available for Tier 1 (Veo)
   - Tier 2/3 require base image

---

## 🧪 Error Handling Testing

### Test 7.1: Network Errors

```bash
# Simulate network failure
# (Temporarily disable backend)

Expected:
❌ Tier 2 failed: Failed to fetch
✅ Error message shown to user
✅ Can retry generation
```

### Test 7.2: Invalid Inputs

```javascript
// Test with:
- Empty prompt → Should show error
- Invalid image format → Should show error
- Corrupt base64 image → Should show error
```

### Test 7.3: Backend Restart During Job

```bash
# 1. Start video generation
# 2. Restart backend: docker restart comfyui-backend
# 3. Check frontend

Expected:
❌ Job not found error (job lost)
✅ User can retry
✅ No crash
```

---

## 📝 Testing Checklist

### Pre-Deployment Testing

- [ ] Tier 1 (Veo) works
- [ ] Backend health check passes
- [ ] Frontend .env updated correctly
- [ ] Frontend deployed to production

### Tier 2 (AnimateDiff) Testing

- [ ] Basic generation works
- [ ] Progress updates correctly
- [ ] Video quality acceptable
- [ ] Generation time < 60s
- [ ] Queue handles multiple jobs
- [ ] Motion strength variations work

### Tier 3 (SVD) Testing

- [ ] Basic generation works
- [ ] Higher quality than AnimateDiff
- [ ] 16:9 aspect ratio correct
- [ ] Generation completes successfully

### Fallback Testing

- [ ] Tier 1 → Tier 2 fallback works
- [ ] Error messages clear
- [ ] No crashes on failure
- [ ] Full chain (1→2→3) works

### Performance Testing

- [ ] Generation times acceptable
- [ ] Concurrent jobs handled
- [ ] No memory leaks
- [ ] GPU utilization good (80%+)

### Quality Testing

- [ ] Visual quality acceptable
- [ ] Motion smooth and natural
- [ ] No artifacts or glitches
- [ ] Edge cases handled

### Error Testing

- [ ] Network errors handled
- [ ] Invalid inputs rejected
- [ ] Backend restart recovered
- [ ] User-friendly error messages

---

## 🎯 Final Validation

All systems operational when:

```
✅ Tier 1 (Veo): WORKING (Tested ✅)
✅ Tier 2 (AnimateDiff): WORKING (Pending test)
✅ Tier 3 (SVD): WORKING (Pending test)
✅ Fallback chain: WORKING (Pending test)
✅ Performance: < 60s per video
✅ Quality: Acceptable for production
✅ Error handling: Graceful failures
✅ User experience: Smooth, no crashes
```

---

## 📊 Test Results Template

```markdown
## Test Results - [Date]

### Environment

- Backend: [RunPod / Replicate / Local]
- GPU: [RTX 3090 / T4 / etc]
- Frontend: [Production / Staging]

### Tier 1 (Veo)

- Status: ✅ PASS / ❌ FAIL
- Generation time: \_\_\_ seconds
- Quality: \_\_\_ / 10
- Notes: \_\_\_

### Tier 2 (AnimateDiff)

- Status: ✅ PASS / ❌ FAIL
- Generation time: \_\_\_ seconds
- Quality: \_\_\_ / 10
- Notes: \_\_\_

### Tier 3 (SVD)

- Status: ✅ PASS / ❌ FAIL
- Generation time: \_\_\_ seconds
- Quality: \_\_\_ / 10
- Notes: \_\_\_

### Fallback Chain

- Tier 1 → 2: ✅ PASS / ❌ FAIL
- Tier 1 → 2 → 3: ✅ PASS / ❌ FAIL
- Notes: \_\_\_

### Issues Found

1. ***
2. ***

### Overall Status

✅ Ready for production / ❌ Needs fixes
```

---

**Testing Status:** Ready to begin after backend deployment  
**Estimated Testing Time:** 2-3 hours  
**Next Steps:** Deploy backend → Run tests → Fix issues → Production! 🚀
