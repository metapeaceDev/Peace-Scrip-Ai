# 🎓 คู่มือการตั้งค่า Google Colab Pro+ สำหรับ ComfyUI

## 📋 สิ่งที่ต้องเตรียม

1. ✅ **Google Colab Pro+** subscription ($49.99/เดือน)
2. ✅ **ngrok** account (ฟรี) สำหรับ tunnel - [สมัครที่นี่](https://ngrok.com)
3. ✅ บัญชี Google Drive (ฟรี)

---

## 🚀 ขั้นตอนการติดตั้ง

### 1️⃣ เปิด Google Colab

1. ไปที่ [Google Colab](https://colab.research.google.com)
2. สร้าง Notebook ใหม่: **File → New Notebook**
3. ตั้งชื่อ: `ComfyUI_Server.ipynb`

### 2️⃣ เปิด GPU A100

1. คลิก **Runtime → Change runtime type**
2. เลือก:
   - **Hardware accelerator**: GPU
   - **GPU type**: A100 (Colab Pro+ เท่านั้น)
3. คลิก **Save**

### 3️⃣ ติดตั้ง ComfyUI

วาง code นี้ใน cell แรกแล้วรัน:

```python
# Cell 1: ติดตั้ง ComfyUI
!git clone https://github.com/comfyanonymous/ComfyUI
%cd ComfyUI
!pip install -r requirements.txt
!pip install xformers

# ดาวน์โหลด models (SDXL)
!wget -c https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors \
  -P models/checkpoints/

# ดาวน์โหลด VAE
!wget -c https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors \
  -P models/vae/

print("✅ ComfyUI ติดตั้งเสร็จแล้ว!")
```

⏱️ **เวลาที่ใช้**: ~5-10 นาที

### 4️⃣ ติดตั้ง Custom Nodes (สำหรับ Face ID)

```python
# Cell 2: ติดตั้ง Custom Nodes
%cd /content/ComfyUI/custom_nodes

# IP-Adapter สำหรับ Face ID
!git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus

# ControlNet
!git clone https://github.com/Fannovel16/comfyui_controlnet_aux

# ติดตั้ง dependencies
%cd /content/ComfyUI
!pip install insightface onnxruntime-gpu

print("✅ Custom nodes ติดตั้งเสร็จแล้ว!")
```

### 5️⃣ ดาวน์โหลด IP-Adapter Models

```python
# Cell 3: ดาวน์โหลด IP-Adapter models
!mkdir -p models/ipadapter
!mkdir -p models/clip_vision

# IP-Adapter Plus Face model
!wget -c https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors \
  -P models/ipadapter/

# CLIP Vision model
!wget -c https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors \
  -P models/clip_vision/

# InsightFace model สำหรับ face detection
!wget -c https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip \
  -P models/insightface/
!unzip -o models/insightface/buffalo_l.zip -d models/insightface/

print("✅ IP-Adapter models พร้อมแล้ว!")
```

### 6️⃣ เริ่ม ComfyUI Server

```python
# Cell 4: เริ่ม ComfyUI (รันเป็น background)
import subprocess
import threading

def run_comfyui():
    subprocess.run([
        "python", "main.py",
        "--listen", "0.0.0.0",
        "--port", "8188"
    ])

# เริ่ม server ใน background thread
server_thread = threading.Thread(target=run_comfyui, daemon=True)
server_thread.start()

print("🚀 ComfyUI server กำลังเริ่มต้น...")
print("⏳ รอ 30 วินาที...")

import time
time.sleep(30)
print("✅ ComfyUI พร้อมใช้งาน!")
```

### 7️⃣ สร้าง ngrok Tunnel

```python
# Cell 5: ติดตั้งและเริ่ม ngrok
!pip install pyngrok

from pyngrok import ngrok, conf

# ใส่ authtoken ของคุณจาก https://dashboard.ngrok.com/get-started/your-authtoken
ngrok_token = "YOUR_NGROK_TOKEN_HERE"  # 🔑 เปลี่ยนตรงนี้!
conf.get_default().auth_token = ngrok_token

# สร้าง tunnel
public_url = ngrok.connect(8188, bind_tls=True)
print(f"\n🌐 ComfyUI Public URL:")
print(f"   {public_url}")
print(f"\n📋 คัดลอก URL ด้านบนไปใส่ใน Peace Script AI settings!")
print(f"   Environment Variable: VITE_COLAB_TUNNEL_URL={public_url}")
```

---

## ⚙️ ตั้งค่าใน Peace Script AI

### วิธีที่ 1: ใช้ .env.local (แนะนำ)

สร้างไฟล์ `.env.local` ใน root project:

```env
# Google Colab ComfyUI Tunnel
VITE_COLAB_TUNNEL_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

### วิธีที่ 2: ใช้ DeviceSettings UI

1. เปิด Peace Script AI
2. คลิก **🖥️ Device Settings**
3. เลือก **☁️ Cloud**
4. เลือก **🎓 Google Colab Pro+**
5. ทำตาม wizard ในการตั้งค่า

---

## 🎯 การใช้งาน

### ทดสอบว่า Colab ทำงาน

```bash
# ทดสอบด้วย curl
curl https://YOUR-NGROK-URL.ngrok-free.app/system_stats
```

ถ้าได้ JSON response = ✅ สำเร็จ!

### เลือกใช้ Colab ในการเจน

1. ไปที่ Character Creation หรือ Scene Generation
2. เลือก **Model**: ComfyUI + SDXL
3. เลือก **Mode**: Cloud
4. เลือก **Provider**: Google Colab Pro+
5. กด Generate!

---

## 💡 Tips & Tricks

### 🔥 ประหยัด Compute Units

- ปิด Colab เมื่อไม่ใช้งาน (ประหยัด credits)
- ใช้ **Hybrid mode** = ลอง Local ก่อน ถ้าไม่ได้ใช้ Colab
- Colab Pro+ ได้ ~400 compute units/เดือน (~40 ชม. A100)

### ⚡ เร็วขึ้น

- เก็บ models ใน Google Drive แล้ว mount:
  ```python
  from google.colab import drive
  drive.mount('/content/drive')
  !ln -s /content/drive/MyDrive/ComfyUI/models /content/ComfyUI/models
  ```
- ใช้ Cloudflare Tunnel แทน ngrok (เร็วกว่า, ไม่มีข้อจำกัด)

### 🔒 ความปลอดภัย

- **อย่าแชร์** ngrok URL ให้คนอื่น
- ใช้ ngrok authtoken ส่วนตัว
- ตั้ง API key ถ้าต้องการ authentication

---

## 🐛 แก้ปัญหา

### Colab หลุดบ่อย

- **สาเหตุ**: Idle timeout (90 นาที)
- **วิธีแก้**: เปิด tab Colab ค้างไว้ หรือรัน keep-alive script:
  ```python
  import time
  while True:
      print("🔄 Keep alive...")
      time.sleep(300)  # ทุก 5 นาที
  ```

### ngrok ไม่ทำงาน

- ตรวจสอบว่าใส่ authtoken ถูกต้อง
- ลองใช้ Cloudflare Tunnel แทน:
  ```bash
  !cloudflared tunnel --url http://localhost:8188
  ```

### รูปเจนช้า

- ตรวจสอบว่าใช้ A100 จริง: `!nvidia-smi`
- ลด resolution: 512x512 แทน 1024x1024
- ลด steps: 20 แทน 30

### Out of Memory

- เปิด **Low VRAM mode** ใน DeviceSettings
- ลด batch size เหลือ 1
- ใช้ SDXL แทน SD 1.5 (เบากว่า)

---

## 📊 เปรียบเทียบ Performance

| Device                 | Speed         | Cost            | Quality    |
| ---------------------- | ------------- | --------------- | ---------- |
| **Colab A100**         | ⚡⚡⚡ 15-20s | 💰 $0.008/รูป\* | 🌟🌟🌟🌟🌟 |
| **Local RTX 4090**     | ⚡⚡⚡ 10-15s | 💰 Free         | 🌟🌟🌟🌟🌟 |
| **Local Apple M2 Max** | ⚡⚡ 30-40s   | 💰 Free         | 🌟🌟🌟🌟   |
| **Firebase Cloud**     | ⚡⚡ 40-60s   | 💰 Free (Pro+)  | 🌟🌟🌟🌟   |

\* คำนวณจาก Colab Pro+ $49.99/เดือน ≈ 6,000 รูป

---

## 🎓 Advanced: ใช้ Colab Pro+ ให้คุ้มสุด

### 1. ติดตั้ง LoRA models เพิ่ม

```python
!wget https://civitai.com/api/download/models/XXX -O models/loras/custom.safetensors
```

### 2. ใช้ Flux.1 แทน SDXL (ใหม่กว่า)

```python
!wget https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors \
  -P models/checkpoints/
```

### 3. เปิด API สำหรับทีม

```python
# รัน ComfyUI พร้อม basic auth
!python main.py --listen 0.0.0.0 --port 8188 --enable-auth --username admin --password YOUR_PASSWORD
```

---

## 📞 ขอความช่วยเหลือ

- **Discord**: [Peace Script AI Community](https://discord.gg/peacescriptai)
- **GitHub Issues**: [Peace-Scrip-Ai/issues](https://github.com/metapeaceDev/Peace-Scrip-Ai/issues)
- **Email**: support@peacescriptai.com

---

## ✨ สรุป

คุณจ่าย **Colab Pro+ $49.99/เดือน** แล้ว → ใช้ให้คุ้ม!

เมื่อตั้งค่าเสร็จ คุณจะได้:

- ✅ **A100 GPU** ที่เร็วที่สุด
- ✅ **ไม่ต้องใช้เครื่องตัวเอง** (ประหยัดไฟ)
- ✅ **เจนได้ทุกที่** (มีแค่อินเทอร์เน็ต)
- ✅ **คุ้มกว่า RunPod** (~$0.008 vs $0.01/รูป)

🚀 **Happy Generating!**
