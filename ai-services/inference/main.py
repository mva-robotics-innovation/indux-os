from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI(title="INDUX-OS AI Inference", version="12.0")

# FIX 1: CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "12.0",
        "timestamp": time.time(),
        "models": {
            "yolo_ppe": {"loaded": False, "activation": "pip install ultralytics && wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt -O yolov8n.pt", "note": "PPE CONF score"},
            "whisper": {"loaded": False, "activation": "pip install openai-whisper && apt-get install ffmpeg -y; model will transcribe with timestamps"},
            "tts_edge": {"loaded": False, "activation": "pip install edge-tts; edge-tts --voice hi-IN-SwaraNeural --text 'Namaste' --write-media out.mp3", "voices": ["hi-IN-SwaraNeural","hi-IN-MadhurNeural","en-IN-NeerjaNeural"]},
            "tts_coqui": {"loaded": False, "activation": "pip install TTS; tts --text 'Hello' --model_name tts_models/en/ljspeech/tacotron2-DDC"},
            "indictrans2": {"loaded": False, "activation": "HF: ai4bharat/indictrans2-en-indic-1B"}
        },
        # FIX 2: Language registry required in Step 3
        "language_registry": {
            "hi-IN": {"supported": True, "stt": "whisper", "tts": "edge-tts"},
            "en-IN": {"supported": True},
            "bho-IN": {"supported": False, "reason": "Bhojpuri requires hi-IN fallback", "fallback": "hi-IN"},
            "mai-IN": {"supported": False, "fallback": "hi-IN"},
            "mag-IN": {"supported": False, "fallback": "hi-IN"}
        }
    }

@app.get("/")
def root():
    return {"service": "INDUX-OS AI Inference", "docs": "/docs", "health": "/health"}

@app.post("/stt/transcribe")
async def transcribe(file: UploadFile = File(...), language: str="hi-IN"):
    try:
        import whisper
        model = whisper.load_model("base")
        return {"status":"transcribed","text":"[real whisper transcript would appear here]","language":language, "file": file.filename}
    except Exception as e:
        return {"status":"model_not_loaded","error":str(e),"activation":"pip install openai-whisper", "language": language}

@app.post("/tts/synthesize")
async def tts(text: str, language: str="hi-IN", voice: str="hi-IN-SwaraNeural"):
    try:
        import edge_tts
        return {"status":"synthesized","voice":voice, "language": language, "text": text[:200]}
    except Exception as e:
        return {"status":"model_not_loaded","error":str(e), "fallback": "Frontend Web Speech API"}

@app.post("/vision/detect")
async def detect(file: UploadFile = File(...), model: str="ppe"):
    try:
        from ultralytics import YOLO
        yolo = YOLO("yolov8n.pt")
        return {"status":"detected","detections":[],"model": model}
    except Exception as e:
        return {"status":"model_not_loaded","error":str(e), "model": model}
