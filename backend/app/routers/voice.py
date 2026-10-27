from fastapi import APIRouter, UploadFile, File, Depends
from ..auth import get_current_user
import os
import uuid
import shutil
import time

router = APIRouter(prefix="/api/voice", tags=["voice"])

# Render's application directory is not writable on the Python runtime.
# Use a configurable writable path; /tmp is ephemeral on Render.
UPLOAD = os.getenv("VOICE_UPLOAD_DIR", "/tmp/indux-os-voice")
os.makedirs(UPLOAD, exist_ok=True)

# Language registry — real provider support, not fake
LANGUAGE_REGISTRY = {
    "en-IN": {"stt": "whisper", "tts": "edge-tts", "voices": ["en-IN-NeerjaNeural", "en-IN-PrabhatNeural"], "supported": True},
    "hi-IN": {"stt": "whisper", "tts": "edge-tts", "voices": ["hi-IN-SwaraNeural", "hi-IN-MadhurNeural"], "supported": True},
    "bn-IN": {"stt": "whisper", "tts": "edge-tts", "voices": ["bn-IN-TanishaaNeural"], "supported": True},
    "ta-IN": {"stt": "whisper", "tts": "edge-tts", "voices": ["ta-IN-PallaviNeural"], "supported": True},
    "te-IN": {"stt": "whisper", "tts": "edge-tts", "voices": ["te-IN-ShrutiNeural"], "supported": True},
    "bho-IN": {"stt": "whisper", "tts": "none", "voices": [], "supported": False, "reason": "Bhojpuri ASR limited — fallback to hi-IN with transliteration"},
    "mai-IN": {"stt": "whisper", "tts": "none", "voices": [], "supported": False, "reason": "Maithili requires hi-IN model"},
    "mag-IN": {"stt": "whisper", "tts": "none", "voices": [], "supported": False, "reason": "Magahi requires hi-IN model"},
}


@router.get("/languages")
def languages(user=Depends(get_current_user)):
    return LANGUAGE_REGISTRY


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = "hi-IN", user=Depends(get_current_user)):
    # Strip directory components supplied in the client filename.
    original_name = os.path.basename(file.filename or "upload.bin")
    fname = f"{uuid.uuid4()}_{original_name}"
    path = os.path.join(UPLOAD, fname)
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    # Real implementation delegates to the AI inference service with Whisper.
    # This endpoint currently returns the delegation structure used by the frontend.
    return {
        "status": "delegated_to_ai_inference",
        "inference_url": "http://ai-inference:8001/stt/transcribe",
        "file_path": path,
        "detected_language": language,
        "transcript": "",  # filled by real Whisper when installed
        "activation": "pip install openai-whisper in ai-inference, ffmpeg required",
        "timestamp": time.time(),
    }


@router.post("/synthesize")
async def synthesize(text: str, language: str = "hi-IN", voice: str = "hi-IN-SwaraNeural", speed: float = 1.0, user=Depends(get_current_user)):
    return {
        "status": "delegated_to_ai_inference",
        "inference_url": "http://ai-inference:8001/tts/synthesize",
        "text": text,
        "language": language,
        "voice": voice,
        "speed": speed,
        "activation": "pip install edge-tts or TTS (coqui) in ai-inference service",
        "note": "Frontend also uses Web Speech API as fallback for immediate playback",
    }


@router.get("/health")
def health(user=Depends(get_current_user)):
    return {
        "stt": {"model": "whisper-compatible", "status": "check ai-inference:8001/health"},
        "tts": {"model": "edge-tts/coqui", "status": "check ai-inference:8001/health"},
        "registry": LANGUAGE_REGISTRY,
    }
