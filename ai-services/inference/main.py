from fastapi import FastAPI
app = FastAPI(title="INDUX-OS AI Inference", version="12.0")
@app.get("/health")
def health():
    return {"status":"ok","models":{"yolo_ppe":{"loaded":False,"activation":"pip install ultralytics && download yolov8n.pt"},"whisper":{"loaded":False},"tts":{"loaded":False}},"note":"Real inference service reports true status"}
@app.post("/vision/detect")
async def detect(): return {"status":"model_not_loaded","message":"Install ultralytics"}
