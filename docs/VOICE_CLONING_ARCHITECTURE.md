# 🎤 Voice Cloning System - Architecture & Implementation Plan

**วันที่:** 17 ธันวาคม 2568  
**สถานะ:** 📋 Design & Planning Phase

---

## 🎯 เป้าหมาย (Objectives)

### ความต้องการหลัก
1. **Voice Cloning**: โคลนเสียงจากตัวอย่างเสียง (voice samples)
2. **Custom Voices**: ผู้ใช้สามารถสร้างและจัดการเสียงของตัวเองได้
3. **High Quality**: คุณภาพเสียงใกล้เคียงต้นฉบับ
4. **Thai Language**: รองรับภาษาไทยอย่างเต็มรูปแบบ
5. **Production Ready**: ใช้งานจริงได้ มีความเสถียร

---

## 🔍 วิเคราะห์เทคโนโลยี Voice Cloning

### เทคโนโลยีที่พิจารณา

#### 1. **Coqui TTS + XTTS v2** ⭐⭐⭐⭐⭐ (แนะนำที่สุด)

**ข้อดี:**
- ✅ **Open Source** - ฟรี ไม่มีค่าใช้จ่าย
- ✅ **Zero-Shot Voice Cloning** - ไม่ต้อง fine-tune
- ✅ **Multilingual** - รองรับ 17 ภาษา รวมภาษาไทย
- ✅ **High Quality** - คุณภาพเสียงระดับ production
- ✅ **Fast Inference** - ~2-3 seconds ต่อประโยค
- ✅ **Low Requirements** - ใช้ voice sample สั้นๆ (6-30 วินาที)
- ✅ **Python Library** - ติดตั้งง่าย integrate ได้เลย
- ✅ **Active Development** - community support ดี

**ข้อจำกัด:**
- ⚠️ ต้องการ GPU (แนะนำ NVIDIA GPU 4GB+ VRAM)
- ⚠️ CPU mode ช้ากว่า (~10-15 seconds ต่อประโยค)
- ⚠️ Model size ใหญ่ (~1.8GB)

**Technical Specs:**
```python
# Coqui TTS XTTS-v2
Model Size: 1.8GB
Inference Time: 2-3s (GPU) / 10-15s (CPU)
Voice Sample: 6-30 seconds
Languages: 17 (including Thai)
Quality: ⭐⭐⭐⭐⭐
License: Mozilla Public License 2.0 (Commercial OK)
```

**Use Case:** ✅ เหมาะสำหรับ Peace Script AI
- Self-hosted deployment
- Free unlimited usage
- High quality Thai voice cloning
- Production ready

---

#### 2. **ElevenLabs API** ⭐⭐⭐⭐

**ข้อดี:**
- ✅ **Excellent Quality** - คุณภาพเสียงระดับ top tier
- ✅ **Fast** - API response < 1 second
- ✅ **Easy Integration** - REST API ใช้งานง่าย
- ✅ **Professional Voices** - เสียงธรรมชาติมาก
- ✅ **Voice Library** - มี pre-made voices ให้เลือก
- ✅ **No GPU Required** - cloud-based

**ข้อจำกัด:**
- ❌ **Paid Service** - ต้องจ่ายเงิน
- ❌ **API Quota** - จำกัด characters ต่อเดือน
- ❌ **Privacy Concerns** - ต้องส่งข้อมูลผ่าน cloud
- ⚠️ **Thai Support** - รองรับภาษาไทย แต่อาจไม่ดีเท่า native models

**Pricing:**
```
Free Tier: 10,000 characters/month (~฿0)
Starter: $5/month (30,000 chars)
Creator: $22/month (100,000 chars)
Pro: $99/month (500,000 chars)
Voice Cloning: +$5/voice clone
```

**Use Case:** ⚠️ ไม่แนะนำเป็น primary solution
- Expensive for high volume
- Privacy issues
- Better as fallback option

---

#### 3. **RVC (Retrieval-based Voice Conversion)** ⭐⭐⭐

**ข้อดี:**
- ✅ **Open Source** - ฟรี
- ✅ **High Quality** - คุณภาพดีมาก
- ✅ **Voice Conversion** - แปลงเสียงได้ดี
- ✅ **Pre-trained Models** - มี model สำเร็จรูป

**ข้อจำกัด:**
- ❌ **Training Required** - ต้อง train model ก่อนใช้
- ❌ **Complex Setup** - ติดตั้งยาก
- ❌ **Long Training Time** - ต้องใช้เวลา train นาน
- ⚠️ **Not Pure TTS** - เป็น voice conversion ไม่ใช่ TTS โดยตรง

**Use Case:** ❌ ไม่เหมาะสำหรับโปรเจคนี้
- Too complex for users
- Requires training per voice
- Not real-time

---

#### 4. **Bark by Suno** ⭐⭐⭐

**ข้อดี:**
- ✅ **Open Source** - ฟรี
- ✅ **Expressive** - เสียงมี emotion
- ✅ **Multilingual** - รองรับหลายภาษา
- ✅ **Sound Effects** - สร้าง sound effects ได้

**ข้อจำกัด:**
- ❌ **No Voice Cloning** - ไม่มีฟีเจอร์ clone เสียง
- ❌ **Slow** - ช้ามาก (30s+ per sentence)
- ⚠️ **Unpredictable** - ผลลัพธ์ไม่คงที่

**Use Case:** ❌ ไม่เหมาะ - ไม่มี voice cloning

---

#### 5. **StyleTTS 2** ⭐⭐⭐⭐

**ข้อดี:**
- ✅ **Open Source** - ฟรี
- ✅ **High Quality** - คุณภาพดีมาก
- ✅ **Zero-Shot** - ไม่ต้อง fine-tune
- ✅ **Expressive** - เสียงธรรมชาติ

**ข้อจำกัด:**
- ⚠️ **English Focus** - เน้นภาษาอังกฤษ
- ⚠️ **Limited Thai Support** - ภาษาไทยอาจไม่ดี
- ⚠️ **Newer Project** - ยังไม่ mature เท่า Coqui

**Use Case:** ⚠️ พิจารณาเป็นทางเลือกรอง
- ถ้าต้องการ English voice cloning
- Still developing Thai support

---

## 🏆 คำแนะนำ (Recommendation)

### Primary Solution: **Coqui TTS XTTS-v2** ⭐⭐⭐⭐⭐

**เหตุผล:**
1. ✅ **ฟรี 100%** - ไม่มีค่าใช้จ่าย
2. ✅ **รองรับภาษาไทยเต็มรูปแบบ** - native Thai support
3. ✅ **Zero-shot voice cloning** - ใช้ตัวอย่างเสียง 6-30 วินาทีเท่านั้น
4. ✅ **Production ready** - ใช้งานจริงได้เลย
5. ✅ **Self-hosted** - ควบคุมได้เต็มที่ ไม่มีปัญหา privacy
6. ✅ **Community support** - documentation ครบถ้วน

### Fallback Option: **ElevenLabs API**

**ใช้เมื่อ:**
- User ต้องการคุณภาพสูงสุดและยอมจ่าย
- Server ไม่มี GPU
- ต้องการ professional voices

---

## 🏗️ System Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Voice Upload │  │ Voice Library│  │ TTS Controls │     │
│  │    Modal     │  │  Management  │  │   + Player   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│          │                 │                 │              │
│          └─────────────────┴─────────────────┘              │
│                            │                                │
│                    REST API Calls                           │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│              Voice Cloning Backend (Python)                 │
│                            │                                │
│  ┌─────────────────────────▼────────────────────────────┐  │
│  │           Flask REST API Server                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   Upload   │  │   Clone    │  │ Synthesize │     │  │
│  │  │  Endpoint  │  │  Endpoint  │  │  Endpoint  │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────┬────────────┬────────────┬──────────────────┘  │
│             │            │            │                     │
│  ┌──────────▼────────────▼────────────▼──────────────────┐  │
│  │         Coqui TTS XTTS-v2 Engine                      │  │
│  │  • Zero-shot voice cloning                            │  │
│  │  • Multi-language support                             │  │
│  │  • GPU/CPU inference                                  │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │         Voice Storage System                          │  │
│  │  ┌─────────────────┐     ┌─────────────────┐         │  │
│  │  │  Voice Samples  │     │  Voice Metadata │         │  │
│  │  │   (WAV files)   │     │     (JSON)      │         │  │
│  │  └─────────────────┘     └─────────────────┘         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   Database (MongoDB)                        │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │  Voice Profiles   │  │   Usage Stats     │              │
│  │  • user_id        │  │  • generations    │              │
│  │  • voice_name     │  │  • duration       │              │
│  │  • sample_path    │  │  • timestamps     │              │
│  │  • created_at     │  └───────────────────┘              │
│  └───────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Components

### 1. Backend - Voice Cloning Service (Python)

**Location:** `backend/voice-cloning/`

**Stack:**
```
- Python 3.10+
- Flask 3.0
- Coqui TTS (XTTS-v2)
- PyTorch
- librosa (audio processing)
- soundfile (WAV I/O)
```

**API Endpoints:**

```python
POST   /voice/upload          # Upload voice sample
POST   /voice/clone           # Clone voice from sample
POST   /voice/synthesize      # Generate speech with cloned voice
GET    /voice/list            # List user's voices
DELETE /voice/{voice_id}      # Delete voice
GET    /health                # Health check
```

---

### 2. Frontend - Voice Management UI

**Components:**
1. **VoiceUploadModal** - Upload voice samples
2. **VoiceLibrary** - Manage cloned voices
3. **VoiceSelector** - Select voice for TTS
4. **VoiceCloneService** - API client

---

### 3. Database Schema

**MongoDB Collections:**

```typescript
// voices collection
interface VoiceProfile {
  _id: string;
  userId: string;
  voiceName: string;
  samplePath: string;           // Path to voice sample file
  sampleDuration: number;        // Duration in seconds
  language: string;              // 'th', 'en', etc.
  quality: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    originalFileName: string;
    fileSize: number;
    format: string;              // 'wav', 'mp3'
    sampleRate: number;          // 22050, 24000, etc.
  };
}

// voice_generations collection (analytics)
interface VoiceGeneration {
  _id: string;
  userId: string;
  voiceId: string;
  text: string;
  duration: number;              // Generated audio duration
  timestamp: Date;
  engine: 'xtts-v2';
}
```

---

## 📁 File Structure

```
peace-script-basic-v1/
│
├── backend/
│   ├── pythainlp-tts/         # Existing TTS
│   │   └── server.py
│   │
│   └── voice-cloning/         # NEW: Voice Cloning Service
│       ├── server.py          # Flask API server
│       ├── voice_cloner.py    # Coqui TTS integration
│       ├── audio_processor.py # Audio preprocessing
│       ├── storage.py         # File storage management
│       ├── requirements.txt   # Python dependencies
│       ├── Dockerfile         # Docker image
│       ├── .env.example       # Environment variables
│       ├── models/            # XTTS model files
│       │   └── .gitkeep
│       ├── uploads/           # Voice samples
│       │   └── .gitkeep
│       └── README.md          # Documentation
│
├── src/
│   ├── services/
│   │   ├── ttsService.ts             # Existing TTS service
│   │   └── voiceCloningService.ts    # NEW: Voice cloning API client
│   │
│   ├── components/
│   │   ├── TTSSettingsModal.tsx      # Existing
│   │   ├── VoiceUploadModal.tsx      # NEW: Upload voice samples
│   │   ├── VoiceLibrary.tsx          # NEW: Manage voices
│   │   └── VoiceSelector.tsx         # NEW: Select cloned voice
│   │
│   └── types/
│       └── voice-cloning.ts          # TypeScript types
│
├── docs/
│   ├── VOICE_CLONING_ARCHITECTURE.md # This file
│   ├── VOICE_CLONING_SETUP.md        # Setup guide (to create)
│   └── VOICE_CLONING_API.md          # API docs (to create)
│
└── .env.example
    └── VITE_VOICE_CLONING_ENDPOINT=http://localhost:8001
```

---

## 🚀 Implementation Plan

### Phase 1: Backend Foundation (Priority 1)
- [ ] Setup Coqui TTS XTTS-v2
- [ ] Create Flask API server
- [ ] Voice upload endpoint
- [ ] Audio preprocessing
- [ ] Voice cloning endpoint
- [ ] Health check & diagnostics

### Phase 2: Voice Synthesis (Priority 2)
- [ ] TTS synthesis with cloned voice
- [ ] Audio quality optimization
- [ ] Caching system
- [ ] Error handling

### Phase 3: Frontend Integration (Priority 3)
- [ ] Voice upload UI
- [ ] Voice library management
- [ ] Voice selector component
- [ ] Integration with existing TTS

### Phase 4: Storage & Database (Priority 4)
- [ ] MongoDB schema
- [ ] File storage system
- [ ] Voice metadata management
- [ ] User voice library

### Phase 5: Production Ready (Priority 5)
- [ ] Docker deployment
- [ ] Performance optimization
- [ ] Rate limiting
- [ ] Analytics & monitoring
- [ ] Documentation

### Phase 6: Advanced Features (Priority 6)
- [ ] Voice quality analysis
- [ ] Multi-speaker support
- [ ] Voice mixing
- [ ] Emotion control

---

## 💻 Minimum Requirements

### Development Environment
```
CPU: 4+ cores recommended
RAM: 8GB minimum, 16GB recommended
GPU: NVIDIA GPU with 4GB+ VRAM (optional but recommended)
Storage: 5GB free space for models
Python: 3.10 or higher
```

### Production Environment
```
CPU: 8+ cores
RAM: 16GB minimum, 32GB recommended
GPU: NVIDIA GPU with 6GB+ VRAM (T4, V100, A100)
Storage: 20GB+ (for models + voice samples)
Bandwidth: 1Gbps recommended
```

---

## 📊 Performance Estimates

### Coqui XTTS-v2

**GPU Mode (NVIDIA T4):**
- Voice Cloning: ~5-10 seconds
- TTS Synthesis: ~2-3 seconds per sentence
- Batch Processing: ~1 second per sentence

**CPU Mode:**
- Voice Cloning: ~30-60 seconds
- TTS Synthesis: ~10-15 seconds per sentence
- Batch Processing: ~5-8 seconds per sentence

---

## 💰 Cost Analysis

### Self-Hosted (Coqui TTS)

**One-time Costs:**
```
Development Time: ~40-60 hours
Server Setup: ~5 hours
Total: ~$0 (using existing infrastructure)
```

**Monthly Costs:**
```
GPU Server (Railway/Render):
- Hobby: ~$20-30/month (CPU only, slower)
- Pro: ~$50-100/month (GPU, fast)

Storage:
- 100GB: ~$5-10/month

Total: $25-110/month (depends on GPU usage)
```

**Cost per Generation:**
```
Essentially FREE (unlimited usage)
Only server costs (fixed monthly fee)
```

### Cloud API (ElevenLabs)

**Monthly Costs:**
```
Creator Plan: $22/month (100,000 characters)
Voice Cloning: $5 per voice
Total: ~$27-50/month
```

**Cost per Generation:**
```
~$0.0002 per character
Average sentence (50 chars): ~$0.01
```

---

## 🎯 Success Metrics

### Quality Metrics
- [ ] Voice similarity > 85%
- [ ] Naturalness score > 4/5
- [ ] Thai pronunciation accuracy > 90%
- [ ] Audio quality: 22kHz+ sample rate

### Performance Metrics
- [ ] Voice cloning < 30 seconds (CPU)
- [ ] TTS synthesis < 5 seconds per sentence (CPU)
- [ ] API response time < 10 seconds
- [ ] System uptime > 99%

### User Experience
- [ ] Voice upload success rate > 95%
- [ ] Clear error messages
- [ ] Intuitive UI
- [ ] Smooth playback

---

## 🔒 Security & Privacy

### Data Protection
- ✅ Voice samples encrypted at rest
- ✅ HTTPS for all API calls
- ✅ User authentication required
- ✅ Voice samples isolated per user
- ✅ Automatic cleanup of old files

### Privacy Considerations
- ✅ No cloud uploads (self-hosted)
- ✅ Users own their voice data
- ✅ Can delete voice samples anytime
- ✅ No third-party tracking

---

## 📚 Resources & Documentation

### Coqui TTS
- GitHub: https://github.com/coqui-ai/TTS
- Docs: https://docs.coqui.ai/
- Models: https://huggingface.co/coqui
- XTTS-v2: https://github.com/coqui-ai/TTS#-xtts-v2

### Alternatives
- ElevenLabs: https://elevenlabs.io/docs
- StyleTTS 2: https://github.com/yl4579/StyleTTS2
- Bark: https://github.com/suno-ai/bark

---

## ✅ Next Steps

1. **ตรวจสอบความเป็นไปได้** (Feasibility Check)
   - ทดสอบ Coqui TTS บน development environment
   - วัดประสิทธิภาพบน CPU vs GPU
   - ทดสอบกับเสียงภาษาไทย

2. **สร้าง Prototype** (MVP)
   - Voice upload endpoint
   - Basic voice cloning
   - Simple TTS synthesis

3. **Integration Testing**
   - Connect to frontend
   - Test full workflow
   - Performance benchmarks

4. **Production Deployment**
   - Docker containerization
   - Cloud deployment
   - Monitoring setup

---

**สถานะ:** 📋 Architecture Complete - Ready for Implementation

**ผู้รับผิดชอบ:** AI Development Team  
**Timeline:** 2-3 weeks for full implementation  
**Priority:** HIGH - Core feature for Peace Script AI
