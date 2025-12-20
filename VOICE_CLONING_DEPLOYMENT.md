# 🎙️ Voice Cloning Deployment Guide

## Quick Start

Voice Cloning is now fully operational using Coqui XTTS-v2. This guide covers deployment for production environments.

---

## Prerequisites

### System Requirements

**Python:**

- Python 3.11+ (tested with 3.11.14)
- ⚠️ Python 3.9 is NOT compatible

**Hardware:**

- Minimum: 4GB RAM
- Recommended: 8GB+ RAM
- CPU: Any modern processor (tested on Apple M1)
- GPU: Optional (CUDA support available but not required)

**Storage:**

- Minimum: 5GB free space
- Model files: ~2GB
- Voice samples: ~100MB per hour of audio

---

## Installation Steps

### 1. Install pyenv (Python Version Manager)

```bash
# macOS (Homebrew)
brew install pyenv

# Linux
curl https://pyenv.run | bash

# Add to ~/.zshrc or ~/.bashrc
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init --path)"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# Reload shell
source ~/.zshrc
```

### 2. Install Python 3.11.14

```bash
# Install Python 3.11.14
pyenv install 3.11.14

# Set global or local version
pyenv local 3.11.14  # For this project only
# OR
pyenv global 3.11.14  # System-wide
```

### 3. Create Virtual Environment

```bash
cd backend/voice-cloning

# Create virtual environment
python -m venv venv-tts

# Activate (macOS/Linux)
source venv-tts/bin/activate

# Activate (Windows)
venv-tts\Scripts\activate
```

### 4. Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install requirements
pip install -r requirements.txt
```

**Expected installation time:** ~5 minutes  
**Download size:** ~200MB+

**Key packages installed:**

- `TTS==0.22.0` - Coqui TTS
- `torch==2.4.1` - PyTorch
- `torchaudio==2.4.1` - Audio processing
- `transformers==4.39.3` - AI models
- `spacy==3.8.11` - NLP
- `librosa==0.10.2` - Audio analysis

### 5. Download XTTS-v2 Model

The model will download automatically on first run (~1.8GB).

```bash
# Test model download
python -c "from TTS.api import TTS; tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2'); print('Model ready!')"
```

**Expected time:** ~2-3 minutes (depends on internet speed)

---

## Running the Server

### Development Mode

```bash
cd backend/voice-cloning

# Activate environment
source venv-tts/bin/activate

# Start server
python server.py
```

Server will start on `http://localhost:8001`

**Initial startup time:** ~20-30 seconds (model loading)

### Production Mode (Linux with systemd)

Create service file: `/etc/systemd/system/voice-cloning.service`

```ini
[Unit]
Description=Voice Cloning Server (Coqui XTTS-v2)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend/voice-cloning
Environment="PATH=/path/to/venv-tts/bin"
ExecStart=/path/to/venv-tts/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable voice-cloning
sudo systemctl start voice-cloning
sudo systemctl status voice-cloning
```

### Production Mode (PM2)

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Auto-start on boot
pm2 startup
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'voice-cloning',
      script: 'venv-tts/bin/python',
      args: 'server.py',
      cwd: './backend/voice-cloning',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 8001,
      },
    },
  ],
};
```

---

## Server Configuration

### Environment Variables

Create `.env` file in `backend/voice-cloning/`:

```bash
# Server Configuration
PORT=8001
HOST=0.0.0.0
DEBUG=False

# Model Configuration
TTS_MODEL=tts_models/multilingual/multi-dataset/xtts_v2
TTS_DEVICE=cpu  # or 'cuda' for GPU

# Upload Limits
MAX_UPLOAD_SIZE=52428800  # 50MB in bytes
ALLOWED_EXTENSIONS=wav,mp3,flac,ogg,m4a,webm

# Audio Processing
TARGET_SAMPLE_RATE=22050
AUDIO_FORMAT=wav

# Storage Paths
UPLOAD_FOLDER=./uploads
OUTPUT_FOLDER=./outputs
MODEL_FOLDER=./models
```

### Nginx Reverse Proxy

Add to nginx configuration:

```nginx
upstream voice_cloning {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name your-domain.com;

    # Increase upload size limit
    client_max_body_size 50M;

    location /api/voice/ {
        proxy_pass http://voice_cloning/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long synthesis
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}
```

---

## API Endpoints

### Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "service": "Voice Cloning Server",
  "version": "1.0.0",
  "model": "XTTS-v2",
  "model_status": "loaded",
  "device": "cpu",
  "cuda_available": false
}
```

### Upload Voice Sample

```bash
POST /voice/upload

Content-Type: multipart/form-data

Parameters:
  - file: Audio file (WAV, MP3, etc.)
  - voice_name: Name for this voice
  - description: Optional description

Response:
{
  "success": true,
  "voice_id": "VoiceName_20251217_031526",
  "voice_name": "VoiceName",
  "duration": 6.48,
  "sample_rate": 22050,
  "recommendation": "optimal"
}
```

### Synthesize Speech

```bash
POST /voice/synthesize

Content-Type: application/json

Body:
{
  "voice_id": "VoiceName_20251217_031526",
  "text": "Hello, this is synthesized speech.",
  "language": "en"
}

Response: WAV audio file (binary)
```

### List Voices

```bash
GET /voice/list

Response:
{
  "success": true,
  "count": 2,
  "voices": [
    {
      "voice_id": "Voice1_...",
      "filename": "Voice1.wav",
      "duration": 6.48,
      "created_at": "2025-12-17T03:15:26"
    }
  ]
}
```

### Delete Voice

```bash
DELETE /voice/delete/<voice_id>

Response:
{
  "success": true,
  "message": "Voice deleted successfully"
}
```

---

## Supported Languages

XTTS-v2 supports 17 languages:

| Code    | Language | Code | Language   |
| ------- | -------- | ---- | ---------- |
| `en`    | English  | `es` | Spanish    |
| `fr`    | French   | `de` | German     |
| `it`    | Italian  | `pt` | Portuguese |
| `pl`    | Polish   | `tr` | Turkish    |
| `ru`    | Russian  | `nl` | Dutch      |
| `cs`    | Czech    | `ar` | Arabic     |
| `zh-cn` | Chinese  | `hu` | Hungarian  |
| `ko`    | Korean   | `ja` | Japanese   |
| `hi`    | Hindi    |      |            |

---

## Performance Optimization

### CPU Optimization

```python
# server.py
import torch

# Set number of threads
torch.set_num_threads(4)  # Adjust based on CPU cores

# Use optimal audio processing
USE_HALF_PRECISION = False  # CPU doesn't support half precision
```

### GPU Acceleration (Optional)

```bash
# Install CUDA version of PyTorch
pip install torch==2.4.1+cu118 torchaudio==2.4.1+cu118 --index-url https://download.pytorch.org/whl/cu118

# Set device in .env
TTS_DEVICE=cuda
```

**Performance comparison:**

- CPU (M1): ~10-15 seconds for 6s audio
- GPU (NVIDIA): ~2-3 seconds for 6s audio

### Caching

Enable model caching to reduce memory usage:

```python
# Pre-load model at startup
tts_model = TTS('tts_models/multilingual/multi-dataset/xtts_v2')
```

---

## Monitoring

### Health Checks

```bash
# Simple health check
curl http://localhost:8001/health

# Detailed monitoring
watch -n 5 'curl -s http://localhost:8001/health | python -m json.tool'
```

### Logs

```bash
# View logs (systemd)
journalctl -u voice-cloning -f

# View logs (PM2)
pm2 logs voice-cloning

# View logs (direct)
tail -f voice-cloning.log
```

### Resource Monitoring

```bash
# CPU and Memory
htop

# Process-specific
ps aux | grep python | grep server.py
```

---

## Troubleshooting

### Common Issues

**Issue: "ModuleNotFoundError: No module named 'TTS'"**

```bash
# Solution: Activate virtual environment
source venv-tts/bin/activate
pip install TTS
```

**Issue: "Python version incompatible"**

```bash
# Solution: Check Python version
python --version  # Must be 3.11+

# Install correct version
pyenv install 3.11.14
pyenv local 3.11.14
```

**Issue: "Port 8001 already in use"**

```bash
# Solution: Find and kill process
lsof -ti:8001 | xargs kill -9

# Or use different port
PORT=8002 python server.py
```

**Issue: "Model loading takes too long"**

```bash
# Solution: Pre-download model
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

# This downloads once, subsequent runs are fast
```

**Issue: "Out of memory"**

```bash
# Solution: Reduce batch size or use CPU
# Edit server.py
TTS_DEVICE = 'cpu'
BATCH_SIZE = 1
```

### Debug Mode

Enable debug logging:

```bash
# Set in .env
DEBUG=True
LOG_LEVEL=DEBUG

# Or run with verbose output
python server.py --debug
```

---

## Security Considerations

### File Upload Security

```python
# Already implemented in server.py
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'ogg', 'm4a', 'webm'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Validate file type
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
```

### Rate Limiting

Add rate limiting for production:

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/voice/synthesize', methods=['POST'])
@limiter.limit("10 per minute")
def synthesize():
    # ...
```

### CORS Configuration

```python
# Production settings
CORS(app, resources={
    r"/voice/*": {
        "origins": ["https://your-domain.com"],
        "methods": ["GET", "POST", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})
```

---

## Backup and Recovery

### Voice Samples Backup

```bash
# Create backup
tar -czf voice-samples-backup-$(date +%Y%m%d).tar.gz uploads/

# Restore backup
tar -xzf voice-samples-backup-20251217.tar.gz
```

### Database (if using)

```bash
# Backup voice metadata
sqlite3 voices.db .dump > backup.sql

# Restore
sqlite3 voices.db < backup.sql
```

---

## Upgrade Guide

### From Plan A (Standard TTS) to Plan C (Voice Cloning)

1. **Backup existing data**

```bash
cp -r uploads uploads.backup
```

2. **Install Python 3.11+**

```bash
pyenv install 3.11.14
pyenv local 3.11.14
```

3. **Create new environment**

```bash
python -m venv venv-tts
source venv-tts/bin/activate
```

4. **Install dependencies**

```bash
pip install -r requirements.txt
```

5. **Download model**

```bash
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
```

6. **Test server**

```bash
python server.py
curl http://localhost:8001/health
```

7. **Update frontend**

- Remove Plan A disclaimers
- Update API endpoints
- Test voice upload UI

---

## Production Checklist

- [ ] Python 3.11+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] XTTS-v2 model downloaded
- [ ] Server starts successfully
- [ ] Health check returns OK
- [ ] Voice upload tested
- [ ] Voice synthesis tested
- [ ] Nginx/reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall rules updated
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team trained

---

## Support

### Logs Location

- Application logs: `./logs/voice-cloning.log`
- System logs: `/var/log/voice-cloning/`
- PM2 logs: `~/.pm2/logs/`

### Contact

- GitHub Issues: https://github.com/metapeaceDev/Peace-Scrip-Ai/issues
- Documentation: `/docs/voice-cloning/`

---

## Performance Benchmarks

### Model Loading

- Initial load: 20-30 seconds (CPU)
- Memory usage: ~1.9GB RAM
- Model size: 1.8GB disk

### Voice Upload

- Processing: < 1 second
- Max file size: 50MB
- Formats: WAV, MP3, FLAC, OGG, M4A, WebM

### Voice Synthesis

- Speed: ~0.5s per second of audio (CPU)
- Average: 10-15 seconds for 6s audio
- Quality: 24kHz, 16-bit, professional

---

**Last Updated:** December 17, 2025

**Version:** 1.0.0

**Status:** ✅ Production Ready
