# 🚀 Replicate Quick Start Guide

**เวลาดำเนินการ:** 5 นาที  
**ค่าใช้จ่าย:** ~$0.17 - $0.20 ต่อวิดีโอ (จ่ายตามใช้)  
**ความยาก:** ⭐ (ง่ายมาก)

---

## 📊 ภาพรวม

Replicate เป็น **Quick Win Solution** ที่ดีที่สุดสำหรับการเริ่มต้น:

✅ **ไม่ต้อง deploy backend** - ใช้ API เลย  
✅ **ไม่ต้อง download models** - มีให้แล้ว  
✅ **ไม่ต้อง setup GPU** - ใช้ cloud  
✅ **จ่ายตามใช้** - ไม่มีค่าคงที่  
✅ **เริ่มได้ทันที** - 5 นาที

### Video Generation Tiers

```
🎬 Peace Script AI - Video Generation Architecture

Tier 1: Gemini Veo 3.1 ✅ WORKING
├─ Resolution: 720p (1280x720)
├─ Duration: 30-120 seconds
├─ Quality: ⭐⭐⭐⭐⭐ Excellent
└─ Status: Production ready

Tier 2: Replicate AnimateDiff 🆕 NEW!
├─ Resolution: 512x512
├─ Duration: 2-3 seconds
├─ Quality: ⭐⭐⭐⭐ High
├─ Cost: $0.17/video
└─ Time: 30-45s

Tier 3: Replicate SVD 🆕 NEW!
├─ Resolution: 1024x576 (16:9)
├─ Duration: 2-3 seconds
├─ Quality: ⭐⭐⭐⭐⭐ Excellent
├─ Cost: $0.20/video
└─ Time: 45-60s

Fallback Chain: Veo → AnimateDiff → SVD (Automatic)
```

---

## 🎯 ขั้นตอนที่ 1: สมัคร Replicate (2 นาที)

### 1.1 สมัครบัญชี

1. ไปที่ https://replicate.com
2. Click **"Sign up"**
3. เลือก:
   - Sign up with GitHub (แนะนำ - เร็วที่สุด)
   - หรือใช้ Email

### 1.2 ยืนยันอีเมล

- เช็ค inbox
- Click link ยืนยัน
- Login เข้าสู่ระบบ

---

## 🔑 ขั้นตอนที่ 2: ดึง API Key (1 นาที)

### 2.1 เข้าสู่หน้า API Tokens

1. Login เข้า Replicate
2. ไปที่ **Account Settings**
3. Click **"API tokens"** หรือไปที่:
   ```
   https://replicate.com/account/api-tokens
   ```

### 2.2 สร้าง API Token

1. Click **"Create token"**
2. ตั้งชื่อ: `Peace-Script-AI` (หรืออะไรก็ได้)
3. Click **"Create"**
4. **คัดลอก token ทันที** (จะแสดงครั้งเดียว!)

```
ตัวอย่าง API Token:
r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **สำคัญ:** เก็บ token ไว้ในที่ปลอดภัย จะแสดงเพียงครั้งเดียว!

---

## ⚙️ ขั้นตอนที่ 3: เพิ่ม API Key ใน .env (1 นาที)

### 3.1 เปิดไฟล์ .env

```bash
cd /Users/surasak.peace/Desktop/peace-script-basic-v1
open .env
```

### 3.2 เพิ่ม API Key

ค้นหาบรรทัด:

```env
VITE_REPLICATE_API_KEY=
```

แก้เป็น:

```env
VITE_REPLICATE_API_KEY=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.3 บันทึกไฟล์

- Mac: `Cmd + S`
- Windows/Linux: `Ctrl + S`

---

## 🔄 ขั้นตอนที่ 4: Restart Dev Server (1 นาที)

### 4.1 หยุด Server เก่า

ใน Terminal ที่รัน `npm run dev`:

```bash
Ctrl + C
```

### 4.2 เริ่ม Server ใหม่

```bash
npm run dev
```

### 4.3 รอ Server พร้อม

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

---

## ✅ ขั้นตอนที่ 5: ทดสอบ (5 นาที)

### 5.1 เปิด Browser

```
http://localhost:5173
```

### 5.2 สร้าง Storyboard

1. ไปที่ **Storyboard AI**
2. สร้าง scene ใดก็ได้
3. กด **"Generate Video"**

### 5.3 เลือก Model

เมื่อมี popup เลือก video model:

**สำหรับทดสอบ:**

- เลือก **"Replicate AnimateDiff"** (เร็ว + ถูก)

**สำหรับคุณภาพสูง:**

- เลือก **"Replicate SVD"** (ต้องมีรูปภาพ base)

**หรือใช้ Auto:**

- เลือก **"Auto"** ให้ระบบเลือกเอง
- จะลอง Veo → AnimateDiff → SVD อัตโนมัติ

### 5.4 ดู Progress

```
🎬 Tier 2 (Replicate): Attempting cloud generation...
🎬 Tier 2a: Trying Replicate AnimateDiff v3...
📊 Prediction created: xxxxx
⏱️  Estimated time: 30-45s
Progress: [████████░░] 80%
✅ Tier 2a Success: Replicate AnimateDiff
```

### 5.5 ได้วิดีโอ!

- วิดีโอจะแสดงในหน้า Storyboard
- สามารถ Download ได้
- ดู Console (F12) เพื่อดูรายละเอียด

---

## 💰 ต้นทุนและการเติมเงิน

### ราคาต่อวิดีโอ

| Model                     | ความละเอียด | ราคา  | เวลา   |
| ------------------------- | ----------- | ----- | ------ |
| **AnimateDiff v3**        | 512x512     | $0.17 | 30-45s |
| **SVD 1.1**               | 1024x576    | $0.20 | 45-60s |
| **AnimateDiff Lightning** | 512x512     | $0.10 | 15-20s |

### การเติมเงิน

1. ไปที่ https://replicate.com/account/billing
2. Click **"Add credit"**
3. เลือกจำนวน:
   - $10 = ~50 videos (AnimateDiff)
   - $20 = ~100 videos
   - $50 = ~250 videos
4. ชำระผ่าน Credit Card

### Free Trial

- Replicate ให้ **free credits** เล็กน้อยสำหรับทดสอบ
- ประมาณ $1-2 (5-10 videos)
- หมดแล้วต้องเติมเงิน

---

## 📊 เปรียบเทียบ Replicate vs RunPod

| Feature         | Replicate             | RunPod                  |
| --------------- | --------------------- | ----------------------- |
| **Setup Time**  | 5 นาที                | 30 นาที                 |
| **ความยาก**     | ⭐ ง่าย               | ⭐⭐⭐ ปานกลาง          |
| **ค่าใช้จ่าย**  | $0.17/video           | $320/เดือน              |
| **Break-even**  | -                     | 1,882 videos/เดือน      |
| **Deployment**  | ❌ ไม่ต้อง            | ✅ ต้อง                 |
| **Models**      | ❌ ไม่ต้อง            | ✅ ต้อง download 20GB   |
| **GPU**         | ❌ ไม่ต้อง            | ✅ ต้องจัดการเอง        |
| **แนะนำสำหรับ** | เริ่มต้น, traffic ต่ำ | Production, traffic สูง |

### คำแนะนำ

**ใช้ Replicate ถ้า:**

- ✅ เพิ่งเริ่มต้น
- ✅ สร้างวิดีโอ < 1,882 videos/เดือน
- ✅ อยากได้ผลลัพธ์เร็ว
- ✅ ไม่อยากจัดการ infrastructure

**ย้าย RunPod ถ้า:**

- ✅ สร้างวิดีโอ > 1,882 videos/เดือน
- ✅ อยากควบคุมเต็มที่
- ✅ ต้องการ custom models
- ✅ มี traffic สม่ำเสมอ

---

## 🔧 Troubleshooting

### ปัญหา: API Key ไม่ work

**อาการ:**

```
Error: Replicate API key not found!
```

**แก้ไข:**

1. เช็คว่าเพิ่ม `VITE_REPLICATE_API_KEY` ใน `.env` แล้ว
2. เช็คว่า restart server แล้ว (`Ctrl+C` แล้ว `npm run dev`)
3. เช็คว่า token ไม่มี space หน้า-หลัง
4. ลองสร้าง token ใหม่

### ปัญหา: "Insufficient credits"

**อาการ:**

```
Error: Insufficient credits to run this prediction
```

**แก้ไข:**

1. ไปที่ https://replicate.com/account/billing
2. เติมเงิน $10-20
3. ลองใหม่

### ปัญหา: "Rate limit exceeded"

**อาการ:**

```
Error: You've exceeded your rate limit
```

**แก้ไข:**

1. รอ 1 นาที
2. ลองใหม่
3. ถ้ายังไม่ได้ → Upgrade plan

### ปัญหา: วิดีโอช้า/ไม่เสร็จ

**อาการ:**

```
Timeout after 3 minutes
```

**แก้ไข:**

1. เช็ค Replicate status: https://status.replicate.com
2. ลองใหม่อีกครั้ง
3. ถ้ายังไม่ได้ → Contact support

### ปัญหา: Console แสดง error

**อาการ:**

```
Failed to fetch prediction status: 401 Unauthorized
```

**แก้ไข:**

1. API Key ไม่ถูกต้อง
2. สร้าง token ใหม่ที่ https://replicate.com/account/api-tokens
3. แทนที่ token เดิมใน `.env`
4. Restart server

---

## 🎓 Advanced Usage

### ใช้ Lightning Model (เร็วกว่า 2 เท่า)

แก้ใน `src/services/replicateService.ts`:

```typescript
// Use AnimateDiff Lightning instead
import { generateAnimateDiffLightning } from './replicateService';

// Call it
const videoUrl = await generateAnimateDiffLightning(prompt, { numFrames: 16 }, onProgress);
```

**ข้อดี:**

- ⚡ เร็วกว่า 2 เท่า (15-20s)
- 💰 ถูกกว่า ($0.10/video)

**ข้อเสีย:**

- 📉 คุณภาพต่ำกว่าเล็กน้อย

### Adjust Motion Strength (SVD)

```typescript
// More motion
const videoUrl = await generateSVDVideo(
  image,
  {
    motionBucketId: 200, // Default: 127, Range: 1-255
    condAug: 0.02,
  },
  onProgress
);
```

**Motion Bucket ID:**

- `1-80`: น้อย (subtle motion)
- `80-150`: ปานกลาง (default = 127)
- `150-255`: มาก (dramatic motion)

### Custom Frame Count

```typescript
// AnimateDiff: 8-64 frames
const videoUrl = await generateAnimateDiffVideo(
  prompt,
  image,
  {
    numFrames: 32, // Default: 16
    fps: 8, // Duration = 32/8 = 4 seconds
  },
  onProgress
);

// SVD: 7-25 frames
const videoUrl = await generateSVDVideo(
  image,
  {
    numFrames: 25, // Default: 14
    fps: 6, // Duration = 25/6 = 4.2 seconds
  },
  onProgress
);
```

---

## 📈 การติดตามการใช้งาน

### ดู Usage & Billing

1. ไปที่ https://replicate.com/account/billing
2. ดู **Current usage**:
   - Predictions run
   - Total cost
   - Remaining credits
3. ดู **Usage history**:
   - วันที่
   - Model ที่ใช้
   - ค่าใช้จ่าย

### Export Data

1. Click **"Export usage"**
2. เลือกช่วงวันที่
3. Download CSV
4. วิเคราะห์ใน Excel/Google Sheets

---

## ✅ Checklist

ก่อน go live, เช็คให้ครบ:

- [ ] สมัคร Replicate account
- [ ] สร้างและคัดลอก API key
- [ ] เพิ่ม `VITE_REPLICATE_API_KEY` ใน `.env`
- [ ] Restart dev server
- [ ] ทดสอบ AnimateDiff (Tier 2)
- [ ] ทดสอบ SVD (Tier 3)
- [ ] เติมเงิน $10-20 สำหรับใช้งานจริง
- [ ] ตั้ง billing alerts (ถ้ามี)
- [ ] บันทึก API key ในที่ปลอดภัย

---

## 🎉 เสร็จแล้ว!

ตอนนี้คุณมี:

✅ **Tier 1:** Gemini Veo (720p, 30-120s) - Production  
✅ **Tier 2:** Replicate AnimateDiff (512x512, 2-3s) - Ready!  
✅ **Tier 3:** Replicate SVD (1024x576, 2-3s) - Ready!  
✅ **Fallback Chain:** Automatic Veo → AnimateDiff → SVD

**การใช้งาน:**

- เลือก model ตอน generate video
- หรือปล่อยให้ "Auto" เลือกเอง
- System จะลอง Tier 1 → 2 → 3 จนกว่าจะสำเร็จ

**ต้นทุน:**

- Tier 1 (Veo): Quota-based (มี credit)
- Tier 2 (AnimateDiff): $0.17/video
- Tier 3 (SVD): $0.20/video

**Next Steps:**

- ถ้า traffic สูง (>1,882 videos/mo) → ดู `COMFYUI_BACKEND_DEPLOYMENT.md`
- ถ้าอยากควบคุมเต็มที่ → Deploy RunPod
- ถ้าพอใจ Replicate → ใช้ต่อ!

---

**ต้องการความช่วยเหลือ:**

- 📧 Email: support@peace-script-ai.com
- 💬 Discord: [Peace Script AI Community]
- 📖 Docs: `docs/MASTER_INDEX.md`

**Happy Creating! 🎬✨**
