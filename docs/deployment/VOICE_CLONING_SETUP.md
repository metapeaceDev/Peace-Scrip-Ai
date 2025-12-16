# 🎙️ Voice Cloning Setup Guide

**คู่มือการติดตั้งและใช้งานระบบโคลนเสียง**  
**Technology:** Coqui TTS XTTS-v2  
**Last Updated:** 17 ธันวาคม 2568

---

## 📋 สารบัญ

1. [ภาพรวม](#ภาพรวม)
2. [ความต้องการของระบบ](#ความต้องการของระบบ)
3. [การติดตั้ง](#การติดตั้ง)
4. [การใช้งาน](#การใช้งาน)
5. [การทดสอบ](#การทดสอบ)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## 🎯 ภาพรวม

ระบบ Voice Cloning ของ Peace Script AI ใช้เทคโนโลยี **Coqui TTS XTTS-v2** ซึ่งเป็น state-of-the-art voice cloning model ที่:

- ✅ **ฟรี 100%** - ไม่มีค่าใช้จ่าย ไม่ต้อง API key
- ✅ **Zero-shot** - ใช้ตัวอย่างเสียง 6-30 วินาที ไม่ต้อง training
- ✅ **คุณภาพสูง** - เสียงธรรมชาติ production-ready
- ✅ **รองรับภาษาไทย** - พร้อม 16 ภาษาอื่น
- ✅ **Self-hosted** - ควบคุมข้อมูลเองได้เต็มที่

---

## 💻 ความต้องการของระบบ

### ✅ Minimum Requirements (CPU Mode)

```
CPU:     4+ cores
RAM:     8GB
Storage: 5GB free space (for models)
Python:  3.10 or higher
OS:      macOS, Linux, Windows
```

**Performance:**
- Voice processing: ~10 seconds
- TTS synthesis: ~10-15 seconds per sentence

### ⚡ Recommended (GPU Mode)

```
GPU:     NVIDIA GPU with 4GB+ VRAM
         (T4, GTX 1660, RTX 2060+, V100, A100)
CPU:     8+ cores
RAM:     16GB
Storage: 10GB free space
Python:  3.10 or higher
CUDA:    11.8 or higher
```

**Performance:**
- Voice processing: ~5 seconds
- TTS synthesis: ~2-3 seconds per sentence (5-10x faster!)

---

## 🚀 การติดตั้ง

### Method 1: Python (แนะนำสำหรับ Development)

#### Step 1: ติดตั้ง Python Dependencies

```bash
# Navigate to voice cloning directory
cd backend/voice-cloning

# Install dependencies
pip install -r requirements.txt
```

**หมายเหตุ:** การติดตั้งครั้งแรกจะใช้เวลา 5-10 นาที เพราะต้องดาวน์โหลด PyTorch และ dependencies อื่นๆ

#### Step 2: (Optional) ติดตั้ง GPU Support

**สำหรับ NVIDIA GPU เท่านั้น:**

```bash
# Uninstall CPU version
pip uninstall torch torchaudio -y

# Install GPU version (CUDA 11.8)
pip install torch==2.1.0+cu118 torchaudio==2.1.0+cu118 \
    --index-url https://download.pytorch.org/whl/cu118
```

**ตรวจสอบ GPU:**

```bash
python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
# Output: CUDA available: True (ถ้ามี GPU)
```

#### Step 3: ดาวน์โหลด XTTS-v2 Model

Model จะถูกดาวน์โหลดอัตโนมัติครั้งแรกที่ใช้งาน (~1.8GB)

```bash
# Pre-download model (optional)
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
```

**Progress:**
```
Downloading model checkpoint...
[████████████████████] 100%
✅ Model downloaded successfully
```

#### Step 4: เริ่ม Server

```bash
# Development mode
python server.py

# Production mode
gunicorn --bind 0.0.0.0:8001 --workers 2 --timeout 120 server:app
```

**Expected Output:**
```
============================================================
🎙️  Voice Cloning Server Starting...
============================================================
📡 Port: 8001
🐛 Debug: False
💻 Device: cuda (หรือ cpu)
📁 Upload folder: /path/to/uploads
📁 Output folder: /path/to/outputs
============================================================
🔄 Pre-loading TTS model...
📥 Loading XTTS-v2 model...
✅ XTTS-v2 model loaded successfully
✅ Model device: cuda
============================================================
 * Running on http://0.0.0.0:8001
```

---

### Method 2: Docker (แนะนำสำหรับ Production)

#### Step 1: Build Docker Image

```bash
cd backend/voice-cloning
docker build -t voice-cloning-server .
```

#### Step 2: Run Container

**CPU Mode:**
```bash
docker run -d \
  -p 8001:8001 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  -v $(pwd)/models:/app/models \
  --name voice-cloning \
  voice-cloning-server
```

**GPU Mode (NVIDIA):**
```bash
docker run -d \
  --gpus all \
  -p 8001:8001 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  -v $(pwd)/models:/app/models \
  --name voice-cloning \
  voice-cloning-server
```

#### Step 3: Check Logs

```bash
docker logs -f voice-cloning
```

---

## 📱 การใช้งาน

### 1. เริ่ม Frontend

```bash
# จากโฟลเดอร์หลัก
npm run dev
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:5173`

### 2. อัปโหลดตัวอย่างเสียง

#### ผ่าน UI (แนะนำ)

1. คลิกปุ่ม **"🎙️ โคลนเสียง"** (จะเพิ่มใน UI)
2. เลือก **"📤 อัปโหลดเสียงใหม่"**
3. **Drag & Drop** ไฟล์เสียง หรือคลิกเลือกไฟล์
4. ใส่ **ชื่อเสียง** (เช่น "เสียงของฉัน")
5. คลิก **"อัปโหลด"**

**ข้อแนะนำสำหรับไฟล์เสียง:**
- ✅ **ความยาว:** 6-30 วินาที (แนะนำ 15-20 วินาที)
- ✅ **เนื้อหา:** พูดธรรมชาติ มีความหลากหลาย
- ✅ **คุณภาพ:** ไม่มีเสียงรบกวน คมชัด
- ✅ **รูปแบบ:** WAV, MP3, FLAC, OGG, M4A
- ✅ **ภาษา:** ภาษาที่ต้องการสังเคราะห์

#### ผ่าน API (สำหรับ Developer)

```bash
curl -X POST http://localhost:8001/voice/upload \
  -F "file=@voice_sample.wav" \
  -F "voice_name=my_voice"
```

**Response:**
```json
{
  "success": true,
  "voice_id": "my_voice_20231217_123456",
  "duration": 15.2,
  "recommendation": "optimal"
}
```

### 3. สังเคราะห์เสียง

#### ผ่าน UI

1. พิมพ์ข้อความที่ต้องการแปลงเป็นเสียง
2. เลือก **"🎙️ เสียงโคลน"** แทนเสียงพื้นฐาน
3. เลือกเสียงจาก **"คลังเสียง"**
4. คลิก **"🔊 เล่นเสียง"**

#### ผ่าน API

```bash
curl -X POST http://localhost:8001/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "สวัสดีครับ ยินดีต้อนรับสู่ระบบโคลนเสียง",
    "voice_id": "my_voice_20231217_123456",
    "language": "th",
    "speed": 1.0
  }' \
  --output synthesized_speech.wav
```

### 4. จัดการเสียงในคลัง

#### ผ่าน UI

1. เปิด **"📚 คลังเสียง"**
2. ดูรายการเสียงทั้งหมด
3. **เลือก** เสียงที่ต้องการใช้
4. **ลบ** เสียงที่ไม่ต้องการ

#### ผ่าน API

**ดูรายการ:**
```bash
curl http://localhost:8001/voice/list
```

**ลบเสียง:**
```bash
curl -X DELETE http://localhost:8001/voice/delete/my_voice_20231217_123456
```

---

## 🧪 การทดสอบ

### Test 1: Health Check

```bash
curl http://localhost:8001/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "Voice Cloning Server",
  "model": "XTTS-v2",
  "device": "cuda",
  "cuda_available": true
}
```

### Test 2: Model Info

```bash
curl http://localhost:8001/model/info
```

**Expected:**
```json
{
  "success": true,
  "model_name": "XTTS-v2",
  "languages": ["en", "es", "fr", ... "th"],
  "device": "cuda"
}
```

### Test 3: Upload Voice Sample

```bash
# Download sample voice
curl -o sample.wav https://example.com/sample_thai_voice.wav

# Upload
curl -X POST http://localhost:8001/voice/upload \
  -F "file=@sample.wav" \
  -F "voice_name=test_voice"
```

### Test 4: Synthesize Speech

```bash
curl -X POST http://localhost:8001/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "นี่คือการทดสอบระบบโคลนเสียง",
    "voice_id": "test_voice_20231217_123456",
    "language": "th"
  }' \
  --output test_output.wav

# Play audio (macOS)
afplay test_output.wav

# Play audio (Linux)
aplay test_output.wav
```

---

## 🔧 Troubleshooting

### ❌ Problem: Server ไม่ทำงาน

**Symptom:**
```
curl: (7) Failed to connect to localhost port 8001
```

**Solutions:**

1. **ตรวจสอบว่า server กำลังทำงาน:**
```bash
ps aux | grep server.py
```

2. **ตรวจสอบ port:**
```bash
lsof -i :8001
```

3. **เริ่ม server ใหม่:**
```bash
python server.py
```

---

### ❌ Problem: Model ดาวน์โหลดช้า

**Symptom:**
```
Downloading model checkpoint... (very slow)
```

**Solutions:**

1. **ใช้ connection ที่เร็วกว่า**

2. **ดาวน์โหลดล่วงหน้า:**
```bash
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
```

3. **Manual download:**
```bash
# Download from Hugging Face
wget https://huggingface.co/coqui/XTTS-v2/resolve/main/model.pth
```

---

### ❌ Problem: CUDA Out of Memory

**Symptom:**
```
RuntimeError: CUDA out of memory
```

**Solutions:**

1. **ใช้ CPU mode:**
```bash
export DEVICE=cpu
python server.py
```

2. **Reduce batch size** (แก้ไขใน server.py)

3. **Upgrade GPU** หรือใช้ cloud GPU

---

### ❌ Problem: เสียงไม่ธรรมชาติ

**Causes:**
- Voice sample สั้นเกินไป (< 6 วินาที)
- มีเสียงรบกวนมาก
- คุณภาพไฟล์ไม่ดี

**Solutions:**

1. **ใช้ voice sample ที่ยาวขึ้น** (15-20 วินาที)
2. **ใช้ไฟล์คุณภาพสูง** (WAV, FLAC)
3. **ลดเสียงรบกวน** ก่อนอัปโหลด
4. **พูดธรรมชาติ** มีความหลากหลาย

---

### ❌ Problem: Synthesis ช้า (CPU)

**Symptom:**
```
Synthesis takes 15+ seconds per sentence
```

**Solutions:**

1. **ใช้ GPU** (แนะนำ)
```bash
pip install torch==2.1.0+cu118 torchaudio==2.1.0+cu118 \
    --index-url https://download.pytorch.org/whl/cu118
```

2. **ใช้ cloud GPU:**
   - Google Colab (free)
   - Railway (paid)
   - Render (paid)

3. **ลดความยาวข้อความ**

---

## ❓ FAQ

### Q1: ต้องใช้ GPU หรือไม่?

**A:** ไม่จำเป็น แต่แนะนำ
- **CPU:** ใช้ได้ แต่ช้า (~10-15s/sentence)
- **GPU:** เร็วมาก (~2-3s/sentence)

---

### Q2: รองรับภาษาอะไรบ้าง?

**A:** 17 ภาษา:
- ภาษาไทย (th)
- English (en)
- Chinese (zh-cn)
- Japanese (ja)
- Korean (ko)
- และอีก 12 ภาษา

---

### Q3: ข้อมูลเสียงปลอดภัยไหม?

**A:** ปลอดภัย 100%
- Self-hosted บนเครื่องของคุณ
- ไม่ส่งข้อมูลไปที่อื่น
- คุณควบคุมข้อมูลได้เต็มที่

---

### Q4: ใช้เสียงได้กี่เสียง?

**A:** ไม่จำกัด
- สร้างได้ไม่จำกัด
- ใช้ได้ไม่จำกัด
- ฟรี 100%

---

### Q5: คุณภาพเทียบกับ ElevenLabs?

**A:** ใกล้เคียง
- XTTS-v2: ⭐⭐⭐⭐⭐ (ฟรี)
- ElevenLabs: ⭐⭐⭐⭐⭐ (ต้องจ่าย)

---

### Q6: สามารถใช้เชิงพาณิชย์ได้ไหม?

**A:** ได้!
- Coqui TTS: Mozilla Public License 2.0
- ใช้เชิงพาณิชย์ได้
- ไม่ต้องจ่ายค่า license

---

### Q7: ทำงานบน Mac M1/M2/M3 ได้ไหม?

**A:** ได้! (CPU mode)
```bash
# M1/M2/M3 ใช้ CPU mode
pip install -r requirements.txt
python server.py
```

---

### Q8: Deploy ไปที่ไหนได้บ้าง?

**A:** หลายที่:
- Railway (แนะนำ)
- Render
- Google Cloud Run
- AWS EC2
- Azure VM
- หรือ server ตัวเอง

---

## 📞 การติดต่อและสนับสนุน

### 📖 เอกสาร
- Architecture: `docs/VOICE_CLONING_ARCHITECTURE.md`
- API Docs: `backend/voice-cloning/README.md`
- This guide: `docs/deployment/VOICE_CLONING_SETUP.md`

### 🐛 Report Issues
- GitHub: [Peace Script AI Issues](https://github.com/metapeaceDev/Peace-Script-Ai/issues)

### 💬 Community
- Discord: [Peace Script AI Community](https://discord.gg/peace-script-ai)

### 📧 Email
- Support: support@peace-script-ai.com
- Technical: tech@peace-script-ai.com

---

## 🎉 ขั้นตอนถัดไป

เมื่อติดตั้งเสร็จแล้ว:

1. ✅ **อัปโหลดเสียงของคุณ** (15-20 วินาที)
2. ✅ **ทดสอบสังเคราะห์เสียง**
3. ✅ **ปรับแต่งความเร็ว** (0.5-2.0x)
4. ✅ **ทดลองภาษาต่างๆ**
5. ✅ **สร้างเสียงหลายๆ แบบ**

**สนุกกับการโคลนเสียง! 🎊**
