from fastapi import APIRouter, Depends, UploadFile, File
from ..auth import get_current_user
import time
router = APIRouter(prefix="/api/vision", tags=["vision"])

@router.post("/detect")
async def detect(file: UploadFile = File(...), model: str="ppe", user=Depends(get_current_user)):
    return {"model_used": model,"model_version":"yolov8n-ppe-v1-eval","detections":[],"confidence_threshold":0.6,"note":"Requires ai-inference service with weights","timestamp": time.time()}

@router.get("/health")
def health(user=Depends(get_current_user)):
    return {"service":"vision","inference_url":"http://ai-inference:8001","status":"check_inference_health"}
