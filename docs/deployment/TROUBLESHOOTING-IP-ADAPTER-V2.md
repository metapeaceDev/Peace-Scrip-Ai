# 🔧 IP-Adapter v2.0 - ยังช้า 35 นาที? วิธีแก้!

**สถานะ:** IP-Adapter v2.0 timeout 35 นาที (เหมือน v1.0)  
**สาเหตุ:** Browser cache โค้ดเก่า + workflow ไม่ถูกส่ง  
**วันที่:** 3 ธันวาคม 2568

---

## 🔍 การวิเคราะห์ปัญหา

### 1. ComfyUI Logs แสดงว่าใช้ workflow ผิด

```bash
tail -100 ~/Desktop/comfyui-restart.log | grep "Exception"
```

**ผลลัพธ์:**

```
Exception: IPAdapter model not present in the pipeline.
Please load the models with the IPAdapterUnifiedLoader node.
```

**ความหมาย:**

- ❌ ComfyUI ยังได้รับ v1.0 workflow (CLIPVisionLoader + IPAdapterModelLoader)
- ❌ ไม่ได้รับ v2.0 workflow (IPAdapterUnifiedLoader)

### 2. Browser ยัง Cache โค้ดเก่า

**การตรวจสอบ:**

```bash
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 "
npm run build
```

**ผลลัพธ์:**

```
dist/assets/index-abd688ce.js  290.20 kB
```

**ปัญหา:**

- ✅ Build สำเร็จ (โค้ด v2.0 อยู่ใน `src/`)
- ❌ Browser ยัง cache โค้ด v1.0 เก่า
- ❌ ไม่ได้ใช้ build ใหม่

---

## ✅ วิธีแก้ปัญหา

### Step 1: Clear Browser Cache (สำคัญที่สุด!)

**Option A: Hard Reload (แนะนำ)**

```
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows/Linux)
```

**Option B: Clear All Cache**

1. เปิด Developer Tools: `Cmd + Option + I`
2. คลิกขวาที่ปุ่ม Reload
3. เลือก "Empty Cache and Hard Reload"

**Option C: Disable Cache (สำหรับ Development)**

1. Developer Tools → Network Tab
2. ☑️ เปิด "Disable cache"
3. เก็บ DevTools เปิดไว้ตลอด

### Step 2: ตรวจสอบว่า v2.0 ทำงาน

เปิด Browser Console (`Cmd + Option + J`) แล้วดูว่ามี log นี้:

**v2.0 (ถูกต้อง):**

```javascript
🍎 Using IP-Adapter workflow (Mac Optimized)
🔧 Built workflow with nodes: 11
📦 Workflow structure: {
  "11": "LoadImage",
  "20": "IPAdapterUnifiedLoader",  // ← ต้องเจอ!
  "21": "IPAdapter"
}
```

**v1.0 (ผิด - ถ้าเจอให้ clear cache อีกครั้ง):**

```javascript
📦 Workflow structure: {
  "20": "CLIPVisionLoader",         // ← เก่า!
  "21": "CLIPVisionEncode",
  "22": "IPAdapterModelLoader"
}
```

### Step 3: ทดสอบสร้างภาพ

1. อัพโหลดรูปใบหน้า
2. คลิก "Face ID Portrait"
3. ดู logs ใน Console

**คาดหวัง:**

```
🔄 [1/3] Trying IP-Adapter Unified (No InsightFace)...
   ⚡ Speed: 3-5 minutes
   📦 Using: IPAdapterUnifiedLoader + PLUS FACE preset
```

**ไม่ควรเจอ:**

```
Exception: IPAdapter model not present in the pipeline
```

---

## 🔬 Debug ลึก (ถ้ายังไม่ได้)

### 1. ตรวจสอบ Backend Logs

```bash
tail -50 ~/Desktop/backend-restart.log | grep "workflow"
```

**ควรเห็น:**

```
🔍 Workflow nodes: 11
🔍 Workflow structure: {
  "20": "IPAdapterUnifiedLoader"  // ← ต้องมี!
}
```

### 2. ตรวจสอบ ComfyUI Status

```bash
tail -100 ~/Desktop/comfyui-restart.log | grep -i "ipadapter\|unified"
```

**ไม่ควรเจอ:**

```
Exception: IPAdapter model not present
```

### 3. Restart ทุกอย่าง

**A. Restart Frontend (Browser)**

```bash
# Hard refresh
Cmd + Shift + R
```

**B. Restart Backend**

```bash
# Kill old process
lsof -ti:8000 | xargs kill -9

# Start new
cd "/Users/surasak.peace/Desktop/peace-script-basic-v1 /comfyui-service"
NODE_ENV=production node src/server.js > ~/Desktop/backend-restart.log 2>&1 &
```

**C. Restart ComfyUI**

```bash
# Kill old
lsof -ti:8188 | xargs kill -9

# Start new
cd ~/Desktop/ComfyUI
nohup python main.py > ~/Desktop/comfyui-restart.log 2>&1 &
```

---

## 📊 Checklist การแก้ปัญหา

### Before Testing

- [ ] Build frontend ใหม่: `npm run build`
- [ ] Hard reload browser: `Cmd + Shift + R`
- [ ] เปิด DevTools และเช็ค Network tab ว่าโหลด JS ใหม่
- [ ] Backend running บน port 8000
- [ ] ComfyUI running บน port 8188

### During Testing

- [ ] เช็ค Console logs ว่ามี `IPAdapterUnifiedLoader`
- [ ] ไม่มี error: "model not present in pipeline"
- [ ] Workflow มี 11 nodes (ไม่ใช่ 8 nodes)

### After Testing

- [ ] ถ้ายังช้า 35 นาที → clear cache อีกครั้ง
- [ ] ถ้าเร็ว 3-5 นาที → สำเร็จ! ✅
- [ ] ถ้า error → เช็ค ComfyUI logs

---

## 🎯 Expected Results

### v2.0 ทำงานถูกต้อง (เป้าหมาย)

**Logs:**

```
🍎 MAC HYBRID FALLBACK CHAIN (v2)
🔄 [1/3] Trying IP-Adapter Unified (No InsightFace)...
📦 Using: IPAdapterUnifiedLoader + PLUS FACE preset

[Generation progress: 10% → 100%]

✅ [1/3] SUCCESS: IP-Adapter Unified completed!
Time: 3-5 minutes
```

**Workflow Structure:**

```json
{
  "11": "LoadImage", // Reference image
  "20": "IPAdapterUnifiedLoader", // v2.0 loader
  "21": "IPAdapter", // Apply
  "3": "KSampler" // Generate
}
```

### v1.0 ยังทำงาน (ผิด - ต้องแก้)

**Logs:**

```
Exception: IPAdapter model not present in the pipeline.
Please load the models with the IPAdapterUnifiedLoader node.

[Timeout after 35 minutes]
```

**Workflow Structure:**

```json
{
  "20": "CLIPVisionLoader", // v1.0 - ผิด!
  "21": "CLIPVisionEncode",
  "22": "IPAdapterModelLoader",
  "23": "IPAdapter"
}
```

---

## 💡 Tips

### 1. แน่ใจว่า Cache ถูก Clear

```javascript
// เช็คใน Browser Console
window.location.reload(true); // Force reload ไม่ใช้ cache
```

### 2. เช็ค Build Hash

```bash
# ดู build files
ls -lh dist/assets/

# ถ้า hash ไม่เปลี่ยน → rebuild
rm -rf dist
npm run build
```

### 3. Monitor Logs Real-time

```bash
# Terminal 1: Backend
tail -f ~/Desktop/backend-restart.log

# Terminal 2: ComfyUI
tail -f ~/Desktop/comfyui-restart.log
```

---

## 🚨 Known Issues

### Issue 1: Browser Cache ไม่ Clear

**อาการ:** ยัง timeout 35 นาที แม้ build ใหม่  
**วิธีแก้:** ใช้ Incognito Mode (`Cmd + Shift + N`)

### Issue 2: Backend ใช้ Old Code

**อาการ:** Logs แสดง old workflow  
**วิธีแก้:** Restart backend service

### Issue 3: ComfyUI Cache Workflow

**อาการ:** Error "model not present"  
**วิธีแก้:** Restart ComfyUI

---

## ✅ Success Indicators

ถ้าเห็นข้อความนี้ = **สำเร็จ!**

```
✅ [1/3] SUCCESS: IP-Adapter Unified completed!
⏱️  Generation time: 3-5 minutes
🎯 Face similarity: 70-80%
💰 Cost: FREE (unlimited)
```

ถ้าเห็นข้อความนี้ = **ยังไม่สำเร็จ**

```
❌ [1/3] FAILED: IP-Adapter - Job timeout after 35 minutes
Exception: IPAdapter model not present in the pipeline
```

---

**สรุป:** Clear browser cache ด้วย `Cmd + Shift + R` แล้วทดสอบใหม่!
