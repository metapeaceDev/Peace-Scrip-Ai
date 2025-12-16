#!/usr/bin/env python3
"""
PyThaiNLP TTS Server
Free Thai Text-to-Speech service using pythainlp
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pythainlp.util import sound
import os
import tempfile
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'PyThaiNLP TTS',
        'version': '1.0.0'
    })

@app.route('/tts', methods=['POST'])
def text_to_speech():
    """
    Convert Thai text to speech
    
    Request body:
    {
        "text": "สวัสดีครับ",
        "engine": "gTTS",  # Optional: gTTS (default) or espeak
        "lang": "th"       # Optional: default is "th"
    }
    
    Returns: Audio file (MP3)
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: text'
            }), 400
        
        text = data['text']
        engine = data.get('engine', 'gTTS')
        lang = data.get('lang', 'th')
        
        # Validate text length
        if len(text) > 5000:
            return jsonify({
                'success': False,
                'error': 'Text too long. Maximum 5000 characters.'
            }), 400
        
        logger.info(f"TTS Request: {len(text)} chars, engine={engine}")
        
        # Create temporary file for audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Generate speech using pythainlp
            if engine.lower() == 'gtts':
                # Using Google Text-to-Speech (free, high quality)
                from gtts import gTTS
                tts = gTTS(text=text, lang=lang)
                tts.save(output_path)
            elif engine.lower() == 'espeak':
                # Using espeak (offline, lower quality)
                sound.play(text, lang=lang)
                # Note: espeak doesn't return file, would need different implementation
                return jsonify({
                    'success': False,
                    'error': 'espeak engine not fully implemented yet'
                }), 501
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unknown engine: {engine}'
                }), 400
            
            # Send audio file
            return send_file(
                output_path,
                mimetype='audio/mpeg',
                as_attachment=True,
                download_name=f'tts_{hash(text)}.mp3'
            )
            
        finally:
            # Clean up temporary file after sending
            if os.path.exists(output_path):
                try:
                    os.unlink(output_path)
                except Exception as e:
                    logger.error(f"Failed to delete temp file: {e}")
    
    except Exception as e:
        logger.error(f"TTS Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/voices', methods=['GET'])
def list_voices():
    """List available TTS voices/engines"""
    return jsonify({
        'success': True,
        'voices': [
            {
                'engine': 'gTTS',
                'name': 'Google TTS Thai',
                'lang': 'th',
                'quality': 'high',
                'free': True,
                'description': 'Google Text-to-Speech (requires internet)'
            },
            {
                'engine': 'espeak',
                'name': 'eSpeak Thai',
                'lang': 'th',
                'quality': 'medium',
                'free': True,
                'description': 'Offline TTS (lower quality)'
            }
        ]
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting PyThaiNLP TTS Server on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
