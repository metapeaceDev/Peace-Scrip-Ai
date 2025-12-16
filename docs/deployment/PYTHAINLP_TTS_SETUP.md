# 🎙️ PyThaiNLP TTS Setup Guide

## ภาพรวม

PyThaiNLP TTS เป็น **Thai Text-to-Speech ฟรี** คุณภาพสูง ที่ใช้ Google TTS (gTTS) ผ่าน Python backend

### ✨ ข้อดี:
- ✅ **ฟรี 100%** - ไม่ต้องใช้ API key
- ✅ **คุณภาพสูง** - ใช้ Google TTS
- ✅ **ภาษาไทยชัด** - เหมาะกับภาษาไทย
- ✅ **ติดตั้งง่าย** - Python หรือ Docker
- ✅ **ไม่มี Quota** - ใช้ได้ไม่จำกัด

### ⚠️ ข้อจำกัด:
- ⚠️ ต้องรัน Python server
- ⚠️ ต้องมี internet (สำหรับ gTTS)

---

## 📦 ติดตั้ง

### Option 1: Local Python (แนะนำสำหรับ Development)

```bash
# 1. ไปที่ folder pythainlp-tts
cd backend/pythainlp-tts

# 2. ติดตั้ง dependencies (ครั้งแรกเท่านั้น)
pip install -r requirements.txt

# 3. รัน server
python server.py

# ✅ Server พร้อมใช้งานที่ http://localhost:8000
```

### Option 2: Docker (แนะนำสำหรับ Production)

```bash
# รัน PyThaiNLP TTS ด้วย Docker Compose
cd backend
docker-compose up pythainlp-tts

# หรือ build image เอง
docker build -t pythainlp-tts pythainlp-tts/
docker run -p 8000:8000 pythainlp-tts
```

### Option 3: รันทั้งระบบพร้อมกัน (Full Stack)

```bash
# รัน Backend API + PyThaiNLP TTS + MongoDB
cd backend
docker-compose up

# ✅ เปิด 3 services:
#    - MongoDB: localhost:27017
#    - Backend API: localhost:5000
#    - PyThaiNLP TTS: localhost:8000
```

---

## ✅ ทดสอบว่า Server ทำงาน

### 1. Health Check

```bash
curl http://localhost:8000/health
```

ควรได้:
```json
{
  "status": "healthy",
  "service": "PyThaiNLP TTS",
  "version": "1.0.0"
}
```

### 2. ทดสอบ TTS

```bash
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"สวัสดีครับ ยินดีต้อนรับสู่ Peace Script AI"}' \
  --output test.mp3

# จะได้ไฟล์ test.mp3 - เปิดฟังได้เลย
```

### 3. ดู Available Voices

```bash
curl http://localhost:8000/voices
```

---

## 🎯 การใช้งานใน Peace Script AI

### ขั้นตอนที่ 1: เปิด TTS Server

```bash
cd backend/pythainlp-tts
python server.py
```

### ขั้นตอนที่ 2: ตั้งค่าใน Frontend

1. **เปิดเว็บ** Peace Script AI
2. **ไปที่** Settings → TTS Settings
3. **เลือก** PyThaiNLP TTS
4. **ตรวจสอบ** Endpoint: `http://localhost:8000/tts`
5. **กด** Test Voice ทดสอบ

### ขั้นตอนที่ 3: ใช้งาน

- เขียนบทภาษาไทย
- กด Preview TTS
- เสียงจะออกผ่าน PyThaiNLP TTS (ฟรี!)

---

## 🔧 Configuration

### Environment Variables

สร้างไฟล์ `.env` ใน `backend/pythainlp-tts/`:

```bash
PORT=8000
DEBUG=false
```

### ปรับแต่ง Port

ถ้าต้องการเปลี่ยน port:

```bash
# ใน .env
PORT=9000

# แล้วอัพเดทใน frontend .env
VITE_PYTHAINLP_ENDPOINT=http://localhost:9000/tts
```

---

## 🚀 Production Deployment

### Deploy บน Server

```bash
# 1. Copy folder ไปยัง server
scp -r backend/pythainlp-tts user@your-server:/app/

# 2. SSH เข้า server
ssh user@your-server

# 3. ติดตั้งและรัน
cd /app/pythainlp-tts
pip install -r requirements.txt
gunicorn -w 4 -b 0.0.0.0:8000 server:app

# หรือใช้ PM2
pm2 start "gunicorn -w 4 -b 0.0.0.0:8000 server:app" --name pythainlp-tts
```

### Deploy ด้วย Docker

```bash
# Production docker-compose.yml
docker-compose -f docker-compose.prod.yml up -d
```

### HTTPS & Domain

ถ้าใช้ domain เช่น `tts.yoursite.com`:

```bash
# Frontend .env.production
VITE_PYTHAINLP_ENDPOINT=https://tts.yoursite.com/tts
```

---

## 📊 Performance

### ข้อมูลการใช้งาน:

- **Response Time**: ~1-2 วินาที
- **Max Text Length**: 5,000 ตัวอักษร
- **Concurrent Users**: รองรับ ~20 users (4 workers)
- **Memory Usage**: ~100-200 MB

### เพิ่มประสิทธิภาพ:

```bash
# เพิ่มจำนวน workers
gunicorn -w 8 -b 0.0.0.0:8000 server:app

# หรือใช้ nginx reverse proxy + load balancing
```

---

## ❓ Troubleshooting

### ปัญหา: Port 8000 ถูกใช้งานแล้ว

```bash
# ดูว่าโปรแกรมไหนใช้
lsof -i :8000

# Kill process
kill -9 <PID>

# หรือเปลี่ยน port ใน .env
PORT=9000
```

### ปัญหา: gTTS Error - No Internet

```bash
# ตรวจสอบ internet connection
ping google.com

# gTTS ต้องการ internet เพื่อใช้ Google TTS
# หาก offline ไม่สามารถใช้งานได้
```

### ปัญหา: Module not found

```bash
# ติดตั้ง dependencies อีกครั้ง
pip install -r requirements.txt --upgrade

# หรือใช้ virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### ปัญหา: Audio ไม่เล่น

```bash
# ตรวจสอบว่า server ทำงาน
curl http://localhost:8000/health

# ตรวจสอบ CORS
# Server อนุญาต CORS จาก origin ทั้งหมดแล้ว
```

---

## 📝 API Documentation

### POST /tts

สร้างไฟล์เสียงจากข้อความ

**Request:**
```json
{
  "text": "ข้อความที่ต้องการแปลงเป็นเสียง",
  "engine": "gTTS",
  "lang": "th"
}
```

**Response:**
- Content-Type: `audio/mpeg`
- Returns: MP3 audio file

**Status Codes:**
- 200: Success
- 400: Invalid request
- 500: Server error

### GET /voices

ดูรายการ TTS engines ที่มี

**Response:**
```json
{
  "success": true,
  "voices": [
    {
      "engine": "gTTS",
      "name": "Google TTS Thai",
      "lang": "th",
      "quality": "high",
      "free": true
    }
  ]
}
```

### GET /health

Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "service": "PyThaiNLP TTS",
  "version": "1.0.0"
}
```

---

## 🎓 เปรียบเทียบกับ TTS อื่นๆ

| Feature | PyThaiNLP (ฟรี) | Google Cloud TTS | Azure TTS | ElevenLabs |
|---------|-----------------|------------------|-----------|------------|
| **ราคา** | ฟรี | $4/1M chars | $4/1M chars | $11/30K chars |
| **คุณภาพ** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **ภาษาไทย** | ✅ ดี | ✅ ดีมาก | ✅ ดี | ⚠️ พอใช้ |
| **Setup** | ง่าย | API Key | API Key | API Key |
| **Quota** | ไม่จำกัด | จำกัด | จำกัด | จำกัด |
| **Internet** | ต้องการ | ต้องการ | ต้องการ | ต้องการ |

**สรุป**: PyThaiNLP เหมาะสำหรับ:
- ✅ ใช้งานฟรี unlimited
- ✅ ต้องการเสียงไทยคุณภาพดี
- ✅ ไม่ต้องการจ่ายเงิน API
- ✅ Development & Testing

---

## 📚 Resources

- [PyThaiNLP Documentation](https://pythainlp.github.io/)
- [gTTS Documentation](https://gtts.readthedocs.io/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Our Backend API](/backend/README.md)

---

## 💡 Tips & Best Practices

### 1. Caching (ประหยัดเวลา)

```python
# TODO: เพิ่ม Redis cache สำหรับประโยคที่ซ้ำกัน
# จะทำให้เร็วขึ้นมากสำหรับข้อความที่ใช้บ่อย
```

### 2. Rate Limiting

```python
# Backend มี rate limiting อยู่แล้ว
# แต่ควรเพิ่มใน TTS server ด้วย
```

### 3. Error Handling

```javascript
// Frontend ควรมี fallback
try {
  const audio = await pythainlpTTS(text);
} catch (error) {
  // Fallback to browser TTS
  const audio = await browserTTS(text);
}
```

---

## 🆘 Support

ถ้ามีปัญหาหรือข้อสงสัย:

1. ดู [Troubleshooting](#-troubleshooting)
2. เช็ค server logs: `docker-compose logs pythainlp-tts`
3. ทดสอบ endpoint: `curl http://localhost:8000/health`

---

**สถานะ**: ✅ พร้อมใช้งาน  
**อัพเดทล่าสุด**: December 16, 2024  
**Version**: 1.0.0
