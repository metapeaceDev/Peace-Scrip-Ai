# PyThaiNLP TTS Server

Free Thai Text-to-Speech service using pythainlp and gTTS.

## Features

- ✅ **Free** - No API keys required
- ✅ **High Quality** - Uses Google TTS (gTTS)
- ✅ **Thai Language** - Optimized for Thai text
- ✅ **Simple API** - Easy REST endpoints
- ✅ **Docker Support** - Easy deployment

## Quick Start

### Option 1: Local Python

```bash
# Install dependencies
cd backend/pythainlp-tts
pip install -r requirements.txt

# Run server
python server.py

# Server will start on http://localhost:8000
```

### Option 2: Docker

```bash
# Build image
docker build -t pythainlp-tts backend/pythainlp-tts

# Run container
docker run -p 8000:8000 pythainlp-tts
```

### Option 3: Docker Compose

```bash
# Run with main backend
docker-compose up
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:

```json
{
  "status": "healthy",
  "service": "PyThaiNLP TTS",
  "version": "1.0.0"
}
```

### Text-to-Speech

```bash
POST /tts
Content-Type: application/json

{
  "text": "สวัสดีครับ ยินดีต้อนรับสู่ Peace Script AI",
  "engine": "gTTS",
  "lang": "th"
}
```

Response: MP3 audio file

### List Voices

```bash
GET /voices
```

Response:

```json
{
  "success": true,
  "voices": [
    {
      "engine": "gTTS",
      "name": "Google TTS Thai",
      "lang": "th",
      "quality": "high",
      "free": true,
      "description": "Google Text-to-Speech (requires internet)"
    }
  ]
}
```

## Usage from Frontend

```javascript
// Example: Use PyThaiNLP TTS
const response = await fetch('http://localhost:8000/tts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'สวัสดีครับ',
    engine: 'gTTS',
  }),
});

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

## Environment Variables

```bash
# .env
PORT=8000
DEBUG=false
```

## Production Deployment

### Using Gunicorn (Recommended)

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 server:app
```

### System Requirements

- Python 3.8+
- Internet connection (for gTTS)
- ~100MB disk space

## Performance

- Average response time: 1-2 seconds
- Supports up to 5000 characters per request
- Recommended: Use caching for repeated phrases

## Troubleshooting

### Issue: "gTTS requires internet"

- Solution: gTTS uses Google's TTS service, internet required
- Alternative: Use offline TTS (espeak) - lower quality

### Issue: "Port 8000 already in use"

- Solution: Change PORT in .env or kill existing process

```bash
lsof -ti:8000 | xargs kill -9
```

## License

MIT License - Free for personal and commercial use
