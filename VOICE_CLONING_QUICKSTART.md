# 📋 Voice Cloning Installation Quick Reference

## TL;DR - Fast Setup (5 minutes)

```bash
# 1. Install pyenv
brew install pyenv  # macOS
# or
curl https://pyenv.run | bash  # Linux

# 2. Install Python 3.11.14
pyenv install 3.11.14
pyenv local 3.11.14

# 3. Setup environment
cd backend/voice-cloning
python -m venv venv-tts
source venv-tts/bin/activate

# 4. Install dependencies
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# 5. Download model (auto on first run)
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

# 6. Start server
python server.py

# 7. Test
curl http://localhost:8001/health
```

---

## Requirements.txt

```txt
# Core TTS
TTS==0.22.0

# PyTorch (compatible versions)
torch==2.4.1
torchaudio==2.4.1

# AI Models
transformers==4.39.3

# Audio Processing
librosa==0.10.2
soundfile==0.12.1
scipy==1.11.4

# NLP
spacy==3.8.11

# Web Server
flask==3.0.0
flask-cors==4.0.0

# Utilities
pydantic==2.5.3
python-dotenv==1.0.0
```

---

## Common Commands

```bash
# Start server
cd backend/voice-cloning
source venv-tts/bin/activate
python server.py

# Check health
curl http://localhost:8001/health

# Upload voice
curl -F "file=@voice.wav" -F "voice_name=MyVoice" http://localhost:8001/voice/upload

# Synthesize
curl -X POST http://localhost:8001/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"voice_id":"MyVoice_...", "text":"Hello", "language":"en"}' \
  --output output.wav

# List voices
curl http://localhost:8001/voice/list

# Stop server
lsof -ti:8001 | xargs kill -9
```

---

## Troubleshooting Quick Fixes

### Python version error
```bash
python --version  # Must be 3.11+
pyenv install 3.11.14
pyenv local 3.11.14
```

### Module not found
```bash
source venv-tts/bin/activate
pip install -r requirements.txt
```

### Port in use
```bash
lsof -ti:8001 | xargs kill -9
```

### Model not loading
```bash
# Pre-download model
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
```

---

## Environment Variables (.env)

```bash
PORT=8001
HOST=0.0.0.0
DEBUG=False
TTS_MODEL=tts_models/multilingual/multi-dataset/xtts_v2
TTS_DEVICE=cpu
MAX_UPLOAD_SIZE=52428800
UPLOAD_FOLDER=./uploads
OUTPUT_FOLDER=./outputs
```

---

## Supported Languages

English (en), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Polish (pl), Turkish (tr), Russian (ru), Dutch (nl), Czech (cs), Arabic (ar), Chinese (zh-cn), Hungarian (hu), Korean (ko), Japanese (ja), Hindi (hi)

---

## System Requirements

- **Python:** 3.11+ (NOT 3.9)
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 5GB free space
- **CPU:** Any modern processor
- **GPU:** Optional (CUDA support)

---

## Performance

- **Model loading:** 20-30 seconds (first time)
- **Voice upload:** < 1 second
- **Synthesis:** ~10-15 seconds for 6s audio (CPU)
- **Memory usage:** ~1.9GB RAM

---

## Production Deployment

```bash
# PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Systemd
sudo systemctl enable voice-cloning
sudo systemctl start voice-cloning
```

---

**Full Guide:** VOICE_CLONING_DEPLOYMENT.md

**Version:** 1.0.0 | **Date:** Dec 17, 2025
