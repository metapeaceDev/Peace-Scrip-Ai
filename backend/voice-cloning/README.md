# 🎙️ Voice Cloning Server

Free, open-source voice cloning service using Coqui TTS XTTS-v2.

## Features

- ✨ **Zero-Shot Voice Cloning** - Clone any voice with just 6-30 seconds of audio
- 🌍 **Multilingual Support** - 17 languages including Thai (th), English (en), Chinese (zh-cn)
- 🚀 **Fast Inference** - 2-3 seconds per sentence (GPU) / 10-15 seconds (CPU)
- 🎯 **High Quality** - Production-ready natural-sounding speech
- 💰 **100% Free** - No API keys, no quotas, unlimited usage
- 🔒 **Privacy First** - Self-hosted, your data stays with you

## Quick Start

### 1. Installation

```bash
cd backend/voice-cloning

# Install dependencies
pip install -r requirements.txt

# For GPU support (optional but recommended)
pip install torch==2.1.0+cu118 torchaudio==2.1.0+cu118 --index-url https://download.pytorch.org/whl/cu118
```

### 2. Run Server

```bash
# Development mode
python server.py

# Production mode
gunicorn --bind 0.0.0.0:8001 --workers 2 --timeout 120 server:app
```

Server will start at `http://localhost:8001`

### 3. Test

```bash
# Health check
curl http://localhost:8001/health

# Upload voice sample
curl -X POST http://localhost:8001/voice/upload \
  -F "file=@voice_sample.wav" \
  -F "voice_name=my_voice"

# Generate speech
curl -X POST http://localhost:8001/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "สวัสดีครับ ยินดีต้อนรับสู่ระบบโคลนเสียง",
    "voice_id": "my_voice_20231217_123456",
    "language": "th"
  }' \
  --output output.wav
```

## API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "Voice Cloning Server",
  "version": "1.0.0",
  "model": "XTTS-v2",
  "device": "cuda",
  "cuda_available": true
}
```

---

### Upload Voice Sample
```http
POST /voice/upload
Content-Type: multipart/form-data

file: <audio_file>
voice_name: <name> (optional)
```

**Response:**
```json
{
  "success": true,
  "voice_id": "my_voice_20231217_123456",
  "voice_name": "my_voice",
  "sample_path": "/uploads/my_voice_20231217_123456.wav",
  "duration": 15.2,
  "sample_rate": 22050,
  "recommendation": "optimal"
}
```

**Recommendations:**
- Duration: 6-30 seconds (optimal)
- Format: WAV, MP3, FLAC, OGG, M4A
- Quality: Clear speech, minimal background noise
- Content: Natural speech, varied intonation

---

### Synthesize Speech
```http
POST /voice/synthesize
Content-Type: application/json

{
  "text": "Text to synthesize",
  "voice_id": "my_voice_20231217_123456",
  "language": "th",
  "speed": 1.0
}
```

**Parameters:**
- `text` (required): Text to convert to speech
- `voice_id` (required): Voice ID from upload
- `language` (optional): Language code (default: "th")
  - Supported: en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh-cn, ja, hu, ko, th
- `speed` (optional): Speech speed 0.5-2.0 (default: 1.0)

**Response:** Audio file (WAV format)

---

### List Voices
```http
GET /voice/list
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "voices": [
    {
      "voice_id": "my_voice_20231217_123456",
      "filename": "my_voice_20231217_123456.wav",
      "duration": 15.2,
      "sample_rate": 22050,
      "file_size": 671744,
      "created_at": "2023-12-17T12:34:56"
    }
  ]
}
```

---

### Delete Voice
```http
DELETE /voice/delete/{voice_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Voice my_voice_20231217_123456 deleted successfully"
}
```

---

### Cleanup Old Files
```http
POST /cleanup?max_age_hours=24
```

**Response:**
```json
{
  "success": true,
  "deleted_files": 5,
  "freed_space_mb": 12.5,
  "max_age_hours": 24
}
```

---

## Performance

### GPU Mode (NVIDIA T4)
- Voice Upload + Processing: ~5 seconds
- Speech Synthesis: ~2-3 seconds per sentence
- Real-time Factor: ~5-10x (generates faster than playback)

### CPU Mode
- Voice Upload + Processing: ~10 seconds
- Speech Synthesis: ~10-15 seconds per sentence
- Real-time Factor: ~0.5-1x (generates at playback speed)

## Requirements

### Minimum (CPU)
- CPU: 4+ cores
- RAM: 8GB
- Storage: 5GB (for models)
- Python: 3.10+

### Recommended (GPU)
- GPU: NVIDIA GPU with 4GB+ VRAM (T4, V100, A100)
- CPU: 8+ cores
- RAM: 16GB
- Storage: 10GB
- Python: 3.10+
- CUDA: 11.8+

## Docker Deployment

```bash
# Build image
docker build -t voice-cloning-server .

# Run container
docker run -d \
  -p 8001:8001 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  --name voice-cloning \
  voice-cloning-server

# With GPU support
docker run -d \
  --gpus all \
  -p 8001:8001 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  --name voice-cloning \
  voice-cloning-server
```

## Troubleshooting

### Model Download Issues
```bash
# Manually download model
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
```

### CUDA Out of Memory
```bash
# Use CPU mode
export DEVICE=cpu
python server.py
```

### Audio Quality Issues
- Use WAV format for best quality
- Ensure voice sample is 6-30 seconds
- Check for background noise
- Use clear, natural speech

## License

- Server Code: MIT License
- Coqui TTS: Mozilla Public License 2.0
- XTTS-v2 Model: Commercial use allowed

## Credits

- Powered by [Coqui TTS](https://github.com/coqui-ai/TTS)
- XTTS-v2 Model by Coqui AI
- Built for Peace Script AI

## Support

- GitHub Issues: [Report issues](https://github.com/metapeaceDev/Peace-Script-Ai/issues)
- Documentation: See `/docs/VOICE_CLONING_*.md`
- Email: support@peace-script-ai.com
