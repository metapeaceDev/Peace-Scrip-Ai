# 🎬 Custom Resolution Video Generation Guide

## ✨ Overview

Peace Script AI ตอนนี้รองรับ **custom resolution** และ **aspect ratio** สำหรับการสร้างวิดีโอแล้ว! คุณสามารถเลือกอัตราส่วนภาพที่เหมาะสมกับแพลตฟอร์มต่างๆ ได้ง่ายๆ

---

## 🎯 Supported Aspect Ratios

### 📺 16:9 - Widescreen (Default)

- **Resolution:** 1024x576 (Hotshot-XL), 1280x720 (LTX-Video)
- **Best for:** YouTube, Vimeo, Traditional Videos
- **Cost:** $0.018 - $0.045 per video

### 📱 9:16 - Portrait/Vertical

- **Resolution:** 576x1024 (Hotshot-XL), 720x1280 (LTX-Video)
- **Best for:** TikTok, Instagram Reels, YouTube Shorts
- **Cost:** $0.018 - $0.045 per video

### ⬛ 1:1 - Square

- **Resolution:** 512x512 (Hotshot-XL), 768x768 (LTX-Video)
- **Best for:** Instagram Posts, Social Media
- **Cost:** $0.018 - $0.045 per video

### 📺 4:3 - Standard

- **Resolution:** 768x576 (Hotshot-XL), 960x720 (LTX-Video)
- **Best for:** Classic TV, Presentations
- **Cost:** $0.018 - $0.045 per video

### ⚙️ Custom Resolution

- **Resolution:** Any size you want!
- **Limits:**
  - Hotshot-XL: Must be divisible by 8 (256-1920px)
  - LTX-Video: Must be divisible by 32, max 720x1280
- **Best for:** Special projects, custom requirements
- **Cost:** $0.018 - $0.045 per video

---

## 💰 Model Comparison

| Model          | Cost/Video | Speed  | Custom Resolution     | Quality    | Best Use Case                           |
| -------------- | ---------- | ------ | --------------------- | ---------- | --------------------------------------- |
| **Hotshot-XL** | **$0.018** | 15-20s | ✅ **Full Custom**    | ⭐⭐⭐     | **Low-cost production, TikTok, Shorts** |
| **LTX-Video**  | **$0.045** | 45-50s | ✅ **Up to 720x1280** | ⭐⭐⭐⭐⭐ | **High-quality, professional work**     |
| AnimateDiff v3 | $0.17      | 30-45s | ❌ 512x512 only       | ⭐⭐⭐     | Legacy option                           |
| SVD 1.1        | $0.20      | 45-60s | ⚠️ 1024x576 fixed     | ⭐⭐⭐⭐   | Image-to-video                          |

---

## 🚀 How to Use

### Step 1: Open Storyboard Editor

1. Go to **Step 5: Output & Storyboard**
2. Find the **Video Generation Controls** section

### Step 2: Select Aspect Ratio

1. Locate the **📐 ASPECT RATIO** dropdown
2. Choose from:
   - 🖥️ 16:9 - Widescreen
   - 📱 9:16 - Portrait/TikTok
   - ⬛ 1:1 - Square/Instagram
   - 📺 4:3 - Standard
   - ⚙️ Custom Resolution

### Step 3: Custom Resolution (Optional)

If you select **Custom Resolution**:

1. Enter **WIDTH** (256-1920px)
2. Enter **HEIGHT** (256-1920px)
3. Or use quick presets:
   - **720p** - 1280x720 (HD)
   - **1080p** - 1920x1080 (Full HD)
   - **TikTok** - 720x1280 (Vertical)

### Step 4: Generate Video

1. Click **🎬 Generate Video** on any shot
2. The system will automatically use:
   - Your selected aspect ratio
   - Custom resolution (if specified)
   - Best available model (Auto mode)

---

## 🎨 Model Selection Strategy

### Auto Mode (Recommended)

System tries models in this order:

1. **Gemini Veo** - Best quality (if quota available)
2. **AnimateDiff v3** - 512x512 fallback
3. **SVD** - 1024x576 image-to-video
4. **Hotshot-XL** - Custom resolution, cheapest ($0.018)
5. **LTX-Video** - High quality, custom resolution ($0.045)
6. **ComfyUI** - Self-hosted unlimited

### Manual Mode

Select specific model from **VIDEO MODEL** dropdown:

- 🎁 FREE: ComfyUI SVD, Pollinations
- 💵 PAID: Gemini Veo, Replicate models

---

## 📐 Resolution Guidelines

### Hotshot-XL

- **Rule:** Width and height must be divisible by 8
- **Min:** 256x256
- **Max:** 1920x1920
- **Examples:**
  - ✅ 512x512 (valid)
  - ✅ 1024x576 (valid)
  - ✅ 1280x720 (valid)
  - ❌ 1000x500 (invalid - not divisible by 8)

### LTX-Video

- **Rule:** Width and height must be divisible by 32
- **Max:** 720x1280
- **Examples:**
  - ✅ 768x512 (valid)
  - ✅ 1280x720 (valid)
  - ✅ 576x1024 (valid)
  - ❌ 800x600 (invalid - not divisible by 32)

---

## 🎯 Platform-Specific Recommendations

### YouTube

- **Aspect Ratio:** 16:9
- **Model:** LTX-Video (high quality)
- **Resolution:** 1280x720 (720p HD)

### TikTok / Instagram Reels

- **Aspect Ratio:** 9:16
- **Model:** Hotshot-XL (cheap, fast)
- **Resolution:** 720x1280

### Instagram Posts

- **Aspect Ratio:** 1:1
- **Model:** Hotshot-XL or LTX-Video
- **Resolution:** 512x512 or 768x768

### Facebook / Twitter

- **Aspect Ratio:** 16:9 or 1:1
- **Model:** Hotshot-XL (cost-effective)
- **Resolution:** 1024x576 or 512x512

---

## 💡 Cost Optimization Tips

### Use Hotshot-XL for Volume

- **Best for:** Multiple videos, TikTok content, drafts
- **Why:** 90% cheaper than AnimateDiff ($0.018 vs $0.17)
- **Result:** 55 videos per $1 instead of 6

### Use LTX-Video for Quality

- **Best for:** Final cuts, professional work, important scenes
- **Why:** Higher quality, better motion, up to 720x1280
- **Result:** Still 74% cheaper than AnimateDiff ($0.045 vs $0.17)

### Batch Generate

- Set aspect ratio once
- Click "Generate All Shots"
- System auto-generates entire storyboard with same settings

---

## 🔧 Advanced Features

### Psychology-Driven Motion

All video models support psychology-based motion:

- Character emotions affect movement intensity
- Defilements influence camera behavior
- Automatic FPS and frame count optimization

### Motion Editor Integration

- Detailed camera control
- Lighting adjustments
- Sound context
- Works with all resolution settings

### Fallback Chain

If one model fails, system automatically tries next:

```
Veo → AnimateDiff → SVD → Hotshot-XL → LTX-Video → ComfyUI
```

---

## ❓ FAQ

### Q: Can I use different aspect ratios in the same project?

**A:** Yes! Change aspect ratio anytime. Each shot can use different settings.

### Q: Which model supports the highest resolution?

**A:** LTX-Video supports up to 720x1280 (9:16 portrait HD)

### Q: What's the cheapest option for TikTok videos?

**A:** Hotshot-XL at $0.018/video with 9:16 aspect ratio (720x1280)

### Q: Do I need to change my API keys?

**A:** No! Same Replicate API key works for all models.

### Q: Can I preview before generating?

**A:** Aspect ratio info shows in UI. Custom resolution displays current values.

### Q: What if I want 1080p Full HD?

**A:** Use Custom Resolution: 1920x1080 (only supported by Hotshot-XL within size limits)

---

## 🎓 Examples

### Example 1: TikTok Content Creator

```
Aspect Ratio: 9:16 (Portrait)
Model: Hotshot-XL
Cost: $0.018 per video
Result: 55 TikTok videos for $1
```

### Example 2: YouTube Channel

```
Aspect Ratio: 16:9 (Widescreen)
Model: LTX-Video
Resolution: 1280x720
Cost: $0.045 per video
Result: High-quality 720p content
```

### Example 3: Instagram Campaign

```
Aspect Ratio: 1:1 (Square)
Model: Hotshot-XL
Resolution: 512x512
Cost: $0.018 per video
Result: Fast, cheap Instagram posts
```

### Example 4: Custom Project

```
Aspect Ratio: Custom
Resolution: 1280x720
Model: Hotshot-XL
Cost: $0.018 per video
Result: Perfect fit for specific requirements
```

---

## 🚀 Next Steps

1. **Try Different Ratios:** Experiment with 16:9, 9:16, 1:1
2. **Compare Models:** Test Hotshot-XL vs LTX-Video quality
3. **Batch Generate:** Create entire storyboards efficiently
4. **Monitor Costs:** Track spending with cheaper Hotshot-XL
5. **Optimize Workflow:** Use right ratio for each platform

---

## 📞 Support

Need help? Check:

- **Main Documentation:** README.md
- **Replicate Guide:** docs/REPLICATE_SETUP.md
- **Video Models:** docs/VIDEO_MODELS.md
- **Deployment:** docs/DEPLOYMENT_SUCCESS_REPORT.md

---

**Happy Creating! 🎬✨**
