# 🎨 ComfyUI Setup Complete Guide

## ✅ ติดตั้งแล้ว

### ComfyUI Installation
```
📍 Location: ~/Desktop/ComfyUI
✅ Python Dependencies: Installed
✅ Frontend: Installed  
```

### Models (กำลังดาวน์โหลด)

#### 1. Checkpoint Model
- **SDXL Base 1.0** (6.94 GB)
- Location: `~/Desktop/ComfyUI/models/checkpoints/`
- Status: 🔄 Downloading...

#### 2. VAE Model  
- **SDXL VAE** (335 MB)
- Location: `~/Desktop/ComfyUI/models/vae/`
- Status: 🔄 Downloading...

#### 3. LoRA Models (ทางเลือก)
- Location: `~/Desktop/ComfyUI/models/loras/`
- Status: ⬜ ยังไม่ได้ติดตั้ง

---

## 📊 ตรวจสอบสถานะ

```bash
# ตรวจสอบความคืบหน้าการดาวน์โหลด
ls -lh ~/Desktop/ComfyUI/models/checkpoints/
ls -lh ~/Desktop/ComfyUI/models/vae/

# ใช้ script ตรวจสอบ
./check-models.sh
```

---

## 🚀 เริ่มใช้งาน ComfyUI

### หลังดาวน์โหลดเสร็จ:

```bash
# วิธีที่ 1: ใช้ script (แนะนำ)
./start-comfyui.sh

# วิธีที่ 2: เริ่มด้วยตัวเอง
cd ~/Desktop/ComfyUI
python3 main.py --listen 0.0.0.0 --port 8188
```

จากนั้นเปิด: **http://localhost:8188**

---

## 📥 ดาวน์โหลด LoRA Models (ทางเลือก)

### แนะนำสำหรับ Peace Script AI:

1. **Add Details XL**
   - ประเภท: Detail enhancer
   - ดาวน์โหลด: https://civitai.com/models/122359
   - ขนาด: ~200 MB

2. **SDXL Render**
   - ประเภท: Photorealistic
   - ดาวน์โหลด: https://civitai.com/models/142675  
   - ขนาด: ~150 MB

### วิธีติดตั้ง LoRA:

```bash
cd ~/Desktop/ComfyUI/models/loras/

# ดาวน์โหลดจาก Civitai (manual)
# หรือใช้ wget/curl ถ้ามี direct link
```

---

## 🔗 เชื่อมต่อกับ Backend

หลัง ComfyUI ทำงาน:

1. ✅ ComfyUI จะทำงานที่ **http://localhost:8188**
2. ✅ Backend service จะเชื่อมต่ออัตโนมัติ
3. ✅ Worker status จะแสดงใน Frontend

### ตรวจสอบการเชื่อมต่อ:

```bash
# ทดสอบ ComfyUI API
curl http://localhost:8188/system_stats

# ทดสอบ Backend integration
cd comfyui-service
node test-backend.js
```

---

## 📋 Checklist

### พื้นฐาน (จำเป็น):
- [x] ComfyUI installed
- [🔄] SDXL Checkpoint (กำลังดาวน์โหลด)
- [🔄] SDXL VAE (กำลังดาวน์โหลด)

### เสริม (แนะนำ):
- [ ] LoRA Models
- [ ] Additional Checkpoints (FLUX, etc.)
- [ ] Custom nodes (ถ้าต้องการ)

---

## 🎯 Next Steps

1. **รอการดาวน์โหลดเสร็จ** (~10-30 นาที ขึ้นกับความเร็วเน็ต)
   ```bash
   # ตรวจสอบความคืบหน้า
   watch -n 10 './check-models.sh'
   ```

2. **เริ่ม ComfyUI**
   ```bash
   ./start-comfyui.sh
   ```

3. **ทดสอบการสร้างภาพ**
   - เปิด http://localhost:8188
   - Load workflow
   - Queue Prompt

4. **เชื่อมต่อกับ Peace Script AI**
   - Backend จะตรวจจับ ComfyUI อัตโนมัติ
   - ใช้งานผ่าน Frontend: http://localhost:5173

---

## 🆘 Troubleshooting

### ดาวน์โหลดช้าหรือหยุด:

```bash
# ตรวจสอบ process
ps aux | grep curl

# Resume download (ถ้า interrupt)
cd ~/Desktop/ComfyUI/models/checkpoints
curl -L -C - "https://huggingface.co/..." -o filename.safetensors
```

### ComfyUI ไม่เริ่ม:

```bash
# ตรวจสอบ Python
python3 --version  # ต้อง 3.8+

# ติดตั้ง dependencies ใหม่
cd ~/Desktop/ComfyUI
pip3 install --user -r requirements.txt
```

### Backend ไม่เชื่อมต่อ ComfyUI:

```bash
# ตรวจสอบว่า ComfyUI ทำงาน
curl http://localhost:8188/system_stats

# ตรวจสอบ backend config
cat comfyui-service/.env | grep COMFYUI_WORKERS
# ควรเป็น: COMFYUI_WORKERS=http://localhost:8188
```

---

## 📚 เอกสารเพิ่มเติม

- **ComfyUI Official**: https://github.com/comfyanonymous/ComfyUI
- **Model Library**: https://civitai.com
- **Workflows**: https://openart.ai/workflows

---

*Last Updated: กำลังดาวน์โหลด models...*  
*เมื่อดาวน์โหลดเสร็จจะพร้อมใช้งานทันที!*
