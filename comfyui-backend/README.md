# ComfyUI Backend

Python FastAPI server for video generation using ComfyUI + AnimateDiff/SVD.

**Separate from Node.js backend** - This handles GPU-intensive video generation only.

## 📋 Features

- ✅ Job queue management
- ✅ Firebase Authentication
- ✅ Progress tracking
- ✅ Multi-worker support (concurrent jobs)
- ✅ CORS support for frontend
- ✅ RESTful API endpoints
- ✅ Health monitoring

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd comfyui-backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Install ComfyUI

```bash
# Clone ComfyUI
cd /workspace  # or your preferred location
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Download models (see ../COMFYUI_BACKEND_DEPLOYMENT.md)
```

### 4. Run Server

```bash
python main.py
```

Server will start at `http://localhost:8000`

## 📚 API Documentation

Once running, visit:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

#### Submit Job

```bash
POST /api/comfyui/generate
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "prompt": "A cinematic scene...",
  "workflow": { ... },  # ComfyUI workflow JSON
  "referenceImage": "data:image/png;base64,...",  # Optional
  "priority": 5
}

Response:
{
  "data": {
    "jobId": "uuid-here"
  }
}
```

#### Check Job Status

```bash
GET /api/comfyui/job/{jobId}
Authorization: Bearer <firebase-token>

Response:
{
  "data": {
    "id": "uuid-here",
    "state": "completed",  # queued, running, completed, failed
    "progress": 100,
    "result": {
      "imageData": "data:video/mp4;base64,..."
    }
  }
}
```

#### Health Check

```bash
GET /health/detailed

Response:
{
  "success": true,
  "workers": {
    "totalWorkers": 2,
    "healthyWorkers": 2,
    "runningJobs": 1
  },
  "queue": {
    "pending": 3,
    "running": 1,
    "total": 10
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable                   | Default                         | Description                  |
| -------------------------- | ------------------------------- | ---------------------------- |
| `HOST`                     | `0.0.0.0`                       | Server host                  |
| `PORT`                     | `8000`                          | Server port                  |
| `COMFYUI_PATH`             | `/workspace/ComfyUI`            | Path to ComfyUI installation |
| `MAX_CONCURRENT_JOBS`      | `2`                             | Max parallel jobs            |
| `JOB_TIMEOUT`              | `300`                           | Job timeout (seconds)        |
| `FIREBASE_SERVICE_ACCOUNT` | `firebase-service-account.json` | Firebase credentials         |

### Firebase Setup (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/project/peace-script-ai/settings/serviceaccounts/adminsdk)
2. Generate new private key
3. Save as `firebase-service-account.json` in comfyui-backend folder
4. Server will auto-enable authentication

**Note:** If Firebase credentials not found, server runs without authentication (for testing).

## 🐳 Docker Deployment

```dockerfile
# Dockerfile
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

WORKDIR /app

# Install Python
RUN apt-get update && apt-get install -y python3.10 python3-pip git

# Install ComfyUI
RUN git clone https://github.com/comfyanonymous/ComfyUI /workspace/ComfyUI
RUN pip install -r /workspace/ComfyUI/requirements.txt

# Copy backend
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

EXPOSE 8000

CMD ["python3", "main.py"]
```

```bash
# Build image
docker build -t comfyui-backend .

# Run container
docker run -d \
  -p 8000:8000 \
  -v /path/to/models:/workspace/ComfyUI/models \
  --gpus all \
  comfyui-backend
```

## 📊 Monitoring

### Check Queue Stats

```bash
curl http://localhost:8000/api/queue/stats \
  -H "Authorization: Bearer <token>"
```

### Check Worker Stats

```bash
curl http://localhost:8000/api/comfyui/workers \
  -H "Authorization: Bearer <token>"
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8000/health/detailed

# Test job submission (requires auth)
curl -X POST http://localhost:8000/api/comfyui/generate \
  -H "Authorization: Bearer <your-firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test",
    "workflow": {}
  }'
```

## 🔐 Security

- ✅ Firebase JWT token verification
- ✅ CORS configured for production domains
- ✅ Job ownership verification
- 🔄 Rate limiting (TODO - add with redis)

## 🚨 Troubleshooting

### "ComfyUI not found"

- Check `COMFYUI_PATH` in `.env`
- Verify ComfyUI is installed: `ls $COMFYUI_PATH`

### "Firebase initialization failed"

- Verify `firebase-service-account.json` exists
- Check JSON format is valid
- Or disable Firebase by removing the file

### "CUDA out of memory"

- Reduce `MAX_CONCURRENT_JOBS` to 1
- Use smaller batch sizes in workflows
- Upgrade GPU

## 📝 Development

### Project Structure

```
comfyui-backend/
├── main.py                           # FastAPI server
├── requirements.txt                  # Python dependencies
├── .env.example                      # Environment template
├── README.md                         # This file
└── firebase-service-account.json     # Firebase credentials (not in git)
```

## 🔗 Links

- [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Deployment Guide](../COMFYUI_BACKEND_DEPLOYMENT.md)

---

**Status:** Ready for deployment 🚀  
**Version:** 1.0.0  
**Last Updated:** Dec 11, 2024
