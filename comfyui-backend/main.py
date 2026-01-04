"""
ComfyUI Backend Server for Peace Script AI
============================================

FastAPI server for video generation using ComfyUI + AnimateDiff/SVD
Supports Tier 2 (AnimateDiff) and Tier 3 (SVD) fallback.

Features:
- Job queue management
- Firebase Authentication
- Progress tracking
- Multi-worker support
- Automatic model selection
"""

from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import json
import uuid
import time
import os
import base64
from typing import Optional, Dict, List
from pathlib import Path
import asyncio
from enum import Enum
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Firebase Admin SDK (optional - comment out if not using Firebase)
try:
    import firebase_admin
    from firebase_admin import credentials, auth
    FIREBASE_ENABLED = True
except ImportError:
    FIREBASE_ENABLED = False
    print("⚠️ Firebase Admin SDK not installed. Running without authentication.")

app = FastAPI(
    title="ComfyUI Backend API",
    description="Video generation backend for Peace Script AI",
    version="1.0.0"
)

# Simple health check endpoint (compatibility with frontend expecting /health)
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://peace-script-ai.web.app",
        "https://peace-script-ai.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
COMFYUI_PATH = os.getenv("COMFYUI_PATH", "/workspace/ComfyUI")
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "2"))
JOB_TIMEOUT = int(os.getenv("JOB_TIMEOUT", "300"))  # 5 minutes

# Initialize Firebase (if enabled)
if FIREBASE_ENABLED and not firebase_admin._apps:
    try:
        # Try to load service account key
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "firebase-service-account.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized")
        else:
            FIREBASE_ENABLED = False
            print("⚠️ Firebase service account not found. Running without authentication.")
    except Exception as e:
        FIREBASE_ENABLED = False
        print(f"⚠️ Firebase initialization failed: {e}")

# Job States
class JobState(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

# In-memory job storage (use Redis for production)
jobs: Dict[str, dict] = {}
job_queue: List[str] = []
running_jobs: List[str] = []

# Request/Response Models
class GenerateRequest(BaseModel):
    prompt: str
    workflow: dict
    referenceImage: Optional[str] = None
    priority: int = 5

class JobResponse(BaseModel):
    id: str
    state: JobState
    progress: float
    createdAt: float
    startedAt: Optional[float] = None
    completedAt: Optional[float] = None
    result: Optional[dict] = None
    failedReason: Optional[str] = None

# Authentication Helper
async def verify_token(authorization: Optional[str] = None) -> Optional[str]:
    """Verify Firebase ID token and return user ID"""
    if not FIREBASE_ENABLED:
        return "anonymous"  # Skip auth if Firebase not enabled
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")

# Job Processing
async def process_job(job_id: str):
    """Process a ComfyUI job in background"""
    try:
        job = jobs[job_id]
        job["state"] = JobState.RUNNING
        job["startedAt"] = time.time()
        job["progress"] = 10
        
        workflow = job["workflow"]
        
        # Save workflow to temp file
        workflow_path = f"/tmp/workflow_{job_id}.json"
        with open(workflow_path, 'w') as f:
            json.dump(workflow, f, indent=2)
        
        job["progress"] = 20
        
        # Determine output directory
        output_dir = f"/tmp/comfyui_output_{job_id}"
        os.makedirs(output_dir, exist_ok=True)
        
        # Execute ComfyUI
        # Note: This is a simplified version. 
        # In production, use ComfyUI's Python API directly or websocket API
        print(f"🎬 Executing ComfyUI for job {job_id}...")
        
        job["progress"] = 30
        
        # Simulated execution (replace with actual ComfyUI call)
        # Real implementation would use ComfyUI's server.py with websocket
        cmd = [
            "python",
            f"{COMFYUI_PATH}/main.py",
            "--input", workflow_path,
            "--output", output_dir,
        ]
        
        # For now, simulate with sleep (replace with actual subprocess.run)
        await asyncio.sleep(10)  # Simulate processing time
        
        job["progress"] = 80
        
        # Parse output (simplified - actual implementation needs to read ComfyUI output)
        # In real scenario, ComfyUI saves files to output/ directory
        output_files = list(Path(output_dir).glob("*.mp4"))
        
        if output_files:
            # Read video file and convert to base64
            video_path = output_files[0]
            with open(video_path, 'rb') as f:
                video_data = base64.b64encode(f.read()).decode('utf-8')
            
            job["result"] = {
                "imageData": f"data:video/mp4;base64,{video_data}",
                "videoPath": str(video_path)
            }
            job["state"] = JobState.COMPLETED
            job["progress"] = 100
            job["completedAt"] = time.time()
            print(f"✅ Job {job_id} completed successfully")
        else:
            raise Exception("No output video generated")
        
    except Exception as e:
        print(f"❌ Job {job_id} failed: {e}")
        job["state"] = JobState.FAILED
        job["progress"] = 0
        job["failedReason"] = str(e)
        job["completedAt"] = time.time()
    
    finally:
        # Remove from running jobs
        if job_id in running_jobs:
            running_jobs.remove(job_id)
        
        # Start next job in queue
        await process_queue()

async def process_queue():
    """Process jobs from queue if workers available"""
    while job_queue and len(running_jobs) < MAX_CONCURRENT_JOBS:
        job_id = job_queue.pop(0)
        running_jobs.append(job_id)
        asyncio.create_task(process_job(job_id))

# API Endpoints

@app.get("/")
async def root():
    return {
        "service": "ComfyUI Backend API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health/detailed")
async def health_check():
    """Health check with system statistics"""
    return {
        "success": True,
        "timestamp": time.time(),
        "workers": {
            "totalWorkers": MAX_CONCURRENT_JOBS,
            "healthyWorkers": MAX_CONCURRENT_JOBS,
            "runningJobs": len(running_jobs)
        },
        "queue": {
            "pending": len(job_queue),
            "running": len(running_jobs),
            "total": len(jobs)
        },
        "comfyui": {
            "path": COMFYUI_PATH,
            "available": os.path.exists(COMFYUI_PATH)
        }
    }

@app.post("/api/comfyui/generate")
async def generate_video(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(None)
):
    """Submit video generation job"""
    
    # Verify authentication
    user_id = await verify_token(authorization)
    
    # Create job
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id,
        "state": JobState.QUEUED,
        "progress": 0,
        "userId": user_id,
        "createdAt": time.time(),
        "workflow": req.workflow,
        "prompt": req.prompt,
        "referenceImage": req.referenceImage,
        "priority": req.priority
    }
    
    # Add to queue
    job_queue.append(job_id)
    print(f"📥 Job {job_id} queued (user: {user_id})")
    
    # Start processing if workers available
    background_tasks.add_task(process_queue)
    
    return {"data": {"jobId": job_id}}

@app.get("/api/comfyui/job/{job_id}")
async def get_job_status(
    job_id: str,
    authorization: str = Header(None)
):
    """Get job status and result"""
    
    # Verify authentication
    user_id = await verify_token(authorization)
    
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    job = jobs[job_id]
    
    # Verify ownership (skip if anonymous)
    if FIREBASE_ENABLED and job["userId"] != user_id:
        raise HTTPException(403, "Not authorized to view this job")
    
    return {"data": job}

@app.get("/api/comfyui/workers")
async def get_worker_stats(authorization: str = Header(None)):
    """Get worker statistics"""
    await verify_token(authorization)
    
    return {
        "data": {
            "total": MAX_CONCURRENT_JOBS,
            "running": len(running_jobs),
            "idle": MAX_CONCURRENT_JOBS - len(running_jobs)
        }
    }

@app.get("/api/queue/stats")
async def get_queue_stats(authorization: str = Header(None)):
    """Get queue statistics"""
    await verify_token(authorization)
    
    completed = len([j for j in jobs.values() if j["state"] == JobState.COMPLETED])
    failed = len([j for j in jobs.values() if j["state"] == JobState.FAILED])
    
    return {
        "data": {
            "pending": len(job_queue),
            "running": len(running_jobs),
            "completed": completed,
            "failed": failed,
            "total": len(jobs)
        }
    }

@app.delete("/api/comfyui/job/{job_id}")
async def cancel_job(
    job_id: str,
    authorization: str = Header(None)
):
    """Cancel a queued job"""
    user_id = await verify_token(authorization)
    
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    job = jobs[job_id]
    
    if FIREBASE_ENABLED and job["userId"] != user_id:
        raise HTTPException(403, "Not authorized to cancel this job")
    
    if job["state"] == JobState.RUNNING:
        raise HTTPException(400, "Cannot cancel running job")
    
    if job_id in job_queue:
        job_queue.remove(job_id)
    
    job["state"] = JobState.FAILED
    job["failedReason"] = "Cancelled by user"
    
    return {"success": True}

# Startup Event
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    print("🚀 ComfyUI Backend API starting...")
    print(f"📁 ComfyUI Path: {COMFYUI_PATH}")
    print(f"👷 Max Concurrent Jobs: {MAX_CONCURRENT_JOBS}")
    print(f"🔐 Firebase Auth: {'Enabled' if FIREBASE_ENABLED else 'Disabled'}")
    
    # Verify ComfyUI installation
    if not os.path.exists(COMFYUI_PATH):
        print(f"⚠️ WARNING: ComfyUI not found at {COMFYUI_PATH}")
        print("   Please install ComfyUI or set COMFYUI_PATH environment variable")
    else:
        print(f"✅ ComfyUI found at {COMFYUI_PATH}")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
