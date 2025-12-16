#!/usr/bin/env python3
"""
Voice Cloning Server using Coqui TTS XTTS-v2
Provides zero-shot voice cloning for Thai and multilingual text-to-speech
"""

import os
import sys
import torch
import torchaudio
import hashlib
import tempfile
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Coqui TTS imports
try:
    from TTS.api import TTS
    from TTS.utils.synthesizer import Synthesizer
except ImportError:
    print("ERROR: Coqui TTS not installed. Please run: pip install TTS")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
BASE_DIR = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / 'uploads'
OUTPUT_FOLDER = BASE_DIR / 'outputs'
MODEL_FOLDER = BASE_DIR / 'models'

# Create directories
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)
MODEL_FOLDER.mkdir(exist_ok=True)

# Allowed audio formats
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'ogg', 'm4a'}

# Global TTS model (lazy loaded)
tts_model: Optional[TTS] = None
device = "cuda" if torch.cuda.is_available() else "cpu"

logger.info(f"🔧 Device: {device}")
logger.info(f"🔧 CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    logger.info(f"🔧 GPU: {torch.cuda.get_device_name(0)}")


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def load_tts_model() -> TTS:
    """Load Coqui TTS XTTS-v2 model (lazy loading)"""
    global tts_model
    
    if tts_model is not None:
        return tts_model
    
    logger.info("📥 Loading XTTS-v2 model...")
    logger.info("⚠️  First load will download ~1.8GB model files")
    
    try:
        # Initialize XTTS-v2 model
        # This will automatically download the model if not present
        tts_model = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            progress_bar=True,
            gpu=(device == "cuda")
        ).to(device)
        
        logger.info("✅ XTTS-v2 model loaded successfully")
        logger.info(f"✅ Model device: {device}")
        
        return tts_model
        
    except Exception as e:
        logger.error(f"❌ Failed to load TTS model: {e}")
        raise


def preprocess_audio(input_path: Path, output_path: Path) -> Path:
    """
    Preprocess audio file for voice cloning
    - Convert to WAV format
    - Resample to 22050 Hz
    - Convert to mono
    - Normalize volume
    """
    try:
        logger.info(f"🎵 Preprocessing audio: {input_path}")
        
        # Load audio
        waveform, sample_rate = torchaudio.load(str(input_path))
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)
            logger.info("  ✓ Converted to mono")
        
        # Resample to 22050 Hz (XTTS requirement)
        if sample_rate != 22050:
            resampler = torchaudio.transforms.Resample(sample_rate, 22050)
            waveform = resampler(waveform)
            logger.info(f"  ✓ Resampled: {sample_rate}Hz → 22050Hz")
        
        # Normalize audio
        waveform = waveform / torch.max(torch.abs(waveform))
        logger.info("  ✓ Normalized volume")
        
        # Save preprocessed audio
        torchaudio.save(str(output_path), waveform, 22050)
        logger.info(f"✅ Audio preprocessed: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"❌ Audio preprocessing failed: {e}")
        raise


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check if model is loaded
        model_status = "loaded" if tts_model is not None else "not_loaded"
        
        return jsonify({
            'status': 'healthy',
            'service': 'Voice Cloning Server',
            'version': '1.0.0',
            'model': 'XTTS-v2',
            'model_status': model_status,
            'device': device,
            'cuda_available': torch.cuda.is_available(),
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/model/info', methods=['GET'])
def model_info():
    """Get TTS model information"""
    try:
        model = load_tts_model()
        
        return jsonify({
            'success': True,
            'model_name': 'XTTS-v2',
            'model_type': 'multilingual',
            'languages': [
                'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 
                'ru', 'nl', 'cs', 'ar', 'zh-cn', 'ja', 'hu', 'ko', 'th'
            ],
            'features': [
                'Zero-shot voice cloning',
                'Multilingual TTS',
                'Emotion control',
                'Fast inference'
            ],
            'device': device,
            'loaded': True
        })
    except Exception as e:
        logger.error(f"❌ Model info error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/voice/upload', methods=['POST'])
def upload_voice_sample():
    """
    Upload voice sample for cloning
    
    Request:
        - file: Audio file (WAV, MP3, FLAC, etc.)
        - voice_name: Name for this voice (optional)
        
    Response:
        - voice_id: Unique identifier for this voice
        - sample_path: Path to processed audio file
        - duration: Audio duration in seconds
    """
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {ALLOWED_EXTENSIONS}'
            }), 400
        
        # Get voice name
        voice_name = request.form.get('voice_name', 'custom_voice')
        voice_name = secure_filename(voice_name)
        
        # Generate unique voice ID
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        voice_id = f"{voice_name}_{timestamp}"
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        temp_path = UPLOAD_FOLDER / f"temp_{filename}"
        file.save(str(temp_path))
        
        logger.info(f"📁 Uploaded: {filename} ({temp_path.stat().st_size / 1024:.1f} KB)")
        
        # Preprocess audio
        processed_path = UPLOAD_FOLDER / f"{voice_id}.wav"
        preprocess_audio(temp_path, processed_path)
        
        # Remove temp file
        temp_path.unlink()
        
        # Get audio info
        waveform, sample_rate = torchaudio.load(str(processed_path))
        duration = waveform.shape[1] / sample_rate
        
        logger.info(f"✅ Voice sample uploaded: {voice_id}")
        logger.info(f"   Duration: {duration:.1f}s")
        logger.info(f"   Sample rate: {sample_rate}Hz")
        
        # Validate duration (6-30 seconds recommended)
        if duration < 3:
            logger.warning(f"⚠️  Voice sample is very short ({duration:.1f}s). Recommend 6-30s for best quality.")
        elif duration > 60:
            logger.warning(f"⚠️  Voice sample is long ({duration:.1f}s). Will use first 30s.")
        
        return jsonify({
            'success': True,
            'voice_id': voice_id,
            'voice_name': voice_name,
            'sample_path': str(processed_path),
            'duration': round(duration, 2),
            'sample_rate': sample_rate,
            'file_size': processed_path.stat().st_size,
            'recommendation': 'optimal' if 6 <= duration <= 30 else 'acceptable' if duration >= 3 else 'too_short'
        })
        
    except Exception as e:
        logger.error(f"❌ Upload error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/voice/synthesize', methods=['POST'])
def synthesize_speech():
    """
    Generate speech using cloned voice
    
    Request:
        - text: Text to synthesize
        - voice_id: Voice ID from upload (or use speaker_wav path)
        - speaker_wav: Direct path to voice sample (alternative to voice_id)
        - language: Language code (default: 'th' for Thai)
        - speed: Speech speed (0.5 - 2.0, default: 1.0)
        
    Response:
        - Audio file (WAV format)
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: text'
            }), 400
        
        text = data['text']
        language = data.get('language', 'th')
        speed = float(data.get('speed', 1.0))
        
        # Get voice sample path
        if 'speaker_wav' in data:
            speaker_wav = Path(data['speaker_wav'])
        elif 'voice_id' in data:
            voice_id = data['voice_id']
            speaker_wav = UPLOAD_FOLDER / f"{voice_id}.wav"
        else:
            return jsonify({
                'success': False,
                'error': 'Must provide either voice_id or speaker_wav'
            }), 400
        
        if not speaker_wav.exists():
            return jsonify({
                'success': False,
                'error': f'Voice sample not found: {speaker_wav}'
            }), 404
        
        logger.info(f"🎙️  Synthesizing speech...")
        logger.info(f"   Text: {text[:100]}{'...' if len(text) > 100 else ''}")
        logger.info(f"   Language: {language}")
        logger.info(f"   Voice: {speaker_wav.name}")
        logger.info(f"   Speed: {speed}x")
        
        # Load TTS model
        model = load_tts_model()
        
        # Generate unique output filename
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_filename = f"tts_{timestamp}_{text_hash}.wav"
        output_path = OUTPUT_FOLDER / output_filename
        
        # Synthesize speech
        logger.info("🔊 Generating audio...")
        start_time = datetime.now()
        
        model.tts_to_file(
            text=text,
            speaker_wav=str(speaker_wav),
            language=language,
            file_path=str(output_path),
            speed=speed
        )
        
        generation_time = (datetime.now() - start_time).total_seconds()
        
        # Get audio info
        waveform, sample_rate = torchaudio.load(str(output_path))
        duration = waveform.shape[1] / sample_rate
        
        logger.info(f"✅ Speech generated!")
        logger.info(f"   Generation time: {generation_time:.2f}s")
        logger.info(f"   Audio duration: {duration:.2f}s")
        logger.info(f"   Real-time factor: {duration / generation_time:.2f}x")
        logger.info(f"   Output: {output_path}")
        
        # Return audio file
        return send_file(
            output_path,
            mimetype='audio/wav',
            as_attachment=True,
            download_name=output_filename
        )
        
    except Exception as e:
        logger.error(f"❌ Synthesis error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/voice/list', methods=['GET'])
def list_voices():
    """List all uploaded voice samples"""
    try:
        voices = []
        
        for wav_file in UPLOAD_FOLDER.glob('*.wav'):
            # Skip temp files
            if wav_file.name.startswith('temp_'):
                continue
            
            # Get audio info
            try:
                waveform, sample_rate = torchaudio.load(str(wav_file))
                duration = waveform.shape[1] / sample_rate
                
                voices.append({
                    'voice_id': wav_file.stem,
                    'filename': wav_file.name,
                    'duration': round(duration, 2),
                    'sample_rate': sample_rate,
                    'file_size': wav_file.stat().st_size,
                    'created_at': datetime.fromtimestamp(wav_file.stat().st_mtime).isoformat()
                })
            except Exception as e:
                logger.warning(f"⚠️  Could not read {wav_file}: {e}")
        
        return jsonify({
            'success': True,
            'count': len(voices),
            'voices': sorted(voices, key=lambda x: x['created_at'], reverse=True)
        })
        
    except Exception as e:
        logger.error(f"❌ List voices error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/voice/delete/<voice_id>', methods=['DELETE'])
def delete_voice(voice_id: str):
    """Delete a voice sample"""
    try:
        voice_path = UPLOAD_FOLDER / f"{voice_id}.wav"
        
        if not voice_path.exists():
            return jsonify({
                'success': False,
                'error': f'Voice not found: {voice_id}'
            }), 404
        
        voice_path.unlink()
        logger.info(f"🗑️  Deleted voice: {voice_id}")
        
        return jsonify({
            'success': True,
            'message': f'Voice {voice_id} deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"❌ Delete voice error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/cleanup', methods=['POST'])
def cleanup_old_files():
    """
    Cleanup old generated audio files
    Keeps voice samples, deletes old TTS outputs
    """
    try:
        max_age_hours = int(request.args.get('max_age_hours', 24))
        now = datetime.now()
        deleted_count = 0
        freed_space = 0
        
        for output_file in OUTPUT_FOLDER.glob('*.wav'):
            file_age = (now - datetime.fromtimestamp(output_file.stat().st_mtime)).total_seconds() / 3600
            
            if file_age > max_age_hours:
                file_size = output_file.stat().st_size
                output_file.unlink()
                deleted_count += 1
                freed_space += file_size
                logger.info(f"🗑️  Deleted old output: {output_file.name} (age: {file_age:.1f}h)")
        
        return jsonify({
            'success': True,
            'deleted_files': deleted_count,
            'freed_space_mb': round(freed_space / 1024 / 1024, 2),
            'max_age_hours': max_age_hours
        })
        
    except Exception as e:
        logger.error(f"❌ Cleanup error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info("="* 60)
    logger.info("🎙️  Voice Cloning Server Starting...")
    logger.info("="* 60)
    logger.info(f"📡 Port: {port}")
    logger.info(f"🐛 Debug: {debug}")
    logger.info(f"💻 Device: {device}")
    logger.info(f"📁 Upload folder: {UPLOAD_FOLDER}")
    logger.info(f"📁 Output folder: {OUTPUT_FOLDER}")
    logger.info("="* 60)
    
    # Pre-load model if not in debug mode
    if not debug:
        logger.info("🔄 Pre-loading TTS model...")
        try:
            load_tts_model()
            logger.info("✅ Model pre-loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to pre-load model: {e}")
            logger.warning("⚠️  Model will be loaded on first request")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
