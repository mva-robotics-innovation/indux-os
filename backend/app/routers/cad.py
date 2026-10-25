from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import os, uuid, shutil
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CADModel
from ..auth import get_current_user

router = APIRouter(prefix="/api/cad", tags=["cad"])
STORE = "/app/cad_store"
os.makedirs(STORE, exist_ok=True)

@router.post("/upload")
def upload_cad(file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["glb","gltf","stl","step","stp"]: raise HTTPException(400, "Supported: GLB, glTF, STL, STEP")
    fname = f"{uuid.uuid4()}_{file.filename}"
    path = os.path.join(STORE, fname)
    with open(path, "wb") as out: shutil.copyfileobj(file.file, out)
    model = CADModel(name=file.filename, original_format=ext.upper(), glb_path=path, revision="v1")
    db.add(model); db.commit(); db.refresh(model)
    return {"id": model.id, "name": model.name, "glb_path": model.glb_path, "needs_conversion": ext not in ["glb","gltf"]}

@router.get("")
def list_cad(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(CADModel).all()
    # Add to existing cad.py
from pydantic import BaseModel

class SimulationReq(BaseModel):
    model_id: int
    solver: str="openfoam" # or calculix, ansys
    params: dict = {}

@router.post("/simulate")
def simulate(req: SimulationReq, db: Session = Depends(get_db), user=Depends(get_current_user)):
    model = db.query(CADModel).filter(CADModel.id==req.model_id).first()
    if not model: raise HTTPException(404, "Model not found")
    # Real: queue to Redis/Celery worker with resource limits
    return {
        "job_id": f"sim-{uuid.uuid4()}",
        "status":"queued",
        "model": model.name,
        "solver": req.solver,
        "params": req.params,
        "logs_url": "/api/cad/sim/logs/{job_id}",
        "results_url": "/api/cad/sim/results/{job_id}",
        "note":"Real solver required: OpenFOAM, CalculiX, or vendor API. Job runs in background worker with auth and audit."
    }
