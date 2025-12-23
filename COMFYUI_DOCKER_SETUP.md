# ComfyUI Docker Setup - RTX 5090 GPU

## 🎉 สำเร็จแล้ว! ComfyUI พร้อมใช้งานบน Docker

### ✅ สิ่งที่ติดตั้งเสร็จแล้ว

**Hardware:**
- GPU: NVIDIA GeForce RTX 5090 (32GB VRAM)
- CUDA: 12.1
- Driver: 591.44

**Software:**
- Docker Desktop: 29.1.3
- Python: 3.10.12 (in container)
- PyTorch: 2.5.1+cu121
- ComfyUI: 0.5.1

**Models Downloaded:**
- Stable Diffusion 1.5: 3.97 GB
- Stable Diffusion XL: 6.46 GB
- Stable Video Diffusion: 8.90 GB

---

## 🚀 การใช้งาน

### เริ่มต้น ComfyUI

```powershell
# ตรวจสอบสถานะ
docker ps

# เริ่ม container (ถ้าหยุด)
docker start comfyui

# ดู logs
docker logs comfyui -f

# หยุด container
docker stop comfyui

# Restart container
docker restart comfyui
```

### เข้าใช้งาน ComfyUI UI

เปิดเบราว์เซอร์: **http://localhost:8188**

หรือใช้คำสั่ง:
```powershell
Start-Process "http://localhost:8188"
```

---

## 📊 ตรวจสอบสถานะ

### ตรวจสอบ GPU Usage

```powershell
# ใน Windows
docker exec comfyui nvidia-smi

# ดูการใช้ VRAM
docker exec comfyui nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv
```

### ตรวจสอบ API

```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:8188/system_stats -UseBasicParsing

# ดู queue
Invoke-WebRequest -Uri http://localhost:8188/queue -UseBasicParsing

# ดู models
Invoke-WebRequest -Uri http://localhost:8188/object_info -UseBasicParsing
```

---

## 📁 โครงสร้าง Docker

### Container Details

```yaml
Container: comfyui
Image: comfyui-local:latest
Port: 8188:8188
GPU: --gpus all
Volumes:
  - C:\Users\USER\ComfyUI\models:/app/models
  - C:\Users\USER\ComfyUI\output:/app/output
```

### ตำแหน่งไฟล์

**บน Windows:**
- Models: `C:\Users\USER\ComfyUI\models\checkpoints\`
- Output: `C:\Users\USER\ComfyUI\output\`
- ComfyUI Source: `C:\Users\USER\ComfyUI\`

**ใน Container:**
- Models: `/app/models/checkpoints/`
- Output: `/app/output/`
- ComfyUI: `/app/`

---

## 🔧 การแก้ปัญหา

### Container ไม่เริ่มต้น

```powershell
# ดู logs แบบละเอียด
docker logs comfyui --tail 100

# ตรวจสอบ exit code
docker ps -a

# ลบและสร้างใหม่
docker stop comfyui
docker rm comfyui
docker run -d --name comfyui --gpus all -p 8188:8188 \
  -v "C:\Users\USER\ComfyUI\models:/app/models" \
  -v "C:\Users\USER\ComfyUI\output:/app/output" \
  comfyui-local:latest
```

### GPU ไม่ทำงาน

```powershell
# ตรวจสอบ NVIDIA Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# Restart Docker Desktop
Stop-Process -Name "Docker Desktop" -Force
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Port 8188 ถูกใช้แล้ว

```powershell
# หา process ที่ใช้ port
netstat -ano | Select-String "8188"

# หรือเปลี่ยน port
docker stop comfyui
docker rm comfyui
docker run -d --name comfyui --gpus all -p 8189:8188 \
  -v "C:\Users\USER\ComfyUI\models:/app/models" \
  -v "C:\Users\USER\ComfyUI\output:/app/output" \
  comfyui-local:latest

# เข้าใช้งานที่ http://localhost:8189
```

---

## 🎨 เพิ่ม Models

### วิธีการ 1: Copy ไฟล์โดยตรง

```powershell
# Copy model ไปที่ checkpoints folder
Copy-Item "Downloads\model.safetensors" -Destination "C:\Users\USER\ComfyUI\models\checkpoints\"

# Restart ComfyUI
docker restart comfyui
```

### วิธีการ 2: ดาวน์โหลดจาก Hugging Face

```powershell
# ใช้ browser download
# SD 1.5: https://huggingface.co/runwayml/stable-diffusion-v1-5
# SDXL: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
# SVD: https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt

# หรือใช้ git lfs
cd C:\Users\USER\ComfyUI\models\checkpoints
git lfs install
git clone https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
```

---

## 🔄 การอัพเดต ComfyUI

### อัพเดต Code

```powershell
# Pull latest changes
cd C:\Users\USER\ComfyUI
git pull origin master

# Rebuild Docker image
docker build -t comfyui-local:latest .

# Stop และ recreate container
docker stop comfyui
docker rm comfyui
docker run -d --name comfyui --gpus all -p 8188:8188 \
  -v "C:\Users\USER\ComfyUI\models:/app/models" \
  -v "C:\Users\USER\ComfyUI\output:/app/output" \
  comfyui-local:latest
```

### อัพเดต Dependencies

```powershell
# เข้าไปใน container
docker exec -it comfyui bash

# อัพเดต packages
pip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install --upgrade -r requirements.txt

# Exit และ restart
exit
docker restart comfyui
```

---

## 📈 Performance Tips

### GPU Memory Management

ComfyUI จะใช้ VRAM ประมาณ:
- SD 1.5: ~2-3 GB
- SDXL: ~6-8 GB
- SVD (Video): ~10-12 GB

### Speed Optimization

```yaml
# ComfyUI จะ auto-detect และใช้:
- cudaMallocAsync: สำหรับ memory management
- Async weight offloading: 2 streams
- Pinned memory: 30GB
```

### Batch Processing

สามารถสร้างรูปหลายภาพพร้อมกันได้:
- RTX 5090 32GB: แนะนำ batch size 4-8 สำหรับ SD 1.5
- SDXL: batch size 2-4

---

## 🌐 เชื่อมต่อกับ Frontend

### Peace Script AI Integration

Frontend อยู่ที่: https://peace-script-ai.web.app

**Configuration:**
```env
VITE_COMFYUI_URL=http://localhost:8188
VITE_COMFYUI_API_URL=http://localhost:8188
VITE_COMFYUI_ENABLED=true
VITE_USE_COMFYUI_BACKEND=false
```

### API Endpoints

```
GET  /system_stats    - ตรวจสอบสถานะระบบ
GET  /queue           - ดู generation queue
POST /prompt          - ส่ง generation request
GET  /history         - ดู generation history
GET  /object_info     - ดู available models/nodes
```

---

## 💾 Backup และ Restore

### Backup Models

```powershell
# Backup checkpoints
Copy-Item -Recurse "C:\Users\USER\ComfyUI\models" -Destination "D:\Backups\ComfyUI_Models_$(Get-Date -Format 'yyyy-MM-dd')"
```

### Backup Generated Images

```powershell
# Backup output
Copy-Item -Recurse "C:\Users\USER\ComfyUI\output" -Destination "D:\Backups\ComfyUI_Output_$(Get-Date -Format 'yyyy-MM-dd')"
```

### Export Docker Image

```powershell
# Save image to file
docker save comfyui-local:latest -o comfyui-backup.tar

# Load from file
docker load -i comfyui-backup.tar
```

---

## 📚 Resources

- ComfyUI GitHub: https://github.com/comfyanonymous/ComfyUI
- Models: https://huggingface.co/models
- Docker Docs: https://docs.docker.com/
- CUDA Toolkit: https://developer.nvidia.com/cuda-toolkit

---

## ✅ Checklist การ Setup

- [x] CUDA 12.1 Toolkit ติดตั้งแล้ว
- [x] PyTorch 2.6 Nightly รองรับ RTX 5090
- [x] Docker Desktop ทำงานด้วย GPU
- [x] ComfyUI Image build สำเร็จ
- [x] Container running ด้วย GPU enabled
- [x] Models downloaded (SD 1.5, SDXL, SVD)
- [x] Web UI accessible ที่ localhost:8188
- [x] Frontend integration configured

---

**🎊 Setup Complete! ComfyUI พร้อมใช้งานด้วย RTX 5090 32GB VRAM**

สร้างวิดีโอและรูปภาพด้วย AI ได้แล้ว! 🚀
